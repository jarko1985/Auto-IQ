import { describe, it, expect } from "vitest";
import { submitReviewSchema } from "@/features/repair-orders/schemas";

describe("submitReviewSchema", () => {
  it("accepts a valid rating with an optional comment", () => {
    const result = submitReviewSchema.parse({ rating: 5, comment: "Great service." });
    expect(result.rating).toBe(5);
    expect(result.comment).toBe("Great service.");
  });

  it("accepts a rating with no comment", () => {
    const result = submitReviewSchema.parse({ rating: 3 });
    expect(result.comment).toBeUndefined();
  });

  it("rejects a rating below 1", () => {
    expect(submitReviewSchema.safeParse({ rating: 0 }).success).toBe(false);
  });

  it("rejects a rating above 5", () => {
    expect(submitReviewSchema.safeParse({ rating: 6 }).success).toBe(false);
  });

  it("rejects a non-integer rating", () => {
    expect(submitReviewSchema.safeParse({ rating: 4.5 }).success).toBe(false);
  });

  it("rejects a comment over 1000 characters", () => {
    expect(submitReviewSchema.safeParse({ rating: 4, comment: "x".repeat(1001) }).success).toBe(
      false,
    );
  });
});
