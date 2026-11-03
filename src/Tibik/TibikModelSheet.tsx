import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { CameraRig } from "../toon/primitives";
import { TIBIK_REST, Tibik } from "./Tibik";

export const TibikModelSheet: React.FC = () => {
  const { width, height } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#f4f1ea" }}>
      <ThreeCanvas name="Tibik turnaround" width={width} height={height} shadows flat>
        <CameraRig position={[0, 1.0, 7.4]} target={[0, 0.85, 0]} fov={30} />
        <hemisphereLight args={["#ffffff", "#9a9488", 1.6]} />
        <directionalLight
          position={[3, 6, 5]}
          intensity={2.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0008}
          shadow-normalBias={0.03}
        />
        <Tibik position={[-1.8, 0, 0]} rotationY={0} pose={TIBIK_REST} />
        <Tibik position={[-0.6, 0, 0]} rotationY={0.7} pose={TIBIK_REST} />
        <Tibik position={[0.6, 0, 0]} rotationY={Math.PI / 2} pose={TIBIK_REST} />
        <Tibik position={[1.8, 0, 0]} rotationY={Math.PI} pose={TIBIK_REST} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <meshToonMaterial color="#e3ddd0" />
        </mesh>
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
