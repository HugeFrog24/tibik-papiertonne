import { useMemo } from "react";
import { Euler, Matrix4 } from "three";
import { frame, type Obb } from "../../physics/collision";
import { Karton } from "../../street/Karton";
import { ToonBox } from "../../toon/primitives";
import {
  BOOK,
  PARCEL,
  TAPE_ROLL,
  parcelFrame,
  parcelOrder,
  tapeRollFrame,
  tapeStripAt,
} from "./parcel";
import { TUCKED, tuckedAt } from "./carry";

const COLOURS = {
  cover: "#7b2f2b",
  pages: "#efe6d2",
  tape: "#8a5a2b",
  core: "#c9a46a",
  hole: "#2b2622",
};

const ACROSS: [number, number, number] = [Math.PI / 2, 0, 0];

const Disc: React.FC<{
  readonly radius: number;
  readonly width: number;
  readonly color: string;
}> = ({ radius, width, color }) => (
  <mesh rotation={ACROSS}>
    <cylinderGeometry args={[radius, radius, width, 40]} />
    <meshToonMaterial color={color} />
  </mesh>
);

const Roll: React.FC<{ readonly taping: number }> = ({ taping }) => {
  const matrix = useMemo(() => tapeRollFrame(taping), [taping]);
  return (
    <group matrixAutoUpdate={false} matrix={matrix}>
      <Disc
        radius={TAPE_ROLL.radius}
        width={TAPE_ROLL.width}
        color={COLOURS.tape}
      />
      <Disc
        radius={TAPE_ROLL.core}
        width={TAPE_ROLL.width + 0.002}
        color={COLOURS.core}
      />
      <Disc
        radius={TAPE_ROLL.core - 0.004}
        width={TAPE_ROLL.width + 0.004}
        color={COLOURS.hole}
      />
    </group>
  );
};

const Piece: React.FC<{ readonly piece: Obb }> = ({ piece }) => {
  const matrix = useMemo(
    () =>
      new Matrix4()
        .makeBasis(piece.axes[0], piece.axes[1], piece.axes[2])
        .setPosition(piece.center),
    [piece],
  );
  return (
    <group matrixAutoUpdate={false} matrix={matrix}>
      <mesh>
        <boxGeometry
          args={[2 * piece.half[0], 2 * piece.half[1], 2 * piece.half[2]]}
        />
        <meshToonMaterial color={COLOURS.tape} />
      </mesh>
    </group>
  );
};

const ParcelAssembly: React.FC<{
  readonly closed: number;
  readonly taping: number;
  readonly relabelled?: boolean;
}> = ({ closed, taping, relabelled }) => (
  <>
    <Karton
      position={PARCEL.position}
      rotation={PARCEL.rotation}
      size={PARCEL.size}
      open={PARCEL.open}
      closed={closed}
      order={parcelOrder()}
      splay={PARCEL.splay}
      relabelled={relabelled}
    />
    <ToonBox
      position={BOOK.center}
      size={BOOK.size}
      color={COLOURS.cover}
      ink={0.003}
    />
    <ToonBox
      position={[
        BOOK.center[0],
        BOOK.center[1] + 0.001,
        BOOK.center[2] + 0.004,
      ]}
      size={[BOOK.size[0] - 0.006, BOOK.size[1] - 0.006, BOOK.size[2]]}
      color={COLOURS.pages}
      outline={false}
    />
    {tapeStripAt(taping).map((piece) => (
      <Piece key={piece.name} piece={piece} />
    ))}
  </>
);

const LABEL_OUTWARD = new Matrix4().makeRotationY(Math.PI);

export const CarriedParcel: React.FC<{
  readonly swap: number;
  readonly taping: number;
}> = ({ swap, taping }) => {
  const matrix = useMemo(
    () =>
      frame(new Matrix4(), tuckedAt(swap), new Euler(...TUCKED.rotation))
        .multiply(LABEL_OUTWARD)
        .multiply(parcelFrame().clone().invert()),
    [swap],
  );
  return (
    <group matrixAutoUpdate={false} matrix={matrix}>
      <ParcelAssembly closed={1} taping={taping} relabelled />
    </group>
  );
};

export const FlurProps: React.FC<{
  readonly closed: number;
  readonly taping: number;
  readonly carried: boolean;
}> = ({ closed, taping, carried }) => (
  <group>
    {carried ? null : <ParcelAssembly closed={closed} taping={taping} />}
    <Roll taping={taping} />
  </group>
);
