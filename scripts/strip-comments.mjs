import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { extname, join } from "node:path";
import ts from "typescript";

const ROOTS = ["src", "scripts", "remotion.config.ts", "eslint.config.mjs"];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const DIRECTIVE = /^(\/\/\/|\/[/*]\s*(eslint|@ts-|prettier-ignore|@jsx|global\s))/;
const SHADER = /gl_|#include|uniform |varying /;

const filesUnder = (path) =>
  statSync(path).isDirectory()
    ? readdirSync(path).flatMap((name) => filesUnder(join(path, name)))
    : EXTENSIONS.has(extname(path))
      ? [path]
      : [];

const lineBounds = (text, start, end) => {
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  const newline = text.indexOf("\n", end);
  const lineEnd = newline === -1 ? text.length : newline;
  return { lineStart, lineEnd, newline };
};

const removal = (text, start, end) => {
  const { lineStart, lineEnd, newline } = lineBounds(text, start, end);
  const before = text.slice(lineStart, start);
  const after = text.slice(end, lineEnd);
  if (before.trim() === "" && after.trim() === "") {
    return [lineStart, newline === -1 ? text.length : newline + 1];
  }
  if (after.trim() === "") {
    return [start - (before.length - before.trimEnd().length), end];
  }
  return [start, end + (after.length - after.trimStart().length)];
};

const shaderCommentLines = (text, start, end) => {
  const ranges = [];
  const body = text.slice(start, end);
  if (!SHADER.test(body)) {
    return ranges;
  }
  const pattern = /^[ \t]*\/\/[^\n]*\n/gm;
  for (let match = pattern.exec(body); match; match = pattern.exec(body)) {
    ranges.push([start + match.index, start + match.index + match[0].length]);
  }
  return ranges;
};

const strip = (path) => {
  const text = readFileSync(path, "utf8");
  const kind = path.endsWith(".tsx") || path.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, kind);
  const comments = new Map();
  const cuts = [];
  const collect = (list) => {
    for (const range of list ?? []) {
      const body = text.slice(range.pos, range.end);
      if (!DIRECTIVE.test(body)) {
        comments.set(range.pos, range.end);
      }
    }
  };
  const visit = (node) => {
    if (node.kind !== ts.SyntaxKind.JsxText) {
      collect(ts.getLeadingCommentRanges(text, node.getFullStart()));
      collect(ts.getTrailingCommentRanges(text, node.getEnd()));
    }
    if (node.kind === ts.SyntaxKind.JsxExpression && !node.expression) {
      cuts.push(removal(text, node.getStart(source), node.getEnd()));
    }
    if (
      node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral ||
      node.kind === ts.SyntaxKind.TemplateHead ||
      node.kind === ts.SyntaxKind.TemplateMiddle ||
      node.kind === ts.SyntaxKind.TemplateTail
    ) {
      cuts.push(...shaderCommentLines(text, node.getStart(source), node.getEnd()));
    }
    for (const child of node.getChildren(source)) {
      visit(child);
    }
  };
  visit(source);
  for (const [start, end] of comments) {
    cuts.push(removal(text, start, end));
  }
  if (cuts.length === 0) {
    return false;
  }
  cuts.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const cut of cuts) {
    const last = merged[merged.length - 1];
    if (last && cut[0] <= last[1]) {
      last[1] = Math.max(last[1], cut[1]);
    } else {
      merged.push([...cut]);
    }
  }
  let result = "";
  let at = 0;
  for (const [start, end] of merged) {
    result += text.slice(at, start);
    at = end;
  }
  result += text.slice(at);
  result = result.replace(/\n{3,}/g, "\n\n").replace(/^\n+/, "");
  if (result === text) {
    return false;
  }
  writeFileSync(path, result);
  return true;
};

const changed = ROOTS.filter((root) => existsSync(root))
  .flatMap(filesUnder)
  .filter(strip);
console.log(changed.length === 0 ? "No comments found." : `Stripped comments from ${changed.length} files:\n${changed.join("\n")}`);
