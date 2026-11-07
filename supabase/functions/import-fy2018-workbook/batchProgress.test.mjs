import test from "node:test";
import assert from "node:assert/strict";
import { checkBatchProgress } from "./batchProgress.ts";

test("accepts a chunk that exactly completes the declared row count", () => {
  assert.deepEqual(checkBatchProgress(10, 6, 4), {
    ok: true,
    succeeded: 10,
    completed: true,
  });
});

test("accepts a partial chunk within the declared row count", () => {
  assert.deepEqual(checkBatchProgress(10, 4, 3), {
    ok: true,
    succeeded: 7,
    completed: false,
  });
});

test("rejects a chunk that would exceed the declared row count", () => {
  assert.deepEqual(checkBatchProgress(10, 8, 3), {
    ok: false,
    error: "Received more rows than planned for this table.",
  });
});

test("defaults an omitted succeeded count to zero", () => {
  assert.deepEqual(checkBatchProgress(2, undefined, 2), {
    ok: true,
    succeeded: 2,
    completed: true,
  });
});

test("rejects invalid, negative, fractional, and zero-sized progress inputs", () => {
  for (const args of [
    [undefined, 0, 1],
    [-1, 0, 1],
    [1.5, 0, 1],
    [2, -1, 1],
    [2, 0.5, 1],
    [2, 0, 0],
    [2, 0, -1],
  ]) {
    assert.equal(checkBatchProgress(...args).ok, false, JSON.stringify(args));
  }
});
