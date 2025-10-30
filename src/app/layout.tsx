import { Link, NavLink, Outlet } from "react-router-dom";
import Footer from "../ui/Footer";

export function AppLayout() {
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
                    <NavLink to="/mypage">마이페이지</NavLink>
                    <NavLink to="/board">게시판</NavLink>
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
