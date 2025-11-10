import { useEffect, useMemo, useState } from "react";

function startOfMonday(d = new Date()) {
    const date = new Date(d);
    const day = date.getDay(); // 0 Sun..6 Sat
    const diff = (day === 0 ? -6 : 1) - day;
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
    return date;
}
function toLocalDate(date: Date) {
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, "0");
    const d = `${date.getDate()}`.padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export default function CartPage() {
    const [items, setItems] = useState<Array<{ id: number; name: string; category?: string; totalAmount: number; unit: string; checked?: boolean }>>([]);
    const [loading, setLoading] = useState(true);
    const weekStart = useMemo(() => startOfMonday(), []);

    useEffect(() => {
        const token = localStorage.getItem("aidiet.token") || "";
        fetch(`/api/shopping-cart?weekStart=${toLocalDate(weekStart)}`, { headers: { Authorization: token ? `Bearer ${token}` : "" } })
            .then((r) => r.json())
            .then((data) => {
                setItems((data.items || []).map((it: any) => ({ ...it, checked: false })));
            })
            .finally(() => setLoading(false));
    }, [weekStart]);

    const grouped = useMemo(() => {
        const map: Record<string, typeof items> = {};
        for (const it of items) {
            const k = it.category || "기타";
            if (!map[k]) map[k] = [];
            map[k].push(it);
        }
        return map;
    }, [items]);

    const toggle = (id: number) => {
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it)));
    };

    if (loading) return <div className="card">불러오는 중...</div>;

    const checkedCount = items.filter((i) => i.checked).length;

    return (
        <div>
            <h2>장바구니</h2>
            <div className="card" style={{ marginBottom: 12 }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                    <div>
                        <div className="muted">
                            {toLocalDate(weekStart)} ~ {toLocalDate(new Date(weekStart.getTime() + 6 * 86400000))}
                        </div>
                        <div>총 {items.length}개 재료</div>
                    </div>
                    <button className="btn" onClick={() => alert(`${checkedCount}개 구매 완료!`)}>
                        구매 완료 ({checkedCount}/{items.length})
                    </button>
                </div>
            </div>

            {Object.entries(grouped).map(([cat, arr]) => (
                <div key={cat} className="card">
                    <h3 style={{ marginTop: 0 }}>{cat}</h3>
                    <ul className="list">
                        {arr.map((it) => (
                            <li key={it.id} className="row" style={{ justifyContent: "space-between" }} onClick={() => toggle(it.id)}>
                                <a
                                    href={`https://www.coupang.com/np/search?component=&q=${encodeURIComponent(it.name)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ textDecoration: it.checked ? "line-through" : "none" }}
                                >
                                    {it.name}
                                </a>
                                <span className="muted">
                                    {Math.round(it.totalAmount)} {it.unit}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}

