"""Reproduce the reviewed GeoJSON extract; DuckDB is optional research tooling.

Run with --help. Never installs an application dependency or writes to a database.
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('parquet', type=Path)
parser.add_argument('output_directory', type=Path)
parser.add_argument('--duckdb-root', type=Path, required=True, help='Unpacked DuckDB 1.4.3 wheel directory')
parser.add_argument('--extension-directory', type=Path, required=True)
parser.add_argument('--install-extensions', action='store_true', help='Download the official DuckDB spatial extension into the supplied directory')
args = parser.parse_args()
sys.path.insert(0, str(args.duckdb_root.resolve()))
import duckdb

if duckdb.__version__ != '1.4.3':
    raise RuntimeError('Reproduction requires reviewed DuckDB 1.4.3')
original_sha256 = '49096df60471aa6146a49dcd971e0f8b60ae65d5f0ec1158da3c1efb341e803a'
if hashlib.sha256(args.parquet.read_bytes()).hexdigest() != original_sha256:
    raise RuntimeError('Official source hash differs from the reviewed collection; do not silently update geometry')
connection = duckdb.connect(config={'extension_directory': str(args.extension_directory.resolve())})
if args.install_extensions:
    connection.execute('INSTALL spatial')
connection.execute('LOAD spatial')
connection.execute("CREATE TEMP TABLE lb AS SELECT * FROM read_parquet(?) WHERE adm3_pcode='PH0403411'", [str(args.parquet.resolve())])
rows = connection.execute('SELECT adm4_pcode,adm4_name,adm3_name,adm3_pcode,valid_on,version,ST_AsGeoJSON(geometry),center_lon,center_lat,area_sqkm,ST_IsValid(geometry),ST_NPoints(geometry) FROM lb ORDER BY adm4_pcode').fetchall()
expected = {'0403411001','0403411002','0403411003','0403411004','0403411005','0403411006','0403411007','0403411008','0403411010','0403411011','0403411012','0403411013','0403411014','0403411015'}
if len(rows) != 14 or {row[0][2:] for row in rows} != expected or not all(row[10] for row in rows):
    raise RuntimeError('Expected fourteen exact valid Los Banos barangay polygons')
features = []
for code,name,municipality,parent,date,version,geometry,lon,lat,area,valid,points in rows:
    features.append({'type':'Feature','id':code[2:],'properties':{'code':code[2:],'name':name,'sourceCode':code,'sourceParentCode':parent,'sourceMunicipality':municipality,'sourceValidOn':date.isoformat(),'sourceVersion':version,'sourceCenter':[lon,lat],'sourceAreaSquareKm':area},'geometry':json.loads(geometry)})
bounds = connection.execute('SELECT min(ST_XMin(geometry)),min(ST_YMin(geometry)),max(ST_XMax(geometry)),max(ST_YMax(geometry)) FROM lb').fetchone()
collection = {'type':'FeatureCollection','bbox':list(bounds),'features':features}
args.output_directory.mkdir(parents=True, exist_ok=True)
output = args.output_directory / 'los-banos.full.geojson'
# Preserve the reviewed Windows extract's CRLF explicitly on every platform.
output.write_bytes((json.dumps(collection,ensure_ascii=False,separators=(',',':'))+'\r\n').encode('utf-8'))
extract_sha256 = hashlib.sha256(output.read_bytes()).hexdigest()
if extract_sha256 != '42e4970ac0382827d38487cd5acd950093695f6436b2b80399438675beaa0009':
    raise RuntimeError('Extract bytes differ from the reviewed extraction')
overlaps = connection.execute('SELECT a.adm4_pcode,b.adm4_pcode,ST_Area(ST_Intersection(a.geometry,b.geometry)) FROM lb a JOIN lb b ON a.adm4_pcode<b.adm4_pcode WHERE ST_Intersects(a.geometry,b.geometry) AND ST_Area(ST_Intersection(a.geometry,b.geometry))>1e-16').fetchall()
union = connection.execute('SELECT ST_IsValid(ST_Union_Agg(geometry)),ST_GeometryType(ST_Union_Agg(geometry)),ST_NumGeometries(ST_Union_Agg(geometry)),ST_NumInteriorRings(ST_Union_Agg(geometry)) FROM lb').fetchone()
centers_inside = connection.execute('SELECT bool_and(ST_Contains(geometry,ST_Point(center_lon,center_lat))) FROM lb').fetchone()[0]
report = {'sourceSha256':original_sha256,'extractSha256':extract_sha256,'extractBytes':output.stat().st_size,'featureCount':len(rows),'bounds':list(bounds),'allValid':True,'vertexCounts':{row[0][2:]:row[11] for row in rows},'positiveAreaOverlapPairs':overlaps,'unionValid':union[0],'unionType':union[1],'unionComponentCount':union[2],'unionInteriorRings':union[3],'allSourceCentersInsidePolygons':centers_inside,'nationalFeatureCount':connection.execute('SELECT count(*) FROM read_parquet(?)',[str(args.parquet.resolve())]).fetchone()[0]}
(args.output_directory / 'geometry-validation.json').write_bytes((json.dumps(report,indent=2)+'\n').encode('utf-8'))
print(json.dumps(report,indent=2))
