import { ToonBox } from "../toon/primitives";
import type { Part } from "./building";

export const PartBoxes: React.FC<{
  readonly parts: readonly Part[];
  readonly color: string | ((part: Part) => string);
  readonly outline?: boolean | undefined;
}> = ({ parts, color, outline }) => (
  <>
    {parts.map((part, i) => (
      <ToonBox
        key={i}
        position={part.center}
        size={part.size}
        color={typeof color === "string" ? color : color(part)}
        outline={outline}
      />
    ))}
  </>
);
