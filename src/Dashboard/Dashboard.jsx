import React, { useState } from 'react'
import {

    IconCashRegister,
    IconBarcode,
    IconReceipt,
    IconShoppingCart,
    IconPackage,
    IconAlertTriangle,
    IconShirt,
    IconHanger,
    IconReceiptRefund,
    IconBan,
    IconTrendingUp,
    IconTrendingDown,
    IconPackageImport,
    IconUserPlus,
    IconPrinter,
} from "@tabler/icons-react";

import useNetworkStore from "../store/useNetworkStore";

function Dashboard() {
    const [primaryHovered, setPrimaryHovered] = useState(false);
    const { hostUrl, status, error, liveStock } = useNetworkStore();


    const METRICS = [
        { Icon: IconReceipt, label: "Today's Revenue", value: "184 500 DA", trend: "+12.4% vs yesterday", dir: "up" },
        { Icon: IconShoppingCart, label: "Transactions", value: "47", trend: "+8 vs yesterday", dir: "up" },
        { Icon: IconPackage, label: "Items Sold", value: "213", trend: "−5 vs yesterday", dir: "down" },
        { Icon: IconAlertTriangle, label: "Low Stock", value: "9 SKUs", trend: "3 critical, 6 warning", dir: "danger" },
    ];

    // ─── Dashboard data ───────────────────────────────────────────────────────────
    const TRANSACTIONS = [
        { Icon: IconShirt, iconBg: "#EAF3DE", iconColor: "#3B6D11", name: "Robe en soie — T38", time: "09:14 · Client #0042", status: "paid", amount: "+4 200 DA", amtColor: "#1D9E75" },
        { Icon: IconHanger, iconBg: "#EAF3DE", iconColor: "#3B6D11", name: "Veste cuir Slim — T42", time: "09:02 · Vente comptoir", status: "paid", amount: "+12 800 DA", amtColor: "#1D9E75" },
        { Icon: IconReceiptRefund, iconBg: "#FAEEDA", iconColor: "#633806", name: "Retour — Jeans Slim T34", time: "08:47 · Client #0019", status: "pend", amount: "−3 500 DA", amtColor: "#E24B4A" },
        { Icon: IconShirt, iconBg: "#EAF3DE", iconColor: "#3B6D11", name: "Lot 3× T-shirts basiques", time: "08:31 · Client #0088", status: "paid", amount: "+5 700 DA", amtColor: "#1D9E75" },
        { Icon: IconBan, iconBg: "#FCEBEB", iconColor: "#791F1F", name: "Commande annulée", time: "08:12 · Ticket #TK-0211", status: "void", amount: "—", amtColor: "#9B9BA8" },
    ];

    const STATUS_MAP = {
        paid: { label: "Paid", bg: "#EAF3DE", color: "#3B6D11" },
        pend: { label: "Pending", bg: "#FAEEDA", color: "#633806" },
        void: { label: "Void", bg: "#FCEBEB", color: "#791F1F" },
    };

    const CATEGORIES = [
        { label: "Robes", pct: 78 },
        { label: "Vestes", pct: 55 },
        { label: "T-shirts", pct: 40 },
        { label: "Pantalons", pct: 28 },
        { label: "Accessoires", pct: 14 },
    ];

    const QUICK_ACTIONS = [
        { Icon: IconCashRegister, label: "New Sale" },
        { Icon: IconPackageImport, label: "Receive Stock" },
        { Icon: IconUserPlus, label: "Add Customer" },
        { Icon: IconPrinter, label: "Print Report" },
        { Icon: IconReceiptRefund, label: "Process Return" },
        { Icon: IconBarcode, label: "Print Labels" },
    ];

    const SYSTEM_STATUS = [
        { label: "Receipt printer", status: "Online", dot: "#1D9E75", bg: "#EAF3DE", color: "#3B6D11" },
        { label: "Barcode scanner", status: "Connected", dot: "#1D9E75", bg: "#EAF3DE", color: "#3B6D11" },
        { label: "Cash drawer", status: "Ready", dot: "#1D9E75", bg: "#EAF3DE", color: "#3B6D11" },
        { label: "Card terminal", status: "Idle", dot: "#E8A04B", bg: "#FAEEDA", color: "#633806" },
        { label: "Database sync", status: "2s ago", dot: "#1D9E75", bg: null, color: "#9B9BA8" },
    ];

    function MetricCard({ Icon, label, value, trend, dir }) {
        const trendColor = dir === "up" ? "#1D9E75" : dir === "down" ? "#E24B4A" : "#6B6B7A";
        return (
            <div className="rounded-xl p-4 border" style={{ background: "#fff", borderColor: "#E4E3E0" }}>
                <div className="flex items-center gap-1.5 mb-1.5" style={{ fontSize: 12, color: "#6B6B7A" }}>
                    <Icon size={14} stroke={1.75} aria-hidden="true" />
                    {label}
                </div>
                <div style={{ fontSize: 22, fontWeight: 500, color: dir === "danger" ? "#E24B4A" : "#1C1C24" }}>
                    {value}
                </div>
                <div className="flex items-center gap-1 mt-1" style={{ fontSize: 11, color: trendColor }}>
                    {dir === "up" && <IconTrendingUp size={12} stroke={2} aria-hidden="true" />}
                    {dir === "down" && <IconTrendingDown size={12} stroke={2} aria-hidden="true" />}
                    {trend}
                </div>
            </div>
        );
    }

    function QuickBtn({ Icon, label }) {
        const [hovered, setHovered] = useState(false);
        return (
            <button
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                className="flex flex-col items-start gap-1.5 p-3 rounded-[10px] border text-left cursor-pointer bg-transparent transition-colors"
                style={{ background: "#F7F6F3", borderColor: hovered ? "#E8A04B" : "#E4E3E0" }}
            >
                <Icon size={20} stroke={1.75} style={{ color: "#E8A04B" }} aria-hidden="true" />
                <span style={{ fontSize: 12, fontWeight: 500, color: "#1C1C24", lineHeight: 1.3 }}>{label}</span>
            </button>
        );
    }

    return (
        <>
            {/* Page header */}
            <div className="flex items-start justify-between mb-5">
                <div>
                    <h1 style={{ fontSize: 20, fontWeight: 500, color: "#1C1C24", lineHeight: 1.2 }}>
                        Good morning, Kais 👋
                    </h1>
                    <p style={{ fontSize: 13, color: "#6B6B7A", marginTop: 3 }}>
                        Wednesday, 24 June 2026 &nbsp;·&nbsp; Store:{" "}
                        <strong style={{ fontWeight: 500 }}>Main Branch</strong>
                    </p>
                </div>
                <button
                    onMouseEnter={() => setPrimaryHovered(true)}
                    onMouseLeave={() => setPrimaryHovered(false)}
                    className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-white border-0 cursor-pointer font-medium"
                    style={{ fontSize: 13, background: primaryHovered ? "#C8873A" : "#E8A04B", transition: "background 0.15s" }}
                >
                    <IconCashRegister size={16} stroke={2} aria-hidden="true" />
                    Open POS Terminal
                </button>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-4 gap-3.5 mb-5">
                {METRICS.map((m) => <MetricCard key={m.label} {...m} />)}
            </div>

            {/* Two-column layout */}
            <div className="grid gap-3.5" style={{ gridTemplateColumns: "1fr 340px" }}>
                {/* Left column */}
                <div className="flex flex-col gap-3.5">
                    {/* Transactions */}
                    <div className="rounded-xl border overflow-hidden" style={{ background: "#fff", borderColor: "#E4E3E0" }}>
                        <div className="flex items-center justify-between px-[18px] border-b" style={{ padding: "14px 18px", borderColor: "#E4E3E0" }}>
                            <span style={{ fontSize: 14, fontWeight: 500, color: "#1C1C24" }}>Recent transactions</span>
                            <a href="#" style={{ fontSize: 12, color: "#E8A04B", textDecoration: "none" }} onClick={(e) => e.preventDefault()}>View all</a>
                        </div>
                        <div style={{ padding: "0 18px" }}>
                            {TRANSACTIONS.map((tx) => {
                                const s = STATUS_MAP[tx.status];
                                return (
                                    <div
                                        key={tx.name}
                                        className="flex items-center gap-3 border-b last:border-b-0"
                                        style={{ padding: "10px 0", borderColor: "#E4E3E0" }}
                                    >
                                        <div
                                            className="flex items-center justify-center shrink-0 rounded-lg"
                                            style={{ width: 34, height: 34, background: tx.iconBg }}
                                        >
                                            <tx.Icon size={16} stroke={1.75} style={{ color: tx.iconColor }} aria-hidden="true" />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: "#1C1C24" }}>{tx.name}</div>
                                            <div style={{ fontSize: 11, color: "#9B9BA8" }}>{tx.time}</div>
                                        </div>
                                        <span
                                            className="rounded font-medium"
                                            style={{ fontSize: 10, padding: "2px 8px", background: s.bg, color: s.color }}
                                        >
                                            {s.label}
                                        </span>
                                        <span className="ml-auto font-medium" style={{ fontSize: 13, color: tx.amtColor }}>{tx.amount}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Category bars */}
                    <div className="rounded-xl border overflow-hidden" style={{ background: "#fff", borderColor: "#E4E3E0" }}>
                        <div className="flex items-center justify-between border-b" style={{ padding: "14px 18px", borderColor: "#E4E3E0" }}>
                            <span style={{ fontSize: 14, fontWeight: 500, color: "#1C1C24" }}>Revenue by category</span>
                            <span style={{ fontSize: 12, color: "#9B9BA8" }}>Today</span>
                        </div>
                        <div className="flex flex-col gap-2.5" style={{ padding: "16px 18px" }}>
                            {CATEGORIES.map(({ label, pct }) => (
                                <div key={label} className="flex items-center gap-2.5">
                                    <span className="text-right shrink-0" style={{ fontSize: 12, color: "#6B6B7A", width: 80 }}>{label}</span>
                                    <div className="flex-1 rounded" style={{ height: 8, background: "#F0EFE9" }}>
                                        <div className="rounded" style={{ width: `${pct}%`, height: "100%", background: "#E8A04B" }} />
                                    </div>
                                    <span className="text-right shrink-0" style={{ fontSize: 12, color: "#6B6B7A", width: 30 }}>{pct}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right column */}
                <div className="flex flex-col gap-3.5">
                    {/* Quick actions */}
                    <div className="rounded-xl border overflow-hidden" style={{ background: "#fff", borderColor: "#E4E3E0" }}>
                        <div className="border-b" style={{ padding: "14px 18px", borderColor: "#E4E3E0" }}>
                            <span style={{ fontSize: 14, fontWeight: 500, color: "#1C1C24" }}>Quick actions</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5" style={{ padding: 18 }}>
                            {QUICK_ACTIONS.map(({ Icon, label }) => (
                                <QuickBtn key={label} Icon={Icon} label={label} />
                            ))}
                        </div>
                    </div>

                    {/* System status */}
                    <div className="rounded-xl border flex-1" style={{ background: "#fff", borderColor: "#E4E3E0" }}>
                        <div className="flex items-center justify-between border-b" style={{ padding: "14px 18px", borderColor: "#E4E3E0" }}>
                            <span style={{ fontSize: 14, fontWeight: 500, color: "#1C1C24" }}>System status</span>
                            <span
                                className="font-medium rounded"
                                style={{ fontSize: 10, padding: "2px 8px", background: "#EAF3DE", color: "#3B6D11" }}
                            >
                                All operational
                            </span>
                        </div>
                        <div style={{ padding: "12px 18px" }}>
                            {SYSTEM_STATUS.map(({ label, status, dot, bg, color }) => (
                                <div
                                    key={label}
                                    className="flex items-center gap-2.5 border-b last:border-b-0"
                                    style={{ padding: "8px 0", borderColor: "#E4E3E0" }}
                                >
                                    <span className="rounded-full shrink-0" style={{ width: 8, height: 8, background: dot }} />
                                    <span className="flex-1" style={{ fontSize: 13, color: "#1C1C24" }}>{label}</span>
                                    {bg
                                        ? <span className="font-medium rounded" style={{ fontSize: 10, padding: "2px 7px", background: bg, color }}>{status}</span>
                                        : <span style={{ fontSize: 11, color }}>{status}</span>
                                    }
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Dashboard