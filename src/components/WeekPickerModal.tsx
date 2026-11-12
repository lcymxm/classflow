import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Modal } from "./Modal";
import {
  formatWeekRange,
  getWeekDates,
} from "../lib/date";

interface WeekPickerModalProps {
  week: number;
  currentWeek: number;
  totalWeeks: number;
  startDate: string;
  onSelect: (week: number) => void;
  onClose: () => void;
}

export function WeekPickerModal({
  week,
  currentWeek,
  totalWeeks,
  startDate,
  onSelect,
  onClose,
}: WeekPickerModalProps) {
  const weeks = Array.from({ length: totalWeeks }, (_, index) => index + 1);

  return (
    <Modal
      className="week-picker-modal"
      eyebrow="JUMP TO WEEK"
      title="跳到第几周"
      onClose={onClose}
      footer={
        <>
          <p className="modal-foot-note">
            当前在第 {currentWeek} 周，共 {totalWeeks} 周
          </p>
          <span className="modal-foot-spacer" />
          <button className="secondary-button" type="button" onClick={onClose}>
            取消
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={() => onSelect(currentWeek)}
            disabled={week === currentWeek}
          >
            <CalendarDays size={15} />
            回到本周
          </button>
        </>
      }
    >
      <div className="week-picker-modal-body">
        <div className="week-picker-nav">
          <button
            className="secondary-button"
            type="button"
            disabled={week <= 1}
            onClick={() => onSelect(week - 1)}
          >
            <ChevronLeft size={14} />
            上一周
          </button>
          <div className="week-picker-current-label">
            <span className="micro-label">CURRENT</span>
            <strong>第 {currentWeek} 周</strong>
            <span>{formatWeekRange(getWeekDates(startDate, currentWeek))}</span>
          </div>
          <button
            className="secondary-button"
            type="button"
            disabled={week >= totalWeeks}
            onClick={() => onSelect(week + 1)}
          >
            下一周
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="week-picker-grid week-picker-grid--modal">
          {weeks.map((item) => (
            <button
              key={item}
              className={`week-pick ${item === week ? "is-selected" : ""} ${
                item === currentWeek ? "is-current" : ""
              }`}
              type="button"
              onClick={() => onSelect(item)}
              aria-current={item === currentWeek ? "true" : undefined}
              aria-pressed={item === week}
            >
              <strong>{String(item).padStart(2, "0")}</strong>
              <span>{formatWeekRange(getWeekDates(startDate, item))}</span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
