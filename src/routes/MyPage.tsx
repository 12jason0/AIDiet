import { useEffect, useMemo, useState } from "react";
import { ProfileData, loadProfile, saveProfile } from "../lib/diet";

export function MyPage() {
    const [form, setForm] = useState<ProfileData>(() => loadProfile());

    const bmiCalc = useMemo(() => {
        if (!form.heightCm || !form.weightKg) return null;
        const h = form.heightCm / 100;
        return Number((form.weightKg / (h * h)).toFixed(1));
    }, [form.heightCm, form.weightKg]);

    useEffect(() => {
        setForm((prev) => ({ ...prev, bmi: bmiCalc }));
    }, [bmiCalc]);

    const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: name === "heightCm" || name === "weightKg" ? (value ? Number(value) : null) : value,
        }));
    };

    const onSave = () => {
        saveProfile(form);
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
                        정보는 로컬 저장소에 보관됩니다.
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
