import { useMemo } from "react";
import { Object3D } from "three";
import {
  ToonBox,
  ToonCylinder,
  drawnTexture,
  fitText,
  framedCard,
} from "../toon/primitives";
import {
  LAMP,
  LAMP_LIGHT,
  LAMP_POOL,
  MAST_PLATE,
  lampArm,
  lampGlow,
  lampHead,
  POLE,
  mastNumber,
  stickersOn,
  type StreetLamp as Lamp,
  type Sticker,
  type StickerDesign,
  type LampWrap,
} from "./lamps";
import { PoleWrap } from "./PoleWrap";
import { wrapPixels } from "./wraps";

const STEEL = "#7d8389";
const LENS = "#e9e6da";
const PX_PER_M = 1600;

const bars = (
  ctx: CanvasRenderingContext2D,
  color: string,
  rows: readonly (readonly [number, number, number, number])[],
  w: number,
  h: number,
) => {
  ctx.fillStyle = color;
  for (const [x, y, bw, bh] of rows) ctx.fillRect(x * w, y * h, bw * w, bh * h);
};

const STICKER_ART: Record<
  StickerDesign,
  (ctx: CanvasRenderingContext2D, w: number, h: number) => void
> = {
  band: (ctx, w, h) => {
    ctx.fillStyle = "#1c1c1c";
    ctx.fillRect(0, 0, w, h);
    bars(
      ctx,
      "#f2f2f2",
      [
        [0.12, 0.2, 0.76, 0.16],
        [0.12, 0.44, 0.5, 0.12],
      ],
      w,
      h,
    );
    bars(ctx, "#d62828", [[0, 0.74, 1, 0.1]], w, h);
  },
  dot: (ctx, w, h) => {
    ctx.fillStyle = "#f7f5ef";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#c8102e";
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.36, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = "#f7f5ef";
    ctx.fillRect(w * 0.3, h * 0.44, w * 0.4, h * 0.12);
  },
  stripe: (ctx, w, h) => {
    ctx.fillStyle = "#f2c200";
    ctx.fillRect(0, 0, w, h);
    bars(
      ctx,
      "#1c1c1c",
      [
        [0.15, 0.12, 0.7, 0.1],
        [0.15, 0.3, 0.7, 0.05],
        [0.15, 0.4, 0.55, 0.05],
        [0.15, 0.78, 0.7, 0.08],
      ],
      w,
      h,
    );
  },
  club: (ctx, w, h) => {
    ctx.fillStyle = "#2f7d4a";
    ctx.fillRect(0, 0, w, h);
    bars(
      ctx,
      "#ffffff",
      [
        [0.08, 0.22, 0.6, 0.3],
        [0.08, 0.64, 0.84, 0.12],
      ],
      w,
      h,
    );
  },
  note: (ctx, w, h) => {
    ctx.fillStyle = "#ece9df";
    ctx.fillRect(0, 0, w, h);
    bars(
      ctx,
      "#8a8a8a",
      [
        [0.12, 0.18, 0.7, 0.06],
        [0.12, 0.34, 0.76, 0.06],
        [0.12, 0.5, 0.6, 0.06],
        [0.12, 0.66, 0.72, 0.06],
      ],
      w,
      h,
    );
  },
};

const textureSize = (wrap: LampWrap) => wrapPixels(POLE, wrap, PX_PER_M);

const stickerTexture = (wrap: Sticker) => {
  const [w, h] = textureSize(wrap);
  return drawnTexture(`lamp-sticker-${wrap.design}-${w}x${h}`, w, h, (ctx) => { STICKER_ART[wrap.design](ctx, w, h); },
  );
};

const plateTexture = (number: string) => {
  const [w, h] = textureSize(MAST_PLATE);
  return drawnTexture(`mast-plate-${number}`, w, h, (ctx) => {
    framedCard(ctx, w, h, "#f4f4f0", "#1c1c1c", 4);
    ctx.fillStyle = "#1c1c1c";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(ctx, number, w / 2, h / 2 + 2, w - 18, h * 0.5);
  });
};

const LampLight: React.FC<{ readonly on: boolean; readonly reach: number }> = ({ on, reach }) => {
  const target = useMemo(() => new Object3D(), []);
  return on ? (
    <>
      <primitive object={target} position={[0, 0, reach]} />
      <spotLight
        position={[0, LAMP.height - LAMP.lightBelowTop, reach]}
        target={target}
        color={LAMP_LIGHT}
        intensity={lampGlow(on).light}
        distance={LAMP_POOL.reach}
        angle={LAMP_POOL.angle}
        penumbra={LAMP_POOL.penumbra}
        decay={0}
      />
    </>
  ) : null;
};

export const StreetLamp: React.FC<{ readonly lamp: Lamp; readonly on?: boolean }> = ({ lamp, on = false }) => {
  const reach = lamp.toward * LAMP.arm;
  return (
    <group position={[lamp.x, 0, lamp.z]}>
      <ToonCylinder
        position={[0, POLE.height / 2, 0]}
        radius={POLE.radius}
        height={POLE.height}
        segments={POLE.segments}
        color={STEEL}
      />
      <PoleWrap
        pole={POLE}
        wrap={MAST_PLATE}
        map={plateTexture(mastNumber(lamp))}
      />
      {stickersOn(lamp).map((sticker) => (
        <PoleWrap
          pole={POLE}
          key={`${sticker.face}-${sticker.bottom}`}
          wrap={sticker}
          map={stickerTexture(sticker)}
        />
      ))}
      {[lampArm(lamp), lampHead(lamp)].map((part) => (
        <ToonBox
          key={part.name}
          position={[part.center[0] - lamp.x, part.center[1], part.center[2] - lamp.z]}
          size={part.size}
          color={STEEL}
        />
      ))}
      <ToonBox
        position={[0, LAMP.height - 0.11, reach]}
        size={[LAMP.head[2] - 0.06, 0.012, LAMP.head[0] - 0.08]}
        color={LENS}
        outline={false}
        glow={lampGlow(on).lens}
      />
      <LampLight on={on} reach={reach} />
    </group>
  );
};
