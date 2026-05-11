// $lib/server/db/utils.ts
/**
 * Check if a database error is a unique constraint violation (PostgreSQL error code 23505).
 */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  );
}
