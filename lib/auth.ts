import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const deriveKey = promisify(scrypt);
export const SESSION_COOKIE = 'english-space-session';
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

function secret() {
  const value = process.env.AUTH_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('AUTH_SESSION_SECRET must contain at least 32 characters.');
  return value;
}

export async function verifyCredentials(username: string, password: string) {
  const [salt, hash] = (process.env.AUTH_PASSWORD_HASH ?? '').split(':');
  if (!salt || !/^[a-f0-9]{128}$/.test(hash ?? '')) throw new Error('AUTH_PASSWORD_HASH is not configured.');
  if (!username || username.length > 100 || !password || password.length > 256) return false;
  const derived = await deriveKey(password, salt, 64) as Buffer;
  return timingSafeEqual(derived, Buffer.from(hash, 'hex')) && username === process.env.AUTH_USERNAME;
}

export function createSession(now = Math.floor(Date.now() / 1000)) {
  const payload = `${now + SESSION_MAX_AGE}.${randomBytes(24).toString('hex')}`;
  return `${payload}.${createHmac('sha256', secret()).update(payload).digest('hex')}`;
}

export function verifySession(token: string | undefined, now = Math.floor(Date.now() / 1000)) {
  if (!token || token.length > 200) return false;
  const parts = token.split('.');
  if (parts.length !== 3 || !/^\d+$/.test(parts[0]) || !/^[a-f0-9]{48}$/.test(parts[1]) || !/^[a-f0-9]{64}$/.test(parts[2])) return false;
  const expires = Number(parts[0]);
  if (!Number.isSafeInteger(expires) || expires <= now || expires > now + SESSION_MAX_AGE) return false;
  try {
    const expected = createHmac('sha256', secret()).update(`${parts[0]}.${parts[1]}`).digest();
    return timingSafeEqual(expected, Buffer.from(parts[2], 'hex'));
  } catch { return false; }
}

export function safeReturnPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\s]/.test(value)) return '/';
  // Only return to the application's learning pages.
  const path = value.split(/[?#]/)[0];
  return path === '/' || path === '/tu-vung' || path.startsWith('/tu-vung/') ? value : '/';
}
