import { BookOpen, CalendarDays, LayoutGrid, Settings2 } from "lucide-react";
import type { AppPage } from "../types";

interface MobileTabBarProps {
  page: AppPage;
  onNavigate: (page: AppPage) => void;
  onOpenSettings: () => void;
}

const TABS = [
  { page: "timetable" as const, label: "课表", icon: LayoutGrid },
  { page: "agenda" as const, label: "日程", icon: CalendarDays },
  { page: "courses" as const, label: "课程", icon: BookOpen },
];

export function MobileTabBar({ page, onNavigate, onOpenSettings }: MobileTabBarProps) {
  return (
    <nav className="mobile-tabbar" aria-label="手机底部导航">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = page === tab.page;
        return (
          <button
            key={tab.page}
            className={active ? "is-active" : ""}
            type="button"
            onClick={() => onNavigate(tab.page)}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
            <span>{tab.label}</span>
          </button>
        );
      })}
      <button type="button" onClick={onOpenSettings} aria-label="打开设置">
        <Settings2 size={18} strokeWidth={1.8} />
        <span>我的</span>
      </button>
    </nav>
  );
}
