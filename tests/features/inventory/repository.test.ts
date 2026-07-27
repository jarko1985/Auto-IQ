import { describe, it, expect } from "vitest";
import { ConflictError, NotFoundError } from "@/lib/errors";
import {
  reserveAvailableStock,
  releaseReservedStock,
  consumeReservedStock,
} from "@/features/inventory/repository";

/**
 * reserveAvailableStock/releaseReservedStock/consumeReservedStock each issue a
 * single `updateMany` guarded by `WHERE qty... >= :amount`, so Postgres itself
 * serializes concurrent calls against the same row — the second of two racing
 * requests only succeeds if stock remains after the first commits. This fake
 * tx reproduces that row-level semantics synchronously (a mock body runs to
 * completion before an `await` yields control, so two `Promise.all`-fired
 * calls against it interleave exactly like two serialized SQL statements),
 * letting the guard logic be verified without a live database — consistent
 * with this suite's mocked-repository convention (see tests/features/vendors).
 */
function createFakeInventoryItemTx(initial: {
  id: string;
  qtyAvailable: number;
  qtyReserved: number;
  qtyDamaged: number;
  isActive?: boolean;
}) {
  const row = {
    qtyAvailable: initial.qtyAvailable,
    qtyReserved: initial.qtyReserved,
    qtyDamaged: initial.qtyDamaged,
    isActive: initial.isActive ?? true,
    version: 0,
  };

  const tx = {
    inventoryItem: {
      async updateMany(args: {
        where: {
          id: string;
          isActive?: boolean;
          qtyAvailable?: { gte: number };
          qtyReserved?: { gte: number };
        };
        data: {
          qtyAvailable?: { decrement?: number; increment?: number };
          qtyReserved?: { decrement?: number; increment?: number };
          version?: { increment: number };
        };
      }) {
        if (args.where.id !== initial.id) return { count: 0 };
        if (args.where.isActive !== undefined && row.isActive !== args.where.isActive) {
          return { count: 0 };
        }
        if (
          args.where.qtyAvailable?.gte !== undefined &&
          row.qtyAvailable < args.where.qtyAvailable.gte
        ) {
          return { count: 0 };
        }
        if (
          args.where.qtyReserved?.gte !== undefined &&
          row.qtyReserved < args.where.qtyReserved.gte
        ) {
          return { count: 0 };
        }

        if (args.data.qtyAvailable?.decrement) row.qtyAvailable -= args.data.qtyAvailable.decrement;
        if (args.data.qtyAvailable?.increment) row.qtyAvailable += args.data.qtyAvailable.increment;
        if (args.data.qtyReserved?.decrement) row.qtyReserved -= args.data.qtyReserved.decrement;
        if (args.data.qtyReserved?.increment) row.qtyReserved += args.data.qtyReserved.increment;
        row.version += 1;
        return { count: 1 };
      },
      async findUnique(args: { where: { id: string } }) {
        if (args.where.id !== initial.id) return null;
        return { id: initial.id, ...row };
      },
      async findUniqueOrThrow(args: { where: { id: string } }) {
        if (args.where.id !== initial.id) throw new Error("not found");
        return { id: initial.id, ...row };
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  return { tx, row };
}

describe("reserveAvailableStock — overselling prevention", () => {
  it("only allows one of two concurrent over-committing reservations to succeed", async () => {
    const { tx, row } = createFakeInventoryItemTx({
      id: "item-1",
      qtyAvailable: 5,
      qtyReserved: 0,
      qtyDamaged: 0,
    });

    const results = await Promise.allSettled([
      reserveAvailableStock(tx, "item-1", 3),
      reserveAvailableStock(tx, "item-1", 3),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(ConflictError);

    // Stock never went negative and only one reservation's worth was taken.
    expect(row.qtyAvailable).toBe(2);
    expect(row.qtyReserved).toBe(3);
  });

  it("allows both reservations when combined demand fits available stock", async () => {
    const { row, tx } = createFakeInventoryItemTx({
      id: "item-1",
      qtyAvailable: 10,
      qtyReserved: 0,
      qtyDamaged: 0,
    });

    const results = await Promise.allSettled([
      reserveAvailableStock(tx, "item-1", 4),
      reserveAvailableStock(tx, "item-1", 4),
    ]);

    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    expect(row.qtyAvailable).toBe(2);
    expect(row.qtyReserved).toBe(8);
  });

  it("throws NotFoundError for an unknown inventory item", async () => {
    const { tx } = createFakeInventoryItemTx({
      id: "item-1",
      qtyAvailable: 5,
      qtyReserved: 0,
      qtyDamaged: 0,
    });

    await expect(reserveAvailableStock(tx, "missing-item", 1)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("rejects reservation against an inactive item", async () => {
    const { tx } = createFakeInventoryItemTx({
      id: "item-1",
      qtyAvailable: 5,
      qtyReserved: 0,
      qtyDamaged: 0,
      isActive: false,
    });

    await expect(reserveAvailableStock(tx, "item-1", 1)).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("releaseReservedStock / consumeReservedStock", () => {
  it("releases reserved stock back to available", async () => {
    const { tx, row } = createFakeInventoryItemTx({
      id: "item-1",
      qtyAvailable: 2,
      qtyReserved: 3,
      qtyDamaged: 0,
    });

    await releaseReservedStock(tx, "item-1", 3);

    expect(row.qtyAvailable).toBe(5);
    expect(row.qtyReserved).toBe(0);
  });

  it("consumes reserved stock permanently on order completion without touching available", async () => {
    const { tx, row } = createFakeInventoryItemTx({
      id: "item-1",
      qtyAvailable: 2,
      qtyReserved: 3,
      qtyDamaged: 0,
    });

    await consumeReservedStock(tx, "item-1", 3);

    expect(row.qtyAvailable).toBe(2);
    expect(row.qtyReserved).toBe(0);
  });

  it("rejects releasing more than is currently reserved", async () => {
    const { tx } = createFakeInventoryItemTx({
      id: "item-1",
      qtyAvailable: 2,
      qtyReserved: 1,
      qtyDamaged: 0,
    });

    await expect(releaseReservedStock(tx, "item-1", 5)).rejects.toBeInstanceOf(ConflictError);
  });
});
