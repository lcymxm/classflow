import {
  BookOpen,
  Layers,
  LayoutGrid,
  Moon,
  Settings2,
  Sun,
  Waves,
} from "lucide-react";
import type { AppPage, Theme } from "../types";
import { WhaleMascot } from "./WhaleMascot";

interface SidebarProps {
  open: boolean;
  page: AppPage;
  timetableName: string;
  timetableCount: number;
  semesterName: string;
  week: number;
  currentWeek: number;
  totalWeeks: number;
  courseCount: number;
  sessionCount: number;
  theme: Theme;
  onNavigate: (page: AppPage) => void;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onManageTimetables: () => void;
}

export function LogoMark() {
  return (
    <span className="logo-mark" aria-hidden="true">
      <span className="logo-cell" />
      <span className="logo-cell logo-cell--accent" />
      <span className="logo-cell logo-cell--soft" />
      <span className="logo-cell logo-cell--line" />
    </span>
  );
}

export function Sidebar({
  open,
  page,
  timetableName,
  timetableCount,
  semesterName,
  week,
  currentWeek,
  totalWeeks,
  courseCount,
  sessionCount,
  theme,
  onNavigate,
  onToggleTheme,
  onOpenSettings,
  onManageTimetables,
}: SidebarProps) {
  const progress = Math.min(100, Math.max(0, (currentWeek / Math.max(totalWeeks, 1)) * 100));

  return (
    <aside className={`sidebar ${open ? "is-open" : ""}`} aria-label="主导航">
      <div className="brand">
        <LogoMark />
        <div className="brand-copy">
          <span className="brand-name">课序</span>
          <span className="brand-en">CLASSFLOW</span>
        </div>
      </div>

      <section className="term-card" aria-label="当前课表">
        <div className="term-card-top">
          <span className="micro-label">TIMETABLE</span>
          <button
            className="term-edit"
            type="button"
            onClick={onManageTimetables}
            aria-label="管理课表"
            title="管理课表"
          >
            <Layers size={13} />
          </button>
        </div>
        <div className="term-name-row">
          <h2>{timetableName}</h2>
          {timetableCount > 1 ? <span className="mini-tag">{timetableCount} 套</span> : null}
        </div>
        <p className="term-sub">{semesterName}</p>
        <div className="term-progress" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="term-meta">
          <span>第 {currentWeek} 周</span>
          <span>共 {totalWeeks} 周</span>
        </div>
      </section>

      <nav className="main-nav" aria-label="页面">
        <span className="nav-label">工作台</span>
        <button
          className={`nav-item ${page === "timetable" ? "is-active" : ""}`}
          type="button"
          onClick={() => onNavigate("timetable")}
          aria-current={page === "timetable" ? "page" : undefined}
        >
          <LayoutGrid size={17} strokeWidth={1.8} />
          <span>周课表</span>
          <span className="nav-week">{week}</span>
        </button>
        <button
          className={`nav-item ${page === "courses" ? "is-active" : ""}`}
          type="button"
          onClick={() => onNavigate("courses")}
          aria-current={page === "courses" ? "page" : undefined}
        >
          <BookOpen size={17} strokeWidth={1.8} />
          <span>课程库</span>
          <span className="nav-count">{courseCount}</span>
        </button>
      </nav>

      <div className="sidebar-stats" aria-label="本学期概览">
        <div>
          <strong>{courseCount}</strong>
          <span>门课程</span>
        </div>
        <span className="sidebar-stats-divider" />
        <div>
          <strong>{sessionCount}</strong>
          <span>节 / 本周</span>
        </div>
      </div>

      {theme === "whale" ? (
        <div className="whale-note">
          <WhaleMascot size={62} />
          <div>
            <strong>DeepSeek 鲸鱼娘</strong>
            <span>深海模式已开启，今天也要好好上课呀。</span>
          </div>
        </div>
      ) : null}

      <div className="sidebar-bottom">
        <div className="sidebar-actions">
          <button
            className="sidebar-icon-btn"
            type="button"
            onClick={onToggleTheme}
            aria-label="切换主题"
            title="切换主题"
          >
            {theme === "light" ? (
              <Moon size={16} />
            ) : theme === "dark" ? (
              <Waves size={16} />
            ) : (
              <Sun size={16} />
            )}
            <span>{theme === "light" ? "夜读" : theme === "dark" ? "鲸鱼娘" : "亮色"}</span>
          </button>
          <button className="sidebar-icon-btn" type="button" onClick={onOpenSettings} aria-label="打开设置">
            <Settings2 size={16} />
            <span>设置</span>
          </button>
        </div>
        <p className="local-note">
          <span className="status-dot" aria-hidden="true" />
          数据只保存在本机
        </p>
        <p className="sidebar-signature">把一周，排成喜欢的样子。</p>
      </div>
    </aside>
  );
}
