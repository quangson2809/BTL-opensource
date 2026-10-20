import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const globalCss = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("shared design tokens define semantic control, focus, and table colors", () => {
  assert.match(globalCss, /--color-border-control:\s*#7d8f83;/);
  assert.match(globalCss, /--color-focus:\s*#805700;/);
  assert.match(globalCss, /--color-surface-muted:\s*#f0f6f1;/);
  assert.match(globalCss, /--color-table-foreground:\s*#344d3d;/);
});

test("focus and repeated form/table colors consume their semantic tokens", () => {
  assert.match(globalCss, /outline:\s*3px solid var\(--color-focus\);/);
  assert.match(globalCss, /border:\s*1px solid var\(--color-border-control\);/);
  assert.match(globalCss, /background:\s*var\(--color-surface-muted\);/);
  assert.match(globalCss, /color:\s*var\(--color-table-foreground\);/);
  assert.doesNotMatch(globalCss, /outline:\s*3px solid #805700;/);
});
