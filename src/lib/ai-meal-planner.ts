export interface UserProfile {
    goal: "diet" | "muscle_gain" | "low_sugar";
    calorie_target: number;
    allergies: string[];
    dislike_ingredients: string[];
}

export async function generatePersonalizedMeal(profile: UserProfile, mealType: string) {
    const res = await fetch("/api/meal/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, mealType }),
    });
    if (!res.ok) throw new Error("식단 생성 실패");
    return await res.json();
}

export async function generateWeekMealPlan(userId: number) {
    const res = await fetch("/api/meal/generate-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error("주간 식단 생성 실패");
    return await res.json();
}
