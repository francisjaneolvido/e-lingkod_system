# Los Baños barangay geometry

The static map contains fourteen genuine barangay polygons from **UN OCHA COD-AB v03**, distributed by the HDX Data Systems Team under **CC BY 3.0 IGO**. Source coordinates are preserved at full precision. There are no invented, reconstructed or simplified polygons and no runtime geospatial dependency.

## Sources and license

- [Official OCHA collection](https://data.source.coop/hdx/cod-ab/original/phl/latest/phl_admin4/collection.json): explicit `CC-BY-3.0-IGO`; producer UN OCHA Information Systems Section (ISS); host HDX Data Systems Team. [Collection README](https://data.source.coop/hdx/cod-ab/original/phl/latest/phl_admin4/README.md) repeats the license.
- [Original GeoParquet](https://data.source.coop/hdx/cod-ab/original/phl/latest/phl_admin4/phl_admin4.parquet), 152,877,761 bytes. SHA256 `49096df60471aa6146a49dcd971e0f8b60ae65d5f0ec1158da3c1efb341e803a`, matching the collection's `1220`-prefixed SHA256 multihash.
- [OCHA's own consumer](https://github.com/OCHA-DAP/cod-site/blob/main/scripts/catalog/explorer/ocha.py) and [base URL configuration](https://github.com/OCHA-DAP/cod-site/blob/main/scripts/catalog/common.py) establish this as OCHA's original per-country distribution.
- [HDX COD-AB Philippines](https://data.humdata.org/dataset/cod-ab-phl) and its [public metadata API](https://data.humdata.org/api/3/action/package_show?id=cod-ab-phl) attribute upstream data to NAMRIA and the Philippine Statistics Authority. HDX's older prose lists 11,920 barangays and 2018 dates; the reviewed original distribution actually contains **42,048** barangays. The selected records carry **`valid_on=2025-02-13`, version `v03`**. This field does not establish a physical survey date or legal adjudication.
- [Primary PSA municipality listing](https://psa.gov.ph/classification/psgc/barangays/0403411000) verifies the fourteen codes and current names.
- [License legal code](https://creativecommons.org/licenses/by/3.0/igo/legalcode): sections 3–4 allow distribution and adaptations with retained notices, attribution, license link and identification of changes. The data license remains applicable separately from application code. Do not imply endorsement.

Suggested product credit, with links to the collection, HDX and license:

> Los Baños barangay boundaries: UN OCHA COD-AB v03; source NAMRIA / Philippine Statistics Authority; source valid_on 2025-02-13. CC BY 3.0 IGO. Extracted and display names normalized; boundary coordinates preserved. No endorsement implied.

Accessed 2026-11-06. The source URL uses `latest`, so reproduction **must check the pinned SHA256** and stop if upstream changes. Review a new version explicitly rather than silently adopting it.

## Identifier crosswalk

All identifiers are strings, retaining leading zeroes. Source OCHA codes add a literal `PH` prefix to the current 10-digit PSGC; remove only that prefix. The 9-digit correspondence codes below are independently recorded from PSA. Malinta is **015**, and **009 is absent**.

| PSGC | Correspondence code | PSA display name | Existing application key | Additional source alias |
|---|---|---|---|---|
|0403411001|043411001|Anos|Anos|—|
|0403411002|043411002|Bagong Silang|Bagong Silang|—|
|0403411003|043411003|Bambang|Bambang|—|
|0403411004|043411004|Batong Malake|Batong Malake|—|
|0403411005|043411005|Baybayin|Baybayin|Baybayin (Pob.); Baybayin (Poblacion)|
|0403411006|043411006|Bayog|Bayog|—|
|0403411007|043411007|Lalakay|Lalakay|—|
|0403411008|043411008|Maahas|Maahas|—|
|0403411015|043411015|Malinta|Malinta|—|
|0403411010|043411010|Mayondon|Mayondon|—|
|0403411011|043411011|Putho Tuntungin|Tuntungin-Putho|Putho-Tuntungin|
|0403411012|043411012|San Antonio|San Antonio|—|
|0403411013|043411013|Tadlak|Tadlac|—|
|0403411014|043411014|Timugan|Timugan (Poblacion)|Timugan (Pob.)|

`LOS_BANOS_REGIONS` exports code, canonical name, exact existing application key (`appName`) and official source center in `[longitude, latitude]` order, alphabetically by canonical name. Every center was verified strictly inside its polygon. `resolveBarangayCode(unknown)` accepts only the listed names/codes, their `PH`-prefixed current codes, case differences and normalized whitespace. Numbers, guessed/missing codes and unknown labels return `null`.

**This resolver is not authorization.** Authorize each original application key against current scope before resolving aliases or displaying aggregates. Keep unknown labels reported as unmapped. Public shapes contain no private records and convey no access to data, drilldowns or exports.

## Coordinates and validation

GeoParquet metadata declares version 2.0.0 with WKB geometry and omits `crs`. Under the [GeoParquet specification](https://geoparquet.org/releases/v2.0.0/), this means **OGC:CRS84**, WGS84 longitude then latitude, in degrees. No projection guess was applied. The client may consistently project all features for SVG display; this must not change the retained source geometry.

The checked extract has fourteen individually valid Polygons, **1,442 vertices including closing points**, no positive-area pair overlaps above `1e-16` square degrees, and one valid union Polygon with no interior rings. Shared exact source segments connect all fourteen regions. These are computational topology checks, not legal authority for property or jurisdiction disputes.

Bounds: `[121.17130939400022,14.109612395000113,121.26622697500034,14.198157195000135]`.

- Reviewed intermediate extract: 62,456 bytes; SHA256 `42e4970ac0382827d38487cd5acd950093695f6436b2b80399438675beaa0009`.
- Shipped compact GeoJSON: 59,346 bytes; SHA256 `76e239f7414ea470050cd2bcca8a8987c0bcb322017af093287bd5aa418735a1`.
- Packaging removes unused source attributes, strips the `PH` code prefix and normalizes Baybayin/Timugan display names. It preserves every coordinate and polygon. [Source manifest](../src/features/geography/source-manifest.json) retains exact URLs, hashes, source fields, transformations and limitations.

## Reproduce without application dependencies

The final asset can be rebuilt with Node from the hash-pinned intermediate file:

```powershell
node scripts/prepare-los-banos-geometry.mjs '<local-path>/los-banos.full.geojson'
node scripts/prepare-los-banos-geometry.mjs --check
node --test tests/barangay-geography.test.mjs
```

To reproduce that intermediate from original OCHA GeoParquet, use the maintained Python tool [extract-ocha-los-banos.py](../scripts/geography/extract-ocha-los-banos.py). Download the original from the URL above; the tool verifies its hash before use. This optional rebuild needs Python/DuckDB; running the application does not. Prepare research tooling in a user-owned directory:

```powershell
$geometryWork = Join-Path $env:LOCALAPPDATA 'eLingkodBayan/geometry-tools'
New-Item -ItemType Directory -Path $geometryWork -Force | Out-Null
python -m pip download --no-deps --dest "$geometryWork/tool-wheels" duckdb==1.4.3
python -m zipfile -e '<downloaded-wheel-path>' "$geometryWork/python-deps"
python scripts/geography/extract-ocha-los-banos.py '<local-original.parquet>' "$geometryWork/reproduced" --duckdb-root "$geometryWork/python-deps" --extension-directory "$geometryWork/duckdb-extensions" --install-extensions
node scripts/prepare-los-banos-geometry.mjs "$geometryWork/reproduced/los-banos.full.geojson"
```

DuckDB 1.4.3 is MIT licensed, copyright 2018–2025 Stichting DuckDB Foundation; retain the wheel's `duckdb-1.4.3.dist-info/licenses/LICENSE`. The Windows CPython 3.14 AMD64 wheel used for this extraction has SHA256 `23b12854032c1a58d0452e2b212afa908d4ce64171862f3792ba9a596ba7c765`. Downloaded official DuckDB extensions stay in the chosen tooling directory. Other platforms need their corresponding trusted DuckDB 1.4.3 wheel. The Python extractor writes the reviewed intermediate's CRLF explicitly for reproducible hashes across platforms. No package manifest, schema or database is changed.

The Python report recomputes validity, overlaps, union topology, centers and counts. The Node preparation tool rejects unreviewed intermediate bytes and rebuilds the compact static asset and manifest deterministically. Tests verify canonical identifiers and aliases, unknown handling, closed finite bounded coordinates, retained vertex count, shared edge connectivity and asset integrity.
