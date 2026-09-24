import { describe, expect, it } from "vitest";
import { isBlockedPath, isInside, normalizePath } from "../src/paths.js";

describe("path normalization (contract §84)", () => {
  it("collapses traversal segments", () => {
    expect(normalizePath("repo/dist/../src/./main.ts")).toBe("repo/src/main.ts");
    expect(normalizePath("/var/www/../../etc/passwd")).toBe("/etc/passwd");
    expect(normalizePath("C:/work/repo/../../windows/system32")).toBe("C:/windows/system32");
  });

  it("keeps relative escapes visible", () => {
    expect(normalizePath("../../../etc/passwd")).toBe("../../../etc/passwd");
  });

  it("normalizes windows separators", () => {
    expect(normalizePath("C:\\work\\repo\\src\\file.ts")).toBe("C:/work/repo/src/file.ts");
  });
});

describe("worktree containment", () => {
  const roots = ["C:/work/repo/issue-12"];

  it("allows paths inside the worktree", () => {
    expect(isInside("C:/work/repo/issue-12/src/main.ts", roots)).toBe(true);
    expect(isInside("C:\\work\\repo\\issue-12\\tests\\x.test.ts", roots)).toBe(true);
    expect(isInside("C:/work/repo/issue-12", roots)).toBe(true);
  });

  it("denies escapes including traversal, siblings, and drive jumps", () => {
    expect(isInside("C:/work/repo/issue-12/../issue-13/src/x.ts", roots)).toBe(false);
    expect(isInside("C:/work/repo/issue-12-evil/src/x.ts", roots)).toBe(false);
    expect(isInside("C:/Users/arc/.ssh/id_rsa", roots)).toBe(false);
    expect(isInside("D:/other/repo/src/x.ts", roots)).toBe(false);
    expect(isInside("/etc/passwd", roots)).toBe(false);
  });

  it("denies UNC paths", () => {
    expect(isInside("//server/share/file", roots)).toBe(false);
  });
});

describe("blocked secret paths (contract §26)", () => {
  it("blocks ssh keys, .env, aws, gnupg, browser password stores", () => {
    expect(isBlockedPath("C:/Users/arc/.ssh/id_rsa")).toBe(true);
    expect(isBlockedPath("repo/.env")).toBe(true);
    expect(isBlockedPath("/home/u/.aws/credentials")).toBe(true);
    expect(isBlockedPath("/home/u/.gnupg/pubring.kbx")).toBe(true);
  });

  it("does not block ordinary repo files", () => {
    expect(isBlockedPath("C:/work/repo/issue-12/src/environment.ts")).toBe(false);
    expect(isBlockedPath("C:/work/repo/issue-12/docs/setup.md")).toBe(false);
  });

  it("supports extra blocked segments per policy", () => {
    expect(isBlockedPath("C:/work/repo/issue-12/vault/keymaster.json", ["keymaster"])).toBe(true);
  });
});
