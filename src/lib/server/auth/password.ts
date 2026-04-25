/**
 * Hashes a password using Argon2id.
 * @param password The password to hash.
 * @returns A promise resolving to the hashed password.
 */
export async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password, {
    algorithm: 'argon2id',
  });
}

/**
 * Verifies a password against a stored hash.
 * @param storedHash The stored password hash.
 * @param password The password to verify.
 * @returns A promise resolving to a boolean indicating if the password is correct.
 */
export async function verifyPassword(storedHash: string, password: string): Promise<boolean> {
  return await Bun.password.verify(password, storedHash);
}
