import { DoubleSide } from "three";
import {
  InkHull,
  OUTLINE,
  ToonBox,
  drawnTexture,
  framedCard,
  fitText,
  useTaperedBox,
  type Vec3,
  ToonCylinder,
} from "../toon/primitives";
import { TONNE, TONNE_ISSUER, TONNE_STICKER, type TonneKind } from "./tonneShape";
import { useSignColor } from "../weather/DayLight";

const WIDTH = TONNE.width;
const DEPTH = TONNE.depth;
const HEIGHT = TONNE.height;
const TAPER = TONNE.taper;

const ANTHRACITE = "#3a3d42";

const LOOK: Record<TonneKind, { body: string; lid: string; ink: string }> = {
  papier: {
    body: ANTHRACITE,
    lid: "#2560b0",
    ink: "#2560b0",
  },
  rest: {
    body: ANTHRACITE,
    lid: "#2a2d31",
    ink: "#222222",
  },
  gelb: {
    body: ANTHRACITE,
    lid: "#f2c318",
    ink: "#b88a00",
  },
};

const stickerTexture = (kind: TonneKind) => {
  const look = LOOK[kind];
  const sticker = TONNE_STICKER[kind];
  return drawnTexture(`tonne-sticker-${kind}`, 640, 280, (ctx, w, h) => {
    framedCard(ctx, w, h, "#ffffff", look.ink, 14);
    ctx.fillStyle = look.ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(ctx, sticker.label, w / 2, 100, w - 70, 130);
    ctx.fillStyle = "#333333";
    fitText(ctx, sticker.rules, w / 2, 192, w - 70, 34, "normal");
    fitText(
      ctx,
      TONNE_ISSUER,
      w / 2,
      238,
      w - 70,
      26,
      "normal",
    );
  });
};

const houseNumberTexture = (house: string) =>
  drawnTexture(`tonne-house-number-${house}`, 256, 160, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#f2f2ee";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(
      ctx,
      house,
      w / 2,
      h / 2 + 6,
      w - 20,
      150,
      "bold",
      "Impact, 'Arial Black', sans-serif",
    );
  });

export const Tonne: React.FC<{
  readonly position: Vec3;
  readonly kind: TonneKind;
  readonly lidOpen: number;
  readonly house?: string;
  readonly children?: React.ReactNode;
}> = ({ position, kind, lidOpen, house = "12", children }) => {
  const signColor = useSignColor();
  const look = LOOK[kind];
  const body = useTaperedBox(WIDTH, HEIGHT, DEPTH, TAPER, true);
  const hull = useTaperedBox(
    WIDTH + OUTLINE * 2,
    HEIGHT,
    DEPTH + OUTLINE * 2,
    TAPER,
    true,
  );
  const frontAt = (y: number) =>
    (DEPTH / 2) * (TAPER + (1 - TAPER) * (y / HEIGHT));

  return (
    <group position={position}>
      <mesh geometry={body} castShadow receiveShadow>
        <meshToonMaterial color={look.body} side={DoubleSide} />
      </mesh>
      <mesh geometry={hull}>
        <InkHull />
      </mesh>
      {[1, -1].map((side) => (
        <group key={side}>
          <ToonBox
            position={[0, HEIGHT - 0.02, (side * DEPTH) / 2]}
            size={[WIDTH + 0.04, 0.04, 0.04]}
            color={look.body}
          />
          <ToonBox
            position={[(side * WIDTH) / 2, HEIGHT - 0.02, 0]}
            size={[0.04, 0.04, DEPTH + 0.04]}
            color={look.body}
          />
        </group>
      ))}

      <mesh
        position={[0, 0.84, frontAt(0.84) + 0.006]}
        rotation={[0.055, 0, 0]}
      >
        <planeGeometry args={[0.2, 0.125]} />
        <meshBasicMaterial color={signColor} map={houseNumberTexture(house)} transparent />
      </mesh>
      <mesh position={[0, 0.6, frontAt(0.6) + 0.006]} rotation={[0.055, 0, 0]}>
        <planeGeometry args={[0.34, 0.14]} />
        <meshBasicMaterial color={signColor} map={stickerTexture(kind)} />
      </mesh>

      <group position={TONNE.lid.hinge} rotation={[-lidOpen, 0, 0]}>
        <ToonBox
          position={TONNE.lid.center}
          size={TONNE.lid.size}
          color={look.lid}
        />
        {TONNE.lid.grips.map((grip) => (
          <ToonBox key={grip.center[0]} position={grip.center} size={grip.size} color={look.lid} />
        ))}
      </group>

      <ToonBox position={TONNE.backBar.center} size={TONNE.backBar.size} color={look.body} />
      {TONNE.backBar.posts.map((post) => (
        <ToonBox key={post.center[0]} position={post.center} size={post.size} color={look.body} />
      ))}
      <ToonBox
        position={[0, 0.1, -DEPTH / 2 + 0.03]}
        size={[0.62, 0.03, 0.03]}
        color="#2a2a2a"
      />
      {[1, -1].map((side) => (
        <ToonCylinder
          key={side}
          position={[side * 0.29, 0.1, -DEPTH / 2 + 0.03]}
          rotation={[0, 0, Math.PI / 2]}
          radius={0.1}
          height={0.05}
          segments={24}
          color="#26282a"
        />
      ))}
      {children}
    </group>
  );
};
