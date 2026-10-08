import { randomUUID } from 'node:crypto';
import { AppError, newInvitation, validateInvitation, publicInvitation, validateResponse } from './schema.mjs';
import { findRecord, checkRevision } from './store.mjs';
import { hashPassword, verifyPassword, createAuth } from './auth.mjs';
import { storageStatus, uploadMedia } from './uploads.mjs';
import { signDirectUpload, completeDirectUpload } from './direct-uploads.mjs';

export function json(res,status,data) { res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(JSON.stringify(data)); }
async function readBody(req,limit=512*1024) {
  if(Number(req.headers['content-length'])>limit) throw new AppError('Data terlalu besar.',413);
  if(Buffer.isBuffer(req.body)||typeof req.body==='string'){
    const body=Buffer.from(req.body);if(body.length>limit)throw new AppError('Data terlalu besar.',413);return body;
  }
  const parts=[]; let size=0;
  for await(const part of req) { size+=part.length; if(size>limit) throw new AppError('Data terlalu besar.',413); parts.push(part); }
  return Buffer.concat(parts);
}
async function readJSON(req) {
  if(!req.headers['content-type']?.startsWith('application/json')) throw new AppError('Gunakan data JSON.',415);
  // Vercel's Node runtime can supply an already-parsed JSON body.
  if(req.body && typeof req.body==='object' && !Buffer.isBuffer(req.body)){
    if(Buffer.byteLength(JSON.stringify(req.body))>512*1024)throw new AppError('Data terlalu besar.',413);
    return req.body;
  }
  try { return JSON.parse((await readBody(req)).toString('utf8')); } catch(error) { if(error instanceof AppError) throw error; throw new AppError('Data JSON tidak valid.'); }
}
const summary=record=>({id:record.id,slug:record.slug,names:record.draft.couple.map(person=>person.name).join(' & '),date:record.draft.date,status:record.published?'published':'draft',revision:record.revision,updatedAt:record.updatedAt,publishedAt:record.publishedAt,responses:record.responses.length});
const loopback=req=>['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress);

export async function createAPI({store,env,directory}) {
  if(env.ADMIN_PASSWORD && !(await store.read()).admin) {
    const password=await hashPassword(env.ADMIN_PASSWORD);
    await store.change(state=>{if(!state.admin)state.admin={username:env.ADMIN_USERNAME||'admin',password};});
  }
  const auth=createAuth(env.APP_ORIGIN?.startsWith('https://'),store.sessions);
  const setupAllowed=req=>loopback(req)&&!env.APP_ORIGIN;
  const limits=new Map();
  function throttle(key,max,window=600000) {
    const now=Date.now();
    for(const [k,v] of limits) if(v.until<now) limits.delete(k);
    const current=limits.get(key)||{count:0,until:now+window};
    current.count++; limits.set(key,current);
    if(current.count>max) throw new AppError('Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.',429);
  }
  return async function handleAPI(req,res,url) {
    const path=url.pathname, method=req.method;
    if(!['GET','HEAD'].includes(method)) {
      const expected=env.APP_ORIGIN || `http://${req.headers.host}`;
      if(req.headers.origin!==expected) throw new AppError('Permintaan berasal dari halaman yang tidak diizinkan.',403);
    }
    if(path==='/api/session' && method==='GET') {
      const current=await auth.session(req);
      json(res,200,{initialized:!!(await store.read()).admin,setupAllowed:setupAllowed(req),authenticated:!!current,...(current?{username:current.username,csrf:current.csrf}:{}),storage:storageStatus(env),database:{provider:store.provider||'json'}}); return;
    }
    if(path==='/api/setup' && method==='POST') {
      if(!setupAllowed(req)) throw new AppError('Untuk hosting publik, isi ADMIN_PASSWORD di .env sebelum menjalankan server. Setup browser hanya tersedia di komputer lokal.',403);
      throttle(`setup:${req.socket.remoteAddress}`,5);
      const input=await readJSON(req), username=String(input.username||'admin').trim();
      if(!/^[a-zA-Z0-9_.-]{3,40}$/.test(username)) throw new AppError('Username terdiri dari 3–40 huruf, angka, titik, garis bawah, atau tanda hubung.');
      const password=await hashPassword(input.password);
      await store.change(state=>{if(state.admin) throw new AppError('Akun admin sudah dibuat.',409);state.admin={username,password};});
      json(res,201,{...await auth.login(res,username)});return;
    }
    if(path==='/api/login' && method==='POST') {
      throttle(`login:${req.socket.remoteAddress}`,15);
      const input=await readJSON(req), admin=(await store.read()).admin;
      if(!admin || !(await verifyPassword(input.password,admin.password)) || input.username!==admin.username) throw new AppError('Username atau password tidak cocok.',401);
      json(res,200,await auth.login(res,admin.username));return;
    }
    if(path==='/api/logout' && method==='POST') {await auth.require(req,true);await auth.logout(req,res);json(res,200,{ok:true});return;}
    if(path.startsWith('/api/admin/')) {
      await auth.require(req,!['GET','HEAD'].includes(method));
      if(path==='/api/admin/invitations' && method==='GET') {json(res,200,{invitations:(await store.read()).invitations.map(summary)});return;}
      if(path==='/api/admin/invitations' && method==='POST') {
        const id=randomUUID(), now=new Date().toISOString();
        const record={id,slug:`undangan-${id.slice(0,8)}`,revision:1,createdAt:now,updatedAt:now,publishedAt:null,draft:newInvitation(id),published:null,responses:[]};
        record.draft.couple=[{name:'Mempelai Wanita',fullName:'Nama lengkap mempelai wanita',family:''},{name:'Mempelai Pria',fullName:'Nama lengkap mempelai pria',family:''}];
        record.draft.gallery=[];record.draft.couplePhoto='';record.draft.story=[];record.draft.sections.story=false;record.draft.sections.gallery=false;
        await store.change(state=>{if(state.invitations.length>=1000)throw new AppError('Batas 1.000 undangan tercapai.');state.invitations.push(record);});
        json(res,201,record);return;
      }
      if(path==='/api/admin/uploads' && method==='POST') {
        throttle(`upload:${req.socket.remoteAddress}`,80);
        const type=req.headers['content-type'];
        if(!type?.startsWith('multipart/form-data')) throw new AppError('Pilih file untuk diunggah.',415);
        const body=await readBody(req,21*1024*1024);
        let form;try{form=await new Request('http://localhost/upload',{method:'POST',headers:{'content-type':type},body}).formData();}catch{throw new AppError('Form upload tidak valid.');}
        const file=form.get('file'),kind=form.get('kind');
        if(!file || typeof file.arrayBuffer!=='function' || !['image','audio'].includes(kind)) throw new AppError('File atau jenis upload tidak valid.');
        const asset=await uploadMedia({buffer:Buffer.from(await file.arrayBuffer()),kind,name:file.name,env,directory});
        await store.change(state=>state.assets.push(asset));json(res,201,{asset});return;
      }
      if(path==='/api/admin/uploads/sign' && method==='POST') {
        throttle(`upload-sign:${req.socket.remoteAddress}`,80);
        json(res,200,signDirectUpload(await readJSON(req),env));return;
      }
      if(path==='/api/admin/uploads/complete' && method==='POST') {
        throttle(`upload-complete:${req.socket.remoteAddress}`,120);
        const input=await readJSON(req), asset=await completeDirectUpload(input.ticket,env);
        await store.change(state=>{if(!state.assets.some(item=>item.id===asset.id))state.assets.push(asset);});
        json(res,201,{asset});return;
      }
      const match=path.match(/^\/api\/admin\/invitations\/([a-zA-Z0-9-]+)(?:\/(publish|unpublish|responses))?$/);
      if(match) {
        const [,id,action]=match;
        if(method==='GET') {
          const record=findRecord(await store.read(),id);
          json(res,200,action==='responses'?{responses:record.responses}:{...record,responses:undefined,responseCount:record.responses.length});return;
        }
        const input=await readJSON(req);
        if(!action && method==='PUT') {
          const result=await store.change(state=>{
            const record=findRecord(state,id);checkRevision(record,input.revision);
            const slug=String(input.slug||'').trim().toLowerCase();
            if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length>80 || slug.length<3) throw new AppError('Tautan undangan memakai 3–80 huruf kecil, angka, atau tanda hubung.');
            if(record.publishedAt && slug!==record.slug) throw new AppError('Tautan undangan yang pernah diterbitkan tetap agar tautan tamu tidak rusak.');
            if(state.invitations.some(item=>item.id!==id&&item.slug===slug)) throw new AppError('Tautan itu sudah dipakai undangan lain.',409);
            record.draft=validateInvitation(input.draft,id,state.assets);record.slug=slug;record.revision++;record.updatedAt=new Date().toISOString();
            return {...record,responses:undefined,responseCount:record.responses.length};
          });json(res,200,result);return;
        }
        if(['publish','unpublish'].includes(action) && method==='POST') {
          const result=await store.change(state=>{
            const record=findRecord(state,id);checkRevision(record,input.revision);
            if(action==='publish') {
              const draft=validateInvitation(record.draft,id,state.assets);
              if(draft.sections.gifts&&!draft.accounts.length)throw new AppError('Tambahkan rekening terlebih dahulu atau matikan bagian Hadiah digital.');
              record.published=structuredClone(draft);record.publishedAt=new Date().toISOString();
            }else record.published=null;
            record.revision++;record.updatedAt=new Date().toISOString();return summary(record);
          });json(res,200,result);return;
        }
        if(action==='responses' && method==='PATCH') {
          const result=await store.change(state=>{
            const record=findRecord(state,id), response=record.responses.find(item=>item.id===input.id);
            if(!response)throw new AppError('Respons tidak ditemukan.',404);
            response.visible=input.visible===true;return response;
          });json(res,200,result);return;
        }
      }
      throw new AppError('Halaman admin tidak ditemukan.',404);
    }
    const publicMatch=path.match(/^\/api\/invitations\/([a-z0-9-]+)(?:\/(rsvp|wishes))?$/);
    if(publicMatch) {
      const [,slug,action]=publicMatch;
      const record=(await store.read()).invitations.find(item=>item.slug===slug&&item.published);
      if(!record)throw new AppError('Undangan belum diterbitkan atau tidak ditemukan.',404);
      if(method==='GET'&&!action){json(res,200,{...publicInvitation(record.published),slug});return;}
      if(method==='GET'&&action==='wishes') {json(res,200,{wishes:record.published.sections.wishes?record.responses.filter(item=>item.visible&&item.message).slice(-100).reverse().map(({name,message})=>({name,message})):[]});return;}
      if(method==='POST'&&action==='rsvp') {
        throttle(`rsvp:${record.id}:${req.socket.remoteAddress}`,30);
        const input=await readJSON(req);
        if(input.website)throw new AppError('Permintaan tidak valid.');
        if(!/^[a-f0-9-]{36}$/.test(input.submissionId||''))throw new AppError('ID pengiriman tidak valid. Muat ulang halaman.');
        await store.change(state=>{
          const current=findRecord(state,record.id);
          if(!current.published || (!current.published.sections.rsvp&&!current.published.sections.wishes))throw new AppError('Formulir sedang ditutup.',403);
          if(current.responses.some(item=>item.id===input.submissionId))return;
          if(current.responses.length>=20000)throw new AppError('Formulir telah mencapai kapasitas. Hubungi penyelenggara.',409);
          current.responses.push({...validateResponse(input,current.published.sections),id:input.submissionId,visible:false,createdAt:new Date().toISOString()});
        });json(res,201,{ok:true});return;
      }
    }
    throw new AppError('Halaman tidak ditemukan.',404);
  };
}
