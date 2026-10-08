import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import pg from 'pg';
import { createStore, createConfiguredStore, isEmptyState } from '../server/store.mjs';
import { createPostgresStore } from '../server/postgres-store.mjs';
import { importJSON } from '../server/import-json.mjs';
import { hashPassword, verifyPassword } from '../server/auth.mjs';
import { createAPI, json } from '../server/api.mjs';

test('PostgreSQL migration, transactions, concurrent writes, persistent sessions and API', {skip:!process.env.TEST_DATABASE_URL}, async t => {
  // Only use TEST_DATABASE_URL. Create/drop a uniquely named test database;
  // never initialize, truncate or drop tables in the supplied database.
  const admin = new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});
  const database = 'undangan_test_' + randomUUID().replaceAll('-','');
  const url = new URL(process.env.TEST_DATABASE_URL);url.pathname='/'+database;
  const env = {DATABASE_URL:url.href,MEDIA_STORAGE:'local'};
  const directory = await mkdtemp(join(tmpdir(),'undangan-pg-test-'));
  const stores=[], servers=[];
  try {
    await admin.query(`CREATE DATABASE "${database}"`);
    const local = await createStore(directory);
    const assetId=randomUUID(), responseId=randomUUID();
    const password=await hashPassword('migration-test-password');
    await local.change(state=>{
      state.admin={username:'admin',password};
      const asset={id:assetId,kind:'audio',name:'music.mp3',size:8000000,mime:'audio/mpeg',createdAt:new Date().toISOString(),provider:'cloudinary',url:'https://res.cloudinary.com/test/video/upload/music.mp3',publicId:'test/music'};
      state.assets.push(asset);
      const record=state.invitations[0];
      record.draft.music.src=asset.url;
      record.draft.accounts=[{bank:'Bank Contoh',holder:'Contoh',number:'001234567890',qr:''}];
      record.published=structuredClone(record.draft);record.publishedAt=new Date().toISOString();
      record.responses.push({id:responseId,name:'Tamu & Keluarga',attendance:'yes',guests:2,message:'Selamat!',visible:true,createdAt:new Date().toISOString()});
      record.draft.couple[0].name='Draft baru';
    });
    const original=await readFile(join(directory,'store.json'),'utf8');
    const a=await createPostgresStore({env});stores.push(a);
    const b=await createPostgresStore({env});stores.push(b);
    await t.test('migration preserves hashes, URLs, drafts, publication, accounts and responses',async()=>{
      await assert.rejects(createConfiguredStore({directory,env}),/db:migrate-json/);
      assert.ok(isEmptyState(await a.read()));
      assert.equal((await importJSON(a,join(directory,'store.json'))).invitations,1);
      assert.deepEqual(await a.read(),local.read());
      assert.ok(await verifyPassword('migration-test-password',(await a.read()).admin.password));
      assert.equal(await readFile(join(directory,'store.json'),'utf8'),original);
      await assert.rejects(importJSON(a,join(directory,'store.json')),/sudah berisi data/);
    });
    await t.test('concurrent clients preserve both edits and rollback failed transactions',async()=>{
      const before=(await a.read()).invitations[0].revision;
      await Promise.all([a.change(async state=>{await new Promise(r=>setTimeout(r,40));state.invitations[0].revision++;}),b.change(state=>{state.invitations[0].revision++;})]);
      assert.equal((await b.read()).invitations[0].revision,before+2);
      const snapshot=await a.read();
      await assert.rejects(a.change(state=>{state.admin.username='should-rollback';state.invitations.push({...structuredClone(state.invitations[0]),id:randomUUID()});}),error=>error.code==='23505');
      assert.deepEqual(await b.read(),snapshot);
    });
    await t.test('separate function instances share login/CSRF/logout and preserve published data',async()=>{
      for(const store of [a,b]){
        const api=await createAPI({store,env,directory});
        const server=createServer(async(req,res)=>{try{await api(req,res,new URL(req.url,'http://localhost'));}catch(error){json(res,error.status||500,{error:error.message});}});
        await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));servers.push(server);
      }
      const bases=servers.map(server=>'http://127.0.0.1:'+server.address().port);
      const login=await fetch(bases[0]+'/api/login',{method:'POST',headers:{Origin:bases[0],'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:'migration-test-password'})});
      assert.equal(login.status,200);const session=await login.json(),cookie=login.headers.get('set-cookie').split(';')[0];
      const headers={Cookie:cookie,Origin:bases[1],'X-CSRF-Token':session.csrf,'Content-Type':'application/json'};
      const secondSession=await(await fetch(bases[1]+'/api/session',{headers})).json();
      assert.equal(secondSession.authenticated,true);assert.equal(secondSession.database.provider,'postgres');
      const record=(await b.read()).invitations[0];
      const publicData=await(await fetch(bases[1]+'/api/invitations/'+record.slug)).json();
      assert.notEqual(publicData.couple[0].name,'Draft baru');
      assert.equal((await fetch(bases[1]+`/api/admin/invitations/${record.id}/responses`,{method:'PATCH',headers,body:JSON.stringify({id:responseId,visible:false})})).status,200);
      assert.equal((await a.read()).invitations[0].responses[0].visible,false);
      assert.equal((await fetch(bases[1]+'/api/logout',{method:'POST',headers,body:'{}'})).status,200);
      assert.equal((await(await fetch(bases[0]+'/api/session',{headers:{Cookie:cookie}})).json()).authenticated,false);
    });
  } finally {
    for(const server of servers)await new Promise(resolve=>server.close(resolve));
    for(const store of stores)await store.close();
    await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);await admin.end();
    await rm(directory,{recursive:true,force:true});
  }
});
