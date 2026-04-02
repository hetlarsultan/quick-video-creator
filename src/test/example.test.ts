import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadProjects, saveProjects, type Project } from "@/lib/storage";

const largeInlineImage = `data:image/png;base64,${"a".repeat(200_000)}`;

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "1",
    title: "test",
    type: "text-to-image",
    prompt: "test prompt",
    createdAt: Date.now(),
    status: "ready",
    durationSec: 10,
    style: "cinematic",
    outputs: ["generated-image.png"],
    ...overrides,
  };
}

describe("project storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("drops oversized inline media before persisting", () => {
    saveProjects([
      createProject({
        generatedImageUrl: largeInlineImage,
        sourceImageUrl: largeInlineImage,
      }),
    ]);

    const [stored] = loadProjects();
    expect(stored.generatedImageUrl).toBeUndefined();
    expect(stored.sourceImageUrl).toBeUndefined();
  });

  it("falls back to metadata-only save when storage quota is exceeded", () => {
    const originalSetItem = Storage.prototype.setItem;
    let firstCall = true;

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (key, value) {
      if (firstCall) {
        firstCall = false;
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      }

      return originalSetItem.call(this, key, value);
    });

    saveProjects([
      createProject({
        generatedImageUrl: "https://example.com/image.png",
        sourceImageUrl: largeInlineImage,
        outputs: ["a", "b", "c", "d", "e", "f", "g"],
      }),
    ]);

    const [stored] = loadProjects();
    expect(stored.generatedImageUrl).toBe("https://example.com/image.png");
    expect(stored.sourceImageUrl).toBeUndefined();
    expect(stored.outputs).toEqual(["a", "b", "c", "d", "e", "f"]);
  });
});
