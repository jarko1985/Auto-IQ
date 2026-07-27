import { describe, it, expect, vi, beforeEach } from "vitest";

const hoisted = vi.hoisted(() => {
  class FakeAPIError extends Error {
    status?: number;
    constructor(message: string, status?: number) {
      super(message);
      this.name = "APIError";
      this.status = status;
    }
  }
  return { FakeAPIError, createMock: vi.fn() };
});

vi.mock("openai", () => ({
  default: class FakeOpenAI {
    embeddings = { create: hoisted.createMock };
  },
  APIError: hoisted.FakeAPIError,
}));

vi.mock("@/lib/env", () => ({ env: { OPENAI_API_KEY: "test-key" } }));

describe("openai embedding provider", () => {
  beforeEach(() => {
    hoisted.createMock.mockReset();
  });

  it("returns vectors in request order", async () => {
    hoisted.createMock.mockResolvedValue({
      data: [
        { index: 1, embedding: [0.4, 0.5] },
        { index: 0, embedding: [0.1, 0.2] },
      ],
    });

    const { createOpenAIEmbeddingProvider } = await import("@/lib/ai/embeddings");
    const provider = createOpenAIEmbeddingProvider("text-embedding-3-small", 2);
    const vectors = await provider.embed(["first", "second"]);

    expect(vectors).toEqual([
      [0.1, 0.2],
      [0.4, 0.5],
    ]);
  });

  it("returns an empty array without calling the API for no input", async () => {
    const { createOpenAIEmbeddingProvider } = await import("@/lib/ai/embeddings");
    const provider = createOpenAIEmbeddingProvider("text-embedding-3-small", 2);
    const vectors = await provider.embed([]);

    expect(vectors).toEqual([]);
    expect(hoisted.createMock).not.toHaveBeenCalled();
  });

  it("throws a non-transient error when the response count mismatches the request", async () => {
    hoisted.createMock.mockResolvedValue({ data: [{ index: 0, embedding: [0.1] }] });

    const { createOpenAIEmbeddingProvider } = await import("@/lib/ai/embeddings");
    const provider = createOpenAIEmbeddingProvider("text-embedding-3-small", 2);

    await expect(provider.embed(["a", "b"])).rejects.toMatchObject({ transient: false });
  });

  it("marks 429 responses as transient", async () => {
    hoisted.createMock.mockRejectedValue(new hoisted.FakeAPIError("rate limited", 429));

    const { createOpenAIEmbeddingProvider } = await import("@/lib/ai/embeddings");
    const provider = createOpenAIEmbeddingProvider("text-embedding-3-small", 2);

    await expect(provider.embed(["a"])).rejects.toMatchObject({ transient: true });
  });

  it("throws a non-transient error when the API key is missing", async () => {
    vi.doMock("@/lib/env", () => ({ env: {} }));
    vi.resetModules();

    const { createOpenAIEmbeddingProvider } = await import("@/lib/ai/embeddings");
    const provider = createOpenAIEmbeddingProvider("text-embedding-3-small", 2);

    await expect(provider.embed(["a"])).rejects.toMatchObject({ transient: false });
  });
});
