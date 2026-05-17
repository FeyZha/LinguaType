import { describe, expect, it } from "vitest";
import { normalizePersonalDictionary } from "./personalDictionary";

describe("personalDictionary", () => {
  it("normalizes personal dictionary terms without preserving duplicates", () => {
    expect(normalizePersonalDictionary([" LinguaType ", "linguatype", "", "IELTS"])).toEqual([
      "LinguaType",
      "IELTS",
    ]);
  });
});
