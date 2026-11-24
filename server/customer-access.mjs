import { randomBytes } from 'node:crypto';
import { hashPassword } from './auth.mjs';
import { AppError } from './schema.mjs';

export async function issueAccess(previous) {
  const username=previous?.username || 'aksara-'+randomBytes(12).toString('hex');
  const password=randomBytes(18).toString('base64url');
  return {access:{username,password:await hashPassword(password),version:(previous?.version||0)+1,enabled:true,createdAt:new Date().toISOString()},credentials:{username,password}};
}
export function accessInfo(access) {
  return access ? {username:access.username,enabled:access.enabled,createdAt:access.createdAt} : null;
}
export function editorRecord(record,customer=false) {
  const {access,responses,...safe}=record;
  return {...safe,responseCount:responses.length,...(customer?{}:{access:accessInfo(access)})};
}
export function checkCustomer(state,principal) {
  if(principal.role!=='customer')return;
  const access=state.invitations.find(item=>item.id===principal.invitationId)?.access;
  if(!access?.enabled || access.version!==principal.accessVersion || access.username!==principal.username)throw new AppError('Akses telah diperbarui atau dinonaktifkan. Silakan hubungi Aksara Invitation.',401);
}
export function checkLocked(record,input) {
  if(input.slug!==record.slug || input.draft?.templateId!==record.draft.templateId || !Array.isArray(input.draft?.couple) || input.draft.couple.length!==2 || record.draft.couple.some((person,i)=>person.name!==input.draft.couple[i]?.name || person.fullName!==input.draft.couple[i]?.fullName))throw new AppError('Nama mempelai, desain, dan tautan undangan hanya dapat diubah oleh admin.',403);
}
export function customerAssets(state,record) {
  const urls=new Set();
  for(const draft of [record.draft,record.published].filter(Boolean)){
    [draft.coverPhoto,draft.couplePhoto,draft.decoration,draft.music?.src,...(draft.couple||[]).map(person=>person.portrait?.src),...(draft.gallery||[]).map(photo=>photo.src),...(draft.accounts||[]).map(account=>account.qr)].filter(Boolean).forEach(url=>urls.add(url));
  }
  return state.assets.filter(asset=>asset.invitationId===record.id || urls.has(asset.url));
}
