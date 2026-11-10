import { ToonBox, addVec } from "../toon/primitives";
import {
  CHEST,
  CHIME,
  CLOCK,
  COAT_RACK,
  INTERCOM,
  LIGHT_SWITCH,
} from "./flurShape";
import { WallBox } from "./WallBox";
import { clockFace, wildOak } from "./interiorTextures";

const COLOURS = {
  wood: "#a5764c",
  drawer: "#b8875a",
  knob: "#4a4440",
  hook: "#3c3a38",
  chrome: "#c9cbcd",
  plastic: "#ece8df",
  handset: "#ddd5c4",
  grille: "#b9b2a5",
};

const ChestOfDrawers: React.FC = () => {
  const [w, h, d] = CHEST.size;
  const front = w / 2;
  const height = (h - 0.08) / CHEST.drawers;
  return (
    <group>
      <ToonBox
        position={[...CHEST.center]}
        size={[w, h, d]}
        color="#ffffff"
        map={wildOak()}
      />
      {Array.from({ length: CHEST.drawers }, (_, i) => {
        const y = -h / 2 + 0.04 + height * (i + 0.5);
        return (
          <group key={i}>
            <ToonBox
              position={addVec(CHEST.center, [front + 0.005, y, 0])}
              size={[0.01, height - 0.03, d - 0.06]}
              color="#e6d2bd"
              map={wildOak()}
              ink={0.004}
            />
            <ToonBox
              position={addVec(CHEST.center, [front + 0.02, y, 0])}
              size={[0.02, 0.02, 0.08]}
              color={COLOURS.knob}
              ink={0.003}
            />
          </group>
        );
      })}
    </group>
  );
};

const CoatRack: React.FC = () => {
  const [d, h, w] = COAT_RACK.size;
  const wall = COAT_RACK.center[0] + d / 2;
  const top = COAT_RACK.center[1] + h / 2;
  const z = COAT_RACK.center[2];
  return (
    <group>
      <ToonBox
        position={[wall - COAT_RACK.panel / 2, COAT_RACK.center[1], z]}
        size={[COAT_RACK.panel, h, w]}
        color="#ffffff"
        map={wildOak()}
      />
      <ToonBox
        position={[
          wall - COAT_RACK.shelf.depth / 2,
          top - COAT_RACK.shelf.height / 2,
          z,
        ]}
        size={[COAT_RACK.shelf.depth, COAT_RACK.shelf.height, w]}
        color="#ffffff"
        map={wildOak()}
        ink={0.004}
      />
      <ToonBox
        position={[wall - COAT_RACK.shelf.depth + 0.03, top - 0.06, z]}
        size={[0.02, 0.02, w - 0.03]}
        color={COLOURS.chrome}
        ink={0.003}
      />
      {Array.from({ length: COAT_RACK.hooks }, (_, i) => (
        <ToonBox
          key={i}
          position={[
            wall - COAT_RACK.panel - 0.03,
            top - 0.32,
            z + (i - 0.5) * (w / 2),
          ]}
          size={[0.06, 0.04, 0.02]}
          color={COLOURS.chrome}
          ink={0.003}
        />
      ))}
    </group>
  );
};

const Clock: React.FC = () => {
  const [w, , d] = CLOCK.size;
  return (
    <group position={[...CLOCK.center]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[w / 2, w / 2, d, 48]} />
        <meshToonMaterial color="#151515" />
      </mesh>
      <mesh position={[0, 0, d / 2 + 0.001]}>
        <circleGeometry args={[w / 2 - 0.006, 48]} />
        <meshBasicMaterial map={clockFace()} />
      </mesh>
    </group>
  );
};

const Chime: React.FC = () => (
  <group>
    <ToonBox
      position={[...CHIME.center]}
      size={[...CHIME.size]}
      color={COLOURS.plastic}
      ink={0.004}
    />
    <ToonBox
      position={addVec(CHIME.center, [-CHIME.size[0] / 2 - 0.002, 0, 0])}
      size={[0.004, CHIME.size[1] * 0.5, CHIME.size[2] * 0.6]}
      color={COLOURS.grille}
      outline={false}
    />
  </group>
);

const Intercom: React.FC = () => {
  const [d, h, w] = INTERCOM.size;
  return (
    <group>
      <ToonBox
        position={addVec(INTERCOM.center, [d / 4, 0, 0])}
        size={[d / 2, h, w]}
        color={COLOURS.plastic}
        ink={0.004}
      />
      <ToonBox
        position={addVec(INTERCOM.center, [-d / 4, 0, 0])}
        size={[d / 2, h * 0.9, w * 0.45]}
        color={COLOURS.handset}
        ink={0.004}
      />
    </group>
  );
};

const LightSwitch: React.FC = () => (
  <WallBox
    on={{ position: [...LIGHT_SWITCH.center], normal: [-1, 0, 0] }}
    size={[LIGHT_SWITCH.size[2], LIGHT_SWITCH.size[1], LIGHT_SWITCH.size[0]]}
    color="#f2f0ea"
  >
    <mesh>
      <planeGeometry args={[0.055, 0.055]} />
      <meshToonMaterial color="#e3e0d8" />
    </mesh>
  </WallBox>
);

export const FlurSet: React.FC = () => (
  <group>
    <ChestOfDrawers />
    <CoatRack />
    <Clock />
    <Chime />
    <Intercom />
    <LightSwitch />
  </group>
);
