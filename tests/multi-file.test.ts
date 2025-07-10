import { describe, it, expect } from "vitest";
import { compile } from "../src/compiler";
import path from "path";

describe("Multi-file test", () => {
  it("should handle multiple file edits correctly", () => {
    const configPath = path.resolve(__dirname, "multi-file");
    const result = compile(
      path.join(configPath, "index.ts"),
      "json"
    );
    expect(JSON.parse(result)).toEqual({
      multiFileValue: "hello from multi-file",
    });
  });
});
