import { Interactive, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TEXT, ellipseOf, textArea, typeOf } from "./bubbleText";
import { CALM_FONT, SHOUT_FONT } from "./fonts";

type Point = { x: number; y: number };

const TAIL_GAP = 60;
const TAIL_MIN = 40;
const TAIL_MAX = 260;
const PHONE_FILL = "#efefef";
const SPIKE_DIP = 0.8;

export const depthIn = (p: Point, polygon: readonly Point[]) => {
  let inside = false;
  let nearest = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
    const ab = { x: b.x - a.x, y: b.y - a.y };
    const k = Math.max(
      0,
      Math.min(
        1,
        ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / (ab.x ** 2 + ab.y ** 2),
      ),
    );
    nearest = Math.min(
      nearest,
      Math.hypot(p.x - a.x - ab.x * k, p.y - a.y - ab.y * k),
    );
  }
  return inside ? nearest : -nearest;
};

export const bubbleShapes = (
  width: number,
  height: number,
  target: Point,
  tone: Tone,
) => {
  const shout = tone === "shout";
  const stroke = shout ? 7 : 6;
  const { center: c, rx, ry } = ellipseOf(width, height);
  const toTarget = { x: target.x - c.x, y: target.y - c.y };
  const length = Math.hypot(toTarget.x, toTarget.y);
  const d =
    length < 1
      ? { x: 0, y: 1 }
      : { x: toTarget.x / length, y: toTarget.y / length };
  const edge = 1 / Math.sqrt((d.x / rx) ** 2 + (d.y / ry) ** 2);
  const tipDistance = Math.min(
    edge + TAIL_MAX,
    Math.max(edge + TAIL_MIN, length - TAIL_GAP),
  );
  const tip = { x: c.x + d.x * tipDistance, y: c.y + d.y * tipDistance };
  const across = { x: -d.y, y: d.x };
  const baseWidth = shout ? 26 : 30;
  let body: string;
  let outline: Point[];
  if (shout) {
    const spikes = 18;
    outline = Array.from({ length: spikes * 2 }, (_, i) => {
      const angle = (i / (spikes * 2)) * Math.PI * 2;
      const r = i % 2 === 0 ? (i % 4 === 0 ? 1 : 0.94) : SPIKE_DIP;
      return {
        x: c.x + Math.cos(angle) * rx * r,
        y: c.y + Math.sin(angle) * ry * r,
      };
    });
    body = `M ${outline.map((p) => `${p.x} ${p.y}`).join(" L ")} Z`;
  } else {
    outline = Array.from({ length: 120 }, (_, i) => {
      const angle = (i / 120) * Math.PI * 2;
      return { x: c.x + Math.cos(angle) * rx, y: c.y + Math.sin(angle) * ry };
    });
    body = `M ${c.x - rx} ${c.y} A ${rx} ${ry} 0 1 0 ${c.x + rx} ${c.y} A ${rx} ${ry} 0 1 0 ${c.x - rx} ${c.y} Z`;
  }
  const corners = (inside: number): [Point, Point] => [
    {
      x: c.x + d.x * inside + across.x * baseWidth,
      y: c.y + d.y * inside + across.y * baseWidth,
    },
    {
      x: c.x + d.x * inside - across.x * baseWidth,
      y: c.y + d.y * inside - across.y * baseWidth,
    },
  ];
  let inside = edge - 30;
  while (
    inside > 0 &&
    Math.min(...corners(inside).map((p) => depthIn(p, outline))) < stroke + 1
  )
    inside -= 2;
  const [base1, base2] = corners(inside);
  const tail =
    tone === "phone"
      ? zigzag(base1, base2, tip)
      : `M ${base1.x} ${base1.y} L ${tip.x} ${tip.y} L ${base2.x} ${base2.y} Z`;
  return {
    body,
    tail,
    center: c,
    rx,
    ry,
    base: [base1, base2],
    outline,
    stroke,
  };
};

type Tone = "shout" | "calm" | "phone";

const ZIGS = 4;
const zigzag = (base1: Point, base2: Point, tip: Point) => {
  const start = { x: (base1.x + base2.x) / 2, y: (base1.y + base2.y) / 2 };
  const half = { x: (base1.x - base2.x) / 2, y: (base1.y - base2.y) / 2 };
  const along = { x: tip.x - start.x, y: tip.y - start.y };
  const spine = Array.from({ length: ZIGS - 1 }, (_, i) => {
    const s = (i + 1) / ZIGS;
    const swing = (i % 2 === 0 ? 1.4 : -1.4) * (1 - s);
    return {
      s,
      x: start.x + along.x * s + half.x * swing,
      y: start.y + along.y * s + half.y * swing,
    };
  });
  const edge = (side: 1 | -1) =>
    spine.map(
      (p) =>
        `${p.x + half.x * side * (1 - p.s) * 0.45} ${p.y + half.y * side * (1 - p.s) * 0.45}`,
    );
  return `M ${base1.x} ${base1.y} L ${edge(1).join(" L ")} L ${tip.x} ${tip.y} L ${edge(-1).reverse().join(" L ")} L ${base2.x} ${base2.y} Z`;
};

const SpeechBubbleInner: React.FC<{
  readonly children: React.ReactNode;
  readonly style?: React.CSSProperties;
  readonly tone: Tone;
  readonly tailTo: [number, number] | null;
}> = ({ children, style, tone, tailTo }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 11, mass: 0.5 } });
  const shout = tone === "shout";
  const px = (value: React.CSSProperties["left"], fallback: number) =>
    typeof value === "number" ? value : fallback;
  const left = px(style?.left, 0);
  const top = px(style?.top, 0);
  const width = px(style?.width, 600);
  const height = px(style?.height, 300);
  const target = tailTo
    ? { x: tailTo[0] - left, y: tailTo[1] - top }
    : { x: width / 2, y: height };
  const { body, tail, center, ry, stroke } = bubbleShapes(
    width,
    height,
    target,
    tone,
  );
  const area = textArea(width, height, tone);
  const type = typeOf(tone);
  const phone = tone === "phone";
  const ink = "#151515";
  return (
    <div style={{ position: "absolute", ...style }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          scale: pop,
          transformOrigin: `${center.x}px ${center.y + ry}px`,
          translate: shout
            ? `${Math.sin(frame * 2.3) * 3}px ${Math.cos(frame * 1.9) * 2}px`
            : undefined,
        }}
      >
        <svg
          aria-hidden
          width={width}
          height={height}
          style={{ position: "absolute", inset: 0, overflow: "visible" }}
        >
          {tailTo ? (
            <path
              d={tail}
              fill={ink}
              stroke={ink}
              strokeWidth={stroke * 2}
              strokeLinejoin="round"
            />
          ) : null}
          <path
            d={body}
            fill={ink}
            stroke={ink}
            strokeWidth={stroke * 2}
            strokeLinejoin="round"
          />
          {tailTo ? (
            <path d={tail} fill={phone ? PHONE_FILL : "#ffffff"} />
          ) : null}
          <path d={body} fill={phone ? PHONE_FILL : "#ffffff"} />
        </svg>
        <div
          style={{
            position: "absolute",
            left: area.left,
            width: area.width,
            top: area.top,
            height: area.height,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            fontFamily: type.font === "bangers" ? SHOUT_FONT : CALM_FONT,
            fontWeight: shout || phone ? 400 : 700,
            fontSize:
              phone && typeof style?.fontSize === "number"
                ? style.fontSize * TEXT.phoneScale
                : undefined,
            letterSpacing: type.spacing,
            lineHeight: TEXT.lineHeight,
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
