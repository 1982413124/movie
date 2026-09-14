import assert from "node:assert/strict";
import { test } from "node:test";

import { formatMemberSince, maskEmail, maskPhone } from "./memberProfile.mjs";

test("member email keeps only a short prefix and domain", () => {
  assert.equal(maskEmail("taro.yamada@example.com"), "ta***@example.com");
  assert.equal(maskEmail("a@example.com"), "a***@example.com");
  assert.equal(maskEmail("invalid-address"), "");
});

test("member phone keeps only a non-sensitive prefix and the final four digits", () => {
  assert.equal(maskPhone("090-1234-5678"), "090-****-5678");
  assert.equal(maskPhone("03-1234-5678"), "03-****-5678");
  assert.equal(maskPhone("12"), "");
});

test("member registration timestamp is formatted in the Japan time zone", () => {
  assert.equal(formatMemberSince("2026-04-01T00:00:00+09:00"), "2026年4月1日");
  assert.equal(formatMemberSince(""), "");
  assert.equal(formatMemberSince("not-a-date"), "");
});
