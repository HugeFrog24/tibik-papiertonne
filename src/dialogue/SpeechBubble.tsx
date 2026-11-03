import { loadFont as loadBangers } from "@remotion/google-fonts/Bangers";
import { loadFont as loadComicNeue } from "@remotion/google-fonts/ComicNeue";
import { Interactive, spring, useCurrentFrame, useVideoConfig } from "remotion";

const { fontFamily: SHOUT_FONT } = loadBangers("normal", { weights: ["400"], subsets: ["latin"] });
const { fontFamily: CALM_FONT } = loadComicNeue("normal", { weights: ["700"], subsets: ["latin"] });

type Point = { x: number; y: number };

const TAIL_GAP = 60;
const TAIL_MIN = 40;
const TAIL_MAX = 260;

const shapes = (width: number, height: number, target: Point, shout: boolean) => {
  const c = { x: width / 2, y: height * 0.44 };
  const rx = width / 2 - 4;
  const ry = height * 0.42;
  const toTarget = { x: target.x - c.x, y: target.y - c.y };
  const length = Math.hypot(toTarget.x, toTarget.y) || 1;
  const d = { x: toTarget.x / length, y: toTarget.y / length };
  const edge = 1 / Math.sqrt((d.x / rx) ** 2 + (d.y / ry) ** 2);
  const tipDistance = Math.min(edge + TAIL_MAX, Math.max(edge + TAIL_MIN, length - TAIL_GAP));
  const tip = { x: c.x + d.x * tipDistance, y: c.y + d.y * tipDistance };
  const across = { x: -d.y, y: d.x };
  const baseWidth = shout ? 26 : 30;
  const inside = edge - 30;
  const base1 = { x: c.x + d.x * inside + across.x * baseWidth, y: c.y + d.y * inside + across.y * baseWidth };
  const base2 = { x: c.x + d.x * inside - across.x * baseWidth, y: c.y + d.y * inside - across.y * baseWidth };
  const tail = `M ${base1.x} ${base1.y} L ${tip.x} ${tip.y} L ${base2.x} ${base2.y} Z`;

  let body: string;
  if (shout) {
    const spikes = 18;
    const points: string[] = [];
    for (let i = 0; i < spikes * 2; i++) {
      const angle = (i / (spikes * 2)) * Math.PI * 2;
      const r = i % 2 === 0 ? (i % 4 === 0 ? 1 : 0.94) : 0.8;
      points.push(`${c.x + Math.cos(angle) * rx * r} ${c.y + Math.sin(angle) * ry * r}`);
    }
    body = `M ${points.join(" L ")} Z`;
  } else {
    body = `M ${c.x - rx} ${c.y} A ${rx} ${ry} 0 1 0 ${c.x + rx} ${c.y} A ${rx} ${ry} 0 1 0 ${c.x - rx} ${c.y} Z`;
  }
  return { body, tail, center: c, rx, ry };
};

const SpeechBubbleInner: React.FC<{
  readonly children: React.ReactNode;
  readonly style?: React.CSSProperties;
  readonly tone: "shout" | "calm";
  readonly tailTo: [number, number];
}> = ({ children, style, tone, tailTo }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 11, mass: 0.5 } });
  const shout = tone === "shout";
  const px = (value: React.CSSProperties["left"], fallback: number) => (typeof value === "number" ? value : fallback);
  const left = px(style?.left, 0);
  const top = px(style?.top, 0);
  const width = px(style?.width, 600);
  const height = px(style?.height, 300);
  const target = { x: tailTo[0] - left, y: tailTo[1] - top };
  const { body, tail, center, rx, ry } = shapes(width, height, target, shout);
  const ink = "#151515";
  const stroke = shout ? 7 : 6;
  return (
    <div style={{ position: "absolute", ...style }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          scale: pop,
          transformOrigin: `${center.x}px ${center.y + ry}px`,
          translate: shout ? `${Math.sin(frame * 2.3) * 3}px ${Math.cos(frame * 1.9) * 2}px` : undefined,
        }}
      >
        <svg aria-hidden width={width} height={height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <path d={tail} fill={ink} stroke={ink} strokeWidth={stroke * 2} strokeLinejoin="round" />
          <path d={body} fill={ink} stroke={ink} strokeWidth={stroke * 2} strokeLinejoin="round" />
          <path d={tail} fill="#ffffff" />
          <path d={body} fill="#ffffff" />
        </svg>
        <div
          style={{
            position: "absolute",
            left: center.x - rx * (shout ? 0.66 : 0.8),
            width: rx * (shout ? 1.32 : 1.6),
            top: center.y - ry * (shout ? 0.6 : 0.7),
            height: ry * (shout ? 1.2 : 1.4),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            fontFamily: shout ? SHOUT_FONT : CALM_FONT,
            fontWeight: shout ? 400 : 700,
            letterSpacing: shout ? 1 : 0,
            lineHeight: 1.1,
            color: shout ? "#b3121f" : ink,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export const SpeechBubble = Interactive.create({
  Component: SpeechBubbleInner,
  layout: "none",
  schema: {
    ...Interactive.childrenSchema,
    ...Interactive.textSchema,
  },
});
