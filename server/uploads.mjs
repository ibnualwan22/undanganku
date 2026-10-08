import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AppError } from './schema.mjs';

export function storageStatus(env) {
  const count = [env.CLOUDINARY_CLOUD_NAME,env.CLOUDINARY_API_KEY,env.CLOUDINARY_API_SECRET].filter(Boolean).length;
  const mode = env.MEDIA_STORAGE || 'auto';
  if (!['auto','local','cloudinary'].includes(mode)) return {provider:'unavailable',ready:false,message:'MEDIA_STORAGE harus auto, local, atau cloudinary.'};
  if (env.VERCEL && mode === 'local') return {provider:'cloudinary',ready:false,message:'Gunakan MEDIA_STORAGE=cloudinary di Vercel. Penyimpanan file lokal tidak permanen.'};
  if (mode === 'local') return {provider:'local',ready:true,message:'Upload disimpan pada server ini.'};
  if (count === 3) return {provider:'cloudinary',ready:true,message:'Cloudinary siap menerima upload.'};
  if (count || mode === 'cloudinary' || env.VERCEL) return {provider:'cloudinary',ready:false,message:'Lengkapi CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, dan CLOUDINARY_API_SECRET pada environment server, lalu restart atau redeploy.'};
  return {provider:'local',ready:true,message:'Cloudinary belum dikonfigurasi. Upload disimpan pada server ini.'};
}
export function detectMedia(buffer,kind) {
  let format;
  if (kind === 'image') {
    if (buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) format={ext:'png',mime:'image/png'};
    else if (buffer[0]===255 && buffer[1]===216 && buffer[2]===255) format={ext:'jpg',mime:'image/jpeg'};
    else if (buffer.toString('ascii',0,4)==='RIFF' && buffer.toString('ascii',8,12)==='WEBP') format={ext:'webp',mime:'image/webp'};
  } else if (kind === 'audio') {
    if (buffer.toString('ascii',0,3)==='ID3' || (buffer[0]===255 && (buffer[1]&0xe0)===0xe0)) format={ext:'mp3',mime:'audio/mpeg'};
    else if (buffer.toString('ascii',0,4)==='RIFF' && buffer.toString('ascii',8,12)==='WAVE') format={ext:'wav',mime:'audio/wav'};
    else if (buffer.toString('ascii',0,4)==='OggS') format={ext:'ogg',mime:'audio/ogg'};
  }
  if (!format) throw new AppError(kind==='image' ? 'Gunakan gambar JPG, PNG, atau WebP yang valid.' : 'Gunakan audio MP3, WAV, atau OGG yang valid.');
  const limit = (kind==='image' ? 10 : 20)*1024*1024;
  if (buffer.length > limit) throw new AppError(`Ukuran file maksimal ${kind==='image' ? 10 : 20} MB.`,413);
  return format;
}
export function cloudinarySignature(parameters,secret) {
  const serialized=Object.keys(parameters).sort().map(key=>`${key}=${parameters[key]}`).join('&');
  return createHash('sha256').update(serialized+secret).digest('hex');
}
export async function uploadMedia({buffer,kind,name,env,directory,fetcher=fetch}) {
  const status=storageStatus(env); if(!status.ready) throw new AppError(status.message,503);
  const format=detectMedia(buffer,kind), id=randomUUID();
  const base={id,kind,name:String(name||`upload.${format.ext}`).slice(0,200),size:buffer.length,mime:format.mime,createdAt:new Date().toISOString(),provider:status.provider};
  if(status.provider==='local') {
    await mkdir(join(directory,'uploads'),{recursive:true,mode:0o700});
    await writeFile(join(directory,'uploads',`${id}.${format.ext}`),buffer,{mode:0o600});
    return {...base,url:`/uploads/${id}.${format.ext}`};
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(env.CLOUDINARY_CLOUD_NAME)) throw new AppError('Cloud name Cloudinary tidak valid.',503);
  const params={folder:env.CLOUDINARY_FOLDER||'undangan-onlineku',public_id:id,timestamp:String(Math.floor(Date.now()/1000))};
  const form=new FormData();
  for(const [key,value] of Object.entries(params)) form.append(key,value);
  form.append('api_key',env.CLOUDINARY_API_KEY); form.append('signature',cloudinarySignature(params,env.CLOUDINARY_API_SECRET));
  form.append('file',new Blob([buffer],{type:format.mime}),`${id}.${format.ext}`);
  let response;
  try { response=await fetcher(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/${kind==='audio'?'video':'image'}/upload`,{method:'POST',body:form,signal:AbortSignal.timeout(120000)}); }
  catch { throw new AppError('Tidak dapat terhubung ke Cloudinary. Periksa koneksi dan coba upload lagi.',502); }
  const result=await response.json().catch(()=>({}));
  if(!response.ok || !result.secure_url?.startsWith('https://res.cloudinary.com/')) throw new AppError('Cloudinary menolak upload. Periksa kredensial, kuota, dan pengaturan akun sebelum mencoba lagi.',502);
  return {...base,url:result.secure_url,publicId:result.public_id};
}
