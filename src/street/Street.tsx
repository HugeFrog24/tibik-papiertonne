import { useMemo } from "react";
import { PUDDLES, WEATHER, type Weather } from "../weather/overcast";
import { Decal, PAVEMENT_DECAL_Y } from "./Drains";
import { DoubleSide, ExtrudeGeometry, type Texture } from "three";
import {
  Blob,
  DECAL,
  ToonBox,
  drawnTexture,
  fitText,
  framedCard,
  useLabelTexture,
  usePavingTexture,
  type Vec3,
  ToonCylinder,
} from "../toon/primitives";
import {
  BALCONIES,
  BALCONY,
  balconyParts,
  railingHeightFor,
  BUILDING_HEIGHT,
  ENTRANCE_X,
  ACROSS_STREET,
  FACADE_Z,
  MAILBOXES,
  MAILBOX_GRID,
  DOORBELL_FACE,
  doorbellRow,
  FLYER,
  flyerPose,
  mailboxCell,
  mailboxPlate,
  ENTRANCE_LAMP,
  ENTRANCE_STEP,
  DOORBELL_PANEL,
  balconyDecor,
  openingsOf,
  PARKED_CARS,
  TREE_POSITION,
  MORE_TREES,
  WINDOW,
  BIN_Z,
  BLOCK_SPAN,
  houseNumber,
  KERB_Z,
  KERB_DEPTH,
  KERB_HEIGHT,
  KERB_Y,
  openingFrame,
  type Opening,
  type Part,
  FLOOR_BAND,
  NO_ADS,
  residentsOf,
  PLINTH,
} from "./layout";
import { DoorGrips } from "../building/DoorGrips";
import { WallBox } from "../building/WallBox";
import { DoorLeaf } from "../building/DoorLeaf";
import { DoorCloser } from "./DoorCloser";
import { MailboxDoor } from "./MailboxDoor";
import { MAILBOX_DOOR } from "./mailboxDoorShape";
import {
  MAILBOX_COLOURS,
  drawMailboxCell,
  drawMailboxInside,
} from "./mailboxFace";
import { BikeStands } from "./BikeStands";
import { Asphalt } from "./Asphalt";
import { STREET_END } from "./roadShape";
import { Car } from "./Car";
import { Tonne } from "./Tonne";
import type { TonneKind } from "./tonneShape";
import { DistantBlock } from "./DistantBlock";
import { STREET_LAMPS } from "./lamps";
import { StreetLamp } from "./StreetLamp";
import { TreePit } from "./TreePit";
import { Hydrant } from "./Hydrant";
import { EntranceMat } from "./EntranceMat";
import { PoleWrap } from "./PoleWrap";
import { TREE_TAG, TRUNK, treeNumber, type TreeSide } from "./trees";
import { wrapPixels } from "./wraps";
import { swayOf, windIn } from "../physics/wind";
import {
  ENTRANCE_PARTS,
  FACADE_THICKNESS,
  HAUSTUER,
  facadeOpenings,
  rectShape,
} from "./facade";
import { useSignColor } from "../weather/DayLight";

const PLASTER = "#eadcc0";
const FRAME = "#f6f5f0";
const GLASS = "#6d8ba3";
const SHUTTER = "#c9c6bf";
const TILTED_GLASS = "#557189";
const ROOM_DARK = "#2a2d31";

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

const windowPlane = (
  z: number,
  width: number,
  height: number,
  y: number,
  color: string,
  x = 0,
) => (
  <mesh position={[x, y, z]}>
    <planeGeometry args={[width, height]} />
    <meshToonMaterial color={color} />
  </mesh>
);

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

