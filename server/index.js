import "dotenv/config";
import express from "express";
import cors from "cors";
import prisma from "./prisma.js";
import { callAI, synthesizeMealFromIngredients } from "./ai.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const app = express();
// Auth helpers
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
function signToken(user) {
    return jwt.sign({ uid: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
}

// CORS/JSON은 라우트보다 먼저 등록
app.use(
    cors({
        origin: ["http://localhost:5174", "http://127.0.0.1:5174"],
    })
);
app.options("*", cors());
app.use(express.json());

// 간단 헬스체크
app.get("/api/health", async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return res.json({
            ok: true,
            port: Number(process.env.PORT || 4000),
            geminiConfigured: Boolean(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY),
        });
    } catch (e) {
        console.error("health check failed", e);
        return res.status(500).json({ ok: false });
    }
});
app.post("/api/auth/register", async (req, res) => {
    try {
        let { email, password, name } = req.body || {};
        email = typeof email === "string" ? email.trim() : email;
        name = typeof name === "string" ? name.trim() : name;
        if (!email || !password || !name) return res.status(400).json({ error: "email, password, name 필요" });
        // email에 유니크 인덱스가 없을 수 있으므로 findFirst로 중복 검사
        const exists = await prisma.user.findFirst({ where: { email } });
        if (exists) return res.status(409).json({ error: "이미 존재하는 이메일" });
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({ data: { email, passwordHash, name } });
        return res.json({ id: user.id, email: user.email, name: user.name });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "회원가입 실패" });
    }
});

app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) return res.status(400).json({ error: "email, password 필요" });
        // 이메일 고유 제약이 아직 DB에 없을 수 있어 안전하게 findFirst 사용
        const user = await prisma.user.findFirst({ where: { email } });
        if (!user) return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다" });
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다" });
        const token = signToken(user);
        return res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "로그인 실패" });
    }
});
// JWT 인증 미들웨어 (Bearer)
function auth(req, res, next) {
    try {
        const header = req.headers.authorization || "";
        const [type, token] = header.split(" ");
        if (type !== "Bearer" || !token) return res.status(401).json({ error: "인증 필요" });
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload; // { uid, email }
        next();
    } catch {
        return res.status(401).json({ error: "토큰 검증 실패" });
    }
}

// 선택 인증: 토큰이 있으면 파싱해서 req.user에 넣고, 없어도 통과
function authOptional(req, _res, next) {
    try {
        const header = req.headers.authorization || "";
        const [type, token] = header.split(" ");
        if (type === "Bearer" && token) {
            const payload = jwt.verify(token, JWT_SECRET);
            req.user = payload;
        }
    } catch {
        // 무시하고 통과
    }
    next();
}

// 유틸: 알레르기/비선호 필터
function filterIngredients(all, profile) {
    const dislike = new Set((profile?.dislike_ingredients || []).map((s) => String(s).toLowerCase()));
    const allergy = new Set((profile?.allergies || []).map((s) => String(s).toLowerCase()));
    return all.filter((it) => {
        const name = String(it.name || "").toLowerCase();
        if (dislike.has(name)) return false;
        if (allergy.has(name)) return false;
        return true;
    });
}

app.post("/api/meal/generate", async (req, res) => {
    try {
        const { profile, mealType } = req.body || {};
        if (!profile || !mealType) return res.status(400).json({ error: "profile, mealType 필요" });

        // 1) 사용 가능한 재료 (+영양)
        const ingredients = await prisma.ingredient.findMany();
        const nutritions = await prisma.nutrition.findMany();
        const nutMap = new Map(nutritions.map((n) => [n.id, n]));
        const enriched = ingredients.map((it) => ({
            ...it,
            nutrition: it.nutrition_id ? nutMap.get(it.nutrition_id) : null,
        }));
        const availableIngredients = filterIngredients(enriched, profile);

        // 2) AI 프롬프트 구성
        const prompt = `사용자 정보
- 목표: ${profile.goal}
- 목표 칼로리(1식 목표가 아니어도 됩니다): ${profile.calorie_target}
- 알레르기: ${(profile.allergies || []).join(", ")}
- 식사 시간: ${mealType}

사용 가능한 재료(영양은 100g 기준일 수 있음): ${JSON.stringify(
            availableIngredients.map((i) => ({
                id: i.id,
                name: i.name,
                category: i.category,
                nutrition: i.nutrition
                    ? {
                          kcal: i.nutrition.kcal,
                          protein: i.nutrition.protein,
                          carbs: i.nutrition.carbs,
                          fat: i.nutrition.fat,
                      }
                    : null,
            }))
        )}

규칙:
- 반드시 한국어만 사용하세요. 요리명은 간결한 ‘요리 이름’으로 작성하세요.
- 예시: "닭가슴살 오트밀 죽", "소고기 안심 스테이크", "연어 아보카도 샐러드"
- 'breakfast','lunch','dinner','추천 식단' 같은 일반 용어는 요리명에 쓰지 마세요.
- 반드시 위 목록의 id만 사용하세요.
- 각 재료는 amount(수량)과 unit("g" | "ml" | "piece")를 포함하세요.
- 응답은 JSON만 반환하세요.`;

        let aiResponse = await callAI(prompt);
        if (aiResponse?.__fallback) {
            aiResponse = synthesizeMealFromIngredients(profile, mealType, availableIngredients);
        }

        return res.json(aiResponse);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "생성 실패" });
    }
});

