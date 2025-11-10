import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const API_BASE =
                typeof window !== "undefined" && window.location.port === "5174" ? "http://127.0.0.1:4000" : "";
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "로그인 실패");
            localStorage.setItem("aidiet.token", data.token);
            localStorage.setItem("aidiet.user", JSON.stringify(data.user));
            navigate(`/?userId=${data.user.id}`);
        } catch (e: any) {
            setError(e.message || "로그인 실패");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-screen">
            <div className="login-container">
                {/* 로고 영역 */}
                <div className="login-logo">
                    <div className="logo-wrapper">
                        <h1>AIDiet</h1>
                        <span className="ai-badge">AI POWERED</span>
                    </div>
                    <p className="login-subtitle">AI 기반 개인 맞춤 식단 관리</p>
                </div>

                {/* 로그인 폼 */}
                <div className="card login-card">
                    <h2 className="login-title">로그인</h2>

                    <form onSubmit={submit}>
                        {/* 이메일 입력 */}
                        <div className="login-input-group">
                            <label className="login-label">이메일</label>
                            <div className="login-input-wrapper">
                                <span className="login-input-icon">📧</span>
                                <input
                                    type="email"
                                    className="input login-input"
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* 비밀번호 입력 */}
                        <div className="login-input-group">
                            <label className="login-label">비밀번호</label>
                            <div className="login-input-wrapper">
                                <span className="login-input-icon">🔒</span>
                                <input
                                    type="password"
                                    className="input login-input"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* 에러 메시지 */}
                        {error && (
                            <div className="login-error">
                                <span className="error-icon">⚠️</span>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* 로그인 버튼 */}
                        <button type="submit" className="btn login-btn-primary" disabled={loading}>
                            {loading ? "⏳ 로그인 중..." : "로그인"}
                        </button>

                        {/* 구분선 */}
                        <div className="login-divider">
                            <span>또는</span>
                        </div>

                        {/* 회원가입 버튼 */}
                        <button type="button" className="btn login-btn-secondary" onClick={() => navigate("/signup")}>
                            회원가입
                        </button>
                    </form>

                    {/* 추가 링크 */}
                    <div className="login-footer">
                        <button className="login-link">비밀번호를 잊으셨나요?</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
