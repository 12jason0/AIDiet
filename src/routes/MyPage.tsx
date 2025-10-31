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

    const bmiCalc = useMemo(() => {
        if (!form.heightCm || !form.weightKg) return null;
        const h = form.heightCm / 100;
        return Number((form.weightKg / (h * h)).toFixed(1));
    }, [form.heightCm, form.weightKg]);

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
        fetch(`/api/user/${id}`).then((r) => r.json()).then(setForm).catch(() => setForm({}));
    }, []);

    const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: name === "heightCm" || name === "weightKg" ? (value ? Number(value) : null) : value,
        }));
    };

    const onSave = async () => {
        if (!userId) return alert("userId가 필요합니다 (?userId=)");
        await fetch(`/api/user/${userId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        });
        alert("저장되었습니다.");
    };

    return (
        <div>
            <h2>마이페이지</h2>
            <div className="grid" style={{ alignItems: "start" }}>
                <div className="card">
                    <h3>내 정보</h3>
                    <div className="row">
                        <label style={{ width: 100 }}>키(cm)</label>
                        <input
                            className="input"
                            name="heightCm"
                            value={form.heightCm ?? ""}
                            onChange={onChange}
                            inputMode="decimal"
                        />
                    </div>
                    <div className="row">
                        <label style={{ width: 100 }}>몸무게(kg)</label>
                        <input
                            className="input"
                            name="weightKg"
                            value={form.weightKg ?? ""}
                            onChange={onChange}
                            inputMode="decimal"
                        />
                    </div>
                    <div className="row">
                        <label style={{ width: 100 }}>BMI</label>
                        <input className="input" value={form.bmi ?? ""} readOnly />
                    </div>
                    <div className="row">
                        <label style={{ width: 100 }}>질병</label>
                        <input
                            className="input"
                            name="disease"
                            value={form.disease}
                            onChange={onChange}
                            placeholder="예: 당뇨, 고혈압"
                        />
                    </div>
                    <div className="row">
                        <label style={{ width: 100 }}>목적</label>
                        <select className="input" name="goal" value={form.goal} onChange={onChange}>
                            <option value="">선택</option>
                            <option value="다이어트">다이어트</option>
                            <option value="벌크업">벌크업</option>
                            <option value="근력 증가">근력 증가</option>
                            <option value="체중 증가">체중 증가</option>
                        </select>
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <button className="btn" onClick={onSave}>
                            저장
                        </button>
                    </div>
                    <p className="muted" style={{ marginTop: 8 }}>
                        로그인 사용자 정보는 서버 DB를 통해 관리됩니다.
                    </p>
                </div>

                <div className="card">
                    <h3>현재 정보</h3>
                    <ul className="list">
                        <li>키: {form.heightCm ?? "-"} cm</li>
                        <li>몸무게: {form.weightKg ?? "-"} kg</li>
                        <li>BMI: {form.bmi ?? "-"}</li>
                        <li>질병: {form.disease || "-"}</li>
                        <li>목적: {form.goal || "-"}</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
