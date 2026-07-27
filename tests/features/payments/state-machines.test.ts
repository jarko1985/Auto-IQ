import { describe, it, expect } from "vitest";
import {
  PAYMENT_INTENT_TRANSITIONS,
  PAYMENT_TRANSACTION_TRANSITIONS,
  REFUND_TRANSITIONS,
  PAYOUT_TRANSITIONS,
  assertPaymentIntentTransition,
  assertPaymentTransactionTransition,
  assertRefundTransition,
  assertPayoutTransition,
} from "@/features/payments/state-machines";

function expectSelfConsistent<S extends string>(graph: Record<S, S[]>) {
  const states = Object.keys(graph) as S[];
  for (const from of states) {
    for (const to of graph[from]) {
      expect(states).toContain(to);
    }
  }
}

describe("PAYMENT_INTENT_TRANSITIONS", () => {
  it("only references known states", () => {
    expectSelfConsistent(PAYMENT_INTENT_TRANSITIONS);
  });

  it("SUCCEEDED, CANCELED, and EXPIRED are terminal", () => {
    expect(PAYMENT_INTENT_TRANSITIONS.SUCCEEDED).toEqual([]);
    expect(PAYMENT_INTENT_TRANSITIONS.CANCELED).toEqual([]);
    expect(PAYMENT_INTENT_TRANSITIONS.EXPIRED).toEqual([]);
  });

  it("allows retrying a FAILED intent by moving back to CREATED", () => {
    expect(() => assertPaymentIntentTransition("FAILED", "CREATED")).not.toThrow();
  });

  it("rejects reopening a SUCCEEDED intent", () => {
    expect(() => assertPaymentIntentTransition("SUCCEEDED", "PROCESSING")).toThrow(
      /Cannot move a payment intent/,
    );
  });
});

describe("PAYMENT_TRANSACTION_TRANSITIONS", () => {
  it("only references known states", () => {
    expectSelfConsistent(PAYMENT_TRANSACTION_TRANSITIONS);
  });

  it("PENDING can resolve to SUCCEEDED or FAILED, both terminal", () => {
    expect(() => assertPaymentTransactionTransition("PENDING", "SUCCEEDED")).not.toThrow();
    expect(() => assertPaymentTransactionTransition("PENDING", "FAILED")).not.toThrow();
    expect(PAYMENT_TRANSACTION_TRANSITIONS.SUCCEEDED).toEqual([]);
    expect(PAYMENT_TRANSACTION_TRANSITIONS.FAILED).toEqual([]);
  });
});

describe("REFUND_TRANSITIONS", () => {
  it("only references known states", () => {
    expectSelfConsistent(REFUND_TRANSITIONS);
  });

  it("rejects retrying a FAILED refund in place (must create a new Refund row)", () => {
    expect(() => assertRefundTransition("FAILED", "PROCESSING")).toThrow();
  });

  it("allows withdrawing a REQUESTED refund before it's processed", () => {
    expect(() => assertRefundTransition("REQUESTED", "CANCELED")).not.toThrow();
  });
});

describe("PAYOUT_TRANSITIONS", () => {
  it("only references known states", () => {
    expectSelfConsistent(PAYOUT_TRANSITIONS);
  });

  it("allows retrying a FAILED payout", () => {
    expect(() => assertPayoutTransition("FAILED", "PROCESSING")).not.toThrow();
  });

  it("allows reversing a PAID payout (clawback)", () => {
    expect(() => assertPayoutTransition("PAID", "REVERSED")).not.toThrow();
  });

  it("rejects reversing a payout that was never paid", () => {
    expect(() => assertPayoutTransition("PENDING", "REVERSED")).toThrow();
  });
});
