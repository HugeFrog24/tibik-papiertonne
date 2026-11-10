import { useMemo } from "react";
import { Color, DoubleSide, RepeatWrapping, TubeGeometry } from "three";
import { NO_INK } from "../toon/inkWidth";
import { PaneFacingIn } from "./PaneFacingIn";
import { bentPlane } from "../props/bentPlane";
import { useDisposable } from "../toon/useDisposable";
import { cushionGeometry } from "../props/cushion";
import { CURTAIN_SAND, boundsPart, type Part } from "../street/building";
import { PartBoxes } from "../street/PartBoxes";
import { ToonBox, ToonCylinder, drawnTexture, type Vec3 } from "../toon/primitives";
import { seeded } from "../physics/seeded";
import {
  BEDROOM,
  BEDROOM_DOOR,
  BEDSIDE_LIGHT,
  CABINETS,
  CORD_SWITCH,
  SWITCHED_CORDS,
  cordCurve,
  CABINET_INK,
  DOME_LAMP,
  LAMPS,
  PANE,
  INNER_GLASS,
  PILLOWS,
  RADIATOR,
  SMOKE_ALARM,
  bedroomParts,
  curtainPanels,
  type CurtainOpen,
  daylightIn,
  type CurtainShape,
  type BedsideLamp,
} from "./bedroomShape";
import { DoorGrips } from "./DoorGrips";
import { DoorLeaf } from "./DoorLeaf";
import { WALL_WHITE, alder, wildOak } from "./interiorTextures";
import { RoomSlabs } from "./RoomSlabs";

const COLOURS = {
  leather: "#f1efea",
  glass: "#dfe8ee",
  sheet: "#f7f6f2",
  cabinet: "#f4f3ef",
  radiator: "#f6f6f3",
  shade: "#efe6d4",
  shadeLit: "#ffe7c2",
  foot: "#d9d6cf",
  legs: "#3a3a3c",
  alarm: "#f3f3f0",
  led: "#8a1c1c",
  dome: "#f6f7f8",
  sandLit: "#f0d9a8",
  street: "#ff9a4a",
};
const SKIN = 0.004;
const ceiling = BEDROOM.floor + BEDROOM.height;

const tufting = () =>
  drawnTexture("headboard-tufting", 256, 128, (ctx, w, h) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    const step = w / 8;
    ctx.strokeStyle = "#d9d6cf";
    ctx.lineWidth = 2;
    for (let i = -8; i <= 16; i++) {
      ctx.beginPath();
      ctx.moveTo(i * step, 0);
      ctx.lineTo(i * step + h, h);
      ctx.moveTo(i * step, 0);
      ctx.lineTo(i * step - h, h);
      ctx.stroke();
    }
    ctx.fillStyle = "#c9c5bd";
    for (let y = step / 2; y < h; y += step / 2)
      for (let x = ((y / (step / 2)) % 2) * (step / 2); x < w; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
  });

const pillowCover = () =>
  drawnTexture("pillow-cover", 128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#eef0f2";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#8fa3b8";
    for (let y = 0; y < h; y += 16)
      for (let x = (y / 16) % 2 === 0 ? 0 : 8; x < w; x += 16) {
        ctx.beginPath();
        ctx.ellipse(x + 4, y + 8, 2.5, 5, Math.PI / 5, 0, 2 * Math.PI);
        ctx.fill();
      }
  });

const radiatorProfile = () =>
  drawnTexture("radiator-profile", 128, 32, (ctx, w, h) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#e1e1de";
    for (let x = 0; x < w; x += 6) ctx.fillRect(x, 0, 2, h);
  });

const woodchip = () => {
  const base = drawnTexture("woodchip", 256, 256, (ctx, w, h) => {
    const random = seeded(1407);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = random() < 0.5 ? "#ecebe6" : "#f6f5f1";
      ctx.beginPath();
      ctx.ellipse(random() * w, random() * h, 1 + 1.5 * random(), 0.6 + random(), random() * Math.PI, 0, 2 * Math.PI);
      ctx.fill();
    }
  });
  const texture = base.clone();
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.needsUpdate = true;
  return texture;
};

const box = (part: Part, color: string, extra: Partial<React.ComponentProps<typeof ToonBox>> = {}) => (
  <ToonBox key={`${part.name}-${part.center.join(",")}`} position={part.center} size={part.size} color={color} {...extra} />
);

const HANDLE_WHITE = "#f1f0ea";

