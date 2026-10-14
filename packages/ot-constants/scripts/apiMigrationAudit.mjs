#!/usr/bin/env node
/**
 * API migration audit
 * ===================
 *
 * Reproduces the analysis used to migrate the disease page to a new GraphQL API:
 *
 *   1. fetches the SDL of the old and the new API (introspection) and, unless
 *      `--no-types` is given, runs graphql-codegen for both (same plugins and
 *      config as codegen.ts);
 *   2. diffs the two schemas (`schema.diff`, `types.diff`, added/removed types);
 *   3. collects every GraphQL document of the audited page(s): `.gql` files plus
 *      inline gql`...` template literals in `.ts`/`.tsx`, fragments resolved
 *      across the whole set;
 *   4. validates each document against both schemas;
 *   5. for every schema type the page touches, lists the fields, arguments,
 *      enum values and union members that changed;
 *   6. writes `<out>/<page>/report.md` plus a copy of each (fragment-complete)
 *      document in `<out>/<page>/queries/`.
 *
 * Usage (from the repo root, node 22+):
 *
 *   yarn workspace @ot/constants apiMigrationAudit --page target
 *   yarn workspace @ot/constants apiMigrationAudit --page drug --page variant --no-types
 *   yarn workspace @ot/constants apiMigrationAudit --all
 *   yarn workspace @ot/constants apiMigrationAudit --page disease --include apps/platform/src/components/AssociationsToolkit
 *
 * Options:
 *   --page <name>      one of: disease, target, drug, variant, study, credibleSet,
 *                      evidence, search, home, api, downloads, metrics, projects,
 *                      analysis, shared (repeatable)
 *   --all              every document under apps/platform/src and packages/{ui,sections}/src
 *   --include <dir>    extra directory (relative to the repo root) to scan (repeatable)
 *   --old <url>        old API endpoint (default: $OLD_API_URL or the dev v4 API)
 *   --new <url>        new API endpoint (default: $NEW_API_URL or the ng "latest" API)
 *   --out <dir>        output directory (default: apps/platform/migrations, git-ignored)
 *   --no-types         skip graphql-codegen (schema fetch + diff only, much faster)
 *   --reuse-schemas    do not refetch schemas that already exist in <out>
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildClientSchema,
  buildSchema,
  getIntrospectionQuery,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isObjectType,
  isUnionType,
  Kind,
  lexicographicSortSchema,
  NoUnusedFragmentsRule,
  parse,
  printSchema,
  specifiedRules,
  TypeInfo,
  validate,
  visit,
  visitWithTypeInfo,
} from "graphql";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../..");

const DEFAULT_OLD = "https://dev.opentargets.xyz/api/v4/graphql";
const DEFAULT_NEW = "https://ng.opentargets.org:8080/latest/graphql";

const PAGES = {
  disease: ["apps/platform/src/pages/DiseasePage", "packages/sections/src/disease", "packages/sections/src/common"],
  target: ["apps/platform/src/pages/TargetPage", "packages/sections/src/target", "packages/sections/src/common"],
  drug: ["apps/platform/src/pages/DrugPage", "packages/sections/src/drug", "packages/sections/src/common"],
  variant: ["apps/platform/src/pages/VariantPage", "packages/sections/src/variant", "packages/sections/src/common"],
  study: ["apps/platform/src/pages/StudyPage", "packages/sections/src/study"],
  credibleSet: ["apps/platform/src/pages/CredibleSetPage", "packages/sections/src/credibleSet"],
  evidence: ["apps/platform/src/pages/EvidencePage", "packages/sections/src/evidence"],
  search: ["apps/platform/src/pages/SearchPage"],
  home: ["apps/platform/src/pages/HomePage"],
  api: ["apps/platform/src/pages/APIPage"],
  downloads: ["apps/platform/src/pages/DownloadsPage"],
  metrics: ["apps/platform/src/pages/MetricsPage"],
  projects: ["apps/platform/src/pages/ProjectsPage"],
  analysis: ["apps/platform/src/pages/AnalysisPage"],
  // components and ui pieces every page may use (associations toolkit, facets, clinical reports, ...)
  shared: ["apps/platform/src/components", "packages/ui/src"],
};
const ALL_DIRS = ["apps/platform/src", "packages/sections/src", "packages/ui/src"];

/* ----------------------------------------------------------------- CLI */

