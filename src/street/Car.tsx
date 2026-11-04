import { DoubleSide, Euler, ShapeGeometry } from "three";
import { lazy } from "../physics/lazy";
import { centeredPrism, inkedSlab, shapeOf } from "../toon/extrude";
import { ROAD_Y } from "./building";
import {
  DECAL,
  InkHull,
  InkLine,
  OUTLINE,
  ToonBox,
  ToonCylinder,
  drawnTexture,
  fitText,
  framedCard,
  type Vec3,
} from "../toon/primitives";
import {
  BODY,
  BODY_BEVEL,
  B_PILLAR,
  CAR,
  carYaw,
  carZ,
  PLATE,
  faceX,
  plateOn,
  GLASS_BEVEL,
  GREENHOUSE,
  GREENHOUSE_WIDTH,
  MIRROR,
  REAR_WINDOW,
  SIDE_WINDOWS,
  SILL,
  ARCH_LINERS,
  LINER,
  WELL_WIDTH,
  WHEEL,
  WHEEL_WELLS,
  DEALER,
  GRILLE,
  INTAKE,
  PLATE_HOLDER,
  UMWELTPLAKETTE,
  hasDealerStrip,
  holderRect,
  WINDSHIELD,
  plaketteOnPane,
  windowPane,
  type ParkedCar,
} from "./carShape";

const GLASS = "#3c4a5c";
const MIRROR_GLASS = "#9fb2c1";
const TRIM = "#2a2d31";
const TYRE = "#1f2124";
const RIM = "#b7bcc2";
const HEADLIGHT = "#f2efd8";
const TAIL_LIGHT = "#b8232c";
const REFLECTOR = "#8f1a20";
const HU_COLORS = { 2027: "#f2c230", 2028: "#8a5a2b" } as const;

const [LENGTH, , WIDTH] = CAR.size;
const SIDE = WIDTH / 2;

const slabs = lazy(() => [
  inkedSlab(BODY, WIDTH, BODY_BEVEL, OUTLINE),
  inkedSlab(GREENHOUSE, GREENHOUSE_WIDTH, GLASS_BEVEL, OUTLINE),
]);
const wellGeometries = lazy(() => [
  ...WHEEL_WELLS.map((outline) => centeredPrism(outline, WELL_WIDTH)),
  ...ARCH_LINERS.map((outline) => centeredPrism(outline, LINER.width)),
]);
const windowGeometries = lazy(() =>
  SIDE_WINDOWS.map((outline) => new ShapeGeometry(shapeOf(outline))),
);

const PANES = [
  { pane: windowPane(WINDSHIELD), badge: true },
  { pane: windowPane(REAR_WINDOW), badge: false },
];
const FRONT_PLATE = plateOn(PLATE.front, 1);
const REAR_PLATE = plateOn(PLATE.rear, -1);

const SEAM_XS = [0.85, (B_PILLAR[0] + B_PILLAR[1]) / 2, -0.85];
const SEAMS: Vec3[][] = [1, -1].flatMap((side) =>
  SEAM_XS.map((x): Vec3[] => [
    [x, SILL + BODY_BEVEL.size + 0.04, side * (SIDE + 0.002)],
    [x, 0.94 - BODY_BEVEL.size, side * (SIDE + 0.002)],
  ]),
);

const separated = (plate: string) => {
  const [district, rest] = plate.split("-");
  return { district, rest };
};

const plaketteTexture = () =>
  drawnTexture("umweltplakette-4", 128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#2f9a46";
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 1, 0, 2 * Math.PI);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#1d6b2f";
    ctx.stroke();
    ctx.fillStyle = "#f4f4ef";
    ctx.fillRect(14, h * 0.6, w - 28, h * 0.17);
    ctx.fillStyle = "#3a3a3a";
    ctx.fillRect(26, h * 0.66, w - 52, h * 0.05);
    ctx.fillStyle = "#111111";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 60px Arial, Helvetica, sans-serif";
    ctx.fillText("4", w / 2, h * 0.34);
  });

