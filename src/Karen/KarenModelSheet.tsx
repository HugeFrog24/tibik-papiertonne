import { ToonCanvas } from "../toon/ToonCanvas";
import { AbsoluteFill } from "remotion";
import { CameraRig, INK, type Vec3 } from "../toon/primitives";
import { KAREN_POINTING, KAREN_REST, Karen } from "./Karen";

const BACKGROUND = "#f4f1ea";

const Studio: React.FC = () => (
  <>
    <hemisphereLight args={["#ffffff", "#9a9488", 1.6]} />
    <directionalLight
      position={[3, 6, 5]}
      intensity={2.2}
      castShadow
      shadow-mapSize={[4096, 4096]}
      shadow-bias={-0.0008}
      shadow-normalBias={0.045}
      shadow-radius={4}
      shadow-camera-left={-4.5}
      shadow-camera-right={4.5}
      shadow-camera-top={4.5}
      shadow-camera-bottom={-4.5}
    />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[60, 60]} />
      <meshToonMaterial color="#e3ddd0" />
    </mesh>
  </>
);

const Inset: React.FC<{
  readonly left: number;
  readonly width: number;
  readonly name: string;
  readonly camera: {
    readonly position: Vec3;
    readonly target: Vec3;
    readonly fov: number;
  };
  readonly children: React.ReactNode;
}> = ({ left, width, name, camera, children }) => {
  const height = 500;
  return (
    <div
      style={{
        position: "absolute",
        left,
        top: 24,
        width,
        height,
        border: `4px solid ${INK}`,
        borderRadius: 18,
        overflow: "hidden",
        backgroundColor: BACKGROUND,
      }}
    >
      <ToonCanvas name={name} width={width} height={height}>
        <CameraRig
          position={camera.position}
          target={camera.target}
          fov={camera.fov}
        />
        <Studio />
        {children}
      </ToonCanvas>
    </div>
  );
};

const FACE_CAMERA = {
  position: [0, 1.4, 2.6] as Vec3,
  target: [0, 1.36, 0] as Vec3,
  fov: 22,
};

export const KarenModelSheet: React.FC = () => {

  return (
    <AbsoluteFill style={{ backgroundColor: BACKGROUND }}>
      <ToonCanvas name="Karen turnaround">
        <CameraRig position={[0, 1.85, 7]} target={[0, 1.7, 0]} fov={30} />
        <Studio />
        <Karen position={[-2.3, 0, 0]} rotationY={0} pose={KAREN_REST} />
        <Karen position={[-0.65, 0, 0]} rotationY={0.7} pose={KAREN_REST} />
        <Karen
          position={[0.85, 0, 0]}
          rotationY={Math.PI / 2}
          pose={KAREN_REST}
        />
        <Karen position={[2.35, 0, 0]} rotationY={Math.PI} pose={KAREN_REST} />
      </ToonCanvas>
      <Inset left={24} width={290} name="Karen scowling" camera={FACE_CAMERA}>
        <Karen position={[0, 0, 0]} rotationY={0} pose={KAREN_REST} />
      </Inset>
      <Inset
        left={330}
        width={290}
        name="Karen yelling face"
        camera={FACE_CAMERA}
      >
        <Karen
          position={[0, 0, 0]}
          rotationY={0}
          pose={KAREN_REST}
          mouthOpen={1}
        />
      </Inset>
      <Inset
        left={636}
        width={1260}
        name="Karen yelling"
        camera={{ position: [0, 1.4, 2.9], target: [-0.1, 1.05, 0], fov: 30 }}
      >
        <Karen
          position={[0.4, 0, 0]}
          rotationY={-0.5}
          pose={KAREN_POINTING}
          mouthOpen={1}
          pointing
        />
      </Inset>
    </AbsoluteFill>
  );
};