function parseArgs(argv) {
  const args = { pages: [], include: [], types: true, reuseSchemas: false, all: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--page") args.pages.push(next());
    else if (a === "--include") args.include.push(next());
    else if (a === "--old") args.old = next();
    else if (a === "--new") args.new = next();
    else if (a === "--out") args.out = next();
    else if (a === "--no-types") args.types = false;
    else if (a === "--reuse-schemas") args.reuseSchemas = true;
    else if (a === "--all") args.all = true;
    else if (a === "--help" || a === "-h") {
      console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0]);
      process.exit(0);
    } else throw new Error(`Unknown argument ${a}`);
  }
  for (const page of args.pages) {
    if (!PAGES[page]) throw new Error(`Unknown page "${page}". Known pages: ${Object.keys(PAGES).join(", ")}`);
  }
  if (!args.all && args.pages.length === 0 && args.include.length === 0) {
    throw new Error("Nothing to audit: pass --page <name>, --include <dir> or --all (see --help)");
  }
  return args;
}

/* ------------------------------------------------------------- schemas */

async function fetchSdl(url) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: getIntrospectionQuery({ descriptions: true }) }),
  });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const { data, errors } = await response.json();
  if (errors) throw new Error(`${url}: ${JSON.stringify(errors)}`);
  return printSchema(lexicographicSortSchema(buildClientSchema(data)));
}

async function generateTypes(urls, out) {
  const { generate } = await import("@graphql-codegen/cli");
  const plugins = ["typescript", "typescript-operations", "typescript-graphql-request"];
  const config = { gqlTagName: "gql", rawRequest: false };
  await generate(
    {
      overwrite: true,
      silent: true,
      generates: {
        [join(out, "old/index.ts")]: { schema: urls.old, plugins, config },
        [join(out, "new/index.ts")]: { schema: urls.new, plugins, config },
      },
    },
    true
  );
}

function unifiedDiff(a, b, target) {
  const result = spawnSync("diff", ["-u", a, b], { encoding: "utf8", maxBuffer: 1 << 28 });
  writeFileSync(target, result.stdout ?? "");
  return (result.stdout ?? "").split("\n").length;
}

/* ----------------------------------------------------------- documents */

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (/\.(gql|graphql|ts|tsx)$/.test(entry) && !entry.endsWith(".d.ts")) files.push(full);
  }
  return files;
}

// every document of a file: a .gql file is one document, a .ts/.tsx file may
// contain several gql`...` literals (interpolations are dropped: they are
// fragments resolved from the registry below, or runtime strings)
function extractDocuments(file) {
  const source = readFileSync(file, "utf8");
  const rel = relative(REPO_ROOT, file);
  if (/\.(gql|graphql)$/.test(file)) return [{ id: rel, source }];
  const docs = [];
  const re = /\bgql`([\s\S]*?)`/g;
  let match;
  let i = 0;
  while ((match = re.exec(source))) {
    const body = match[1].replace(/\$\{[^}]*\}/g, "");
    if (!/\b(query|mutation|fragment|subscription)\b/.test(body)) continue;
    docs.push({ id: `${rel}#${i++}`, source: body });
  }
  return docs;
}

function collectDocuments(dirs) {
  const seen = new Set();
  const docs = [];
  for (const dir of dirs) {
    for (const file of walk(join(REPO_ROOT, dir))) {
      if (seen.has(file)) continue;
      seen.add(file);
      for (const doc of extractDocuments(file)) {
        try {
          doc.ast = parse(doc.source);
        } catch (error) {
          doc.parseError = error.message;
        }
        docs.push(doc);
      }
    }
  }
  return docs.sort((a, b) => a.id.localeCompare(b.id));
}

function buildFragmentRegistry(docs) {
  const registry = new Map();
  for (const doc of docs) {
    if (!doc.ast) continue;
    for (const def of doc.ast.definitions) {
      if (def.kind === Kind.FRAGMENT_DEFINITION) registry.set(def.name.value, def);
    }
  }
  return registry;
}

