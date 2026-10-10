// Layers only depend downward: core imports no UI framework; react imports no component library.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const rules = [
  { dir: "src/core", banned: /from "(react|react-dom|@mui|@emotion|@fortawesome|@tiptap|@codemirror)/ },
  { dir: "src/react", banned: /from "(@mui|@emotion|@fortawesome|@tiptap|@codemirror)/ },
];

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(name) ? [p] : [];
  });

let failed = false;
for (const { dir, banned } of rules) {
  for (const file of walk(dir)) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (banned.test(line)) {
        failed = true;
        console.error(`${file}:${i + 1}: ${line.trim()}`);
      }
    });
  }
}
if (failed) {
  console.error("Layer boundary violated: see above.");
  process.exit(1);
}
console.log("layer boundaries ok");
