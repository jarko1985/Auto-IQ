import { describe, it, expect } from "vitest";
import { chunkText } from "@/features/knowledge/chunking";

describe("chunkText", () => {
  it("returns no chunks for empty input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n\n  ")).toEqual([]);
  });

  it("keeps a short document as a single chunk", () => {
    const chunks = chunkText("This is a short paragraph about brake pads.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.index).toBe(0);
    expect(chunks[0]?.content).toContain("brake pads");
  });

  it("splits long text into multiple chunks bounded by maxChars", () => {
    const paragraph = "The engine misfire code P0300 indicates random cylinder misfire. ".repeat(
      40,
    );
    const text = [paragraph, paragraph, paragraph].join("\n\n");
    const chunks = chunkText(text, { maxChars: 500, overlapChars: 50 });

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeLessThanOrEqual(500 + 50 + 2); // soft limit + overlap
    }
  });

  it("assigns sequential zero-based indexes", () => {
    const paragraph = "Word ".repeat(200);
    const text = [paragraph, paragraph, paragraph].join("\n\n");
    const chunks = chunkText(text, { maxChars: 300 });

    chunks.forEach((chunk, i) => expect(chunk.index).toBe(i));
  });

  it("estimates a positive token count for every chunk", () => {
    const chunks = chunkText("Replace the timing belt every 100,000 km.");
    expect(chunks[0]?.tokenCount).toBeGreaterThan(0);
  });

  it("hard-splits a single sentence longer than maxChars", () => {
    const longSentence = "a".repeat(1000);
    const chunks = chunkText(longSentence, { maxChars: 300, overlapChars: 0 });
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("carries the exact tail of the previous chunk as overlap", () => {
    const paragraphA = "Symptom description sentence about brakes. ".repeat(7); // ~300 chars, under maxChars
    const paragraphB = "Recommended repair steps for the technician. ".repeat(7);
    const text = [paragraphA.trim(), paragraphB.trim()].join("\n\n");
    const chunks = chunkText(text, { maxChars: 400, overlapChars: 80 });

    expect(chunks).toHaveLength(2);
    expect(chunks[1]!.content.startsWith(chunks[0]!.content.slice(-80))).toBe(true);
  });
});
