interface WhaleMascotProps {
  size?: number;
  className?: string;
}

/** An original little whale-girl mascot for the non-official DeepSeek theme. */
export function WhaleMascot({ size = 72, className = "" }: WhaleMascotProps) {
  return (
    <svg
      className={`whale-mascot ${className}`}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label="DeepSeek 鲸鱼娘"
    >
      <circle cx="60" cy="60" r="54" fill="#0b2947" />
      <circle cx="24" cy="37" r="4" fill="#2b678f" opacity=".55" />
      <circle cx="96" cy="30" r="2.6" fill="#7adfff" opacity=".6" />
      <circle cx="100" cy="48" r="1.8" fill="#7adfff" opacity=".5" />
      <path
        d="M87 91c11-8 18-20 13-31 10 6 16 18 10 29-5 9-15 13-26 12Z"
        fill="#3c78bc"
      />
      <path
        d="M88 89c7-6 11-13 10-20 6 5 9 13 5 20-3 5-9 8-17 8Z"
        fill="#6dbfff"
        opacity=".7"
      />
      <path
        d="M39 78c0-9 9-16 21-16s21 7 21 16v22c0 5-8 9-21 9s-21-4-21-9Z"
        fill="#1f4f7e"
      />
      <path d="M50 17c-18 2-29 16-29 32 0 8 4 15 9 20h60c6-5 10-12 10-20 0-16-12-30-30-32Z" fill="#4f7fe0" />
      <path d="M38 34c4-10 12-15 22-15s18 5 22 15c-8 4-13 2-22 2s-14 2-22-2Z" fill="#6f9af1" />
      <path d="M31 43c-8-4-13 5-8 12 3 4 8 4 11 1-3-4-4-8-3-13Z" fill="#4f7fe0" />
      <path d="M89 43c8-4 13 5 8 12-3 4-8 4-11 1 3-4 4-8 3-13Z" fill="#4f7fe0" />
      <circle cx="60" cy="52" r="24" fill="#ffe5d7" />
      <path d="M37 42c5-14 16-18 24-18 11 0 20 7 23 18-8 4-14 2-23 2-9 0-16 2-24-2Z" fill="#4f7fe0" />
      <path d="M45 36c3-3 7-4 10-4" stroke="#b9d4ff" strokeWidth="2" strokeLinecap="round" fill="none" />
      <ellipse cx="50" cy="56" rx="3.4" ry="4.6" fill="#18263d" />
      <ellipse cx="70" cy="56" rx="3.4" ry="4.6" fill="#18263d" />
      <circle cx="51" cy="54.4" r="1.1" fill="#ffffff" />
      <circle cx="71" cy="54.4" r="1.1" fill="#ffffff" />
      <path d="M55 65c3 3 7 3 10 0" stroke="#b95c62" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <circle cx="43" cy="64" r="3.2" fill="#ffb5b3" opacity=".55" />
      <circle cx="77" cy="64" r="3.2" fill="#ffb5b3" opacity=".55" />
      <path d="M51 78l9 7 9-7 5 4-14 14-14-14Z" fill="#e9f7ff" />
      <path d="M57 87l3 3 3-3" stroke="#4f7fe0" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M58 76c-4 3-4 7 2 9 6-2 6-6 2-9Z" fill="#7adfff" opacity=".9" />
      <path d="M91 49c5-1 7 2 7 5 0 3-3 5-6 4" stroke="#7adfff" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="98" cy="45" r="2.2" fill="#7adfff" />
    </svg>
  );
}
