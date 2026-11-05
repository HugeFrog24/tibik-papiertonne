import { DoubleSide } from "three";
import { STAIRWELL_LIGHT } from "../building/stairwell";
import { ToonBox, drawnTexture, glowOf, type Glow } from "../toon/primitives";
import {
  CURTAIN_SAND,
  FACADE_Z,
  WINDOW,
  WINDOW_PAINT,
  openingFrame,
  type Opening,
} from "./building";

const TILTED_GLASS = "#557189";
const ROOM_DARK = "#2a2d31";
const CAFE_CURTAIN = "#efeee6";
export const WINDOW_LIT = "#ffc98a";

const LAYER = {
  glass: 0.02,
  curtain: 0.03,
  shutter: 0.04,
  bars: 0.05,
  frame: 0.08,
  handle: 0.095,
  shutterBox: 0.11,
};
const BORDER = 0.085;

const BAR = { at: 0.28, width: 0.06 };
const TILT = {
  gap: 0.055,
  mullion: BAR.width / 2,
  transom: BAR.at - BAR.width / 2,
};
const STAIR_GLASS = { dark: 0.28, lit: 0.85 };
const GATHERED = 0.18;
const FOLDS = 7;

const windowPlane = (
  z: number,
  width: number,
  height: number,
  y: number,
  color: string,
  x = 0,
  glow?: Glow,
) => (
  <mesh position={[x, y, z]}>
    <planeGeometry args={[width, height]} />
    <meshToonMaterial color={color} {...glowOf(glow)} />
  </mesh>
);

const curtainFolds = () =>
  drawnTexture("curtain-folds", 64, 4, (ctx, w, h) => {
    const fold = ctx.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i < FOLDS; i++) {
      fold.addColorStop(i / FOLDS, "#ffffff");
      fold.addColorStop((i + 0.5) / FOLDS, "#dcdcdc");
    }
    fold.addColorStop(1, "#ffffff");
    ctx.fillStyle = fold;
    ctx.fillRect(0, 0, w, h);
  });

const BedroomCurtain: React.FC<{
  readonly inner: { readonly w: number; readonly h: number };
  readonly drawn: number;
  readonly light: number;
}> = ({ inner, drawn, light }) => {
  const width = GATHERED + (inner.w - GATHERED) * drawn;
  const folds = curtainFolds();
  return (
    <mesh position={[-inner.w / 2 + width / 2, 0, LAYER.curtain]}>
      <planeGeometry args={[width, inner.h]} />
      <meshToonMaterial
        color={CURTAIN_SAND}
        map={folds}
        {...(light > 0
          ? {
              emissive: CURTAIN_SAND,
              emissiveMap: folds,
              emissiveIntensity: light,
            }
          : {})}
      />
    </mesh>
  );
};

const TiltedSash: React.FC<{
  readonly inner: { readonly w: number; readonly h: number };
}> = ({ inner }) => {
  const x0 = -inner.w / 2;
  const x1 = -TILT.mullion;
  const y0 = -inner.h / 2;
  const y1 = TILT.transom;
  return (
    <>
      {windowPlane(
        LAYER.glass + 0.001,
        x1 - x0,
        y1 - y0,
        (y0 + y1) / 2,
        TILTED_GLASS,
        (x0 + x1) / 2,
      )}
      <mesh
        position={[(x0 + x1) / 2, y1 - TILT.gap / 2, LAYER.curtain + 0.002]}
      >
        <planeGeometry args={[x1 - x0, TILT.gap]} />
        <meshBasicMaterial color={ROOM_DARK} />
      </mesh>
    </>
  );
};

const StairGlass: React.FC<{
  readonly inner: { readonly w: number; readonly h: number };
  readonly light: number;
}> = ({ inner, light }) => (
  <mesh position={[0, 0, LAYER.glass]}>
    <planeGeometry args={[inner.w, inner.h]} />
    <meshToonMaterial
      color={WINDOW_PAINT.glass}
      transparent
      opacity={STAIR_GLASS.dark + (STAIR_GLASS.lit - STAIR_GLASS.dark) * light}
      side={DoubleSide}
      depthWrite={false}
      {...glowOf({ color: STAIRWELL_LIGHT, light })}
    />
  </mesh>
);

export const OpeningView: React.FC<{
  readonly opening: Opening;
  readonly light?: number;
  readonly curtain?: number;
}> = ({ opening, light = 0, curtain = 0 }) => {
  const [w, h] = openingFrame(opening);
  const inner = { w: w - 2 * BORDER, h: h - 2 * BORDER };
  const shutterDrop = inner.h * opening.shutter;
  const lit = { color: WINDOW_LIT, light };
  const casement = opening.kind === "window" && !opening.bedroom;
  return (
    <group position={[opening.x, opening.y, FACADE_Z]}>
      {opening.kind === "stairs" ? (
        <StairGlass inner={inner} light={light} />
      ) : (
        windowPlane(LAYER.glass, inner.w, inner.h, 0, WINDOW_PAINT.glass, 0, lit)
      )}
      {casement
        ? windowPlane(
            LAYER.curtain,
            inner.w,
            0.56,
            -inner.h / 2 + 0.28,
            CAFE_CURTAIN,
            0,
            lit,
          )
        : null}
      {opening.bedroom ? (
        <BedroomCurtain inner={inner} drawn={curtain} light={light} />
      ) : null}
      {opening.tilted ? <TiltedSash inner={inner} /> : null}
      {shutterDrop > 0
        ? windowPlane(
            LAYER.shutter,
            inner.w,
            shutterDrop,
            inner.h / 2 - shutterDrop / 2,
            WINDOW_PAINT.shutter,
          )
        : null}
      {casement ? (
        <>
          <ToonBox
            position={[0, 0, LAYER.bars]}
            size={[BAR.width, inner.h, 0.02]}
            color={WINDOW_PAINT.frame}
            outline={false}
          />
          <ToonBox
            position={[0, BAR.at, LAYER.bars]}
            size={[inner.w, BAR.width, 0.02]}
            color={WINDOW_PAINT.frame}
            outline={false}
          />
        </>
      ) : null}
      <ToonBox
        position={[0, h / 2 - BORDER / 2, LAYER.frame / 2]}
        size={[w, BORDER, LAYER.frame]}
        color={WINDOW_PAINT.frame}
      />
      <ToonBox
        position={[0, -h / 2 + BORDER / 2, LAYER.frame / 2]}
        size={[w, BORDER, LAYER.frame]}
        color={WINDOW_PAINT.frame}
      />
      {[1, -1].map((side) => (
        <ToonBox
          key={side}
          position={[side * (w / 2 - BORDER / 2), 0, LAYER.frame / 2]}
          size={[BORDER, h - 2 * BORDER, LAYER.frame]}
          color={WINDOW_PAINT.frame}
        />
      ))}
      <ToonBox
        position={[w / 2 - BORDER / 2, 0, LAYER.handle]}
        size={[0.025, 0.12, 0.02]}
        color="#ffffff"
        outline={false}
      />
      {opening.kind === "window" ? (
        <ToonBox
          position={WINDOW.sill.offset}
          size={WINDOW.sill.size}
          color="#b9b5ac"
        />
      ) : null}
      {opening.kind === "stairs" || opening.bedroom ? null : (
        <ToonBox
          position={[0, h / 2 + 0.12, LAYER.shutterBox / 2]}
          size={[w + 0.06, 0.22, LAYER.shutterBox]}
          color={WINDOW_PAINT.shutter}
        />
      )}
    </group>
  );
};
