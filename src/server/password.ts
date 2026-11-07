import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);

function safeCompare(first: Buffer, second: Buffer) {
  return first.length === second.length && crypto.timingSafeEqual(first, second);
}

/** Salted hashes for new passwords; existing accounts remain compatible. */
export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${hash.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash?: string | null) {
  if (!storedHash) return false;
  if (storedHash.startsWith('scrypt:')) {
    const parts = storedHash.split(':');
    if (
      parts.length !== 3 ||
      !/^[a-f0-9]{32}$/i.test(parts[1]) ||
      !/^[a-f0-9]{128}$/i.test(parts[2])
    )
      return false;
    const derived = (await scrypt(password, parts[1], 64)) as Buffer;
    return safeCompare(derived, Buffer.from(parts[2], 'hex'));
  }
  if (/^sha256[:$]/.test(storedHash)) {
    const expected = storedHash.slice(7);
    const actual = crypto.createHash('sha256').update(password).digest('hex');
    return safeCompare(Buffer.from(actual), Buffer.from(expected));
  }
  return safeCompare(Buffer.from(password), Buffer.from(storedHash));
}
