import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/features/diagnostics/repository", () => ({
  getSessionById: vi.fn(),
  findActiveShareLink: vi.fn(),
  createShareLink: vi.fn(),
  revokeShareLink: vi.fn(),
  findShareLinkByToken: vi.fn(),
  incrementShareLinkView: vi.fn(),
}));

vi.mock("@/features/knowledge/service", () => ({
  getCitationDocuments: vi.fn().mockResolvedValue([]),
}));

import * as repo from "@/features/diagnostics/repository";
import { getCitationDocuments } from "@/features/knowledge/service";
import {
  getOrCreateShareLink,
  revokeSessionShareLink,
  getSharedDiagnosticResult,
} from "@/features/diagnostics/service";

const completeSession = { id: "session-1", status: "COMPLETE" };
const incompleteSession = { id: "session-1", status: "AWAITING_AI" };

beforeEach(() => {
  vi.mocked(repo.getSessionById).mockReset();
  vi.mocked(repo.findActiveShareLink).mockReset();
  vi.mocked(repo.createShareLink).mockReset();
  vi.mocked(repo.revokeShareLink).mockReset();
  vi.mocked(repo.findShareLinkByToken).mockReset();
  vi.mocked(repo.incrementShareLinkView)
    .mockReset()
    .mockResolvedValue(undefined as never);
  vi.mocked(getCitationDocuments).mockClear();
});

describe("getOrCreateShareLink", () => {
  it("throws NotFoundError when the session isn't owned by the user", async () => {
    vi.mocked(repo.getSessionById).mockResolvedValue(null);
    await expect(getOrCreateShareLink("session-1", "user-1")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws ConflictError when the session isn't COMPLETE yet", async () => {
    vi.mocked(repo.getSessionById).mockResolvedValue(incompleteSession as never);
    await expect(getOrCreateShareLink("session-1", "user-1")).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("returns the existing active link instead of minting a new one", async () => {
    vi.mocked(repo.getSessionById).mockResolvedValue(completeSession as never);
    const existing = { id: "link-1", token: "existing-token" };
    vi.mocked(repo.findActiveShareLink).mockResolvedValue(existing as never);

    const result = await getOrCreateShareLink("session-1", "user-1");

    expect(result).toBe(existing);
    expect(repo.createShareLink).not.toHaveBeenCalled();
  });

  it("mints a new link with a ~30-day expiry when none is active", async () => {
    vi.mocked(repo.getSessionById).mockResolvedValue(completeSession as never);
    vi.mocked(repo.findActiveShareLink).mockResolvedValue(null);
    vi.mocked(repo.createShareLink).mockResolvedValue({
      id: "link-2",
      token: "new-token",
    } as never);

    const result = await getOrCreateShareLink("session-1", "user-1");

    expect(repo.createShareLink).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: "session-1", createdById: "user-1" }),
    );
    const call = vi.mocked(repo.createShareLink).mock.calls[0]![0];
    const daysUntilExpiry = (call.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(daysUntilExpiry).toBeGreaterThan(29);
    expect(daysUntilExpiry).toBeLessThan(31);
    expect(result).toMatchObject({ id: "link-2" });
  });
});

describe("revokeSessionShareLink", () => {
  it("throws NotFoundError when the session isn't owned by the user", async () => {
    vi.mocked(repo.getSessionById).mockResolvedValue(null);
    await expect(revokeSessionShareLink("session-1", "user-1")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws NotFoundError when there is no active link to revoke", async () => {
    vi.mocked(repo.getSessionById).mockResolvedValue(completeSession as never);
    vi.mocked(repo.findActiveShareLink).mockResolvedValue(null);
    await expect(revokeSessionShareLink("session-1", "user-1")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("revokes the active link", async () => {
    vi.mocked(repo.getSessionById).mockResolvedValue(completeSession as never);
    vi.mocked(repo.findActiveShareLink).mockResolvedValue({ id: "link-1" } as never);

    await revokeSessionShareLink("session-1", "user-1");

    expect(repo.revokeShareLink).toHaveBeenCalledWith("link-1");
  });
});

describe("getSharedDiagnosticResult", () => {
  it("throws NotFoundError for a token that doesn't exist", async () => {
    vi.mocked(repo.findShareLinkByToken).mockResolvedValue(null);
    await expect(getSharedDiagnosticResult("nope")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws NotFoundError for a revoked link, indistinguishable from a missing one", async () => {
    vi.mocked(repo.findShareLinkByToken).mockResolvedValue({
      id: "link-1",
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      session: { result: null },
    } as never);
    await expect(getSharedDiagnosticResult("revoked-token")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws NotFoundError for an expired link", async () => {
    vi.mocked(repo.findShareLinkByToken).mockResolvedValue({
      id: "link-1",
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000),
      session: { result: null },
    } as never);
    await expect(getSharedDiagnosticResult("expired-token")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("returns the session + citations and records a view for a valid link", async () => {
    const session = {
      id: "session-1",
      result: { knowledgeDocumentIds: ["doc-1"], causes: [] },
    };
    vi.mocked(repo.findShareLinkByToken).mockResolvedValue({
      id: "link-1",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      session,
    } as never);
    vi.mocked(getCitationDocuments).mockResolvedValue([{ id: "doc-1" }] as never);

    const result = await getSharedDiagnosticResult("valid-token");

    expect(result.session).toBe(session);
    expect(result.citations).toEqual([{ id: "doc-1" }]);
    expect(getCitationDocuments).toHaveBeenCalledWith(["doc-1"]);
    expect(repo.incrementShareLinkView).toHaveBeenCalledWith("link-1");
  });

  it("skips citation lookup entirely when the session has no result", async () => {
    vi.mocked(repo.findShareLinkByToken).mockResolvedValue({
      id: "link-1",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      session: { id: "session-1", result: null },
    } as never);

    const result = await getSharedDiagnosticResult("valid-token");

    expect(result.citations).toEqual([]);
    expect(getCitationDocuments).not.toHaveBeenCalled();
  });
});
