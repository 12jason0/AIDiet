export type MealTime = "아침" | "점심" | "간식" | "저녁";

export interface MealEntry {
    time: string; // HH:mm
    name: string;
    kcal: number;
    tags?: string[];
    recipeId?: number;
    ingredients?: Array<{ name: string; amount: number; unit: string }>;
    steps?: string[];
    imageUrl?: string | null;
}

export interface DayMeals {
    date: string; // YYYY-MM-DD
    meals: Array<{ label: MealTime; items: MealEntry[] }>;
}

// DB 기반: 서버에서 주간 식단을 생성해 가져옴
export async function fetchWeekPlanFromDB(_userId: number): Promise<DayMeals[]> {
    const token = localStorage.getItem("aidiet.token") || "";
    // 요구사항: Gemini 기반으로 주간 식단을 표시 (DB 저장 없이)
    const res = await fetch(`/api/meal/week-ai`, { headers: { Authorization: token ? `Bearer ${token}` : "" } });
    if (!res.ok) throw new Error("AI 주간 식단 조회 실패");
    const days = (await res.json()) as DayMeals[];
    return days;
}

export function getTodayMeals(week: DayMeals[], now: Date = new Date()): DayMeals | null {
    const today = now.toISOString().slice(0, 10);
    return week.find((d) => d.date === today) ?? null;
}
