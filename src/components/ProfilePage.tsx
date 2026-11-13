import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  Download,
  Image as ImageIcon,
  Layers,
  Printer,
  Settings2,
  Upload,
} from "lucide-react";
import type { Preferences, ScheduleData, Semester, Theme, Timetable } from "../types";
import { WhaleMascot } from "./WhaleMascot";

interface ProfilePageProps {
  data: ScheduleData;
  prefs: Preferences;
  timetable: Timetable;
  semester: Semester;
  week: number;
  currentWeek: number;
  sessionCount: number;
  eventCount: number;
  storageOk: boolean;
  native: boolean;
  onOpenSettings: () => void;
  onManageTimetables: () => void;
  onSwitchTimetable: (id: string) => void;
  onOpenWallpaper: () => void;
  onChangeTheme: (theme: Theme) => void;
  onExportJson: () => Promise<unknown>;
  onExportIcs: () => Promise<unknown>;
  onImportFile: (file: File) => Promise<unknown>;
  onPrint: () => void;
}

const THEMES: Array<{ id: Theme; name: string; note: string }> = [
  { id: "light", name: "奶油纸", note: "明亮" },
  { id: "dark", name: "夜读", note: "深绿" },
  { id: "whale", name: "DeepSeek 鲸鱼娘", note: "深海" },
];

export function ProfilePage({
  data,
  prefs,
  timetable,
  semester,
  week,
  currentWeek,
  sessionCount,
  eventCount,
  storageOk,
  native,
  onOpenSettings,
  onManageTimetables,
  onSwitchTimetable,
  onOpenWallpaper,
  onChangeTheme,
  onExportJson,
  onExportIcs,
  onImportFile,
  onPrint,
}: ProfilePageProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const dataSize = new Blob([JSON.stringify(data)]).size;
  const sizeLabel = dataSize > 1024 * 1024
    ? `${(dataSize / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(dataSize / 1024))} KB`;

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      await onImportFile(file);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="profile-page">
      <section className="profile-hero">
        <div>
          <p className="eyebrow">MY CLASSFLOW</p>
          <h1>我的课序</h1>
          <p className="profile-hero-sub">没有账号，没有云端；你的课表、日程和壁纸都只在这台设备上。</p>
          <p className="profile-version">课序 v1.11.0 · {storageOk ? "本机保存正常" : "保存失败，请检查浏览器空间"}</p>
        </div>
        {prefs.theme === "whale" ? <WhaleMascot size={124} /> : null}
      </section>

      <div className="profile-grid">
        <section className="profile-card profile-current">
          <div className="profile-card-head">
            <div>
              <p className="eyebrow">CURRENT TIMETABLE</p>
              <h2>{timetable.name}</h2>
            </div>
            <button className="secondary-button" type="button" onClick={onManageTimetables}>
              <Layers size={14} />
              管理
            </button>
          </div>
          <p className="profile-current-sub">{semester.name} · 第 {week} 周 / 共 {semester.totalWeeks} 周</p>
          <div className="profile-stats">
            <div>
              <strong>{timetable.courses.length}</strong>
              <span>门课程</span>
            </div>
            <div>
              <strong>{sessionCount}</strong>
              <span>节 / 本周</span>
            </div>
            <div>
              <strong>{eventCount}</strong>
              <span>本周日程</span>
            </div>
            <div>
              <strong>{data.timetables.length}</strong>
              <span>套课表</span>
            </div>
          </div>
          <div className="profile-progress" aria-label={`学期进度，第 ${currentWeek} 周`}>
            <span style={{ width: `${Math.min(100, (currentWeek / Math.max(semester.totalWeeks, 1)) * 100)}%` }} />
          </div>
        </section>

        <section className="profile-card profile-theme">
          <div className="profile-card-head">
            <div>
              <p className="eyebrow">APPEARANCE</p>
              <h2>界面主题</h2>
            </div>
          </div>
          <div className="profile-theme-list">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                className={`profile-theme-option ${prefs.theme === theme.id ? "is-active" : ""}`}
                type="button"
                onClick={() => onChangeTheme(theme.id)}
                aria-pressed={prefs.theme === theme.id}
              >
                <span className={`profile-theme-swatch is-${theme.id}`}>
                  {theme.id === "whale" ? <WhaleMascot size={34} face /> : null}
                </span>
                <span>
                  <strong>{theme.name}</strong>
                  <small>{theme.note}</small>
                </span>
                {prefs.theme === theme.id ? <Check size={14} /> : null}
              </button>
            ))}
          </div>
        </section>

        <section className="profile-card profile-timetables">
          <div className="profile-card-head">
            <div>
              <p className="eyebrow">MY TIMETABLES</p>
              <h2>我的课表</h2>
            </div>
            <button className="text-button" type="button" onClick={onManageTimetables}>
              管理全部
              <ArrowUpRight size={13} />
            </button>
          </div>
          <div className="profile-timetable-list">
            {data.timetables.map((item) => (
              <button
                key={item.id}
                className={`profile-timetable-item ${item.id === timetable.id ? "is-active" : ""}`}
                type="button"
                onClick={() => onSwitchTimetable(item.id)}
              >
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.courses.length} 门课程 · {item.semester.name}</small>
                </span>
                {item.id === timetable.id ? <span className="profile-active-badge">当前</span> : <ArrowUpRight size={14} />}
              </button>
            ))}
          </div>
        </section>

        <section className="profile-card profile-tools">
          <div className="profile-card-head">
            <div>
              <p className="eyebrow">TOOLS</p>
              <h2>常用功能</h2>
            </div>
          </div>
          <div className="profile-tool-grid">
            <button type="button" onClick={onOpenSettings}>
              <Settings2 size={17} />
              <span>设置</span>
            </button>
            <button type="button" onClick={onOpenWallpaper}>
              <ImageIcon size={17} />
              <span>课表壁纸</span>
            </button>
            <button type="button" onClick={onManageTimetables}>
              <Layers size={17} />
              <span>课表管理</span>
            </button>
            <button type="button" onClick={() => void onExportJson()}>
              <Download size={17} />
              <span>导出备份</span>
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}>
              <Upload size={17} />
              <span>{busy ? "导入中…" : "导入备份"}</span>
            </button>
            <button type="button" onClick={() => void onExportIcs()}>
              <CalendarDays size={17} />
              <span>导出日历</span>
            </button>
            {!native ? (
              <button type="button" onClick={onPrint}>
                <Printer size={17} />
                <span>打印课表</span>
              </button>
            ) : null}
            <a href="https://github.com/lcymxm/classflow" target="_blank" rel="noreferrer">
              <BookOpen size={17} />
              <span>GitHub</span>
              <ArrowUpRight size={11} />
            </a>
          </div>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(event) => { void importFile(event); }} />
        </section>

        <section className="profile-card profile-about">
          <div>
            <p className="eyebrow">LOCAL & PRIVATE</p>
            <h2>数据只在这台设备</h2>
            <p>当前数据约 {sizeLabel}。换机前请先导出备份；卸载应用或清理站点数据会删除本地课表。</p>
          </div>
          <div className="profile-about-row">
            <span className="status-dot" aria-hidden="true" />
            {storageOk ? "已保存在本机" : "保存失败"}
            <span className="profile-about-divider">·</span>
            离线可用
          </div>
          <p className="profile-widget-note">Android 桌面小组件：长按桌面 → 小组件 → 课序 · 今日课程。</p>
        </section>
      </div>
    </div>
  );
}
