const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
require('../assets/js/dog-catalog.js');
require('../assets/js/cat-catalog.js');
require('../assets/js/dog-game.js');
require('../assets/js/mythic-sprites.js');
require('../assets/js/pet-sprites.js');
require('../assets/js/dog-art.js');
require('../assets/js/cat-art.js');
const { dogs, rarities } = globalThis.DogClubData;
const Core = globalThis.DogClubCore;
const active=Core.active;

test('the album has 120 distinct dogs, 8 secrets, and diverse silhouettes', () => {
  assert.equal(dogs.length,120);
  assert.equal(new Set(dogs.map(d=>d.id)).size,120);
  assert.equal(new Set(dogs.map(d=>d.name)).size,120);
  assert.equal(dogs.filter(d=>d.secret).length,8);
  assert.ok(new Set(dogs.map(d=>d.shape)).size>=25);
  for(const rarity of rarities) assert.ok(dogs.some(d=>d.rarity===rarity.id));
});

test('a discovery pays its bonus only once; duplicates still earn coins', () => {
  const state=Core.freshState();
  const dog=dogs.find(d=>d.rarity==='rare');
  const initial=state.coins;
  const first=Core.awardDog(state,dog);
  const second=Core.awardDog(state,dog);
  assert.equal(first.isNew,true);
  assert.equal(second.isNew,false);
  assert.equal(first.reward-second.reward,rarities.find(r=>r.id==='rare').bonus);
  assert.equal(state.coins,initial+first.reward+second.reward);
  assert.equal(active(state).owned[dog.id],2);
  assert.equal(active(state).rolls,2);
});

test('upgrades cannot overspend or exceed their caps', () => {
  const state=Core.freshState();
  assert.equal(Core.buyUpgrade(state,'luck'),false);
  assert.equal(state.coins,30);
  assert.equal(Core.buyUpgrade(state,'unknown'),false);
  state.coins=100000;
  for(const kind of ['luck','speed']) {
    const max=kind==='luck'?Core.MAX_LUCK:Core.MAX_SPEED;
    for(let i=0;i<max;i++) {
      const before=state.coins,cost=Core.upgradeCost(kind,active(state)[kind]);
      assert.equal(Core.buyUpgrade(state,kind),true);
      assert.equal(state.coins,before-cost);
    }
    const before=state.coins;
    assert.equal(Core.buyUpgrade(state,kind),false);
    assert.equal(state.coins,before);
    assert.equal(active(state)[kind],max);
  }
});

test('luck improves Epic+ and Secret chances while probabilities stay normalized', () => {
  let priorEpic=0,priorSecret=0;
  for(let level=0;level<=Core.MAX_LUCK;level++) {
    const odds=Core.odds(level);
    const epic=odds.slice(3).reduce((a,b)=>a+b,0);
    assert.ok(Math.abs(odds.reduce((a,b)=>a+b,0)-1)<1e-10);
    assert.ok(epic>priorEpic);
    assert.ok(odds[5]>priorSecret);
    priorEpic=epic;priorSecret=odds[5];
  }
});

test('even the least lucky rolls receive Epic+ within 20 and Legendary+ within 80', () => {
  const state=Core.freshState();
  let lastEpic=0,lastLegendary=0;
  for(let roll=1;roll<=240;roll++) {
    const dog=Core.chooseDog(state,()=>0);
    const rank=rarities.findIndex(r=>r.id===dog.rarity);
    Core.awardDog(state,dog);
    if(rank>=3) { assert.ok(roll-lastEpic<=20);lastEpic=roll; }
    if(rank>=4) { assert.ok(roll-lastLegendary<=80);lastLegendary=roll; }
    assert.ok(active(state).pityRare<=19);
    assert.ok(active(state).pityLegendary<=79);
  }
  assert.equal(lastLegendary,240);
});

