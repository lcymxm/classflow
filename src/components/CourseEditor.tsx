import { useState } from "react";
import { Check, Layers, Plus, Trash2 } from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import type { Course, CourseSlot, Semester, ToneId, WeekPattern } from "../types";
import { COURSE_TONES, toneColor } from "../types";
import { Modal } from "./Modal";
import { nextTone, makeSlot, uid } from "../lib/factory";
import { getWeekdayNumber, WEEKDAYS } from "../lib/date";
import {
  formatSlotShort,
  formatWeeks,
  mergeCourseSlots,
  weeksForSlot,
} from "../lib/schedule";

export interface EditorSeed {
  course?: Course;
  prefill?: { day: number; start: number };
}

interface CourseEditorProps {
  seed: EditorSeed;
  semester: Semester;
  courses: Course[];
  onClose: () => void;
  onSave: (course: Course) => void;
}

interface DraftSlot extends CourseSlot {
  key: string;
  weeks: number[];
}

interface Draft {
  id: string;
  name: string;
  teacher: string;
  location: string;
  tone: ToneId;
  note: string;
  slots: DraftSlot[];
  createdAt: string;
}

function normalizeCourseName(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, "");
}

function allWeeks(total: number): number[] {
  return Array.from({ length: total }, (_, index) => index + 1);
}

function toDraftSlot(slot: CourseSlot): DraftSlot {
  const weeks = weeksForSlot(slot);
  return {
    ...slot,
    weeks,
    weekStart: weeks[0] ?? slot.weekStart,
    weekEnd: weeks[weeks.length - 1] ?? slot.weekEnd,
    pattern: "all",
    key: slot.id,
  };
}

function buildInitial(seed: EditorSeed, semester: Semester, courses: Course[]): Draft {
  if (seed.course) {
    const course = seed.course;
    return {
      id: course.id,
      name: course.name,
      teacher: course.teacher,
      location: course.location,
      tone: course.tone,
      note: course.note,
      slots: course.slots.map(toDraftSlot),
      createdAt: course.createdAt,
    };
  }
  const day = seed.prefill?.day ?? getWeekdayNumber(new Date());
  const start = seed.prefill?.start ?? 1;
  const weeks = allWeeks(semester.totalWeeks);
  return {
    id: uid("course"),
    name: "",
    teacher: "",
    location: "",
    tone: nextTone(courses),
    note: "",
    slots: [
      toDraftSlot(
        makeSlot(
          {
            day,
            start,
            end: Math.min(start + 1, semester.periods.length),
            weekStart: 1,
            weekEnd: semester.totalWeeks,
            pattern: "all",
            weeks,
          },
          semester.totalWeeks,
        ),
      ),
    ],
    createdAt: new Date().toISOString(),
  };
}

