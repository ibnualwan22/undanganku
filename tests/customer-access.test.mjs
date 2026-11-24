import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { createStore } from '../server/store.mjs';
import { createAPI,json } from '../server/api.mjs';
import { signDirectUpload,completeDirectUpload } from '../server/direct-uploads.mjs';

test('customer accounts isolate records, lock identity, scope uploads and revoke sessions',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'aksara-access-'));
 const store=await createStore(directory),env={MEDIA_STORAGE:'local',ADMIN_USERNAME:'admin',ADMIN_PASSWORD:'test-admin-password-2026'};
 const api=await createAPI({store,env,directory});
 const server=createServer(async(req,res)=>{try{await api(req,res,new URL(req.url,'http://localhost'));}catch(error){json(res,error.status||500,{error:error.message});}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const request=async(account,path,method='GET',body)=>{
  const headers={Origin:base,...(account?{Cookie:account.cookie,'X-CSRF-Token':account.csrf}:{})};
  if(body && !(body instanceof FormData))headers['Content-Type']='application/json';
  const response=await fetch(base+path,{method,headers,...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})});
  return {status:response.status,data:await response.json(),headers:response.headers};
 };
 const login=async credentials=>{const result=await request(null,'/api/login','POST',credentials);assert.equal(result.status,200);return {...result.data,cookie:result.headers.get('set-cookie').split(';')[0]};};
 let admin,a,b,one,two;
 try{
  admin=await login({username:'admin',password:env.ADMIN_PASSWORD});
  await t.test('new invitation receives one-time credentials; old invitation can receive access',async()=>{
   one=(await request(admin,'/api/admin/invitations','POST',{templateId:'monochrome-vows'})).data;
   two=(await request(admin,'/api/admin/invitations','POST',{templateId:'sunset-bloom'})).data;
   assert.ok(one.credentials.password.length>=20);assert.notEqual(one.credentials.username,two.credentials.username);
   const raw=await readFile(join(directory,'store.json'),'utf8');assert.ok(!raw.includes(one.credentials.password));assert.ok(!raw.includes(env.ADMIN_PASSWORD));
   a=await login(one.credentials);b=await login(two.credentials);assert.equal(a.role,'customer');assert.equal(a.invitationId,one.id);
   const legacy=store.read().invitations[0];
   const issued=await request(admin,`/api/admin/invitations/${legacy.id}/access`,'POST',{action:'reset',revision:legacy.revision});assert.equal(issued.status,200);assert.ok(issued.data.credentials);
   assert.equal((await request(admin,`/api/admin/invitations/${one.id}`)).data.access.password,undefined);
   assert.equal((await request(a,`/api/editor/invitations/${one.id}`)).data.access,undefined);
   assert.equal((await request(a,`/api/editor/invitations/${one.id}`)).data.credentials,undefined);
  });
  await t.test('customers cannot use admin routes or another invitation, including previews/responses/access',async()=>{
   for(const path of ['/api/admin/invitations',`/api/admin/invitations/${one.id}`,'/api/editor/invitations',`/api/editor/invitations/${two.id}`,`/api/editor/invitations/${two.id}/responses`])assert.equal((await request(a,path)).status,403,path);
   for(const [path,method] of [[`/api/editor/invitations/${two.id}`,'PUT'],[`/api/editor/invitations/${two.id}/publish`,'POST'],[`/api/editor/invitations/${one.id}/access`,'POST'],['/api/editor/invitations','POST'],['/api/admin/uploads/sign','POST']])assert.equal((await request(a,path,method,{})).status,403,path);
   assert.equal((await request(null,`/api/editor/invitations/${one.id}`)).status,401);
   const badCSRF={...a,csrf:'bad'};assert.equal((await request(badCSRF,`/api/editor/invitations/${one.id}`,'PUT',one)).status,403);
  });
  await t.test('crafted requests cannot change either name, design, slug, or inject access',async()=>{
   for(const change of [r=>r.draft.couple[0].name='Other',r=>r.draft.couple[1].fullName='Other',r=>r.draft.templateId='floral-reverie',r=>r.slug='other-link',r=>r.draft.couple=[]]){
    const changed=structuredClone(one);change(changed);assert.equal((await request(a,`/api/editor/invitations/${one.id}`,'PUT',changed)).status,403);
   }
   one.draft.location='Bandung';one.access={username:'hacked',password:'bad',role:'admin'};
   const saved=await request(a,`/api/editor/invitations/${one.id}`,'PUT',one);assert.equal(saved.status,200);one=saved.data;
   assert.equal(one.draft.location,'Bandung');assert.notEqual(store.read().invitations.find(r=>r.id===one.id).access.username,'hacked');
  });
  await t.test('upload belongs to its invitation; foreign media and text-based permission laundering are rejected',async()=>{
   const form=new FormData();form.append('kind','audio');form.append('file',new Blob([Buffer.from('ID3testaudio')],{type:'audio/mpeg'}),'song.mp3');
   const upload=await request(a,'/api/editor/uploads','POST',form);assert.equal(upload.status,201);assert.equal(upload.data.asset.invitationId,one.id);
   one.draft.music.src=upload.data.asset.url;
   one=(await request(a,`/api/editor/invitations/${one.id}`,'PUT',one)).data;
   two.draft.quote=upload.data.asset.url;
   two=(await request(b,`/api/editor/invitations/${two.id}`,'PUT',two)).data;
   two.draft.music.src=upload.data.asset.url;
   assert.equal((await request(b,`/api/editor/invitations/${two.id}`,'PUT',two)).status,400);
   two=(await request(b,`/api/editor/invitations/${two.id}`)).data;
   // Admin may assign existing media; customer can retain and edit around it.
   two.draft.music.src=upload.data.asset.url;
   two=(await request(admin,`/api/admin/invitations/${two.id}`,'PUT',two)).data;
   two.draft.location='Semarang';assert.equal((await request(b,`/api/editor/invitations/${two.id}`,'PUT',two)).status,200);
  });
  await t.test('customers can publish edits; reset/revoke invalidate existing sessions',async()=>{
   one.draft.events[0].venue='Gedung Bahagia';one.draft.events[0].mapEmbed='https://www.google.com/maps/embed?pb=example';one.draft.accounts=[{bank:'Bank Contoh',number:'12345678',holder:'Contoh',qr:''}];one.draft.sections.gifts=true;
   one=(await request(a,`/api/editor/invitations/${one.id}`,'PUT',one)).data;
   assert.equal((await request(a,`/api/editor/invitations/${one.id}/publish`,'POST',{revision:one.revision})).status,200);
   const live=(await request(null,`/api/invitations/${one.slug}`)).data;assert.equal(live.events[0].venue,'Gedung Bahagia');assert.equal(live.access,undefined);assert.equal(live.accounts[0].number,'12345678');
   one=(await request(admin,`/api/admin/invitations/${one.id}`)).data;
   const reset=await request(admin,`/api/admin/invitations/${one.id}/access`,'POST',{action:'reset',revision:one.revision});assert.equal(reset.status,200);
   assert.equal((await request(a,`/api/editor/invitations/${one.id}`)).status,401);assert.equal((await request(a,'/api/session')).data.authenticated,false);
   a=await login(reset.data.credentials);
   const revoke=await request(admin,`/api/admin/invitations/${one.id}/access`,'POST',{action:'revoke',revision:reset.data.record.revision});assert.equal(revoke.status,200);
   assert.equal((await request(a,`/api/editor/invitations/${one.id}`)).status,401);
   assert.equal((await request(null,'/api/login','POST',reset.data.credentials)).status,401);
   assert.equal((await request(b,`/api/editor/invitations/${two.id}`)).status,200);assert.equal((await request(null,`/api/invitations/${one.slug}`)).status,200);
   assert.equal((await request(admin,'/api/admin/invitations')).status,200);
  });
 }finally{await new Promise(resolve=>server.close(resolve));await store.close();await rm(directory,{recursive:true,force:true});}
});
test('signed Cloudinary upload tickets are bound to invitation scope before provider lookup',async()=>{
 const env={CLOUDINARY_CLOUD_NAME:'test',CLOUDINARY_API_KEY:'test',CLOUDINARY_API_SECRET:'test-secret'};
 const {ticket}=signDirectUpload({kind:'audio',size:100,name:'song.mp3'},env,Date.now(),'invitation-a');
 let fetched=false;
 for(const scope of ['invitation-b',null])await assert.rejects(completeDirectUpload(ticket,env,{scope,fetcher:async()=>{fetched=true;}}),error=>error.status===403);
 assert.equal(fetched,false);
 const payload=JSON.parse(Buffer.from(ticket.split('.')[0],'base64url'));
 const asset=await completeDirectUpload(ticket,env,{scope:'invitation-a',fetcher:async()=>new Response(JSON.stringify({public_id:payload.publicId,resource_type:'video',format:'mp3',bytes:100,secure_url:'https://res.cloudinary.com/test/video/upload/song.mp3'}))});
 assert.equal(asset.kind,'audio');
});
