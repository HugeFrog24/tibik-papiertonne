import { useMemo } from "react";
import { BackSide, DoubleSide, ExtrudeGeometry } from "three";
import {
  Blob,
  INK,
  OUTLINE,
  ToonBox,
  drawnTexture,
  fitText,
  useLabelTexture,
  usePavingTexture,
  type Vec3,
} from "../toon/primitives";
import {
  BALCONIES,
  BALCONY,
  BALCONY_DOOR,
  BUILDING_HEIGHT,
  CAR,
  ENTRANCE_X,
  FACADE_Z,
  MAILBOXES,
  OPENINGS,
  PARKED_CARS,
  STAIR_WINDOW,
  TREE_POSITION,
  WINDOW,
  type Opening,
  type ParkedCar,
  FLOOR_BAND,
  FLATS,
  PLINTH,
} from "./layout";
import { doorFrame } from "../building/doors";
import { ENTRANCE_PARTS, FACADE_THICKNESS, HAUSTUER, HAUSTUER_BAR, facadeOpenings, rectShape } from "./facade";

const PLASTER = "#eadcc0";
const FRAME = "#f6f5f0";
const GLASS = "#6d8ba3";
const SHUTTER = "#c9c6bf";

const RESIDENTS = [...FLATS]
  .sort((a, b) => b.storey - a.storey || (a.side === "links" ? -1 : 1))
  .map((flat) => flat.name);

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

