import { useState } from "react";
import {
    IconShoppingBag,
    IconLayoutDashboard,
    IconCashRegister,
    IconBox,
    IconClipboardList,
    IconUsers,
    IconChartBar,
    IconIdBadge,
    IconTruck,
    IconSettings,
    IconLayoutSidebarLeftExpand,
    IconLayoutSidebarLeftCollapse,
    IconChevronRight,
    IconSearch,
    IconBell,
    IconBarcode,
    IconHelp,
    IconReceipt,
    IconPackage,
} from "@tabler/icons-react";
import Dashboard from "../Dashboard/Dashboard";
// Added Link here to handle routing
import { Outlet, Link } from "react-router-dom";

// ─── Nav config ───────────────────────────────────────────────────────────────
const NAV_MAIN = [
    { Icon: IconLayoutDashboard, label: "Dashboard", badge: null },
    { Icon: IconCashRegister, label: "pos", badge: 3 ,to: "/pos"},
    { Icon: IconBox, label: "Products", badge: null,to: "/products"  },
    { Icon: IconClipboardList, label: "Categories", badge: null,to: "/categories" },
    { Icon: IconUsers, label: "Customers", badge: null,to: "/customers" },
];

const NAV_MGMT = [
    { Icon: IconChartBar, label: "Reports", badge: null },
    // Added the link destination just for Staff
    { Icon: IconIdBadge, label: "Staff", badge: null, to: "/staff" },
    { Icon: IconTruck, label: "Suppliers", badge: null, to: "/suppliers" },
];



// ─── Sidebar ──────────────────────────────────────────────────────────────────
function NavItem({ Icon, label, badge, open, active, onSelect, to }) {
    const [hovered, setHovered] = useState(false);

    // Shared styles and classes to guarantee the look stays exactly the same
    const elementProps = {
        title: !open ? label : undefined,
        onMouseEnter: () => setHovered(true),
        onMouseLeave: () => setHovered(false),
        className: "w-full flex items-center h-11 rounded-[10px] border-0 cursor-pointer transition-colors duration-150 no-underline select-none",
        style: {
            justifyContent: open ? "flex-start" : "center",
            padding: open ? "0 14px" : "0",
            gap: open ? "12px" : undefined,
            color: active ? "#E8A04B" : "#888",
            background: active ? "#2D2230" : hovered ? "#2A2A36" : "transparent",
            textAlign: "left",
        }
    };

    const innerContent = (
        <>
            <Icon size={20} stroke={1.75} aria-hidden="true" style={{ flexShrink: 0 }} />
            {open && <span style={{ fontSize: 13, whiteSpace: "nowrap" }}>{label}</span>}
            {badge && (
                open
                    ? <span className="ml-auto text-[10px] rounded-lg px-1.5 font-medium text-white leading-4" style={{ background: "#E24B4A" }}>{badge}</span>
                    : <span className="absolute top-2 right-2 text-[10px] rounded-lg px-1 font-medium text-white leading-4" style={{ background: "#E24B4A" }}>{badge}</span>
            )}
        </>
    );

    // If 'to' is defined (like for Staff), render as a React Router Link
    if (to) {
        return (
            <Link to={to} onClick={() => onSelect(label)} {...elementProps}>
                {innerContent}
            </Link>
        );
    }

    // Otherwise, keep it as a button for the others to be wired up later
    return (
        <button onClick={() => onSelect(label)} {...elementProps}>
            {innerContent}
        </button>
    );
}

