import { useState } from "react";
import { CalendarPlus, Check, Trash2 } from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import type { ScheduleEvent, ToneId } from "../types";
import { COURSE_TONES, toneColor } from "../types";
import { dateKey, timeToMinutes } from "../lib/date";
import { makeEvent, uid } from "../lib/factory";
import { Modal } from "./Modal";

export interface EventSeed {
  event?: ScheduleEvent;
  date?: string;
}

interface EventEditorProps {
  seed: EventSeed;
  onClose: () => void;
  onSave: (event: ScheduleEvent) => void;
  onDelete?: (event: ScheduleEvent) => void;
}

export function EventEditor({ seed, onClose, onSave, onDelete }: EventEditorProps) {
  const editing = seed.event;
  const [title, setTitle] = useState(editing?.title ?? "");
  const [date, setDate] = useState(editing?.date ?? seed.date ?? dateKey(new Date()));
  const [allDay, setAllDay] = useState(editing?.allDay ?? false);
  const [start, setStart] = useState(editing?.start ?? "09:00");
  const [end, setEnd] = useState(editing?.end ?? "10:00");
  const [note, setNote] = useState(editing?.note ?? "");
  const [tone, setTone] = useState<ToneId>(editing?.tone ?? "teal");
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError("日程需要一个标题。");
      return;
    }
    if (!date) {
      setError("请选择日期。");
      return;
    }
    if (!allDay && timeToMinutes(end) <= timeToMinutes(start)) {
      setError("结束时间需要晚于开始时间。");
      return;
    }
    onSave(
      makeEvent({
        id: editing?.id ?? uid("event"),
        title,
        date,
        allDay,
        start,
        end,
        note,
        tone,
      }),
    );
  };

  return (
    <Modal
      className="event-editor-modal"
      eyebrow={editing ? "EDIT EVENT" : "NEW EVENT"}
      title={editing ? "编辑日程" : "添加日程"}
      onClose={onClose}
      footer={
        <>
          {editing && onDelete ? (
            <button
              className="danger-ghost-button"
              type="button"
              onClick={() => onDelete(editing)}
            >
              <Trash2 size={14} />
              删除日程
            </button>
          ) : null}
          <span className="modal-foot-spacer" />
          <button className="secondary-button" type="button" onClick={onClose}>
            取消
          </button>
          <button className="primary-button" type="submit" form="event-form">
            <Check size={16} />
            保存日程
          </button>
        </>
      }
    >
      <form id="event-form" className="event-form" onSubmit={handleSubmit}>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="event-form-intro">
          <span className="event-form-icon">
            <CalendarPlus size={20} />
          </span>
          <p>课程之外的事，也值得被放进这一周。</p>
        </div>

        <div className="form-grid">
          <label className="field field--wide">
            <span className="field-label">日程标题</span>
            <input
              className="field-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如：小组讨论、交实验报告"
              maxLength={80}
              autoFocus
            />
          </label>
          <label className="field">
            <span className="field-label">日期</span>
            <input
              className="field-input"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
        </div>

        <label className="toggle-row toggle-row--compact">
          <span>
            <strong>全天日程</strong>
            <small>全天日程只标记日期，不占用具体时段。</small>
          </span>
          <input
            type="checkbox"
            checked={allDay}
            onChange={(event) => setAllDay(event.target.checked)}
          />
          <span className="switch" aria-hidden="true" />
        </label>

        {!allDay ? (
          <div className="form-grid event-time-grid">
            <label className="field">
              <span className="field-label">开始时间</span>
              <input
                className="field-input"
                type="time"
                value={start}
                onChange={(event) => setStart(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">结束时间</span>
              <input
                className="field-input"
                type="time"
                value={end}
                onChange={(event) => setEnd(event.target.value)}
              />
            </label>
          </div>
        ) : null}

        <div className="field">
          <span className="field-label">标记颜色</span>
          <div className="tone-picker" role="group" aria-label="日程标记颜色">
            {COURSE_TONES.map((item) => (
              <button
                key={item.id}
                className={`tone-swatch ${tone === item.id ? "is-selected" : ""}`}
                type="button"
                style={{ "--tone": toneColor(item.id) } as CSSProperties}
                onClick={() => setTone(item.id)}
                aria-label={item.label}
                aria-pressed={tone === item.id}
                title={item.label}
              >
                {tone === item.id ? <Check size={13} /> : null}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span className="field-label">备注 <small>可选</small></span>
          <textarea
            className="field-input"
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="需要带什么、和谁一起、提前准备什么…"
            maxLength={500}
          />
        </label>
      </form>
    </Modal>
  );
}
