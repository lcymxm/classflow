import { CalendarPlus, Menu, Moon, Plus, Settings2, Sun, Waves } from "lucide-react";
import type { AppPage, Theme } from "../types";
import { WhaleMascot } from "./WhaleMascot";

interface TopbarProps {
  page: AppPage;
  timetableName: string;
  semesterName: string;
  week: number;
  theme: Theme;
  storageOk: boolean;
  onOpenMenu: () => void;
  onAddCourse: () => void;
  onAddEvent: () => void;
  onOpenSettings: () => void;
  onManageTimetables: () => void;
  onOpenWeekPicker: () => void;
  onToggleTheme: () => void;
}

export function Topbar({
  page,
  timetableName,
  semesterName,
  week,
  theme,
  storageOk,
  onOpenMenu,
  onAddCourse,
  onAddEvent,
  onOpenSettings,
  onManageTimetables,
  onOpenWeekPicker,
  onToggleTheme,
}: TopbarProps) {
  return (
    <header className="topbar">
      <button className="icon-button mobile-menu" type="button" onClick={onOpenMenu} aria-label="打开导航">
        <Menu size={19} />
      </button>

      {theme === "whale" ? (
        <span className="topbar-whale" aria-hidden="true">
          <WhaleMascot size={30} />
        </span>
      ) : null}

      <div className="breadcrumb">
        <button
          className="breadcrumb-term breadcrumb-button"
          type="button"
          onClick={onManageTimetables}
          title={`${semesterName} · 管理课表`}
        >
          {timetableName}
        </button>
        <span className="breadcrumb-slash">/</span>
        <span>{page === "timetable" ? "周课表" : "课程库"}</span>
        {page === "timetable" ? (
          <button
            className="breadcrumb-week"
            type="button"
            onClick={onOpenWeekPicker}
            aria-label="选择周次"
            title="选择周次"
          >
            第 {week} 周
          </button>
        ) : null}
      </div>

      <div className="topbar-actions">
        <span className={`save-chip ${storageOk ? "" : "is-error"}`}>
          <span className="status-dot" aria-hidden="true" />
          {storageOk ? "已保存到本机" : "保存失败"}
        </span>
        <button
          className="icon-button"
          type="button"
          onClick={onToggleTheme}
          aria-label="切换主题"
          title="切换主题"
        >
          {theme === "light" ? (
            <Moon size={18} />
          ) : theme === "dark" ? (
            <Waves size={18} />
          ) : (
            <Sun size={18} />
          )}
        </button>
        <button className="icon-button" type="button" onClick={onOpenSettings} aria-label="打开设置">
          <Settings2 size={18} />
        </button>
        <button
          className="icon-button topbar-event"
          type="button"
          onClick={onAddEvent}
          aria-label="添加日程"
          title="添加日程（E）"
        >
          <CalendarPlus size={18} />
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
