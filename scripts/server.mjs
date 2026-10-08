import { createServer } from 'node:http';
import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { resolve, extname, sep, join } from 'node:path';
import { createConfiguredStore } from '../server/store.mjs';
import { createAPI, json } from '../server/api.mjs';
import { AppError } from '../server/schema.mjs';

const project=resolve(import.meta.dirname,'..');
try{process.loadEnvFile(join(project,'.env'));}catch(error){if(error.code!=='ENOENT')throw error;}
const env=process.env, root=resolve(project,process.argv.includes('--dist')?'dist':'.');
const directory=resolve(project,env.DATA_DIR||'data');
const port=Number(env.PORT||4173), host=env.HOST||'127.0.0.1';
let store, api;
try {
  store=await createConfiguredStore({directory,env});
  api=await createAPI({store,env,directory});
} catch (error) {
  console.error(error.code ? 'Penyimpanan data gagal dihubungkan. Periksa DATABASE_URL, izin akun, koneksi, dan SSL.' : error.message);
  await store?.close(); process.exit(1);
}
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8','.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg'};
const server=createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','SAMEORIGIN');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://res.cloudinary.com; media-src 'self' blob: https://res.cloudinary.com; frame-src 'self' https://www.google.com https://google.com https://maps.google.com; connect-src 'self' https://api.cloudinary.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'");
  try{
    const url=new URL(req.url,'http://localhost'), pathname=decodeURIComponent(url.pathname);
    const requestHost=new URL(`http://${req.headers.host}`).hostname;
    const allowedHost=env.APP_ORIGIN?new URL(env.APP_ORIGIN).hostname:null;
    if(!['localhost','127.0.0.1','[::1]',allowedHost].includes(requestHost))throw new AppError('Host tidak diizinkan. Atur APP_ORIGIN untuk domain hosting.',403);
    if(pathname.startsWith('/api/')){await api(req,res,url);return;}
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    let file;
    if(pathname==='/admin'||pathname==='/admin/')file=resolve(root,'admin.html');
    else if(pathname==='/'||pathname==='/index.html'||/^\/(u|preview)\/[a-zA-Z0-9-]+$/.test(pathname))file=resolve(root,'index.html');
    else if(/^\/uploads\/[a-f0-9-]+\.(png|jpg|webp|mp3|wav|ogg)$/.test(pathname))file=resolve(directory,pathname.slice(1));
    else if((pathname.startsWith('/assets/')||pathname.startsWith('/src/'))&&!pathname.split('/').some(part=>part.startsWith('.'))){
      file=resolve(root,!process.argv.includes('--dist')&&pathname.startsWith('/assets/')?'public/'+pathname.slice(1):pathname.slice(1));
      if(!file.startsWith(root+sep))throw new AppError('File tidak ditemukan.',404);
    }else throw new AppError('File tidak ditemukan.',404);
    const info=await stat(file);if(!info.isFile())throw new AppError('File tidak ditemukan.',404);
    const headers={'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-cache','Accept-Ranges':'bytes'};
    const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if(range){
      const start=Number(range[1]),end=range[2]?Number(range[2]):info.size-1;
      if(start> end||end>=info.size){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return;}
      res.writeHead(206,{...headers,'Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${info.size}`});
      if(req.method==='HEAD')res.end();else createReadStream(file,{start,end}).on('error',()=>res.destroy()).pipe(res);return;
    }
    res.writeHead(200,{...headers,'Content-Length':info.size});
    if(req.method==='HEAD')res.end();else createReadStream(file).on('error',()=>res.destroy()).pipe(res);
  }catch(error){
    const status=error.status||(error.code==='ENOENT'?404:500);
    if(status===500)console.error('Request failed:',error.code || 'internal error');
    if(!res.headersSent)json(res,status,{error:status===500?'Terjadi kesalahan server. Coba lagi.':error.message});else res.end();
  }
});
server.requestTimeout=150000;
server.listen(port,host,()=>console.log(`Undangan Onlineku: http://localhost:${port}\nAdmin: http://localhost:${port}/admin\nDatabase: ${store.provider==='postgres'?'PostgreSQL':'JSON lokal'}`));
server.on('error',async error=>{console.error('Server gagal dijalankan:',error.code||'internal error');await store.close();process.exitCode=1;});
let closing=false;
function shutdown(){
  if(closing)return;closing=true;
  server.close(async()=>{await store.close();process.exitCode=0;});
  server.closeIdleConnections();
}
process.on('SIGINT',shutdown);
process.on('SIGTERM',shutdown);
