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
try{
 await mkdir(output,{recursive:true});await send('Page.enable');await send('Runtime.enable');await send('Emulation.setFocusEmulationEnabled',{enabled:true});await send('Page.bringToFront');
 await viewport(1440,1000);await navigate('?preview=monochrome-vows&to=Bapak%20Budi%20%26%20Keluarga');
 await until("document.querySelectorAll('.mono-portrait img').length===2");
 await evaluate("Promise.all([...document.querySelectorAll('.mono-portrait img')].map(img=>img.decode()))");
 await wait(1100);await noOverflow(1440);await screenshot('mono-desktop-cover');
 assert.equal(await evaluate("getComputedStyle(document.querySelector('.mono-portrait img')).filter"),'grayscale(1)');
 await click('#open-invitation');await until("document.body.classList.contains('mono-opening')");await wait(1200);
 assert.equal(await evaluate("document.body.classList.contains('mono-opening')"),false);
 await evaluate("document.querySelector('#mempelai').scrollIntoView({behavior:'instant'})");await wait(1200);await screenshot('mono-desktop-couple');
 await evaluate("document.querySelector('#acara').scrollIntoView({behavior:'instant'})");await wait(1200);await screenshot('mono-desktop-events');
 await evaluate("document.querySelector('#galeri').scrollIntoView({behavior:'instant'})");await wait(1200);await screenshot('mono-desktop-gallery');
 // Leave and revisit: entrance effects should replay rather than run just once.
 await evaluate("document.querySelector('#cover').scrollIntoView({behavior:'instant'})");await wait(400);
 assert.equal(await evaluate("document.querySelector('#acara .section-heading').classList.contains('is-visible')"),false);
 await evaluate("document.querySelector('#acara').scrollIntoView({behavior:'instant'})");await until("document.querySelector('#acara .section-heading').classList.contains('is-visible')");
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 assert.equal(await evaluate("getComputedStyle(document.querySelector('.gallery-item')).transitionDuration"),'0s');
 for(const width of [360,390,768]){
  await viewport(width,844,width<700);await navigate('?preview=monochrome-vows');await until("!!document.querySelector('.mono-portrait')");await noOverflow(width);
  if(width===390)await screenshot('mono-mobile-cover');
  await click('#open-invitation');await noOverflow(width);
  assert.equal(await evaluate("document.body.classList.contains('mono-opening')"),false);
  await evaluate("document.querySelector('#acara').scrollIntoView({behavior:'instant'})");if(width===390)await screenshot('mono-mobile-events');
 }
 console.log('Visual and motion checks passed');
 await viewport(1440,1100);await navigate('admin');
 const storage=await evaluate("fetch('/api/session').then(r=>r.json())");assert.equal(storage.database.provider,'json');assert.equal(storage.storage.provider,'local');
 if(await evaluate("!!document.querySelector('#auth-user')")){await fill('#auth-user','admin');await fill('#auth-password','local-browser-test-password');await click('#auth-form button');}
 await until("!!document.querySelector('[data-action=new]')");await click('[data-action="new"]');await until("!!document.querySelector('[data-template=monochrome-vows]')");await screenshot('mono-template-picker');
 await click('[data-template="monochrome-vows"]');await until("!!document.querySelector('#editor-pane')");
 const recordId=await evaluate("document.querySelector('#invitation-preview').getAttribute('src').split('/').at(-1)");
 await fill('[data-field="couple.0.name"]','Alya');await fill('[data-field="couple.1.name"]','Raka');
 await click('[data-tab="photos"]');await until("!!document.querySelector('.portrait-editor')");
 await upload('[data-upload="couple.0.portrait.src"]',resolve(project,'public/assets/monochrome-bride.webp'));
 await upload('[data-upload="couple.1.portrait.src"]',resolve(project,'public/assets/wedding-garden.jpg'));
 await fill('[data-field="couple.0.portrait.x"]','12');await fill('[data-field="couple.0.portrait.zoom"]','1.25');await fill('[data-field="couple.1.portrait.y"]','40');
 assert.equal(await evaluate("document.querySelector('[data-portrait-preview=\"0\"]').style.getPropertyValue('--portrait-x')"),'12%');
 assert.equal(await evaluate("getComputedStyle(document.querySelector('[data-portrait-preview=\"1\"] img')).filter"),'grayscale(1)');
 await evaluate("document.querySelector('.portrait-editor').scrollIntoView({behavior:'instant'})");await screenshot('mono-portrait-admin');
 await click('[data-action="publish"]');await until("!!document.querySelector('.published-link')");
 const apiData=await evaluate(`fetch('/api/admin/invitations/${recordId}').then(r=>r.json())`);
 assert.equal(apiData.published.templateId,'monochrome-vows');assert.equal(apiData.published.couple[0].portrait.x,12);assert.equal(apiData.published.couple[0].portrait.zoom,1.25);
 assert.match(apiData.published.couple[0].portrait.src,/^\/uploads\//);
 await navigate('admin');await until("!!document.querySelector('[data-edit]')");await click(`[data-edit="${recordId}"]`);await until("!!document.querySelector('#editor-pane')");
 await fill('#invitation-template','sunset-bloom');await click('[data-action="save"]');await until("document.querySelector('#save-state').textContent==='Semua perubahan tersimpan'");
 assert.deepEqual(await evaluate(`fetch('/api/admin/invitations/${recordId}').then(r=>r.json()).then(d=>d.draft.couple.map(p=>p.portrait))`),apiData.published.couple.map(p=>p.portrait));
 await navigate('u/'+apiData.slug+'?to=Ibu%20Sari');await until("!!document.querySelector('.mono-portrait')");
 assert.equal(await evaluate("document.querySelector('#guest-name').textContent"),'Ibu Sari');assert.equal(await evaluate("document.body.dataset.template"),'monochrome-vows');
 assert.equal(await evaluate("getComputedStyle(document.querySelector('.mono-left img')).filter"),'grayscale(1)');
 await click('#open-invitation');await noOverflow(1440);
 await fill('#name','Tamu Monochrome');await fill('#attendance','yes');await fill('#message','Selamat!');await click('#rsvp-form button[type=submit]');await until("document.querySelector('#form-feedback').textContent.includes('sudah diterima')");
 // Missing photos use actual couple initials, never demo people's photos.
 await navigate('admin');await until("!!document.querySelector('[data-edit]')");await click('[data-action="new"]');await click('[data-template="monochrome-vows"]');await until("!!document.querySelector('#editor-pane')");
 const emptyId=await evaluate("document.querySelector('#invitation-preview').getAttribute('src').split('/').at(-1)");
 await navigate('preview/'+emptyId);await until("document.querySelectorAll('.mono-empty').length===2");assert.equal(await evaluate("document.querySelectorAll('.mono-portrait img').length"),0);await viewport(360,800,true);await noOverflow(360);await click('#open-invitation');await noOverflow(360);await screenshot('mono-empty-mobile');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'passed',checks:['desktop and 360/390/768 layouts','grayscale photographs','opening animation','scroll animations replay','reduced motion','admin upload and live crop','publish/reload','switch design preserves portraits','guest URL and RSVP','empty photo fallback']},null,2));
}catch(error){await screenshot('mono-browser-failure').catch(()=>{});console.error(error);console.error(errors);process.exitCode=1;}
finally{ws.close();}
