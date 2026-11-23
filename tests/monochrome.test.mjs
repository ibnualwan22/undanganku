import test from 'node:test';
import assert from 'node:assert/strict';
import { newInvitation, validateInvitation } from '../server/schema.mjs';
import { normalizePortrait, portraitStyle } from '../src/portraits.js';
import { decorationForTemplate } from '../src/templates.js';

test('monochrome portraits retain uploaded media and bounded crop settings through validation',()=>{
 const draft=newInvitation('mono','monochrome-vows');
 const url='https://res.cloudinary.com/example/image/upload/portrait.jpg';
 draft.couple[0].portrait={src:url,x:12,y:46,zoom:1.4};
 const validated=validateInvitation(draft,'mono',[{url,kind:'image'}]);
 assert.deepEqual(validated.couple[0].portrait,draft.couple[0].portrait);
 assert.equal(validated.templateId,'monochrome-vows');
 assert.equal(validated.decoration,'');
 validated.templateId='sunset-bloom';
 assert.deepEqual(validateInvitation(validated,'mono',[{url,kind:'image'}]).couple[0].portrait,draft.couple[0].portrait);
 assert.throws(()=>validateInvitation(draft,'mono'),/diunggah/);
 draft.couple[0].portrait.src='javascript:alert(1)';
 assert.throws(()=>validateInvitation(draft,'mono'),/diunggah/);
});
test('legacy and malicious crop settings normalize to safe numeric CSS',()=>{
 assert.deepEqual(normalizePortrait(),{src:'',x:50,y:50,zoom:1});
 assert.equal(normalizePortrait(undefined,0).x,8);
 assert.equal(normalizePortrait(undefined,1).x,92);
 assert.deepEqual(normalizePortrait({x:-20,y:200,zoom:100}),{src:'',x:0,y:100,zoom:2});
 assert.equal(portraitStyle({x:'1; background:url(https://evil.test)',y:Infinity,zoom:NaN}),'--portrait-x:50%;--portrait-y:50%;--portrait-zoom:1');
 assert.equal(decorationForTemplate('','sunset-bloom'),'');
 const draft=newInvitation('old');
 assert.equal(validateInvitation(draft,'old').couple[0].portrait.src,'');
});
