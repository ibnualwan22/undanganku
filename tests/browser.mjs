// Run against a separate test server, never the live data directory.
// PORT=4180 DATA_DIR=./test-results/admin-browser-data npm run dev
// Start Chromium with --remote-debugging-port=9222, then: node tests/browser.mjs
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
  await mkdir(output,{recursive:true});await send('Page.enable');await send('Runtime.enable');await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await viewport(1440,1000);await navigate('admin');await screenshot('admin-login');await noOverflow(1440);
  if(await evaluate("!!document.querySelector('#auth-form')")){
    await fill('#auth-user','admin');await fill('#auth-password','local-browser-test-password');await click('#auth-form button');
  }
  await until("!!document.querySelector('[data-edit]')");await screenshot('admin-list');
  await click('[data-action="new"]');await until("!!document.querySelector('#editor-pane')");
  const testId=await evaluate("document.querySelector('#invitation-preview').getAttribute('src').split('/').at(-1)");
  for(const [path,value] of [['couple.0.name','Nadine'],['couple.0.fullName','Nadine Putri Anindya'],['couple.1.name','Arga'],['couple.1.fullName','Arga Pratama']])await fill(`[data-field="${path}"]`,value);
  await screenshot('admin-editor');
  await click('[data-tab="events"]');await fill('[data-field="events.0.mapEmbed"]','<iframe src="https://www.google.com/maps/embed?pb=example"></iframe>');
  await click('[data-map-preview="0"]');assert.equal(await evaluate("!!document.querySelector('#map-preview-0 iframe')"),true);
  await click('[data-tab="photos"]');await upload('[data-upload="couplePhoto"]',resolve(project,'public/assets/wedding-garden.jpg'));
  assert.match(await evaluate("document.querySelector('[data-upload=\"couplePhoto\"]').closest('label').querySelector('img').src"),/uploads/);await screenshot('admin-photos');
  const wav=Buffer.alloc(44+22050*2);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(22050,24);wav.writeUInt32LE(44100,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);for(let i=0;i<22050;i++)wav.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*440/22050)*1500),44+i*2);const audioPath=resolve(output,'test-tone.wav');await writeFile(audioPath,wav);
  await click('[data-tab="music"]');await upload('[data-upload="music.src"]',audioPath);await screenshot('admin-music');
  await click('[data-tab="gifts"]');await click('[data-add="accounts"]');await fill('[data-field="accounts.0.bank"]','Bank Contoh');await fill('[data-field="accounts.0.number"]','001234567890');await fill('[data-field="accounts.0.holder"]','Nadine');await screenshot('admin-gifts');
  await click('[data-tab="sections"]');await check('[data-field="sections.gallery"]',false);await check('[data-field="sections.story"]',false);await check('[data-field="sections.gifts"]',true);await screenshot('admin-components');
  await click('[data-action="save"]');await until("document.querySelector('#save-state').textContent==='Semua perubahan tersimpan'");
  await click('[data-action="publish"]');await until("!!document.querySelector('.published-link')");
  await click('[data-tab="couple"]');await wait(300);await screenshot('admin-editor-saved');
  const publicPath=await evaluate("document.querySelector('.published-link>a').getAttribute('href')");
  await navigate(publicPath.slice(1)+'?to=Budi%20%26%20Sari');await until("!!document.querySelector('#open-invitation')");assert.equal(await evaluate("document.querySelector('#guest-name').textContent"),'Budi & Sari');
  await click('#open-invitation');assert.equal(await evaluate("document.querySelector('.gallery-section')===null"),true);assert.equal(await evaluate("document.querySelector('.story-section')===null"),true);
  assert.equal(await evaluate("document.querySelectorAll('.event-map').length"),1);assert.equal(await evaluate("document.querySelector('.gift-number').textContent"),'001234567890');
  await until("document.querySelector('#music-button').getAttribute('aria-pressed')==='true'");await click('#music-button');
  assert.equal(await evaluate("document.querySelector('#music-button').getAttribute('aria-pressed')"),'false');
  await evaluate("document.querySelector('#hadiah').scrollIntoView({behavior:'instant'})");await screenshot('published-gifts');
  await fill('#name','Tamu browser');await fill('#attendance','yes');await fill('#guest-count','2');await fill('#message','<img src=x onerror=alert(1)> Doa terbaik untuk kalian.');await click('#rsvp-form button[type="submit"]');await until("document.querySelector('#form-feedback').textContent.includes('sudah diterima')");
  await navigate('admin');await until("!!document.querySelector('[data-edit]')");await click(`[data-edit="${testId}"]`);await until("!!document.querySelector('#editor-pane')");await click('[data-tab="responses"]');await until("!!document.querySelector('[data-moderate]')");await screenshot('admin-responses');await click('[data-moderate]');
  await click('[data-tab="couple"]');await fill('[data-field="couple.0.name"]','Nadine Revisi');await click('[data-action="save"]');await until("document.querySelector('#save-state').textContent==='Semua perubahan tersimpan'");
  assert.equal(await evaluate(`fetch('/api/invitations/'+${JSON.stringify(publicPath.split('/').at(-1))}).then(r=>r.json()).then(d=>d.couple[0].name)`),'Nadine');
  await navigate('admin');await until("!!document.querySelector('[data-edit]')");await click(`[data-edit="${testId}"]`);await until("!!document.querySelector('#editor-pane')");assert.equal(await evaluate("document.querySelector('[data-field=\"couple.0.name\"]').value"),'Nadine Revisi');
  await viewport(390,844,true);await wait(200);await noOverflow(390);await screenshot('admin-mobile-editor');
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.mobile-editor-tools')).display"),'flex');
  assert.equal(await evaluate("!!document.querySelector('.mobile-editor-tools a[href^=\"/preview/\"]')"),true);
  for(const tab of ['events','photos','music','gifts','sections','responses']){await click(`[data-tab="${tab}"]`);await noOverflow(390);if(tab==='gifts'||tab==='sections')await screenshot('admin-mobile-'+tab);}
  await click('[data-action="list"]');await click('[data-action="new"]');await until("document.querySelector('#editor-title')?.textContent.includes('Mempelai Wanita')");await noOverflow(390);
  await click('[data-action="logout"]');await until("!!document.querySelector('#auth-form')");await screenshot('admin-mobile-login');await noOverflow(390);
  await navigate(publicPath.slice(1));await until("!!document.querySelector('#open-invitation')");await click('#open-invitation');await wait(200);assert.equal(await evaluate("document.querySelectorAll('.wish').length"),1);assert.equal(await evaluate("document.querySelectorAll('.wish img').length"),0);await noOverflow(390);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'passed',checks:['setup/login/logout','image and audio uploads via file chooser','audio playback','map embed','bank accounts','section toggles','save/reload/publish','draft isolation','RSVP/moderation','multiple invitations','desktop and mobile','XSS-safe messages','no runtime exceptions'],screenshots:output},null,2));
}catch(error){await screenshot('admin-test-failure').catch(()=>{});console.error(error);console.error('Runtime errors:',errors);process.exitCode=1;}
finally{ws.close();}
