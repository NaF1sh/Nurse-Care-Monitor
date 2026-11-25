import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The dictionaries live in a .tsx module that imports React components; parse the
// source text instead of importing it so this test stays dependency-light.
const source = readFileSync(join(process.cwd(), "src/lib/i18n.tsx"), "utf8");

function keysOf(block: string): string[] {
  return [...block.matchAll(/^\s*"([^"]+)":/gm)].map((m) => m[1]!);
}

const enBlock = source.slice(source.indexOf("const en = {"), source.indexOf("} as const;"));
const bnBlock = source.slice(source.indexOf("const bn: Record<StringKey, string> = {"), source.indexOf("const dictionaries"));

const enKeys = keysOf(enBlock);
const bnKeys = keysOf(bnBlock);

describe("i18n dictionaries", () => {
  it("has at least one English string", () => {
    expect(enKeys.length).toBeGreaterThan(0);
  });

  it("translates every English key into Bangla", () => {
    expect(bnKeys.sort()).toEqual([...enKeys].sort());
  });

  it("keeps {placeholder} variables identical between English and Bangla", () => {
    const varsOf = (block: string) => {
      const map = new Map<string, string[]>();
      for (const m of block.matchAll(/^\s*"([^"]+)":\s*"((?:[^"\\]|\\.)*)"/gm)) {
        map.set(m[1]!, [...m[2]!.matchAll(/\{(\w+)\}/g)].map((v) => v[1]!).sort());
      }
      return map;
    };
    const enVars = varsOf(enBlock);
    const bnVars = varsOf(bnBlock);
    for (const [key, vars] of enVars) {
      expect(bnVars.get(key), `placeholders for "${key}"`).toEqual(vars);
    }
  });
});
