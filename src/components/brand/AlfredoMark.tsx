import { useId } from "react";

type AlfredoMarkProps = {
  size?: number;
  variant?: "gradient" | "light" | "dark";
  className?: string;
  title?: string;
};

/**
 * Monograma Alfredo — arco "A" abstrato com ponto central.
 * Path canônico do brandbook (Rota 1). Não redesenhar.
 */
export function AlfredoMark({
  size = 40,
  variant = "gradient",
  className,
  title = "Alfredo",
}: AlfredoMarkProps) {
  const id = useId().replace(/:/g, "");
  const gradientId = `alfredo-gradient-${id}`;

  const stroke =
    variant === "light"
      ? "#F7F8FA"
      : variant === "dark"
        ? "#0D1B2A"
        : `url(#${gradientId})`;

  const dot =
    variant === "light" ? "#1BA6B6" : "#0F6570";

  return (
    <svg
      viewBox="0 0 220 220"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={title}
    >
      {variant === "gradient" && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0D1B2A" />
            <stop offset="55%" stopColor="#0F3D46" />
            <stop offset="100%" stopColor="#1BA6B6" />
          </linearGradient>
        </defs>
      )}

      <path
        d="M42 188 L93 61 Q106 28 119 61 L170 188"
        fill="none"
        stroke={stroke}
        strokeWidth="40"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {variant === "gradient" && (
        <path
          d="M66 121 C85 99 102 99 119 124"
          fill="none"
          stroke="#1BA6B6"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.9"
        />
      )}

      <circle cx="106" cy="164" r="13" fill={dot} />
    </svg>
  );
}

export default AlfredoMark;
