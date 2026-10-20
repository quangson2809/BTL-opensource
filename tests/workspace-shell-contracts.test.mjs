import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const appFrame = await readFile(new URL("../src/components/app-frame.tsx", import.meta.url), "utf8");
const workspaceCss = await readFile(new URL("../src/app/workspace.css", import.meta.url), "utf8");
const globalCss = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");
const picker = await readFile(new URL("../src/components/searchable-checkbox-picker.tsx", import.meta.url), "utf8");

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
  assert.ok(appFrame.includes('if (/^\\/admin\\/accounts\\/[0-9a-f-]{36}$/i.test(path)) return path;'));
  assert.equal(appFrame.includes("(accounts|roles)"), false);
  assert.match(appFrame, /segments\[index - 2\] === "admin"/);
  assert.match(appFrame, /segments\[index - 1\] === "roles"/);
  assert.match(appFrame, /segments\[index \+ 1\] === "edit"/);
  assert.match(appFrame, /return undefined/);
});

test("workspace shell keeps drawer and account panel within mobile viewport", () => {
  assert.match(workspaceCss, /@media \(max-width: 46rem\)/);
  assert.match(workspaceCss, /width: min\(18rem, calc\(100vw - 3rem\)\)/);
  assert.match(workspaceCss, /top: calc\(4\.5rem \+ 0\.25rem\)/);
  assert.match(workspaceCss, /max-height: calc\(100dvh - 5rem\)/);
  assert.match(workspaceCss, /\.table-scroll\s*\{[^}]*max-width: 100%/s);
});

test("authenticated page header styling is owned by workspace.css", () => {
  assert.doesNotMatch(globalCss, /\.page-header(?:\s|\{|,|\.)/);
  assert.match(workspaceCss, /\.page-header-description\s*\{[^}]*max-width:\s*48rem;[^}]*margin-top:\s*0\.55rem/s);
  assert.match(workspaceCss, /\.page-header-actions\s*\{[^}]*align-items:\s*center/s);
  assert.match(workspaceCss, /\.page-header-actions form button\s*\{\s*margin-top:\s*0;/);
  assert.match(workspaceCss, /@media \(max-width: 46rem\)[\s\S]*?\.page-header-actions > form > button \{ width: 100%; \}/);
  assert.equal([...globalCss.matchAll(/\.loading-indicator\s*\{/g)].length, 0);
  assert.match(workspaceCss, /\.loading-indicator\s*\{\s*width: 1\.5rem;\s*height: 1\.5rem;/s);
  assert.equal([...globalCss.matchAll(/@keyframes\s+idaily-loading-spin/g)].length, 0);
  assert.equal([...workspaceCss.matchAll(/@keyframes\s+workspace-loading/g)].length, 1);
  assert.match(workspaceCss, /\.workspace-sidebar,\s*\.loading-indicator\s*\{[^}]*animation: none/s);
});

test("shared loading state has one base owner and a workspace-only layout modifier", () => {
  assert.match(globalCss, /\.loading-state\s*\{[^}]*padding: clamp\(1\.15rem, 3vw, 2rem\);/s);
  assert.doesNotMatch(workspaceCss, /(^|\n)\.loading-state\s*\{/);
  assert.match(workspaceCss, /\.workspace-content \.loading-state\s*\{\s*min-height: 10rem; align-content: center;\s*\}/);
});

test("record row has one authoritative grid layout while recent activity retains its flex variant", () => {
  assert.equal([...globalCss.matchAll(/^\.record-row\s*\{/gm)].length, 1);
  assert.match(globalCss, /^\.record-row\s*\{\s*display:\s*grid;\s*grid-template-columns:\s*minmax\(0, 1fr\);/m);
  assert.match(globalCss, /\.recent-activity-list \.record-row\s*\{\s*display:\s*flex;/);
  assert.match(globalCss, /@media \(max-width: 46rem\)[\s\S]*?\.record-row, \.action-needed-row \{ align-items: stretch; \}\s*\.action-needed-row \{ flex-direction: column; \}/);
});
test("keyboard focus uses the shared semantic focus token and reduced motion is supported", () => {
  assert.match(globalCss, /--color-focus:\s*#805700;/);
  assert.match(globalCss, /input:focus-visible,\s*select:focus-visible,\s*textarea:focus-visible\s*\{[^}]*outline: 3px solid var\(--color-focus\);/s);
  assert.match(globalCss, /a:focus-visible,[\s\S]*?outline: 3px solid var\(--color-focus\);/);
  assert.match(globalCss, /prefers-reduced-motion: reduce/);
  assert.match(workspaceCss, /prefers-reduced-motion: reduce/);
});

test("navigation maintains current-page semantics and icon-only controls have names", () => {
  assert.match(appFrame, /aria-current=\{isActivePath\(pathname, item\.href\) \? "page" : undefined\}/);
  assert.match(appFrame, /aria-label=\{drawerActive \? "Đóng menu" : "Mở menu"\}/);
  assert.match(appFrame, /aria-label="Đóng điều hướng"/);
  assert.match(appFrame, /aria-hidden="true">☰/);
});


test("secondary text and form controls consume semantic contrast tokens", () => {
  assert.match(globalCss, /--color-muted:\s*#5e6e63;/);
  assert.match(globalCss, /--color-border-control:\s*#7d8f83;/);
  assert.match(globalCss, /border:\s*1px solid var\(--color-border-control\);/);
  assert.match(globalCss, /input::placeholder,[\s\S]*?color: var\(--color-muted\);/);
});

test("required checkbox groups use supported descriptions instead of invalid aria-required", () => {
  assert.doesNotMatch(picker, /aria-required=/);
  assert.match(picker, /aria-describedby=\{required \? id \+ "-required-help" : undefined\}/);
  assert.match(picker, /id=\{id \+ "-required-help"\}/);
  assert.match(picker, /Bắt buộc chọn ít nhất một mục/);
});