app.post("/api/meal/generate-week", auth, async (req, res) => {
    try {
        const { userId } = req.body || {};
        if (!userId) return res.status(400).json({ error: "userId 필요" });

        const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
        if (!user) return res.status(404).json({ error: "사용자 없음" });
        if (req.user?.uid !== user.id) return res.status(403).json({ error: "권한 없음" });

        const profile = {
            goal: user.goal || "diet",
            calorie_target: user.calorie_target || 1800,
            allergies: Array.isArray(user.allergies) ? user.allergies : [],
            dislike_ingredients: Array.isArray(user.dislike_ingredients) ? user.dislike_ingredients : [],
        };

        const days = 7;
        const plan = [];
        for (let day = 0; day < days; day++) {
            const date = new Date(Date.now() + day * 86400000);
            const [breakfast, lunch, dinner] = await Promise.all([
                fetch("http://localhost:4000/api/meal/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ profile, mealType: "breakfast" }),
                }).then((r) => r.json()),
                fetch("http://localhost:4000/api/meal/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ profile, mealType: "lunch" }),
                }).then((r) => r.json()),
                fetch("http://localhost:4000/api/meal/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ profile, mealType: "dinner" }),
                }).then((r) => r.json()),
            ]);
            plan.push({ date, meals: { breakfast, lunch, dinner } });
        }
        return res.json(plan);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "주간 생성 실패" });
    }
});

// Recipe preview from DB
app.get("/api/recipes/preview", authOptional, async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit || 6), 24);

        // 유저의 goal과 동일한 goal.name을 가진 레시피만 노출 (토큰 없으면 전체)
        let where = undefined;
        if (req.user?.uid) {
            const u = await prisma.user.findUnique({ where: { id: Number(req.user.uid) } });
            if (u?.goal) {
                const goalMap = (g) => {
                    if (!g) return null;
                    const s = String(g).toLowerCase();
                    // 한글 -> goal.name 매핑
                    if (g === "다이어트" || s.includes("diet")) return "diet";
                    if (
                        g === "근육량 증가" ||
                        g === "벌크업" ||
                        g === "근력 증가" ||
                        g === "체중 증가" ||
                        s.includes("muscle")
                    )
                        return "muscle_gain";
                    if (g === "균형" || s.includes("balanced")) return "balanced";
                    if (g === "채식" || s.includes("vegetarian")) return "vegetarian";
                    if (g === "저당" || s.includes("low_sugar")) return "low_sugar";
                    return g; // 이미 영문 키워드면 그대로
                };
                const mapped = goalMap(u.goal);
                if (mapped)
                    where = {
                        OR: [
                            { goal: { name: mapped } }, // 단일 goal_id 방식
                            { recipetogoal: { some: { goal: { name: mapped } } } }, // 다대다 방식
                        ],
                    };
            }
        }

        const recipes = await prisma.recipe.findMany({
            take: limit,
            orderBy: { id: "desc" },
            where,
            select: { id: true, name: true, image_url: true, cooking_time: true },
        });
        const simplify = (r) => {
            return {
                id: r.id,
                name: r.name,
                image_url: r.image_url,
                cooking_time: r.cooking_time,
                // FK 정비 전까지 영양 합계는 생략
                kcal: null,
                protein: null,
                carbs: null,
                fat: null,
            };
        };
        return res.json(recipes.map(simplify));
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "미리보기 조회 실패" });
    }
});