const paints: Readonly<Record<string, string>> = {
  "west wall": WALL_WHITE,
  "east wall": WALL_WHITE,
  "back wall": WALL_WHITE,
  skirting: "#ffffff",
  "window sill": "#f4f4f1",
  "window reveal": WALL_WHITE,
  "curtain rail": "#e9e9e6",
  "bed rail": COLOURS.leather,
  "bed foot rail": COLOURS.leather,
  "bed leg": COLOURS.legs,
  thermostat: "#f8f8f6",
  "light switch": "#f7f7f4",
  socket: "#f7f7f4",
};

const Shell: React.FC = () => {
  const parts = bedroomParts();
  const ceilingMap = useMemo(woodchip, []);
  const windowSkins = parts
    .filter((p) => p.name === "window wall")
    .map((p) => boundsPart(p.name, [p.center[0] - p.size[0] / 2, p.center[0] + p.size[0] / 2], [p.center[1] - p.size[1] / 2, p.center[1] + p.size[1] / 2], [BEDROOM.z1 - SKIN, BEDROOM.z1]));
  const frame = parts.filter((p) => p.name.endsWith("lining") || p.name.endsWith("casing"));
  return (
    <group>
      <RoomSlabs room={BEDROOM} floor={BEDROOM.floor} ceiling="#ffffff" ceilingMap={ceilingMap} />
      <PartBoxes parts={parts.filter((p) => p.name.endsWith(" wall") && p.name !== "window wall")} color={WALL_WHITE} outline={false} />
      <PartBoxes parts={windowSkins} color={WALL_WHITE} outline={false} />
      <PartBoxes
        parts={parts.filter((p) => ["skirting", "window sill", "window reveal", "curtain rail", "thermostat", "light switch", "socket"].includes(p.name))}
        color={(p) => paints[p.name]}
        outline={false}
      />
      {frame.map((p) => box(p, "#ffffff", { map: alder(), ink: 0.004 }))}
      {parts.filter((p) => p.name.startsWith("window handle")).map((p) => box(p, HANDLE_WHITE, { ink: 0.004 }))}
    </group>
  );
};

const Door: React.FC<{ readonly angle: number }> = ({ angle }) => (
  <DoorLeaf door={BEDROOM_DOOR} angle={angle} color="#ffffff" map={alder()}>
    <DoorGrips door={BEDROOM_DOOR} />
  </DoorLeaf>
);

const Bed: React.FC = () => {
  const parts = bedroomParts();
  const of = (name: string) => parts.filter((p) => p.name === name);
  const mattress = of("mattress")[0];
  const pillow = useMemo(() => cushionGeometry(PILLOWS[0].size), []);
  return (
    <group>
      {of("headboard").map((p) => box(p, "#ffffff", { map: tufting() }))}
      <PartBoxes parts={[...of("bed rail"), ...of("bed foot rail"), ...of("bed leg")]} color={(p) => paints[p.name]} />
      {box(mattress, COLOURS.sheet, { ink: 0.008 })}
      {PILLOWS.map((p, i) => (
        <mesh key={i} geometry={pillow} position={p.center} rotation={[0, p.yaw, 0]}>
          <meshToonMaterial color="#ffffff" map={pillowCover()} />
        </mesh>
      ))}
    </group>
  );
};

const CABINET_FRONT = { top: 0.025, gap: 0.006, drawer: 0.15, knob: 0.012 };

const Cabinet: React.FC<{ readonly part: Part }> = ({ part }) => {
  const [cx, , cz] = part.center;
  const [w, h, d] = part.size;
  const bottom = part.center[1] - h / 2;
  const front = cx + w / 2;
  const body = h - CABINET_FRONT.top;
  const drawerTop = bottom + body - CABINET_FRONT.gap;
  const drawerBottom = drawerTop - CABINET_FRONT.drawer;
  const doorTop = drawerBottom - CABINET_FRONT.gap;
  const doorBottom = bottom + 0.05;
  const panel = (y0: number, y1: number) => boundsPart("front", [front, front + 0.004], [y0, y1], [cz - d / 2 + 0.01, cz + d / 2 - 0.01]);
  const knob = (y: number): Vec3 => [front + 0.004 + CABINET_FRONT.knob / 2, y, cz];
  return (
    <group>
      <ToonBox position={[cx, bottom + body / 2, cz]} size={[w, body, d]} color={COLOURS.cabinet} ink={CABINET_INK} />
      <ToonBox position={[cx, bottom + body + CABINET_FRONT.top / 2, cz]} size={[w, CABINET_FRONT.top, d]} color="#ffffff" map={wildOak()} ink={CABINET_INK} />
      {box(panel(drawerBottom, drawerTop), COLOURS.cabinet, { ink: 0.003 })}
      {box(panel(doorBottom, doorTop), COLOURS.cabinet, { ink: 0.003 })}
      {[(drawerTop + drawerBottom) / 2, doorTop - 0.06].map((y) => (
        <ToonBox key={y} position={knob(y)} size={[CABINET_FRONT.knob, 0.02, 0.02]} color="#bfc1c3" ink={0.002} />
      ))}
    </group>
  );
};

