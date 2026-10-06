import { readFile, mkdir, writeFile, rename, copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { newInvitation, AppError } from './schema.mjs';

export function initialState() {
  const now = new Date().toISOString(), id = randomUUID();
  return { version:1, admin:null, assets:[], invitations:[{id, slug:'nadine-arga', revision:1, createdAt:now, updatedAt:now, publishedAt:null, draft:newInvitation(id), published:null, responses:[]}] };
}
export const isEmptyState = state => !state.admin && !state.assets.length && !state.invitations.length;

export async function createConfiguredStore({directory, env}) {
  if (!env.DATABASE_URL?.trim()) return createStore(directory);
  const { createPostgresStore } = await import('./postgres-store.mjs');
  const store = await createPostgresStore({env});
  try {
    if (isEmptyState(await store.read())) {
      // An empty destination must not hide invitations already stored locally.
      let hasLocalData = false;
      try { await readFile(join(directory, 'store.json')); hasLocalData = true; }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (hasLocalData) throw new Error('PostgreSQL masih kosong dan data JSON ditemukan. Hentikan server, jalankan npm run db:migrate-json, lalu mulai server kembali.');
      await store.change(state => { if (isEmptyState(state)) Object.assign(state, initialState()); });
    }
    return store;
  } catch (error) { await store.close(); throw error; }
}

export async function createStore(directory) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const path = join(directory,'store.json');
  let state;
  try { state = JSON.parse(await readFile(path,'utf8')); if (state.version !== 1 || !Array.isArray(state.invitations) || !Array.isArray(state.assets)) throw new Error('Format penyimpanan tidak dikenali.'); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    state = initialState();
    await writeFile(path,JSON.stringify(state,null,2),{mode:0o600});
  }
  let queue = Promise.resolve();
  return {
    provider: 'json',
    close: async () => { await queue; },
    read: () => structuredClone(state),
    change: function(mutator) {
      const next = queue.then(async () => {
        const draft = structuredClone(state), result = await mutator(draft);
        const temp = path + '.' + randomUUID() + '.tmp';
        await writeFile(temp,JSON.stringify(draft,null,2),{mode:0o600});
        await copyFile(path,path+'.bak');
        await rename(temp,path); state = draft;
        return result;
      });
      queue = next.catch(() => {}); return next;
    },
  };
}
export function findRecord(state,id) {
  const record = state.invitations.find(item => item.id === id);
  if (!record) throw new AppError('Undangan tidak ditemukan.',404);
  return record;
}
export function checkRevision(record,revision) {
  if (revision !== record.revision) throw new AppError('Undangan sudah berubah di tab lain. Muat ulang sebelum menyimpan agar perubahan tidak tertimpa.',409);
}
