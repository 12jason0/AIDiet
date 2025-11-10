import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import Footer from "../ui/Footer";

export function AppLayout() {
    const navigate = useNavigate();
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("aidiet.token") : null;
    let userId: string | null = null;
    try {
        const u = typeof localStorage !== "undefined" ? localStorage.getItem("aidiet.user") : null;
        userId = u ? String(JSON.parse(u)?.id ?? "") : null;
    } catch {}
    const authed = !!token;
    const myHref = authed && userId ? `/mypage?userId=${userId}` : "/login";
    const myLabel = authed ? "마이페이지" : "로그인";
    const onLogout = () => {
        try {
            localStorage.removeItem("aidiet.token");
            localStorage.removeItem("aidiet.user");
        } catch {}
        navigate("/login");
    };
    return (
        <div className="app">
            <header className="app-header">
                <Link to="/" className="brand">
                    AIDiet
                </Link>
                <nav className="nav">
                    <NavLink to="/" end>
                        메인
                    </NavLink>
                    <NavLink to="/diet">식단</NavLink>
                    {authed ? (
                        <>
                            <NavLink to={myHref}>{myLabel}</NavLink>
                            <button className="btn" onClick={onLogout} style={{ marginLeft: 8 }}>
                                로그아웃
                            </button>
                        </>
                    ) : (
                        <>
                            <NavLink to="/login">로그인</NavLink>
                            <NavLink to="/signup">회원가입</NavLink>
                        </>
                    )}
                </nav>
            </header>
            <main className="app-main">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}

export default AppLayout;
