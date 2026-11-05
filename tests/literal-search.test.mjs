import assert from "node:assert/strict";
import { test } from "node:test";
import { buildLiteralSearch, sanitizePostgrestOrSearch } from "../src/lib/list-query.mjs";

test("search keeps punctuation but bounds input and removes control characters", () => {
  assert.equal(sanitizePostgrestOrSearch(' A.B_C%*()" '), 'A.B_C%*()"');
  assert.equal(sanitizePostgrestOrSearch("a\u0000b"), "a b");
  assert.equal(sanitizePostgrestOrSearch("a".repeat(201)).length, 200);
});
test("search identifiers cannot inject PostgREST syntax", () => {
  assert.throws(() => buildLiteralSearch(["email,or(id.eq.1)"], "test"));
  assert.throws(() => buildLiteralSearch([], "test"));
  assert.match(buildLiteralSearch(["email"], "a.b"), /^email\.imatch\."/);
});
