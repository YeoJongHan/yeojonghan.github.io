const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
require('../projects/static/mrt-photo-core.js');
const Core=MRTPhotoCore,root=path.resolve(__dirname,'..'),catalog=require('../projects/static/mrt-photos/manifest.json');
const iso=ordinal=>new Date(ordinal*86400000).toISOString().slice(0,10);
const target=game=>Core.photoFor(catalog,game.photoId).stationId;
const wrong=game=>catalog.stations.filter(s=>s.id!==target(game));

test('every photo is local, attributed, a real JPEG, and linked to a station',()=>{
  assert.ok(catalog.photos.length>=2);assert.ok(catalog.stations.length>=100);
  assert.equal(new Set(catalog.photos.map(p=>p.id)).size,catalog.photos.length);
  for(const photo of catalog.photos){
    assert.ok(Core.stationFor(catalog,photo.stationId));
    assert.match(photo.src,/^static\/mrt-photos\/[a-f0-9]+\.jpg$/);
    const file=fs.readFileSync(path.join(root,'projects',photo.src));assert.equal(file.subarray(0,3).toString('hex'),'ffd8ff');
    assert.ok(photo.credit.author&&photo.credit.title);assert.doesNotMatch(photo.credit.author,/<[^>]+>/);
    assert.match(photo.credit.sourceUrl,/^https:\/\/commons.wikimedia.org\/wiki\/File:/);
    assert.match(photo.credit.licenseUrl,/^https:\/\/creativecommons.org\//);
  }
});

test('station dropdown covers every bundled MRT station, including MRT/LRT interchanges',()=>{
  const geo=JSON.parse(fs.readFileSync(path.join(root,'projects/sgmrt.geojson'),'utf8'));
  const mrt=geo.features.filter(f=>f.geometry.type==='Point'&&f.properties.network?.split('.').includes('singapore-mrt'));
  assert.deepEqual(catalog.stations.map(s=>s.name).sort(),mrt.map(f=>f.properties.name).sort());
  for(const name of ['Bukit Panjang','Choa Chu Kang','Punggol','Sengkang']){
    assert.ok(Core.suggestions(catalog.stations,name.slice(0,4)).some(s=>s.name===name),name);
  }
  assert.ok(Core.suggestions(catalog.stations,'NE17').some(s=>s.name==='Punggol'));
  assert.ok(Core.suggestions(catalog.stations,'DT1').some(s=>s.name==='Bukit Panjang'));
});

test('the quiz includes only reviewed photos and never reuses a source or file',()=>{
  const review=require('../projects/static/mrt-photos/curation.json');
  const audit=require('../projects/static/mrt-photos/name-review.json');
  const decisions=new Map(audit.photos.map(p=>[p.sourceUrl,p.decision]));
  assert.ok(new Set(catalog.photos.map(p=>p.stationId)).size>=2);
  const sources=new Set(),files=new Set();
  for(const station of catalog.stations){
    const photos=catalog.photos.filter(p=>p.stationId===station.id);
    assert.ok(photos.length>=2,`Missing alternate station views: ${station.name}`);
    for(const photo of photos){
      const approved=review.approvedSources[photo.credit.sourceUrl];
      assert.ok(approved,`Photo needs name review: ${photo.credit.title}`);
      assert.deepEqual(photo.crop,approved.crop,`Required crop changed: ${photo.credit.title}`);
      const audited=audit.photos.find(p=>p.sourceUrl===photo.credit.sourceUrl);
      assert.deepEqual(photo.crop,audited.crop,`Crop does not match visual review: ${photo.credit.title}`);
      if(photo.crop){
        assert.equal(Core.validCrop(photo.crop),true);
        assert.match(photo.credit.note,/natural crop/);
      }
      assert.equal(decisions.get(photo.credit.sourceUrl),'kept');
      assert.ok(!review.excludedSources[photo.credit.sourceUrl],`Rejected photo returned: ${photo.credit.title}`);
      assert.ok(!sources.has(photo.credit.sourceUrl),`Repeated source: ${photo.credit.title}`);
      assert.ok(!files.has(photo.src),`Repeated local photo: ${photo.src}`);
      sources.add(photo.credit.sourceUrl);files.add(photo.src);
    }
  }
  assert.deepEqual([...sources].sort(),Object.keys(review.approvedSources).sort());
  assert.equal(audit.photos.length,review.nameReview.totalReviewed);
  for(const photo of audit.photos.filter(p=>p.decision==='removed')){
    assert.ok(review.excludedSources[photo.sourceUrl]);assert.ok(!sources.has(photo.sourceUrl));
  }
});

test('daily rotates through alternate views when a station returns',()=>{
  const photos=Array.from({length:4},(_,station)=>Array.from({length:3},(_,view)=>({id:`s${station}-v${view}`,stationId:`s${station}`}))).flat();
  const seen=new Map();
  for(let cycle=5000;cycle<5006;cycle++)for(let offset=0;offset<4;offset++){
    const id=Core.dailyPhoto(photos,iso(cycle*4+offset)),station=photos.find(p=>p.id===id).stationId;
    const visits=seen.get(station)||[];visits.push(id);seen.set(station,visits);
  }
  for(const visits of seen.values()){
    assert.equal(new Set(visits.slice(0,3)).size,3);
    assert.equal(visits[0],visits[3]);assert.notEqual(visits[2],visits[3]);
  }
});

test('reviewed photo crops stay inside the frame and preserve the exact source region at every size',()=>{
  const crop={x:.25,y:.1,width:.5,height:.75};
  for(const [width,height] of [[1280,960],[640,480],[300,200],[240,350]]){
    const layout=Core.photoLayout(1280,960,width,height,crop);
    assert.ok(layout.width<=width+.000001&&layout.height<=height+.000001);
    assert.ok(Math.abs(-layout.left/layout.imageWidth-crop.x)<.000001);
    assert.ok(Math.abs(-layout.top/layout.imageHeight-crop.y)<.000001);
    assert.ok(Math.abs(layout.width/layout.imageWidth-crop.width)<.000001);
    assert.ok(Math.abs(layout.height/layout.imageHeight-crop.height)<.000001);
  }
  assert.equal(Core.validCrop({x:.8,y:0,width:.3,height:1}),false);
  assert.equal(Core.validCrop({x:0,y:0,width:NaN,height:1}),false);
  assert.equal(Core.photoLayout(0,960,640,480,crop),null);
});

test('Singapore calendar days change at midnight SGT regardless of local timezone',()=>{
  assert.equal(Core.singaporeDate(new Date('2026-10-24T15:59:59Z')),'2026-10-24');
  assert.equal(Core.singaporeDate(new Date('2026-10-24T16:00:00Z')),'2026-10-25');
  assert.equal(Core.singaporeDate(new Date('2026-10-25T15:59:59Z')),'2026-10-25');
  assert.throws(()=>Core.dayNumber('2026-02-30'));assert.throws(()=>Core.dayNumber('yesterday'));
});

test('daily selection is stable and independent of manifest ordering',()=>{
  const date='2026-10-25',id=Core.dailyPhoto(catalog.photos,date,catalog.version);
  for(let i=0;i<10;i++)assert.equal(Core.dailyPhoto([...catalog.photos].reverse(),date,catalog.version),id);
});

test('consecutive daily stations never repeat over twenty years or at cycle boundaries',()=>{
  const start=Core.dayNumber('2020-01-01');let previous=null;
  for(let i=0;i<7305;i++){
    const station=Core.photoFor(catalog,Core.dailyPhoto(catalog.photos,iso(start+i))).stationId;
    assert.notEqual(station,previous,iso(start+i));previous=station;
  }
  const n=new Set(catalog.photos.map(p=>p.stationId)).size,cycleStart=Math.floor(start/n)*n;
  assert.equal(new Set(Array.from({length:n},(_,i)=>Core.photoFor(catalog,Core.dailyPhoto(catalog.photos,iso(cycleStart+i))).stationId)).size,n);
});

test('tiny pools and multiple photos per station also obey the no-repeat rule',()=>{
  for(const count of [2,3]){
    const photos=Array.from({length:count},(_,i)=>({id:'p'+i,stationId:'s'+i}));photos.push({id:'extra-photo',stationId:'s0'});
    let prior=null;for(let day=18000;day<18500;day++){
      const id=Core.dailyPhoto(photos,iso(day)),station=photos.find(p=>p.id===id).stationId;assert.notEqual(station,prior);prior=station;
    }
  }
  assert.throws(()=>Core.dailyPhoto([{id:'p1',stationId:'same'},{id:'p2',stationId:'same'}],'2026-10-25'));
});

test('daily rejects duplicates/invalid names without spending an attempt and locks after a win',()=>{
  const game=Core.restoreDaily(null,'2026-10-25',catalog),miss=wrong(game)[0].id;
  assert.equal(Core.guessDaily(game,'missing',catalog).accepted,false);
  assert.equal(Core.guessDaily(game,miss,catalog).correct,false);
  assert.equal(Core.guessDaily(game,miss,catalog).reason,'duplicate');assert.equal(game.guesses.length,1);
  const result=Core.guessDaily(game,target(game),catalog);assert.equal(result.correct,true);assert.equal(result.finished,true);
  assert.equal(Core.guessDaily(game,wrong(game)[1].id,catalog).accepted,false);
  assert.deepEqual(Core.restoreDaily(JSON.parse(JSON.stringify(game)),game.date,catalog),game);
});

test('daily ends after six misses and a new date starts fresh',()=>{
  const game=Core.restoreDaily(null,'2026-10-25',catalog);
  wrong(game).slice(0,6).forEach(s=>Core.guessDaily(game,s.id,catalog));
  assert.deepEqual(Core.dailyStatus(game,catalog),{won:false,finished:true,remaining:0});
  assert.equal(Core.guessDaily(game,target(game),catalog).accepted,false);
  assert.equal(Core.restoreDaily(game,'2026-10-26',catalog).guesses.length,0);
});

test('daily restore removes unknown/duplicate guesses and anything after the winning guess',()=>{
  const game=Core.restoreDaily(null,'2026-10-25',catalog),miss=wrong(game)[0].id;
  const restored=Core.restoreDaily({...game,guesses:['bad',miss,miss,target(game),wrong(game)[1].id]},game.date,catalog);
  assert.deepEqual(restored.guesses,[miss,target(game)]);
});

test('endless visits every image once and separates correct, wrong and skipped scores',()=>{
  const game=Core.newEndless(catalog,()=>.3);
  assert.equal(new Set(game.order).size,catalog.photos.length);assert.equal(Core.nextEndless(game),false);
  for(let i=0;i<game.order.length;i++){
    const photo=Core.photoFor(catalog,game.order[i]);
    const id=i%3===0?photo.stationId:catalog.stations.find(s=>s.id!==photo.stationId).id;
    assert.equal(Core.answerEndless(game,id,catalog,i%3===2).accepted,true);
    assert.equal(Core.answerEndless(game,id,catalog).accepted,false);
    assert.equal(Core.nextEndless(game),true);
  }
  const score=Core.score(game);assert.equal(score.total,catalog.photos.length);assert.equal(score.answered,score.total);
  assert.equal(score.correct,Math.ceil(score.total/3));assert.equal(score.correct+score.wrong+score.skipped,score.total);
  assert.equal(Core.answerEndless(game,catalog.stations[0].id,catalog).accepted,false);
  assert.equal(Core.nextEndless(game),false);assert.deepEqual(Core.restoreEndless(game,catalog),game);
});

test('endless validates saved runs and recomputes any claimed score',()=>{
  const game=Core.newEndless(catalog),photo=Core.photoFor(catalog,game.order[0]);
  Core.answerEndless(game,photo.stationId,catalog);game.answers[0].correct=false;
  assert.equal(Core.restoreEndless(game,catalog).answers[0].correct,true);
  const broken={...game,order:game.order.map(()=>game.order[0])};assert.equal(Core.restoreEndless(broken,catalog).answers.length,0);
  game.answers[0].skipped='yes';assert.equal(Core.restoreEndless(game,catalog).answers.length,0);
});

test('suggestions match station-name prefixes case-insensitively, including interchange codes',()=>{
  const list=Core.suggestions(catalog.stations,'  tamp');assert.ok(list.length>=2);assert.ok(list.every(s=>Core.normalize(s.name).startsWith('tamp')));
  assert.equal(Core.suggestions(catalog.stations,'zzz').length,0);assert.equal(Core.suggestions(catalog.stations,'').length,0);
  assert.ok(Core.suggestions(catalog.stations,'one n').some(s=>Core.normalize(s.name)==='one north'));
  assert.ok(Core.suggestions(catalog.stations,'NS25').some(s=>s.name==='City Hall'));
});

test('photo mode loads independently of map libraries and all runtime assets stay within projects',()=>{
  const html=fs.readFileSync(path.join(root,'projects/sgmrt-photos.html'),'utf8');
  assert.doesNotMatch(html,/leaflet|sg-basemap|<script[^>]+src="https?:/);
  for(const match of html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g)){
    const file=path.resolve(root,'projects',match[1]);assert.ok(file.startsWith(path.join(root,'projects')+path.sep));assert.ok(fs.existsSync(file));
  }
});