export function CourseEditor({ seed, semester, courses, onClose, onSave }: CourseEditorProps) {
  const [draft, setDraft] = useState<Draft>(() => buildInitial(seed, semester, courses));
  const [error, setError] = useState("");
  const [mergeIntoExisting, setMergeIntoExisting] = useState(true);
  const editing = Boolean(seed.course);
  const normalizedName = normalizeCourseName(draft.name);
  const mergeTarget = !editing && normalizedName
    ? courses.find((course) => normalizeCourseName(course.name) === normalizedName)
    : undefined;

  const updateSlot = (key: string, patch: Partial<DraftSlot>) => {
    setDraft((current) => ({
      ...current,
      slots: current.slots.map((slot) => {
        if (slot.key !== key) return slot;
        const next = { ...slot, ...patch };
        if (next.start > next.end) next.end = next.start;
        if (next.end < next.start) next.start = next.end;
        if (next.weekStart > next.weekEnd) next.weekEnd = next.weekStart;
        if (next.weekEnd < next.weekStart) next.weekStart = next.weekEnd;
        return next;
      }),
    }));
  };

  const setSlotWeeks = (key: string, weeks: number[]) => {
    const normalized = [...new Set(weeks)]
      .filter((week) => week >= 1 && week <= semester.totalWeeks)
      .sort((a, b) => a - b);
    updateSlot(key, {
      weeks: normalized,
      weekStart: normalized[0] ?? 1,
      weekEnd: normalized[normalized.length - 1] ?? semester.totalWeeks,
      pattern: "all",
    });
  };

  const addSlot = () => {
    const weeks = allWeeks(semester.totalWeeks);
    setDraft((current) => ({
      ...current,
      slots: [
        ...current.slots,
        toDraftSlot(
          makeSlot(
            {
              day: getWeekdayNumber(new Date()),
              start: 1,
              end: 2,
              weekStart: 1,
              weekEnd: semester.totalWeeks,
              pattern: "all",
              weeks,
            },
            semester.totalWeeks,
          ),
        ),
      ],
    }));
  };

  const removeSlot = (key: string) => {
    setDraft((current) => ({
      ...current,
      slots: current.slots.filter((slot) => slot.key !== key),
    }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) {
      setError("先给这门课起个名字吧。");
      return;
    }
    if (draft.slots.length === 0) {
      setError("至少保留一个上课时间段。");
      return;
    }
    const invalid = draft.slots.find(
      (slot) =>
        slot.start < 1 ||
        slot.end > semester.periods.length ||
        slot.weeks.length === 0 ||
        slot.weeks.some((week) => week < 1 || week > semester.totalWeeks),
    );
    if (invalid) {
      setError("请检查节次，并至少选择一周上课。");
      return;
    }

    const now = new Date().toISOString();
    const cleanSlots = draft.slots.map(({ key: _key, ...slot }) => ({
      ...slot,
      weeks: [...slot.weeks].sort((a, b) => a - b),
      weekStart: slot.weeks[0],
      weekEnd: slot.weeks[slot.weeks.length - 1],
      pattern: "all" as WeekPattern,
    }));

    if (mergeTarget && mergeIntoExisting) {
      onSave({
        ...mergeTarget,
        teacher: draft.teacher.trim() || mergeTarget.teacher,
        location: draft.location.trim() || mergeTarget.location,
        note: mergeTarget.note || draft.note.trim(),
        slots: mergeCourseSlots(mergeTarget.slots, cleanSlots),
        updatedAt: now,
      });
      return;
    }

    const course: Course = {
      id: draft.id,
      name,
      teacher: draft.teacher.trim(),
      location: draft.location.trim(),
      tone: draft.tone,
      note: draft.note.trim(),
      slots: cleanSlots,
      createdAt: draft.createdAt,
      updatedAt: now,
    };
    onSave(course);
  };

  const slotSummary = (slot: DraftSlot): string =>
    slot.weeks.length > 0 ? formatWeeks(slot) : "未选周次";

  return (
    <Modal
      className="course-editor-modal"
      eyebrow={editing ? "EDIT COURSE" : "NEW COURSE"}
      title={editing ? "编辑课程" : "添加一门课"}
      onClose={onClose}
      footer={
        <>
          <button className="secondary-button" type="button" onClick={onClose}>
            取消
          </button>
          <button className="primary-button" type="submit" form="course-form">
            <Check size={16} />
            {editing
              ? "保存修改"
              : mergeTarget && mergeIntoExisting
                ? "合并到已有课程"
                : "加入课表"}
          </button>
        </>
      }
    >
      <form id="course-form" className="course-form" onSubmit={handleSubmit}>
        {error ? <p className="form-error">{error}</p> : null}

        <div className="form-section">
          <label className="field field--wide">
            <span className="field-label">课程名称</span>
            <input
              className="field-input field-input--title"
              value={draft.name}
              onChange={(event) => {
                setError("");
                setDraft((current) => ({ ...current, name: event.target.value }));
              }}
              placeholder="例如：高等数学 A（上）"
              maxLength={80}
              autoFocus
              list={!editing && courses.length > 0 ? "course-name-options" : undefined}
            />
            {!editing && courses.length > 0 ? (
              <datalist id="course-name-options">
                {courses.map((course) => (
                  <option value={course.name} key={course.id} />
                ))}
              </datalist>
            ) : null}
          </label>

          {mergeTarget ? (
            <div className="merge-hint">
              <span className="merge-hint-icon">
                <Layers size={17} />
              </span>
              <div className="merge-hint-copy">
                <strong>识别到已有课程「{mergeTarget.name}」</strong>
                <span>
                  {[mergeTarget.teacher, mergeTarget.location].filter(Boolean).join(" · ") ||
                    "未填写老师与地点"}
                  {" · "}
                  {mergeTarget.slots.length} 个时间段
                </span>
              </div>
              <label className="merge-toggle">
                <input
                  type="checkbox"
                  checked={mergeIntoExisting}
                  onChange={(event) => setMergeIntoExisting(event.target.checked)}
                />
                <span>合并到已有课程</span>
              </label>
              <p>
                {mergeIntoExisting
                  ? "保存时会把下面的时间段合并进去，不会重复建立同一门课。"
                  : "保存时会新建一门同名课程。"}
              </p>
            </div>
          ) : null}

          <div className="form-grid">
            <label className="field">
              <span className="field-label">授课老师</span>
              <input
                className="field-input"
                value={draft.teacher}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, teacher: event.target.value }))
                }
                placeholder="选填"
                maxLength={40}
              />
            </label>
            <label className="field">
              <span className="field-label">上课地点</span>
              <input
                className="field-input"
                value={draft.location}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, location: event.target.value }))
                }
                placeholder="例如：教一 401"
                maxLength={60}
              />
            </label>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-title">
            <div>
              <h3>上课时间</h3>
              <p>同一门课有多个时间段时，可以继续添加；周次可逐周勾选。</p>
            </div>
            <button className="small-button" type="button" onClick={addSlot}>
              <Plus size={14} />
              添加时间段
            </button>
          </div>

          <div className="slot-list">
            {draft.slots.map((slot, index) => (
              <div className="slot-editor" key={slot.key}>
                <div className="slot-editor-head">
                  <span className="slot-index">时段 {String(index + 1).padStart(2, "0")}</span>
                  <span className="slot-preview">
                    {formatSlotShort(slot)} · {slotSummary(slot)}
                  </span>
                  <button
                    className="slot-remove"
                    type="button"
                    onClick={() => removeSlot(slot.key)}
                    disabled={draft.slots.length <= 1}
                    aria-label={`删除时段 ${index + 1}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="slot-editor-grid">
                  <label className="field">
                    <span className="field-label">星期</span>
                    <select
                      className="field-input"
                      value={slot.day}
                      onChange={(event) => updateSlot(slot.key, { day: Number(event.target.value) })}
                    >
                      {WEEKDAYS.map((day) => (
                        <option value={day.index} key={day.index}>
                          {day.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">开始节次</span>
                    <select
                      className="field-input"
                      value={slot.start}
                      onChange={(event) => updateSlot(slot.key, { start: Number(event.target.value) })}
                    >
                      {semester.periods.map((period) => (
                        <option value={period.index} key={period.index}>
                          第 {period.index} 节 · {period.start}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">结束节次</span>
                    <select
                      className="field-input"
                      value={slot.end}
                      onChange={(event) => updateSlot(slot.key, { end: Number(event.target.value) })}
                    >
                      {semester.periods.map((period) => (
                        <option value={period.index} key={period.index}>
                          第 {period.index} 节 · {period.end}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="week-picker">
                  <div className="week-picker-head">
                    <span className="field-label">上课周次</span>
                    <span className="week-picker-summary">
                      {slot.weeks.length > 0
                        ? `${formatWeeks(slot)} · 共 ${slot.weeks.length} 周`
                        : "还没有选择周次"}
                    </span>
                  </div>
                  <div className="week-picker-actions">
                    <button
                      type="button"
                      onClick={() => setSlotWeeks(slot.key, allWeeks(semester.totalWeeks))}
                    >
                      全选
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSlotWeeks(
                          slot.key,
                          allWeeks(semester.totalWeeks).filter((week) => week % 2 === 1),
                        )
                      }
                    >
                      单周
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSlotWeeks(
                          slot.key,
                          allWeeks(semester.totalWeeks).filter((week) => week % 2 === 0),
                        )
                      }
                    >
                      双周
                    </button>
                    <button type="button" onClick={() => setSlotWeeks(slot.key, [])}>
                      清空
                    </button>
                  </div>
                  <div className="week-picker-grid" role="group" aria-label={`时段 ${index + 1} 上课周次`}>
                    {allWeeks(semester.totalWeeks).map((week) => {
                      const selected = slot.weeks.includes(week);
                      return (
                        <button
                          key={week}
                          className={`week-chip ${selected ? "is-selected" : ""}`}
                          type="button"
                          aria-pressed={selected}
                          onClick={() =>
                            setSlotWeeks(
                              slot.key,
                              selected
                                ? slot.weeks.filter((item) => item !== week)
                                : [...slot.weeks, week],
                            )
                          }
                        >
                          {week}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-section form-section--split">
          <div className="field">
            <span className="field-label">课程颜色</span>
            <div className="tone-picker" role="group" aria-label="课程颜色">
              {COURSE_TONES.map((tone) => (
                <button
                  key={tone.id}
                  className={`tone-swatch ${draft.tone === tone.id ? "is-selected" : ""}`}
                  type="button"
                  style={{ "--tone": toneColor(tone.id) } as CSSProperties}
                  onClick={() => setDraft((current) => ({ ...current, tone: tone.id }))}
                  aria-label={tone.label}
                  aria-pressed={draft.tone === tone.id}
                  title={tone.label}
                >
                  {draft.tone === tone.id ? <Check size={13} /> : null}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span className="field-label">备注</span>
            <textarea
              className="field-input field-textarea"
              value={draft.note}
              onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
              placeholder="作业要求、考试范围、带什么书……"
              maxLength={500}
              rows={3}
            />
          </label>
        </div>
      </form>
    </Modal>
  );
}