// ---------- Utils for generation ----------
function mapGoal(g) {
    if (!g) return null;
    const s = String(g).toLowerCase();
    if (g === "다이어트" || s.includes("diet")) return "diet";
    if (g === "근육량 증가" || g === "벌크업" || g === "근력 증가" || g === "체중 증가" || s.includes("muscle"))
        return "muscle_gain";
    if (g === "균형" || s.includes("balanced")) return "balanced";
    if (g === "채식" || s.includes("vegetarian")) return "vegetarian";
    if (g === "저당" || s.includes("low_sugar")) return "low_sugar";
    return g;
}
function startOfMonday(d = new Date()) {
    const date = new Date(d);
    const day = date.getDay(); // 0 Sun..6 Sat
    const diff = (day === 0 ? -6 : 1) - day;
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
    return date;
}
function tdee({ age, height_cm, weight_kg, gender }) {
    const h = Number(height_cm || 170);
    const w = Number(weight_kg || 65);
    const a = Number(age || 25);
    const isMale = (gender || "male") === "male";
    const bmr = isMale ? 66 + 13.7 * w + 5 * h - 6.8 * a : 655 + 9.6 * w + 1.8 * h - 4.7 * a;
    return bmr * 1.55; // moderate activity
}
function adjustByGoal(kcal, goal) {
    const g = mapGoal(goal);
    if (g === "diet") return kcal - 500;
    if (g === "muscle_gain") return kcal + 300;
    return kcal;
}

// pick recipes by goal (fall back to any recent)
async function pickRecipesByGoal(goal, count = 3) {
    const mapped = mapGoal(goal);
    const where = mapped
        ? {
              OR: [{ goal: { name: mapped } }, { recipetogoal: { some: { goal: { name: mapped } } } }],
          }
        : undefined;
    const candidates = await prisma.recipe.findMany({
        where,
        orderBy: { id: "desc" },
        take: 50,
        // nutrition 관계가 스키마에 없을 수 있어 ingredient까지만 포함
        include: { recipeingredient: { include: { ingredient: true } } },
    });
    // shuffle & take
    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    return candidates.slice(0, count);
}

function computeRecipeKcal(recipe) {
    // sum ingredient nutrition (kcal per item, assume amount is grams and nutrition is per 100g)
    const total = (recipe.recipeingredient || []).reduce(
        (acc, ri) => {
            // nutrition이 없을 수 있으므로 폴백 사용
            const n = ri.ingredient?.nutrition || null;
            const amt = Number(ri.amount || 0);
            const factor = amt ? amt / 100 : 0;
            if (n) {
                acc.kcal += (n.kcal || 0) * factor;
                acc.protein += (n.protein || 0) * factor;
                acc.carbs += (n.carbs || 0) * factor;
                acc.fat += (n.fat || 0) * factor;
            }
            return acc;
        },
        { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    );
    // nutrition이 없으면 대략치 사용
    if (!total.kcal || total.kcal <= 0) {
        return { kcal: 600, protein: 30, carbs: 60, fat: 20 };
    }
    return total;
}

// ---------- Initial week generation ----------
app.post("/api/meal/generate-initial", auth, async (req, res) => {
    try {
        const userId = req.user.uid;
        const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
        if (!user) return res.status(404).json({ error: "사용자 없음" });
        const daily = adjustByGoal(tdee(user), user.goal);
        const perMeal = daily / 3;
        // start today for 7 days
        for (let d = 0; d < 7; d++) {
            const date = new Date();
            date.setDate(date.getDate() + d);
            date.setHours(0, 0, 0, 0);
            for (const type of ["breakfast", "lunch", "dinner"]) {
                const mp = await prisma.mealplan.create({
                    data: { user_id: Number(userId), date, type },
                });
                const picks = await pickRecipesByGoal(user.goal, 1);
                if (picks.length) {
                    const r = picks[0];
                    const base = computeRecipeKcal(r);
                    const factor = Math.min(2, Math.max(0.5, perMeal / Math.max(1, base.kcal)));
                    await prisma.mealplanrecipe.create({
                        data: {
                            mealplan_id: mp.id,
                            recipe_id: r.id,
                            portion_multiplier: factor,
                            assigned_kcal: base.kcal * factor,
                            assigned_protein: base.protein * factor,
                            assigned_carbs: base.carbs * factor,
                            assigned_fat: base.fat * factor,
                            goal_at_generation: mapGoal(user.goal) || null,
                        },
                    });
                }
            }
        }
        return res.json({ success: true });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "초기 식단 생성 실패" });
    }
});

