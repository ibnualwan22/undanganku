// Run with a local server and a fresh Chromium profile exposing CDP on port 9222.
// CDP_PORT=9223 EXPECT_AUTOPLAY=1 also tests Chromium launched with
// --autoplay-policy=no-user-gesture-required. API/audio fixtures are intercepted
// only inside this browser tab; no accounts or invitation data are modified.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { invitation } from '../src/invitation.js';

const base = 'http://127.0.0.1:4173';
const allowed = process.env.EXPECT_AUTOPLAY === '1';
const port = process.env.CDP_PORT || '9222';
const output = resolve(import.meta.dirname, '../test-results');
const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {method:'PUT'})).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener('open', resolve, {once:true}));
let sequence = 0, fixture, unavailable = false;
const pending = new Map(), errors = [];
const wav = Buffer.alloc(44 + 22050 * 2);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(22050, 24); wav.writeUInt32LE(44100, 28);
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
for (let i = 0; i < 22050; i++) wav.writeInt16LE(Math.round(Math.sin(i * Math.PI * 880 / 22050) * 1000), 44 + i * 2);
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 15000);
    pending.set(id, {resolve, reject, timer}); ws.send(JSON.stringify({id, method, params}));
  });
}
ws.addEventListener('message', ({data}) => {
  const message = JSON.parse(data);
  if (message.id) {
    const task = pending.get(message.id); pending.delete(message.id); clearTimeout(task?.timer);
    if (message.error) task?.reject(message.error); else task?.resolve(message.result);
  } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
  else if (message.method === 'Fetch.requestPaused') {
    const {requestId, request} = message.params;
    const audio = request.url.endsWith('.wav');
    const body = audio ? wav : Buffer.from(JSON.stringify(request.url.endsWith('/wishes') ? {wishes:[]} : fixture));
    void send('Fetch.fulfillRequest', {requestId, responseCode:audio && unavailable ? 404 : 200,
      responseHeaders:[{name:'Content-Type', value:audio ? 'audio/wav' : 'application/json'}],
      body:body.toString('base64')}).catch(error => errors.push(error.message));
  }
});
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {expression, returnByValue:true, awaitPromise:true, userGesture:false});
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(expression) {
  for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await wait(80); }
  throw new Error('Timeout: ' + expression);
}
async function click(selector) {
  const point = await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.scrollIntoView({behavior:'instant',block:'center'});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await send('Input.dispatchMouseEvent', {type:'mousePressed', button:'left', clickCount:1, ...point});
  await send('Input.dispatchMouseEvent', {type:'mouseReleased', button:'left', clickCount:1, ...point});
}
async function screenshot(name) {
  await evaluate('document.fonts.ready');
  const result = await send('Page.captureScreenshot', {format:'png'});
  await writeFile(resolve(output, name + '.png'), Buffer.from(result.data, 'base64'));
}
async function navigate(path = '/u/music-test') {
  await send('Page.navigate', {url:base + path});
  await until("!!document.querySelector('#open-invitation')");
  await evaluate('document.fonts.ready');
}
try {
  await mkdir(output, {recursive:true});
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {width:1280, height:900, deviceScaleFactor:1, mobile:false});
  await send('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion', value:'reduce'}]});
  await send('Page.addScriptToEvaluateOnNewDocument', {source:`window.testAudio=[];const NativeAudio=window.Audio;window.Audio=class extends NativeAudio{constructor(...args){super(...args);window.testAudio.push(this);}};`});
  await send('Fetch.enable', {patterns:[{urlPattern:base + '/api/invitations/music-test*'}, {urlPattern:base + '/uploads/music-test.wav'}]});
  fixture = {...structuredClone(invitation), demo:false, slug:'music-test', music:{src:'/uploads/music-test.wav', volume:0.2}, sections:{music:true}};
  await navigate();
  await until(`document.querySelector('#music-button').dataset.state === '${allowed ? 'playing' : 'waiting'}'`);
  assert.equal(await evaluate("!!document.querySelector('.site-header')"), false);
  assert.equal(await evaluate("document.querySelector('.cover').getBoundingClientRect().top"), 0);
  assert.ok(await evaluate("document.querySelector('.cover').offsetHeight >= innerHeight"));
  assert.equal(await evaluate("getComputedStyle(document.querySelector('#music-button')).position"), 'fixed');
  assert.equal(await evaluate('testAudio[0].paused'), !allowed);
  await screenshot('invitation-floating-music-desktop');

  await click('#open-invitation');
  await until("document.querySelector('#music-button').dataset.state === 'playing'");
  const time = await evaluate('testAudio[0].currentTime'); await wait(200);
  assert.notEqual(await evaluate('testAudio[0].currentTime'), time, 'audio advances after opening');
  await click('#music-button');
  assert.equal(await evaluate('testAudio[0].paused'), true);
  await click('#mempelai h2'); await wait(150);
  assert.equal(await evaluate('testAudio[0].paused'), true, 'page taps do not undo manual pause');
  await click('#music-button'); await until('!testAudio[0].paused');

  await send('Emulation.setDeviceMetricsOverride', {width:390, height:844, deviceScaleFactor:1, mobile:true});
  await evaluate("window.scrollTo({top:0,behavior:'instant'})"); await wait(100);
  assert.ok(await evaluate("document.querySelector('#music-button').getBoundingClientRect().bottom < document.querySelector('.mobile-nav').getBoundingClientRect().top"));
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  await screenshot('invitation-floating-music-mobile-open');
  await navigate(); await screenshot('invitation-floating-music-mobile-cover');

  fixture.sections.music = false; await navigate();
  assert.equal(await evaluate("document.querySelector('#music-button') === null && testAudio.length === 0"), true);
  fixture.sections.music = true; fixture.music.src = ''; await navigate();
  assert.equal(await evaluate("document.querySelector('#music-button') === null && testAudio.length === 0"), true);

  fixture.music.src = '/uploads/music-test.wav'; unavailable = true; await navigate();
  await click('#open-invitation');
  await until("document.querySelector('#music-button').dataset.state === 'off'");
  assert.equal(await evaluate("document.querySelector('#music-button').disabled"), false);
  unavailable = false;

  await navigate('/'); await click('#open-invitation');
  await until("document.querySelector('#music-button').dataset.state === 'playing'");
  await click('#music-button'); await click('#mempelai h2');
  assert.equal(await evaluate("document.querySelector('#music-button').dataset.state"), 'off');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({status:'passed', autoplay:allowed ? 'allowed' : 'blocked until interaction', checks:['full cover without header', 'floating control', 'actual audio playback', 'manual pause stays paused', 'resume', 'mobile navigation clearance', 'disabled/missing music', 'media failure', 'synthesized demo'], screenshots:output}, null, 2));
} catch (error) {
  await screenshot('music-test-failure').catch(() => {}); console.error(error); console.error(errors); process.exitCode = 1;
} finally {
  ws.close(); await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`).catch(() => {});
}
