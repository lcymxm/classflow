import { Menu, Moon, Plus, Settings2, Sun } from "lucide-react";
import type { AppPage, Theme } from "../types";

interface TopbarProps {
  page: AppPage;
  semesterName: string;
  week: number;
  theme: Theme;
  storageOk: boolean;
  onOpenMenu: () => void;
  onAddCourse: () => void;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
}

export function Topbar({
  page,
  semesterName,
  week,
  theme,
  storageOk,
  onOpenMenu,
  onAddCourse,
  onOpenSettings,
  onToggleTheme,
}: TopbarProps) {
  return (
    <header className="topbar">
      <button className="icon-button mobile-menu" type="button" onClick={onOpenMenu} aria-label="打开导航">
        <Menu size={19} />
      </button>

      <div className="breadcrumb">
        <span className="breadcrumb-term">{semesterName}</span>
        <span className="breadcrumb-slash">/</span>
        <span>{page === "timetable" ? "周课表" : "课程库"}</span>
        {page === "timetable" ? <span className="breadcrumb-week">第 {week} 周</span> : null}
      </div>

      <div className="topbar-actions">
        <span className={`save-chip ${storageOk ? "" : "is-error"}`}>
          <span className="status-dot" aria-hidden="true" />
          {storageOk ? "已保存到本机" : "保存失败"}
        </span>
        <button className="icon-button" type="button" onClick={onToggleTheme} aria-label="切换主题">
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="icon-button" type="button" onClick={onOpenSettings} aria-label="打开设置">
          <Settings2 size={18} />
        </button>
        <button className="primary-button topbar-add" type="button" onClick={onAddCourse}>
          <Plus size={16} strokeWidth={2.2} />
          <span>新建课程</span>
          <kbd>N</kbd>
        </button>
      </div>
    </header>
  );
}
