////////////////////// raceAssert.ts ////////////////////////

// Assertions for race condition tests
// AppSec-safe assertion: system must remain deterministic under mixed load

/////////////////////////////////////////////////////////////

export function assertSingleSuccess<T>(
  results: { success: boolean; result?: T; error?: unknown }[],
) {
  const successCount = results.filter((r) => r.success).length;

  if (successCount !== 1) {
    throw new Error(
      `Race assertion failed: expected exactly 1 success, got ${successCount}`,
    );
  }

  return {
    success: results.find((r) => r.success)!,
    failures: results.filter((r) => !r.success),
  };
}
