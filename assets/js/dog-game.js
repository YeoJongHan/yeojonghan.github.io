/* Version-two saves retain a separate progression record for each animal. */
(() => {
  'use strict';
  const {dogs,rarities} = globalThis.DogClubData;
  const {cats} = globalThis.CatClubData;
  const MAX_LUCK=10,MAX_SPEED=8,REBIRTH_COST=10000,FINISH_COST=20000,SECRET_OPENING_MS=2800;
  const integer=(value,max=1e9)=>Number.isFinite(value)?Math.min(max,Math.max(0,Math.floor(value))):0;
  const listFor=chapter=>chapter==='cats'?cats:dogs;
  const catalog=(state,chapter=state.chapter)=>listFor(chapter);
  const active=state=>state.animals[state.chapter];
  const progressFor=(state,chapter=state.chapter)=>state.animals[chapter];
  const finalSecretDog=dogs.filter(dog=>dog.secret).at(-1);
  const hasFinalDogSecret=owned=>Object.hasOwn(owned,finalSecretDog.id)&&owned[finalSecretDog.id]>0;

  function freshProgress(chapter) {
    const first=listFor(chapter)[0];
    return {luck:0,speed:0,rolls:0,pityRare:0,pityLegendary:0,owned:{[first.id]:1},lastId:first.id};
  }
  function freshState() {
    return {version:2,chapter:'dogs',catsUnlocked:false,catUnlockNotified:false,gameCompleted:false,coins:30,animals:{dogs:freshProgress('dogs'),cats:null}};
  }
  function sanitizeAlbum(value,list) {
    const album={};
    if(!value||typeof value!=='object'||Array.isArray(value))return album;
    for(const pet of list){const count=integer(value[pet.id],1e7);if(count)album[pet.id]=count;}
    return album;
  }
  function sanitizeProgress(value,chapter) {
    const source=value&&typeof value==='object'?value:{};
    const list=listFor(chapter),owned=sanitizeAlbum(source.owned,list);
    if(!Object.keys(owned).length)return freshProgress(chapter);
    return {luck:integer(source.luck,MAX_LUCK),speed:integer(source.speed,MAX_SPEED),rolls:integer(source.rolls),pityRare:integer(source.pityRare,19),pityLegendary:integer(source.pityLegendary,79),owned,lastId:Object.hasOwn(owned,source.lastId)?source.lastId:Object.keys(owned)[0]};
  }
  function validateState(value) {
    if(!value||typeof value!=='object')return freshState();
    if(value.version===2&&value.animals&&typeof value.animals==='object'){
      const dogProgress=sanitizeProgress(value.animals.dogs,'dogs');
      const catsUnlocked=value.catsUnlocked===true&&hasFinalDogSecret(dogProgress.owned);
      const state={version:2,chapter:value.chapter==='cats'&&catsUnlocked?'cats':'dogs',catsUnlocked,catUnlockNotified:value.catUnlockNotified===true,gameCompleted:false,coins:integer(value.coins,1e12),animals:{dogs:dogProgress,cats:catsUnlocked?sanitizeProgress(value.animals.cats,'cats'):null}};
      state.gameCompleted=value.gameCompleted===true&&allBreedsDiscovered(state);
      return state;
    }
    if(value.version!==1||!value.owned||typeof value.owned!=='object'||Array.isArray(value.owned))return freshState();
    const archive=sanitizeAlbum(value.dogAlbum,dogs);
    const wasCats=value.chapter==='cats'&&hasFinalDogSecret(archive);
    return {version:2,chapter:wasCats?'cats':'dogs',catsUnlocked:wasCats,catUnlockNotified:value.catUnlockNotified===true,gameCompleted:false,coins:integer(value.coins,1e12),animals:{dogs:wasCats?sanitizeProgress({owned:archive},'dogs'):sanitizeProgress(value,'dogs'),cats:wasCats?sanitizeProgress(value,'cats'):null}};
  }
  function odds(luck=0,minimum=0) {
    const factor=1+integer(luck,MAX_LUCK)*.11;
    const weights=rarities.map((rarity,index)=>index<minimum?0:rarity.weight*factor**index);
    const sum=weights.reduce((a,b)=>a+b,0);return weights.map(value=>value/sum);
  }
  // These helpers also accept a progress record for UI probability previews.
  const record=value=>value.animals?active(value):value;
  const pityTarget=value=>record(value).luck>=MAX_LUCK?4:3;
  function minimumRarity(state) {
    const p=record(state);
    return Math.max(p.pityLegendary>=79?4:0,p.pityRare>=19?pityTarget(p):0);
  }
  function chooseDog(state,random=Math.random) {
    const p=active(state),chances=odds(p.luck,minimumRarity(state));
    let roll=Math.min(.999999999,Math.max(0,random())),tier=chances.length-1;
    for(let i=0;i<chances.length;i++){roll-=chances[i];if(roll<0){tier=i;break;}}
    const pool=catalog(state).filter(pet=>pet.rarity===rarities[tier].id);
    const weighted=pool.flatMap(pet=>pet.featured?[pet,pet]:[pet]);
    return weighted[Math.min(weighted.length-1,Math.floor(random()*weighted.length))];
  }
  function awardDog(state,pet) {
    if(!catalog(state).some(item=>item.id===pet.id))return null;
    const p=active(state),rank=rarities.findIndex(rarity=>rarity.id===pet.rarity),rarity=rarities[rank];
    const isNew=!p.owned[pet.id],reward=rarity.coins+(isNew?rarity.bonus:0);
    state.coins+=reward;p.owned[pet.id]=(p.owned[pet.id]||0)+1;p.lastId=pet.id;p.rolls++;
    p.pityRare=rank>=pityTarget(p)?0:p.pityRare+1;
    p.pityLegendary=rank>=4?0:p.pityLegendary+1;
    return {isNew,reward,rarity};
  }
  function upgradeCost(kind,level) {
    if(!['luck','speed'].includes(kind)||level>=(kind==='luck'?MAX_LUCK:MAX_SPEED))return null;
    return Math.ceil((kind==='luck'?60:40)*1.65**level);
  }
  function buyUpgrade(state,kind) {
    const p=active(state),cost=upgradeCost(kind,p[kind]);
    if(cost===null||state.coins<cost)return false;
    state.coins-=cost;p[kind]++;return true;
  }
  function rebirthUnlocked(state) {return !state.catsUnlocked&&hasFinalDogSecret(state.animals.dogs.owned);}
  function rebirthToCats(state) {
    if(!rebirthUnlocked(state)||state.coins<REBIRTH_COST)return false;
    state.coins-=REBIRTH_COST;state.catsUnlocked=true;state.catUnlockNotified=true;
    state.animals.cats=freshProgress('cats');state.chapter='cats';return true;
  }
  function switchAnimal(state,chapter) {
    if(!['dogs','cats'].includes(chapter)||chapter===state.chapter||(chapter==='cats'&&!state.catsUnlocked))return false;
    if(!state.animals[chapter])return false;
    state.chapter=chapter;return true;
  }
  function allBreedsDiscovered(state) {
    return state.catsUnlocked&&['dogs','cats'].every(chapter=>{
      const owned=state.animals[chapter]?.owned;
      return owned&&listFor(chapter).every(pet=>Object.hasOwn(owned,pet.id)&&owned[pet.id]>0);
    });
  }
  function finishUnlocked(state) {return !state.gameCompleted&&allBreedsDiscovered(state);}
  function finishGame(state) {
    if(!finishUnlocked(state)||state.coins<FINISH_COST)return false;
    state.coins-=FINISH_COST;state.gameCompleted=true;return true;
  }
  function rollDuration(speed){return Math.max(400,Math.round(1800*.82**integer(speed,MAX_SPEED)));}
  function openingDuration(speed,rarity,reducedMotion=false,isNew=true){return rollDuration(speed)+(rarity==='secret'&&isNew&&!reducedMotion?SECRET_OPENING_MS:0);}
  globalThis.DogClubCore=Object.freeze({catalog,active,progressFor,odds,pityTarget,minimumRarity,chooseDog,freshState,validateState,awardDog,upgradeCost,buyUpgrade,rollDuration,openingDuration,rebirthUnlocked,rebirthToCats,switchAnimal,allBreedsDiscovered,finishUnlocked,finishGame,REBIRTH_COST,FINISH_COST,SECRET_OPENING_MS,MAX_LUCK,MAX_SPEED});
})();
