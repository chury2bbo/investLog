interface LogoProps {
  size?: number;
  variant?: "chart" | "ant";
}

export function Logo({ size = 36, variant = "ant" }: LogoProps) {
  if (variant === "ant") {
    return <AntLogo size={size} />;
  }

  const iconSize = Math.round(size * 0.47);
  return (
    <div
      className="flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.22),
        background: "linear-gradient(135deg, var(--color-primary-dark), var(--color-primary))",
        boxShadow: "0 4px 14px color-mix(in srgb, var(--color-primary) 25%, transparent)",
      }}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M23 6l-9.5 9.5-5-5L1 18" />
        <path d="M17 6h6v6" />
      </svg>
    </div>
  );
}

function AntLogo({ size = 64 }: { size: number }) {
  const id = `ant_${size}`;
  const dx = 4.5, dy = 2;

  const hx = 57 + dx, hy = 36 + dy;
  const tx = 48 + dx, ty = 47 + dy;
  const bx = 37 + dx, by = 59 + dy;

  const legs = [
    [51 + dx, 51 + dy, 8, 12],
    [45 + dx, 52 + dy, -2, 12],
    [41 + dx, 64 + dy, 7, 12],
    [33 + dx, 63 + dy, -7, 12],
  ];

  const ang = Math.atan2(20 - 38, 92 - 75);
  const wingLen = 7;
  const wx1 = +(92 + wingLen * Math.cos(ang + Math.PI + Math.PI / 5)).toFixed(2);
  const wy1 = +(20 + wingLen * Math.sin(ang + Math.PI + Math.PI / 5)).toFixed(2);
  const wx2 = +(92 + wingLen * Math.cos(ang + Math.PI - Math.PI / 5)).toFixed(2);
  const wy2 = +(20 + wingLen * Math.sin(ang + Math.PI - Math.PI / 5)).toFixed(2);

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <rect width="100" height="100" rx="22" fill={`url(#${id})`} />

      {/* 차트 영역 그라데이션 */}
      <polygon
        points="12,90 22,80 34,85 48,70 60,55 75,38 92,20 92,95 12,95"
        fill={`url(#${id}_glow)`}
      />

      {/* 차트 선 */}
      <polyline
        points="12,90 22,80 34,85 48,70 60,55 75,38 92,20"
        stroke="white" strokeWidth="3.5"
        strokeLinecap="round" strokeLinejoin="round"
        opacity="0.85" fill="none"
      />

      {/* 화살촉 */}
      <line x1="92" y1="20" x2={wx1} y2={wy1}
        stroke="white" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
      <line x1="92" y1="20" x2={wx2} y2={wy2}
        stroke="white" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />

      {/* 개미: 0.75배 축소 + 정중앙 배치 */}
      <g transform="translate(50,50) scale(0.85) translate(-50,-50)">
        <path d={`M${60+dx} ${31+dy} Q${63+dx} ${26+dy} ${65+dx} ${23+dy}`}
          stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <circle cx={65+dx} cy={23+dy} r="1.6" fill="white" />
        <path d={`M${57+dx} ${29+dy} Q${59+dx} ${24+dy} ${57+dx} ${21+dy}`}
          stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <circle cx={57+dx} cy={21+dy} r="1.6" fill="white" />

        <circle cx={hx} cy={hy} r="7" fill="white" />
        <circle cx={hx+4} cy={hy-3} r="1.8" fill="#16754A" />
        <circle cx={hx+4.7} cy={hy-3.7} r="0.7" fill="white" />
        <path d={`M${hx-1} ${hy+2} Q${hx+1.5} ${hy+5} ${hx+4} ${hy+2}`}
          stroke="#16754A" strokeWidth="1.2" strokeLinecap="round" fill="none" />

        <circle cx={tx} cy={ty} r="6" fill="white" />
        <circle cx={bx} cy={by} r="9" fill="white" />

        {legs.map(([x1, y1, ddx, ddy], i) => (
          <g key={i}>
            <line
              x1={x1} y1={y1}
              x2={x1 + ddx} y2={y1 + ddy}
              stroke="white" strokeWidth="2.2" strokeLinecap="round"
            />
            <circle cx={x1 + ddx} cy={y1 + ddy} r="1.7" fill="white" />
          </g>
        ))}
      </g>

      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#16754A" />
          <stop offset="100%" stopColor="#2DB87A" />
        </linearGradient>
        <linearGradient id={`${id}_glow`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.15" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