test('maxed luck guarantees Legendary+ within 20 rolls in both chapters', () => {
  for(const chapter of ['dogs','cats']) {
    const state=Core.freshState();
    if(chapter==='cats') {
      state.coins=10000;active(state).owned['dog-120']=1;
      Core.rebirthToCats(state);
    }
    active(state).luck=Core.MAX_LUCK;
    let lastLegendary=0;
    for(let roll=1;roll<=120;roll++) {
      const pet=Core.chooseDog(state,()=>0);
      const rank=rarities.findIndex(r=>r.id===pet.rarity);
      if(roll%20===0)assert.ok(rank>=4);
      Core.awardDog(state,pet);
      if(rank>=4){assert.ok(roll-lastLegendary<=20);lastLegendary=roll;}
      assert.ok(active(state).pityRare<=19);
    }
    assert.equal(lastLegendary,120);
  }
});

test('only meeting the active pity tier resets the 20-roll counter', () => {
  const state=Core.freshState();
  active(state).pityRare=7;
  Core.awardDog(state,dogs.find(d=>d.rarity==='rare'));
  assert.equal(active(state).pityRare,8);
  Core.awardDog(state,dogs.find(d=>d.rarity==='epic'));
  assert.equal(active(state).pityRare,0);
  active(state).luck=Core.MAX_LUCK;active(state).pityRare=7;
  Core.awardDog(state,dogs.find(d=>d.rarity==='epic'));
  assert.equal(active(state).pityRare,8);
  Core.awardDog(state,dogs.find(d=>d.rarity==='legendary'));
  assert.equal(active(state).pityRare,0);
});

test('maxing luck upgrades an imminent pity roll without losing saved progress', () => {
  const state=Core.freshState();
  active(state).luck=Core.MAX_LUCK-1;state.coins=100000;active(state).pityRare=19;
  assert.equal(Core.minimumRarity(state),3);
  assert.equal(Core.chooseDog(state,()=>0).rarity,'epic');
  assert.equal(Core.buyUpgrade(state,'luck'),true);
  assert.equal(active(state).pityRare,19);
  const restored=Core.validateState(JSON.parse(JSON.stringify(state)));
  assert.equal(active(restored).pityRare,19);
  assert.equal(Core.minimumRarity(restored),4);
  assert.equal(Core.chooseDog(restored,()=>0).rarity,'legendary');
  const odds=Core.odds(active(restored).luck,Core.minimumRarity(restored));
  assert.deepEqual(odds.slice(0,4),[0,0,0,0]);
});

test('the featured Legendary has exactly twice the pool weight', () => {
  const state=Core.freshState();
  const legends=dogs.filter(d=>d.rarity==='legendary');
  const counts={};
  for(let i=0;i<legends.length+1;i++) {
    let call=0;
    const dog=Core.chooseDog(state,()=>call++===0?0.99:(i+.5)/(legends.length+1));
    assert.equal(dog.rarity,'legendary');
    counts[dog.id]=(counts[dog.id]||0)+1;
  }
  for(const dog of legends) assert.equal(counts[dog.id],dog.featured?2:1);
});

test('saving and loading preserves progress and rejects invalid values', () => {
  const state=Core.freshState();
  state.coins=456;active(state).speed=3;active(state).luck=2;
  Core.awardDog(state,dogs.at(-1));
  assert.deepEqual(Core.validateState(JSON.parse(JSON.stringify(state))),state);
  const malformed={version:1,coins:-50,luck:900,speed:NaN,rolls:Infinity,pityRare:55,pityLegendary:-1,owned:{[dogs[0].id]:2.9,missing:5},lastId:'toString'};
  const recovered=Core.validateState(malformed);
  assert.equal(recovered.coins,0);
  assert.equal(active(recovered).luck,Core.MAX_LUCK);
  assert.equal(active(recovered).speed,0);
  assert.equal(active(recovered).rolls,0);
  assert.equal(active(recovered).lastId,dogs[0].id);
  assert.deepEqual(active(recovered).owned,{[dogs[0].id]:2});
  assert.deepEqual(Core.validateState(null),Core.freshState());
});

test('each speed upgrade shortens the reveal without going below 400ms', () => {
  let previous=Infinity;
  for(let level=0;level<=Core.MAX_SPEED;level++) {
    const duration=Core.rollDuration(level);
    assert.ok(duration<previous);
    assert.ok(duration>=400);
    previous=duration;
  }
});