const plateTexture = (car: ParkedCar, rear: boolean) =>
  drawnTexture(
    `plate-${car.plate}-${rear ? "rear" : "front"}-${car.hu}`,
    520,
    112,
    (ctx, w, h) => {
      framedCard(ctx, w, h, "#f7f7f2", "#111111", 6);
      ctx.fillStyle = "#003399";
      ctx.fillRect(6, 6, 52, h - 12);
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 34px Arial, Helvetica, sans-serif";
      ctx.fillText("D", 32, h - 30);

      const { district, rest } = separated(car.plate);
      const gap = 52;
      let size = 80;
      const font = () => `bold ${size}px 'Arial Narrow', Arial, sans-serif`;
      ctx.font = font();
      while (
        ctx.measureText(district).width + gap + ctx.measureText(rest).width >
          w - 90 &&
        size > 20
      ) {
        size -= 2;
        ctx.font = font();
      }
      const districtWidth = ctx.measureText(district).width;
      const total = districtWidth + gap + ctx.measureText(rest).width;
      const left = 58 + (w - 58 - total) / 2;
      ctx.fillStyle = "#111111";
      ctx.textAlign = "left";
      ctx.fillText(district, left, h / 2 + 4);
      ctx.fillText(rest, left + districtWidth + gap, h / 2 + 4);

      const sealX = left + districtWidth + gap / 2;
      const seal = (y: number, radius: number, fill: string) => {
        ctx.beginPath();
        ctx.arc(sealX, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#7d7d7d";
        ctx.stroke();
      };
      seal(rear ? 76 : h / 2, 17, "#e4e4e0");
      ctx.fillStyle = "#c79a2c";
      ctx.fillRect(sealX - 5, (rear ? 76 : h / 2) - 7, 10, 13);
      if (rear) {
        seal(34, 17, HU_COLORS[car.hu]);
        ctx.fillStyle = "#111111";
        ctx.beginPath();
        ctx.moveTo(sealX, 34);
        ctx.arc(sealX, 34, 17, -Math.PI / 2 - 0.26, -Math.PI / 2 + 0.26);
        ctx.fill();
        ctx.font = "bold 13px Arial, Helvetica, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(String(car.hu % 100), sealX, 38);
      }
    },
  );

const holderTexture = (dealer: boolean) => {
  const r = holderRect();
  const [w, h] = [Math.round(r.width * 1000), Math.round(r.height * 1000)];
  const strip = Math.round(PLATE_HOLDER.strip * 1000);
  return drawnTexture(`plate-holder-${dealer}`, w, h, (ctx) => {
    ctx.fillStyle = "#151617";
    ctx.fillRect(0, 0, w, h);
    if (!dealer) return;
    ctx.fillStyle = "#d4d6d8";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(ctx, DEALER, w / 2, h - strip / 2, w - 80, strip * 0.7);
  });
};

const PlateHolder: React.FC<{ readonly dealer: boolean }> = ({ dealer }) => {
  const r = holderRect();
  return (
    <mesh position={[0, r.centre, -PLATE_HOLDER.behind]}>
      <planeGeometry args={[r.width, r.height]} />
      <meshBasicMaterial map={holderTexture(dealer)} />
    </mesh>
  );
};

const Wheel: React.FC<{ readonly x: number; readonly side: number }> = ({
  x,
  side,
}) => {
  const outer = side * (WHEEL.z + WHEEL.width / 2);
  return (
    <group position={[x, WHEEL.radius, 0]}>
      <ToonCylinder
        position={[0, 0, side * WHEEL.z]}
        rotation={[Math.PI / 2, 0, 0]}
        radius={WHEEL.radius}
        height={WHEEL.width}
        segments={28}
        color={TYRE}
      />
      <mesh
        position={[0, 0, outer + side * 0.004]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.19, 0.19, 0.012, 24]} />
        <meshToonMaterial color={RIM} />
      </mesh>
      <mesh
        position={[0, 0, outer + side * 0.01]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.05, 0.05, 0.012, 16]} />
        <meshToonMaterial color="#55595e" />
      </mesh>
    </group>
  );
};

const Mirror: React.FC<{ readonly side: number; readonly color: string }> = ({
  side,
  color,
}) => (
  <group position={[MIRROR.x, MIRROR.y, side * (SIDE + MIRROR.reach / 2)]}>
    <ToonBox
      size={[MIRROR.size[0], MIRROR.size[1], MIRROR.reach]}
      color={color}
    />
    <mesh
      position={[-MIRROR.size[0] / 2 - 0.003, 0, 0]}
      rotation={[0, -Math.PI / 2, 0]}
    >
      <planeGeometry args={[MIRROR.reach - 0.04, MIRROR.size[1] - 0.03]} />
      <meshToonMaterial color={MIRROR_GLASS} />
    </mesh>
    <ToonBox
      position={[0.02, -0.03, -side * (MIRROR.reach / 2 + 0.05)]}
      size={[0.07, 0.04, 0.12]}
      color={color}
    />
  </group>
);

