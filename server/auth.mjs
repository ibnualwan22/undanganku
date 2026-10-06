import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { AppError } from './schema.mjs';
const derive = promisify(scrypt);
export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 200) throw new AppError('Password harus terdiri dari 12–200 karakter.');
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${(await derive(password,salt,64)).toString('hex')}`;
}
export async function verifyPassword(password,stored) {
  const [salt,hash] = stored.split(':');
  const actual = await derive(String(password).slice(0,200),salt,64), expected = Buffer.from(hash,'hex');
  return actual.length === expected.length && timingSafeEqual(actual,expected);
}
export function createAuth(secure = false) {
  const sessions = new Map();
  const cookie = (value,maxAge) => `undangan_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
  function session(req) {
    const token = req.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith('undangan_session='))?.slice(17);
    const found = sessions.get(token);
    if (!found || found.expires < Date.now()) { if (found) sessions.delete(token); return null; }
    return { ...found, token };
  }
  return {
    session,
    login(res,username) {
      for (const [key,value] of sessions) if (value.expires < Date.now()) sessions.delete(key);
      if (sessions.size >= 50) sessions.delete(sessions.keys().next().value);
      const token = randomBytes(32).toString('hex'), csrf = randomBytes(24).toString('hex');
      sessions.set(token,{username,csrf,expires:Date.now()+12*3600_000});
      res.setHeader('Set-Cookie',cookie(token,12*3600)); return {username,csrf};
    },
    require(req, mutation = false) {
      const current = session(req);
      if (!current) throw new AppError('Silakan masuk kembali ke admin.',401);
      if (mutation && req.headers['x-csrf-token'] !== current.csrf) throw new AppError('Sesi formulir tidak valid. Muat ulang halaman.',403);
      return current;
    },
    logout(req,res) { const current = session(req); if (current) sessions.delete(current.token); res.setHeader('Set-Cookie',cookie('',0)); },
  };
}
