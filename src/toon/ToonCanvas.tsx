import { ThreeCanvas } from "@remotion/three";
import { useVideoConfig } from "remotion";
import { InkPass } from "./InkPass";

export const ToonCanvas: React.FC<{
  readonly name?: string;
  readonly width?: number;
  readonly height?: number;
  readonly fisheye?: boolean;
  readonly ink?: boolean;
  readonly children: React.ReactNode;
}> = ({ name, width, height, fisheye = false, ink = true, children }) => {
  const video = useVideoConfig();
  return (
    <ThreeCanvas
      name={name}
      width={width ?? video.width}
      height={height ?? video.height}
      shadows="percentage"
      flat
    >
      {children}
      {ink ? <InkPass fisheye={fisheye} /> : null}
    </ThreeCanvas>
  );
};
