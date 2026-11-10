import { NO_INK } from "../toon/inkWidth";

export type Pane = { readonly x: number; readonly y: number; readonly z: number; readonly w: number; readonly h: number };

export const PaneFacingIn: React.FC<{ readonly pane: Pane; readonly children: React.ReactNode }> = ({ pane, children }) => (
  <mesh position={[pane.x, pane.y, pane.z]} rotation={[0, Math.PI, 0]} userData={NO_INK}>
    <planeGeometry args={[pane.w, pane.h]} />
    {children}
  </mesh>
);
