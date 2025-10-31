import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function RegisterPage() {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "회원가입 실패");
            alert("회원가입 완료! 로그인 해주세요.");
            navigate("/login");
        } catch (e: any) {
            setError(e.message || "회원가입 실패");
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

                {/* 회원가입 폼 */}
                <div className="card login-card">
                    <h2 className="login-title">회원가입</h2>

                    <form onSubmit={submit}>
                        {/* 이름 입력 */}
                        <div className="login-input-group">
                            <label className="login-label">이름</label>
                            <div className="login-input-wrapper">
                                <span className="login-input-icon">👤</span>
                                <input
                                    type="text"
                                    className="input login-input"
                                    placeholder="홍길동"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

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
                                    placeholder="8자 이상 입력해주세요"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={8}
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

                        {/* 회원가입 버튼 */}
                        <button type="submit" className="btn login-btn-primary" disabled={loading}>
                            {loading ? "⏳ 가입 중..." : "가입하기"}
                        </button>

                        {/* 구분선 */}
                        <div className="login-divider">
                            <span>이미 계정이 있으신가요?</span>
                        </div>

                        {/* 로그인 버튼 */}
                        <button type="button" className="btn login-btn-secondary" onClick={() => navigate("/login")}>
                            로그인
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
