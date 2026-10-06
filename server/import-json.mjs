import { readFile } from 'node:fs/promises';
import { isEmptyState } from './store.mjs';

export async function importJSON(store, path) {
  const source = JSON.parse(await readFile(path, 'utf8'));
  if (source.version !== 1 || !Array.isArray(source.invitations) || !Array.isArray(source.assets) || !('admin' in source)) throw new Error('Format data JSON tidak dikenali.');
  if (source.invitations.some(item => !item.id || !item.draft || !Array.isArray(item.responses))) throw new Error('Data undangan JSON tidak lengkap.');
  if (source.admin && (!source.admin.username || !/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(source.admin.password))) throw new Error('Data akun admin JSON tidak valid.');
  await store.change(state => {
    if (!isEmptyState(state)) throw new Error('Database tujuan sudah berisi data. Migrasi dibatalkan agar data tidak tertimpa.');
    Object.assign(state, source);
  });
  return {invitations:source.invitations.length, assets:source.assets.length, responses:source.invitations.reduce((total, item) => total + item.responses.length, 0), admin:!!source.admin};
}
