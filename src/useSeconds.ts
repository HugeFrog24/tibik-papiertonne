import { useCurrentFrame, useVideoConfig } from "remotion";

export const useSeconds = () => useCurrentFrame() / useVideoConfig().fps;