export const Car: React.FC<{ readonly car: ParkedCar }> = ({ car }) => {
  const front = plateTexture(car, false);
  const rear = plateTexture(car, true);
  return (
    <group position={[car.x, ROAD_Y, carZ(car)]} rotation={[0, carYaw(car), 0]}>
      {slabs().map(({ solid, hull }, i) => (
        <group key={i}>
          <mesh geometry={solid} castShadow receiveShadow>
            <meshToonMaterial color={car.color} />
          </mesh>
          <mesh geometry={hull}>
            <InkHull />
          </mesh>
        </group>
      ))}
      {[1, -1].flatMap((side) =>
        windowGeometries().map((geometry, i) => (
          <mesh
            key={`${side}-${i}`}
            geometry={geometry}
            position={[0, 0, side * (GREENHOUSE_WIDTH / 2 + 0.003)]}
          >
            <meshToonMaterial color={GLASS} side={DoubleSide} />
          </mesh>
        )),
      )}
      {PANES.map(({ pane, badge }, i) => (
        <group key={i} position={pane.position} rotation={pane.rotation}>
          <mesh>
            <planeGeometry args={pane.size} />
            <meshToonMaterial color={GLASS} />
          </mesh>
          {badge ? (
            <mesh position={plaketteOnPane()}>
              <circleGeometry args={[UMWELTPLAKETTE.diameter / 2, 32]} />
              <meshToonMaterial map={plaketteTexture()} {...DECAL} />
            </mesh>
          ) : null}
        </group>
      ))}
      {SEAMS.map((points, i) => (
        <InkLine key={i} points={points} radius={0.003} />
      ))}
      {[1, -1].flatMap((side) =>
        [0.03, -0.68].map((x) => (
          <ToonBox
            key={`${side}-${x}`}
            position={[x, 0.86, side * (SIDE + 0.008)]}
            size={[0.15, 0.028, 0.02]}
            color={TRIM}
          />
        )),
      )}
      {[1, -1].map((side) => (
        <Mirror key={side} side={side} color={car.color} />
      ))}
      {wellGeometries().map((geometry, i) => (
        <mesh key={i} geometry={geometry}>
          <meshBasicMaterial color="#151618" />
        </mesh>
      ))}
      {WHEEL.x.flatMap((x) =>
        [1, -1].map((side) => <Wheel key={`${x}-${side}`} x={x} side={side} />),
      )}

      {[1, -1].map((side) => (
        <ToonBox
          key={side}
          position={[faceX(0.66, 1), 0.66, side * 0.56]}
          size={[0.03, 0.1, 0.34]}
          color={HEADLIGHT}
        />
      ))}
      <ToonBox
        position={[faceX(GRILLE.y, 1), GRILLE.y, 0]}
        size={GRILLE.size}
        color={TRIM}
      />
      <ToonBox
        position={[faceX(INTAKE.y, 1) - INTAKE.inset, INTAKE.y, 0]}
        size={INTAKE.size}
        color={TRIM}
      />
      <group
        position={[FRONT_PLATE.x, FRONT_PLATE.y, 0]}
        rotation={new Euler(0, Math.PI / 2, -FRONT_PLATE.tilt, "ZYX")}
      >
        <mesh>
          <planeGeometry args={PLATE.size} />
          <meshBasicMaterial map={front} />
        </mesh>
        <PlateHolder dealer={hasDealerStrip(car)} />
      </group>

      {[1, -1].map((side) => (
        <ToonBox
          key={side}
          position={[faceX(0.84, -1), 0.84, side * 0.6]}
          size={[0.03, 0.12, 0.3]}
          color={TAIL_LIGHT}
        />
      ))}
      {[1, -1].map((side) => (
        <ToonBox
          key={side}
          position={[faceX(0.36, -1), 0.36, side * 0.68]}
          size={[0.02, 0.04, 0.14]}
          color={REFLECTOR}
          outline={false}
        />
      ))}
      <group
        position={[REAR_PLATE.x, REAR_PLATE.y, 0]}
        rotation={new Euler(0, -Math.PI / 2, -REAR_PLATE.tilt, "ZYX")}
      >
        <mesh>
          <planeGeometry args={PLATE.size} />
          <meshBasicMaterial map={rear} />
        </mesh>
        <PlateHolder dealer={hasDealerStrip(car)} />
      </group>
      <ToonCylinder
        position={[-LENGTH / 2 + 0.07, 0.19, 0.52]}
        rotation={[0, 0, Math.PI / 2]}
        radius={0.035}
        height={0.16}
        segments={16}
        color={TRIM}
      />
    </group>
  );
};
