import { BackSide, DoubleSide } from "three";
import {
  INK,
  OUTLINE,
  ToonBox,
  drawnTexture,
  fitText,
  useTaperedBox,
  type Vec3,
} from "../toon/primitives";
import { TONNE, type TonneKind } from "./tonneShape";

const WIDTH = TONNE.width;
const DEPTH = TONNE.depth;
const HEIGHT = TONNE.height;
const TAPER = TONNE.taper;

const ANTHRACITE = "#3a3d42";

const LOOK: Record<TonneKind, { body: string; lid: string; label: string; ink: string; rules: string }> = {
  papier: { body: ANTHRACITE, lid: "#2560b0", label: "PAPIER", ink: "#2560b0", rules: "Papier · Pappe · Kartonagen – bitte zerkleinern" },
  rest: { body: ANTHRACITE, lid: "#2a2d31", label: "RESTMÜLL", ink: "#222222", rules: "Keine Wertstoffe, kein Papier" },
  gelb: { body: ANTHRACITE, lid: "#f2c318", label: "WERTSTOFFE", ink: "#b88a00", rules: "Verpackungen aus Kunststoff & Metall" },
};

const stickerTexture = (kind: TonneKind) => {
  const look = LOOK[kind];
  return drawnTexture(`tonne-sticker-${kind}`, 640, 280, (ctx, w, h) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = look.ink;
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, w - 14, h - 14);
    ctx.fillStyle = look.ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(ctx, look.label, w / 2, 100, w - 70, 130);
    ctx.fillStyle = "#333333";
    fitText(ctx, look.rules, w / 2, 192, w - 70, 34, "normal");
    fitText(ctx, "Abfallwirtschaft Musterstadt", w / 2, 238, w - 70, 26, "normal");
  });
};

const houseNumberTexture = () =>
  drawnTexture("tonne-house-number", 256, 160, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#f2f2ee";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(ctx, "12", w / 2, h / 2 + 6, w - 20, 150, "bold", "Impact, 'Arial Black', sans-serif");
  });

export const Tonne: React.FC<{
  readonly position: Vec3;
  readonly kind: TonneKind;
  readonly lidOpen: number;
  readonly children?: React.ReactNode;
}> = ({ position, kind, lidOpen, children }) => {
  const look = LOOK[kind];
  const body = useTaperedBox(WIDTH, HEIGHT, DEPTH, TAPER, true);
  const hull = useTaperedBox(
    WIDTH + OUTLINE * 2,
    HEIGHT,
    DEPTH + OUTLINE * 2,
    TAPER,
    true,
  );
  const frontAt = (y: number) => (DEPTH / 2) * (TAPER + (1 - TAPER) * (y / HEIGHT));

  return (
    <group position={position}>
      <mesh geometry={body} castShadow receiveShadow>
        <meshToonMaterial color={look.body} side={DoubleSide} />
      </mesh>
      <mesh geometry={hull}>
        <meshBasicMaterial color={INK} side={BackSide} />
      </mesh>
      {[1, -1].map((side) => (
        <group key={side}>
          <ToonBox position={[0, HEIGHT - 0.02, side * DEPTH / 2]} size={[WIDTH + 0.04, 0.04, 0.04]} color={look.body} />
          <ToonBox position={[side * WIDTH / 2, HEIGHT - 0.02, 0]} size={[0.04, 0.04, DEPTH + 0.04]} color={look.body} />
        </group>
      ))}

      <mesh position={[0, 0.84, frontAt(0.84) + 0.006]} rotation={[0.055, 0, 0]}>
        <planeGeometry args={[0.2, 0.125]} />
        <meshBasicMaterial map={houseNumberTexture()} transparent />
      </mesh>
      <mesh position={[0, 0.6, frontAt(0.6) + 0.006]} rotation={[0.055, 0, 0]}>
        <planeGeometry args={[0.34, 0.14]} />
        <meshBasicMaterial map={stickerTexture(kind)} />
      </mesh>

      <group position={TONNE.lid.hinge} rotation={[-lidOpen, 0, 0]}>
        <ToonBox position={TONNE.lid.center} size={TONNE.lid.size} color={look.lid} />
        <ToonBox position={[0, -0.01, DEPTH + 0.06]} size={[0.32, 0.05, 0.035]} color={look.lid} />
      </group>

      <ToonBox position={[0, HEIGHT - 0.07, -DEPTH / 2 - 0.06]} size={[0.5, 0.04, 0.04]} color={look.lid} />
      <ToonBox position={[0, 0.1, -DEPTH / 2 + 0.03]} size={[0.62, 0.03, 0.03]} color="#2a2a2a" />
      {[1, -1].map((side) => (
        <group key={side} position={[side * 0.29, 0.1, -DEPTH / 2 + 0.03]} rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.1, 0.1, 0.05, 24]} />
            <meshToonMaterial color="#26282a" />
          </mesh>
          <mesh>
            <cylinderGeometry args={[0.1 + OUTLINE, 0.1 + OUTLINE, 0.05 + OUTLINE, 24]} />
            <meshBasicMaterial color={INK} side={BackSide} />
          </mesh>
        </group>
      ))}
      {children}
    </group>
  );
};
