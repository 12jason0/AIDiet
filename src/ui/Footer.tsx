import { NavLink } from "react-router-dom";

export function Footer() {
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("aidiet.token") : null;
    let userId: string | null = null;
    try {
        const u = typeof localStorage !== "undefined" ? localStorage.getItem("aidiet.user") : null;
        userId = u ? String(JSON.parse(u)?.id ?? "") : null;
    } catch {}
    const authed = !!token;
    const myHref = authed && userId ? `/mypage?userId=${userId}` : "/login";
    const myLabel = authed ? "마이" : "로그인";
    const myIcon = authed ? "👤" : "🔐";
    return (
        <footer className="app-footer">
            <nav
                className="tabbar"
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-evenly",
                    backgroundColor: "#fff",
                }}
            >
                <NavLink to="/" end>
                    <span role="img" aria-label="home">
                        🏠
                    </span>
                    &nbsp;메인
                </NavLink>
                <NavLink to="/diet">
                    <span role="img" aria-label="meal">
                        🍱
                    </span>
                    &nbsp;식단
                </NavLink>
                <NavLink to={myHref}>
                    <span role="img" aria-label="my">
                        {myIcon}
                    </span>
                    &nbsp;{myLabel}
                </NavLink>
                <NavLink to="/board">
                    <span role="img" aria-label="board">
                        🗂️
                    </span>
                    &nbsp;게시판
                </NavLink>
            </nav>
        </footer>
    );
}

export default Footer;
