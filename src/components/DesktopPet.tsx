import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const PET_IMAGE = `${import.meta.env.BASE_URL}pets/whale-girl-refined/idle.gif`;
const WAVE_IMAGE = `${import.meta.env.BASE_URL}pets/whale-girl-refined/waving.webp`;
const JUMP_IMAGE = `${import.meta.env.BASE_URL}pets/whale-girl-refined/jumping.webp`;
const POSITION_KEY = "kexu:pet-position:v1";
const PET_WIDTH = 96;
const PET_HEIGHT = 106;

interface PetPosition {
  x: number;
  y: number;
}

const MESSAGES = [
  "今天也要好好上课呀～",
  "点我一下，鲸鱼娘在听。",
  "深海模式，启动。",
  "课表排好了，记得休息。",
];

function clampPosition(position: PetPosition): PetPosition {
  const maxX = Math.max(8, window.innerWidth - PET_WIDTH - 8);
  const maxY = Math.max(8, window.innerHeight - PET_HEIGHT - 8);
  return {
    x: Math.min(Math.max(8, position.x), maxX),
    y: Math.min(Math.max(8, position.y), maxY),
  };
}

function loadPosition(): PetPosition | null {
  try {
    const raw = localStorage.getItem(POSITION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PetPosition>;
    if (typeof parsed.x !== "number" || typeof parsed.y !== "number") return null;
    return clampPosition({ x: parsed.x, y: parsed.y });
  } catch {
    return null;
  }
}

function savePosition(position: PetPosition) {
  try {
    localStorage.setItem(POSITION_KEY, JSON.stringify(position));
  } catch {
    // Position persistence is optional.
  }
}

export function DesktopPet() {
  const [position, setPosition] = useState<PetPosition | null>(() => loadPosition());
  const [bubble, setBubble] = useState(true);
  const [messageIndex, setMessageIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [animation, setAnimation] = useState<"idle" | "waving" | "jumping">("idle");
  const elementRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origin: PetPosition;
    offsetX: number;
    offsetY: number;
    moved: boolean;
  } | null>(null);
  const bubbleTimer = useRef<number | null>(null);
  const animationTimer = useRef<number | null>(null);

  const playAnimation = (next: "waving" | "jumping") => {
    setAnimation(next);
    if (animationTimer.current) window.clearTimeout(animationTimer.current);
    animationTimer.current = window.setTimeout(
      () => setAnimation("idle"),
      next === "waving" ? 1900 : 2300,
    );
  };

  const showBubble = (nextMessage = false) => {
    if (nextMessage) setMessageIndex((index) => (index + 1) % MESSAGES.length);
    setBubble(true);
    if (bubbleTimer.current) window.clearTimeout(bubbleTimer.current);
    bubbleTimer.current = window.setTimeout(() => setBubble(false), 4600);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setBubble(false), 4600);
    const onResize = () => setPosition((current) => (current ? clampPosition(current) : current));
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(timer);
      if (bubbleTimer.current) window.clearTimeout(bubbleTimer.current);
      if (animationTimer.current) window.clearTimeout(animationTimer.current);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  if (dismissed) return null;

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const element = elementRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const origin = { x: rect.left, y: rect.top };
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      moved: false,
    };
    setPosition(origin);
    setDragging(true);
    element.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;
    setPosition(
      clampPosition({
        x: event.clientX - drag.offsetX,
        y: event.clientY - drag.offsetY,
      }),
    );
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const element = elementRef.current;
    if (element?.hasPointerCapture(event.pointerId)) {
      element.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setDragging(false);
    if (drag.moved) {
      setPosition((current) => {
        if (current) savePosition(current);
        return current;
      });
      showBubble();
    } else {
      playAnimation("waving");
      showBubble(true);
    }
  };

  const style = position
    ? { left: position.x, top: position.y, right: "auto", bottom: "auto" }
    : undefined;

  return (
    <div
      ref={elementRef}
      className={`desktop-pet ${dragging ? "is-dragging" : ""} ${bubble ? "is-talking" : ""}`}
      style={style}
      role="button"
      tabIndex={0}
      aria-label="DeepSeek 鲸鱼娘桌宠，可以拖动；点一下挥手，双击跳跃"
      title="拖一拖，或者点我"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerEnter={() => showBubble()}
      onFocus={() => showBubble()}
      onDoubleClick={() => {
        playAnimation("jumping");
        showBubble(true);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          playAnimation("waving");
          showBubble(true);
        }
      }}
    >
      {bubble ? (
        <div className="desktop-pet-bubble" role="status">
          {MESSAGES[messageIndex]}
        </div>
      ) : null}
      <img
        key={animation}
        className="desktop-pet-image"
        src={animation === "waving" ? WAVE_IMAGE : animation === "jumping" ? JUMP_IMAGE : PET_IMAGE}
        alt=""
        draggable={false}
      />
      <span className="desktop-pet-shadow" aria-hidden="true" />
      <button
        className="desktop-pet-close"
        type="button"
        aria-label="收起桌宠"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          setDismissed(true);
        }}
      >
        <X size={11} />
      </button>
    </div>
  );
}
