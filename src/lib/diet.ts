export type MealTime = "아침" | "점심" | "간식" | "저녁";

export interface MealEntry {
    time: string; // HH:mm
    name: string;
    kcal: number;
    tags?: string[];
}

export interface DayMeals {
    date: string; // YYYY-MM-DD
    meals: Array<{ label: MealTime; items: MealEntry[] }>;
}

// DB 기반: 서버에서 주간 식단을 생성해 가져옴
export async function fetchWeekPlanFromDB(userId: number): Promise<DayMeals[]> {
    const res = await fetch("/api/meal/generate-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error("주간 식단 생성 실패");
    type AIRecipe = {
        recipe_name?: string;
        total_calories?: number;
        protein?: number;
        carbs?: number;
        fat?: number;
        image_url?: string;
        ingredients?: Array<{ id: number; amount: number; unit: string }>;
    };
    const plan = (await res.json()) as Array<{ date: string | Date; meals: Record<string, AIRecipe> }>;
    // 서버는 breakfast/lunch/dinner 키를 반환 → 한글 라벨로 매핑
    const toK = (k: string): MealTime =>
        k === "breakfast" ? "아침" : k === "lunch" ? "점심" : k === "dinner" ? "저녁" : "간식";
    const toTime = (label: MealTime): string =>
        label === "아침" ? "08:00" : label === "점심" ? "12:30" : label === "저녁" ? "18:30" : "15:30";
    return plan.map((d) => {
        const dateISO = typeof d.date === "string" ? d.date : new Date(d.date).toISOString();
        const entries: DayMeals = {
            date: dateISO.slice(0, 10),
            meals: Object.entries(d.meals as Record<string, AIRecipe>).map(([k, v]) => {
                const label = toK(k);
                // v는 AI가 생성한 레시피 객체 → UI 호환 형태로 축약
                const kcal = Number(v?.total_calories ?? 0);
                const name = String(v?.recipe_name ?? "추천 식단");
                const item: MealEntry = { time: toTime(label), name, kcal };
                return { label, items: [item] };
            }),
        };
        return entries;
    });
}

export function getTodayMeals(week: DayMeals[], now: Date = new Date()): DayMeals | null {
    const today = now.toISOString().slice(0, 10);
    return week.find((d) => d.date === today) ?? null;
}
