export type BatchProgressCheck =
  | { ok: true; succeeded: number; completed: boolean }
  | { ok: false; error: string };

/**
 * Validates the next chunk against the row count declared when an import batch
 * was started. Keep this check before any upsert so a rejected chunk cannot
 * modify financial data.
 */
export function checkBatchProgress(
  attemptedValue: unknown,
  succeededValue: unknown,
  incomingCount: number,
): BatchProgressCheck {
  const attempted = attemptedValue;
  const succeeded = succeededValue ?? 0;

  if (
    !Number.isSafeInteger(attempted) ||
    (attempted as number) < 0 ||
    !Number.isSafeInteger(succeeded) ||
    (succeeded as number) < 0 ||
    !Number.isSafeInteger(incomingCount) ||
    incomingCount < 1
  ) {
    return {
      ok: false,
      error: "Import batch progress is invalid. Stop and inspect the batch before retrying.",
    };
  }

  const nextSucceeded = (succeeded as number) + incomingCount;
  if (!Number.isSafeInteger(nextSucceeded) || nextSucceeded > (attempted as number)) {
    return {
      ok: false,
      error: "Received more rows than planned for this table.",
    };
  }

  return {
    ok: true,
    succeeded: nextSucceeded,
    completed: nextSucceeded === attempted,
  };
}