const OpeningView: React.FC<{ readonly opening: Opening }> = ({ opening }) => {
  const [w, h] =
    opening.kind === "window" ? WINDOW.frame : opening.kind === "balcony" ? BALCONY_DOOR.frame : STAIR_WINDOW.frame;
  const inner = { w: w - 2 * BORDER, h: h - 2 * BORDER };
  const plane = (z: number, width: number, height: number, y: number, color: string) => (
    <mesh position={[0, y, z]}>
      <planeGeometry args={[width, height]} />
      <meshToonMaterial color={color} />
    </mesh>
  );
  const shutterDrop = inner.h * opening.shutter;
  return (
    <group position={[opening.x, opening.y, FACADE_Z]}>
      {opening.kind === "stairs" ? (
        <mesh position={[0, 0, LAYER.glass]}>
          <planeGeometry args={[inner.w, inner.h]} />
          <meshToonMaterial color={GLASS} transparent opacity={0.28} side={DoubleSide} depthWrite={false} />
        </mesh>
      ) : (
        plane(LAYER.glass, inner.w, inner.h, 0, GLASS)
      )}
      {opening.kind === "window"
        ?
          plane(LAYER.curtain, inner.w, 0.56, -inner.h / 2 + 0.28, "#efeee6")
        : null}
      {shutterDrop > 0 ? plane(LAYER.shutter, inner.w, shutterDrop, inner.h / 2 - shutterDrop / 2, SHUTTER) : null}
      {opening.kind === "window" ? (
        <>
          <ToonBox position={[0, 0, LAYER.bars]} size={[0.06, inner.h, 0.02]} color={FRAME} outline={false} />
          <ToonBox position={[0, 0.28, LAYER.bars]} size={[inner.w, 0.06, 0.02]} color={FRAME} outline={false} />
        </>
      ) : null}
      <ToonBox position={[0, h / 2 - BORDER / 2, LAYER.frame / 2]} size={[w, BORDER, LAYER.frame]} color={FRAME} />
      <ToonBox position={[0, -h / 2 + BORDER / 2, LAYER.frame / 2]} size={[w, BORDER, LAYER.frame]} color={FRAME} />
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
        <ToonBox position={WINDOW.sill.offset} size={WINDOW.sill.size} color="#b9b5ac" />
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
  readonly index: number;
}> = ({ x, y, index }) => {
  const [w, t, d] = BALCONY.slab;
  const rail = BALCONY.railingHeight;
  return (
    <group position={[x, y, FACADE_Z]}>
      <ToonBox position={[0, -t / 2, d / 2]} size={BALCONY.slab} color="#d8d2c4" />
      <ToonBox position={[0, rail / 2, d - 0.02]} size={[w, rail, 0.04]} color="#8e9399" />
      {[1, -1].map((side) => (
        <ToonBox
          key={side}
          position={[side * (w / 2 - 0.02), rail / 2, (d - 0.04) / 2]}
          size={[0.04, rail, d - 0.04]}
          color="#8e9399"
        />
      ))}
      {index % 3 === 0 ? (
        <group position={[0.4, rail - 0.05, d + 0.08]}>
          <ToonBox size={[0.9, 0.2, 0.18]} color="#a0522d" />
          {[-0.3, 0, 0.3].map((dx) => (
            <Blob key={dx} position={[dx, 0.15, 0]} scale={[0.14, 0.1, 0.1]} color={dx === 0 ? "#d94a5a" : "#5c9a45"} />
          ))}
        </group>
      ) : null}
      {index === 4 ? (
        <group position={[-0.8, rail + 0.25, d - 0.1]} rotation={[0.3, 0.4, 0]}>
          <mesh>
            <sphereGeometry args={[0.32, 24, 12, 0, Math.PI * 2, 0, 0.6]} />
            <meshToonMaterial color="#e8e8e4" side={BackSide} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
};

const doorbellTexture = () =>
  drawnTexture("doorbell-12", 192, 512, (ctx, w, h) => {
    ctx.fillStyle = "#c9c4b5";
    ctx.fillRect(0, 0, w, h);
    const row = (h - 40) / RESIDENTS.length;
    RESIDENTS.forEach((name, i) => {
      const y = 24 + i * row + row / 2;
      ctx.fillStyle = "#f4f1e8";
      ctx.fillRect(16, y - row * 0.32, 120, row * 0.64);
      ctx.fillStyle = "#222222";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      fitText(ctx, name, 22, y + 1, 108, 22, "normal");
      ctx.fillStyle = "#555555";
      ctx.beginPath();
      ctx.arc(160, y, 11, 0, Math.PI * 2);
      ctx.fill();
    });
  });

const mailboxTexture = () =>
  drawnTexture("mailboxes-12", 512, 440, (ctx, w, h) => {
    ctx.fillStyle = "#53595f";
    ctx.fillRect(0, 0, w, h);
    const cols = 3;
    const rows = 4;
    const cw = w / cols;
    const rh = h / rows;
    RESIDENTS.forEach((name, i) => {
      const x = (i % cols) * cw;
      const y = Math.floor(i / cols) * rh;
      ctx.strokeStyle = "#2c3034";
      ctx.lineWidth = 4;
      ctx.strokeRect(x + 4, y + 4, cw - 8, rh - 8);
      ctx.fillStyle = "#1e2124";
      ctx.fillRect(x + 20, y + 22, cw - 40, 10);
      ctx.fillStyle = "#f4f1e8";
      ctx.fillRect(x + 30, y + rh - 40, cw - 60, 22);
      ctx.fillStyle = "#222222";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      fitText(ctx, name, x + cw / 2, y + rh - 28, cw - 70, 18, "normal");
      if (name === "Schulz") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x + 22, y + 44, cw - 44, 38);
        ctx.fillStyle = "#c8102e";
        fitText(ctx, "Bitte keine Werbung!", x + cw / 2, y + 63, cw - 54, 16);
      }
    });
  });

const hydrantTexture = () =>
  drawnTexture("hydrant-sign", 256, 200, (ctx, w, h) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#c8102e";
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, w - 14, h - 14);
    ctx.fillStyle = "#c8102e";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(ctx, "H 80", w / 2, 62, w - 40, 64);
    ctx.fillRect(w / 2 - 3, 100, 6, 80);
    ctx.fillRect(30, 137, w - 60, 6);
    ctx.fillStyle = "#222222";
    fitText(ctx, "1,4", w / 2 - 50, 120, 70, 30);
    fitText(ctx, "3,2", w / 2 + 50, 120, 70, 30);
  });

