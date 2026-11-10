import { ThreeCanvas } from "@remotion/three";
import { useVideoConfig } from "remotion";
import { InkPass } from "./InkPass";
import { present } from "./present";

export const ToonCanvas: React.FC<{
  readonly name?: string;
  readonly width?: number | undefined;
  readonly height?: number;
  readonly fisheye?: boolean;
  readonly ink?: boolean | undefined;
  readonly children: React.ReactNode;
}> = ({ name, width, height, fisheye = false, ink = true, children }) => {
  const video = useVideoConfig();
  return (
    <ThreeCanvas
      {...present({ name })}
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