test('only new Secret-tier discoveries add a grand opening; duplicates open at normal speed', () => {
  let previous=Infinity;
  for(let speed=0;speed<=Core.MAX_SPEED;speed++) {
    const usual=Core.rollDuration(speed);
    for(const rarity of rarities.filter(r=>r.id!=='secret'))assert.equal(Core.openingDuration(speed,rarity.id),usual);
    const grand=Core.openingDuration(speed,'secret');
    assert.equal(grand-usual,2800);
    assert.ok(grand<previous);
    assert.equal(Core.openingDuration(speed,'secret',true),usual);
    assert.equal(Core.openingDuration(speed,'secret',false,false),usual);
    assert.equal(Core.openingDuration(speed,'secret',true,false),usual);
    previous=grand;
  }
});

test('every dog has distinct pixel artwork, not just a different label', () => {
  const images=new Map();
  for(const dog of dogs) {
    const svg=DogClubArt.makeDogSVG(dog);
    assert.match(svg,/viewBox="0 0 80 80"/);
    const artwork=svg.slice(svg.indexOf('<rect'));
    const hash=createHash('sha256').update(artwork).digest('hex');
    assert.ok(!images.has(hash),`${dog.name} has the same art as ${images.get(hash)}`);
    images.set(hash,dog.name);
  }
});

test('only the final secret dog unlocks rebirth, even without the other seven secrets', () => {
  const state=Core.freshState();
  state.coins=50000;
  const secrets=dogs.filter(d=>d.secret);
  const finalSecret=secrets.at(-1);
  assert.equal(finalSecret.name,'Origami Oracle');
  for(const dog of secrets.slice(0,-1))active(state).owned[dog.id]=1;
  assert.equal(Core.rebirthUnlocked(state),false);
  assert.equal(Core.rebirthToCats(state),false);
  active(state).owned[finalSecret.id]=1;
  assert.equal(Core.rebirthUnlocked(state),true);
  active(state).owned={ [dogs[0].id]:1,[finalSecret.id]:1 };
  assert.equal(Core.rebirthUnlocked(state),true);
  state.coins=9999;
  const before=JSON.stringify(state);
  assert.equal(Core.rebirthToCats(state),false);
  assert.equal(JSON.stringify(state),before);
});

test('rebirth charges exactly 10,000 once, retains dogs, and starts separate cat progress', () => {
  const state=Core.freshState();
  active(state).owned[dogs.filter(d=>d.secret).at(-1).id]=2;
  state.coins=10500;active(state).luck=10;active(state).speed=8;active(state).rolls=240;active(state).pityRare=19;active(state).pityLegendary=79;
  const dogProgress=JSON.parse(JSON.stringify(active(state)));
  const archive={...active(state).owned};
  assert.equal(Core.rebirthToCats(state),true);
  assert.equal(state.coins,500);
  assert.equal(state.chapter,'cats');
  assert.deepEqual(state.animals.dogs.owned,archive);
  assert.deepEqual(state.animals.dogs,dogProgress);
  assert.equal(active(state).luck,0);assert.equal(active(state).speed,0);assert.equal(active(state).rolls,0);
  assert.equal(active(state).pityRare,0);assert.equal(active(state).pityLegendary,0);
  assert.deepEqual(Object.keys(active(state).owned),[CatClubData.cats[0].id]);
  assert.equal(Core.rebirthUnlocked(state),false);
  const after=JSON.stringify(state);
  assert.equal(Core.rebirthToCats(state),false);
  assert.equal(JSON.stringify(state),after);
  assert.deepEqual(Core.validateState(JSON.parse(after)),state);
});

