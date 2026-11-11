import { useMemo, useState } from "react";
import { MapPin, Pencil, Plus, Search, User } from "lucide-react";
import type { CSSProperties } from "react";
import type { Course, Period, Semester } from "../types";
import { toneColor } from "../types";
import {
  courseWeeklyMinutes,
  formatSlotShort,
  formatWeeks,
  sortCoursesByDay,
} from "../lib/schedule";
import { minutesToHoursLabel } from "../lib/transfer";

interface CourseLibraryProps {
  courses: Course[];
  semester: Semester;
  onAddCourse: () => void;
  onSelectCourse: (course: Course) => void;
  onEditCourse: (course: Course) => void;
}

function slotTime(slot: Course["slots"][number], periods: Period[]): string {
  return `${periods[slot.start - 1]?.start ?? ""}–${periods[slot.end - 1]?.end ?? ""}`;
}

export function CourseLibrary({
  courses,
  semester,
  onAddCourse,
  onSelectCourse,
  onEditCourse,
}: CourseLibraryProps) {
  const [query, setQuery] = useState("");
  const ordered = useMemo(() => sortCoursesByDay(courses), [courses]);
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return ordered;
    return ordered.filter((course) =>
      [course.name, course.teacher, course.location, course.note]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [ordered, query]);

  const totalSlots = courses.reduce((total, course) => total + course.slots.length, 0);
  const totalMinutes = courses.reduce(
    (total, course) => total + courseWeeklyMinutes(course, semester.periods),
    0,
  );

  return (
    <section className="library-page">
      <header className="library-head">
        <div>
          <p className="eyebrow">COURSE LIBRARY</p>
          <h1>课程库</h1>
          <p>把每一门课收好，课表自然会清楚起来。</p>
        </div>
        <button className="primary-button" type="button" onClick={onAddCourse}>
          <Plus size={16} />
          新建课程
        </button>
      </header>

      <div className="library-summary">
        <div>
          <strong>{courses.length}</strong>
          <span>门课程</span>
        </div>
        <div>
          <strong>{totalSlots}</strong>
          <span>个时间段</span>
        </div>
        <div>
          <strong>{minutesToHoursLabel(totalMinutes)}</strong>
          <span>每周学时</span>
        </div>
        <p>所有课程与课表都存在这台设备的浏览器里。</p>
      </div>

      <div className="library-toolbar">
        <label className="search-field">
          <Search size={16} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索课程、老师或教室"
            aria-label="搜索课程"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} aria-label="清空搜索">
              清空
            </button>
          ) : null}
        </label>
        <span className="library-result">
          {query ? `${filtered.length} 个结果` : "按上课时间排序"}
        </span>
      </div>

      {courses.length === 0 ? (
        <div className="library-empty">
          <span className="library-empty-mark">课</span>
          <h2>还没有课程</h2>
          <p>从第一门课开始，慢慢把这一学期填满。</p>
          <button className="primary-button" type="button" onClick={onAddCourse}>
            <Plus size={16} />
            添加第一门课
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="library-empty library-empty--search">
          <Search size={22} />
          <h2>没有找到相关课程</h2>
          <p>换一个关键词试试，或者清空搜索。</p>
          <button className="secondary-button" type="button" onClick={() => setQuery("")}>
            清空搜索
          </button>
        </div>
      ) : (
        <div className="course-grid">
          {filtered.map((course) => (
            <article
              className="course-card"
              key={course.id}
              style={{ "--tone": toneColor(course.tone) } as CSSProperties}
              onClick={() => onSelectCourse(course)}
            >
              <div className="course-card-accent" aria-hidden="true" />
              <div className="course-card-head">
                <span className="course-card-count">{course.slots.length} 个时间段</span>
                <button
                  className="course-card-edit"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEditCourse(course);
                  }}
                  aria-label={`编辑${course.name}`}
                >
                  <Pencil size={14} />
                </button>
              </div>
              <button
                className="course-card-title"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectCourse(course);
                }}
              >
                {course.name}
              </button>
              <div className="course-card-meta">
                {course.teacher ? (
                  <span>
                    <User size={13} />
                    {course.teacher}
                  </span>
                ) : null}
                {course.location ? (
                  <span>
                    <MapPin size={13} />
                    {course.location}
                  </span>
                ) : null}
              </div>
              <ul className="course-card-slots">
                {course.slots.slice(0, 3).map((slot) => (
                  <li key={slot.id}>
                    <span>{formatSlotShort(slot)}</span>
                    <em>{slotTime(slot, semester.periods)}</em>
                    <small>{formatWeeks(slot)}</small>
                  </li>
                ))}
              </ul>
              {course.slots.length > 3 ? (
                <p className="course-card-more">还有 {course.slots.length - 3} 个时间段</p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
