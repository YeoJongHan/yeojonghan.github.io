"""Build the quiz's static Singapore basemap. No credentials are required.

Install build tools: python -m pip install -r scripts/map-data-requirements.txt
Then run: python scripts/build-sg-basemap.py
These Python packages are not needed to run or host the website.
"""
import argparse
from collections import defaultdict
from datetime import date
import io
import json
from pathlib import Path
import tempfile
from urllib.request import Request, urlopen
import zipfile

import shapefile
from pyproj import CRS, Transformer
from shapely import force_2d, make_valid, union_all, transform as transform_geometry
from shapely.geometry import box, mapping, shape, MultiLineString

ROOT = Path(__file__).resolve().parents[1]
POLYGON_ID = 'd_29f066d67df3eae91df8a42f443863c8'
ROAD_URL = 'https://datamall.lta.gov.sg/content/dam/datamall/datasets/Geospatial/RoadSectionLine_Sep2026.zip'
CONTEXT_URL = 'https://naciscdn.org/naturalearth/50m/physical/ne_50m_land.zip'
EXTENT = (103.55, 1.15, 104.18, 1.55)
CONTEXT_EXTENT = (102.0, -0.2, 105.5, 3.0)


def download(url):
    request = Request(url, headers={'User-Agent': 'SGMRT-static-map-builder/1.0'})
    with urlopen(request, timeout=90) as response:
        return response.read()


def cached(cache, name, url, refresh):
    path = cache / name
    if refresh or not path.exists():
        path.write_bytes(download(url))
    return path


def rounded(value):
    if isinstance(value, (list, tuple)):
        return [rounded(item) for item in value]
    return round(value, 6) if isinstance(value, float) else value


def geometry(geom):
    value = mapping(geom)
    return {'type': value['type'], 'coordinates': rounded(value['coordinates'])}


