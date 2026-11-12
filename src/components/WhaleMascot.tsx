interface WhaleMascotProps {
  size?: number;
  className?: string;
  face?: boolean;
}

const PET_BASE = `${import.meta.env.BASE_URL}pets/whale-girl-refined/`;

/** The whale-girl pet avatar from the dsh-pet `whale-girl-refined` asset set. */
export function WhaleMascot({ size = 72, className = "", face = false }: WhaleMascotProps) {
  return (
    <img
      className={`whale-mascot ${className}`.trim()}
      src={`${PET_BASE}${face ? "face.png" : "avatar.png"}`}
      width={size}
      height={size}
      alt="DeepSeek 鲸鱼娘"
      draggable={false}
    />
  );
}
