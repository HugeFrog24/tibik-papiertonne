import { after } from "../../characters/scalar";
import { atFrame } from "../../frameRate";
import { enterHouse } from "../enterHouse";

export const WALK_HOME = [-1, 4.2] as const;
export const ENTRY = enterHouse(WALK_HOME[1]);
export const STREET_LAMPS_ON = 0.4;
export const STAIRWELL_ON = ENTRY.indoors[0] + 0.3;
export const LAMP_ON_AT_DUSK = STAIRWELL_ON + 2.6;
export const NACHTRUHE_FILM_JOINS = STAIRWELL_ON - 0.9;
export const DUSK = [0, LAMP_ON_AT_DUSK + 1] as const;

export const WALK_TO_BED = after(DUSK[1] - 1.2, 3);
export const BACK_UP = after(WALK_TO_BED[1] + 0.15, 0.5);
export const SIT_BACK = after(BACK_UP[1] + 0.05, 0.75);
export const ONTO_THE_EDGE = SIT_BACK[0] + 0.35;
export const SWING_IN = after(SIT_BACK[1] + 0.15, 1);
export const LIE_DOWN = after(SWING_IN[1] + 0.2, 1.3);
export const PULL_OVER = after(LIE_DOWN[1] + 0.2, 1.4);
export const BLANKET_UP = PULL_OVER;
export const LAMP_OFF = atFrame(PULL_OVER[1] + 0.8);
export const EVENING = [DUSK[1], LAMP_OFF + 1.6] as const;

export const DRONE = after(EVENING[1], 8);
export const KAREN_OUT = DRONE[0] + 4.6;
export const DAWN = [DRONE[0] + 4, DRONE[1]] as const;
export const RAIN_BUILDS = [DRONE[0] + 1, DRONE[1]] as const;

export const EYES_OPEN = after(DAWN[1] + 1, 0.3);
export const BLANKET_BACK = after(EYES_OPEN[1] + 0.8, 1.2);
export const SIT_UP = after(BLANKET_BACK[1] + 0.2, 1.3);
export const SWING_OUT = after(SIT_UP[1] + 0.1, 1);
export const GET_DOWN = after(SWING_OUT[1] + 0.1, 0.65);
export const WALK_ROUND = after(GET_DOWN[1] + 0.05, 3.2);
const CURTAIN_STROKE = { pull: 2.0 };
export const CURTAIN_PULLS = [after(WALK_ROUND[1] + 0.3, CURTAIN_STROKE.pull)];
export const CURTAIN_PULL = [CURTAIN_PULLS[0][0], CURTAIN_PULLS[CURTAIN_PULLS.length - 1][1]] as const;
export const MORNING = [DAWN[1], CURTAIN_PULL[1] + 0.8] as const;

export const NACHTRUHE_DURATION = MORNING[1];
