import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DayMeals, fetchWeekPlanFromDB } from "../lib/diet";

async function triggerInitialAI(): Promise<boolean> {
    const token = localStorage.getItem("aidiet.token") || "";
    const res = await fetch(`/api/meal/generate-initial-ai`, { method: "POST", headers: { Authorization: token ? `Bearer ${token}` : "" } });
    return res.ok;
}

export function DietPage() {
    const [week, setWeek] = useState<DayMeals[]>([]);
    const [userId, setUserId] = useState<number | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [detail, setDetail] = useState<{
        title: string;
        imageUrl?: string | null;
        ingredients: Array<{ name: string; amount: number; unit: string }>;
        steps: string[];
    } | null>(null);

    useEffect(() => {
        const sp = new URLSearchParams(window.location.search);
        const idParam = sp.get("userId");
        let id = idParam ? Number(idParam) : null;
        if (!id) {
            try {
                const u = localStorage.getItem("aidiet.user");
                const parsed = u ? JSON.parse(u) : null;
                if (parsed?.id) {
                    id = Number(parsed.id);
                    navigate(`/diet?userId=${id}`, { replace: true });
                }
            } catch {}
        }
        setUserId(id);
        if (!id) {
            setLoading(false);
            return;
        }
        fetchWeekPlanFromDB(id)
            .then((d) => setWeek(d))
            .catch((e) => setError(String(e?.message || e)))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div>
            <h2>1주일 식단</h2>
            {!userId && <p className="muted">URL에 ?userId=숫자를 포함해 주세요.</p>}
            {loading && <div className="card">불러오는 중...</div>}
            {!loading && week.length === 0 && (
                <div className="card">
                    <div style={{ marginBottom: 8 }}>아직 생성된 식단이 없습니다.</div>
                    <button
                        className="btn"
                        onClick={async () => {
                            const ok = await triggerInitialAI();
                            if (!ok) return alert("식단 생성에 실패했습니다.");
                            if (userId) {
                                setLoading(true);
                                fetchWeekPlanFromDB(userId)
                                    .then(setWeek)
                                    .catch(() => {})
                                    .finally(() => setLoading(false));
                            }
                        }}
                    >
                        AI로 1주일 식단 생성
                    </button>
                </div>
            )}
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
                                        <li
                                            key={idx}
                                            className="row"
                                            style={{ justifyContent: "space-between", cursor: m.recipeId ? "pointer" : "default" }}
                                            onClick={async () => {
                                                if (m.recipeId) {
                                                    const token = localStorage.getItem("aidiet.token") || "";
                                                    const res = await fetch(`/api/recipe/${m.recipeId}`, {
                                                        headers: { Authorization: token ? `Bearer ${token}` : "" },
                                                    }).catch(() => null);
                                                    if (!res || !res.ok) return;
                                                    const r = await res.json();
                                                    setDetail({
                                                        title: r.name,
                                                        imageUrl: r.image_url,
                                                        ingredients: (r.ingredients || []).map((it: any) => ({
                                                            name: it.name,
                                                            amount: Number(it.amount || 0),
                                                            unit: String(it.unit || "g"),
                                                        })),
                                                        steps: Array.isArray(r.steps) ? r.steps : [],
                                                    });
                                                    setIsModalOpen(true);
                                                    return;
                                                }
                                                // AI 기반 응답에 포함된 상세를 그대로 사용
                                                if ((m as any).ingredients || (m as any).steps || (m as any).imageUrl) {
                                                    setDetail({
                                                        title: m.name,
                                                        imageUrl: (m as any).imageUrl,
                                                        ingredients: ((m as any).ingredients || []).map((it: any) => ({
                                                            name: it.name,
                                                            amount: Number(it.amount || 0),
                                                            unit: String(it.unit || "g"),
                                                        })),
                                                        steps: Array.isArray((m as any).steps) ? (m as any).steps : [],
                                                    });
                                                    setIsModalOpen(true);
                                                }
                                            }}
                                        >
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

            {isModalOpen && detail && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">{detail.title}</div>
                            <button className="modal-close" aria-label="닫기" onClick={() => setIsModalOpen(false)}>
                                ✕
                            </button>
                        </div>
                        <div className="modal-body">
                            <div style={{ marginBottom: 12 }}>
                                <a
                                    className="btn"
                                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                                        `${detail.title} 레시피`
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    유튜브에서 레시피 보기
                                </a>
                            </div>
                            {detail.imageUrl && (
                                <img className="modal-image" src={detail.imageUrl} alt={detail.title} />
                            )}
                            <div className="modal-section-title">재료</div>
                            <ul className="list">
                                {detail.ingredients.map((ing, i) => (
                                    <li key={i} className="row" style={{ justifyContent: "space-between" }}>
                                        <span>{ing.name}</span>
                                        <span className="muted">
                                            {Math.round(ing.amount)} {ing.unit}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            <div className="modal-section-title">조리 순서</div>
                            <ol className="recipe-steps">
                                {detail.steps.length > 0 ? (
                                    detail.steps.map((s, i) => <li key={i}>{s}</li>)
                                ) : (
                                    <li>조리 단계 정보가 없습니다.</li>
                                )}
                            </ol>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


