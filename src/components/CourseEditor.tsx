import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import type { Course, CourseSlot, Semester, ToneId, WeekPattern } from "../types";
import { COURSE_TONES, toneColor } from "../types";
import { Modal } from "./Modal";
import {
  nextTone,
  makeSlot,
  uid,
} from "../lib/factory";
import { getWeekdayNumber, WEEKDAYS } from "../lib/date";
import { formatSlotShort } from "../lib/schedule";

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

function toDraftSlot(slot: CourseSlot): DraftSlot {
  return { ...slot, key: slot.id };
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
  const editing = Boolean(seed.course);

  const updateSlot = (key: string, patch: Partial<CourseSlot>) => {
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

  const addSlot = () => {
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
        slot.weekStart < 1 ||
        slot.weekEnd > semester.totalWeeks,
    );
    if (invalid) {
      setError("有上课时间超出了当前学期或节次范围，请检查一下。");
      return;
    }
    const now = new Date().toISOString();
    const course: Course = {
      id: draft.id,
      name,
      teacher: draft.teacher.trim(),
      location: draft.location.trim(),
      tone: draft.tone,
      note: draft.note.trim(),
      slots: draft.slots.map(({ key: _key, ...slot }) => slot),
      createdAt: draft.createdAt,
      updatedAt: now,
    };
    onSave(course);
  };

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
            {editing ? "保存修改" : "加入课表"}
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
            />
          </label>

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
              <p>同一门课有多个时间段时，可以继续添加。</p>
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
                  <span className="slot-preview">{formatSlotShort(slot)}</span>
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
                  <label className="field">
                    <span className="field-label">频率</span>
                    <select
                      className="field-input"
                      value={slot.pattern}
                      onChange={(event) =>
                        updateSlot(slot.key, { pattern: event.target.value as WeekPattern })
                      }
                    >
                      <option value="all">每周</option>
                      <option value="odd">单周</option>
                      <option value="even">双周</option>
                    </select>
                  </label>
                  <label className="field field--week">
                    <span className="field-label">周次范围</span>
                    <span className="week-range">
                      <input
                        className="field-input number-input"
                        type="number"
                        min={1}
                        max={semester.totalWeeks}
                        value={slot.weekStart}
                        onChange={(event) =>
                          updateSlot(slot.key, {
                            weekStart: Math.min(
                              semester.totalWeeks,
                              Math.max(1, Number(event.target.value) || 1),
                            ),
                          })
                        }
                        aria-label="开始周"
                      />
                      <span>—</span>
                      <input
                        className="field-input number-input"
                        type="number"
                        min={1}
                        max={semester.totalWeeks}
                        value={slot.weekEnd}
                        onChange={(event) =>
                          updateSlot(slot.key, {
                            weekEnd: Math.min(
                              semester.totalWeeks,
                              Math.max(1, Number(event.target.value) || 1),
                            ),
                          })
                        }
                        aria-label="结束周"
                      />
                      <span className="week-suffix">周</span>
                    </span>
                  </label>
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