// ---------- Initial week generation with Gemini (ingredients-based) ----------
app.post("/api/meal/generate-initial-ai", auth, async (req, res) => {
    try {
        const userId = req.user.uid;
        const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
        if (!user) return res.status(404).json({ error: "사용자 없음" });

        // 준비: 재료 + 영양
        const ingredients = await prisma.ingredient.findMany();
        const nutritions = await prisma.nutrition.findMany();
        const nutMap = new Map(nutritions.map((n) => [n.id, n]));
        const enriched = ingredients.map((it) => ({
            ...it,
            nutrition: it.nutrition_id ? nutMap.get(it.nutrition_id) : null,
        }));
        // 프로필 기반 필터링
        const available = filterIngredients(enriched, user);

        const daily = adjustByGoal(tdee(user), user.goal);
        const perMeal = daily / 3;

        // 7일 × 3식
        const usedGemini = Boolean(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);
        for (let d = 0; d < 7; d++) {
            const date = new Date();
            date.setDate(date.getDate() + d);
            date.setHours(0, 0, 0, 0);
            for (const type of ["breakfast", "lunch", "dinner"]) {
                // 해당 날짜/타입 이미 있으면 스킵
                const exists = await prisma.mealplan.findFirst({ where: { user_id: Number(userId), date, type } });
                if (exists) continue;

                const profile = {
                    goal: user.goal || "diet",
                    calorie_target: Math.round(perMeal),
                    allergies: Array.isArray(user.allergies) ? user.allergies : [],
                    dislike_ingredients: Array.isArray(user.dislike_ingredients) ? user.dislike_ingredients : [],
                };

                const prompt = `사용자 목표: ${profile.goal}
1식 목표 칼로리(근사): ${profile.calorie_target}
알레르기: ${(profile.allergies || []).join(", ")}
식사 시간: ${type}

사용 가능한 재료(반드시 id만 사용, nutrition은 100g 기준일 수 있음):
${JSON.stringify(
    available.map((i) => ({
        id: i.id,
        name: i.name,
        category: i.category,
        nutrition: i.nutrition
            ? { kcal: i.nutrition.kcal, protein: i.nutrition.protein, carbs: i.nutrition.carbs, fat: i.nutrition.fat }
            : null,
    }))
)}

규칙:
- 반드시 한국어만 사용하세요. 요리명은 간결한 ‘요리 이름’으로 작성하세요.
- 예시: "닭가슴살 오트밀 죽", "소고기 안심 스테이크", "연어 아보카도 샐러드"
- 'breakfast','lunch','dinner','추천 식단' 같은 일반 용어는 요리명 금지.
- 반드시 위 재료 id만 사용하세요.
- amount는 숫자, unit은 "g" | "ml" | "piece" 중 하나.
- 총 열량은 목표에 가깝게.
- JSON만 반환.`;

                let ai = await callAI(prompt);
                if (!ai || typeof ai !== "object" || Array.isArray(ai) || !ai.ingredients) {
                    ai = synthesizeMealFromIngredients(profile, type, available);
                }

                // DB 저장
                const mp = await prisma.mealplan.create({ data: { user_id: Number(userId), date, type } });
                const recipe = await prisma.recipe.create({
                    data: {
                        name: String(
                            ai.recipe_name ||
                                `${type === "breakfast" ? "아침" : type === "lunch" ? "점심" : "저녁"} 추천 식단`
                        ),
                        image_url: ai.image_url || null,
                        // AI가 steps 또는 instructions 배열을 줄 수 있으므로 저장
                        instructions: Array.isArray(ai.steps || ai.instructions) ? ai.steps || ai.instructions : null,
                    },
                });
                // 재료 저장
                const parts = Array.isArray(ai.ingredients) ? ai.ingredients : [];
                for (const part of parts) {
                    const ingId = Number(part.id);
                    if (!Number.isFinite(ingId)) continue;
                    await prisma.recipeingredient.create({
                        data: {
                            recipe_id: recipe.id,
                            ingredient_id: ingId,
                            amount: Number(part.amount || 0),
                            unit: String(part.unit || "g"),
                        },
                    });
                }
                // 영양 계산 및 스냅샷
                let total = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
                for (const part of parts) {
                    const ing = enriched.find((e) => e.id === Number(part.id));
                    const n = ing?.nutrition;
                    const amt = Number(part.amount || 0);
                    // nutrition이 100g 기준이라고 가정
                    const factor = part.unit === "piece" ? 1 : amt / 100;
                    if (n) {
                        total.kcal += (n.kcal || 0) * factor;
                        total.protein += (n.protein || 0) * factor;
                        total.carbs += (n.carbs || 0) * factor;
                        total.fat += (n.fat || 0) * factor;
                    }
                }
                const factor = Math.min(2, Math.max(0.5, perMeal / Math.max(1, total.kcal)));
                await prisma.mealplanrecipe.create({
                    data: {
                        mealplan_id: mp.id,
                        recipe_id: recipe.id,
                        portion_multiplier: factor,
                        assigned_kcal: total.kcal * factor,
                        assigned_protein: total.protein * factor,
                        assigned_carbs: total.carbs * factor,
                        assigned_fat: total.fat * factor,
                        goal_at_generation: mapGoal(user.goal) || null,
                    },
                });
            }
        }
        return res.json({ success: true, usedGemini });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "AI 기반 초기 식단 생성 실패" });
    }
});
// ---------- Weekly next-week generation (cron) ----------
app.get("/api/cron/generate-next-week", async (req, res) => {
    try {
        const authHeader = req.headers.authorization || "";
        if (authHeader !== `Bearer ${process.env.CRON_SECRET || "dev-cron"}`) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const users = await prisma.user.findMany({ where: {} });
        const nextMonday = startOfMonday(new Date(Date.now() + 7 * 86400000));
        const results = [];
        for (const u of users) {
            try {
                // check if already generated for that week
                const count = await prisma.mealplan.count({
                    where: {
                        user_id: u.id,
                        date: { gte: nextMonday, lt: new Date(nextMonday.getTime() + 7 * 86400000) },
                    },
                });
                if (count > 0) {
                    results.push({ userId: u.id, status: "exists" });
                    continue;
                }
                const daily = adjustByGoal(tdee(u), u.goal);
                const perMeal = daily / 3;
                for (let d = 0; d < 7; d++) {
                    const date = new Date(nextMonday);
                    date.setDate(nextMonday.getDate() + d);
                    for (const type of ["breakfast", "lunch", "dinner"]) {
                        const mp = await prisma.mealplan.create({
                            data: { user_id: u.id, date, type },
                        });
                        const picks = await pickRecipesByGoal(u.goal, 1);
                        if (picks.length) {
                            const r = picks[0];
                            const base = computeRecipeKcal(r);
                            const factor = Math.min(2, Math.max(0.5, perMeal / Math.max(1, base.kcal)));
                            await prisma.mealplanrecipe.create({
                                data: {
                                    mealplan_id: mp.id,
                                    recipe_id: r.id,
                                    portion_multiplier: factor,
                                    assigned_kcal: base.kcal * factor,
                                    assigned_protein: base.protein * factor,
                                    assigned_carbs: base.carbs * factor,
                                    assigned_fat: base.fat * factor,
                                    goal_at_generation: mapGoal(u.goal) || null,
                                },
                            });
                        }
                    }
                }
                results.push({ userId: u.id, status: "generated" });
            } catch (err) {
                console.error("weekly generate error user", u.id, err);
                results.push({ userId: u.id, status: "failed" });
            }
        }
        return res.json({ success: true, results });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "주간 생성 실패" });
    }
});

