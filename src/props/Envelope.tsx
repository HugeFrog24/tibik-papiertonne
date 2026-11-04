import {
  DoubleSide,
  PlaneGeometry,
  Shape,
  ShapeGeometry,
  type Matrix4,
} from "three";
import { ENVELOPE_TEXT } from "../scenes/rundschreiben/letter";
import { useDisposable } from "../toon/useDisposable";
import { LETTER_FAMILY, useLetterTexture } from "./letterFont";
import { DL, ENVELOPE, envelopeFlap, envelopeSag, flapOutline } from "./letterShape";
import { PAPER } from "./Letter";

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

const bentSheet = (bow: number, twist: number, z: number) => {
  const g = new PlaneGeometry(DL[0], DL[1], 16, 8);
  g.translate(DL[0] / 2, DL[1] / 2, 0);
  const p = g.getAttribute("position");
  for (let i = 0; i < p.count; i++)
    p.setZ(i, z + envelopeSag(p.getX(i), p.getY(i), bow, twist));
  g.computeVertexNormals();
  return g;
};

const flapShape = () => {
  const s = new Shape();
  flapOutline().forEach(([x, y], i) => (i === 0 ? s.moveTo(x, y) : s.lineTo(x, y)));
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
  const flapGeometry = useDisposable(() => new ShapeGeometry(flapShape()), []);
  return (
    <group matrixAutoUpdate={false} matrix={matrix}>
      <mesh geometry={back} receiveShadow castShadow>
        <meshToonMaterial color={WHITE} side={DoubleSide} />
      </mesh>
      <mesh geometry={front} receiveShadow>
        <meshToonMaterial color="#ffffff" map={face} />
      </mesh>
      <group matrixAutoUpdate={false} matrix={envelopeFlap(flap)}>
        <mesh geometry={flapGeometry} receiveShadow>
          <meshToonMaterial color={WHITE} side={DoubleSide} />
        </mesh>
      </group>
    </group>
  );
};
