import { PUDDLES, WEATHER, type Weather } from "../weather/overcast";
import { Decal, PAVEMENT_DECAL_Y } from "./Drains";
import { ExtrudeGeometry, type Texture } from "three";
import {
  Blob,
  DECAL,
  ToonBox,
  drawnTexture,
  fitText,
  framedCard,
  glowOf,
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
  BIN_Z,
  BLOCK_SPAN,
  houseNumber,
  KERB_Z,
  KERB_DEPTH,
  KERB_HEIGHT,
  KERB_Y,
  type Opening,
  CORNICE,
  COPING,
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
import { STREET_END, STREET_MIDDLE } from "./roadShape";
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
import { TREE_CROWN, TREE_TAG, TRUNK, treeNumber, type TreeSide } from "./trees";
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
import { Dish } from "./Dish";
import { Roof, Town } from "./Town";
import { OpeningView } from "./OpeningView";
import type { CurtainOpen } from "../building/bedroomShape";
import { useDisposable } from "../toon/useDisposable";
import { PartBoxes } from "./PartBoxes";

const PLASTER = "#eadcc0";
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
      <PartBoxes
        parts={balconyParts(y)}
        color={(part) => (part.name === "slab" ? "#d8d2c4" : "#8e9399")}
      />
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
      {decor.dish ? <Dish rail={rail} /> : null}
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
          <meshBasicMaterial
            color={signColor}
            map={mailboxTexture(house, real ? MAILBOX_DOOR.resident : null)}
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
      <meshToonMaterial
        color={on ? "#fff6dc" : "#e7e3d8"}
        {...glowOf({ color: LAMP_GLOW, light: on ? 1.4 : 0 })}
      />
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
      {TREE_CROWN.map(({ at, scale, reach, spring }, i) => {
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

const FacadeWall: React.FC<{ readonly plaster: string; readonly house: number }> = ({ plaster, house }) => {
  const geometry = useDisposable(
    () =>
      new ExtrudeGeometry(
        rectShape(
          { x0: -15, x1: 15, y0: 0, y1: BUILDING_HEIGHT },
          facadeOpenings(house),
        ),
        {
          depth: FACADE_THICKNESS,
          bevelEnabled: false,
        },
      ),
    [house],
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

const BY_DAY: CurtainOpen = [1, 1];

type WindowLights = {
  readonly light?: (house: number, opening: Opening) => number;
  readonly curtainOpen: CurtainOpen;
};

const ACROSS = { ...ACROSS_STREET, plaster: "#ddd5c6" };

const Block: React.FC<{
  readonly haustuer: number;
  readonly haustuerLever: number;
  readonly number: string;
  readonly plaster: string;
  readonly lampOn: boolean;
  readonly mailboxDoor?: number;
  readonly windows: WindowLights;
}> = ({ haustuer, haustuerLever, number, plaster, lampOn, mailboxDoor, windows }) => (
  <>
    <FacadeWall plaster={plaster} house={Number(number)} />
    <PartBoxes parts={[CORNICE]} color={COPING} />
    <PartBoxes parts={PLINTH} color="#8f877b" outline={false} />
    <PartBoxes parts={FLOOR_BAND} color="#d9caa9" outline={false} />
    {openingsOf(Number(number)).map((opening) => (
      <OpeningView
        key={`${opening.kind}-${opening.x}-${opening.y}`}
        opening={opening}
        light={windows.light?.(Number(number), opening)}
        curtainOpen={windows.curtainOpen}
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
  readonly roofs?: boolean;
  readonly windows: WindowLights;
  readonly nightLit?: number;
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
  roofs = false,
  windows,
  nightLit,
}) => (
  <>
    {roofs
      ? [0, ...NEIGHBOURS].map((n) => (
          <group key={`roof-${n}`} position={[n * BLOCK_SPAN, 0, 0]}>
            <Roof />
          </group>
        ))
      : null}
    <Block
      haustuer={haustuer}
      haustuerLever={haustuerLever}
      number={String(number)}
      plaster={plaster}
      lampOn={lampOn}
      mailboxDoor={mailboxDoor}
      windows={windows}
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
        lit={nightLit}
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
  readonly roofs?: boolean;
  readonly town?: { readonly lit: number };
  readonly windowLight?: (house: number, opening: Opening) => number;
  readonly bedroomCurtains?: CurtainOpen;
  readonly lampsOn?: boolean;
}> = ({
  haustuer = 0,
  haustuerLever = 0,
  windAt,
  weather = "sunny",
  lampOn = false,
  mailboxDoor,
  roofs = false,
  town,
  windowLight,
  bedroomCurtains = BY_DAY,
  lampsOn = false,
}) => {
  const windows = { light: windowLight, curtainOpen: bedroomCurtains };
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
        roofs={roofs}
        windows={windows}
        nightLit={town?.lit}
      />
      {town ? <Town lit={town.lit} /> : null}
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
          roofs={roofs}
          windows={windows}
          nightLit={town?.lit}
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
            lit={town?.lit}
          />
          {roofs ? <Roof /> : null}
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
        <StreetLamp key={`${lamp.x}-${lamp.z}`} lamp={lamp} on={lampsOn} />
      ))}
    </>
  );
};