// ---------- Shopping cart (weekly ingredient aggregation) ----------
app.get("/api/shopping-cart", auth, async (req, res) => {
    try {
        const userId = Number(req.user.uid);
        const weekStart = req.query.weekStart ? new Date(String(req.query.weekStart)) : startOfMonday();
        const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
        const plans = await prisma.mealplan.findMany({
            where: { user_id: userId, date: { gte: weekStart, lt: weekEnd } },
            include: {
                mealplanrecipe: {
                    include: {
                        recipe: { include: { recipeingredient: { include: { ingredient: true } } } },
                    },
                },
            },
        });
        const map = new Map();
        for (const p of plans) {
            for (const mr of p.mealplanrecipe) {
                const factor = Number(mr.portion_multiplier || 1);
                for (const ri of mr.recipe.recipeingredient) {
                    const unit = (ri.unit || "g").toLowerCase();
                    const key = `${ri.ingredient_id}:${unit}`;
                    const amt = (ri.amount || 0) * factor;
                    if (map.has(key)) {
                        const it = map.get(key);
                        it.totalAmount += amt;
                    } else {
                        map.set(key, {
                            id: ri.ingredient_id,
                            name: ri.ingredient.name,
                            category: ri.ingredient.category,
                            unit,
                            totalAmount: amt,
                        });
                    }
                }
            }
        }
        const items = Array.from(map.values()).sort((a, b) => (a.category || "").localeCompare(b.category || ""));
        return res.json({ weekStart, weekEnd, items, totalItems: items.length });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "장바구니 조회 실패" });
    }
});

