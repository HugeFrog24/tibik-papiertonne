import { CALM_FONT } from "./fonts";

export const CAPTION_BOX = {
  left: 56,
  top: 48,
  width: 600,
  height: 104,
  padding: 26,
  border: 5,
  size: 52,
  fill: "#ffd94a",
  ink: "#1b1b1b",
};

export const Caption: React.FC<{ readonly text: string }> = ({ text }) => (
  <div
    style={{
      position: "absolute",
      left: CAPTION_BOX.left,
      top: CAPTION_BOX.top,
      width: CAPTION_BOX.width,
      height: CAPTION_BOX.height,
      boxSizing: "border-box",
      padding: `0 ${CAPTION_BOX.padding}px`,
      display: "flex",
      alignItems: "center",
      background: CAPTION_BOX.fill,
      border: `${CAPTION_BOX.border}px solid ${CAPTION_BOX.ink}`,
      boxShadow: `6px 6px 0 ${CAPTION_BOX.ink}`,
      fontFamily: CALM_FONT,
      fontWeight: 700,
      fontSize: CAPTION_BOX.size,
      color: CAPTION_BOX.ink,
      whiteSpace: "nowrap",
    }}
  >
    {text}
  </div>
);
