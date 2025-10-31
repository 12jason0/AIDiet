import { useEffect, useState } from "react";
import { DayMeals, fetchWeekPlanFromDB } from "../lib/diet";

export function DietPage() {
    const [week, setWeek] = useState<DayMeals[]>([]);
    const [userId, setUserId] = useState<number | null>(null);

    useEffect(() => {
        const sp = new URLSearchParams(window.location.search);
        const idParam = sp.get("userId");
        const id = idParam ? Number(idParam) : null;
        setUserId(id);
        if (!id) return;
        fetchWeekPlanFromDB(id).then(setWeek).catch(() => setWeek([]));
    }, []);

    return (
        <div>
            <h2>1주일 식단</h2>
            {!userId && <p className="muted">URL에 ?userId=숫자를 포함해 주세요.</p>}
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