// `<Entity>ProfileSummaryFragment` is built at runtime by `summaryUtils.createSummaryFragment`
// from the summary fragments of the profile widgets; rebuild it from every fragment on that
// entity type in the scanned set (a superset of what the page spreads)
function synthesizeProfileSummaryFragment(name, registry) {
  const match = /^(\w+)ProfileSummaryFragment$/.exec(name);
  if (!match) return null;
  const entity = match[1];
  const spreads = [...registry.values()]
    .filter(f => f.typeCondition.name.value === entity && f.name.value !== name)
    .map(f => `...${f.name.value}`);
  const fragment = parse(
    `fragment ${name} on ${entity} { ${spreads.length ? spreads.join(" ") : "__typename"} }`
  ).definitions[0];
  registry.set(name, fragment);
  return fragment;
}

// the document plus every fragment it spreads (transitively) that it does not define itself
function withFragments(doc, registry) {
  const defined = new Set(
    doc.ast.definitions.filter(d => d.kind === Kind.FRAGMENT_DEFINITION).map(d => d.name.value)
  );
  const definitions = [...doc.ast.definitions];
  const missing = [];
  const queue = [...definitions];
  while (queue.length) {
    const def = queue.pop();
    visit(def, {
      FragmentSpread(node) {
        const name = node.name.value;
        if (defined.has(name)) return;
        defined.add(name);
        const fragment = registry.get(name) ?? synthesizeProfileSummaryFragment(name, registry);
        if (fragment) {
          definitions.push(fragment);
          queue.push(fragment);
        } else missing.push(name);
      },
    });
  }
  return { ast: { kind: Kind.DOCUMENT, definitions }, missing };
}

const RULES = specifiedRules.filter(rule => rule !== NoUnusedFragmentsRule);

function validateDocument(ast, schema) {
  return validate(schema, ast, RULES).map(error => error.message);
}

// named schema types a document touches (parent types, field types, argument and variable types)
function usedTypes(ast, schema) {
  const typeInfo = new TypeInfo(schema);
  const names = new Set();
  const add = type => {
    if (!type) return;
    let named = type;
    while (named.ofType) named = named.ofType;
    if (named.name && !named.name.startsWith("__")) names.add(named.name);
  };
  visit(
    ast,
    visitWithTypeInfo(typeInfo, {
      Field() {
        add(typeInfo.getParentType());
        add(typeInfo.getType());
      },
      Argument() {
        add(typeInfo.getArgument()?.type);
      },
      VariableDefinition(node) {
        let t = node.type;
        while (t.type) t = t.type;
        names.add(t.name.value);
      },
      FragmentDefinition(node) {
        names.add(node.typeCondition.name.value);
      },
      InlineFragment(node) {
        if (node.typeCondition) names.add(node.typeCondition.name.value);
      },
    })
  );
  return names;
}

/* ---------------------------------------------------------- type diffs */

function fieldSignature(field) {
  const args = field.args?.length
    ? `(${field.args.map(a => `${a.name}: ${a.type}${a.defaultValue !== undefined ? ` = ${JSON.stringify(a.defaultValue)}` : ""}`).join(", ")})`
    : "";
  return `${args}: ${field.type}`;
}

function diffType(name, oldSchema, newSchema) {
  const oldType = oldSchema.getType(name);
  const newType = newSchema.getType(name);
  if (!oldType) return null;
  if (!newType) return { name, removed: true, lines: [] };
  const lines = [];
  if (isObjectType(oldType) || isInterfaceType(oldType) || isInputObjectType(oldType)) {
    if (!(isObjectType(newType) || isInterfaceType(newType) || isInputObjectType(newType))) {
      return { name, lines: [`kind changed to ${newType.astNode?.kind ?? newType.constructor.name}`] };
    }
    const oldFields = oldType.getFields();
    const newFields = newType.getFields();
    for (const f of Object.keys(oldFields)) {
      if (!newFields[f]) lines.push(`removed field \`${f}${fieldSignature(oldFields[f])}\``);
      else {
        const a = fieldSignature(oldFields[f]);
        const b = fieldSignature(newFields[f]);
        if (a !== b) lines.push(`changed \`${f}\`: \`${a}\` -> \`${b}\``);
      }
    }
    for (const f of Object.keys(newFields)) {
      if (!oldFields[f]) lines.push(`added field \`${f}${fieldSignature(newFields[f])}\``);
    }
  } else if (isEnumType(oldType) && isEnumType(newType)) {
    const a = new Set(oldType.getValues().map(v => v.name));
    const b = new Set(newType.getValues().map(v => v.name));
    for (const v of a) if (!b.has(v)) lines.push(`removed value \`${v}\``);
    for (const v of b) if (!a.has(v)) lines.push(`added value \`${v}\``);
  } else if (isUnionType(oldType) && isUnionType(newType)) {
    const a = new Set(oldType.getTypes().map(t => t.name));
    const b = new Set(newType.getTypes().map(t => t.name));
    for (const v of a) if (!b.has(v)) lines.push(`removed member \`${v}\``);
    for (const v of b) if (!a.has(v)) lines.push(`added member \`${v}\``);
  } else if (oldType.constructor !== newType.constructor) {
    lines.push("kind changed");
  }
  return lines.length ? { name, lines } : null;
}