const Lamp: React.FC<{ readonly lamp: BedsideLamp; readonly on: boolean }> = ({ lamp, on }) => {
  const [x, y, z] = lamp.base;
  const shadeY = y + lamp.height - lamp.shadeHeight / 2;
  const socketTop = shadeY - lamp.shadeHeight / 2 + 0.04;
  return (
    <group>
      <ToonCylinder position={[x, y + 0.0125, z]} radius={lamp.foot / 2} height={0.025} segments={32} color={COLOURS.foot} ink={0.004} />
      <ToonCylinder position={[x, (y + socketTop) / 2, z]} radius={0.01} height={socketTop - y} segments={12} color={COLOURS.foot} ink={0.003} />
      <ToonCylinder
        position={[x, shadeY, z]}
        radius={lamp.shade / 2}
        height={lamp.shadeHeight}
        segments={40}
        capped={false}
        color={on ? COLOURS.shadeLit : COLOURS.shade}
        glow={{ color: COLOURS.shadeLit, light: on ? 1.2 : 0 }}
        ink={0.005}
      />
    </group>
  );
};

const CORD_SEGMENTS = 48;

const Cord: React.FC<{ readonly points: readonly Vec3[] }> = ({ points }) => {
  const geometry = useDisposable(() => new TubeGeometry(cordCurve(points), CORD_SEGMENTS, CORD_SWITCH.cord / 2, 6, false), [points]);
  return (
    <mesh geometry={geometry} userData={NO_INK}>
      <meshToonMaterial color={CORD_SWITCH.color} />
    </mesh>
  );
};

const CordSwitches: React.FC = () => (
  <group>
    {SWITCHED_CORDS.map(({ switch: sw, strands }, i) => (
      <group key={i}>
        <ToonBox position={sw.center} rotation={[0, sw.yaw, 0]} size={sw.size} color={CORD_SWITCH.color} />
        {strands.map((points, j) => (
          <Cord key={j} points={points} />
        ))}
      </group>
    ))}
  </group>
);

const Radiator: React.FC = () => (
  <ToonBox position={RADIATOR.center} size={RADIATOR.size} color="#ffffff" map={radiatorProfile()} />
);

const glowMap = (u0: number, u1: number, v0: number, v1: number) =>
  drawnTexture(`curtain-glow-${u0.toFixed(2)}-${u1.toFixed(2)}`, 256, 128, (ctx, w, h) => {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);
    ctx.filter = "blur(10px)";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(u0 * w, (1 - v1) * h, (u1 - u0) * w, (v1 - v0) * h);
    ctx.filter = "none";
  });

export const CURTAIN_DAYLIGHT = 0.8;
export const BEDSIDE_GLOW = 1;
export const NIGHT_GLOW = { room: 0.15, curtain: 0.1 };

const CurtainPanel: React.FC<{ readonly c: CurtainShape; readonly daylight: number; readonly streetGlow: number }> = ({ c, daylight, streetGlow }) => {
  const width = c.x1 - c.x0;
  const height = c.top - c.bottom;
  const geometry = useDisposable(
    () => bentPlane([width, height], [c.folds * 8, 1], (x) => c.amplitude * Math.sin((2 * Math.PI * c.folds * x) / width)),
    [width, height, c.folds, c.amplitude],
  );
  const u0 = Math.max(0, (c.x1 - PANE.x1) / width);
  const u1 = Math.min(1, (c.x1 - PANE.x0) / width);
  const behind = u1 > u0;
  const emissive = useMemo(
    () => new Color(COLOURS.sandLit).multiplyScalar(CURTAIN_DAYLIGHT * daylight).add(new Color(COLOURS.street).multiplyScalar(NIGHT_GLOW.curtain * streetGlow)),
    [daylight, streetGlow],
  );
  const lit = behind && (daylight > 0 || streetGlow > 0);
  return (
    <mesh geometry={geometry} position={[c.x1, c.bottom, c.z]} rotation={[0, Math.PI, 0]}>
      <meshToonMaterial
        color={CURTAIN_SAND}
        side={DoubleSide}
        {...(lit
          ? {
              emissive,
              emissiveMap: glowMap(u0, u1, (PANE.y0 - c.bottom) / height, (PANE.y1 - c.bottom) / height),
              emissiveIntensity: 1,
            }
          : {})}
      />
    </mesh>
  );
};

