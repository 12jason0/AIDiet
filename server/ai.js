// 간단한 AI 호출 래퍼. OPENAI_API_KEY 없으면 규칙 기반 결과 반환

function hasOpenAIKey() {
    return typeof process !== "undefined" && process.env && process.env.OPENAI_API_KEY;
}

export async function callAI(prompt) {
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
        } catch (e) {
            // 실패 시 규칙 기반으로 폴백
        }
    }
    // 폴백: 재료 풀에서 단순 조합
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
    return {
        recipe_name: `${mealType} 추천 식단`,
        ingredients: base.map((it) => ({ id: it.id, amount: 100, unit: "g", name: it.name })),
        total_calories: Math.round(total.kcal),
        protein: Math.round(total.protein),
        carbs: Math.round(total.carbs),
        fat: Math.round(total.fat),
        source: "fallback",
    };
}


