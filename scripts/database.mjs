import { resolve, join } from 'node:path';
import { createPostgresStore } from '../server/postgres-store.mjs';
import { importJSON } from '../server/import-json.mjs';

const project = resolve(import.meta.dirname, '..');
try { process.loadEnvFile(join(project, '.env')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const action = process.argv[2];
let store;
try {
  if (!['check', 'migrate-json'].includes(action)) throw new Error('Gunakan npm run db:check atau npm run db:migrate-json.');
  store = await createPostgresStore({env:process.env});
  if (action === 'check') {
    const state = await store.read();
    console.log(`PostgreSQL terhubung. Skema siap. ${state.invitations.length} undangan tersimpan.`);
  } else {
    const source = resolve(project, process.argv[3] || join(process.env.DATA_DIR || 'data', 'store.json'));
    const result = await importJSON(store, source);
    console.log(`Migrasi selesai: ${result.invitations} undangan, ${result.assets} metadata media, ${result.responses} respons tamu, akun admin ${result.admin ? 'dipindahkan' : 'belum dibuat'}. File JSON sumber tetap utuh.`);
  }
} catch (error) {
  // Driver errors can contain connection details. Never print the URL/password.
  console.error(error.code ? `Database gagal diakses (${String(error.code).replace(/[^A-Za-z0-9_]/g, '')}). Periksa DATABASE_URL, izin akun, koneksi, dan SSL.` : error.message);
  process.exitCode = 1;
} finally { await store?.close(); }
