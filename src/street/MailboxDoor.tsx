import { DoorLeaf } from "../building/DoorLeaf";
import { NO_INK, ONE_UNIT } from "../toon/inkWidth";
import { drawnTexture, ToonBox, ToonCylinder } from "../toon/primitives";
import { mailboxCellOf } from "./layout";
import {
  MAILBOX_DOOR,
  MAILBOX_DOOR_SPEC,
  mailboxDoorInked,
  mailboxLockLocal,
} from "./mailboxDoorShape";
import { MAILBOX_COLOURS, drawMailboxCell } from "./mailboxFace";
import { useSignColor } from "../weather/DayLight";

const FACE_LIFT = 0.0003;

const doorFace = () => {
  const cell = mailboxCellOf(MAILBOX_DOOR.resident);
  return drawnTexture(
    `mailbox-door-${MAILBOX_DOOR.resident}`,
    Math.round(cell.w),
    Math.round(cell.h),
    (ctx, w, h) => {
      ctx.fillStyle = MAILBOX_COLOURS.steel;
      ctx.fillRect(0, 0, w, h);
      drawMailboxCell(ctx, { x: 0, y: 0, w, h }, MAILBOX_DOOR.resident, false);
    },
  );
};

export const MailboxDoor: React.FC<{ readonly angle: number }> = ({ angle }) => {
  const signColor = useSignColor();
  const { width: w, height: h, thickness: t } = MAILBOX_DOOR_SPEC;
  const [lx, ly] = mailboxLockLocal();
  const { radius, proud } = MAILBOX_DOOR.lock;
  return (
    <DoorLeaf
      door={MAILBOX_DOOR_SPEC}
      angle={angle}
      color={MAILBOX_COLOURS.steel}
      ink={MAILBOX_DOOR.ink}
      userData={mailboxDoorInked(angle) ? ONE_UNIT : NO_INK}
    >
      <mesh position={[w / 2, h / 2, t / 2 + FACE_LIFT]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color={signColor} map={doorFace()} />
      </mesh>
      <ToonCylinder
        position={[lx, ly, t / 2 + proud / 2]}
        rotation={[Math.PI / 2, 0, 0]}
        radius={radius}
        height={proud}
        segments={20}
        color="#b8b3a6"
        capped={false}
        ink={MAILBOX_DOOR.ink / 2}
      />
      <ToonBox
        position={[lx, ly, t / 2 + proud + 0.0001]}
        size={[0.0016, radius * 1.1, 0.0002]}
        color={MAILBOX_COLOURS.slot}
        outline={false}
      />
    </DoorLeaf>
  );
};
