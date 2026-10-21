import { describe, expect, it } from "vitest";
import { parseMoney, parseOptionalMoney } from "@jojobuilds/api-client";

describe("major-unit form input", () => {
  it("converts amounts exactly without decimal multiplication", () => {
    expect(parseMoney("45000.10")).toBe(4500010);
    expect(parseMoney("0.29")).toBe(29);
  });
  it.each(["0", "-1", "1.001", "1e4", "1,000", "Infinity", ""])(
    "rejects ambiguous or unsupported input %s",
    (value) => {
      expect(() => parseMoney(value)).toThrow();
    },
  );
  it("allows an explicit zero but does not silently discard invalid optional amounts", () => {
    expect(parseOptionalMoney("0.00", 500)).toBe(0);
    expect(parseOptionalMoney("", 500)).toBe(500);
    expect(() => parseOptionalMoney("-1", 500)).toThrow();
    expect(() => parseOptionalMoney("not money", 500)).toThrow();
  });
});
