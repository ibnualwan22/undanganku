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
async function navigate(path=''){await send('Page.navigate',{url:base+'/'+path});await wait(350);await until("document.readyState==='complete'");await evaluate('Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,3000))])');await wait(450);}
async function screenshot(name){const result=await send('Page.captureScreenshot',{format:'png'});await writeFile(resolve(output,name+'.png'),Buffer.from(result.data,'base64'));}
async function click(selector){await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);await wait(150);}
async function fill(selector,value){await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`);}
async function check(selector,checked){if(await evaluate(`document.querySelector(${JSON.stringify(selector)}).checked`)!==checked)await click(selector);}
async function upload(selector,path){const {root}=await send('DOM.getDocument');const {nodeId}=await send('DOM.querySelector',{nodeId:root.nodeId,selector});await send('DOM.setFileInputFiles',{nodeId,files:[path]});await wait(100);await until("!document.querySelector('#editor-fieldset').disabled");}
async function noOverflow(width){const actual=await evaluate('document.documentElement.scrollWidth');assert.ok(actual<=width,`overflow ${actual} > ${width}`);}
const request=async(path,method='GET',body)=>evaluate(`(async()=>{const session=await(await fetch('/api/session')).json();const response=await fetch(${JSON.stringify(path)},{method:${JSON.stringify(method)},headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrf||''},${body===undefined?'':`body:JSON.stringify(${JSON.stringify(body)}),`}});return {status:response.status,data:await response.json()};})()`);
try{
 await mkdir(output,{recursive:true});await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.clearBrowserCookies');
 await viewport(1440,1000);await navigate();
 await until("document.querySelectorAll('.design-card').length===3");
 assert.equal(await evaluate('document.title'),'Aksara Invitation — Cerita bahagia, sampai ke siapa saja.');
 assert.ok(await evaluate("[...document.querySelectorAll('[data-consult]')].every(a=>a.href.startsWith('https://wa.me/6281227225453?'))"));
 await noOverflow(1440);await screenshot('aksara-home-desktop');
 await evaluate("document.querySelector('#katalog').scrollIntoView()");await wait(900);await screenshot('aksara-catalog-desktop');
 for(const width of [390,320]){await viewport(width,844,true);await navigate();await noOverflow(width);if(width===390)await screenshot('aksara-home-mobile');await evaluate("document.querySelector('#katalog').scrollIntoView()");await wait(900);await noOverflow(width);if(width===390)await screenshot('aksara-catalog-mobile');}
 await viewport(1280,900);
 for(const template of ['floral-reverie','sunset-bloom','monochrome-vows']){await navigate('demo/'+template);await until("document.querySelector('#app').textContent.includes('Nadine') || document.querySelector('#app').textContent.includes('Alya')");assert.ok(!await evaluate("document.querySelector('.invitation-error')!==null"));await noOverflow(1280);}
 console.log('Catalogue and previews passed');
 await navigate('admin');await until("document.querySelector('#auth-form')!==null");
 await fill('#auth-user','admin');await fill('#auth-password','local-browser-test-password');await click('#auth-form button');await until("document.querySelector('[data-action=\"new\"]')!==null");
 await click('[data-action="new"]');await click('[data-action="choose-template"][data-template="monochrome-vows"]');await until("document.querySelector('.credentials-dialog')?.open");
 const credentials={};
 // Read textarea lines directly without logging the generated private credential.
 const text=await evaluate("document.querySelector('#customer-credentials').value");
 credentials.username=text.split('\n').find(line=>line.startsWith('Username: ')).slice(10);credentials.password=text.split('\n').find(line=>line.startsWith('Password: ')).slice(10);
 assert.ok(credentials.password.length>=20);await click('[data-close-credentials]');
 await fill('#f-couple-0-name','Alya');await fill('#f-couple-0-fullName','Alya Putri');await fill('#f-couple-1-name','Raka');await fill('#f-couple-1-fullName','Raka Pratama');await click('[data-action="save"]');await until("document.querySelector('#save-state').textContent==='Semua perubahan tersimpan'");
 await click('[data-tab="access"]');assert.ok(await evaluate("document.querySelector('#editor-pane').textContent.includes('Akses aktif')"));await screenshot('aksara-admin-access');
 const ownId=await evaluate("document.querySelector('#invitation-preview').getAttribute('src').split('/').at(-1)");
 console.log('Admin creation and credentials passed');
 await click('[data-action="logout"]');await until("document.querySelector('#auth-form')!==null");await navigate('masuk');
 await fill('#auth-user',credentials.username);await fill('#auth-password',credentials.password);await click('#auth-form button');await until("document.querySelector('#editor-form')!==null");
 assert.equal(await evaluate("document.querySelector('#f-couple-0-name').readOnly"),true);assert.equal(await evaluate("document.querySelector('#f-couple-1-fullName').readOnly"),true);assert.equal(await evaluate("document.querySelector('#invitation-template').disabled"),true);
 assert.equal(await evaluate("document.querySelector('[data-tab=\"access\"]')===null && document.querySelector('[data-action=\"new\"]')===null && document.querySelector('[data-action=\"storage\"]')===null"),true);
 assert.equal((await request('/api/admin/invitations')).status,403);
 await fill('#f-location','Bandung, Jawa Barat');await click('[data-action="save"]');await until("document.querySelector('#save-state').textContent==='Semua perubahan tersimpan'");
 assert.equal((await request('/api/editor/invitations/'+ownId)).data.draft.location,'Bandung, Jawa Barat');
 console.log('Customer login and edit passed');
 await screenshot('aksara-customer-desktop');
 await click('[data-tab="photos"]');await upload('[data-upload="couple.0.portrait.src"]',project+'/public/assets/wedding-garden.jpg');await click('[data-action="save"]');await until("document.querySelector('#save-state').textContent==='Semua perubahan tersimpan'");
 assert.ok((await request('/api/editor/invitations/'+ownId)).data.draft.couple[0].portrait.src.startsWith('/uploads/'));
 await click('[data-tab="couple"]');await click('[data-action="publish"]');await until("document.querySelector('.published-link')!==null");
 await viewport(390,844,true);await noOverflow(390);await screenshot('aksara-customer-mobile');
 await navigate('preview/'+ownId);await until("document.querySelector('#app').textContent.includes('Alya')");assert.equal(await evaluate("document.querySelector('.invitation-error')!==null"),false);await noOverflow(390);
 assert.deepEqual(errors,[]);console.log('PASS: marketing/catalogue 320–1440px, 3 previews, admin credentials, customer login/locks/edit/upload/publication and private preview.');
}finally{ws.close();}
