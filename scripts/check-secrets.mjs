import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceRoot = path.join(root, "src");
const sourceExtensions = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);
const clientBanned = [
  "SUPABASE_SECRET_KEY",
  "SERVICE_ROLE_KEY",
  "createAdminClient",
];
const globallyBanned = [
  "NEXT_PUBLIC_SUPABASE_SECRET_KEY",
  "NEXT_PUBLIC_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SERVICE_ROLE",
];

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await filesUnder(absolute)));
    } else {
      files.push(absolute);
    }
  }
  return files;
}

const sourceFiles = (await filesUnder(sourceRoot)).filter((file) =>
  sourceExtensions.has(path.extname(file)),
);

const rootEntries = await readdir(root, { withFileTypes: true });
const configFiles = rootEntries
  .filter(
    (entry) =>
      entry.isFile() &&
      (entry.name.startsWith(".env") ||
        entry.name.startsWith("next.config.") ||
        entry.name === "package.json"),
  )
  .map((entry) => path.join(root, entry.name));

const filesForGlobalPublicSecretScan = [...sourceFiles, ...configFiles];
const violations = [];

for (const file of filesForGlobalPublicSecretScan) {
  const fileText = await readFile(file, "utf8");
  const relative = path.relative(root, file);

  for (const token of globallyBanned) {
    if (fileText.includes(token)) {
      violations.push(`${relative}: forbidden public secret token ${token}`);
    }
  }
}

for (const file of sourceFiles) {
  const fileText = await readFile(file, "utf8");
  const relative = path.relative(root, file);
  const firstMeaningfulLine = fileText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("//"));
  const isClientModule =
    firstMeaningfulLine === '"use client";' ||
    firstMeaningfulLine === "'use client';";

  if (isClientModule) {
    for (const token of clientBanned) {
      if (fileText.includes(token)) {
        violations.push(
          `${relative}: client module references server secret boundary ${token}`,
        );
      }
    }
  }
}

const adminModulePath = path.join(root, "src/lib/supabase/admin.ts");
const adminModule = await readFile(adminModulePath, "utf8");
if (!adminModule.includes('import "server-only";')) {
  violations.push(
    "src/lib/supabase/admin.ts: missing server-only compiler boundary marker",
  );
}

if (violations.length > 0) {
  console.error("Secret-boundary check failed:");
  for (const violation of violations) {
    console.error("- " + violation);
  }
  process.exit(1);
}

console.log(
  `Secret-boundary check passed for ${sourceFiles.length} source files and ${configFiles.length} root config/environment files.`,
);