function Sidebar({ open, activeLabel, onSelect }) {
    return (
        <nav
            className="flex flex-col items-center py-3 gap-1 shrink-0 overflow-hidden transition-all duration-200"
            style={{
                width: open ? 220 : 68,
                background: "#1A1A22",
                borderRight: "1px solid #2A2A36",
            }}
        >
            {/* Brand */}
            <div
                className="w-full flex items-center pb-3 mb-2"
                style={{
                    justifyContent: open ? "flex-start" : "center",
                    padding: open ? "0 16px 12px" : "0 0 12px",
                    gap: open ? 10 : 0,
                    borderBottom: "1px solid #2A2A36",
                }}
            >
                <div
                    className="flex items-center justify-center shrink-0 rounded-[10px]"
                    style={{ width: 36, height: 36, background: "#E8A04B" }}
                >
                    <IconShoppingBag size={18} color="#fff" stroke={2} aria-hidden="true" />
                </div>
                {open && (
                    <div style={{ lineHeight: 1.3 }}>
                        <span style={{ color: "#fff", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}>
                            SuperPOS <span style={{ color: "#E8A04B" }}>Universal</span>
                        </span>
                        <span style={{ display: "block", fontSize: 10, color: "#666" }}>v2.1.0</span>
                    </div>
                )}
            </div>

            {/* Main nav */}
            {NAV_MAIN.map((item) => (
                <NavItem key={item.label} {...item} open={open} active={activeLabel === item.label} onSelect={onSelect} />
            ))}

            {/* Section divider */}
            {open && (
                <span
                    className="w-full px-4 mt-2"
                    style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em" }}
                >
                    Management
                </span>
            )}
            {!open && <div style={{ width: 32, height: 1, background: "#2A2A36", margin: "8px 0" }} />}

            {NAV_MGMT.map((item) => (
                <NavItem key={item.label} {...item} open={open} active={activeLabel === item.label} onSelect={onSelect} />
            ))}

            {/* Footer */}
            <div className="mt-auto w-full">
                <NavItem Icon={IconSettings} label="Settings" open={open} active={activeLabel === "Settings"} onSelect={onSelect} />
            </div>
        </nav>
    );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
function IconButton({ Icon, label, dot, onClick }) {
    const [hovered, setHovered] = useState(false);
    return (
        <button
            onClick={onClick}
            aria-label={label}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="relative flex items-center justify-center w-9 h-9 rounded-lg border transition-colors cursor-pointer"
            style={{
                borderColor: "#E4E3E0",
                background: hovered ? "#F0EFE9" : "transparent",
                color: "#6B6B7A",
            }}
        >
            <Icon size={18} stroke={1.75} aria-hidden="true" />
            {dot && (
                <span
                    className="absolute rounded-full border-2 border-white"
                    style={{ width: 7, height: 7, top: 7, right: 7, background: "#E24B4A" }}
                />
            )}
        </button>
    );
}

function Topbar({ open, onToggle, activePage }) {
    const [searchFocused, setSearchFocused] = useState(false);

    return (
        <header
            className="flex items-center px-5 gap-3 shrink-0"
            style={{ height: 56, background: "#fff", borderBottom: "1px solid #E4E3E0" }}
        >
            {/* Toggle */}
            <button
                onClick={onToggle}
                aria-label="Toggle sidebar"
                className="flex items-center justify-center w-9 h-9 rounded-lg border-0 bg-transparent cursor-pointer transition-colors"
                style={{ color: "#6B6B7A" }}
            >
                {open
                    ? <IconLayoutSidebarLeftCollapse size={20} stroke={1.75} aria-hidden="true" />
                    : <IconLayoutSidebarLeftExpand size={20} stroke={1.75} aria-hidden="true" />
                }
            </button>

            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5" style={{ fontSize: 13, color: "#9B9BA8" }}>
                <span>SuperPOS</span>
                <IconChevronRight size={12} stroke={2} aria-hidden="true" />
                <strong style={{ color: "#1C1C24", fontWeight: 500 }}>{activePage}</strong>
            </nav>

            
            {/* Right actions */}
            <div className="flex items-center gap-2 ml-auto">
                <IconButton Icon={IconBell} label="Notifications" dot={true} />
                <IconButton Icon={IconBarcode} label="Barcode scanner" />
                <IconButton Icon={IconHelp} label="Help" />
                <div
                    className="flex items-center justify-center rounded-full text-white font-medium cursor-pointer border-2"
                    style={{ width: 36, height: 36, background: "#E8A04B", borderColor: "#E4E3E0", fontSize: 13 }}
                    title="Kais · Admin"
                >
                    KA
                </div>
            </div>
        </header>
    );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────




// ─── Root layout ─────────────────────────────────────────────────────────────
export default function POSLayout() {
    const [sideOpen, setSideOpen] = useState(false);
    const [activePage, setActivePage] = useState("Dashboard");

    return (
        <div
            className="flex overflow-hidden"
            style={{
                height: "100vh",
                background: "#F7F6F3",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
        >
            <Sidebar open={sideOpen} activeLabel={activePage} onSelect={setActivePage} />
            <div className="flex flex-col flex-1 overflow-hidden">
                <Topbar open={sideOpen} onToggle={() => setSideOpen((v) => !v)} activePage={activePage} />
                <main className="flex-1 overflow-y-auto p-5">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}