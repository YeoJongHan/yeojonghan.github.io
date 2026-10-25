/* Pure game rules shared by daily and endless station-photo modes. */
(() => {
  'use strict';
  const DAILY_GUESSES=6,TIME_ZONE='Asia/Singapore';
  const normalize=value=>String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  function hash(value){let n=2166136261;for(const c of String(value)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;}
  function random(seed){return()=>{seed|=0;seed=seed+0x6d2b79f5|0;let n=Math.imul(seed^seed>>>15,1|seed);n^=n+Math.imul(n^n>>>7,61|n);return((n^n>>>14)>>>0)/4294967296;};}
  function shuffle(items,rng=Math.random){const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.min(i,Math.max(0,Math.floor(rng()*(i+1))));[result[i],result[j]]=[result[j],result[i]];}return result;}
  function singaporeDate(now=new Date()){
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
    const value=type=>parts.find(p=>p.type===type).value;
    return `${value('year')}-${value('month')}-${value('day')}`;
  }
  function dayNumber(date){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('Invalid date');
    const time=Date.parse(date+'T00:00:00Z');
    if(!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==date)throw new Error('Invalid date');
    return Math.floor(time/86400000);
  }
  function dailyPhoto(photos,date,version=1){
    const ids=[...new Set(photos.map(photo=>photo.stationId))].sort(),n=ids.length,day=dayNumber(date);
    if(n<2)throw new Error('Daily mode needs at least two station photos');
    const pickPhoto=stationId=>{
      const choices=photos.filter(photo=>photo.stationId===stationId).map(photo=>photo.id).sort();
      // Rotate the view each time this station returns in a new daily cycle.
      const visit=Math.floor(day/n),start=hash(`mrt-photo:${version}:${stationId}`);
      return choices[((start+visit)%choices.length+choices.length)%choices.length];
    };
    if(n===2)return pickPhoto(ids[((day%2)+2)%2]);
    const cycle=Math.floor(day/n),offset=((day%n)+n)%n;
    const deck=shuffle(ids,random(hash(`mrt-daily:${version}:${cycle}`)));
    const previous=shuffle(ids,random(hash(`mrt-daily:${version}:${cycle-1}`)));
    // Only swap the first two. The previous cycle's final item is unchanged,
    // so this guarantees no repeated station at a cycle boundary as well.
    if(deck[0]===previous.at(-1))[deck[0],deck[1]]=[deck[1],deck[0]];
    return pickPhoto(deck[offset]);
  }
  const photoFor=(catalog,id)=>catalog.photos.find(photo=>photo.id===id);
  const stationFor=(catalog,id)=>catalog.stations.find(station=>station.id===id);
  function dailyStatus(game,catalog){
    const photo=photoFor(catalog,game.photoId),won=game.guesses.includes(photo.stationId);
    return {won,finished:won||game.guesses.length>=DAILY_GUESSES,remaining:Math.max(0,DAILY_GUESSES-game.guesses.length)};
  }
  function restoreDaily(value,date,catalog){
    const photoId=dailyPhoto(catalog.photos,date,catalog.version),game={date,photoId,guesses:[]};
    if(!value||value.date!==date||value.photoId!==photoId||!Array.isArray(value.guesses))return game;
    for(const id of value.guesses.slice(0,DAILY_GUESSES)){
      if(!stationFor(catalog,id)||game.guesses.includes(id))continue;
      game.guesses.push(id);if(dailyStatus(game,catalog).won)break;
    }
    return game;
  }
  function guessDaily(game,stationId,catalog){
    if(dailyStatus(game,catalog).finished)return {accepted:false,reason:'finished'};
    if(!stationFor(catalog,stationId))return {accepted:false,reason:'invalid'};
    if(game.guesses.includes(stationId))return {accepted:false,reason:'duplicate'};
    game.guesses.push(stationId);
    return {accepted:true,correct:photoFor(catalog,game.photoId).stationId===stationId,...dailyStatus(game,catalog)};
  }
  function newEndless(catalog,rng=Math.random){return {order:shuffle(catalog.photos.map(p=>p.id),rng),index:0,answers:[]};}
  function restoreEndless(value,catalog){
    const ids=new Set(catalog.photos.map(p=>p.id));
    if(!value||!Array.isArray(value.order)||value.order.length!==ids.size||new Set(value.order).size!==ids.size||value.order.some(id=>!ids.has(id))||!Number.isInteger(value.index)||value.index<0||value.index>ids.size||!Array.isArray(value.answers)||value.answers.length<value.index||value.answers.length>Math.min(ids.size,value.index+1))return newEndless(catalog);
    const answers=[];
    for(let i=0;i<value.answers.length;i++){
      const record=value.answers[i],photoId=value.order[i],photo=photoFor(catalog,photoId);
      if(!record||record.photoId!==photoId||typeof record.skipped!=='boolean'||(!record.skipped&&!stationFor(catalog,record.guessId)))return newEndless(catalog);
      const skipped=record.skipped===true,guessId=skipped?null:record.guessId;
      answers.push({photoId,guessId,skipped,correct:!skipped&&guessId===photo.stationId});
    }
    return {order:[...value.order],index:value.index,answers};
  }
  function answerEndless(game,guessId,catalog,skipped=false){
    if(game.index>=game.order.length||game.answers.length!==game.index)return {accepted:false,reason:'finished'};
    if(!skipped&&!stationFor(catalog,guessId))return {accepted:false,reason:'invalid'};
    const photoId=game.order[game.index],correct=!skipped&&photoFor(catalog,photoId).stationId===guessId;
    const answer={photoId,guessId:skipped?null:guessId,skipped,correct};game.answers.push(answer);
    return {accepted:true,...answer};
  }
  function nextEndless(game){if(game.answers.length!==game.index+1||game.index>=game.order.length)return false;game.index++;return true;}
  function score(game){const correct=game.answers.filter(a=>a.correct).length,skipped=game.answers.filter(a=>a.skipped).length;return {correct,skipped,wrong:game.answers.length-correct-skipped,total:game.order.length,answered:game.answers.length};}
  function suggestions(stations,query){const prefix=normalize(query);return prefix?stations.filter(s=>normalize(s.name).startsWith(prefix)||s.code.split('-').some(code=>normalize(code).startsWith(prefix))):[];}
  function validCrop(crop){return crop&&['x','y','width','height'].every(key=>Number.isFinite(crop[key]))&&crop.x>=0&&crop.y>=0&&crop.width>0&&crop.height>0&&crop.x+crop.width<=1.0000001&&crop.y+crop.height<=1.0000001;}
  function photoLayout(imageWidth,imageHeight,frameWidth,frameHeight,crop={x:0,y:0,width:1,height:1}){
    if(!validCrop(crop)||![imageWidth,imageHeight,frameWidth,frameHeight].every(n=>Number.isFinite(n)&&n>0))return null;
    const scale=Math.min(frameWidth/(imageWidth*crop.width),frameHeight/(imageHeight*crop.height));
    return {width:imageWidth*crop.width*scale,height:imageHeight*crop.height*scale,imageWidth:imageWidth*scale,imageHeight:imageHeight*scale,left:-crop.x*imageWidth*scale,top:-crop.y*imageHeight*scale};
  }
  globalThis.MRTPhotoCore=Object.freeze({DAILY_GUESSES,TIME_ZONE,normalize,hash,shuffle,singaporeDate,dayNumber,dailyPhoto,photoFor,stationFor,dailyStatus,restoreDaily,guessDaily,newEndless,restoreEndless,answerEndless,nextEndless,score,suggestions,validCrop,photoLayout});
})();