/* -------------------------------------------------------------- report */

function auditPage(pageName, dirs, schemas, out, urls) {
  const docs = collectDocuments(dirs);
  const registry = buildFragmentRegistry(docs);
  const pageDir = join(out, pageName);
  mkdirSync(join(pageDir, "queries"), { recursive: true });

  const results = [];
  const touched = new Set();
  for (const doc of docs) {
    if (!doc.ast) {
      results.push({ doc, parseError: doc.parseError });
      continue;
    }
    const { ast, missing } = withFragments(doc, registry);
    const oldErrors = validateDocument(ast, schemas.old);
    const newErrors = validateDocument(ast, schemas.new);
    if (oldErrors.length === 0) for (const t of usedTypes(ast, schemas.old)) touched.add(t);
    results.push({ doc, missing, oldErrors, newErrors });
    const fileName = doc.id.replace(/[\/#]/g, "__").replace(/\.(gql|graphql|tsx?)$/, "") + ".graphql";
    writeFileSync(
      join(pageDir, "queries", fileName),
      ast.definitions.map(d => doc.source.slice(d.loc?.start ?? 0, d.loc?.end ?? 0) || "").join("\n\n") || doc.source
    );
  }

  const typeDiffs = [...touched]
    .sort()
    .map(name => diffType(name, schemas.old, schemas.new))
    .filter(Boolean);

  const failingNew = results.filter(r => r.newErrors?.length);
  const failingOld = results.filter(r => r.oldErrors?.length);
  const parseFailures = results.filter(r => r.parseError);

  const md = [];
  md.push(`# API migration audit: ${pageName}`);
  md.push("");
  md.push(`Generated ${new Date().toISOString()} by \`packages/ot-constants/scripts/apiMigrationAudit.mjs\`.`);
  md.push("");
  md.push(`- Old API: ${urls.old}`);
  md.push(`- New API: ${urls.new}`);
  md.push(`- Scanned: ${dirs.map(d => `\`${d}\``).join(", ")}`);
  md.push(`- Documents: ${results.length} (${failingOld.length} fail on the old API, ${failingNew.length} fail on the new API, ${parseFailures.length} could not be parsed)`);
  md.push(`- Schemas, codegen output and full diffs: \`${relative(REPO_ROOT, out)}/{old,new,schema.diff,types.diff}\``);
  md.push(`- Copies of each document with its fragments resolved: \`${relative(REPO_ROOT, pageDir)}/queries/\``);
  md.push("");

  md.push("## Documents failing against the new API");
  md.push("");
  if (!failingNew.length) md.push("None.");
  for (const r of failingNew) {
    md.push(`### ${r.doc.id}`);
    md.push("");
    for (const e of r.newErrors) md.push(`- ${e}`);
    if (r.missing.length) md.push(`- (fragments not found in the scanned set: ${r.missing.join(", ")})`);
    md.push("");
  }

  md.push("## Documents still valid against the new API");
  md.push("");
  const ok = results.filter(r => r.newErrors && r.newErrors.length === 0);
  md.push(ok.length ? ok.map(r => `- ${r.doc.id}`).join("\n") : "None.");
  md.push("");
  md.push("Note: a valid document can still change behaviour (new pagination defaults, `Page.size` must be >= 1, nullability changes). Check the type changes below.");
  md.push("");

  if (failingOld.length || parseFailures.length) {
    md.push("## Documents that do not validate against the old API (already migrated, or outside this schema)");
    md.push("");
    for (const r of failingOld) md.push(`- ${r.doc.id}: ${r.oldErrors[0]}${r.oldErrors.length > 1 ? ` (+${r.oldErrors.length - 1})` : ""}`);
    for (const r of parseFailures) md.push(`- ${r.doc.id}: parse error: ${r.parseError}`);
    md.push("");
  }

  md.push("## Schema types used by these documents that changed");
  md.push("");
  if (!typeDiffs.length) md.push("None.");
  for (const t of typeDiffs) {
    md.push(`### ${t.name}${t.removed ? " (removed from the new API)" : ""}`);
    md.push("");
    for (const line of t.lines) md.push(`- ${line}`);
    md.push("");
  }

  writeFileSync(join(pageDir, "report.md"), md.join("\n"));
  return { pageName, total: results.length, failingNew: failingNew.length, failingOld: failingOld.length, typeDiffs: typeDiffs.length, reportPath: join(pageDir, "report.md") };
}