test('existing dog saves migrate without losing coins, upgrades, or discoveries', () => {
  const legacy={version:1,coins:23456,luck:4,speed:3,rolls:62,pityRare:7,pityLegendary:41,owned:{'dog-001':1,[dogs[20].id]:3},lastId:dogs[20].id};
  const migrated=Core.validateState(JSON.parse(JSON.stringify(legacy)));
  assert.equal(migrated.version,2);
  assert.equal(migrated.chapter,'dogs');
  assert.equal(migrated.catsUnlocked,false);
  assert.equal(migrated.catUnlockNotified,false);
  assert.equal(migrated.coins,23456);
  for(const key of ['luck','speed','rolls','pityRare','pityLegendary','owned','lastId'])assert.deepEqual(active(migrated)[key],legacy[key]);
});

test('existing cat saves preserve their cat upgrades and dog collection', () => {
  const legacy={version:1,chapter:'cats',catUnlockNotified:true,coins:1205,luck:8,speed:6,rolls:88,pityRare:13,pityLegendary:19,owned:{'cat-001':2,'cat-012':3},lastId:'cat-012',dogAlbum:{'dog-001':6,'dog-120':1}};
  const migrated=Core.validateState(legacy);
  assert.equal(migrated.chapter,'cats');assert.equal(migrated.catsUnlocked,true);assert.equal(migrated.coins,1205);
  assert.deepEqual(migrated.animals.dogs.owned,legacy.dogAlbum);
  for(const key of ['luck','speed','rolls','pityRare','pityLegendary','owned','lastId'])assert.deepEqual(active(migrated)[key],legacy[key]);
  assert.equal(migrated.animals.dogs.luck,0);
  assert.equal(Core.switchAnimal(migrated,'dogs'),true);assert.equal(Core.switchAnimal(migrated,'cats'),true);
  assert.equal(active(migrated).luck,8);
});

test('the cat-level notification is remembered after saving and rebirth', () => {
  const state=Core.freshState();
  Core.awardDog(state,dogs.filter(d=>d.secret).at(-1));
  assert.equal(state.catUnlockNotified,false);
  state.catUnlockNotified=true;
  assert.equal(Core.validateState(JSON.parse(JSON.stringify(state))).catUnlockNotified,true);
  state.coins=10000;
  Core.rebirthToCats(state);
  assert.equal(state.catUnlockNotified,true);
  assert.equal(Core.validateState(JSON.parse(JSON.stringify(state))).catUnlockNotified,true);
});

test('cat rolls use the cat roster, award coins, and leave dog progress intact', () => {
  const state=Core.freshState();
  dogs.filter(d=>d.secret).forEach(d=>{active(state).owned[d.id]=1;});
  state.coins=10000;Core.rebirthToCats(state);
  const archive=JSON.stringify(state.animals.dogs.owned);
  assert.equal(Core.catalog(state).length,48);
  assert.equal(Core.awardDog(state,dogs[0]),null);
  for(let i=0;i<100;i++) {
    const cat=Core.chooseDog(state);
    assert.ok(cat.id.startsWith('cat-'));
    assert.ok(Core.awardDog(state,cat).reward>0);
  }
  assert.equal(JSON.stringify(state.animals.dogs.owned),archive);
  assert.deepEqual(Core.validateState(JSON.parse(JSON.stringify(state))),state);
});

test('the cat chapter has a full rarity pool, eight secrets, and distinct pixel artwork', () => {
  const cats=CatClubData.cats,images=new Map();
  assert.equal(cats.length,48);
  assert.equal(cats.filter(c=>c.secret).length,8);
  for(const rarity of rarities)assert.ok(cats.some(c=>c.rarity===rarity.id));
  for(const cat of cats) {
    const svg=CatClubArt.makeCatSVG(cat);
    const hash=createHash('sha256').update(svg.slice(svg.indexOf('<rect'))).digest('hex');
    assert.ok(!images.has(hash),`${cat.name} matches ${images.get(hash)}`);
    images.set(hash,cat.name);
  }
});
test('cats cannot be selected until unlocked and invalid selections change nothing', () => {
  const state=Core.freshState(),before=JSON.stringify(state);
  for(const selection of ['cats','birds','dogs','__proto__'])assert.equal(Core.switchAnimal(state,selection),false);
  assert.equal(JSON.stringify(state),before);
});