// ---------- Weekly meal snapshot fetch ----------
app.get("/api/meal/week", auth, async (req, res) => {
    try {
        const userId = Number(req.user.uid);
        const weekStart = req.query.weekStart ? new Date(String(req.query.weekStart)) : startOfMonday();
        const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
        const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);
        const dateKeyLocal = (d) => {
            const x = new Date(d);
            return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
        };
        const plans = await prisma.mealplan.findMany({
            where: { user_id: userId, date: { gte: weekStart, lt: weekEnd } },
            orderBy: [{ date: "asc" }, { type: "asc" }],
            include: {
                mealplanrecipe: {
                    include: {
                        recipe: true,
                    },
                },
            },
        });
        const byDate = new Map();
        for (const p of plans) {
            const key = dateKeyLocal(p.date);
            if (!byDate.has(key)) byDate.set(key, []);
            byDate.get(key).push(p);
        }
        const toKLabel = (t) =>
            t === "breakfast" ? "아침" : t === "lunch" ? "점심" : t === "dinner" ? "저녁" : "간식";
        const toTime = (k) => (k === "아침" ? "08:00" : k === "점심" ? "12:30" : k === "저녁" ? "18:30" : "15:30");
        const days = Array.from(byDate.entries()).map(([date, arr]) => {
            // 식사 순서 고정: 아침 -> 점심 -> 저녁
            const typeOrder = { breakfast: 0, lunch: 1, dinner: 2 };
            arr.sort((a, b) => (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99));

            const groups = arr.map((mp) => {
                const label = toKLabel(mp.type);
                // 한 끼에 여러 레시피가 있을 수 있으나, 현재는 1개만 사용
                const mr = mp.mealplanrecipe[0];
                const name = mr?.recipe?.name || "추천 식단";
                const kcal = Math.round(Number(mr?.assigned_kcal || 0));
                const item = { time: toTime(label), name, kcal, recipeId: mr?.recipe_id };
                return { label, items: [item] };
            });
            return { date, meals: groups };
        });
        return res.json(days);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "주간 식단 조회 실패" });
    }
});
// User profile APIs
app.get("/api/user/:id", auth, async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (req.user?.uid !== id) return res.status(403).json({ error: "권한 없음" });
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) return res.status(404).json({ error: "사용자 없음" });
        return res.json(user);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "조회 실패" });
    }
});

