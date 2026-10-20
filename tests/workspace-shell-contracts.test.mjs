import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const appFrame = await readFile(new URL("../src/components/app-frame.tsx", import.meta.url), "utf8");
const workspaceCss = await readFile(new URL("../src/app/workspace.css", import.meta.url), "utf8");
const globalCss = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("mobile navigation drawer exposes a dismiss control and modal semantics", () => {
  assert.match(appFrame, /className="workspace-sidebar-close"/);
  assert.match(appFrame, /aria-label="Đóng điều hướng"/);
  assert.match(appFrame, /aria-modal=\{drawerActive \|\| undefined\}/);
  assert.match(appFrame, /role=\{drawerActive \? "dialog" : "complementary"\}/);
  assert.match(appFrame, /inert=\{drawerActive\}/);
  assert.match(appFrame, /if \(event\.key === "Escape"\)/);
});

test("drawer focus is moved inside, trapped, restored, and body scroll style is restored", () => {
  assert.match(appFrame, /"\.workspace-sidebar-close, \.workspace-navigation a\[href\]"/);
  assert.match(appFrame, /event\.key !== "Tab"/);
  assert.match(appFrame, /const previousBodyOverflow = document\.body\.style\.overflow/);
  assert.match(appFrame, /document\.body\.style\.overflow = previousBodyOverflow/);
  assert.match(appFrame, /menuToggle\?\.focus\(\)/);
});

test("account details menu closes on Escape, outside pointer interaction, and navigation", () => {
  assert.match(appFrame, /event\.key !== "Escape" \|\| !menu\?\.open/);
  assert.match(appFrame, /closeAccountMenuOutside/);
  assert.match(appFrame, /accountMenuRef\.current\.open = false/);
  assert.doesNotMatch(appFrame, /role="menu"/);
});

test("breadcrumbs include existing role and notification detail routes without inventing links", () => {
  assert.match(appFrame, /"\/admin\/roles"/);
  assert.match(appFrame, /customers\|activities\|personnel\|notifications/);
  assert.match(appFrame, /accounts\|roles/);
  assert.match(appFrame, /return undefined/);
});

test("workspace shell keeps drawer and account panel within mobile viewport", () => {
  assert.match(workspaceCss, /@media \(max-width: 46rem\)/);
  assert.match(workspaceCss, /width: min\(18rem, calc\(100vw - 3rem\)\)/);
  assert.match(workspaceCss, /top: calc\(4\.5rem \+ 0\.25rem\)/);
  assert.match(workspaceCss, /max-height: calc\(100dvh - 5rem\)/);
  assert.match(workspaceCss, /\.table-scroll\s*\{[^}]*max-width: 100%/s);
});

test("keyboard focus remains high contrast and reduced motion is supported", () => {
  assert.match(globalCss, /input:focus-visible,\s*select:focus-visible,\s*textarea:focus-visible\s*\{[^}]*outline: 3px solid #805700/s);
  assert.match(globalCss, /a:focus-visible,[\s\S]*?outline: 3px solid #805700/);
  assert.match(globalCss, /prefers-reduced-motion: reduce/);
  assert.match(workspaceCss, /prefers-reduced-motion: reduce/);
});

test("navigation maintains current-page semantics and icon-only controls have names", () => {
  assert.match(appFrame, /aria-current=\{isActivePath\(pathname, item\.href\) \? "page" : undefined\}/);
  assert.match(appFrame, /aria-label=\{drawerActive \? "Đóng menu" : "Mở menu"\}/);
  assert.match(appFrame, /aria-label="Đóng điều hướng"/);
  assert.match(appFrame, /aria-hidden="true">☰/);
});


test("secondary text and form controls use high-contrast tokens", () => {
  assert.match(globalCss, /--color-muted: #5e6e63/);
  assert.match(globalCss, /border: 1px solid #7d8f83/);
  assert.match(globalCss, /input::placeholder,[\s\S]*?color: #5e6e63/);
});
