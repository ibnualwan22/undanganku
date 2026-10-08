import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { createStore } from '../server/store.mjs';
import { createAPI, json } from '../server/api.mjs';
import { mapEmbedURL } from '../server/schema.mjs';
import { detectMedia, uploadMedia, storageStatus, cloudinarySignature } from '../server/uploads.mjs';

test('map embeds accept Google Maps and reject script, lookalike domains, and arbitrary iframes',()=>{
  const url='https://www.google.com/maps/embed?pb=example';
  assert.equal(mapEmbedURL(`<iframe src="${url}" onload="alert(1)"></iframe>`),url);
  for(const value of ['javascript:alert(1)','https://google.com.evil.test/maps/embed','https://www.google.com@evil.test/maps/embed','https://www.google.com/maps/place/test','<iframe src="https://evil.test"></iframe>'])assert.throws(()=>mapEmbedURL(value));
});
test('file validation and Cloudinary configuration do not silently downgrade partial credentials',()=>{
  assert.equal(storageStatus({}).provider,'local');
  assert.equal(storageStatus({CLOUDINARY_API_KEY:'test'}).ready,false);
  assert.equal(storageStatus({MEDIA_STORAGE:'cloudinary'}).ready,false);
  assert.equal(storageStatus({VERCEL:'1'}).ready,false);
  assert.equal(storageStatus({VERCEL:'1',MEDIA_STORAGE:'local'}).ready,false);
  assert.throws(()=>detectMedia(Buffer.from('<svg onload="alert(1)"></svg>'),'image'));
  assert.throws(()=>detectMedia(Buffer.from('<html>test</html>'),'audio'));
});
test('Cloudinary image and audio uploads are signed on server and return usable asset metadata',async()=>{
  const env={CLOUDINARY_CLOUD_NAME:'test-cloud',CLOUDINARY_API_KEY:'test-key',CLOUDINARY_API_SECRET:'test-secret'};
  for(const [kind,buffer,resource] of [['image',Buffer.from([137,80,78,71,13,10,26,10]),'image'],['audio',Buffer.from('ID3testaudio'),'video']]){
    const asset=await uploadMedia({buffer,kind,name:'sample',env,directory:'/unused',fetcher:async(url,request)=>{
      assert.ok(url.endsWith(`/${resource}/upload`));
      const body=request.body, params=Object.fromEntries(['folder','public_id','timestamp'].map(key=>[key,body.get(key)]));
      assert.equal(body.get('signature'),cloudinarySignature(params,env.CLOUDINARY_API_SECRET));assert.equal(body.has('api_secret'),false);
      return new Response(JSON.stringify({secure_url:'https://res.cloudinary.com/test-cloud/asset',public_id:'test-asset'}),{status:200});
    }});
    assert.equal(asset.provider,'cloudinary');assert.equal(asset.kind,kind);assert.equal(asset.publicId,'test-asset');
  }
});
test('admin integration: authenticated editing, uploads, publication, persistence, RSVP, and moderation',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'undangan-tests-'));
  const store=await createStore(directory),api=await createAPI({store,env:{MEDIA_STORAGE:'local'},directory});
  const server=createServer(async(req,res)=>{try{await api(req,res,new URL(req.url,'http://localhost'));}catch(error){json(res,error.status||500,{error:error.message});}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;let cookie='',csrf='';
  const request=async(path,{method='GET',body,auth=true,origin=base}={})=>{
    const headers={Origin:origin,...(auth?{Cookie:cookie,'X-CSRF-Token':csrf}:{})};
    if(body&&!(body instanceof FormData))headers['Content-Type']='application/json';
    const response=await fetch(base+path,{method,headers,...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})});
    return {status:response.status,data:await response.json(),headers:response.headers};
  };
  try{
    await t.test('login setup, secrets, and CSRF boundaries',async()=>{
      assert.equal((await request('/api/admin/invitations')).status,401);
      const setup=await request('/api/setup',{method:'POST',body:{username:'admin',password:'example-test-password'}});
      assert.equal(setup.status,201);cookie=setup.headers.get('set-cookie').split(';')[0];csrf=setup.data.csrf;
      assert.match(setup.headers.get('set-cookie'),/HttpOnly/);assert.match(setup.headers.get('set-cookie'),/SameSite=Strict/);
      assert.equal((await request('/api/session')).data.authenticated,true);
      const disk=await readFile(join(directory,'store.json'),'utf8');assert.ok(!disk.includes('example-test-password'));
      assert.equal((await request('/api/admin/invitations',{method:'POST',body:{},origin:'https://evil.test'})).status,403);
      const prior=csrf;csrf='bad';assert.equal((await request('/api/admin/invitations',{method:'POST',body:{}})).status,403);csrf=prior;
    });
    let record=(await request('/api/admin/invitations')).data.invitations[0];
    record=(await request(`/api/admin/invitations/${record.id}`)).data;
    await t.test('drafts remain private and media can be uploaded from multipart forms',async()=>{
      assert.equal((await request(`/api/invitations/${record.slug}`,{auth:false})).status,404);
      const form=new FormData();form.append('kind','image');form.append('file',new Blob([await readFile(new URL('../public/assets/wedding-garden.jpg',import.meta.url))],{type:'image/jpeg'}),'photo.jpg');
      const uploaded=await request('/api/admin/uploads',{method:'POST',body:form});assert.equal(uploaded.status,201);assert.equal(uploaded.data.asset.provider,'local');
      record.draft.couplePhoto=uploaded.data.asset.url;
      const audio=new FormData();audio.append('kind','audio');audio.append('file',new Blob([Buffer.from('ID3testaudio')],{type:'audio/mpeg'}),'song.mp3');
      const song=await request('/api/admin/uploads',{method:'POST',body:audio});assert.equal(song.status,201);record.draft.music.src=song.data.asset.url;
    });
    await t.test('save validates map, bank account, media origin, and optimistic revision',async()=>{
      record.draft.events[0].mapEmbed='<iframe src="https://www.google.com/maps/embed?pb=example"></iframe>';
      record.draft.accounts=[{bank:'Bank Contoh',number:'001234567890',holder:'Nama Contoh',qr:''}];record.draft.sections.gifts=true;record.draft.sections.gallery=false;
      const saved=await request(`/api/admin/invitations/${record.id}`,{method:'PUT',body:record});assert.equal(saved.status,200);assert.equal(saved.data.draft.events[0].mapEmbed,'https://www.google.com/maps/embed?pb=example');
      assert.equal((await request(`/api/admin/invitations/${record.id}`,{method:'PUT',body:record})).status,409);record=saved.data;
      const malicious=structuredClone(record);malicious.draft.coverPhoto='https://evil.test/track.jpg';assert.equal((await request(`/api/admin/invitations/${record.id}`,{method:'PUT',body:malicious})).status,400);
      const reopened=await createStore(directory);assert.equal(reopened.read().invitations[0].draft.accounts[0].number,'001234567890');
    });
    await t.test('publication snapshot and hidden sections protect unpublished changes',async()=>{
      assert.equal((await request(`/api/admin/invitations/${record.id}/publish`,{method:'POST',body:{revision:record.revision}})).status,200);
      record=(await request(`/api/admin/invitations/${record.id}`)).data;
      const published=(await request(`/api/invitations/${record.slug}`,{auth:false})).data;
      assert.deepEqual(published.gallery,[]);assert.equal(published.accounts[0].number,'001234567890');
      record.draft.couple[0].name='Revisi Draft';
      record=(await request(`/api/admin/invitations/${record.id}`,{method:'PUT',body:record})).data;
      assert.equal((await request(`/api/invitations/${record.slug}`,{auth:false})).data.couple[0].name,published.couple[0].name);
      const renamed={...record,slug:'tautan-lain'};assert.equal((await request(`/api/admin/invitations/${record.id}`,{method:'PUT',body:renamed})).status,400);
    });
    await t.test('RSVP stored once, wishes require moderation, attendance remains private',async()=>{
      const body={submissionId:randomUUID(),name:'Tamu Pengujian',attendance:'yes',guests:2,message:'Selamat!',website:''};
      const path=`/api/invitations/${record.slug}`;
      assert.equal((await request(path+'/rsvp',{method:'POST',body,auth:false})).status,201);
      assert.equal((await request(path+'/rsvp',{method:'POST',body,auth:false})).status,201);
      assert.equal((await request(path+'/wishes',{auth:false})).data.wishes.length,0);
      const responses=(await request(`/api/admin/invitations/${record.id}/responses`)).data.responses;assert.equal(responses.length,1);assert.equal(responses[0].guests,2);
      assert.equal((await request(`/api/admin/invitations/${record.id}/responses`,{method:'PATCH',body:{id:body.submissionId,visible:true}})).status,200);
      assert.deepEqual((await request(path+'/wishes',{auth:false})).data.wishes,[{name:'Tamu Pengujian',message:'Selamat!'}]);
      assert.equal((await request(`/api/admin/invitations/${record.id}/unpublish`,{method:'POST',body:{revision:record.revision}})).status,200);
      assert.equal((await request(path,{auth:false})).status,404);
    });
  }finally{await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});}
});
