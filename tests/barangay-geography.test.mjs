import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = 'src/features/geography/';
const expectedCodes = ['001','002','003','004','005','006','007','008','010','011','012','013','014','015'].map(suffix => `0403411${suffix}`);
function domain() {
  assert.ok(fs.existsSync(`${root}los-banos.ts`), 'verified geography module must exist');
  const compiled = ts.transpileModule(fs.readFileSync(`${root}los-banos.ts`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', compiled)(mod, mod.exports, require);
  return mod.exports;
}
function geometry() {
  assert.ok(fs.existsSync(`${root}los-banos.geometry.json`), 'verified geometry asset must exist');
  return JSON.parse(fs.readFileSync(`${root}los-banos.geometry.json`, 'utf8'));
}

test('all fourteen regions retain exact PSGC and existing application filter keys', () => {
  const { LOS_BANOS_REGIONS: regions, resolveBarangayCode } = domain();
  assert.equal(regions.length, 14);
  assert.deepEqual(regions.map(r => r.code).sort(), expectedCodes);
  const app = fs.readFileSync('src/features/emergency/domain.ts', 'utf8').match(/LOS_BANOS_BARANGAYS = \[([\s\S]*?)\] as const/)[1];
  const appKeys = [...app.matchAll(/"([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(regions.map(r => r.appName).sort(), appKeys.sort());
  for (const region of regions) {
    assert.equal(resolveBarangayCode(region.code), region.code);
    assert.equal(resolveBarangayCode(region.name), region.code);
    assert.equal(resolveBarangayCode(region.appName), region.code);
    assert.equal(region.center.length, 2);
    assert.ok(region.center.every(Number.isFinite));
  }
});

test('verified historical labels and correspondence codes resolve without inventing codes', () => {
  const { resolveBarangayCode: resolve } = domain();
  for (const [value, expected] of [
    ['Malinta','0403411015'], ['043411015','0403411015'], ['PH0403411015','0403411015'],
    ['Tadlak','0403411013'], [' tadlac ','0403411013'], ['Tuntungin-Putho','0403411011'],
    ['Putho Tuntungin','0403411011'], ['Putho-Tuntungin','0403411011'],
    ['Timugan (Pob.)','0403411014'], ['Timugan (Poblacion)','0403411014'],
    ['Baybayin (Pob.)','0403411005'], ['Baybayin (Poblacion)','0403411005'],
  ]) assert.equal(resolve(value), expected, value);
  for (const unknown of [null, undefined, 403411015, {}, [], '', '0403411009', 'PH0403411009', 'Malinta West', 'Anos, Los Baños', 'Tadla', 'PH043411015', '403411015']) {
    assert.equal(resolve(unknown), null, String(unknown));
  }
});

test('geometry has fourteen closed full precision polygons and connected shared edges', () => {
  const geo = geometry();
  assert.equal(geo.type, 'FeatureCollection');
  assert.deepEqual(geo.features.map(f => f.properties.code).sort(), expectedCodes);
  assert.deepEqual(geo.bbox, [121.17130939400022,14.109612395000113,121.26622697500034,14.198157195000135]);
  const edges = new Map();
  let vertexCount = 0;
  for (const feature of geo.features) {
    assert.equal(feature.type, 'Feature');
    assert.equal(feature.geometry.type, 'Polygon');
    for (const ring of feature.geometry.coordinates) {
      assert.ok(ring.length >= 4);
      assert.deepEqual(ring[0], ring.at(-1));
      vertexCount += ring.length;
      for (let index = 0; index < ring.length - 1; index++) {
        for (const [lon, lat] of [ring[index], ring[index + 1]]) {
          assert.ok(Number.isFinite(lon) && lon >= geo.bbox[0] && lon <= geo.bbox[2]);
          assert.ok(Number.isFinite(lat) && lat >= geo.bbox[1] && lat <= geo.bbox[3]);
        }
        const edge = [JSON.stringify(ring[index]), JSON.stringify(ring[index + 1])].sort().join('|');
        edges.set(edge, [...(edges.get(edge) ?? []), feature.properties.code]);
      }
    }
  }
  assert.equal(vertexCount, 1442, 'original source vertices must survive packaging');
  assert.ok([...edges.values()].every(owners => owners.length <= 2));
  const adjacent = new Map(expectedCodes.map(code => [code, new Set()]));
  for (const owners of edges.values()) if (owners.length === 2) {
    assert.notEqual(owners[0], owners[1]);
    adjacent.get(owners[0]).add(owners[1]);
    adjacent.get(owners[1]).add(owners[0]);
  }
  const visited = new Set();
  function visit(code) { if (visited.has(code)) return; visited.add(code); for (const neighbor of adjacent.get(code)) visit(neighbor); }
  visit(expectedCodes[0]);
  assert.equal(visited.size, 14, 'every barangay must belong to the connected shared-boundary graph');
});

test('asset bytes match the retained licensed source manifest and generator check', () => {
  geometry();
  const manifest = JSON.parse(fs.readFileSync(`${root}source-manifest.json`, 'utf8'));
  assert.equal(manifest.license.id, 'CC-BY-3.0-IGO');
  assert.equal(manifest.original.sha256, '49096df60471aa6146a49dcd971e0f8b60ae65d5f0ec1158da3c1efb341e803a');
  assert.equal(manifest.extract.sha256, '42e4970ac0382827d38487cd5acd950093695f6436b2b80399438675beaa0009');
  assert.equal(manifest.geometry.sha256, '76e239f7414ea470050cd2bcca8a8987c0bcb322017af093287bd5aa418735a1');
  assert.equal(manifest.geometry.sha256, createHash('sha256').update(fs.readFileSync(`${root}los-banos.geometry.json`)).digest('hex'));
  assert.equal(manifest.coverage.featureCount, 14);
  assert.equal(manifest.sourceValidOn, '2025-02-13');
  const check = spawnSync(process.execPath, ['scripts/prepare-los-banos-geometry.mjs', '--check'], { encoding: 'utf8' });
  assert.equal(check.status, 0, check.stdout + check.stderr);
});
