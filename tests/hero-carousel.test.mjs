import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { loadServerTypescript } from './helpers/load-typescript.mjs';

const modelPath = 'src/features/landing/data/hero-slides.ts';
const hook = loadServerTypescript();
test.after(() => hook.deregister());
const loadModel = () => import(pathToFileURL(`${process.cwd()}/${modelPath}`));

test('hero images have maintained local assets, honest descriptions and credit', async () => {
  assert.ok(fs.existsSync(modelPath), 'The hero needs a maintained slide configuration');
  const { heroSlides } = await loadModel();
  assert.ok(heroSlides.length >= 2);
  for (const slide of heroSlides) {
    assert.ok(fs.existsSync(`public${slide.path}`), slide.path);
    assert.ok(slide.alt.length > 20);
    assert.match(slide.credit, /illustrative/i);
    assert.match(slide.focalPoint, /^\d+% \d+%$/);
  }
  assert.equal(new Set(heroSlides.map(slide => slide.path)).size, heroSlides.length);
});

test('manual photo navigation wraps and supports keyboard endpoints', async () => {
  assert.ok(fs.existsSync(modelPath), 'The hero needs manual navigation');
  const { nextHeroSlide } = await loadModel();
  assert.equal(nextHeroSlide(0, 'previous', 3), 2);
  assert.equal(nextHeroSlide(2, 'next', 3), 0);
  assert.equal(nextHeroSlide(1, 'first', 3), 0);
  assert.equal(nextHeroSlide(1, 'last', 3), 2);
  assert.equal(nextHeroSlide(0, 'next', 1), 0);
});
