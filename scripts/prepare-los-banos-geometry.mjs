import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'src/features/geography');
const sourceSha256 = '49096df60471aa6146a49dcd971e0f8b60ae65d5f0ec1158da3c1efb341e803a';
const extractSha256 = '42e4970ac0382827d38487cd5acd950093695f6436b2b80399438675beaa0009';
const collection = 'https://data.source.coop/hdx/cod-ab/original/phl/latest/phl_admin4/collection.json';
const parquet = 'https://data.source.coop/hdx/cod-ab/original/phl/latest/phl_admin4/phl_admin4.parquet';
const digest = value => createHash('sha256').update(value).digest('hex');
const geometryPath = path.join(output, 'los-banos.geometry.json');
const manifestPath = path.join(output, 'source-manifest.json');

if (process.argv[2] === '--check') {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const bytes = fs.readFileSync(geometryPath);
  const geometry = JSON.parse(bytes);
  if (manifest.geometry.sha256 !== digest(bytes) || manifest.original.sha256 !== sourceSha256 || manifest.extract.sha256 !== extractSha256 || geometry.sourceSha256 !== sourceSha256 || geometry.features.length !== 14) {
    throw new Error('Geography integrity mismatch; regenerate only from the pinned source extract.');
  }
  console.log(`Verified 14 licensed regions; asset SHA256 ${digest(bytes)}`);
} else {
  const input = process.argv[2];
  if (!input) throw new Error('Usage: node scripts/prepare-los-banos-geometry.mjs <pinned-los-banos.full.geojson> | --check');
  const bytes = fs.readFileSync(path.resolve(input));
  if (digest(bytes) !== extractSha256) throw new Error('Source extract SHA256 differs from the reviewed official OCHA extract.');
  const source = JSON.parse(bytes);
  const expected = ['001','002','003','004','005','006','007','008','010','011','012','013','014','015'].map(s => `0403411${s}`);
  const codes = source.features.map(feature => feature.properties.code).sort();
  if (JSON.stringify(codes) !== JSON.stringify(expected)) throw new Error('The source must contain the exact fourteen verified PSGC codes.');
  const names = { '0403411005': 'Baybayin', '0403411014': 'Timugan' };
  const geo = {
    type: 'FeatureCollection', bbox: source.bbox, sourceSha256,
    features: source.features.map(feature => ({
      type: 'Feature', id: feature.properties.code,
      properties: { code: feature.properties.code, name: names[feature.properties.code] ?? feature.properties.name },
      geometry: feature.geometry,
    })),
  };
  const geometryBytes = JSON.stringify(geo) + '\n';
  const manifest = {
    title: 'Los Baños barangay boundaries — UN OCHA COD-AB v03',
    license: { id: 'CC-BY-3.0-IGO', url: 'https://creativecommons.org/licenses/by/3.0/igo/', legalCode: 'https://creativecommons.org/licenses/by/3.0/igo/legalcode' },
    producer: 'UN OCHA Information Systems Section (ISS)', host: 'HDX Data Systems Team', upstreamSources: ['NAMRIA', 'Philippine Statistics Authority'],
    collectionUrl: collection, documentationUrl: collection.replace('collection.json', 'README.md'),
    hdxDatasetUrl: 'https://data.humdata.org/dataset/cod-ab-phl',
    psgcUrl: 'https://psa.gov.ph/classification/psgc/barangays/0403411000',
    accessedOn: '2026-11-06', sourceVersion: 'v03', sourceValidOn: '2025-02-13',
    crs: { id: 'OGC:CRS84', axisOrder: ['longitude', 'latitude'], units: 'degrees', basis: 'GeoParquet 2.0 absent crs defaults to OGC:CRS84', specification: 'https://geoparquet.org/releases/v2.0.0/' },
    original: { url: parquet, bytes: 152877761, sha256: sourceSha256, collectionMultihash: `1220${sourceSha256}` },
    extract: { filename: 'los-banos.full.geojson', bytes: 62456, sha256: extractSha256, filter: "adm3_pcode = 'PH0403411'" },
    geometry: { filename: 'los-banos.geometry.json', bytes: Buffer.byteLength(geometryBytes), sha256: digest(geometryBytes) },
    coverage: { municipalityCode: '0403411000', sourceMunicipalityCode: 'PH0403411', nationalFeatureCount: 42048, featureCount: 14, codes: expected, bounds: source.bbox },
    validation: { allPolygonsValid: true, verticesIncludingClosingPoints: 1442, positiveAreaOverlapPairsAbove1eMinus16SquareDegrees: 0, unionValid: true, unionComponents: 1, unionInteriorRings: 0, allSourceCentersInsidePolygons: true },
    transformations: ['Filter source municipality PH0403411', 'Remove literal PH prefix from PSGC keys', 'Normalize Baybayin (Pob.) and Timugan (Pob.) display names against PSA listing', 'Serialize full original boundary coordinates as compact GeoJSON; no rounding, simplification or polygon invention'],
    attribution: 'Los Baños barangay boundaries: UN OCHA COD-AB v03; source NAMRIA / Philippine Statistics Authority; source valid_on 2025-02-13. CC BY 3.0 IGO. Extracted and display names normalized; boundary coordinates preserved. No endorsement implied.',
    limitations: ['Source valid_on is a dataset field, not proof of a physical boundary survey or legal adjudication.', 'HDX package prose lists older counts/dates; the reviewed distribution has 42048 ADM4 records.', 'Public geometry conveys no access to private data. Authorize exact original application keys before resolving aliases.'],
  };
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(geometryPath, geometryBytes);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Prepared 14 regions, ${Buffer.byteLength(geometryBytes)} bytes; SHA256 ${digest(geometryBytes)}`);
}
