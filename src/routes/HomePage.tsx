import { useMemo, useState } from "react";
import { DayMeals, generateWeekPlan, getTodayMeals, loadProfile } from "../lib/diet";

const MEAL_ICON: Record<string, string> = { 아침: "🌅", 점심: "☀️", 저녁: "🌙", 간식: "🍪" };

export function HomePage() {
    const profile = loadProfile();
    const week = useMemo(() => generateWeekPlan(undefined, profile.goal), [profile.goal]);
    const today: DayMeals | null = getTodayMeals(week);

    const visibleGroups = today ? today.meals.filter((g) => ["아침", "점심", "저녁", "간식"].includes(g.label)) : [];

    const perMealKcal = visibleGroups.map((g) => ({
        label: g.label,
        kcal: g.items[0]?.kcal ?? 0,
    }));

    const totalKcal = perMealKcal.reduce((sum, m) => sum + m.kcal, 0);
    const [selected, setSelected] = useState<string>(perMealKcal[0]?.label ?? "");
    const selectedGroup = visibleGroups.find((g) => g.label === selected);

    return (
        <div className="home-screen">
            <div className="home-container">
                <div className="home-header">
                    <h1>AIDiet</h1>
                    <div className="greeting">안녕하세요{profile.goal ? `, ${profile.goal} 목표 중` : ""} 👋</div>
                </div>

                <div className="calorie-main">
                    <div className="calorie-label">
                        오늘의 권장 칼로리 <span className="ai-badge">AI 추천</span>
                    </div>
                    <div>
                        <span className="calorie-value">{totalKcal}</span>
                        <span className="calorie-unit">kcal</span>
                    </div>
                    <div className="calorie-subtext">오늘 계획된 식단 총 칼로리</div>
                </div>

                <div className="meal-cards">
                    {perMealKcal.map((m) => (
                        <div
                            className={`meal-card${selected === m.label ? " active" : ""}`}
                            key={m.label}
                            onClick={() => setSelected(m.label)}
                        >
                            <div className="meal-icon">{MEAL_ICON[m.label] ?? "🍽️"}</div>
                            <div className="meal-name">{m.label}</div>
                            <div className="meal-kcal">
                                {m.kcal} <span className="meal-kcal-unit">kcal</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="nutrition-section">
                    <div className="section-title">{selected || "식단"} 상세</div>
                    {!selectedGroup && <div className="muted">선택된 식단이 없습니다.</div>}
                    {selectedGroup && (
                        <ul className="list">
                            {selectedGroup.items.map((m, i) => (
                                <li key={i} className="row" style={{ justifyContent: "space-between" }}>
                                    <span>
                                        <strong>{m.time}</strong> {m.name}
                                    </span>
                                    <span className="muted">{m.kcal} kcal</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
