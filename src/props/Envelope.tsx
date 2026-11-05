import {
  DoubleSide,
  Shape,
  ShapeGeometry,
  type Matrix4,
} from "three";
import { ENVELOPE_TEXT } from "../scenes/rundschreiben/letter";
import { useDisposable } from "../toon/useDisposable";
import { LETTER_FAMILY, useLetterTexture } from "./letterFont";
import { DL, ENVELOPE, envelopeFlap, envelopeSag, flapPieces } from "./letterShape";
import { PAPER } from "./Letter";
import { paperRamp } from "../toon/paperRamp";
import { bentPlane } from "./bentPlane";

const WHITE = "#f6f5f0";
const PX = 5000;

const paintEnvelope = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = PAPER.ink;
  ctx.textBaseline = "top";
  ctx.font = `400 ${0.003 * PX}px ${LETTER_FAMILY}`;
  ctx.fillText(ENVELOPE_TEXT.sender, 0.008 * PX, 0.008 * PX);
  ctx.font = `400 ${0.0042 * PX}px ${LETTER_FAMILY}`;
  ctx.fillText(ENVELOPE_TEXT.to, 0.02 * PX, 0.05 * PX);
};

const bentSheet = (bow: number, twist: number, z: number) =>
  bentPlane(DL, [16, 8], (x, y) => z + envelopeSag(x, y, bow, twist));

const shapeOf = (outline: readonly (readonly [number, number])[]) => {
  const s = new Shape();
  outline.forEach(([x, y], i) => (i === 0 ? s.moveTo(x, y) : s.lineTo(x, y)));
  s.closePath();
  return s;
};

export const Envelope: React.FC<{
  readonly matrix: Matrix4;
  readonly flap: number;
  readonly bow?: number;
  readonly twist?: number;
}> = ({ matrix, flap, bow = 0, twist = 0 }) => {
  const face = useLetterTexture(
    "rundschreiben-envelope",
    Math.round(DL[0] * PX),
    Math.round(DL[1] * PX),
    paintEnvelope,
  );
  const t = ENVELOPE.thickness;
  const front = useDisposable(
    () => bentSheet(bow, twist, PAPER.face),
    [bow, twist],
  );
  const back = useDisposable(() => bentSheet(bow, twist, -t), [bow, twist]);
  const lifted = useDisposable(() => new ShapeGeometry(shapeOf(flapPieces().lifted)), []);
  const glued = useDisposable(() => new ShapeGeometry(shapeOf(flapPieces().glued)), []);
  return (
    <group matrixAutoUpdate={false} matrix={matrix}>
      <mesh geometry={back} receiveShadow castShadow>
        <meshToonMaterial color={WHITE} side={DoubleSide} gradientMap={paperRamp()} />
      </mesh>
      <mesh geometry={front} receiveShadow>
        <meshToonMaterial color="#ffffff" map={face} gradientMap={paperRamp()} />
      </mesh>
      <group matrixAutoUpdate={false} matrix={envelopeFlap(flap)}>
        <mesh geometry={lifted} receiveShadow>
          <meshToonMaterial color={WHITE} side={DoubleSide} gradientMap={paperRamp()} />
        </mesh>
      </group>
      <group matrixAutoUpdate={false} matrix={envelopeFlap(0)}>
        <mesh geometry={glued} receiveShadow>
          <meshToonMaterial color={WHITE} side={DoubleSide} gradientMap={paperRamp()} />
        </mesh>
      </group>
    </group>
  );
};