// ---------- Weekly meal via AI (no DB save) ----------
app.get("/api/meal/week-ai", auth, async (req, res) => {
    try {
        const userId = Number(req.user.uid);
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ error: "사용자 없음" });

        const ingredients = await prisma.ingredient.findMany();
        const nutritions = await prisma.nutrition.findMany();
        const nutMap = new Map(nutritions.map((n) => [n.id, n]));
        const enriched = ingredients.map((it) => ({
            ...it,
            nutrition: it.nutrition_id ? nutMap.get(it.nutrition_id) : null,
        }));
        const available = filterIngredients(enriched, user);

        const daily = adjustByGoal(tdee(user), user.goal);
        const perMeal = daily / 3;

        const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);
        const dateKeyLocal = (d) => {
            const x = new Date(d);
            return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
        };
        const toKLabel = (t) => (t === "breakfast" ? "아침" : t === "lunch" ? "점심" : "저녁");
        const toTime = (k) => (k === "아침" ? "08:00" : k === "점심" ? "12:30" : "18:30");

        const start = req.query.weekStart ? new Date(String(req.query.weekStart)) : startOfMonday();
        const days = [];
        for (let d = 0; d < 7; d++) {
            const date = new Date(start);
            date.setDate(start.getDate() + d);
            const meals = [];
            for (const type of ["breakfast", "lunch", "dinner"]) {
                const profile = {
                    goal: user.goal || "diet",
                    calorie_target: Math.round(perMeal),
                    allergies: Array.isArray(user.allergies) ? user.allergies : [],
                    dislike_ingredients: Array.isArray(user.dislike_ingredients) ? user.dislike_ingredients : [],
                };
                const prompt = `사용자 목표: ${profile.goal}
1식 목표 칼로리(근사): ${profile.calorie_target}
알레르기: ${(profile.allergies || []).join(", ")}
식사 시간: ${type}

사용 가능한 재료(반드시 id만 사용, nutrition은 100g 기준일 수 있음):
${JSON.stringify(
    available.map((i) => ({
        id: i.id,
        name: i.name,
        category: i.category,
        nutrition: i.nutrition
            ? { kcal: i.nutrition.kcal, protein: i.nutrition.protein, carbs: i.nutrition.carbs, fat: i.nutrition.fat }
            : null,
    }))
)}

규칙:
- 반드시 한국어만 사용하세요. 요리명은 간결한 ‘요리 이름’으로 작성하세요.
- 예시: "닭가슴살 오트밀 죽", "소고기 안심 스테이크", "연어 아보카도 샐러드"
- 'breakfast','lunch','dinner','추천 식단' 같은 일반 용어는 요리명 금지.
- 반드시 위 재료 id만 사용하세요.
- amount는 숫자, unit은 "g" | "ml" | "piece" 중 하나.
- 총 열량은 목표에 가깝게.
- JSON만 반환.`;

                let ai = await callAI(prompt);
                if (!ai || typeof ai !== "object" || Array.isArray(ai) || !ai.ingredients) {
                    ai = synthesizeMealFromIngredients(profile, type, available);
                }
                const label = toKLabel(type);
                const item = {
                    time: toTime(label),
                    name: String(ai.recipe_name || "추천 요리"),
                    kcal: Math.round(Number(ai.total_calories || 0)),
                    ingredients: Array.isArray(ai.ingredients)
                        ? ai.ingredients.map((p) => ({
                              name: String(p.name || ""),
                              amount: Number(p.amount || 0),
                              unit: String(p.unit || "g"),
                          }))
                        : [],
                    steps: Array.isArray(ai.steps || ai.instructions) ? ai.steps || ai.instructions : [],
                    imageUrl: ai.image_url || null,
                };
                meals.push({ label, items: [item] });
            }
            days.push({ date: dateKeyLocal(date), meals });
        }
        return res.json(days);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "AI 주간 식단 조회 실패" });
    }
});
// 레시피 상세 (재료 + 조리순서)
app.get("/api/recipe/:id", auth, async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });
        const recipe = await prisma.recipe.findUnique({
            where: { id },
            include: {
                recipeingredient: { include: { ingredient: true } },
            },
        });
        if (!recipe) return res.status(404).json({ error: "not found" });
        const ingredients = (recipe.recipeingredient || []).map((ri) => ({
            id: ri.ingredient_id,
            name: ri.ingredient?.name,
            amount: ri.amount,
            unit: ri.unit || "g",
        }));
        const steps = Array.isArray(recipe.instructions) ? recipe.instructions : [];
        return res.json({
            id: recipe.id,
            name: recipe.name,
            image_url: recipe.image_url,
            steps,
            ingredients,
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "레시피 조회 실패" });
    }
});
app.put("/api/user/:id", auth, async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (req.user?.uid !== id) return res.status(403).json({ error: "권한 없음" });
        const data = req.body || {};
        // camelCase → snake_case 매핑
        const patch = {
            name: data.name,
            gender: data.gender,
            age: data.age,
            goal: data.goal,
            calorie_target: data.calorie_target,
            allergies: data.allergies ?? [],
            dislike_ingredients: data.dislike_ingredients ?? [],
            height_cm: data.heightCm ?? null,
            weight_kg: data.weightKg ?? null,
            bmi: data.bmi ?? null,
            disease: data.disease ?? null,
        };
        const updated = await prisma.user.update({
            where: { id },
            data: patch,
        });
        return res.json(updated);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "업데이트 실패" });
    }
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
    console.log(`[aidiet-api] listening on http://localhost:${port}`);
});
