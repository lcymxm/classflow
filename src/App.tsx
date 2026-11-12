import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  LayoutGrid,
  List,
  Plus,
  Printer,
  Sparkles,
} from "lucide-react";
import type { AppPage, Course, ImportResult, Preferences, ScheduleData, Semester } from "./types";
import { getWeekdayNumber, getWeekNumber, getWeekDates, getTermPosition } from "./lib/date";
import {
  buildSessions,
  getWeekStats,
} from "./lib/schedule";
import {
  createBlankSchedule,
  createDemoSchedule,
} from "./lib/factory";
import {
  loadPreferences,
  loadSchedule,
  normalizeSchedule,
  savePreferences,
  saveSchedule,
} from "./lib/storage";
import { downloadScheduleIcs, downloadScheduleJson, readScheduleFile } from "./lib/transfer";
import { isNativeApp } from "./lib/nativeFile";
import { CourseDetail } from "./components/CourseDetail";
import { CourseEditor } from "./components/CourseEditor";
import type { EditorSeed } from "./components/CourseEditor";
import { CourseLibrary } from "./components/CourseLibrary";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { DayView } from "./components/DayView";
import { SettingsModal } from "./components/SettingsModal";
import { Sidebar } from "./components/Sidebar";
import { Timetable } from "./components/Timetable";
import { Toast } from "./components/Toast";
import type { ToastState } from "./components/Toast";
import { TodayRail } from "./components/TodayRail";
import { Topbar } from "./components/Topbar";
import { WeekHero } from "./components/WeekHero";

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