const HaustuerLeaf: React.FC<{ readonly angle: number }> = ({ angle }) => {
  const { width: w, height: h, thickness: t, handle } = HAUSTUER;
  return (
    <group matrixAutoUpdate={false} matrix={doorFrame(HAUSTUER, angle)}>
      <ToonBox position={[w / 2, h / 2, 0]} size={[w, h, t]} color="#2f4a3d" />
      {[1, -1].map((side) => (
        <ToonBox
          key={side}
          position={[w / 2, 1.38, side * (t / 2 + 0.006)]}
          size={[0.3, 1.3, 0.01]}
          color="#8aa6b8"
          outline={false}
        />
      ))}
      <ToonBox
        position={[handle.x, handle.y, t / 2 + HAUSTUER_BAR.offset]}
        size={[...HAUSTUER_BAR.size]}
        color="#c7c7c2"
      />
      <ToonBox position={[handle.x - 0.05, handle.y, -(t / 2 + 0.03)]} size={[0.12, 0.025, 0.025]} color="#c7c7c2" />
    </group>
  );
};

const Entrance: React.FC<{ readonly x: number; readonly door: number }> = ({ x, door }) => {
  const houseNumber = useLabelTexture("12", "#1f4e9c", "#ffffff", 1.3);
  return (
    <>
      <group position={[x, 0, FACADE_Z]}>
        <ToonBox position={[0, 0.075, 0.25]} size={[1.8, 0.15, 0.5]} color="#a9a59c" />
        <group position={[0.95, 1.4, 0.02]}>
          <ToonBox size={[0.2, 0.5, 0.03]} color="#c9c4b5" />
          <mesh position={[0, 0, 0.021]}>
            <planeGeometry args={[0.19, 0.49]} />
            <meshBasicMaterial map={doorbellTexture()} />
          </mesh>
        </group>
        <mesh position={[0.95, 2.2, 0.02]}>
          <planeGeometry args={[0.3, 0.23]} />
          <meshBasicMaterial map={houseNumber} />
        </mesh>
      </group>
      {ENTRANCE_PARTS.map((part, i) => (
        <ToonBox key={i} position={part.center} size={part.size} color="#585e62" />
      ))}
      <HaustuerLeaf angle={door} />
    </>
  );
};

const Mailboxes: React.FC = () => (
  <group position={[MAILBOXES.center[0], MAILBOXES.center[1], FACADE_Z + MAILBOXES.size[2] / 2]}>
    <ToonBox size={MAILBOXES.size} color="#53595f" />
    <mesh position={[0, 0, MAILBOXES.size[2] / 2 + 0.005]}>
      <planeGeometry args={[MAILBOXES.size[0] - 0.02, MAILBOXES.size[1] - 0.02]} />
      <meshBasicMaterial map={mailboxTexture()} />
    </mesh>
  </group>
);

const plateTexture = (plate: string) =>
  drawnTexture(`plate-${plate}`, 520, 112, (ctx, w, h) => {
    ctx.fillStyle = "#f7f7f2";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, w - 6, h - 6);
    ctx.fillStyle = "#003399";
    ctx.fillRect(6, 6, 52, h - 12);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(ctx, "D", 32, h - 30, 40, 34);
    ctx.fillStyle = "#111111";
    fitText(ctx, plate, w / 2 + 26, h / 2 + 4, w - 90, 78, "bold", "'Arial Narrow', Arial, sans-serif");
  });

const Car: React.FC<{ readonly car: ParkedCar }> = ({ car }) => {
  const [l, , d] = CAR.size;
  const plate = plateTexture(car.plate);
  return (
    <group position={[car.x, 0, CAR.z]}>
      <ToonBox position={[0, 0.62, 0]} size={[l, 0.62, d]} color={car.color} />
      <ToonBox position={[-0.25, 1.15, 0]} size={[2.3, 0.5, d - 0.15]} color={car.color} />
      {[1, -1].map((side) => (
        <ToonBox
          key={side}
          position={[-0.25, 1.17, side * (d / 2 - 0.07)]}
          size={[2.1, 0.36, 0.02]}
          color="#3c4a5c"
          outline={false}
        />
      ))}
      <ToonBox position={[0.92, 1.15, 0]} size={[0.02, 0.4, d - 0.3]} color="#3c4a5c" outline={false} />
      {[-1.35, 1.35].flatMap((wx) =>
        [1, -1].map((side) => (
          <mesh key={`${wx}-${side}`} position={[wx, 0.32, side * (d / 2 - 0.12)]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.32, 0.32, 0.22, 20]} />
            <meshToonMaterial color="#1f2124" />
          </mesh>
        )),
      )}
      {[1, -1].map((end) => (
        <mesh key={end} position={[end * (l / 2 + 0.005), 0.55, 0]} rotation={[0, (end * Math.PI) / 2, 0]}>
          <planeGeometry args={[0.52, 0.11]} />
          <meshBasicMaterial map={plate} />
        </mesh>
      ))}
    </group>
  );
};

