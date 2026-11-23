// Run against a separate test server, never the live data directory.
// See README for an isolated local server command (no production credentials).
// Start Chromium with --remote-debugging-port=9222, then: node tests/templates-browser.mjs
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const project=resolve(import.meta.dirname,'..'), output=resolve(project,'test-results');
const base=process.env.BROWSER_TEST_URL||'http://127.0.0.1:4180';
if(!/^http:\/\/(127\.0\.0\.1|localhost):4180$/.test(base))throw new Error('Use the isolated server on port 4180.');
const target=(await(await fetch('http://127.0.0.1:9222/json/list')).json()).find(item=>item.type==='page');
const ws=new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
let id=0;const pending=new Map(),errors=[];
ws.addEventListener('message',({data})=>{
  const message=JSON.parse(data);
  if(message.id){const task=pending.get(message.id);pending.delete(message.id);clearTimeout(task?.timer);if(message.error)task?.reject(message.error);else task?.resolve(message.result);}
  else if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);
});
function send(method,params={}){return new Promise((resolve,reject)=>{const seq=++id;const timer=setTimeout(()=>{pending.delete(seq);reject(new Error('CDP timeout: '+method));},20000);pending.set(seq,{resolve,reject,timer});ws.send(JSON.stringify({id:seq,method,params}));});}
async function evaluate(expression){const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(expression){for(let i=0;i<80;i++){if(await evaluate(expression))return;await wait(100);}throw new Error('Timeout: '+expression);}
async function viewport(width,height,mobile=false){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});}
async function navigate(path=''){await send('Page.navigate',{url:base+'/'+path});await until("document.readyState==='complete'");await evaluate('document.fonts.ready');await wait(450);}
async function screenshot(name){const result=await send('Page.captureScreenshot',{format:'png'});await writeFile(resolve(output,name+'.png'),Buffer.from(result.data,'base64'));}
async function click(selector){await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);await wait(150);}
async function fill(selector,value){await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`);}
async function check(selector,checked){if(await evaluate(`document.querySelector(${JSON.stringify(selector)}).checked`)!==checked)await click(selector);}
async function upload(selector,path){const {root}=await send('DOM.getDocument');const {nodeId}=await send('DOM.querySelector',{nodeId:root.nodeId,selector});await send('DOM.setFileInputFiles',{nodeId,files:[path]});await wait(100);await until("!document.querySelector('#editor-fieldset').disabled");}
async function noOverflow(width){const actual=await evaluate('document.documentElement.scrollWidth');assert.ok(actual<=width,`overflow ${actual} > ${width}`);}
const request=async(path,method='GET',body)=>evaluate(`(async()=>{const session=await(await fetch('/api/session')).json();const response=await fetch(${JSON.stringify(path)},{method:${JSON.stringify(method)},headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrf||''},${body===undefined?'':`body:JSON.stringify(${JSON.stringify(body)}),`}});return {status:response.status,data:await response.json()};})()`);
try{
 await mkdir(output,{recursive:true});await send('Page.enable');await send('Runtime.enable');
 await send('Emulation.setFocusEmulationEnabled',{enabled:true});await send('Page.bringToFront');
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await send('Browser.grantPermissions',{origin:base,permissions:['clipboardReadWrite','clipboardSanitizedWrite']});
 await viewport(1440,1100);await navigate('admin');
 const storage=await evaluate("fetch('/api/session').then(response=>response.json())");assert.equal(storage.database.provider,'json','Only use isolated local JSON data for browser tests');assert.equal(storage.storage.provider,'local');
 if(await evaluate("!!document.querySelector('#auth-user')")){await fill('#auth-user','admin');await fill('#auth-password','local-browser-test-password');await click('#auth-form button');}
 await until("!!document.querySelector('[data-action=new]')");
 const before=(await request('/api/admin/invitations')).data.invitations.length;
 await click('[data-action="new"]');await until("!!document.querySelector('.template-options')");
 assert.equal((await request('/api/admin/invitations')).data.invitations.length,before,'Choosing must not create drafts');
 assert.equal(await evaluate("document.querySelectorAll('[data-action=choose-template]').length"),3);
 assert.equal(await evaluate("document.querySelectorAll('.template-plans article').length"),2);
 await screenshot('template-picker-desktop-final');
 // A failed create leaves both choices usable and does not create a draft.
 await evaluate("window.originalFetch=window.fetch;window.fetch=(url,options)=>String(url)==='/api/admin/invitations'&&options?.method==='POST'?Promise.resolve(new Response(JSON.stringify({error:'Gangguan pengujian sementara'}),{status:503})):window.originalFetch(url,options)");
 await click('[data-template="sunset-bloom"]');
 assert.match(await evaluate("document.querySelector('#admin-toast').textContent"),/Gangguan pengujian/);
 assert.equal(await evaluate("document.querySelectorAll('[data-action=choose-template]:disabled').length"),0);
 await evaluate('window.fetch=window.originalFetch');
 await click('[data-template="sunset-bloom"]');await until("!!document.querySelector('#invitation-template')");
 assert.equal(await evaluate("document.querySelector('#invitation-template').value"),'sunset-bloom');
 const recordId=await evaluate("document.querySelector('#invitation-preview').getAttribute('src').split('/').at(-1)");
 let record=(await request('/api/admin/invitations/'+recordId)).data;
 assert.equal(record.draft.templateId,'sunset-bloom');assert.equal(record.draft.decoration,'/assets/sunset-bloom.webp');
 // Add fixture content through the real save endpoint of the isolated server.
 record.draft.couple[0].name='Alya';record.draft.couple[1].name='Raka';
 record.draft.couplePhoto='/assets/wedding-garden.jpg';
 record.draft.gallery=[{src:'/assets/wedding-garden.jpg',alt:'Foto contoh',caption:'Hari bahagia'}];record.draft.sections.gallery=true;
 record.draft.story=[{year:'2025',title:'Cerita kami',text:'Cerita untuk pengujian.'}];record.draft.sections.story=true;
 record.draft.sections.gifts=true;record.draft.accounts=[{bank:'Bank Contoh',number:'001234567890',holder:'Pasangan Contoh',qr:''}];
 record.draft.events[0].mapEmbed='https://www.google.com/maps/embed?pb=test';
 const saved=await request('/api/admin/invitations/'+recordId,'PUT',record);assert.equal(saved.status,200);record=saved.data;
 await navigate('admin');await until("!!document.querySelector('[data-edit]')");await click(`[data-edit="${recordId}"]`);await until("!!document.querySelector('#invitation-template')");
 // Switch designs twice through the actual editor and verify every content field.
 await fill('#invitation-template','floral-reverie');await click('[data-action="save"]');await until("document.querySelector('#save-state').textContent==='Semua perubahan tersimpan'");
 let after=(await request('/api/admin/invitations/'+recordId)).data;
 for(const key of ['couple','events','accounts','gallery','story','music','sections'])assert.deepEqual(after.draft[key],record.draft[key]);
 assert.equal(after.draft.templateId,'floral-reverie');assert.equal(after.draft.decoration,'/assets/floral-watercolor.png');
 await fill('#invitation-template','sunset-bloom');await click('[data-action="publish"]');await until("!!document.querySelector('.published-link')");
 after=(await request('/api/admin/invitations/'+recordId)).data;assert.equal(after.published.templateId,'sunset-bloom');assert.equal(after.published.decoration,'/assets/sunset-bloom.webp');
 await until("document.querySelector('#invitation-preview').contentDocument?.body.dataset.template==='sunset-bloom'");
 await click('[data-tab="guests"]');await fill('#guest-names','Bapak Andi & Keluarga\nIbu Sari');await click('#generate-guest-links');
 const personalized=await evaluate("document.querySelector('.guest-link-detail input').value");
 await click('[data-copy-guest="0"]');assert.equal(await evaluate('navigator.clipboard.readText()'),personalized);
 const url=new URL(personalized);await navigate(url.pathname.slice(1)+url.search);await until("!!document.querySelector('#guest-name')");
 assert.equal(await evaluate("document.querySelector('#guest-name').textContent"),'Bapak Andi & Keluarga');
 assert.equal(await evaluate('document.body.dataset.template'),'sunset-bloom');await screenshot('sunset-live-desktop');
 await click('#open-invitation');await noOverflow(1440);
 assert.equal(await evaluate("document.querySelectorAll('.event-map').length"),1);
 await click('[data-gallery="0"]');assert.equal(await evaluate("document.querySelector('#gallery-dialog').open"),true);await click('.dialog-close');
 await click('[data-copy-account]');assert.equal(await evaluate('navigator.clipboard.readText()'),'001234567890');
 await fill('#name','Tamu Pengujian Sunset');await fill('#attendance','yes');await fill('#message','Selamat untuk pasangan!');await click('#rsvp-form button[type=submit]');
 await until("document.querySelector('#form-feedback').textContent.includes('Terima kasih')");
 assert.equal((await request('/api/admin/invitations/'+recordId+'/responses')).data.responses.length,1);
 for(const width of [360,390,768]){
  await viewport(width,844,width<700);await navigate(url.pathname.slice(1)+url.search);await until("!!document.querySelector('#open-invitation')");await noOverflow(width);await click('#open-invitation');await noOverflow(width);
 }
 await viewport(390,844,true);await evaluate("document.querySelector('#cover').scrollIntoView({behavior:'instant'})");await screenshot('sunset-live-mobile');
 // Optional sections off, deliberately empty decoration, and very long names.
 after=(await request('/api/admin/invitations/'+recordId)).data;
 after.draft.couple[0].name='NamaMempelaiYangPanjangSekaliUntukPengujian';
 after.draft.decoration='';after.draft.sections=Object.fromEntries(Object.keys(after.draft.sections).map(key=>[key,false]));
 after=(await request('/api/admin/invitations/'+recordId,'PUT',after)).data;
 assert.equal((await request('/api/admin/invitations/'+recordId+'/publish','POST',{revision:after.revision})).status,200);
 await navigate('u/'+after.slug);await until("!!document.querySelector('#cover-title')");await noOverflow(390);await click('#open-invitation');await noOverflow(390);
 for(const selector of ['.floral','.gallery-section','.story-section','.gift-section','.event-map','#music-button','.countdown','.wishes-section','.rsvp-section','.closing'])assert.equal(await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`),false,selector);
 await screenshot('sunset-long-name-mobile');
 // Unavailable preview never silently displays the first template.
 await navigate('?preview=garden-celebration');assert.match(await evaluate("document.querySelector('#app').textContent"),/Desain belum tersedia/);
 await navigate('?preview=floral-reverie');await until("!!document.querySelector('#cover-title')");assert.equal(await evaluate('document.body.dataset.template'),'floral-reverie');assert.match(await evaluate('document.title'),/Floral Reverie/);await click('#open-invitation');await noOverflow(390);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({status:'passed',checks:['template picker and planned concepts','failed create recovery','create/save/publish','switch designs preserves contents','preview iframe','guest links and clipboard','map/gallery/accounts/RSVP','360/390/768/1440 layout','optional sections and long names','unavailable template','Floral Reverie regression']},null,2));
}catch(error){await screenshot('sunset-browser-failure').catch(()=>{});console.error(error);console.error(errors);process.exitCode=1;}
finally{ws.close();}
