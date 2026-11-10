import test from "node:test";
import assert from "node:assert/strict";
import { decideCatAction, decisionDelay, walkCooldown } from "./login-cat-behavior.ts";

const seated = { now: 30000, walkAllowedAt: 0, x: 0, limit: 70, direction: 1 };
test("a wait decision keeps the current idle motion without starting another action", () => {
  assert.deepEqual(decideCatAction(seated, () => 0.2), { kind: "wait" });
});
test("walking is forbidden throughout the post-walk cooldown", () => {
  for (let now = 0; now < 20000; now += 500) {
    assert.notEqual(decideCatAction({ ...seated, now, walkAllowedAt: 20000 }, () => 0.99).kind, "walk");
  }
  assert.equal(decideCatAction({ ...seated, now: 20000, walkAllowedAt: 20000 }, () => 0.99).kind, "walk");
});
test("the next trip heads away from either edge, even when previously facing out", () => {
  for (const direction of [-1, 1]) {
    const decision = decideCatAction({ ...seated, x: direction * 69, direction }, () => 0.99);
    assert.equal(decision.kind, "walk");
    assert.equal(decision.direction, -direction);
    assert.ok(Math.abs(decision.target) <= seated.limit);
    assert.ok((decision.target - direction * 69) * decision.direction > 0);
  }
});
test("narrow stages still allow idle actions without attempting travel", () => {
  assert.equal(decideCatAction({ ...seated, limit: 5 }, () => 0.99).kind, "idle");
});
test("decision spacing and cooldown have separate ranges", () => {
  assert.equal(decisionDelay(() => 0), 4000);
  assert.equal(decisionDelay(() => 1), 7000);
  assert.equal(walkCooldown(() => 0), 12000);
  assert.equal(walkCooldown(() => 1), 20000);
});
