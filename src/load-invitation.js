import { invitation } from './invitation.js';
import { escapeHTML } from './utils.js';
export const route=location.pathname.match(/^\/(u|preview)\/([a-zA-Z0-9-]+)$/);
export const isLive=route?.[1]==='u';
export const isPreview=route?.[1]==='preview';
export async function loadInvitation(){
  let data=structuredClone(invitation);
  if(route){
    try{
      const response=await fetch(isLive?`/api/invitations/${route[2]}`:`/api/admin/invitations/${route[2]}`);
      const result=await response.json();if(!response.ok)throw new Error(result.error||'Undangan belum tersedia.');
      data=isLive?result:result.draft;
    }catch(error){document.querySelector('#app').innerHTML=`<main class="invitation-error"><h1>Undangan belum tersedia.</h1><p>${escapeHTML(error.message)}</p>${isPreview?'<a class="button button-primary" href="/admin">Masuk ke admin</a>':''}</main>`;return null;}
  }
  data.sections={quote:true,couplePhoto:true,countdown:true,calendar:true,map:true,story:true,gallery:true,music:true,rsvp:true,wishes:true,gifts:false,closing:true,...data.sections};
  data.couplePhoto??=data.gallery?.[0]?.src||'';
  data.coverPhoto??='';data.decoration??='/assets/floral-watercolor.png';data.accounts??=[];
  data.music??={src:'',volume:0.4,name:''};
  return data;
}
