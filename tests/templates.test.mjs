import test from 'node:test';
import assert from 'node:assert/strict';
import { newInvitation, validateInvitation } from '../server/schema.mjs';
import { decorationForTemplate, getTemplate } from '../src/templates.js';

test('legacy invitations retain their default; only implemented templates can be saved', () => {
  const draft = newInvitation('example');
  delete draft.templateId;
  assert.equal(validateInvitation(draft, draft.id).templateId, 'floral-reverie');
  const sunset = newInvitation('sunset', 'sunset-bloom');
  assert.equal(validateInvitation(sunset, sunset.id).templateId, 'sunset-bloom');
  assert.equal(sunset.decoration, '/assets/sunset-bloom.webp');
  for (const id of ['garden-celebration','lilac-romance','unknown','',null,{}]) {
    assert.throws(() => newInvitation('example',id), /belum tersedia/);
    assert.throws(() => validateInvitation({...draft,templateId:id},draft.id), /belum tersedia/);
  }
});

test('changing design swaps only built-in decoration, preserving custom media and deliberately empty decoration', () => {
  assert.equal(decorationForTemplate('/assets/floral-watercolor.png','sunset-bloom'),getTemplate('sunset-bloom').decoration);
  assert.equal(decorationForTemplate('/assets/sunset-bloom.webp','floral-reverie'),getTemplate('floral-reverie').decoration);
  for(const media of ['', 'https://res.cloudinary.com/example/image/upload/flowers.webp']) {
    assert.equal(decorationForTemplate(media,'sunset-bloom'),media);
  }
});
