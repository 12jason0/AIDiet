import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import AppLayout from "./app/layout";
import "./styles.css";

const Home = React.lazy(() => import("./app/page"));
const Diet = React.lazy(() => import("./app/diet/page"));
const My = React.lazy(() => import("./app/mypage/page"));
const Board = React.lazy(() => import("./app/board/page"));
const Login = React.lazy(() => import("./app/login/page"));
const Register = React.lazy(() => import("./app/register/page"));

const router = createBrowserRouter([
    {
        path: "/",
        element: <AppLayout />,
        children: [
            { index: true, element: <Home /> },
            { path: "diet", element: <Diet /> },
            { path: "mypage", element: <My /> },
            { path: "board", element: <Board /> },
            { path: "login", element: <Login /> },
            { path: "signup", element: <Register /> },
        ],
    },
]);

createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <React.Suspense fallback={<div className="card">로딩중...</div>}>
            <RouterProvider router={router} />
        </React.Suspense>
    </React.StrictMode>
);