function DemoBanner({ onClear }: { onClear: () => void }) {
  return (
    <div className="demo-banner">
      <span className="demo-icon">
        <Sparkles size={15} />
      </span>
      <p>
        <strong>这是示例课表。</strong>
        随便看看、随手改，或者从一份空白开始。
      </p>
      <button className="text-button" type="button" onClick={onClear}>
        清空示例
        <ArrowRight size={14} />
      </button>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState<ScheduleData>(() => loadSchedule());
  const [prefs, setPrefs] = useState<Preferences>(() => loadPreferences());
  const [page, setPage] = useState<AppPage>("timetable");
  const [now, setNow] = useState(() => new Date());
  const [week, setWeek] = useState(() =>
    getWeekNumber(data.semester.startDate, new Date(), data.semester.totalWeeks),
  );
  const [selectedDay, setSelectedDay] = useState(() => getWeekdayNumber(new Date()));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editorSeed, setEditorSeed] = useState<EditorSeed | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [storageOk, setStorageOk] = useState(true);
  const toastId = useRef(0);
  const confirmResolve = useRef<((value: boolean) => void) | null>(null);

  const currentWeek = getTermPosition(
    data.semester.startDate,
    data.semester.totalWeeks,
    now,
  ).week;
  const termState = getTermPosition(data.semester.startDate, data.semester.totalWeeks, now).state;
  const todayNumber = getWeekdayNumber(now);
  const visibleDays = data.semester.showWeekends ? 7 : 5;

  const viewDates = useMemo(
    () => getWeekDates(data.semester.startDate, week),
    [data.semester.startDate, week],
  );
  const currentDates = useMemo(
    () => getWeekDates(data.semester.startDate, currentWeek),
    [data.semester.startDate, currentWeek],
  );
  const viewSessions = useMemo(() => buildSessions(data.courses, week), [data.courses, week]);
  const currentSessions = useMemo(
    () => buildSessions(data.courses, currentWeek),
    [data.courses, currentWeek],
  );
  const viewStats = useMemo(
    () => getWeekStats(viewSessions, data.semester.periods),
    [viewSessions, data.semester.periods],
  );
  const currentStats = useMemo(
    () => getWeekStats(currentSessions, data.semester.periods),
    [currentSessions, data.semester.periods],
  );
  const detailCourse = detailId
    ? data.courses.find((course) => course.id === detailId) ?? null
    : null;

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

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const ok = saveSchedule(data);
    setStorageOk(ok);
  }, [data]);

  useEffect(() => {
    savePreferences(prefs);
    document.documentElement.dataset.theme = prefs.theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute("content", prefs.theme === "dark" ? "#101613" : "#f4f1e8");
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
    if (termState === "during" && week > data.semester.totalWeeks) {
      setWeek(data.semester.totalWeeks);
    }
    if (week < 1) setWeek(1);
  }, [data.semester.totalWeeks, termState, week]);

  useEffect(() => {
    if (!data.semester.showWeekends && selectedDay > 5) setSelectedDay(1);
  }, [data.semester.showWeekends, selectedDay]);

  const goToWeek = useCallback(
    (nextWeek: number) => {
      setWeek(Math.min(Math.max(nextWeek, 1), data.semester.totalWeeks));
    },
    [data.semester.totalWeeks],
  );

  const goToday = useCallback(() => {
    setWeek(currentWeek);
    setSelectedDay(Math.min(todayNumber, visibleDays));
  }, [currentWeek, todayNumber, visibleDays]);

  const changeView = (view: "week" | "day") => {
    setPrefs((current) => ({ ...current, view }));
    if (view === "day" && selectedDay > visibleDays) {
      setSelectedDay(Math.min(todayNumber, visibleDays));
    }
  };

  const navigate = (nextPage: AppPage) => {
    setPage(nextPage);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openEditor = (seed: EditorSeed = {}) => {
    setEditorSeed(seed);
    setSidebarOpen(false);
  };

  const openCourseDetail = (course: Course) => {
    setDetailId(course.id);
  };

  const saveCourse = (course: Course) => {
    const editing = Boolean(editorSeed?.course);
    setData((current) => {
      const exists = current.courses.some((item) => item.id === course.id);
      return {
        ...current,
        isDemo: false,
        courses: exists
          ? current.courses.map((item) => (item.id === course.id ? course : item))
          : [...current.courses, course],
        updatedAt: new Date().toISOString(),
      };
    });
    setEditorSeed(null);
    notify(editing ? "课程已更新。" : "已加入课表。");
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
      setData((current) => ({
        ...current,
        isDemo: false,
        courses: current.courses.filter((item) => item.id !== course.id),
        updatedAt: new Date().toISOString(),
      }));
      notify("课程已删除。");
    });
  };

  const clearCourses = (mode: "blank" | "demo") => {
    const next = mode === "blank" ? createBlankSchedule() : createDemoSchedule();
    setData(next);
    setWeek(getWeekNumber(next.semester.startDate, new Date(), next.semester.totalWeeks));
    setSelectedDay(Math.min(todayNumber, next.semester.showWeekends ? 7 : 5));
    setSettingsOpen(false);
    setPage("timetable");
    notify(mode === "blank" ? "已经清空，开始写自己的课表吧。" : "示例课表已恢复。");
  };

  const requestClear = (mode: "blank" | "demo") => {
    void askConfirm({
      title: mode === "blank" ? "清空全部数据？" : "恢复示例课表？",
      message:
        mode === "blank"
          ? "当前学期、课程和设置都会被清空，无法撤销。建议先在「设置 → 数据与备份」导出 JSON。"
          : "当前的课表会被示例数据覆盖，无法撤销。",
      confirmLabel: mode === "blank" ? "清空数据" : "恢复示例",
      tone: mode === "blank" ? "danger" : "default",
    }).then((ok) => {
      if (ok) clearCourses(mode);
    });
  };

  const saveSemester = (semester: Semester) => {
    setData((current) => ({
      ...current,
      semester,
      isDemo: false,
      updatedAt: new Date().toISOString(),
    }));
    const nextWeek = getWeekNumber(semester.startDate, new Date(), semester.totalWeeks);
    setWeek(nextWeek);
    setSelectedDay((current) => Math.min(current, semester.showWeekends ? 7 : 5));
    setSettingsOpen(false);
    notify("学期设置已更新。");
  };

  const exportJson = () => downloadScheduleJson(data);

  const exportIcs = () => downloadScheduleIcs(data);

  const printTimetable = () => {
    setSettingsOpen(false);
    setDetailId(null);
    setEditorSeed(null);
    window.setTimeout(() => window.print(), 150);
  };

  const importFile = async (file: File): Promise<ImportResult> => {
    const result = await readScheduleFile(file);
    if (!result.data) return { ok: false, message: result.message };
    const next = normalizeSchedule(result.data, false);
    if (!next) return { ok: false, message: "备份格式无法识别。" };
    const confirmed = await askConfirm({
      title: "导入并替换当前课表？",
      message: `将导入「${next.semester.name}」的 ${next.courses.length} 门课程，并替换当前 ${data.courses.length} 门课程。\n建议先导出现有备份。`,
      confirmLabel: "导入并替换",
      tone: "danger",
    });
    if (!confirmed) {
      return { ok: false, message: "已取消导入，当前课表未改变。" };
    }
    setData(next);
    setWeek(getWeekNumber(next.semester.startDate, new Date(), next.semester.totalWeeks));
    setSelectedDay(Math.min(todayNumber, next.semester.showWeekends ? 7 : 5));
    setSettingsOpen(false);
    setPage("timetable");
    notify(result.message);
    return { ok: true, message: result.message };
  };

  const toggleTheme = () => {
    setPrefs((current) => ({
      ...current,
      theme: current.theme === "dark" ? "light" : "dark",
    }));
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
      if (page !== "timetable") return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setWeek((current) => Math.max(1, current - 1));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setWeek((current) => Math.min(data.semester.totalWeeks, current + 1));
      } else if (event.key.toLowerCase() === "t") {
        event.preventDefault();
        setWeek(currentWeek);
        setSelectedDay(Math.min(todayNumber, visibleDays));
      }
    };
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [sidebarOpen, page, data.semester.totalWeeks, currentWeek, todayNumber, visibleDays]);

  const isDayView = prefs.view === "day";
  const nativeApp = isNativeApp();

  return (
    <div className="app-shell">
      <Sidebar
        open={sidebarOpen}
        page={page}
        semesterName={data.semester.name}
        week={week}
        currentWeek={currentWeek}
        totalWeeks={data.semester.totalWeeks}
        courseCount={data.courses.length}
        sessionCount={currentStats.sessionCount}
        isDemo={data.isDemo}
        theme={prefs.theme}
        onNavigate={navigate}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => {
          setSettingsOpen(true);
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
          semesterName={data.semester.name}
          week={week}
          theme={prefs.theme}
          storageOk={storageOk}
          onOpenMenu={() => setSidebarOpen(true)}
          onAddCourse={() => openEditor()}
          onOpenSettings={() => setSettingsOpen(true)}
          onToggleTheme={toggleTheme}
        />

        <main className="main">
          {data.isDemo && page === "timetable" ? (
            <DemoBanner onClear={() => requestClear("blank")} />
          ) : null}

          {page === "timetable" ? (
            <>
              <WeekHero
                week={week}
                currentWeek={currentWeek}
                totalWeeks={data.semester.totalWeeks}
                dates={viewDates}
                stats={viewStats}
                termState={termState}
                onPrev={() => goToWeek(week - 1)}
                onNext={() => goToWeek(week + 1)}
                onToday={goToday}
              />

              <div className="content-grid">
                <section className="board" aria-label="课表">
                  <div className="board-toolbar">
                    <div className="view-switch" role="group" aria-label="切换视图">
                      <button
                        className={!isDayView ? "is-active" : ""}
                        type="button"
                        onClick={() => changeView("week")}
                        aria-pressed={!isDayView}
                      >
                        <LayoutGrid size={15} />
                        周视图
                      </button>
                      <button
                        className={isDayView ? "is-active" : ""}
                        type="button"
                        onClick={() => changeView("day")}
                        aria-pressed={isDayView}
                      >
                        <List size={15} />
                        日视图
                      </button>
                    </div>
                    <div className="board-toolbar-right">
                      <span className="board-meta">
                        {viewStats.sessionCount} 节 · {viewStats.courseCount} 门
                      </span>
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

                  {isDayView ? (
                    <DayView
                      semester={data.semester}
                      week={week}
                      currentWeek={currentWeek}
                      dates={viewDates}
                      courses={data.courses}
                      selectedDay={selectedDay}
                      now={now}
                      onSelectDay={setSelectedDay}
                      onSelectCourse={openCourseDetail}
                      onAddAt={(day, start) => openEditor({ prefill: { day, start } })}
                    />
                  ) : (
                    <Timetable
                      semester={data.semester}
                      week={week}
                      currentWeek={currentWeek}
                      dates={viewDates}
                      courses={data.courses}
                      now={now}
                      onSelectCourse={openCourseDetail}
                      onAddAt={(day, start) => openEditor({ prefill: { day, start } })}
                      onAddCourse={() => openEditor()}
                    />
                  )}
                </section>

                <TodayRail
                  now={now}
                  currentWeek={currentWeek}
                  totalWeeks={data.semester.totalWeeks}
                  weekDates={currentDates}
                  sessions={currentSessions}
                  periods={data.semester.periods}
                  stats={currentStats}
                  showWeekends={data.semester.showWeekends}
                  onSelectCourse={openCourseDetail}
                />
              </div>
            </>
          ) : (
            <CourseLibrary
              courses={data.courses}
              semester={data.semester}
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
          semester={data.semester}
          courses={data.courses}
          onClose={() => setEditorSeed(null)}
          onSave={saveCourse}
        />
      ) : null}

      {detailCourse ? (
        <CourseDetail
          course={detailCourse}
          semester={data.semester}
          onClose={() => setDetailId(null)}
          onEdit={() => {
            setDetailId(null);
            setEditorSeed({ course: detailCourse });
          }}
          onDelete={() => requestDeleteCourse(detailCourse)}
        />
      ) : null}

      {settingsOpen ? (
        <SettingsModal
          data={data}
          onClose={() => setSettingsOpen(false)}
          onSaveSemester={saveSemester}
          onExportJson={exportJson}
          onExportIcs={exportIcs}
          onImportFile={importFile}
          onPrint={printTimetable}
          onResetDemo={() => requestClear("demo")}
          onClearData={() => requestClear("blank")}
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

      {page === "timetable" && data.courses.length > 0 ? (
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
