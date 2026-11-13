import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Image as ImageIcon,
  LayoutGrid,
  Plus,
  Printer,
} from "lucide-react";
import type {
  AppPage,
  Course,
  ImportResult,
  Preferences,
  ScheduleData,
  ScheduleEvent,
  Semester,
  PeriodProfile,
  PeriodRule,
  Theme,
  Timetable as TimetableModel,
  TimetableCreateInput,
} from "./types";
import {
  dateKey,
  getDefaultStartDate,
  getTermPosition,
  getWeekDates,
  getWeekNumber,
  getWeekdayNumber,
  getTermName,
  parseDateKey,
  startOfWeekMonday,
} from "./lib/date";
import { buildSessions, getWeekStats } from "./lib/schedule";
import { periodsForDate } from "./lib/periods";
import {
  MAX_TIMETABLES,
  cloneTimetable,
  createBlankTimetable,
  createInitialData,
} from "./lib/factory";
import {
  loadPreferences,
  loadSchedule,
  normalizeSchedule,
  savePreferences,
  saveSchedule,
} from "./lib/storage";
import {
  filterHolidaySessions,
  getCalendarSummary,
  getDayStatusMap,
  getVisibleDays,
} from "./lib/holidays";
import { wallpaperStyle } from "./lib/wallpaper";
import { downloadScheduleIcs, downloadScheduleJson, readScheduleFile } from "./lib/transfer";
import { isNativeApp } from "./lib/nativeFile";
import { createTemplateCourses } from "./lib/templates";
import { syncAndroidWidget } from "./lib/widget";
import type { TimetableTemplateId } from "./lib/templates";
import { CourseDetail } from "./components/CourseDetail";
import { CourseEditor } from "./components/CourseEditor";
import type { EditorSeed } from "./components/CourseEditor";
import { CourseLibrary } from "./components/CourseLibrary";
import { AgendaPage } from "./components/AgendaPage";
import { MobileTabBar } from "./components/MobileTabBar";
import { ProfilePage } from "./components/ProfilePage";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { DesktopPet } from "./components/DesktopPet";
import { EventEditor } from "./components/EventEditor";
import type { EventSeed } from "./components/EventEditor";
import { SettingsModal } from "./components/SettingsModal";
import { Sidebar } from "./components/Sidebar";
import { Timetable } from "./components/Timetable";
import { TimetableManager } from "./components/TimetableManager";
import { Toast } from "./components/Toast";
import type { ToastState } from "./components/Toast";
import { Topbar } from "./components/Topbar";
import { WallpaperModal } from "./components/WallpaperModal";
import { WeekHero } from "./components/WeekHero";
import { WeekPickerModal } from "./components/WeekPickerModal";

interface ConfirmState {
  title: string;
  message: string;
  confirmLabel: string;
  tone: "danger" | "default";
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

function activeTimetable(data: ScheduleData): TimetableModel {
  return data.timetables.find((item) => item.id === data.activeTimetableId) ?? data.timetables[0];
}

export default function App() {
  const [data, setData] = useState<ScheduleData>(() => loadSchedule());
  const [prefs, setPrefs] = useState<Preferences>(() => loadPreferences());
  const [page, setPage] = useState<AppPage>("timetable");
  const [now, setNow] = useState(() => new Date());
  const initialTimetable = activeTimetable(data);
  const [week, setWeek] = useState(() =>
    getWeekNumber(initialTimetable.semester.startDate, new Date(), initialTimetable.semester.totalWeeks),
  );
  const [selectedDay, setSelectedDay] = useState(() => getWeekdayNumber(new Date()));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [timetablesOpen, setTimetablesOpen] = useState(false);
  const [wallpaperOpen, setWallpaperOpen] = useState(false);
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);
  const [editorSeed, setEditorSeed] = useState<EditorSeed | null>(null);
  const [eventSeed, setEventSeed] = useState<EventSeed | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [storageOk, setStorageOk] = useState(true);
  const toastId = useRef(0);
  const confirmResolve = useRef<((value: boolean) => void) | null>(null);

