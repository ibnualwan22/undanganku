import test from 'node:test';
import assert from 'node:assert/strict';
import { signDirectUpload, completeDirectUpload } from '../server/direct-uploads.mjs';
import { cloudinarySignature } from '../server/uploads.mjs';
import { uploadError } from '../src/upload-errors.js';

const env={CLOUDINARY_CLOUD_NAME:'test-cloud',CLOUDINARY_API_KEY:'test-key',CLOUDINARY_API_SECRET:'test-secret'};
test('direct music upload sends only small signed metadata through the app and verifies Cloudinary metadata',async()=>{
  const signed=signDirectUpload({name:'Musik & cinta.mp3',kind:'audio',size:8*1024*1024},env);
  assert.match(signed.url,/\/video\/upload$/);
  assert.ok(JSON.stringify(signed).length<2500);
  assert.ok(!JSON.stringify(signed).includes(env.CLOUDINARY_API_SECRET));
  const {api_key,signature,...params}=signed.fields;
  assert.equal(signature,cloudinarySignature(params,env.CLOUDINARY_API_SECRET));
  assert.equal(params.overwrite,'false');assert.equal(params.allowed_formats,'mp3,wav,ogg');
  const media={public_id:params.public_id,resource_type:'video',format:'mp3',bytes:8*1024*1024,secure_url:`https://res.cloudinary.com/test-cloud/video/upload/${params.public_id}.mp3`};
  const fetcher=async(url,options)=>{
    assert.match(url,/\/resources\/video\/upload\//);assert.ok(options.headers.Authorization.startsWith('Basic '));
    return new Response(JSON.stringify(media),{status:200});
  };
  const asset=await completeDirectUpload(signed.ticket,env,{fetcher});
  assert.equal(asset.kind,'audio');assert.equal(asset.provider,'cloudinary');assert.equal(asset.size,8*1024*1024);
  await assert.rejects(completeDirectUpload(signed.ticket+'a',env,{fetcher}),/tidak valid/);
  await assert.rejects(completeDirectUpload(signed.ticket,env,{fetcher,now:Date.now()+16*60_000}),/kedaluwarsa/);
  media.bytes=21*1024*1024;await assert.rejects(completeDirectUpload(signed.ticket,env,{fetcher}),/ukuran/);
  media.bytes=100;media.secure_url='https://evil.test/music.mp3';await assert.rejects(completeDirectUpload(signed.ticket,env,{fetcher}),/ukuran/);
});
test('direct image uploads keep their image resource type and reject unsupported request metadata',()=>{
  const signed=signDirectUpload({name:'foto.png',kind:'image',size:1024},env);
  assert.match(signed.url,/\/image\/upload$/);
  assert.equal(signed.fields.allowed_formats,'jpg,png,webp');
  assert.throws(()=>signDirectUpload({kind:'audio',size:21*1024*1024},env));
  assert.throws(()=>signDirectUpload({kind:'raw',size:10},env));
  assert.throws(()=>signDirectUpload({kind:'audio',size:100},{}));
});
test('non-JSON upload errors retain the useful hosting error instead of hiding it',()=>{
  assert.match(uploadError(413),/HTTP 413/);
  assert.match(uploadError(504),/batas waktu/);
  assert.match(uploadError(401),/Sesi admin/);
  assert.equal(uploadError(400,{error:'Format musik tidak didukung.'}),'Format musik tidak didukung.');
});