test('switching preserves independent upgrades, pity, discoveries and equipped pets', () => {
  const state=Core.freshState();state.coins=50000;
  Object.assign(active(state),{luck:10,speed:8,pityRare:19,pityLegendary:45,rolls:100});
  active(state).owned['dog-120']=1;Core.rebirthToCats(state);
  assert.equal(Core.buyUpgrade(state,'luck'),true);assert.equal(Core.buyUpgrade(state,'speed'),true);
  active(state).pityRare=19;assert.equal(Core.minimumRarity(state),3);
  Core.awardDog(state,Core.chooseDog(state,()=>0));
  const catProgress=JSON.stringify(active(state));
  assert.equal(Core.switchAnimal(state,'dogs'),true);assert.equal(Core.minimumRarity(state),4);
  assert.equal(active(state).luck,10);assert.equal(active(state).speed,8);assert.equal(active(state).rolls,100);assert.equal(active(state).lastId,'dog-001');
  assert.equal(Core.awardDog(state,CatClubData.cats[0]),null);
  const before=state.coins;assert.equal(Core.buyUpgrade(state,'speed'),false);assert.equal(state.coins,before);
  const dogProgress=JSON.stringify(active(state));
  for(let i=0;i<4;i++){
    assert.equal(Core.switchAnimal(state,'cats'),true);assert.equal(JSON.stringify(active(state)),catProgress);
    assert.equal(Core.switchAnimal(state,'dogs'),true);assert.equal(JSON.stringify(active(state)),dogProgress);
  }
  assert.equal(state.coins,before);assert.equal(Core.rebirthUnlocked(state),false);assert.equal(Core.rebirthToCats(state),false);
  assert.deepEqual(Core.validateState(JSON.parse(JSON.stringify(state))),state);
});

test('buying upgrades uses shared coins and affects only the selected animal', () => {
  const state=Core.freshState();active(state).owned['dog-120']=1;state.coins=20000;
  Core.buyUpgrade(state,'luck');Core.rebirthToCats(state);
  let before=state.coins;Core.buyUpgrade(state,'luck');assert.equal(state.coins,before-60);
  Core.buyUpgrade(state,'luck');Core.buyUpgrade(state,'speed');
  assert.equal(active(state).luck,2);assert.equal(active(state).speed,1);
  Core.switchAnimal(state,'dogs');assert.equal(active(state).luck,1);assert.equal(active(state).speed,0);
  before=state.coins;Core.buyUpgrade(state,'speed');assert.equal(state.coins,before-40);
  Core.switchAnimal(state,'cats');assert.equal(active(state).speed,1);
});

test('version-two validation keeps cat access gated by the final secret', () => {
  const state=Core.freshState();state.catsUnlocked=true;state.chapter='cats';state.animals.cats={luck:10,owned:{'cat-001':1}};
  const restored=Core.validateState(state);
  assert.equal(restored.chapter,'dogs');assert.equal(restored.catsUnlocked,false);assert.equal(restored.animals.cats,null);
});

function completeCollection() {
  const state=Core.freshState();
  state.animals.dogs.owned=Object.fromEntries(dogs.map(pet=>[pet.id,1]));
  state.coins=Core.REBIRTH_COST;Core.rebirthToCats(state);
  state.animals.cats.owned=Object.fromEntries(CatClubData.cats.map(pet=>[pet.id,1]));
  return state;
}

function spriteSilhouette(pet) {
  const pixels=new Set(),svg=PetSpriteArt.makePetSVG(pet,pet.species||'dogs');
  for(const run of svg.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="1"/g))
    for(let x=Number(run[1]);x<Number(run[1])+Number(run[3]);x++)pixels.add(Number(run[2])*80+x);
  return pixels;
}

test('regular breeds vary in silhouette even when all coat colors are ignored', () => {
  for(const [list,minimum]of [[dogs,60],[CatClubData.cats,20]]){
    const regular=list.filter(pet=>!['secret','legendary'].includes(pet.rarity));
    const silhouettes=new Set(regular.map(pet=>[...spriteSilhouette(pet)].sort((a,b)=>a-b).join(',')));
    assert.ok(silhouettes.size>=minimum,`${silhouettes.size} distinct shapes for ${regular.length} breeds`);
  }
});

