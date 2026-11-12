import { useRef, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  CalendarRange,
  Check,
  Clock,
  Database,
  Download,
  Printer,
  Trash2,
  Upload,
} from "lucide-react";
import type { FormEvent } from "react";
import type { ImportResult, Period, PeriodProfile, ScheduleData, Semester } from "../types";
import { Modal } from "./Modal";
import {
  MAX_PERIODS,
  MIN_PERIODS,
  resizePeriods,
} from "../lib/factory";
import {
  dateKey,
  formatDateWithWeekday,
  parseDateKey,
  startOfWeekMonday,
  timeToMinutes,
} from "../lib/date";
import { getUsedMaxPeriod, weeksForSlot } from "../lib/schedule";
import { isNativeApp, type ExportResult } from "../lib/nativeFile";

type SettingsTab = "term" | "periods" | "data";

interface SettingsModalProps {
  data: ScheduleData;
  autoHolidays: boolean;
  onClose: () => void;
  onSaveSemester: (semester: Semester, periodProfileId: string | null) => void;
  onExportJson: () => Promise<ExportResult>;
  onExportIcs: () => Promise<ExportResult & { count: number }>;
  onImportFile: (file: File) => Promise<ImportResult>;
  onPrint: () => void;
  onClearData: () => void;
  onToggleAutoHolidays: (value: boolean) => void;
}

interface Notice {
  tone: "success" | "error" | "info";
  message: string;
}

const TABS: Array<{ id: SettingsTab; label: string; icon: typeof Database }> = [
  { id: "term", label: "学期与视图", icon: CalendarDays },
  { id: "periods", label: "作息时间", icon: Clock },
  { id: "data", label: "数据与备份", icon: Database },
];

function deliveryMessage(delivery: ExportResult["delivery"], filename: string): string {
  if (delivery === "shared") return "已生成文件，请在系统分享面板里保存到文件或网盘。";
  if (delivery === "saved") return `已保存到系统文档：${filename}`;
  return `已导出 ${filename}`;
}

function usedMaxWeek(data: ScheduleData): number {
  const active = data.timetables.find((item) => item.id === data.activeTimetableId) ?? data.timetables[0];
  let max = 0;
  for (const course of active?.courses ?? []) {
    for (const slot of course.slots) {
      const weeks = weeksForSlot(slot);
      if (weeks.length > 0) max = Math.max(max, weeks[weeks.length - 1]);
    }
  }
  return max;
}

