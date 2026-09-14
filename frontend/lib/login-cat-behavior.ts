export type CatMood = "idle" | "busy" | "success" | "error";
export type CatAction = "idle" | "stretch" | "walk" | "success" | "error";
export type CatClip = "idle" | "look" | "groom" | "tail" | "rest" | "stretch" | "start" | "walk" | "settle" | "success" | "error";
export type CatDirection = 1 | -1;
export type CatDecision = { kind: "wait" } | { kind: "idle"; clip: CatClip } | { kind: "walk"; direction: CatDirection; target: number };

export const CAT_SUCCESS_DELAY_MS = 2400;
export const decisionDelay = (random = Math.random) => 4000 + random() * 3000;
export const walkCooldown = (random = Math.random) => 12000 + random() * 8000;
const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

/** Called while the seated idle video runs. A wait keeps it playing without starting a new action. */
export function decideCatAction(
  context: { now: number; walkAllowedAt: number; x: number; limit: number; direction: CatDirection },
  random = Math.random,
): CatDecision {
  const chance = random();
  if (chance < 0.45) return { kind: "wait" };
  if (chance < 0.7 || context.now < context.walkAllowedAt || context.limit < 12) {
    const clips: CatClip[] = ["look", "groom", "tail", "rest"];
    return { kind: "idle", clip: clips[Math.min(3, Math.floor(random() * clips.length))] };
  }
  const { x, limit } = context;
  const edge = Math.min(24, limit * 0.4);
  let direction = context.direction;
  if (x >= limit - edge) direction = -1;
  else if (x <= -limit + edge) direction = 1;
  else if (random() < 0.2) direction = direction === 1 ? -1 : 1;
  const distance = 55 + random() * 100;
  return { kind: "walk", direction, target: clamp(x + direction * distance, limit) };
}
