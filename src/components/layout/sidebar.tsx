import { useNavigate, useLocation } from "react-router";
import {
	Home,
	BookOpen,
	FolderOpen,
	Clock,
	Zap,
	Settings,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import { useSettingsStore } from "../../stores/settings";
import { useTranslation } from "../../lib/i18n";

interface NavItem {
	icon: React.ElementType;
	labelKey: string;
	path: string;
}

const mainNav: NavItem[] = [
	{ icon: Home, labelKey: "nav.home", path: "/" },
	{ icon: BookOpen, labelKey: "nav.catalog", path: "/catalog" },
	{ icon: FolderOpen, labelKey: "nav.collections", path: "/collections" },
	{ icon: Clock, labelKey: "nav.history", path: "/history" },
];

const toolsNav: NavItem[] = [
	{ icon: Zap, labelKey: "nav.marathon", path: "/marathon" },
];

const bottomNav: NavItem[] = [
	{ icon: Settings, labelKey: "nav.settings", path: "/settings" },
];

export function Sidebar() {
	const navigate = useNavigate();
	const location = useLocation();
	const { sidebarCollapsed, toggleSidebar } = useSettingsStore();
	const { t } = useTranslation();

	const isActive = (path: string) => {
		if (path === "/") return location.pathname === "/";
		return location.pathname.startsWith(path);
	};

	const renderItem = (item: NavItem) => {
		const active = isActive(item.path);
		const Icon = item.icon;

		return (
			<button
				key={item.path}
				type="button"
				onClick={() => navigate(item.path)}
				className={`
					flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-default
					${
						active
							? "border-l-2 border-white bg-bg-elevated text-text-primary"
							: "border-l-2 border-transparent text-text-secondary hover:bg-bg-hover hover:text-text-primary"
					}
				`}
			>
				<Icon size={18} />
				{!sidebarCollapsed && <span>{t(item.labelKey)}</span>}
			</button>
		);
	};

	return (
		<div
			className={`
				flex shrink-0 flex-col border-r border-border-subtle bg-bg-root transition-all duration-200
				${sidebarCollapsed ? "w-16" : "w-[220px]"}
			`}
		>
			{/* Logo + Toggle */}
			<div
				className={`flex items-center p-2 ${sidebarCollapsed ? "justify-center" : "justify-between"}`}
			>
				{!sidebarCollapsed && (
					<span className="pl-3 text-sm font-bold tracking-tight text-text-primary">
						KURAI
					</span>
				)}
				<button
					type="button"
					onClick={toggleSidebar}
					className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-default hover:bg-bg-hover hover:text-text-secondary"
				>
					{sidebarCollapsed ? (
						<ChevronRight size={16} />
					) : (
						<ChevronLeft size={16} />
					)}
				</button>
			</div>

			{/* Main nav */}
			<nav className="flex flex-1 flex-col gap-1 px-2">
				{mainNav.map(renderItem)}

				<div className="my-2 h-px bg-border-subtle" />

				{toolsNav.map(renderItem)}
			</nav>

			{/* Bottom */}
			<div className="flex flex-col gap-1 border-t border-border-subtle p-2">
				{bottomNav.map(renderItem)}
			</div>
		</div>
	);
}