def build(args):
    cache = args.cache_dir
    cache.mkdir(parents=True, exist_ok=True)
    polygon_path = cache / 'national-map-polygon.geojson'
    if args.refresh or not polygon_path.exists():
        # GeoJSON downloads do not require an initiate-download call or an API key.
        response = json.loads(download(f'https://api-open.data.gov.sg/v1/public/api/datasets/{POLYGON_ID}/poll-download'))
        polygon_path.write_bytes(download(response['data']['url']))
    road_path = cached(cache, 'RoadSectionLine_Sep2026.zip', ROAD_URL, args.refresh)
    polygons = json.loads(polygon_path.read_text(encoding='utf-8'))
    to_meters = Transformer.from_crs(4326, 3414, always_xy=True).transform
    to_wgs84 = Transformer.from_crs(3414, 4326, always_xy=True).transform
    extent = box(*EXTENT)
    kinds = {'Coastal_Outlines': 'land', 'Parks_NaturalReserve': 'park', 'Hydrographic': 'water', 'Airport_Runway': 'runway'}
    buckets = defaultdict(list)
    for feature in polygons['features']:
        kind = kinds.get(feature['properties'].get('FOLDERPATH', '').split('/')[-1])
        if not kind or not feature.get('geometry'):
            continue
        geom = make_valid(force_2d(shape(feature['geometry']))).intersection(extent)
        if geom.is_empty:
            continue
        metric = transform_geometry(geom, to_meters, interleaved=False)
        if metric.area < 30:
            continue
        buckets[kind].append(metric)

    # Lower-resolution public-domain land continues Malaysia/Indonesia outside
    # the detailed Singapore coverage, avoiding an artificial coastline cutoff.
    context_path = cached(cache, 'ne_50m_land.zip', CONTEXT_URL, args.refresh)
    context_parts = []
    context_extent = box(*CONTEXT_EXTENT)
    with zipfile.ZipFile(context_path) as archive:
        stem = next(name[:-4] for name in archive.namelist() if name.lower().endswith('.shp'))
        context_reader = shapefile.Reader(shp=io.BytesIO(archive.read(stem+'.shp')),shx=io.BytesIO(archive.read(stem+'.shx')))
        for record in context_reader.iterShapes():
            bounds = record.bbox
            if bounds[2]<CONTEXT_EXTENT[0] or bounds[0]>CONTEXT_EXTENT[2] or bounds[3]<CONTEXT_EXTENT[1] or bounds[1]>CONTEXT_EXTENT[3]:
                continue
            # Overlap northern Johor coverage: the SLA extract's actual edge is
            # south of EXTENT's clipping limit. Singapore itself stays masked.
            detailed_mask = box(EXTENT[0],EXTENT[1],EXTENT[2],1.49)
            geom = make_valid(shape(record.__geo_interface__)).intersection(context_extent).difference(detailed_mask)
            if not geom.is_empty:
                context_parts.append(geom)
    context = make_valid(union_all(context_parts))
    buckets['land'].append(transform_geometry(context,to_meters,interleaved=False))
    features = []
    for kind in ['land', 'park', 'water', 'runway']:
        merged = make_valid(union_all(buckets[kind])).simplify(3, preserve_topology=True)
        features.append({'type': 'Feature', 'properties': {'kind': kind}, 'geometry': geometry(transform_geometry(merged, to_wgs84, interleaved=False))})

    roads = defaultdict(list)
    with zipfile.ZipFile(road_path) as archive:
        stem = next(name[:-4] for name in archive.namelist() if name.lower().endswith('.shp'))
        projection = CRS.from_wkt(archive.read(stem + '.prj').decode())
        convert = Transformer.from_crs(projection, 4326, always_xy=True).transform
        reader = shapefile.Reader(shp=io.BytesIO(archive.read(stem + '.shp')), shx=io.BytesIO(archive.read(stem + '.shx')), dbf=io.BytesIO(archive.read(stem + '.dbf')))
        for record in reader.iterShapeRecords():
            geom = shape(record.shape.__geo_interface__).simplify(2, preserve_topology=False)
            geom = transform_geometry(geom, convert, interleaved=False).intersection(extent)
            category = record.record.as_dict()['RD_CATG_NA']
            if geom.is_empty:
                continue
            if geom.geom_type == 'LineString':
                roads[category].append(list(geom.coords))
            elif geom.geom_type == 'MultiLineString':
                roads[category].extend(list(part.coords) for part in geom.geoms)
    for category, parts in sorted(roads.items()):
        features.append({'type': 'Feature', 'properties': {'kind': 'road', 'class': category}, 'geometry': geometry(MultiLineString(parts))})

    result = {'type': 'FeatureCollection', 'bbox': list(CONTEXT_EXTENT), 'focusBounds':list(EXTENT), 'sources': [f'https://data.gov.sg/datasets/{POLYGON_ID}/view', ROAD_URL, CONTEXT_URL], 'licence': 'https://data.gov.sg/open-data-licence', 'contextLicence':'https://www.naturalearthdata.com/about/terms-of-use/', 'accessed': date.today().isoformat(), 'features': features}
    output = ROOT / 'projects/static/basemap/singapore.geojson'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, separators=(',', ':'), ensure_ascii=True) + '\n', encoding='utf-8')
    print('Built', output.relative_to(ROOT), output.stat().st_size, 'bytes;', len(features), 'layers')
    print('Road classes:', {key: len(value) for key, value in sorted(roads.items())})

    vendor = ROOT / 'projects/static/vendor/leaflet'
    vendor.mkdir(parents=True, exist_ok=True)
    assets = ['leaflet.js', 'leaflet.js.map', 'leaflet.css', 'images/layers.png', 'images/layers-2x.png', 'images/marker-icon.png', 'images/marker-icon-2x.png', 'images/marker-shadow.png']
    for name in assets:
        target = vendor / name
        target.parent.mkdir(parents=True, exist_ok=True)
        if args.refresh or not target.exists():
            target.write_bytes(download('https://unpkg.com/leaflet@1.9.4/dist/' + name))
    licence = vendor / 'LICENSE'
    if args.refresh or not licence.exists():
        licence.write_bytes(download('https://raw.githubusercontent.com/Leaflet/Leaflet/v1.9.4/LICENSE'))
    for name, url in [('geojson-vt.js','https://unpkg.com/geojson-vt@5.0.4/geojson-vt.js'),('geojson-vt.LICENSE','https://unpkg.com/geojson-vt@5.0.4/LICENSE')]:
        target = vendor.parent / name
        if args.refresh or not target.exists():
            target.write_bytes(download(url))
    print('Leaflet 1.9.4 and geojson-vt 5.0.4 bundled locally with their licences.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache-dir', type=Path, default=Path(tempfile.gettempdir()) / 'sg-mrt-map-source')
    parser.add_argument('--refresh', action='store_true', help='Download fresh copies of the configured sources.')
    build(parser.parse_args())
