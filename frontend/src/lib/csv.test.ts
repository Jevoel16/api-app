import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("returns an empty string for no rows", () => {
    expect(toCsv([])).toBe("");
  });

  it("writes a quoted header and rows in key order", () => {
    expect(toCsv([{ site: "Iligan City", rain: 12.5 }])).toBe('"site","rain"\n"Iligan City","12.5"');
  });

  it("doubles embedded quotes and keeps commas inside fields", () => {
    expect(toCsv([{ note: 'say "hi", ok' }])).toBe('"note"\n"say ""hi"", ok"');
  });

  it("writes null and undefined as empty, but keeps 0 and false", () => {
    expect(toCsv([{ a: null, b: undefined, c: 0, d: false }])).toBe('"a","b","c","d"\n"","","0","false"');
  });
});