test('secret compositions differ substantially in silhouette, not only in color', () => {
  const secrets=[...dogs,...CatClubData.cats].filter(pet=>pet.secret),masks=secrets.map(spriteSilhouette);
  for(let i=0;i<secrets.length;i++)for(let j=i+1;j<secrets.length;j++){
    const intersection=[...masks[i]].filter(pixel=>masks[j].has(pixel)).length;
    const overlap=intersection/(masks[i].size+masks[j].size-intersection);
    assert.ok(overlap<.9,`${secrets[i].name} and ${secrets[j].name} are too similar (${overlap})`);
  }
});

test('every Legendary has a distinct silhouette', () => {
  const legends=[...dogs,...CatClubData.cats].filter(pet=>pet.rarity==='legendary');
  const silhouettes=legends.map(pet=>[...spriteSilhouette(pet)].sort((a,b)=>a-b).join(','));
  assert.equal(new Set(silhouettes).size,legends.length);
});

test('finishing requires every real and secret breed from both animals', () => {
  const fresh=Core.freshState();fresh.coins=100000;
  assert.equal(Core.finishUnlocked(fresh),false);assert.equal(Core.finishGame(fresh),false);
  for(const chapter of ['dogs','cats']){
    const state=completeCollection();state.coins=100000;
    assert.equal(Core.finishUnlocked(state),true);
    const list=Core.catalog(state,chapter);
    for(const pet of [list[1],list.at(-1)]){
      delete state.animals[chapter].owned[pet.id];
      state.animals[chapter].owned['made-up-id']=99;
      assert.equal(Core.finishUnlocked(state),false);
      const before=JSON.stringify(state);assert.equal(Core.finishGame(state),false);assert.equal(JSON.stringify(state),before);
      state.animals[chapter].owned[pet.id]=1;
    }
  }
});

test('the last discovery unlocks finishing regardless of the selected animal', () => {
  for(const chapter of ['dogs','cats']){
    const state=completeCollection();Core.switchAnimal(state,chapter);
    const missing=Core.catalog(state).at(-1);delete active(state).owned[missing.id];
    assert.equal(Core.finishUnlocked(state),false);
    Core.awardDog(state,missing);
    assert.equal(Core.finishUnlocked(state),true);
  }
});

test('finishing charges exactly 20,000 once and preserves collections and upgrades', () => {
  const state=completeCollection();state.coins=Core.FINISH_COST-1;
  Object.assign(state.animals.dogs,{luck:8,speed:6});Object.assign(state.animals.cats,{luck:4,speed:2});
  const before=JSON.stringify(state);assert.equal(Core.finishGame(state),false);assert.equal(JSON.stringify(state),before);
  state.coins=Core.FINISH_COST+123;const animals=JSON.stringify(state.animals);
  assert.equal(Core.finishGame(state),true);assert.equal(state.coins,123);assert.equal(state.gameCompleted,true);
  assert.equal(JSON.stringify(state.animals),animals);assert.equal(Core.finishUnlocked(state),false);
  assert.equal(Core.finishGame(state),false);assert.equal(state.coins,123);
  assert.equal(Core.switchAnimal(state,'dogs'),true);
  assert.deepEqual(Core.validateState(JSON.parse(JSON.stringify(state))),state);
});

test('older saves default to unfinished and invalid completion flags are rejected', () => {
  const old=completeCollection();delete old.gameCompleted;
  const migrated=Core.validateState(old);
  assert.equal(migrated.gameCompleted,false);assert.equal(Core.finishUnlocked(migrated),true);
  migrated.gameCompleted=true;delete migrated.animals.cats.owned['cat-048'];
  assert.equal(Core.validateState(migrated).gameCompleted,false);
  const fresh=Core.freshState();fresh.gameCompleted=true;
  assert.equal(Core.validateState(fresh).gameCompleted,false);
});

