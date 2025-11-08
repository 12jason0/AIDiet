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

app.post("/api/auth/register", async (req, res) => {
    try {
        const { email, password, name } = req.body || {};
        if (!email || !password || !name) return res.status(400).json({ error: "email, password, name 필요" });
        const exists = await prisma.user.findUnique({ where: { email } });
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
        const user = await prisma.user.findUnique({ where: { email } });
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
app.use(cors());
app.use(express.json());

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

        // 1) 사용 가능한 재료
        const ingredients = await prisma.ingredient.findMany({ include: { nutrition: true } });
        const availableIngredients = filterIngredients(ingredients, profile);

        // 2) AI 프롬프트 구성
        const prompt = `사용자 정보\n- 목표: ${profile.goal}\n- 목표 칼로리: ${profile.calorie_target}\n- 알레르기: ${(
            profile.allergies || []
        ).join(", ")}\n- 식사 시간: ${mealType}\n\n사용 가능한 재료: ${JSON.stringify(
            availableIngredients
        )}\n\n위 재료들을 조합해서 영양 균형이 맞는 식단을 JSON 형식으로 추천해주세요.`;

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

app.post("/api/meal/generate-week", async (req, res) => {
    try {
        const { userId } = req.body || {};
        if (!userId) return res.status(400).json({ error: "userId 필요" });

        const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
        if (!user) return res.status(404).json({ error: "사용자 없음" });

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
app.get("/api/recipes/preview", async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit || 6), 24);
        const recipes = await prisma.recipe.findMany({
            take: limit,
            orderBy: { id: "desc" },
            include: {
                recipeIngredients: {
                    include: { ingredient: { include: { nutrition: true } } },
                },
            },
        });
        const simplify = (r) => {
            const totals = r.recipeIngredients.reduce(
                (acc, ri) => {
                    const n = ri.ingredient?.nutrition || {};
                    acc.kcal += n.kcal || 0;
                    acc.protein += n.protein || 0;
                    acc.carbs += n.carbs || 0;
                    acc.fat += n.fat || 0;
                    return acc;
                },
                { kcal: 0, protein: 0, carbs: 0, fat: 0 }
            );
            return {
                id: r.id,
                name: r.name,
                image_url: r.image_url,
                cooking_time: r.cooking_time,
                kcal: Math.round(totals.kcal),
                protein: Math.round(totals.protein),
                carbs: Math.round(totals.carbs),
                fat: Math.round(totals.fat),
            };
        };
        return res.json(recipes.map(simplify));
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "미리보기 조회 실패" });
    }
});

// User profile APIs
app.get("/api/user/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) return res.status(404).json({ error: "사용자 없음" });
        return res.json(user);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "조회 실패" });
    }
});

app.put("/api/user/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const data = req.body || {};
        const updated = await prisma.user.update({
            where: { id },
            data: {
                name: data.name,
                gender: data.gender,
                age: data.age,
                goal: data.goal,
                calorie_target: data.calorie_target,
                allergies: data.allergies ?? [],
                dislike_ingredients: data.dislike_ingredients ?? [],
            },
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
