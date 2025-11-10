import { useEffect, useMemo, useState } from "react";
import { DayMeals, fetchWeekPlanFromDB, getTodayMeals } from "../lib/diet";

const MEAL_ICON: Record<string, string> = { 아침: "🌅", 점심: "☀️", 저녁: "🌙", 간식: "🍪" };

export function HomePage() {
    const [userId, setUserId] = useState<number | null>(null);
    const [user, setUser] = useState<any>(null);
    const [week, setWeek] = useState<DayMeals[]>([]);
    const [previews, setPreviews] = useState<
        Array<{ id: number; name: string; image_url?: string | null; kcal?: number }>
    >([]);

    useEffect(() => {
        const sp = new URLSearchParams(window.location.search);
        const idParam = sp.get("userId");
        const id = idParam ? Number(idParam) : null;
        setUserId(id);
        if (!id) return;
        // 프로필 (JWT 포함)
        const token = localStorage.getItem("aidiet.token") || "";
        fetch(`/api/user/${id}`, { headers: { Authorization: token ? `Bearer ${token}` : "" } })
            .then((r) => (r.ok ? r.json() : null))
            .then(setUser)
            .catch(() => setUser(null));
        // 주간 식단
        fetchWeekPlanFromDB(id)
            .then(setWeek)
            .catch(() => setWeek([]));
    }, []);

    // DB 레시피 미리보기는 로그인 여부와 관계없이 노출
    useEffect(() => {
        // 프록시 문제 시를 대비해 개발 포트(5174)에서는 API 서버 절대 경로를 사용
        const API_BASE =
            typeof window !== "undefined" && window.location.port === "5174" ? "http://127.0.0.1:4000" : "";
        const token = localStorage.getItem("aidiet.token") || "";
        fetch(`${API_BASE}/api/recipes/preview?limit=6`, {
            headers: { Authorization: token ? `Bearer ${token}` : "" },
        })
            .then((r) => r.json())
            .then((arr) => (Array.isArray(arr) ? setPreviews(arr) : setPreviews([])))
            .catch(() => setPreviews([]));
    }, []);
    // 추천 레시피는 모달로만 표시: 데이터가 오면 자동 오픈(한 번만)
    useEffect(() => {
        if (previews.length > 0 && !isPreviewOpen) {
            setIsPreviewOpen(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [previews.length]);

    const today: DayMeals | null = useMemo(() => getTodayMeals(week), [week]);

    const visibleGroups = today ? today.meals.filter((g) => ["아침", "점심", "저녁", "간식"].includes(g.label)) : [];

    const perMealKcal = visibleGroups.map((g) => ({
        label: g.label,
        kcal: g.items[0]?.kcal ?? 0,
    }));

    const totalKcal = perMealKcal.reduce((sum, m) => sum + m.kcal, 0);
    const [selected, setSelected] = useState<string>("");
    useEffect(() => {
        if (perMealKcal[0]?.label) setSelected(perMealKcal[0].label);
    }, [today?.date]);
    const selectedGroup = visibleGroups.find((g) => g.label === selected);

    // 각 식사의 비율 계산
    const getPercentage = (kcal: number) => (totalKcal > 0 ? Math.round((kcal / totalKcal) * 100) : 0);

    // 레시피 모달 상태
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalRecipe, setModalRecipe] = useState<{ title: string; imageUrl: string; steps: string[] } | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const getRecipeInfo = (name: string, label: string): { title: string; imageUrl: string; steps: string[] } => {
        // 간단 매핑 + 폴백 이미지/스텝
        const keyword = name.includes("샐러드")
            ? "salad"
            : name.includes("스테이크")
            ? "steak"
            : name.includes("요거트")
            ? "yogurt"
            : label === "아침"
            ? "breakfast"
            : label === "점심"
            ? "lunch"
            : label === "저녁"
            ? "dinner"
            : "meal";
        const imageUrl = `https://source.unsplash.com/800x600/?${encodeURIComponent(keyword)}`;
        const steps = [
            "재료를 깨끗이 손질합니다.",
            "팬 또는 오븐을 예열합니다.",
            "재료를 조리 순서에 맞춰 조리합니다.",
            "간으로 맛을 맞추고 플레이팅합니다.",
        ];
        return { title: name, imageUrl, steps };
    };

    return (
        <div className="home-screen">
            <div className="home-container">
                {/* 인라인 프리뷰는 제거하고 모달로만 노출 */}
                <div className="home-header">
                    <div className="header-content">
                        <div className="logo-wrapper">
                            <h1>AIDiet</h1>
                            <span className="ai-badge">AI</span>
                        </div>
                        <div className="greeting">안녕하세요{user?.goal ? `, ${user.goal} 목표` : ""} 👋</div>
                        <div className="greeting-sub">오늘도 건강한 하루를 시작해보세요</div>
                    </div>
                </div>

                <div className="calorie-main">
                    <div className="calorie-header">
                        <div className="calorie-label">
                            <span className="label-icon">📊</span>
                            오늘의 권장 칼로리
                            <span className="ai-badge">AI 추천</span>
                        </div>
                    </div>

                    <div className="calorie-display">
                        <span className="calorie-value">{totalKcal.toLocaleString()}</span>
                        <span className="calorie-unit">kcal</span>
                    </div>

                    <div className="calorie-subtext">오늘 계획된 총 {perMealKcal.length}개 식사</div>

                    <div className="calorie-breakdown">
                        {perMealKcal.map((m) => (
                            <div key={m.label} className="breakdown-item">
                                <div className="breakdown-header">
                                    <span className="breakdown-label">
                                        {MEAL_ICON[m.label]} {m.label}
                                    </span>
                                    <span className="breakdown-value">
                                        {m.kcal} kcal ({getPercentage(m.kcal)}%)
                                    </span>
                                </div>
                                <div className="progress-bar">
                                    <div
                                        className={`progress-fill ${m.label}`}
                                        style={{ width: `${getPercentage(m.kcal)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="meal-detail-grid">
                    <div className="meal-section">
                        <h2 className="section-title">식사 선택</h2>
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
                                    {selected === m.label && <div className="active-indicator">✓</div>}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="nutrition-section">
                        <div className="nutrition-header">
                            <div className="nutrition-icon">{MEAL_ICON[selected] ?? "🍽️"}</div>
                            <div className="nutrition-title-wrapper">
                                <div className="section-title">{selected || "식단"} 상세</div>
                                <div className="section-subtitle">상세 메뉴</div>
                            </div>
                        </div>

                        {!selectedGroup && (
                            <div className="empty-state">
                                <div className="empty-icon">🍽️</div>
                                <div className="muted">선택된 식단이 없습니다</div>
                                <div className="empty-subtext">위에서 식사를 선택해주세요</div>
                            </div>
                        )}

                        {selectedGroup && (
                            <ul className="list">
                                {selectedGroup.items.slice(0, 1).map((m, i) => (
                                    <li
                                        key={i}
                                        className="row"
                                        onClick={() => {
                                            const info = getRecipeInfo(m.name, selected);
                                            setModalRecipe(info);
                                            setIsModalOpen(true);
                                        }}
                                        role="button"
                                        style={{ cursor: "pointer" }}
                                    >
                                        <div className="row-left">
                                            <div className="time-badge">{m.time}</div>
                                            <span className="meal-item-name">{m.name}</span>
                                        </div>
                                        <div className="row-right">
                                            <span className="meal-item-kcal">{m.kcal}</span>
                                            <span className="muted">kcal</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {isModalOpen && modalRecipe && (
                    <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <div className="modal-title">{modalRecipe.title}</div>
                                <button className="modal-close" aria-label="닫기" onClick={() => setIsModalOpen(false)}>
                                    ✕
                                </button>
                            </div>
                            <div className="modal-body">
                                <img className="modal-image" src={modalRecipe.imageUrl} alt={modalRecipe.title} />
                                <div className="modal-section-title">레시피</div>
                                <ol className="recipe-steps">
                                    {modalRecipe.steps.map((s, idx) => (
                                        <li key={idx}>{s}</li>
                                    ))}
                                </ol>
                            </div>
                        </div>
                    </div>
                )}

                {/* 추천 레시피 모달 (3개, 가로 스크롤) */}
                {isPreviewOpen && (
                    <div className="modal-overlay" onClick={() => setIsPreviewOpen(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <div className="modal-title">추천 레시피</div>
                                <button
                                    className="modal-close"
                                    aria-label="닫기"
                                    onClick={() => setIsPreviewOpen(false)}
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="carousel">
                                    {previews.slice(0, 3).map((r) => (
                                        <div
                                            key={r.id}
                                            className="carousel-item"
                                            role="button"
                                            onClick={() => {
                                                setIsPreviewOpen(false);
                                                setModalRecipe({
                                                    title: r.name,
                                                    imageUrl:
                                                        (r.image_url as string) ||
                                                        `https://source.unsplash.com/800x600/?${encodeURIComponent(
                                                            r.name
                                                        )}`,
                                                    steps: [],
                                                });
                                                setIsModalOpen(true);
                                            }}
                                        >
                                            <div
                                                className="carousel-thumb"
                                                style={{
                                                    backgroundImage: r.image_url ? `url(${r.image_url})` : undefined,
                                                }}
                                            />
                                            <div className="carousel-title">{r.name}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
