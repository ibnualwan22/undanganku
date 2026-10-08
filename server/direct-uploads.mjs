import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { AppError } from './schema.mjs';
import { storageStatus, cloudinarySignature } from './uploads.mjs';

const limits = {image:10*1024*1024, audio:20*1024*1024};
const formats = {image:{jpg:'image/jpeg',png:'image/png',webp:'image/webp'}, audio:{mp3:'audio/mpeg',wav:'audio/wav',ogg:'audio/ogg'}};
const mac = (payload, secret) => createHmac('sha256',secret).update('undangan-upload-v1.'+payload).digest();
function configuration(env) {
  const status = storageStatus(env);
  if (!status.ready || status.provider !== 'cloudinary') throw new AppError('Upload langsung memerlukan konfigurasi Cloudinary lengkap.',503);
  if (!/^[a-zA-Z0-9_-]+$/.test(env.CLOUDINARY_CLOUD_NAME)) throw new AppError('Cloud name Cloudinary tidak valid.',503);
}
export function signDirectUpload(input, env, now = Date.now()) {
  configuration(env);
  const {kind, size} = input;
  if (!Object.hasOwn(limits,kind) || !Number.isInteger(size) || size <= 0 || size > limits[kind]) throw new AppError('Pilih gambar maksimal 10 MB atau musik maksimal 20 MB.');
  const id = randomUUID(), folder = (env.CLOUDINARY_FOLDER || 'undangan-onlineku').replace(/^\/+|\/+$/g,'');
  const publicId = `${folder}/${id}`;
  const params = {public_id:publicId, timestamp:String(Math.floor(now/1000)), overwrite:'false', allowed_formats:Object.keys(formats[kind]).join(',')};
  const ticket = {id,kind,name:String(input.name||'upload').slice(0,200),publicId,expires:now+15*60_000,createdAt:new Date(now).toISOString()};
  const payload = Buffer.from(JSON.stringify(ticket)).toString('base64url');
  return {
    url:`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/${kind==='audio'?'video':'image'}/upload`,
    fields:{...params, api_key:env.CLOUDINARY_API_KEY, signature:cloudinarySignature(params,env.CLOUDINARY_API_SECRET)},
    ticket:payload+'.'+mac(payload,env.CLOUDINARY_API_SECRET).toString('base64url'),
  };
}
export async function completeDirectUpload(token, env, {fetcher=fetch, now=Date.now()} = {}) {
  configuration(env);
  if (typeof token !== 'string' || token.length > 4000) throw new AppError('Izin upload tidak valid.',403);
  const [payload, signature, extra] = token.split('.');
  const actual = Buffer.from(signature||'', 'base64url'), expected = mac(payload||'',env.CLOUDINARY_API_SECRET);
  if (extra || actual.length !== expected.length || !timingSafeEqual(actual,expected)) throw new AppError('Izin upload tidak valid.',403);
  let ticket;try { ticket=JSON.parse(Buffer.from(payload,'base64url').toString()); } catch { throw new AppError('Izin upload tidak valid.',403); }
  if (ticket.expires < now) throw new AppError('Izin upload kedaluwarsa. Pilih file kembali.',403);
  const resourceType = ticket.kind==='audio'?'video':'image';
  let response;
  try {
    response = await fetcher(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/resources/${resourceType}/upload/${encodeURIComponent(ticket.publicId)}`, {
      headers:{Authorization:'Basic '+Buffer.from(env.CLOUDINARY_API_KEY+':'+env.CLOUDINARY_API_SECRET).toString('base64')}, signal:AbortSignal.timeout(20000),
    });
  } catch { throw new AppError('File telah dikirim, tetapi konfirmasi Cloudinary belum berhasil. Coba lagi.',502); }
  const media = await response.json().catch(()=>({}));
  if (!response.ok) throw new AppError(`Cloudinary belum dapat mengonfirmasi upload (HTTP ${response.status}). Periksa izin API dan kuota.`,502);
  let url;try { url=new URL(media.secure_url); } catch { throw new AppError('URL media Cloudinary tidak valid.',502); }
  const mime = formats[ticket.kind]?.[media.format];
  if (media.public_id !== ticket.publicId || media.resource_type !== resourceType || !mime || !Number.isInteger(media.bytes) || media.bytes <= 0 || media.bytes > limits[ticket.kind] || url.protocol!=='https:' || url.hostname!=='res.cloudinary.com' || !url.pathname.startsWith('/'+env.CLOUDINARY_CLOUD_NAME+'/')) throw new AppError('Jenis atau ukuran file Cloudinary tidak sesuai batas upload.',400);
  return {id:ticket.id,kind:ticket.kind,name:ticket.name,size:media.bytes,mime,createdAt:ticket.createdAt,provider:'cloudinary',url:url.href,publicId:ticket.publicId};
}
