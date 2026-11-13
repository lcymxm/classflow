import { useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { WeekStats } from "../types";
import { formatWeekRange } from "../lib/date";
import { minutesToHoursLabel } from "../lib/transfer";

interface WeekHeroProps {
  week: number;
  currentWeek: number;
  totalWeeks: number;
  dates: Date[];
  stats: WeekStats;
  termState: "before" | "during" | "after";
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onOpenWeekPicker: () => void;
}

export function WeekHero({
  week,
  currentWeek,
  totalWeeks,
  dates,
  stats,
  termState,
  onPrev,
  onNext,
  onToday,
  onOpenWeekPicker,
}: WeekHeroProps) {
  const [swiping, setSwiping] = useState(false);
  const swipeStart = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const atCurrentWeek = week === currentWeek;
  const isCurrent = atCurrentWeek && termState === "during";
  const statusLabel =
    termState === "before" ? "学期尚未开始" : termState === "after" ? "学期已结束" : null;

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse" || event.button !== 0) return;
    swipeStart.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const start = swipeStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      setSwiping(true);
    }
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    setSwiping(false);
    if (!start || start.pointerId !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    suppressClick.current = true;
    if (dx < 0 && week < totalWeeks) onNext();
    if (dx > 0 && week > 1) onPrev();
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 400);
  };

  const onClickCapture = (event: ReactMouseEvent<HTMLElement>) => {
    if (!suppressClick.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClick.current = false;
  };

  return (
    <section
      className={`week-hero ${swiping ? "is-swiping" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        swipeStart.current = null;
        setSwiping(false);
      }}
      onClickCapture={onClickCapture}
    >
      <div className="hero-copy">
        <p className="hero-kicker">
          <span className="kicker-line" />
          WEEKLY VIEW
        </p>
        <button
          className="hero-week-trigger"
          type="button"
          onClick={onOpenWeekPicker}
          aria-label={`当前第 ${week} 周，点击选择周次`}
          title="点击选择周次"
        >
          <h1 className="hero-date-title">{formatWeekRange(dates)}</h1>
          <ChevronDown size={18} />
        </button>
        <div className="hero-subline">
          <span className="hero-range">点击日期选择周次</span>
          {statusLabel ? <span className="hero-status">{statusLabel}</span> : null}
          {isCurrent ? (
            <span className="hero-current">
              <span className="pulse-dot" aria-hidden="true" />
              本周
            </span>
          ) : null}
        </div>
        <div className="hero-stats" aria-label="本周概览">
          <span>
            <strong>{stats.courseCount}</strong> 门课程
          </span>
          <i aria-hidden="true" />
          <span>
            <strong>{stats.sessionCount}</strong> 节课
          </span>
          <i aria-hidden="true" />
          <span>{minutesToHoursLabel(stats.minutes)}</span>
        </div>
        <p className="hero-swipe-hint">← 左右滑动切换周次 →</p>
      </div>

      <div className="hero-actions">
        <div className="week-switcher" role="group" aria-label="切换周次">
          <button type="button" onClick={onPrev} disabled={week <= 1} aria-label="上一周">
            <ChevronLeft size={18} />
          </button>
          <button
            className={`week-today ${atCurrentWeek ? "is-current" : ""}`}
            type="button"
            onClick={onToday}
            disabled={atCurrentWeek}
          >
            {atCurrentWeek ? "本周" : "回到本周"}
          </button>
          <button type="button" onClick={onNext} disabled={week >= totalWeeks} aria-label="下一周">
            <ChevronRight size={18} />
          </button>
        </div>
        <p className="hero-hint">
          <kbd>←</kbd>
          <kbd>→</kbd>
          左右滑动 / ← → 切换周次 · 点周数跳转
        </p>
      </div>
    </section>
  );
}