export function SettingsModal({
  data,
  autoHolidays,
  onClose,
  onSaveSemester,
  onExportJson,
  onExportIcs,
  onImportFile,
  onPrint,
  onClearData,
  onToggleAutoHolidays,
}: SettingsModalProps) {
  const active = data.timetables.find((item) => item.id === data.activeTimetableId) ?? data.timetables[0];
  const [tab, setTab] = useState<SettingsTab>("term");
  const [draft, setDraft] = useState<Semester>(() => ({
    ...active.semester,
    periods: active.semester.periods.map((period) => ({ ...period })),
  }));
  const [profileId, setProfileId] = useState<string | null>(active.periodProfileId);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const native = isNativeApp();
  const maxPeriod = getUsedMaxPeriod(active.courses);
  const maxWeek = usedMaxWeek(data);
  const periodWarning =
    maxPeriod > draft.periods.length
      ? `已有课程上到第 ${maxPeriod} 节，节数不能少于 ${maxPeriod}。`
      : "";
  const weekWarning =
    maxWeek > draft.totalWeeks
      ? `已有课程安排到第 ${maxWeek} 周，总周数不能少于 ${maxWeek}。`
      : "";

  const setPeriodCount = (count: number) => {
    setError("");
    setProfileId(null);
    setDraft((current) => ({
      ...current,
      periods: resizePeriods(current.periods, count),
    }));
  };

  const applyProfile = (profile: PeriodProfile) => {
    if (maxPeriod > profile.periods.length) {
      setError(`已有课程上到第 ${maxPeriod} 节，「${profile.name}」只有 ${profile.periods.length} 节，无法应用。`);
      return;
    }
    setError("");
    setProfileId(profile.id);
    setDraft((current) => ({
      ...current,
      periods: profile.periods.map((period) => ({ ...period })),
    }));
    setNotice({ tone: "info", message: `已载入「${profile.name}」，保存后应用到当前课表。` });
  };

  const updatePeriod = (index: number, patch: Partial<Period>) => {
    setError("");
    setProfileId(null);
    setDraft((current) => ({
      ...current,
      periods: current.periods.map((period) =>
        period.index === index ? { ...period, ...patch } : period,
      ),
    }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) {
      setError("学期名称不能为空。");
      return;
    }
    if (weekWarning) {
      setError(weekWarning);
      return;
    }
    if (periodWarning) {
      setError(periodWarning);
      return;
    }
    const invalidPeriod = draft.periods.find(
      (period) => !period.start || !period.end || timeToMinutes(period.end) <= timeToMinutes(period.start),
    );
    if (invalidPeriod) {
      setError(`第 ${invalidPeriod.index} 节的结束时间需要晚于开始时间。`);
      return;
    }
    onSaveSemester(
      {
        ...draft,
        name,
        periods: draft.periods.map((period, index) => ({ ...period, index: index + 1 })),
      },
      profileId,
    );
  };

  const handleExportJson = async () => {
    setNotice({ tone: "info", message: "正在整理备份…" });
    try {
      const result = await onExportJson();
      setNotice({
        tone: "success",
        message: deliveryMessage(result.delivery, result.filename),
      });
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "导出失败，请稍后再试。",
      });
    }
  };

  const handleExportIcs = async () => {
    setNotice({ tone: "info", message: "正在生成日历…" });
    try {
      const result = await onExportIcs();
      setNotice({
        tone: "success",
        message: `${deliveryMessage(result.delivery, result.filename)}　共 ${result.count} 个日程。`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "导出失败，请稍后再试。",
      });
    }
  };

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    setNotice({ tone: "info", message: "正在读取备份…" });
    const result = await onImportFile(file);
    setNotice({
      tone: result.ok ? "success" : result.message.includes("取消") ? "info" : "error",
      message: result.message,
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Modal
      className="settings-modal"
      eyebrow="PREFERENCES"
      title="设置"
      onClose={onClose}
      footer={
        <>
          <p className="modal-foot-note">所有内容只保存在本机</p>
          <span className="modal-foot-spacer" />
          <button className="secondary-button" type="button" onClick={onClose}>
            取消
          </button>
          <button className="primary-button" type="submit" form="settings-form">
            <Check size={16} />
            保存设置
          </button>
        </>
      }
    >
      <form id="settings-form" className="settings-form" onSubmit={handleSubmit}>
        <div className="settings-layout">
          <nav className="settings-tabs" aria-label="设置分类">
            {TABS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={tab === item.id ? "is-active" : ""}
                  type="button"
                  onClick={() => {
                    setTab(item.id);
                    setNotice(null);
                    setError("");
                  }}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <div className="settings-tabs-foot">
              <a href="https://github.com/lcymxm/classflow" target="_blank" rel="noreferrer">
                <ArrowUpRight size={15} />
                GitHub
              </a>
              <span>课序 v1.2.0</span>
            </div>
          </nav>

          <div className="settings-content">
            {error ? <p className="form-error">{error}</p> : null}
            {notice ? (
              <p className={`inline-notice inline-notice--${notice.tone}`} role="status">
                {notice.message}
              </p>
            ) : null}

            {tab === "term" ? (
              <section className="settings-pane">
                <div className="settings-pane-head">
                  <p className="eyebrow">TERM</p>
                  <h3>学期与视图</h3>
                  <p>课表里的每一周，都从学期开始的第一个周一算起。</p>
                </div>

                <div className="form-grid">
                  <label className="field field--wide">
                    <span className="field-label">学期名称</span>
                    <input
                      className="field-input"
                      value={draft.name}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, name: event.target.value }))
                      }
                      placeholder="例如：2026 秋季学期"
                      maxLength={60}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">开学第一周（周一）</span>
                    <input
                      className="field-input"
                      type="date"
                      value={draft.startDate}
                      onChange={(event) => {
                        const normalized = startOfWeekMonday(
                          parseDateKey(event.target.value || dateKey(new Date())),
                        );
                        setDraft((current) => ({
                          ...current,
                          startDate: dateKey(normalized),
                        }));
                      }}
                    />
                    <small className="field-hint">
                      {formatDateWithWeekday(parseDateKey(draft.startDate))} · 已自动对齐周一
                    </small>
                  </label>
                  <label className="field">
                    <span className="field-label">学期总周数</span>
                    <input
                      className="field-input"
                      type="number"
                      min={1}
                      max={30}
                      value={draft.totalWeeks}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          totalWeeks: Math.min(30, Math.max(1, Number(event.target.value) || 1)),
                        }))
                      }
                    />
                    <small className="field-hint">支持 1–30 周，一般学期为 16–20 周。</small>
                  </label>
                </div>

                <label className="toggle-row">
                  <span>
                    <strong>显示周末</strong>
                    <small>关闭后只显示周一至周五；遇到调休周末仍会自动出现。</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={draft.showWeekends}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, showWeekends: event.target.checked }))
                    }
                  />
                  <span className="switch" aria-hidden="true" />
                </label>

                <label className="toggle-row">
                  <span>
                    <strong>自动识别节假日与调休</strong>
                    <small>内置 2026–2027 年中国法定节假日；修改立即生效。放假日的课程会自动隐藏，调休日会标「班」。</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={autoHolidays}
                    onChange={(event) => onToggleAutoHolidays(event.target.checked)}
                  />
                  <span className="switch" aria-hidden="true" />
                </label>

                <div className="term-preview">
                  <span className="term-preview-label">第 1 周从</span>
                  <strong>{formatDateWithWeekday(parseDateKey(draft.startDate))}</strong>
                  <span>开始，共 {draft.totalWeeks} 周。</span>
                </div>
              </section>
            ) : null}

            {tab === "periods" ? (
              <section className="settings-pane">
                <div className="settings-pane-head">
                  <p className="eyebrow">DAILY RHYTHM</p>
                  <h3>作息时间</h3>
                  <p>设定每天有几节课，以及每一节的上下课时间。</p>
                </div>

                <div className="profile-section">
                  <div className="profile-section-head">
                    <div>
                      <span className="field-label">作息方案</span>
                      <small className="field-hint">选择一套现成的时间表，保存后应用到当前课表。</small>
                    </div>
                    <span className="profile-current">
                      {profileId
                        ? data.periodProfiles.find((profile) => profile.id === profileId)?.name ?? "自定义"
                        : "自定义"}
                    </span>
                  </div>
                  <div className="profile-grid">
                    {data.periodProfiles.map((profile) => (
                      <button
                        key={profile.id}
                        className={`profile-card ${profileId === profile.id ? "is-active" : ""}`}
                        type="button"
                        onClick={() => applyProfile(profile)}
                        aria-pressed={profileId === profile.id}
                      >
                        <span className="profile-card-top">
                          <strong>{profile.name}</strong>
                          {profileId === profile.id ? <Check size={14} /> : null}
                        </span>
                        <span className="profile-card-meta">
                          {profile.periods.length} 节 · 第 1 节 {profile.periods[0]?.start} 开始
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="period-count-row">
                  <label className="field">
                    <span className="field-label">每日节数</span>
                    <input
                      className="field-input"
                      type="number"
                      min={MIN_PERIODS}
                      max={MAX_PERIODS}
                      value={draft.periods.length}
                      onChange={(event) =>
                        setPeriodCount(
                          Math.min(MAX_PERIODS, Math.max(MIN_PERIODS, Number(event.target.value) || MIN_PERIODS)),
                        )
                      }
                    />
                  </label>
                  <p>
                    当前为 {draft.periods.length} 节 · 第 1 节 {draft.periods[0]?.start} 开始
                    {periodWarning ? <strong className="period-warning">{periodWarning}</strong> : null}
                  </p>
                </div>

                <div className="period-table">
                  <div className="period-table-head">
                    <span>节次</span>
                    <span>开始</span>
                    <span>结束</span>
                  </div>
                  {draft.periods.map((period) => (
                    <div className="period-row" key={period.index}>
                      <span className="period-index">
                        第 <strong>{period.index}</strong> 节
                      </span>
                      <input
                        className="field-input"
                        type="time"
                        value={period.start}
                        onChange={(event) => updatePeriod(period.index, { start: event.target.value })}
                        aria-label={`第 ${period.index} 节开始时间`}
                      />
                      <input
                        className="field-input"
                        type="time"
                        value={period.end}
                        onChange={(event) => updatePeriod(period.index, { end: event.target.value })}
                        aria-label={`第 ${period.index} 节结束时间`}
                      />
                    </div>
                  ))}
                </div>
                <p className="settings-note">
                  修改节次数量时，已有课程若使用了被删除的节次，将无法保存。
                </p>
              </section>
            ) : null}

            {tab === "data" ? (
              <section className="settings-pane">
                <div className="settings-pane-head">
                  <p className="eyebrow">YOUR DATA</p>
                  <h3>数据与备份</h3>
                  <p>课表保存在本机。换设备前，记得先导出一份备份。</p>
                </div>

                <div className="data-grid">
                  <button
                    className="data-card"
                    type="button"
                    onClick={() => { void handleExportJson(); }}
                  >
                    <span className="data-card-icon">
                      <Download size={18} />
                    </span>
                    <span>
                      <strong>导出全部课表备份</strong>
                      <small>JSON · 包含所有课表、课程、日程与作息</small>
                    </span>
                  </button>
                  <button
                    className="data-card"
                    type="button"
                    onClick={() => { void handleExportIcs(); }}
                  >
                    <span className="data-card-icon">
                      <CalendarRange size={18} />
                    </span>
                    <span>
                      <strong>导出当前课表日历</strong>
                      <small>ICS · 只导出当前课表的课程和日程</small>
                    </span>
                  </button>
                  <button
                    className="data-card"
                    type="button"
                    onClick={() => fileRef.current?.click()}
                  >
                    <span className="data-card-icon">
                      <Upload size={18} />
                    </span>
                    <span>
                      <strong>导入备份</strong>
                      <small>选择由课序导出的 JSON 文件</small>
                    </span>
                  </button>
                  {!native ? (
                    <button className="data-card" type="button" onClick={onPrint}>
                      <span className="data-card-icon">
                        <Printer size={18} />
                      </span>
                      <span>
                        <strong>打印当前课表</strong>
                        <small>也可以选择「另存为 PDF」</small>
                      </span>
                    </button>
                  ) : null}
                </div>
                <input
                  ref={fileRef}
                  id="import-file"
                  type="file"
                  accept=".json,application/json"
                  aria-label="选择课表备份文件"
                  hidden
                  onChange={(event) => {
                    void handleImport(event.target.files?.[0]);
                  }}
                />

                <div className="storage-box">
                  <div>
                    <span className="storage-icon">
                      <Database size={16} />
                    </span>
                    <div>
                      <strong>本地优先</strong>
                      <p>没有账号，没有服务器，没有同步。你的课表不会离开这台设备。</p>
                    </div>
                  </div>
                  <span className="storage-pill">LOCAL ONLY</span>
                </div>

                <div className="danger-zone">
                  <div>
                    <h4>重新开始</h4>
                    <p>清空所有课表、课程、日程与壁纸，建议先导出备份。</p>
                  </div>
                  <div className="danger-actions">
                    <button className="danger-ghost-button" type="button" onClick={onClearData}>
                      <Trash2 size={14} />
                      清空全部数据
                    </button>
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </form>
    </Modal>
  );
}
