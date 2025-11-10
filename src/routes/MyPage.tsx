import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type DbUser = {
    id: number;
    name: string;
    gender?: string | null;
    age?: number | null;
    goal?: string | null;
    calorie_target?: number | null;
    allergies?: string[] | null;
    dislike_ingredients?: string[] | null;
    heightCm?: number | null; // 확장 여지, 현재 스키마엔 없음
    weightKg?: number | null; // 확장 여지, 현재 스키마엔 없음
    bmi?: number | null; // 확장 여지
    disease?: string | null; // 확장 여지
};

export function MyPage() {
    const navigate = useNavigate();
    const [userId, setUserId] = useState<number | null>(null);
    const [form, setForm] = useState<Partial<DbUser>>({});
    const [original, setOriginal] = useState<Partial<DbUser>>({});
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);

    const bmiCalc = useMemo(() => {
        if (!form.heightCm || !form.weightKg) return null;
        const h = form.heightCm / 100;
        return Number((form.weightKg / (h * h)).toFixed(1));
    }, [form.heightCm, form.weightKg]);
    const originalBmi = useMemo(() => {
        if (!original.heightCm || !original.weightKg) return null;
        const h = (original.heightCm as number) / 100;
        return Number(((original.weightKg as number) / (h * h)).toFixed(1));
    }, [original.heightCm, original.weightKg]);
    const hasProfile = useMemo(() => {
        return (
            !!original.goal ||
            !!original.disease ||
            original.heightCm != null ||
            original.weightKg != null ||
            (original as any).calorie_target != null ||
            original.age != null ||
            !!original.gender
        );
    }, [original]);

    useEffect(() => {
        setForm((prev) => ({ ...prev, bmi: bmiCalc ?? undefined }));
    }, [bmiCalc]);

    useEffect(() => {
        const token = typeof localStorage !== "undefined" ? localStorage.getItem("aidiet.token") : null;
        if (!token) {
            navigate("/login", { replace: true });
            return;
        }
        const sp = new URLSearchParams(window.location.search);
        const idParam = sp.get("userId");
        let id = idParam ? Number(idParam) : null;
        if (!id) {
            try {
                const u = typeof localStorage !== "undefined" ? localStorage.getItem("aidiet.user") : null;
                const parsed = u ? JSON.parse(u) : null;
                if (parsed?.id) {
                    id = Number(parsed.id);
                    navigate(`/mypage?userId=${id}`, { replace: true });
                }
            } catch {}
        }
        setUserId(id);
        if (!id) return;
        const token2 = localStorage.getItem("aidiet.token") || "";
        fetch(`/api/user/${id}`, { headers: { Authorization: token2 ? `Bearer ${token2}` : "" } })
            .then((r) => (r.ok ? r.json() : {}))
            .then((data) => {
                // 서버의 snake_case 필드를 화면용 camelCase로 매핑
                const mapped: Partial<DbUser> & {
                    heightCm?: number | null;
                    weightKg?: number | null;
                    bmi?: number | null;
                    disease?: string | null;
                } = {
                    ...data,
                    heightCm: data.height_cm ?? data.heightCm ?? null,
                    weightKg: data.weight_kg ?? data.weightKg ?? null,
                    bmi: data.bmi ?? null,
                    disease: data.disease ?? "",
                };
                setForm(mapped);
                setOriginal(mapped);
                // 저장된 값이 거의 없는 경우 최초 입력 모드로 전환
                const hasData =
                    !!mapped.goal ||
                    !!mapped.disease ||
                    mapped.heightCm != null ||
                    mapped.weightKg != null ||
                    (mapped as any).calorie_target != null ||
                    mapped.age != null ||
                    !!mapped.gender;
                setIsEditing(!hasData);
            })
            .catch(() => setForm({}));
    }, []);

    const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === "heightCm" || name === "weightKg") {
            const trimmed = value.trim();
            const num = Number(trimmed);
            setForm((prev) => ({
                ...prev,
                [name]: trimmed === "" || Number.isNaN(num) ? null : num,
            }));
            return;
        } else if (name === "age") {
            const trimmed = value.trim();
            const num = Number(trimmed);
            setForm((prev) => ({
                ...prev,
                age: trimmed === "" || Number.isNaN(num) ? null : num,
            }));
            return;
        }
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const onSave = async () => {
        if (!userId) return alert("userId가 필요합니다 (?userId=)");
        const token = localStorage.getItem("aidiet.token") || "";
        await fetch(`/api/user/${userId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
            body: JSON.stringify(form),
        });
        // 저장 후 초기 1주 식단 생성 트리거
        // Gemini 기반 초기 1주 식단 생성
        setIsGenerating(true);
        const res = await fetch(`/api/meal/generate-initial-ai`, {
            method: "POST",
            headers: { Authorization: token ? `Bearer ${token}` : "" },
        }).catch(() => null);
        setIsGenerating(false);
        let msg = "저장되었습니다. 1주일 식단을 생성했어요!";
        try {
            const json = res ? await res.json() : null;
            if (json?.usedGemini) msg += " (Gemini 사용)";
            else msg += " (AI 폴백 사용)";
        } catch {}
        alert(msg);
        setOriginal(form);
        setIsEditing(false);
        // 생성 완료 후 식단 페이지로 이동
        try {
            const u = localStorage.getItem("aidiet.user");
            const id = u ? JSON.parse(u)?.id : userId;
            if (id) navigate(`/diet?userId=${id}`);
        } catch {
            if (userId) navigate(`/diet?userId=${userId}`);
        }
    };

    return (
        <div>
            <h2>마이페이지</h2>
            <div className="grid" style={{ alignItems: "start" }}>
                <div className="card">
                    <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                        <h3 style={{ margin: 0 }}>현재 정보</h3>
        <div>
            <button className="btn" onClick={() => setIsEditing(true)}>수정하기</button>
        </div>
                    </div>
                    <ul className="list">
                        <li>키: {original.heightCm ?? "-"} cm</li>
                        <li>몸무게: {original.weightKg ?? "-"} kg</li>
                        <li>나이: {original.age ?? "-"}</li>
                        <li>성별: {original.gender || "-"}</li>
                        <li>BMI: {originalBmi ?? "-"}</li>
                        <li>질병: {original.disease || "-"}</li>
                        <li>목적: {original.goal || "-"}</li>
                    </ul>
                    <p className="muted">로그인 사용자 정보는 서버 DB를 통해 관리됩니다.</p>
                </div>
            </div>

            {/* 수정 모달 */}
            {isEditing && (
                <div className="modal-overlay" onClick={() => setIsEditing(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">정보 수정</div>
                            <button className="modal-close" aria-label="닫기" onClick={() => setIsEditing(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="row">
                                <label style={{ width: 100 }}>키(cm)</label>
                                <input className="input" name="heightCm" value={form.heightCm ?? ""} onChange={onChange} inputMode="decimal" />
                            </div>
                            <div className="row">
                                <label style={{ width: 100 }}>몸무게(kg)</label>
                                <input className="input" name="weightKg" value={form.weightKg ?? ""} onChange={onChange} inputMode="decimal" />
                            </div>
                            <div className="row">
                                <label style={{ width: 100 }}>BMI</label>
                                <input className="input" value={bmiCalc ?? ""} readOnly />
                            </div>
                            <div className="row">
                                <label style={{ width: 100 }}>나이</label>
                                <input className="input" name="age" value={form.age ?? ""} onChange={onChange} inputMode="numeric" />
                            </div>
                            <div className="row">
                                <label style={{ width: 100 }}>성별</label>
                                <select className="input" name="gender" value={form.gender ?? ""} onChange={onChange}>
                                    <option value="">선택</option>
                                    <option value="male">남성</option>
                                    <option value="female">여성</option>
                                    <option value="other">기타</option>
                                </select>
                            </div>
                            <div className="row">
                                <label style={{ width: 100 }}>질병</label>
                                <input className="input" name="disease" value={form.disease ?? ""} onChange={onChange} placeholder="예: 당뇨, 고혈압" />
                            </div>
                            <div className="row">
                                <label style={{ width: 100 }}>목적</label>
                                <select className="input" name="goal" value={form.goal ?? ""} onChange={onChange}>
                                    <option value="">선택</option>
                                    <option value="다이어트">다이어트</option>
                                    <option value="근육량 증가">근육량 증가</option>
                                    <option value="균형">균형</option>
                                    <option value="채식">채식</option>
                                </select>
                            </div>
                            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                                <button className="btn" onClick={onSave}>저장</button>
                                <button
                                    className="btn"
                                    style={{ background: "#6b7280", borderColor: "#6b7280" }}
                                    onClick={() => {
                                        setForm(original);
                                        setIsEditing(false);
                                    }}
                                >
                                    취소
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* AI 생성 진행 표식 */}
            {isGenerating && (
                <div className="modal-overlay">
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">AI 생성 중</div>
                        </div>
                        <div className="modal-body">
                            Gemini로 식단을 생성하고 있어요... 잠시만 기다려주세요.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

