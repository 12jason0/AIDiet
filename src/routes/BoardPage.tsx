import { useEffect, useMemo, useState } from "react";

type Post = { id: string; title: string; content: string; createdAt: string };

const STORAGE_KEY = "aidiet.board.posts";

function loadPosts(): Post[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as Post[]) : [];
    } catch {
        return [];
    }
}

function savePosts(posts: Post[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

export function BoardPage() {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [posts, setPosts] = useState<Post[]>(() => loadPosts());

    useEffect(() => {
        savePosts(posts);
    }, [posts]);

    const ordered = useMemo(() => [...posts].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)), [posts]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;
        const now = new Date().toISOString();
        setPosts((prev) => [
            { id: crypto.randomUUID(), title: title.trim(), content: content.trim(), createdAt: now },
            ...prev,
        ]);
        setTitle("");
        setContent("");
    };

    return (
        <div>
            <h2>게시판</h2>
            <form className="card" onSubmit={submit}>
                <div className="row">
                    <input
                        className="input"
                        placeholder="제목"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>
                <div className="row" style={{ alignItems: "stretch" }}>
                    <textarea
                        className="input"
                        placeholder="내용"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={4}
                    />
                </div>
                <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
                    <button className="btn" type="submit">
                        등록
                    </button>
                </div>
            </form>

            <div className="card">
                <h3>게시글</h3>
                {ordered.length === 0 && <p className="muted">첫 글을 작성해보세요.</p>}
                <ul className="list">
                    {ordered.map((p) => (
                        <li key={p.id}>
                            <div style={{ fontWeight: 600 }}>{p.title}</div>
                            <div className="muted" style={{ margin: "4px 0 8px" }}>
                                {new Date(p.createdAt).toLocaleString()}
                            </div>
                            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.4 }}>{p.content}</div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default BoardPage;


