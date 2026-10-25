const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'projects/static/basemap/singapore.geojson'),'utf8'));
globalThis.GeoJSONVT=require('../projects/static/vendor/geojson-vt.js');
require('../projects/static/sg-map-tiles.js');
require('../projects/static/sg-basemap.js');

test('local basemap includes coastline, parks, water, runways, and classified roads',()=>{
  assert.equal(data.type,'FeatureCollection');
  const kinds=new Set(data.features.map(f=>f.properties.kind));
  for(const kind of ['land','park','water','runway','road'])assert.ok(kinds.has(kind));
  const roads=data.features.filter(f=>f.properties.kind==='road');
  assert.ok(roads.some(f=>f.properties.class==='CAT1'));
  assert.ok(roads.some(f=>f.properties.class==='CAT5'));
  assert.ok(roads.reduce((n,f)=>n+f.geometry.coordinates.length,0)>10000);
});

test('map coordinates are two-dimensional WGS84 within the stated Singapore extent',()=>{
  let points=0;
  function inspect(value){
    if(typeof value[0]==='number'){
      assert.equal(value.length,2);const[x,y]=value;
      assert.ok(Number.isFinite(x)&&Number.isFinite(y));
      assert.ok(x>=data.bbox[0]-1e-6&&x<=data.bbox[2]+1e-6);
      assert.ok(y>=data.bbox[1]-1e-6&&y<=data.bbox[3]+1e-6);points++;
    }else value.forEach(inspect);
  }
  data.features.forEach(f=>inspect(f.geometry.coordinates));assert.ok(points>30000);
  const rail=JSON.parse(fs.readFileSync(path.join(root,'projects/sgmrt.geojson'),'utf8'));
  rail.features.filter(f=>f.geometry.type==='Point'&&f.properties.name.length>2).forEach(f=>{
    const[x,y]=f.geometry.coordinates;assert.ok(x>=data.bbox[0]&&x<=data.bbox[2]&&y>=data.bbox[1]&&y<=data.bbox[3]);
  });
});

test('basemap metadata attributes its sources and does not disclose station names',()=>{
  assert.match(data.licence,/data.gov.sg\/open-data-licence/);
  assert.equal(data.sources.length,3);
  assert.match(data.contextLicence,/naturalearthdata.com/);
  for(const feature of data.features)assert.deepEqual(Object.keys(feature.properties).sort(),feature.properties.kind==='road'?['class','kind']:['kind']);
});

test('road detail increases with zoom while quiet fills remain legible',()=>{
  const style=SingaporeBasemap.style,minor={properties:{kind:'road',class:'CAT5'}},major={properties:{kind:'road',class:'CAT1'}};
  assert.equal(style(minor,11).opacity,0);assert.equal(style(minor,14).opacity,1);
  assert.ok(style(major,16).weight>style(major,11).weight);
  assert.ok(style(major,13).weight>style(minor,13).weight);
  assert.equal(style({properties:{kind:'land'}},12).fillOpacity,1);
});

test('bundled Leaflet exactly matches the formerly pinned CDN version',()=>{
  for(const[file,expected]of [['leaflet.js','20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='],['leaflet.css','p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=']]){
    const bytes=fs.readFileSync(path.join(root,'projects/static/vendor/leaflet',file));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('base64'),expected);
  }
  assert.match(fs.readFileSync(path.join(root,'projects/static/vendor/leaflet/LICENSE'),'utf8'),/Redistribution/);
});

test('the quiz loads local scripts and styles without a map tile service',()=>{
  const html=fs.readFileSync(path.join(root,'projects/sgmrts.html'),'utf8');
  assert.doesNotMatch(html,/<(?:script|link)[^>]+(?:src|href)="https?:/);
  assert.doesNotMatch(html,/L\.tileLayer|cartocdn/);
  for(const match of html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g)){
    const file=path.resolve(root,'projects',match[1]);
    assert.ok(file.startsWith(path.join(root,'projects')+path.sep),`${match[1]} escapes the projects server root`);
    assert.ok(fs.existsSync(file),`${match[1]} does not exist`);
  }
  for(const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g))assert.doesNotThrow(()=>new vm.Script(match[1]));
});

test('map tiles contain only clipped local geometry, rather than the whole island',()=>{
  const index=SingaporeMapTiles.createIndex(data),z=15,lat=1.31,lon=103.83;
  const phi=lat*Math.PI/180,x=Math.floor((lon+180)/360*2**z),y=Math.floor((1-Math.log(Math.tan(phi)+1/Math.cos(phi))/Math.PI)/2*2**z);
  const tile=index.getTile(z,x,y);assert.ok(tile&&tile.features.length);
  let vertices=0;
  for(const feature of tile.features)for(const ring of feature.geometry)for(const point of ring){
    for(const coordinate of point)assert.ok(coordinate>=-97&&coordinate<=4193);
    vertices++;
  }
  assert.ok(vertices<10000,`Visible tile has ${vertices} points`);
  let paths=0;
  const context={setTransform(){},fillRect(){},beginPath(){paths++;},moveTo(x,y){assert.ok(Number.isFinite(x)&&Number.isFinite(y));},lineTo(x,y){assert.ok(Number.isFinite(x)&&Number.isFinite(y));},closePath(){},fill(){},stroke(){}};
  SingaporeMapTiles.paint(context,index,{z,x,y},{size:256,ratio:2,details:true});
  assert.ok(paths>1);
  paths=0;SingaporeMapTiles.paint(context,index,{z,x,y},{details:false});
  assert.ok(paths<=1,'Details-off tiles should paint only land');
});