const Curtain: React.FC<{ readonly open: CurtainOpen; readonly daylight: number; readonly streetGlow: number }> = ({ open, daylight, streetGlow }) => (
  <>
    {curtainPanels(open).map((c, i) => (
      <CurtainPanel key={i} c={c} daylight={daylight} streetGlow={streetGlow} />
    ))}
  </>
);

const Pelmet: React.FC = () => {
  const pelmet = bedroomParts().find((p) => p.name === "pelmet")!;
  return box(pelmet, "#ffffff", { map: wildOak(), ink: 0.004 });
};

const CeilingFittings: React.FC = () => (
  <group>
    <mesh position={DOME_LAMP.center} rotation={[Math.PI, 0, 0]}>
      <sphereGeometry args={[DOME_LAMP.diameter / 2, 32, 12, 0, 2 * Math.PI, 0, Math.PI / 2]} />
      <meshToonMaterial color={COLOURS.dome} />
    </mesh>
    <ToonCylinder
      position={[SMOKE_ALARM.center[0], ceiling - SMOKE_ALARM.height / 2, SMOKE_ALARM.center[2]]}
      radius={SMOKE_ALARM.diameter / 2}
      height={SMOKE_ALARM.height}
      segments={32}
      color={COLOURS.alarm}
      ink={0.004}
    />
    <mesh position={[SMOKE_ALARM.center[0] + 0.025, ceiling - SMOKE_ALARM.height - 0.0005, SMOKE_ALARM.center[2]]} rotation={[Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.003, 12]} />
      <meshBasicMaterial color={COLOURS.led} />
    </mesh>
  </group>
);

const InnerGlass: React.FC = () => (
  <PaneFacingIn pane={INNER_GLASS}>
    <meshBasicMaterial color={COLOURS.glass} transparent opacity={INNER_GLASS.tint} depthWrite={false} />
  </PaneFacingIn>
);

export const Bedroom: React.FC<{
  readonly door: number;
  readonly lamps: readonly [boolean, boolean];
  readonly curtain: CurtainOpen;
  readonly daylight: number;
  readonly streetGlow: number;
}> = ({ door, lamps, curtain, daylight, streetGlow }) => (
  <group>
    <Shell />
    <Door angle={door} />
    <Bed />
    {CABINETS.map((part, i) => (
      <Cabinet key={i} part={part} />
    ))}
    {LAMPS.map((lamp, i) => (
      <Lamp key={i} lamp={lamp} on={lamps[i]} />
    ))}
    <CordSwitches />
    <Radiator />
    <Curtain open={curtain} daylight={daylight} streetGlow={streetGlow} />
    <InnerGlass />
    <Pelmet />
    <CeilingFittings />
  </group>
);

const STREET_GLOW = { distance: 4.5, inside: 0.8 };
const LAMP_GLOW = { distance: 6 };
const NIGHT_FILL = 0.12;

export const BedroomLighting: React.FC<{
  readonly lamps: readonly [boolean, boolean];
  readonly daylight: number;
  readonly streetGlow: number;
  readonly curtain: CurtainOpen;
}> = ({ lamps, daylight, streetGlow, curtain }) => (
  <>
    <hemisphereLight args={["#cdd4dd", "#8a8072", NIGHT_FILL + (1 - NIGHT_FILL) * daylightIn(daylight, curtain)]} />
    {streetGlow > 0 ? (
      <pointLight
        position={[(PANE.x0 + PANE.x1) / 2, (PANE.y0 + PANE.y1) / 2, BEDROOM.z1 - STREET_GLOW.inside]}
        color={COLOURS.street}
        intensity={NIGHT_GLOW.room * streetGlow}
        distance={STREET_GLOW.distance}
        decay={2}
      />
    ) : null}
    {LAMPS.map((lamp, i) =>
      lamps[i] ? (
        <pointLight
          key={i}
          position={[lamp.base[0], lamp.base[1] + lamp.height - lamp.shadeHeight / 2, lamp.base[2]]}
          color={BEDSIDE_LIGHT}
          intensity={BEDSIDE_GLOW}
          distance={LAMP_GLOW.distance}
          decay={2}
        />
      ) : null,
    )}
  </>
);
