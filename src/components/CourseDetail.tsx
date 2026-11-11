import { Clock, MapPin, Pencil, Trash2, User } from "lucide-react";
import type { CSSProperties } from "react";
import type { Course, Semester } from "../types";
import { toneColor } from "../types";
import { Modal } from "./Modal";
import {
  courseWeeklyMinutes,
  formatSlotShort,
  formatWeeks,
} from "../lib/schedule";
import { minutesToHoursLabel } from "../lib/transfer";

interface CourseDetailProps {
  course: Course;
  semester: Semester;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function CourseDetail({
  course,
  semester,
  onClose,
  onEdit,
  onDelete,
}: CourseDetailProps) {
  const minutes = courseWeeklyMinutes(course, semester.periods);

  return (
    <Modal
      className="course-detail-modal"
      eyebrow="COURSE DETAILS"
      title="课程详情"
      onClose={onClose}
      footer={
        <>
          <button className="danger-ghost-button" type="button" onClick={onDelete}>
            <Trash2 size={15} />
            删除课程
          </button>
          <span className="modal-foot-spacer" />
          <button className="secondary-button" type="button" onClick={onClose}>
            关闭
          </button>
          <button className="primary-button" type="button" onClick={onEdit}>
            <Pencil size={15} />
            编辑
          </button>
        </>
      }
    >
      <div className="detail-hero" style={{ "--tone": toneColor(course.tone) } as CSSProperties}>
        <span className="detail-tone-line" aria-hidden="true" />
        <p className="eyebrow">THIS COURSE</p>
        <h3>{course.name}</h3>
        <div className="detail-hero-meta">
          <span>{course.slots.length} 个时间段</span>
          <span>{minutesToHoursLabel(minutes)} / 周</span>
        </div>
      </div>

      <div className="detail-info-grid">
        <div>
          <span className="detail-label">
            <User size={13} /> 授课老师
          </span>
          <p>{course.teacher || "未填写"}</p>
        </div>
        <div>
          <span className="detail-label">
            <MapPin size={13} /> 上课地点
          </span>
          <p>{course.location || "未填写"}</p>
        </div>
      </div>

      <section className="detail-section">
        <h4>上课时间</h4>
        <ul className="detail-slots">
          {course.slots.map((slot) => (
            <li key={slot.id}>
              <span className="detail-slot-day">{formatSlotShort(slot).split(" ")[0]}</span>
              <span className="detail-slot-main">
                <strong>
                  {formatSlotShort(slot).split(" ").slice(1).join(" ")}
                </strong>
                <small>
                  {semester.periods[slot.start - 1]?.start} –{" "}
                  {semester.periods[slot.end - 1]?.end}
                </small>
              </span>
              <span className="detail-slot-week">{formatWeeks(slot)}</span>
            </li>
          ))}
        </ul>
      </section>

      {course.note ? (
        <section className="detail-section">
          <h4>备注</h4>
          <p className="detail-note">{course.note}</p>
        </section>
      ) : null}

      <p className="detail-foot-note">
        <Clock size={12} />
        每周上课时间会按当前作息表自动换算。
      </p>
    </Modal>
  );
}
