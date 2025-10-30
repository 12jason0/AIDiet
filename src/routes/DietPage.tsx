import { useMemo } from "react";
import { generateWeekPlan, loadProfile } from "../lib/diet";

export function DietPage() {
    const profile = loadProfile();
    const week = useMemo(() => generateWeekPlan(undefined, profile.goal), [profile.goal]);

    return (
        <div>
            <h2>1주일 식단</h2>
            <div className="grid">
                {week.map((day) => (
                    <div className="card" key={day.date}>
                        <h3>{day.date}</h3>
                        {day.meals.map((group) => (
                            <div key={group.label} style={{ marginTop: 8 }}>
                                <div className="row" style={{ justifyContent: "space-between" }}>
                                    <strong>{group.label}</strong>
                                </div>
                                <ul className="list">
                                    {group.items.map((m, idx) => (
                                        <li key={idx} className="row" style={{ justifyContent: "space-between" }}>
                                            <span>
                                                <strong>{m.time}</strong> {m.name}
                                            </span>
                                            <span className="muted">{m.kcal} kcal</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}