  const timetable = activeTimetable(data);
  const semester = timetable.semester;
  const courses = timetable.courses;
  const events = timetable.events;
  const todayNumber = getWeekdayNumber(now);
  const termPosition = getTermPosition(semester.startDate, semester.totalWeeks, now);
  const currentWeek = termPosition.week;
  const termState = termPosition.state;

  const viewDates = useMemo(() => getWeekDates(semester.startDate, week), [semester.startDate, week]);
  const currentDates = useMemo(
    () => getWeekDates(semester.startDate, currentWeek),
    [semester.startDate, currentWeek],
  );
  const viewDays = useMemo(
    () => getVisibleDays(semester.showWeekends, viewDates, prefs.autoHolidays),
    [semester.showWeekends, viewDates, prefs.autoHolidays],
  );
  const currentDays = useMemo(
    () => getVisibleDays(semester.showWeekends, currentDates, prefs.autoHolidays),
    [semester.showWeekends, currentDates, prefs.autoHolidays],
  );
  const viewDayStatuses = useMemo(
    () => getDayStatusMap(viewDates, prefs.autoHolidays),
    [viewDates, prefs.autoHolidays],
  );
  const currentDayStatuses = useMemo(
    () => getDayStatusMap(currentDates, prefs.autoHolidays),
    [currentDates, prefs.autoHolidays],
  );
  const rawViewSessions = useMemo(() => buildSessions(courses, week), [courses, week]);
  const rawCurrentSessions = useMemo(
    () => buildSessions(courses, currentWeek),
    [courses, currentWeek],
  );
  const viewSessions = useMemo(
    () => filterHolidaySessions(rawViewSessions, viewDates, prefs.autoHolidays),
    [rawViewSessions, viewDates, prefs.autoHolidays],
  );
  const todayKey = dateKey(now);
  const currentSessions = useMemo(
    () => filterHolidaySessions(rawCurrentSessions, currentDates, prefs.autoHolidays),
    [rawCurrentSessions, currentDates, prefs.autoHolidays],
  );
  const viewPeriods = useMemo(
    () => periodsForDate(timetable, data.periodProfiles, viewDates[viewDates.length - 1] ?? new Date()),
    [timetable, data.periodProfiles, viewDates],
  );
  const currentPeriods = useMemo(
    () => periodsForDate(timetable, data.periodProfiles, now),
    [timetable, data.periodProfiles, todayKey],
  );
  const viewSemester = useMemo(
    () => ({ ...semester, periods: viewPeriods }),
    [semester, viewPeriods],
  );
  const viewStats = useMemo(
    () => getWeekStats(viewSessions, viewPeriods),
    [viewSessions, viewPeriods],
  );
  const currentStats = useMemo(
    () => getWeekStats(currentSessions, currentPeriods),
    [currentSessions, currentPeriods],
  );
  const calendarSummary = useMemo(
    () => getCalendarSummary(viewDates, prefs.autoHolidays),
    [viewDates, prefs.autoHolidays],
  );
  const selectedDate = viewDates[selectedDay - 1] ?? viewDates[0];
  const selectedEvents = selectedDate
    ? events.filter((event) => event.date === dateKey(selectedDate))
    : [];
  const weekEvents = useMemo(() => {
    const keys = new Set(viewDates.map((date) => dateKey(date)));
    return events
      .filter((event) => keys.has(event.date))
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
        return a.start.localeCompare(b.start);
      });
  }, [events, viewDates]);
  const todayEvents = events.filter((event) => event.date === dateKey(now));
  const detailCourse = detailId ? courses.find((course) => course.id === detailId) ?? null : null;
  const nativeApp = isNativeApp();

  const notify = useCallback((message: string, tone: ToastState["tone"] = "success") => {
    toastId.current += 1;
    setToast({ id: toastId.current, message, tone });
  }, []);
  const closeToast = useCallback(() => setToast(null), []);

  const askConfirm = useCallback(
    (payload: ConfirmState): Promise<boolean> =>
      new Promise((resolve) => {
        confirmResolve.current?.(false);
        confirmResolve.current = resolve;
        setConfirmState(payload);
      }),
    [],
  );

  const settleConfirm = useCallback((value: boolean) => {
    const resolve = confirmResolve.current;
    confirmResolve.current = null;
    setConfirmState(null);
    resolve?.(value);
  }, []);

  const updateActiveTimetable = useCallback((updater: (current: TimetableModel) => TimetableModel) => {
    setData((current) => {
      const activeId = current.activeTimetableId;
      const timestamp = new Date().toISOString();
      return {
        ...current,
        updatedAt: timestamp,
        timetables: current.timetables.map((item) =>
          item.id === activeId ? { ...updater(item), updatedAt: timestamp } : item,
        ),
      };
    });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setStorageOk(saveSchedule(data));
  }, [data]);

  useEffect(() => {
    void syncAndroidWidget(data, prefs.autoHolidays).catch(() => undefined);
  }, [data, prefs.autoHolidays, todayKey]);

  useEffect(() => {
    savePreferences(prefs);
    document.documentElement.dataset.theme = prefs.theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute(
      "content",
      prefs.theme === "dark" ? "#101613" : prefs.theme === "whale" ? "#071426" : "#f4f1e8",
    );
  }, [prefs]);

  useEffect(() => {
    document.body.classList.toggle("sidebar-open", sidebarOpen);
    return () => document.body.classList.remove("sidebar-open");
  }, [sidebarOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1080) setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (termState === "during" && week > semester.totalWeeks) {
      setWeek(semester.totalWeeks);
    }
    if (week < 1) setWeek(1);
  }, [semester.totalWeeks, termState, week]);

  useEffect(() => {
    if (!viewDays.includes(selectedDay)) {
      setSelectedDay(viewDays.includes(todayNumber) ? todayNumber : viewDays[0] ?? 1);
    }
  }, [viewDays, selectedDay, todayNumber]);

  useEffect(() => {
    if (selectedDay > 7) setSelectedDay(1);
  }, [selectedDay]);

  const goToWeek = useCallback(
    (nextWeek: number) => {
      setWeek(Math.min(Math.max(nextWeek, 1), semester.totalWeeks));
    },
    [semester.totalWeeks],
  );

  const jumpToWeek = useCallback(
    (nextWeek: number) => {
      goToWeek(nextWeek);
      setWeekPickerOpen(false);
    },
    [goToWeek],
  );

  const goToday = useCallback(() => {
    setWeek(currentWeek);
    setSelectedDay(
      viewDays.includes(todayNumber) ? todayNumber : viewDays[0] ?? 1,
    );
  }, [currentWeek, todayNumber, viewDays]);

  const navigate = (nextPage: AppPage) => {
    if (nextPage === "agenda" && !viewDays.includes(selectedDay)) {
      setSelectedDay(viewDays.includes(todayNumber) ? todayNumber : viewDays[0] ?? 1);
    }
    setPage(nextPage);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openEditor = (seed: EditorSeed = {}) => {
    setEditorSeed(seed);
    setSidebarOpen(false);
  };

  const openEventEditor = (seed: EventSeed = {}) => {
    setEventSeed({ date: seed.date ?? dateKey(now), event: seed.event });
    setSidebarOpen(false);
  };

  const openCourseDetail = (course: Course) => {
    setDetailId(course.id);
  };

  const saveCourse = (course: Course) => {
    const editing = Boolean(editorSeed?.course);
    const existed = courses.some((item) => item.id === course.id);
    updateActiveTimetable((current) => {
      const exists = current.courses.some((item) => item.id === course.id);
      return {
        ...current,
        courses: exists
          ? current.courses.map((item) => (item.id === course.id ? course : item))
          : [...current.courses, course],
      };
    });
    setEditorSeed(null);
    notify(
      editing ? "课程已更新。" : existed ? "已合并到已有课程。" : "已加入课表。",
    );
  };

  const requestDeleteCourse = (course: Course) => {
    void askConfirm({
      title: "删除这门课？",
      message: `“${course.name}”的所有上课时间会一起删除，这个操作无法撤销。`,
      confirmLabel: "删除课程",
      tone: "danger",
    }).then((ok) => {
      if (!ok) return;
      setDetailId(null);
      updateActiveTimetable((current) => ({
        ...current,
        courses: current.courses.filter((item) => item.id !== course.id),
      }));
      notify("课程已删除。");
    });
  };

  const saveEvent = (event: ScheduleEvent) => {
    const editing = Boolean(eventSeed?.event);
    updateActiveTimetable((current) => {
      const exists = current.events.some((item) => item.id === event.id);
      return {
        ...current,
        events: exists
          ? current.events.map((item) => (item.id === event.id ? event : item))
          : [...current.events, event],
      };
    });
    setEventSeed(null);
    notify(editing ? "日程已更新。" : "日程已添加。");
  };

  const requestDeleteEvent = (event: ScheduleEvent) => {
    void askConfirm({
      title: "删除这条日程？",
      message: `“${event.title}”会从课表中移除，这个操作无法撤销。`,
      confirmLabel: "删除日程",
      tone: "danger",
    }).then((ok) => {
      if (!ok) return;
      setEventSeed(null);
      updateActiveTimetable((current) => ({
        ...current,
        events: current.events.filter((item) => item.id !== event.id),
      }));
      notify("日程已删除。");
    });
  };

  const saveSemester = (
    nextSemester: Semester,
    periodProfileId: string | null,
    periodProfiles: PeriodProfile[],
    periodRules: PeriodRule[],
  ) => {
    const profileMap = new Map(periodProfiles.map((profile) => [profile.id, profile]));
    const timestamp = new Date().toISOString();
    setData((current) => ({
      ...current,
      periodProfiles,
      updatedAt: timestamp,
      timetables: current.timetables.map((timetable) => {
        if (timetable.id === current.activeTimetableId) {
          return {
            ...timetable,
            semester: nextSemester,
            periodProfileId,
            periodRules: periodRules.map((rule) => ({ ...rule })),
            updatedAt: timestamp,
          };
        }
        const profile = timetable.periodProfileId
          ? profileMap.get(timetable.periodProfileId)
          : undefined;
        if (!profile) return timetable;
        return {
          ...timetable,
          semester: {
            ...timetable.semester,
            periods: profile.periods.map((period) => ({ ...period })),
          },
          updatedAt: timestamp,
        };
      }),
    }));
    setWeek(getWeekNumber(nextSemester.startDate, new Date(), nextSemester.totalWeeks));
    setSelectedDay(Math.min(selectedDay, nextSemester.showWeekends ? 7 : 5));
    setSettingsOpen(false);
    notify("课表与作息方案已更新。");
  };

  const switchTimetable = (id: string) => {
    const target = data.timetables.find((item) => item.id === id);
    if (!target) return;
    setData((current) => ({
      ...current,
      activeTimetableId: id,
      updatedAt: new Date().toISOString(),
    }));
    setWeek(getWeekNumber(target.semester.startDate, new Date(), target.semester.totalWeeks));
    setSelectedDay(getWeekdayNumber(new Date()));
    setTimetablesOpen(false);
    setPage("timetable");
    notify(`已切换到「${target.name}」。`);
  };

  const createTimetable = (input: TimetableCreateInput) => {
    if (data.timetables.length >= MAX_TIMETABLES) {
      notify(`最多只能创建 ${MAX_TIMETABLES} 套课表。`, "error");
      return;
    }
    const profile =
      data.periodProfiles.find((item) => item.id === input.periodProfileId) ??
      data.periodProfiles[0];
    const date = startOfWeekMonday(parseDateKey(input.startDate || getDefaultStartDate()));
    const created = createBlankTimetable(
      data.periodProfiles,
      new Date(),
      input.name.trim() || `我的课表 ${data.timetables.length + 1}`,
    );
    created.semester = {
      ...created.semester,
      name: input.semesterName.trim() || getTermName(date),
      startDate: dateKey(date),
      totalWeeks: input.totalWeeks,
      showWeekends: input.showWeekends,
      periods: profile.periods.map((period) => ({ ...period })),
    };
    created.periodProfileId = profile.id;
    created.periodRules = [
      { id: `rule-${created.semester.startDate.slice(5)}`, from: created.semester.startDate.slice(5), profileId: profile.id },
    ];
    created.courses = createTemplateCourses(
      (input.templateId as TimetableTemplateId | undefined) ?? "blank",
      created.semester.totalWeeks,
    );
    setData((current) => ({
      ...current,
      activeTimetableId: created.id,
      timetables: [...current.timetables, created],
      updatedAt: new Date().toISOString(),
    }));
    setWeek(getWeekNumber(created.semester.startDate, new Date(), created.semester.totalWeeks));
    setSelectedDay(getWeekdayNumber(new Date()));
    setTimetablesOpen(false);
    setPage("timetable");
    notify(
      created.courses.length > 0
        ? `已创建「${created.name}」，包含 ${created.courses.length} 门模板课程。`
        : `已创建「${created.name}」。`,
    );
  };

  const renameTimetable = (id: string, name: string) => {
    setData((current) => ({
      ...current,
      timetables: current.timetables.map((item) =>
        item.id === id ? { ...item, name: name.trim().slice(0, 60), updatedAt: new Date().toISOString() } : item,
      ),
      updatedAt: new Date().toISOString(),
    }));
    notify("课表名称已更新。");
  };

  const duplicateTimetable = (id: string) => {
    if (data.timetables.length >= MAX_TIMETABLES) {
      notify(`最多只能创建 ${MAX_TIMETABLES} 套课表。`, "error");
      return;
    }
    const source = data.timetables.find((item) => item.id === id);
    if (!source) return;
    const copy = cloneTimetable(source, `${source.name} 副本`.slice(0, 60));
    setData((current) => ({
      ...current,
      activeTimetableId: copy.id,
      timetables: [...current.timetables, copy],
      updatedAt: new Date().toISOString(),
    }));
    setWeek(getWeekNumber(copy.semester.startDate, new Date(), copy.semester.totalWeeks));
    setSelectedDay(getWeekdayNumber(new Date()));
    setTimetablesOpen(false);
    setPage("timetable");
    notify(`已复制为「${copy.name}」。`);
  };

  const requestDeleteTimetable = (id: string) => {
    if (data.timetables.length <= 1) {
      notify("至少保留一套课表。", "error");
      return;
    }
    const target = data.timetables.find((item) => item.id === id);
    if (!target) return;
    void askConfirm({
      title: `删除「${target.name}」？`,
      message: "这套课表里的课程、日程和壁纸都会一起删除，无法撤销。",
      confirmLabel: "删除课表",
      tone: "danger",
    }).then((ok) => {
      if (!ok) return;
      const remaining = data.timetables.filter((item) => item.id !== id);
      const nextActive =
        data.activeTimetableId === id ? remaining[0] : data.timetables.find((item) => item.id === data.activeTimetableId) ?? remaining[0];
      setData({
        ...data,
        activeTimetableId: nextActive.id,
        timetables: remaining,
        updatedAt: new Date().toISOString(),
      });
      setTimetablesOpen(false);
      setWeek(getWeekNumber(nextActive.semester.startDate, new Date(), nextActive.semester.totalWeeks));
      setSelectedDay(getWeekdayNumber(new Date()));
      notify(`已删除「${target.name}」。`);
    });
  };

  const clearAll = () => {
    void askConfirm({
      title: "清空全部数据？",
      message: "所有课表、课程、日程和壁纸都会被清空，无法撤销。主题和节假日开关会保留。建议先导出备份。",
      confirmLabel: "清空全部",
      tone: "danger",
    }).then((ok) => {
      if (!ok) return;
      const next = createInitialData();
      setData(next);
      const first = activeTimetable(next);
      setWeek(getWeekNumber(first.semester.startDate, new Date(), first.semester.totalWeeks));
      setSelectedDay(getWeekdayNumber(new Date()));
      setSettingsOpen(false);
      setPage("timetable");
      notify("已经清空，开始写自己的课表吧。");
    });
  };

  const renamePeriodProfile = (id: string, name: string) => {
    setData((current) => ({
      ...current,
      periodProfiles: current.periodProfiles.map((profile) =>
        profile.id === id ? { ...profile, name: name.trim().slice(0, 40) } : profile,
      ),
      updatedAt: new Date().toISOString(),
    }));
    notify("作息方案已重命名。");
  };

  const updateWallpaper = (wallpaper: TimetableModel["wallpaper"]) => {
    updateActiveTimetable((current) => ({ ...current, wallpaper }));
  };

  const exportJson = () => downloadScheduleJson(data);

  const exportIcs = () => downloadScheduleIcs(data, prefs.autoHolidays);

  const printTimetable = () => {
    setSettingsOpen(false);
    setDetailId(null);
    setEditorSeed(null);
    setEventSeed(null);
    window.setTimeout(() => window.print(), 150);
  };

  const importFile = async (file: File): Promise<ImportResult> => {
    const result = await readScheduleFile(file);
    if (!result.data) return { ok: false, message: result.message };
    const next = normalizeSchedule(result.data);
    if (!next) return { ok: false, message: "备份格式无法识别。" };
    const confirmed = await askConfirm({
      title: "导入并替换全部课表？",
      message: `将导入 ${next.timetables.length} 套课表，替换当前的 ${data.timetables.length} 套课表。\n建议先导出现有备份。`,
      confirmLabel: "导入并替换",
      tone: "danger",
    });
    if (!confirmed) {
      return { ok: false, message: "已取消导入，当前课表未改变。" };
    }
    const nextActive = activeTimetable(next);
    setData(next);
    setWeek(getWeekNumber(nextActive.semester.startDate, new Date(), nextActive.semester.totalWeeks));
    setSelectedDay(getWeekdayNumber(new Date()));
    setSettingsOpen(false);
    setPage("timetable");
    notify(result.message);
    return { ok: true, message: result.message };
  };

  const toggleTheme = () => {
    const themes: Theme[] = ["light", "dark", "whale"];
    setPrefs((current) => ({
      ...current,
      theme: themes[(themes.indexOf(current.theme) + 1) % themes.length],
    }));
  };

  const setTheme = (theme: Theme) => {
    setPrefs((current) => ({ ...current, theme }));
  };

  const setAutoHolidays = (value: boolean) => {
    setPrefs((current) => ({ ...current, autoHolidays: value }));
    notify(value ? "已开启节假日与调休识别。" : "已关闭节假日识别。");
  };

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && sidebarOpen) {
        setSidebarOpen(false);
        return;
      }
      if (document.querySelector("dialog[open]") || isTypingTarget(event.target)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        setEditorSeed({});
        return;
      }
      if (event.key.toLowerCase() === "e") {
        event.preventDefault();
        setEventSeed({ date: dateKey(viewDates[selectedDay - 1] ?? now) });
        return;
      }
      if (page !== "timetable") return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setWeek((current) => Math.max(1, current - 1));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setWeek((current) => Math.min(semester.totalWeeks, current + 1));
      } else if (event.key.toLowerCase() === "t") {
        event.preventDefault();
        setWeek(currentWeek);
        setSelectedDay(viewDays.includes(todayNumber) ? todayNumber : viewDays[0] ?? 1);
      }
    };
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [sidebarOpen, page, semester.totalWeeks, currentWeek, todayNumber, viewDays, now]);


  return (
    <div className="app-shell">
      <Sidebar
        open={sidebarOpen}
        page={page}
        timetableName={timetable.name}
        timetableCount={data.timetables.length}
        semesterName={semester.name}
        currentWeek={currentWeek}
        totalWeeks={semester.totalWeeks}
        courseCount={courses.length}
        sessionCount={currentStats.sessionCount}
        agendaCount={weekEvents.length}
        theme={prefs.theme}
        onNavigate={navigate}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => {
          setSettingsOpen(true);
          setSidebarOpen(false);
        }}
        onManageTimetables={() => {
          setTimetablesOpen(true);
          setSidebarOpen(false);
        }}
      />
      {sidebarOpen ? (
        <button
          className="sidebar-scrim"
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="关闭导航"
        />
      ) : null}

      <div className="main-shell">
        <Topbar
          page={page}
          timetableName={timetable.name}
          semesterName={semester.name}
          week={week}
          theme={prefs.theme}
          storageOk={storageOk}
          onOpenMenu={() => setSidebarOpen(true)}
          onAddCourse={() => openEditor()}
          onAddEvent={() =>
            openEventEditor({ date: dateKey(viewDates[selectedDay - 1] ?? now) })
          }
          onOpenSettings={() => setSettingsOpen(true)}
          onManageTimetables={() => setTimetablesOpen(true)}
          onOpenWeekPicker={() => setWeekPickerOpen(true)}
          onToggleTheme={toggleTheme}
        />

        <main className="main">
          {page === "timetable" ? (
            <>
              <WeekHero
                week={week}
                currentWeek={currentWeek}
                totalWeeks={semester.totalWeeks}
                dates={viewDates}
                stats={viewStats}
                termState={termState}
                onPrev={() => goToWeek(week - 1)}
                onNext={() => goToWeek(week + 1)}
                onToday={goToday}
                onOpenWeekPicker={() => setWeekPickerOpen(true)}
              />

              <div className="content-grid content-grid--solo">
                <section
                  className="board"
                  aria-label="周课表"
                  style={wallpaperStyle(timetable.wallpaper, prefs.theme)}
                >
                  <div className="board-toolbar">
                    <div className="board-title">
                      <LayoutGrid size={15} />
                      <span>周全网格</span>
                    </div>
                    <div className="board-toolbar-right">
                      <span className="board-meta">
                        {viewStats.sessionCount} 节 · {viewStats.courseCount} 门
                      </span>
                      <button
                        className="icon-button"
                        type="button"
                        onClick={() => setWallpaperOpen(true)}
                        aria-label="更换课表壁纸"
                        title="更换课表壁纸"
                      >
                        <ImageIcon size={17} />
                      </button>
                      {!nativeApp ? (
                        <button
                          className="icon-button"
                          type="button"
                          onClick={printTimetable}
                          aria-label="打印当前课表"
                          title="打印当前课表"
                        >
                          <Printer size={17} />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <Timetable
                    semester={viewSemester}
                    week={week}
                    currentWeek={currentWeek}
                    dates={viewDates}
                    days={viewDays}
                    courses={courses}
                    sessions={viewSessions}
                    dayStatuses={viewDayStatuses}
                    calendarSummary={calendarSummary}
                    now={now}
                    onSelectCourse={openCourseDetail}
                    onPrevWeek={() => goToWeek(week - 1)}
                    onNextWeek={() => goToWeek(week + 1)}
                    onAddAt={(day, start) => openEditor({ prefill: { day, start } })}
                    onAddCourse={() => openEditor()}
                  />
                </section>
              </div>
            </>
          ) : page === "agenda" ? (
            <AgendaPage
              now={now}
              week={week}
              currentWeek={currentWeek}
              totalWeeks={semester.totalWeeks}
              semester={viewSemester}
              dates={viewDates}
              days={viewDays}
              sessions={viewSessions}
              selectedDay={selectedDay}
              selectedEvents={selectedEvents}
              weekEvents={weekEvents}
              dayStatuses={viewDayStatuses}
              currentDates={currentDates}
              currentSessions={currentSessions}
              currentPeriods={currentPeriods}
              currentStats={currentStats}
              currentDays={currentDays}
              currentDayStatuses={currentDayStatuses}
              todayNumber={todayNumber}
              todayEvents={todayEvents}
              onPrevWeek={() => goToWeek(week - 1)}
              onNextWeek={() => goToWeek(week + 1)}
              onToday={goToday}
              onSelectDay={setSelectedDay}
              onSelectCourse={openCourseDetail}
              onAddAt={(day, start) => openEditor({ prefill: { day, start } })}
              onAddEventAt={(date) => openEventEditor({ date: date || dateKey(now) })}
              onSelectEvent={(event) => openEventEditor({ event })}
            />
          ) : page === "profile" ? (
            <ProfilePage
              data={data}
              prefs={prefs}
              timetable={timetable}
              semester={semester}
              week={week}
              currentWeek={currentWeek}
              sessionCount={viewStats.sessionCount}
              eventCount={weekEvents.length}
              storageOk={storageOk}
              native={nativeApp}
              onOpenSettings={() => setSettingsOpen(true)}
              onManageTimetables={() => setTimetablesOpen(true)}
              onSwitchTimetable={switchTimetable}
              onOpenWallpaper={() => setWallpaperOpen(true)}
              onChangeTheme={setTheme}
              onExportJson={exportJson}
              onExportIcs={exportIcs}
              onImportFile={importFile}
              onPrint={printTimetable}
            />
          ) : (
            <CourseLibrary
              courses={courses}
              semester={viewSemester}
              onAddCourse={() => openEditor()}
              onSelectCourse={openCourseDetail}
              onEditCourse={(course) => openEditor({ course })}
            />
          )}

          <footer className="site-footer">
            <span>课序 · 把一周，排成喜欢的样子。</span>
            <a href="https://github.com/lcymxm/classflow" target="_blank" rel="noreferrer">
              <ArrowUpRight size={14} />
              GitHub
            </a>
            <span className="footer-dot">·</span>
            <span>离线可用</span>
          </footer>
        </main>
      </div>

      {editorSeed ? (
        <CourseEditor
          key={editorSeed.course?.id ?? "new"}
          seed={editorSeed}
          semester={viewSemester}
          courses={courses}
          onClose={() => setEditorSeed(null)}
          onSave={saveCourse}
        />
      ) : null}

      {detailCourse ? (
        <CourseDetail
          course={detailCourse}
          semester={viewSemester}
          onClose={() => setDetailId(null)}
          onEdit={() => {
            setDetailId(null);
            setEditorSeed({ course: detailCourse });
          }}
          onDelete={() => requestDeleteCourse(detailCourse)}
        />
      ) : null}

      {eventSeed ? (
        <EventEditor
          key={eventSeed.event?.id ?? `event-${eventSeed.date}`}
          seed={eventSeed}
          onClose={() => setEventSeed(null)}
          onSave={saveEvent}
          onDelete={requestDeleteEvent}
        />
      ) : null}

      {settingsOpen ? (
        <SettingsModal
          data={data}
          theme={prefs.theme}
          autoHolidays={prefs.autoHolidays}
          onClose={() => setSettingsOpen(false)}
          onSaveSemester={saveSemester}
          onExportJson={exportJson}
          onExportIcs={exportIcs}
          onImportFile={importFile}
          onPrint={printTimetable}
          onClearData={clearAll}
          onToggleAutoHolidays={setAutoHolidays}
          onRenameProfile={renamePeriodProfile}
          onChangeTheme={setTheme}
        />
      ) : null}

      {timetablesOpen ? (
        <TimetableManager
          data={data}
          onClose={() => setTimetablesOpen(false)}
          onSwitch={switchTimetable}
          onCreate={createTimetable}
          onRename={renameTimetable}
          onDuplicate={duplicateTimetable}
          onDelete={requestDeleteTimetable}
        />
      ) : null}

      {weekPickerOpen ? (
        <WeekPickerModal
          week={week}
          currentWeek={currentWeek}
          totalWeeks={semester.totalWeeks}
          startDate={semester.startDate}
          onSelect={jumpToWeek}
          onClose={() => setWeekPickerOpen(false)}
        />
      ) : null}

      {wallpaperOpen ? (
        <WallpaperModal
          wallpaper={timetable.wallpaper}
          theme={prefs.theme}
          onClose={() => setWallpaperOpen(false)}
          onChange={updateWallpaper}
        />
      ) : null}

      {confirmState ? (
        <ConfirmDialog
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          tone={confirmState.tone}
          onConfirm={() => settleConfirm(true)}
          onCancel={() => settleConfirm(false)}
        />
      ) : null}

      <Toast toast={toast} onClose={closeToast} />

      {page === "timetable" ? <DesktopPet /> : null}

      {page === "timetable" && week !== currentWeek ? (
        <button className="week-back-fab" type="button" onClick={goToday}>
          <CalendarDays size={15} />
          回到本周
        </button>
      ) : null}

      <MobileTabBar page={page} onNavigate={navigate} />

      {page === "timetable" && courses.length > 0 ? (
        <button
          className="floating-add"
          type="button"
          onClick={() => openEditor()}
          aria-label="新建课程"
        >
          <Plus size={20} />
        </button>
      ) : null}
    </div>
  );
}
