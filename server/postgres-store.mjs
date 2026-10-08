import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import pg from 'pg';

const { Pool } = pg;
// One transaction lock preserves the existing read/change contract across clients.
// Reads use MVCC and do not wait for a writer; only changed rows are written.
const lock = 'SELECT pg_advisory_xact_lock(194729, 1)';
const iso = value => value == null ? null : value.toISOString();

export async function createPostgresStore({env}) {
  if (!env.DATABASE_URL?.trim()) throw new Error('Isi DATABASE_URL di .env terlebih dahulu.');
  let url;
  try { url = new URL(env.DATABASE_URL); } catch { throw new Error('Format DATABASE_URL tidak valid.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('DATABASE_URL harus menggunakan postgres:// atau postgresql://.');
  const pool = new Pool({connectionString:env.DATABASE_URL, max:5, connectionTimeoutMillis:10000, idleTimeoutMillis:30000, statement_timeout:30000, application_name:'undangan-onlineku'});
  pool.on('error', () => console.error('Koneksi PostgreSQL terputus. Permintaan berikutnya akan mencoba koneksi baru.'));

  async function transaction(action, {write = false} = {}) {
    const client = await pool.connect();
    try {
      await client.query(write ? 'BEGIN' : 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      if (write) await client.query(lock);
      const result = await action(client);
      await client.query('COMMIT');
      return result;
    } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
    finally { client.release(); }
  }
  try {
    await transaction(async client => {
      await client.query('CREATE SCHEMA IF NOT EXISTS undangan');
      await client.query('CREATE TABLE IF NOT EXISTS undangan.schema_migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
      const {rows} = await client.query('SELECT version FROM undangan.schema_migrations ORDER BY version');
      const migrations = ['001-initial.sql', '002-sessions.sql'];
      if (rows.some(row => row.version > migrations.length)) throw new Error('Versi database lebih baru daripada aplikasi ini.');
      for (const [index, file] of migrations.entries()) if (!rows.some(row => row.version === index + 1)) {
        await client.query(await readFile(new URL('./migrations/' + file, import.meta.url), 'utf8'));
        await client.query('INSERT INTO undangan.schema_migrations(version) VALUES ($1)', [index + 1]);
      }
    }, {write:true});
  } catch (error) { await pool.end(); throw error; }

  return {
    provider:'postgres',
    read: () => transaction(readState),
    async change(mutator) {
      return transaction(async client => {
        const before = await readState(client), state = structuredClone(before);
        const result = await mutator(state);
        await persist(client, before, state);
        return structuredClone(result);
      }, {write:true});
    },
    close: () => pool.end(),
    sessions: {
      async get(tokenHash) {
        const {rows} = await pool.query('SELECT username, csrf, expires_at FROM undangan.sessions WHERE token_hash=$1 AND expires_at > now()', [tokenHash]);
        return rows[0] ? {username:rows[0].username, csrf:rows[0].csrf, expires:rows[0].expires_at.getTime()} : null;
      },
      async set(tokenHash, session) {
        await transaction(async client => {
          await client.query('DELETE FROM undangan.sessions WHERE expires_at <= now()');
          await client.query('INSERT INTO undangan.sessions(token_hash, username, csrf, expires_at) VALUES ($1,$2,$3,$4)', [tokenHash, session.username, session.csrf, new Date(session.expires)]);
          await client.query('DELETE FROM undangan.sessions WHERE token_hash IN (SELECT token_hash FROM undangan.sessions WHERE username=$1 ORDER BY expires_at DESC OFFSET 50)', [session.username]);
        }, {write:true});
      },
      delete: tokenHash => pool.query('DELETE FROM undangan.sessions WHERE token_hash=$1', [tokenHash]),
    },
  };
}

async function readState(client) {
  const {rows:admins} = await client.query('SELECT username, password_hash FROM undangan.admins');
  const {rows:invitations} = await client.query('SELECT * FROM undangan.invitations ORDER BY position, id');
  const {rows:assets} = await client.query('SELECT * FROM undangan.assets ORDER BY position, id');
  const {rows:responses} = await client.query('SELECT * FROM undangan.responses ORDER BY invitation_id, position, id');
  const grouped = new Map();
  for (const row of responses) {
    if (!grouped.has(row.invitation_id)) grouped.set(row.invitation_id, []);
    grouped.get(row.invitation_id).push({id:row.id, name:row.name, attendance:row.attendance, guests:row.guests, message:row.message, visible:row.visible, createdAt:iso(row.created_at)});
  }
  return {
    version:1,
    admin:admins[0] ? {username:admins[0].username, password:admins[0].password_hash} : null,
    assets:assets.map(row => ({id:row.id, kind:row.kind, name:row.name, size:Number(row.size), mime:row.mime, createdAt:iso(row.created_at), provider:row.provider, url:row.url, ...(row.public_id == null ? {} : {publicId:row.public_id})})),
    invitations:invitations.map(row => ({id:row.id, slug:row.slug, revision:row.revision, createdAt:iso(row.created_at), updatedAt:iso(row.updated_at), publishedAt:iso(row.published_at), draft:row.draft, published:row.published, responses:grouped.get(row.id) || []})),
  };
}

// Table and column identifiers come only from the fixed definitions below.
// All application values, including JSON and names, use query parameters.
async function syncRows(client, table, keys, before, after) {
  const identity = row => JSON.stringify(keys.map(key => row[key]));
  const oldRows = new Map(before.map(row => [identity(row), row]));
  const newRows = new Map(after.map(row => [identity(row), row]));
  if (newRows.size !== after.length) throw new Error('ID data ganda ditemukan.');
  for (const [id, row] of oldRows) if (!newRows.has(id)) {
    await client.query(`DELETE FROM undangan.${table} WHERE ${keys.map((key, i) => `${key}=$${i + 1}`).join(' AND ')}`, keys.map(key => row[key]));
  }
  for (const [id, row] of newRows) {
    if (isDeepStrictEqual(oldRows.get(id), row)) continue;
    const columns = Object.keys(row);
    await client.query(`INSERT INTO undangan.${table} (${columns.join(',')}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(',')}) ON CONFLICT (${keys.join(',')}) DO UPDATE SET ${columns.filter(key => !keys.includes(key)).map(key => `${key}=EXCLUDED.${key}`).join(',')}`, Object.values(row));
  }
}
async function persist(client, before, after) {
  const adminRows = state => state.admin ? [{id:1, username:state.admin.username, password_hash:state.admin.password}] : [];
  const invitationRows = state => state.invitations.map((item, position) => ({id:item.id, slug:item.slug, revision:item.revision, created_at:item.createdAt, updated_at:item.updatedAt, published_at:item.publishedAt, draft:item.draft, published:item.published, position}));
  const assetRows = state => state.assets.map((item, position) => ({id:item.id, kind:item.kind, name:item.name, size:item.size, mime:item.mime, created_at:item.createdAt, provider:item.provider, url:item.url, public_id:item.publicId ?? null, position}));
  const responseRows = state => state.invitations.flatMap(item => item.responses.map((response, position) => ({invitation_id:item.id, id:response.id, name:response.name, attendance:response.attendance, guests:response.guests, message:response.message, visible:response.visible, created_at:response.createdAt, position})));
  await syncRows(client, 'admins', ['id'], adminRows(before), adminRows(after));
  await syncRows(client, 'invitations', ['id'], invitationRows(before), invitationRows(after));
  await syncRows(client, 'assets', ['id'], assetRows(before), assetRows(after));
  await syncRows(client, 'responses', ['invitation_id','id'], responseRows(before), responseRows(after));
}
