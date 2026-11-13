import { useRef, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  CalendarRange,
  Check,
  Clock,
  Pencil,
  Plus,
  X,
  Database,
  Download,
  Printer,
  Trash2,
  Upload,
  Waves,
} from "lucide-react";
import type { FormEvent } from "react";
import type {
  ImportResult,
  Period,
  PeriodProfile,
  PeriodRule,
  ScheduleData,
  Semester,
  Theme,
} from "../types";
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
import { WhaleMascot } from "./WhaleMascot";

type SettingsTab = "term" | "periods" | "data";

interface SettingsModalProps {
  data: ScheduleData;
  theme: Theme;
  autoHolidays: boolean;
  onClose: () => void;
  onSaveSemester: (
    semester: Semester,
    periodProfileId: string | null,
    periodProfiles: PeriodProfile[],
    periodRules: PeriodRule[],
  ) => void;
  onExportJson: () => Promise<ExportResult>;
  onExportIcs: () => Promise<ExportResult & { count: number }>;
  onImportFile: (file: File) => Promise<ImportResult>;
  onPrint: () => void;
  onClearData: () => void;
  onToggleAutoHolidays: (value: boolean) => void;
  onRenameProfile: (id: string, name: string) => void;
  onChangeTheme: (theme: Theme) => void;
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
  theme,
  autoHolidays,
  onClose,
  onSaveSemester,
  onExportJson,
  onExportIcs,
  onImportFile,
  onPrint,
  onClearData,
  onToggleAutoHolidays,
  onRenameProfile,
  onChangeTheme,
}: SettingsModalProps) {
  const active = data.timetables.find((item) => item.id === data.activeTimetableId) ?? data.timetables[0];
  const [tab, setTab] = useState<SettingsTab>("term");
  const [draft, setDraft] = useState<Semester>(() => ({
    ...active.semester,
    periods: active.semester.periods.map((period) => ({ ...period })),
  }));
  const [profileId, setProfileId] = useState<string | null>(active.periodProfileId);
  const [periodRules, setPeriodRules] = useState<PeriodRule[]>(() => {
    const rules = active.periodRules?.length ? active.periodRules : [];
    if (rules.length > 0) return rules.map((rule) => ({ ...rule }));
    const fallback = active.periodProfileId;
    return fallback
      ? [{ id: `rule-${active.semester.startDate}`, from: active.semester.startDate, profileId: fallback }]
      : [];
  });
  const [profilePeriods, setProfilePeriods] = useState<Record<string, Period[]>>(() =>
    Object.fromEntries(
      data.periodProfiles.map((profile) => [
        profile.id,
        profile.periods.map((period) => ({ ...period })),
      ]),
    ),
  );
  const [renamingProfile, setRenamingProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const native = isNativeApp();
  const currentProfile = data.periodProfiles.find((profile) => profile.id === profileId);
  const maxPeriodForProfile = (id: string): number => {
    const related = data.timetables.filter((timetable) => timetable.periodProfileId === id);
    return getUsedMaxPeriod(related.flatMap((timetable) => timetable.courses));
  };
  const maxPeriod = profileId ? maxPeriodForProfile(profileId) : getUsedMaxPeriod(active.courses);
  const maxWeek = usedMaxWeek(data);
  const periodWarning =
    maxPeriod > draft.periods.length
      ? `已有课程上到第 ${maxPeriod} 节，节数不能少于 ${maxPeriod}。`
      : "";
  const weekWarning =
    maxWeek > draft.totalWeeks
      ? `已有课程安排到第 ${maxWeek} 周，总周数不能少于 ${maxWeek}。`
      : "";

  const updatePeriodRule = (id: string, patch: Partial<PeriodRule>) => {
    setError("");
    setPeriodRules((current) =>
      current.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)),
    );
  };

  const addPeriodRule = () => {
    const profile = currentProfile ?? data.periodProfiles[0];
    if (!profile) return;
    setPeriodRules((current) => [
      ...current,
      {
        id: `rule-${Date.now()}-${current.length}`,
        from: dateKey(new Date()),
        profileId: profile.id,
      },
    ]);
    setError("");
  };

  const removePeriodRule = (id: string) => {
    setPeriodRules((current) => (current.length <= 1 ? current : current.filter((rule) => rule.id !== id)));
    setError("");
  };

  const setPeriodCount = (count: number) => {
    setError("");
    const periods = resizePeriods(draft.periods, count).map((period) => ({ ...period }));
    setDraft((current) => ({ ...current, periods }));
    if (profileId) {
      setProfilePeriods((current) => ({ ...current, [profileId]: periods }));
    }
  };

  const startRenameProfile = () => {
    if (!currentProfile) return;
    setProfileName(currentProfile.name);
    setRenamingProfile(true);
    setError("");
  };

  const submitProfileName = () => {
    if (!currentProfile) return;
    const name = profileName.trim();
    if (!name) {
      setError("作息方案需要一个名字。");
      return;
    }
    onRenameProfile(currentProfile.id, name);
    setRenamingProfile(false);
    setError("");
  };

  const applyProfile = (profile: PeriodProfile) => {
    const periods = profilePeriods[profile.id] ?? profile.periods;
    const targetMax = maxPeriodForProfile(profile.id);
    if (targetMax > periods.length) {
      setError(`使用「${profile.name}」的课表已上到第 ${targetMax} 节，方案只有 ${periods.length} 节，无法应用。`);
      return;
    }
    setError("");
    setProfileId(profile.id);
    setDraft((current) => ({
      ...current,
      periods: periods.map((period) => ({ ...period })),
    }));
    setNotice({ tone: "info", message: `正在编辑「${profile.name}」，保存后更新到课表。` });
  };

  const updatePeriod = (index: number, patch: Partial<Period>) => {
    setError("");
    const periods = draft.periods.map((period) =>
      period.index === index ? { ...period, ...patch } : period,
    );
    setDraft((current) => ({ ...current, periods }));
    if (profileId) {
      setProfilePeriods((current) => ({ ...current, [profileId]: periods }));
    }
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
    if (periodRules.length === 0) {
      setError("至少保留一条作息执行日期。");
      return;
    }
    const ruleDates = new Set<string>();
    for (const rule of periodRules) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(rule.from)) {
        setError("请为每条作息规则选择一个有效日期。");
        return;
      }
      if (ruleDates.has(rule.from)) {
        setError("同一天只能设置一套作息。");
        return;
      }
      if (!data.periodProfiles.some((profile) => profile.id === rule.profileId)) {
        setError("有一条作息规则引用了不存在的作息方案。");
        return;
      }
      ruleDates.add(rule.from);
    }
    const sortedPeriodRules = [...periodRules].sort((a, b) => a.from.localeCompare(b.from));

    const profilesForSave: PeriodProfile[] = data.periodProfiles.map((profile) => {
      const periods = profile.id === profileId ? draft.periods : profilePeriods[profile.id] ?? profile.periods;
      return {
        ...profile,
        periods: periods.map((period, index) => ({ ...period, index: index + 1 })),
      };
    });

    const invalidProfile = profilesForSave.find((profile) =>
      profile.periods.some(
        (period) => !period.start || !period.end || timeToMinutes(period.end) <= timeToMinutes(period.start),
      ),
    );
    if (invalidProfile) {
      const invalid = invalidProfile.periods.find(
        (period) => !period.start || !period.end || timeToMinutes(period.end) <= timeToMinutes(period.start),
      );
      setError(`「${invalidProfile.name}」第 ${invalid?.index ?? 1} 节的时间不正确。`);
      return;
    }

    for (const profile of profilesForSave) {
      const max = maxPeriodForProfile(profile.id);
      if (max > profile.periods.length) {
        setError(`使用「${profile.name}」的课表上到第 ${max} 节，方案不能少于 ${max} 节。`);
        return;
      }
    }

    const activePeriods = draft.periods.map((period, index) => ({ ...period, index: index + 1 }));

    onSaveSemester(
      {
        ...draft,
        name,
        periods: activePeriods,
      },
      profileId,
      profilesForSave,
      sortedPeriodRules,
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
              <span>课序 v1.10.0</span>
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

                <div className="theme-picker-block">
                  <div className="theme-picker-head">
                    <span className="field-label">界面主题</span>
                    <small className="field-hint">切换立即生效，不影响课表数据。</small>
                  </div>
                  <div className="theme-choice-grid" role="group" aria-label="界面主题">
                    <button
                      className={`theme-choice ${theme === "light" ? "is-active" : ""}`}
                      type="button"
                      onClick={() => onChangeTheme("light")}
                      aria-pressed={theme === "light"}
                    >
                      <span className="theme-swatch theme-swatch--light" />
                      <span className="theme-choice-copy">
                        <strong>奶油纸</strong>
                        <small>明亮、纸张感</small>
                      </span>
                    </button>
                    <button
                      className={`theme-choice ${theme === "dark" ? "is-active" : ""}`}
                      type="button"
                      onClick={() => onChangeTheme("dark")}
                      aria-pressed={theme === "dark"}
                    >
                      <span className="theme-swatch theme-swatch--dark" />
                      <span className="theme-choice-copy">
                        <strong>夜读</strong>
                        <small>深绿、适合晚上</small>
                      </span>
                    </button>
                    <button
                      className={`theme-choice theme-choice--whale ${theme === "whale" ? "is-active" : ""}`}
                      type="button"
                      onClick={() => onChangeTheme("whale")}
                      aria-pressed={theme === "whale"}
                    >
                      <span className="theme-swatch theme-swatch--whale">
                        <WhaleMascot size={34} face />
                      </span>
                      <span className="theme-choice-copy">
                        <strong>DeepSeek 鲸鱼娘</strong>
                        <small>深海蓝 · dsh-pet 素材 · 非官方</small>
                      </span>
                      <Waves size={14} className="theme-choice-wave" />
                    </button>
                  </div>
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
                    {renamingProfile && currentProfile ? (
                      <div className="profile-rename-row">
                        <input
                          className="field-input"
                          value={profileName}
                          onChange={(event) => setProfileName(event.target.value)}
                          maxLength={40}
                          autoFocus
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              submitProfileName();
                            }
                            if (event.key === "Escape") setRenamingProfile(false);
                          }}
                        />
                        <button
                          className="icon-button"
                          type="button"
                          onClick={submitProfileName}
                          aria-label="保存作息方案名称"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          className="icon-button"
                          type="button"
                          onClick={() => setRenamingProfile(false)}
                          aria-label="取消重命名"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="profile-current-group">
                        <span className="profile-current">{currentProfile?.name ?? "自定义"}</span>
                        {currentProfile ? (
                          <button
                            className="profile-rename"
                            type="button"
                            onClick={startRenameProfile}
                          >
                            <Pencil size={12} />
                            改名
                          </button>
                        ) : null}
                      </div>
                    )}
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

                <div className="period-rule-section">
                  <div className="profile-section-head">
                    <div>
                      <span className="field-label">从某天起执行哪套作息</span>
                      <small className="field-hint">
                        查看某一周时，按该周内日期选择方案；同一周内切换会整周采用新方案。
                      </small>
                    </div>
                    <button className="secondary-button period-rule-add" type="button" onClick={addPeriodRule}>
                      <Plus size={14} />
                      添加日期
                    </button>
                  </div>
                  <div className="period-rule-list">
                    {periodRules.map((rule) => (
                      <div className="period-rule-row" key={rule.id}>
                        <span className="period-rule-prefix">从</span>
                        <input
                          className="field-input"
                          type="date"
                          value={rule.from}
                          onChange={(event) => updatePeriodRule(rule.id, { from: event.target.value })}
                          aria-label="作息开始日期"
                        />
                        <span className="period-rule-prefix">起使用</span>
                        <select
                          className="field-input period-rule-select"
                          value={rule.profileId}
                          onChange={(event) => updatePeriodRule(rule.id, { profileId: event.target.value })}
                          aria-label="生效作息方案"
                        >
                          {data.periodProfiles.map((profile) => (
                            <option key={profile.id} value={profile.id}>
                              {profile.name}
                            </option>
                          ))}
                        </select>
                        <button
                          className="icon-button"
                          type="button"
                          onClick={() => removePeriodRule(rule.id)}
                          disabled={periodRules.length <= 1}
                          aria-label="删除这条作息规则"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="settings-note">
                    第一条规则之前的时间使用当前课表的默认作息。
                  </p>
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
