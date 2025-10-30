import { NavLink } from "react-router-dom";

export function Footer() {
    return (
        <footer className="app-footer">
            <nav
                className="tabbar"
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
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
                <NavLink to="/mypage">
                    <span role="img" aria-label="my">
                        👤
                    </span>
                    &nbsp;마이
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