const StreetTree: React.FC<{ readonly position: Vec3 }> = ({ position }) => {
  return (
    <group position={position}>
      <ToonBox position={[0, 0.005, 0]} size={[1.2, 0.02, 1.2]} color="#5a4632" />
      <mesh position={[0, 1.6, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.13, 3.2, 16]} />
        <meshToonMaterial color="#6b4e35" />
      </mesh>
      <mesh position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.09 + OUTLINE, 0.13 + OUTLINE, 3.2, 16]} />
        <meshBasicMaterial color={INK} side={BackSide} />
      </mesh>
      <Blob position={[0, 3.6, 0]} scale={[1.2, 0.9, 1.1]} color="#5c9a45" />
      <Blob position={[0.7, 3.2, 0.2]} scale={[0.8, 0.7, 0.8]} color="#5c9a45" />
      <Blob position={[-0.7, 3.3, -0.1]} scale={[0.8, 0.7, 0.8]} color="#5c9a45" />
    </group>
  );
};

const FacadeWall: React.FC = () => {
  const geometry = useMemo(
    () =>
      new ExtrudeGeometry(rectShape({ x0: -15, x1: 15, y0: 0, y1: BUILDING_HEIGHT }, facadeOpenings()), {
        depth: FACADE_THICKNESS,
        bevelEnabled: false,
      }),
    [],
  );
  return (
    <mesh geometry={geometry} position={[0, 0, FACADE_Z - FACADE_THICKNESS]} castShadow receiveShadow>
      <meshToonMaterial color={PLASTER} />
    </mesh>
  );
};

export const Street: React.FC<{
  readonly haustuer?: number;
}> = ({ haustuer = 0 }) => {
  const paving = usePavingTexture(25, 3.33);
  const height = BUILDING_HEIGHT;

  return (
    <>
      <FacadeWall />
      <ToonBox position={[0, height + 0.1, FACADE_Z - 0.15]} size={[30.2, 0.2, 0.5]} color="#b9b2a3" />
      {PLINTH.map((part, i) => (
        <ToonBox key={i} position={part.center} size={part.size} color="#8f877b" outline={false} />
      ))}
      {FLOOR_BAND.map((part, i) => (
        <ToonBox key={i} position={part.center} size={part.size} color="#d9caa9" outline={false} />
      ))}
      {OPENINGS.map((opening) => (
        <OpeningView key={`${opening.kind}-${opening.x}-${opening.y}`} opening={opening} />
      ))}
      {BALCONIES.map(({ x, y }, i) => (
        <Balcony key={`${x}-${y}`} x={x} y={y} index={i} />
      ))}
      <Entrance x={ENTRANCE_X} door={haustuer} />
      <Mailboxes />
      <mesh position={[-3.25, 1.0, FACADE_Z + 0.01]}>
        <planeGeometry args={[0.25, 0.2]} />
        <meshBasicMaterial map={hydrantTexture()} />
      </mesh>

      <mesh position={[0, 0, -0.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 4]} />
        <meshToonMaterial map={paving} />
      </mesh>
      <ToonBox position={[0, -0.06, 1.92]} size={[30, 0.16, 0.24]} color="#bdbab2" />
      <mesh position={[0, -0.12, 11]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 18]} />
        <meshToonMaterial color="#4b4e53" />
      </mesh>
      {PARKED_CARS.map((car) => (
        <Car key={car.x} car={car} />
      ))}

      <StreetTree position={TREE_POSITION} />
    </>
  );
};
