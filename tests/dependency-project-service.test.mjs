import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const parser = require("@typescript-eslint/parser");
test("patched parser project service accepts only explicitly allowed out-of-project files", () => {
  const options = { filePath: "parser-security-fixture.ts", tsconfigRootDir: process.cwd(), projectService: { allowDefaultProject: ["parser-security-fixture.ts"] } };
  assert.ok(parser.parseForESLint("const value: number = 1;", options).services.program);
  assert.throws(() => parser.parseForESLint("const value: number = 1;", { ...options, filePath: "other-security-fixture.ts" }));
});
