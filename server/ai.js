// 간단한 AI 호출 래퍼. Gemini(우선) → OpenAI(있으면) → 규칙 기반 폴백

function hasGeminiKey() {
    return typeof process !== "undefined" && process.env && (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);
}
function getGeminiKey() {
    return process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
}
function hasOpenAIKey() {
    return typeof process !== "undefined" && process.env && process.env.OPENAI_API_KEY;
}

export async function callAI(prompt) {
    // 1) Gemini API
    if (hasGeminiKey()) {
        try {
            const key = getGeminiKey();
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [
                            {
                                role: "user",
                                parts: [
                                    {
                                        text:
                                            `${prompt}\n\n` +
                                            "Return ONLY a compact JSON object with keys: " +
                                            `{"recipe_name": string, "total_calories": number, "protein": number, "carbs": number, "fat": number, ` +
                                            `"ingredients": [{"id": number, "amount": number, "unit": "g" | "ml" | "piece"}]}`,
                                    },
                                ],
                            },
                        ],
                        generationConfig: { temperature: 0.2, topP: 0.9, maxOutputTokens: 800 },
                    }),
                }
            );
            const data = await res.json();
            const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
            // 응답이 코드펜스 포함일 수 있어 정제
            const text = String(raw).replace(/```(?:json)?/g, "").trim();
            return JSON.parse(text);
        } catch (_e) {
            // Gemini 실패 시 아래로 폴백
        }
    }
    // 2) OpenAI (옵션)
    if (hasOpenAIKey()) {
        try {
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "You are a nutrition planning assistant. Return ONLY valid JSON." },
                        { role: "user", content: prompt },
                    ],
                    temperature: 0.2,
                    response_format: { type: "json_object" },
                }),
            });
            const data = await res.json();
            const content = data?.choices?.[0]?.message?.content || "{}";
            return JSON.parse(content);
        } catch (_e) {
            // 실패 시 규칙 기반으로 폴백
        }
    }
    // 3) 폴백: 재료 풀에서 단순 조합
    return { __fallback: true };
}

export function synthesizeMealFromIngredients(profile, mealType, ingredients) {
    const pick = (n) => ingredients.slice(0, Math.max(0, Math.min(n, ingredients.length)));
    const base = pick(3);
    const total = base.reduce(
        (acc, it) => {
            const n = it.nutrition || {};
            acc.kcal += n.kcal || 0;
            acc.protein += n.protein || 0;
            acc.carbs += n.carbs || 0;
            acc.fat += n.fat || 0;
            return acc;
        },
        { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    );
    // 간단 이름 생성(한국어): 대표 재료 1~2개 + 형태
    const n1 = base[0]?.name || "영양";
    const n2 = base[1]?.name || "";
    let suffix = "요리";
    const main = `${n1}`;
    if (/오트밀|귀리/.test(main)) suffix = "죽";
    else if (/연어|안심|등심|스테이크|소고기|쇠고기/.test(main)) suffix = "스테이크";
    else if (/닭가슴살|샐러드채소|상추|양상추|야채/.test(main)) suffix = "샐러드";
    const title = n2 ? `${n1} ${n2} ${suffix}` : `${n1} ${suffix}`;

    return {
        recipe_name: title,
        ingredients: base.map((it) => ({ id: it.id, amount: 100, unit: "g", name: it.name })),
        total_calories: Math.round(total.kcal),
        protein: Math.round(total.protein),
        carbs: Math.round(total.carbs),
        fat: Math.round(total.fat),
        source: "fallback",
    };
}