const OpeningView: React.FC<{ readonly opening: Opening }> = ({ opening }) => {
  const [w, h] = openingFrame(opening);
  const inner = { w: w - 2 * BORDER, h: h - 2 * BORDER };
  const shutterDrop = inner.h * opening.shutter;
  return (
    <group position={[opening.x, opening.y, FACADE_Z]}>
      {opening.kind === "stairs" ? (
        <mesh position={[0, 0, LAYER.glass]}>
          <planeGeometry args={[inner.w, inner.h]} />
          <meshToonMaterial
            color={GLASS}
            transparent
            opacity={0.28}
            side={DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ) : (
        windowPlane(LAYER.glass, inner.w, inner.h, 0, GLASS)
      )}
      {opening.kind === "window"
        ? windowPlane(
            LAYER.curtain,
            inner.w,
            0.56,
            -inner.h / 2 + 0.28,
            "#efeee6",
          )
        : null}
      {opening.tilted ? <TiltedSash inner={inner} /> : null}
      {shutterDrop > 0
        ? windowPlane(
            LAYER.shutter,
            inner.w,
            shutterDrop,
            inner.h / 2 - shutterDrop / 2,
            SHUTTER,
          )
        : null}
      {opening.kind === "window" ? (
        <>
          <ToonBox
            position={[0, 0, LAYER.bars]}
            size={[BAR.width, inner.h, 0.02]}
            color={FRAME}
            outline={false}
          />
          <ToonBox
            position={[0, BAR.at, LAYER.bars]}
            size={[inner.w, BAR.width, 0.02]}
            color={FRAME}
            outline={false}
          />
        </>
      ) : null}
      <ToonBox
        position={[0, h / 2 - BORDER / 2, LAYER.frame / 2]}
        size={[w, BORDER, LAYER.frame]}
        color={FRAME}
      />
      <ToonBox
        position={[0, -h / 2 + BORDER / 2, LAYER.frame / 2]}
        size={[w, BORDER, LAYER.frame]}
        color={FRAME}
      />
      {[1, -1].map((side) => (
        <ToonBox
          key={side}
          position={[side * (w / 2 - BORDER / 2), 0, LAYER.frame / 2]}
          size={[BORDER, h - 2 * BORDER, LAYER.frame]}
          color={FRAME}
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
      {opening.kind === "stairs" ? null : (
        <ToonBox
          position={[0, h / 2 + 0.12, LAYER.shutterBox / 2]}
          size={[w + 0.06, 0.22, LAYER.shutterBox]}
          color={SHUTTER}
        />
      )}
    </group>
  );
};

const Balcony: React.FC<{
  readonly x: number;
  readonly y: number;
  readonly house: number;
  readonly index: number;
}> = ({ x, y, house, index }) => {
  const d = BALCONY.slab[2];
  const decor = balconyDecor(house, index);
  const rail = railingHeightFor(y);
  return (
    <group position={[x, y, FACADE_Z]}>
      {balconyParts(y).map((part, i) => (
        <ToonBox
          key={i}
          position={part.center}
          size={part.size}
          color={part.name === "slab" ? "#d8d2c4" : "#8e9399"}
        />
      ))}
      {decor.box ? (
        <group position={[0.4, rail - 0.05, d + 0.08]}>
          <ToonBox size={[0.9, 0.2, 0.18]} color="#a0522d" />
          {[-0.3, 0, 0.3].map((dx) => (
            <Blob
              key={dx}
              position={[dx, 0.15, 0]}
              scale={[0.14, 0.1, 0.1]}
              color={dx === 0 ? "#d94a5a" : "#5c9a45"}
            />
          ))}
        </group>
      ) : null}
      {decor.dish ? (
        <group position={[-0.8, rail + 0.25, d - 0.1]} rotation={[0.3, 0.4, 0]}>
          <mesh>
            <sphereGeometry args={[0.32, 24, 12, 0, Math.PI * 2, 0, 0.6]} />
            <meshToonMaterial color="#e8e8e4" side={DoubleSide} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
};

const doorbellTexture = (house: number) =>
  drawnTexture(`doorbell-${house}`, ...DOORBELL_FACE.px, (ctx, w) => {
    ctx.fillStyle = "#c9c4b5";
    ctx.fillRect(0, 0, ...DOORBELL_FACE.px);
    const { speaker } = DOORBELL_FACE;
    ctx.fillStyle = "#b3ad9d";
    ctx.fillRect(28, speaker.top, w - 56, speaker.height);
    ctx.fillStyle = "#3b3d40";
    for (let k = 0; k < 6; k++)
      ctx.fillRect(48, speaker.top + 14 + k * 10, w - 96, 4);
    ctx.beginPath();
    ctx.arc(w / 2, speaker.top + speaker.height + 4, 3, 0, Math.PI * 2);
    ctx.fill();
    residentsOf(house).forEach((name, i) => {
      const { y, height: row } = doorbellRow(i);
      ctx.fillStyle = "#f4f1e8";
      ctx.fillRect(16, y - row * 0.32, 120, row * 0.64);
      ctx.fillStyle = "#222222";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      fitText(ctx, name, 22, y + 1, 108, 18, "normal");
      ctx.fillStyle = "#555555";
      ctx.beginPath();
      ctx.arc(160, y, 11, 0, Math.PI * 2);
      ctx.fill();
    });
  });

const mailboxTexture = (house: number, opened: string | null) =>
  drawnTexture(
    `mailboxes-${house}-${opened ?? "painted"}`,
    ...MAILBOX_GRID.px,
    (ctx, w, h) => {
      ctx.fillStyle = MAILBOX_COLOURS.steel;
      ctx.fillRect(0, 0, w, h);
      residentsOf(house).forEach((name, i) =>
        name === opened
          ? drawMailboxInside(ctx, mailboxCell(i))
          : drawMailboxCell(ctx, mailboxCell(i), name, name === NO_ADS[house]),
      );
    },
  );

const HaustuerLeaf: React.FC<{
  readonly angle: number;
  readonly lever: number;
}> = ({ angle, lever }) => {
  const { width: w, thickness: t } = HAUSTUER;
  return (
    <DoorLeaf door={HAUSTUER} angle={angle} color="#2f4a3d">
      {[1, -1].map((side) => (
        <ToonBox
          key={side}
          position={[w / 2, 1.38, side * (t / 2 + 0.006)]}
          size={[0.3, 1.3, 0.01]}
          color="#8aa6b8"
          outline={false}
        />
      ))}
      <DoorGrips door={HAUSTUER} press={lever} />
    </DoorLeaf>
  );
};

const ON_FACADE: Vec3 = [0, 0, 1];

const Entrance: React.FC<{
  readonly door: number;
  readonly lever: number;
  readonly number: string;
}> = ({ door, lever, number }) => {
  const signColor = useSignColor();
  const houseNumber = useLabelTexture(number, "#1f4e9c", "#ffffff", 1.3);
  return (
    <>
      <ToonBox
        position={ENTRANCE_STEP.center}
        size={ENTRANCE_STEP.size}
        color="#a9a59c"
      />
      <EntranceMat />
      <WallBox
        on={{ position: DOORBELL_PANEL.center, normal: ON_FACADE }}
        size={DOORBELL_PANEL.size}
        color="#c9c4b5"
        lift={0.006}
      >
        <mesh>
          <planeGeometry args={[0.19, 0.49]} />
          <meshBasicMaterial color={signColor} map={doorbellTexture(Number(number))} />
        </mesh>
      </WallBox>
      <mesh position={[ENTRANCE_X + 0.95, 2.2, FACADE_Z + 0.02]}>
        <planeGeometry args={[0.3, 0.23]} />
        <meshBasicMaterial color={signColor} map={houseNumber} />
      </mesh>
      <PartBoxes parts={ENTRANCE_PARTS} color="#585e62" />
      <HaustuerLeaf angle={door} lever={lever} />
      <DoorCloser angle={door} />
    </>
  );
};

const Mailboxes: React.FC<{
  readonly house: number;
  readonly door?: number;
}> = ({ house, door }) => {
  const signColor = useSignColor();
  const real = door !== undefined;
  return (
    <>
      <WallBox
        on={{ position: MAILBOXES.center, normal: ON_FACADE }}
        size={MAILBOXES.size}
        color={MAILBOX_COLOURS.steel}
        lift={MAILBOX_GRID.lift}
      >
        <mesh>
          <planeGeometry args={[mailboxPlate().width, mailboxPlate().height]} />
          <meshBasicMaterial color={signColor} map={mailboxTexture(house, real ? MAILBOX_DOOR.resident : null)}
          />
        </mesh>
      </WallBox>
      {real ? <MailboxDoor angle={door} /> : null}
    </>
  );
};

const flyerTexture = () =>
  drawnTexture("flyer-pizza", 128, 64, (ctx, w, h) => {
    ctx.fillStyle = "#f2c230";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#c8102e";
    ctx.fillRect(0, 5, w, 27);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(ctx, "PIZZA", w / 2, 19, w - 16, 22);
    ctx.fillStyle = "#7a5a10";
    for (let i = 0; i < 3; i++)
      ctx.fillRect(14, 39 + i * 8, w - 28 - i * 18, 3);
  });

const Flyer: React.FC = () => {
  const { position, rotation, size } = flyerPose();
  return (
    <ToonBox
      position={position}
      rotation={rotation}
      size={size}
      color="#ffffff"
      map={flyerTexture()}
      ink={FLYER.ink}
    />
  );
};

const EntranceLamp: React.FC<{ readonly on: boolean }> = ({ on }) => (
  <WallBox
    on={{ position: ENTRANCE_LAMP.center, normal: ON_FACADE }}
    size={ENTRANCE_LAMP.size}
    color="#3a3e42"
  >
    <mesh position={[0, 0.02, 0]}>
      <planeGeometry args={[0.08, 0.15]} />
      {on ? (
        <meshToonMaterial
          color="#fff6dc"
          emissive={LAMP_GLOW}
          emissiveIntensity={1.4}
        />
      ) : (
        <meshToonMaterial color="#e7e3d8" />
      )}
    </mesh>
    {on ? (
      <pointLight
        position={[0, -0.05, 0.12]}
        color={LAMP_GLOW}
        intensity={0.25}
        distance={1.6}
      />
    ) : null}
    <mesh position={[0, -0.085, 0]}>
      <circleGeometry args={[0.014, 20]} />
      <meshBasicMaterial color="#1c1e20" />
    </mesh>
  </WallBox>
);

const LAMP_GLOW = "#ffd98a";
const PUDDLE = "#6d747a";

const Puddles: React.FC = () => (
  <>
    {PUDDLES.map((p) => (
      <Decal
        key={`${p.x}-${p.z}`}
        x={p.x}
        z={p.z}
        y={p.z > KERB_Z ? undefined : PAVEMENT_DECAL_Y}
        scale={[2 * p.rx, 2 * p.rz, 1]}
      >
        <circleGeometry args={[0.5, 40]} />
        <meshToonMaterial color={PUDDLE} {...DECAL} />
      </Decal>
    ))}
  </>
);

const CROWN = [
  {
    at: [0, 3.6, 0] as Vec3,
    scale: [1.2, 0.9, 1.1] as Vec3,
    reach: 0.05,
    spring: { hertz: 0.42, damping: 0.35 },
  },
  {
    at: [0.7, 3.2, 0.2] as Vec3,
    scale: [0.8, 0.7, 0.8] as Vec3,
    reach: 0.035,
    spring: { hertz: 0.55, damping: 0.35 },
  },
  {
    at: [-0.7, 3.3, -0.1] as Vec3,
    scale: [0.8, 0.7, 0.8] as Vec3,
    reach: 0.035,
    spring: { hertz: 0.5, damping: 0.35 },
  },
];

const PartBoxes: React.FC<{
  readonly parts: readonly Part[];
  readonly color: string;
  readonly outline?: boolean;
}> = ({ parts, color, outline }) => (
  <>
    {parts.map((part, i) => (
      <ToonBox
        key={i}
        position={part.center}
        size={part.size}
        color={color}
        outline={outline}
      />
    ))}
  </>
);

const TAG_PX_PER_M = 1600;

const treeTagTexture = (number: string) => {
  const [w, h] = wrapPixels(TRUNK, TREE_TAG, TAG_PX_PER_M);
  return drawnTexture(`tree-tag-${number}`, w, h, (ctx) => {
    framedCard(ctx, w, h, "#c4c8cd", "#868c93", 4);
    ctx.fillStyle = "#2b2e33";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(ctx, number, w / 2, h / 2 + 2, w - 20, h * 0.62);
  });
};

const StreetTree: React.FC<{
  readonly position: Vec3;
  readonly number: string;
  readonly windAt?: number;
  readonly yaw?: number;
}> = ({ position, number, windAt, yaw = 0 }) => {
  const along = windIn(yaw);
  return (
    <group position={position}>
      <ToonBox
        position={[0, 0.005, 0]}
        size={[1.2, 0.02, 1.2]}
        color="#5a4632"
      />
      <ToonCylinder
        position={[0, TRUNK.height / 2, 0]}
        radius={TRUNK.radius}
        height={TRUNK.height}
        segments={TRUNK.segments}
        color="#6b4e35"
        capped={false}
      />
      <PoleWrap pole={TRUNK} wrap={TREE_TAG} map={treeTagTexture(number)} />
      {CROWN.map(({ at, scale, reach, spring }, i) => {
        const push = windAt === undefined ? 0 : reach * swayOf(windAt, spring);
        return (
          <Blob
            key={i}
            position={[at[0] + along.x * push, at[1], at[2] + along.z * push]}
            scale={scale}
            color="#5c9a45"
          />
        );
      })}
    </group>
  );
};

const FacadeWall: React.FC<{ readonly plaster: string }> = ({ plaster }) => {
  const geometry = useMemo(
    () =>
      new ExtrudeGeometry(
        rectShape(
          { x0: -15, x1: 15, y0: 0, y1: BUILDING_HEIGHT },
          facadeOpenings(),
        ),
        {
          depth: FACADE_THICKNESS,
          bevelEnabled: false,
        },
      ),
    [],
  );
  return (
    <mesh
      geometry={geometry}
      position={[0, 0, FACADE_Z - FACADE_THICKNESS]}
      castShadow
      receiveShadow
    >
      <meshToonMaterial color={plaster} />
    </mesh>
  );
};

const ACROSS = { ...ACROSS_STREET, plaster: "#ddd5c6" };

const Block: React.FC<{
  readonly haustuer: number;
  readonly haustuerLever: number;
  readonly number: string;
  readonly plaster: string;
  readonly lampOn: boolean;
  readonly mailboxDoor?: number;
}> = ({ haustuer, haustuerLever, number, plaster, lampOn, mailboxDoor }) => (
  <>
    <FacadeWall plaster={plaster} />
    <ToonBox
      position={[0, BUILDING_HEIGHT + 0.1, FACADE_Z - 0.15]}
      size={[BLOCK_SPAN, 0.2, 0.5]}
      color="#b9b2a3"
    />
    <PartBoxes parts={PLINTH} color="#8f877b" outline={false} />
    <PartBoxes parts={FLOOR_BAND} color="#d9caa9" outline={false} />
    {openingsOf(Number(number)).map((opening) => (
      <OpeningView
        key={`${opening.kind}-${opening.x}-${opening.y}`}
        opening={opening}
      />
    ))}
    {BALCONIES.map(({ x, y }, i) => (
      <Balcony key={`${x}-${y}`} x={x} y={y} house={Number(number)} index={i} />
    ))}
    <Entrance door={haustuer} lever={haustuerLever} number={number} />
    <Mailboxes house={Number(number)} door={mailboxDoor} />
    {Number(number) === FLYER.house ? <Flyer /> : null}
    <EntranceLamp on={lampOn} />
    <Hydrant />
  </>
);

const STREET_LENGTH = 240;
const NEIGHBOUR_BINS: readonly TonneKind[] = [
  "rest",
  "papier",
  "papier",
  "gelb",
];
const BIN_SPACING = 0.7;
const NEIGHBOURS = [-3, -2, -1, 1, 2, 3];
const NEIGHBOUR_PLASTERS = [
  "#e3d6bd",
  "#d6dccf",
  "#efe3d0",
  "#d9cbb8",
  "#e6d9c9",
  "#d2d6d8",
];
const STREET_MIDDLE = (FACADE_Z + ACROSS.facade) / 2;

const Side: React.FC<{
  readonly haustuer: number;
  readonly haustuerLever: number;
  readonly number: number;
  readonly numbering: 1 | -1;
  readonly plaster: string;
  readonly palette: number;
  readonly windAt?: number;
  readonly paving: Texture;
  readonly yaw: number;
  readonly trees: TreeSide;
  readonly wetTint?: string;
  readonly lampOn?: boolean;
  readonly mailboxDoor?: number;
}> = ({
  haustuer,
  haustuerLever,
  number,
  numbering,
  plaster,
  palette,
  windAt,
  paving,
  yaw,
  trees,
  wetTint,
  lampOn = false,
  mailboxDoor,
}) => (
  <>
    <Block
      haustuer={haustuer}
      haustuerLever={haustuerLever}
      number={String(number)}
      plaster={plaster}
      lampOn={lampOn}
      mailboxDoor={mailboxDoor}
    />
    {NEIGHBOURS.flatMap((n) =>
      NEIGHBOUR_BINS.map((kind, k) => (
        <Tonne
          key={`${n}-${k}`}
          position={[n * BLOCK_SPAN + k * BIN_SPACING, 0, BIN_Z]}
          kind={kind}
          lidOpen={0}
          house={String(houseNumber(number, n, numbering))}
        />
      )),
    )}
    {NEIGHBOURS.map((n, i) => (
      <DistantBlock
        key={n}
        x={n * BLOCK_SPAN}
        number={String(houseNumber(number, n, numbering))}
        plaster={NEIGHBOUR_PLASTERS[(i + palette) % NEIGHBOUR_PLASTERS.length]}
      />
    ))}
    <mesh position={[0, 0, -0.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[STREET_LENGTH, 4]} />
      <meshToonMaterial map={paving} {...(wetTint ? { color: wetTint } : {})} />
    </mesh>
    <ToonBox
      position={[0, KERB_Y, KERB_Z]}
      size={[STREET_LENGTH, KERB_HEIGHT, KERB_DEPTH]}
      color="#bdbab2"
    />
    {MORE_TREES.map((x) => (
      <StreetTree
        key={x}
        position={[x, 0, TREE_POSITION[2]]}
        number={treeNumber(trees, x)}
        windAt={windAt}
        yaw={yaw}
      />
    ))}
    {MORE_TREES.map((x) => (
      <TreePit key={x} x={x} />
    ))}
  </>
);

export const Street: React.FC<{
  readonly haustuer?: number;
  readonly haustuerLever?: number;
  readonly windAt?: number;
  readonly weather?: Weather;
  readonly lampOn?: boolean;
  readonly mailboxDoor?: number;
}> = ({
  haustuer = 0,
  haustuerLever = 0,
  windAt,
  weather = "sunny",
  lampOn = false,
  mailboxDoor,
}) => {
  const paving = usePavingTexture((25 * STREET_LENGTH) / 30, 3.33);
  const wetTint = WEATHER[weather].wetTint ?? undefined;

  return (
    <>
      <Side
        haustuer={haustuer}
        haustuerLever={haustuerLever}
        number={12}
        numbering={1}
        plaster={PLASTER}
        palette={0}
        windAt={windAt}
        paving={paving}
        yaw={0}
        trees="near"
        wetTint={wetTint}
        lampOn={lampOn}
        mailboxDoor={mailboxDoor}
      />
      <group
        position={[ACROSS.shift, 0, ACROSS.facade + FACADE_Z]}
        rotation={[0, Math.PI, 0]}
      >
        <Side
          haustuer={0}
          haustuerLever={0}
          number={13}
          numbering={-1}
          plaster={ACROSS.plaster}
          palette={3}
          windAt={windAt}
          paving={paving}
          yaw={Math.PI}
          trees="far"
          wetTint={wetTint}
        />
      </group>
      {[1, -1].map((end) => (
        <group
          key={end}
          position={[end * (STREET_END + FACADE_Z), 0, STREET_MIDDLE]}
          rotation={[0, -end * (Math.PI / 2), 0]}
        >
          <DistantBlock
            x={0}
            number={end > 0 ? "2" : "1"}
            plaster={NEIGHBOUR_PLASTERS[end > 0 ? 4 : 1]}
          />
        </group>
      ))}
      <Asphalt wetTint={wetTint} />
      {wetTint ? <Puddles /> : null}
      {PARKED_CARS.map((car) => (
        <Car key={car.x} car={car} />
      ))}

      <StreetTree
        position={TREE_POSITION}
        number={treeNumber("near", TREE_POSITION[0])}
        windAt={windAt}
      />
      <TreePit x={TREE_POSITION[0]} />
      <BikeStands />
      {STREET_LAMPS.map((lamp) => (
        <StreetLamp key={`${lamp.x}-${lamp.z}`} lamp={lamp} />
      ))}
    </>
  );
};
