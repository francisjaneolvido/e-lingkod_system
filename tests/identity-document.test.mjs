import assert from 'node:assert/strict';
import {test} from 'node:test';
import {existsSync} from 'node:fs';
import sharp from 'sharp';
import {loadServerTypescript} from './helpers/load-typescript.mjs';
loadServerTypescript();
const modulePath = '../src/features/identity/document.ts';
const document = existsSync(new URL(modulePath, import.meta.url)) ? await import(modulePath) : {};

test('ID validator checks actual decoded content, MIME, size and resource limits', async () => {
  assert.equal(typeof document.validateIdentityDocument, 'function', 'bounded identity validator must exist');
  const image = await sharp({create:{width:600,height:400,channels:3,background:'#eeeeee'}}).png().toBuffer();
  const result = await document.validateIdentityDocument(new File([image], 'synthetic.png', {type:'image/png'}));
  assert.equal(result.mimeType, 'image/jpeg');
  assert.equal((await sharp(result.data).metadata()).format, 'jpeg');
  assert.equal(result.sha256.length, 64);
  await assert.rejects(() => document.validateIdentityDocument(new File(['<svg onload="bad()"></svg>'], 'id.png', {type:'image/png'})));
  await assert.rejects(() => document.validateIdentityDocument(new File([image], 'id.jpg', {type:'image/jpeg'})));
  await assert.rejects(() => document.validateIdentityDocument(new File([image], 'id.pdf', {type:'application/pdf'})));
  await assert.rejects(() => document.validateIdentityDocument(new File([new Uint8Array(5*1024*1024+1)], 'big.png', {type:'image/png'})));
  const huge = await sharp({create:{width:6000,height:6000,channels:3,background:'#eeeeee'}}).png().toBuffer();
  await assert.rejects(() => document.validateIdentityDocument(new File([huge], 'huge.png', {type:'image/png'})));
  const truncated = image.subarray(0, 40);
  await assert.rejects(() => document.validateIdentityDocument(new File([truncated], 'broken.png', {type:'image/png'})));
});
