import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const scripts = ["form-resilience-browser.cjs", "checkbox-picker-browser.cjs", "role-editor-browser.cjs", "admin-account-creation-browser.cjs", "report-export-browser.cjs", "team-report-browser.cjs", "role-workflow-browser.cjs"];
for (const script of scripts) {
  console.log(`Browser suite: ${script}`);
  const result = spawnSync(process.execPath, ["tests/" + script], { cwd: root, env: process.env, stdio: "inherit" });
  if (result.error) { console.error(result.error.message); process.exit(1); }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`Browser suites PASS: ${scripts.length}/${scripts.length}`);
