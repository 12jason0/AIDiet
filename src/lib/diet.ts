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

export interface ProfileData {
    heightCm: number | null;
    weightKg: number | null;
    bmi: number | null;
    disease: string;
    goal: "다이어트" | "벌크업" | "근력 증가" | "체중 증가" | "";
}

export function loadProfile(): ProfileData {
    const raw = localStorage.getItem("aidiet.profile");
    if (!raw) return { heightCm: null, weightKg: null, bmi: null, disease: "", goal: "" };
    try {
        return JSON.parse(raw) as ProfileData;
    } catch {
        return { heightCm: null, weightKg: null, bmi: null, disease: "", goal: "" };
    }
}

export function saveProfile(p: ProfileData) {
    localStorage.setItem("aidiet.profile", JSON.stringify(p));
}

function samplePool(goal: ProfileData["goal"]): Record<MealTime, MealEntry[]> {
    // 간단 샘플 메뉴 풀
    const common: Record<MealTime, MealEntry[]> = {
        아침: [
            { time: "08:00", name: "오트밀 + 바나나 + 요거트", kcal: 420, tags: ["탄단지"] },
            { time: "07:30", name: "계란스크램블 + 토스트 + 아보카도", kcal: 480 },
        ],
        점심: [
            { time: "12:30", name: "닭가슴살 샐러드 + 잡곡밥", kcal: 550 },
            { time: "13:00", name: "연어 스테이크 + 고구마", kcal: 600 },
        ],
        간식: [
            { time: "15:30", name: "그릭요거트 + 견과류", kcal: 250 },
            { time: "16:00", name: "프로틴 쉐이크", kcal: 200 },
        ],
        저녁: [
            { time: "19:00", name: "소고기 스테이크 + 샐러드", kcal: 650 },
            { time: "18:30", name: "두부부침 + 채소볶음 + 현미밥", kcal: 520 },
        ],
    };

    if (goal === "다이어트") {
        common["저녁"] = [
            { time: "18:30", name: "연두부 + 샐러드 + 현미밥 소량", kcal: 430 },
            { time: "19:00", name: "닭가슴살 + 구운야채", kcal: 480 },
        ];
    } else if (goal === "벌크업" || goal === "체중 증가") {
        common["간식"].push({ time: "17:30", name: "땅콩버터 바나나 샌드위치", kcal: 380 });
    } else if (goal === "근력 증가") {
        common["아침"].push({ time: "07:00", name: "계란 3개 + 현미밥 + 김", kcal: 520 });
    }

    return common;
}

export function generateWeekPlan(startDateISO?: string, goal: ProfileData["goal"] = ""): DayMeals[] {
    const start = startDateISO ? new Date(startDateISO) : new Date();
    // 주의 시작을 월요일로 맞춤
    const day = start.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(start);
    monday.setDate(start.getDate() + diffToMonday);

    const pool = samplePool(goal);
    const week: DayMeals[] = [];
    const includeSnack = goal === "벌크업" || goal === "체중 증가";
    for (let i = 0; i < 7; i++) {
        const dt = new Date(monday);
        dt.setDate(monday.getDate() + i);
        const date = dt.toISOString().slice(0, 10);
        week.push({
            date,
            meals: ((includeSnack ? ["아침", "점심", "간식", "저녁"] : ["아침", "점심", "저녁"]) as MealTime[]).map(
                (label) => ({
                    label,
                    items: pool[label],
                })
            ),
        });
    }
    return week;
}

export function getTodayMeals(week: DayMeals[], now: Date = new Date()): DayMeals | null {
    const today = now.toISOString().slice(0, 10);
    return week.find((d) => d.date === today) ?? null;
}

export function sortByNearest(meals: MealEntry[], now: Date = new Date()): MealEntry[] {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const withDiff = meals.map((m) => {
        const [hh, mm] = m.time.split(":").map(Number);
        const minutes = hh * 60 + mm;
        const diff = minutes - nowMinutes;
        const normalized = diff < 0 ? diff + 24 * 60 : diff; // 다음날로 순환
        return { m, key: normalized };
    });
    withDiff.sort((a, b) => a.key - b.key);
    return withDiff.map((x) => x.m);
}