function schemaSummary(oldSdl, newSdl, out) {
  const names = sdl =>
    new Set(
      [...sdl.matchAll(/^(?:type|input|enum|interface|union|scalar) (\w+)/gm)].map(m => m[1])
    );
  const a = names(oldSdl);
  const b = names(newSdl);
  const removed = [...a].filter(n => !b.has(n)).sort();
  const added = [...b].filter(n => !a.has(n)).sort();
  writeFileSync(
    join(out, "schema-summary.md"),
    [
      "# Schema summary",
      "",
      `Types removed in the new API (${removed.length}): ${removed.join(", ") || "none"}`,
      "",
      `Types added in the new API (${added.length}): ${added.join(", ") || "none"}`,
      "",
    ].join("\n")
  );
  return { removed: removed.length, added: added.length };
}

/* ---------------------------------------------------------------- main */

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const urls = {
    old: args.old ?? process.env.OLD_API_URL ?? DEFAULT_OLD,
    new: args.new ?? process.env.NEW_API_URL ?? DEFAULT_NEW,
  };
  const out = resolve(REPO_ROOT, args.out ?? "apps/platform/migrations");
  mkdirSync(join(out, "old"), { recursive: true });
  mkdirSync(join(out, "new"), { recursive: true });

  const sdlPaths = { old: join(out, "old/schema.graphql"), new: join(out, "new/schema.graphql") };
  for (const which of ["old", "new"]) {
    if (args.reuseSchemas && existsSync(sdlPaths[which])) {
      console.log(`reusing ${sdlPaths[which]}`);
      continue;
    }
    console.log(`fetching ${which} schema from ${urls[which]}`);
    writeFileSync(sdlPaths[which], await fetchSdl(urls[which]));
  }
  const sdl = { old: readFileSync(sdlPaths.old, "utf8"), new: readFileSync(sdlPaths.new, "utf8") };
  const schemas = { old: buildSchema(sdl.old), new: buildSchema(sdl.new) };

  const summary = schemaSummary(sdl.old, sdl.new, out);
  const schemaDiffLines = unifiedDiff(sdlPaths.old, sdlPaths.new, join(out, "schema.diff"));
  console.log(`schema.diff: ${schemaDiffLines} lines; ${summary.removed} types removed, ${summary.added} added`);

  if (args.types) {
    console.log("running graphql-codegen for both APIs (use --no-types to skip)");
    await generateTypes(urls, out);
    const typesDiffLines = unifiedDiff(join(out, "old/index.ts"), join(out, "new/index.ts"), join(out, "types.diff"));
    console.log(`types.diff: ${typesDiffLines} lines`);
  }

  const targets = [];
  if (args.all) targets.push({ name: "all", dirs: ALL_DIRS });
  for (const page of args.pages) targets.push({ name: page, dirs: [...PAGES[page], ...args.include] });
  if (!args.pages.length && !args.all && args.include.length) targets.push({ name: "custom", dirs: args.include });

  console.log("");
  for (const target of targets) {
    const r = auditPage(target.name, target.dirs, schemas, out, urls);
    console.log(
      `${r.pageName}: ${r.total} documents, ${r.failingNew} fail on the new API, ${r.failingOld} fail on the old API, ${r.typeDiffs} used types changed -> ${relative(REPO_ROOT, r.reportPath)}`
    );
  }
}

main().catch(error => {
  console.error(error.message ?? error);
  process.exit(1);
});
