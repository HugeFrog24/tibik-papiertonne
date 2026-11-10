import { ToonBox, type Vec3 } from "../toon/primitives";
import { MAILBOX_GRID, mailboxMetresPerPx } from "./layout";
import { MAILBOX_COLOURS } from "./mailboxFace";

export const MailboxFlap: React.FC<{ readonly hinge: Vec3; readonly angle?: number; readonly ink: number }> = ({ hinge, angle = 0, ink }) => {
  const { flap } = MAILBOX_GRID;
  const [sx, sy] = mailboxMetresPerPx();
  const [w, h, lip] = [flap.width * sx, flap.height * sy, flap.lip.height * sy];
  return (
    <group position={hinge} rotation={[-angle, 0, 0]}>
      <ToonBox position={[0, -h / 2, 0]} size={[w, h, flap.thickness]} color={MAILBOX_COLOURS.flap} ink={ink} />
      <ToonBox position={[0, -h + lip / 2, (flap.thickness + flap.lip.proud) / 2]} size={[w, lip, flap.lip.proud]} color={MAILBOX_COLOURS.flap} ink={ink} />
    </group>
  );
};
