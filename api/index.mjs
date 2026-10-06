// Vercel Serverless Function — adapter untuk server Node.js yang sudah ada.
import { createConfiguredStore } from '../server/store.mjs';
import { createAPI, json } from '../server/api.mjs';

const env = process.env;
const directory = '/tmp/data'; // /tmp adalah satu-satunya folder writable di Vercel; upload harus pakai Cloudinary.

// Lazy init: inisialisasi sekali, di-cache antar invocation di container yang sama.
let initPromise = null;
let store, api;

function ensureInitialized() {
  if (!initPromise) {
    initPromise = (async () => {
      store = await createConfiguredStore({ directory, env });
      api = await createAPI({ store, env, directory });
    })().catch(error => {
      // Reset agar invocation berikutnya bisa retry.
      initPromise = null;
      throw error;
    });
  }
  return initPromise;
}

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob: https://res.cloudinary.com; " +
    "media-src 'self' blob: https://res.cloudinary.com; " +
    "frame-src 'self' https://www.google.com https://google.com https://maps.google.com; " +
    "connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'"
  );

  try {
    await ensureInitialized();
    const url = new URL(req.url, `https://${req.headers.host}`);
    await api(req, res, url);
  } catch (error) {
    const status = error.status || (error.code === 'ENOENT' ? 404 : 500);
    if (status === 500) console.error('Request failed:', error.message || error.code || 'internal error');
    if (!res.headersSent) {
      json(res, status, { error: status === 500 ? 'Terjadi kesalahan server. Coba lagi.' : error.message });
    } else {
      res.end();
    }
  }
}
