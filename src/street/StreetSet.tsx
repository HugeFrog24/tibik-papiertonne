import { AbsoluteFill } from "remotion";
import type { Vec3 } from "../toon/primitives";
import { FOUND_KARTON_SIZE } from "./kartonShape";
import { Karton, Sheet } from "./Karton";
import { BINS, FOUND_SHEET } from "./layout";
import { Tonne } from "./Tonne";
import { WEATHER, type Weather } from "../weather/overcast";

export const INDOOR_SHADOW_RANGE = 150;
export const SUN = {
  position: [-12, 24, 18] as Vec3,
  target: [0, 0, 0] as Vec3,
  intensity: WEATHER.sunny.sun.intensity,
  shadow: {
    left: -21,
    right: 21,
    top: 21,
    bottom: -21,
    near: 1,
    far: 500,
    mapSize: 4096,
  },
};

export const SunLight: React.FC<{
  readonly range?: number;
  readonly normalBias?: number;
  readonly intensity?: number;
  readonly shadows?: boolean;
}> = ({
  range = SUN.shadow.far,
  normalBias = 0.03,
  intensity = SUN.intensity,
  shadows = true,
}) => (
  <directionalLight
    position={SUN.position}
    intensity={intensity}
    castShadow={shadows}
    shadow-mapSize={[SUN.shadow.mapSize, SUN.shadow.mapSize]}
    shadow-camera-left={SUN.shadow.left}
    shadow-camera-right={SUN.shadow.right}
    shadow-camera-top={SUN.shadow.top}
    shadow-camera-bottom={SUN.shadow.bottom}
    shadow-camera-near={SUN.shadow.near}
    shadow-camera-far={range}
    shadow-bias={-0.0008}
    shadow-normalBias={normalBias}
  />
);

export const StreetLighting: React.FC<{ readonly weather?: Weather }> = ({
  weather = "sunny",
}) => {
  const { hemisphere, sun } = WEATHER[weather];
  return (
    <>
      <hemisphereLight
        args={[hemisphere.sky, hemisphere.ground, hemisphere.intensity]}
      />
      <SunLight intensity={sun.intensity} shadows={sun.shadows} />
    </>
  );
};

export const Sky: React.FC<{
  readonly children: React.ReactNode;
  readonly weather?: Weather;
}> = ({ children, weather = "sunny" }) => {
  const [top, bottom] = WEATHER[weather].sky;
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${top} 0%, ${bottom} 70%)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export const BinRow: React.FC<{
  readonly lids: readonly number[];
  readonly boxTaken: boolean;
  readonly emptied?: boolean;
}> = ({ lids, boxTaken, emptied = false }) => (
  <>
    {BINS.map((bin, i) => (
      <Tonne
        key={bin.name}
        position={bin.position}
        kind={bin.kind}
        lidOpen={lids[i]}
      >
        {bin.contents
          .filter(
            (item) => !emptied && !(boxTaken && item.name === FOUND_SHEET),
          )
          .map((item) =>
            item.material === "karton" ? (
              <Karton
                key={item.name}
                position={item.position}
                rotation={item.rotation}
                size={FOUND_KARTON_SIZE}
                open={0}
              />
            ) : (
              <Sheet key={item.name} {...item} material={item.material} />
            ),
          )}
      </Tonne>
    ))}
  </>
);
