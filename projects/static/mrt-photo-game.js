(() => {
  'use strict';
  const Core=MRTPhotoCore,KEY='yjh.sgmrt.photos.v1';
  const $=id=>document.getElementById(id);
  const input=$('station-guess'),options=$('station-options'),form=$('guess-form');
  let catalog=null,stored={daily:{},endless:null,mode:'daily'},daily=null,endless=null,dateKey='',mode='daily';
  let selectedId=null,matches=[],activeIndex=-1,photoReady=false,rolloverTimer=0;
  const preloaded=new Set();
  try{
    const parsed=JSON.parse(localStorage.getItem(KEY));
    if(parsed&&typeof parsed==='object')stored={daily:parsed.daily&&typeof parsed.daily==='object'?parsed.daily:{},endless:parsed.endless,mode:parsed.mode==='endless'?'endless':'daily'};
  }catch{}
  const requested=new URLSearchParams(location.search).get('mode');
  mode=requested==='daily'||requested==='endless'?requested:stored.mode;

  function save(){
    stored.mode=mode;stored.daily[dateKey]=daily;stored.endless=endless;
    const keep=Object.keys(stored.daily).filter(key=>/^\d{4}-\d{2}-\d{2}$/.test(key)).sort().slice(-30);
    stored.daily=Object.fromEntries(keep.map(key=>[key,stored.daily[key]]));
    try{localStorage.setItem(KEY,JSON.stringify(stored));$('save-note').textContent='';}
    catch{$('save-note').textContent='Progress is kept for this session; device storage is unavailable.';}
  }
  function feedback(text,tone=''){$('guess-status').textContent=text;$('guess-status').dataset.tone=tone;}
  function isFinished(){return mode==='daily'?Core.dailyStatus(daily,catalog).finished:endless.index>=endless.order.length||endless.answers.length>endless.index;}
  function updateSubmit(){$('submit-guess').disabled=!selectedId||isFinished()||!photoReady;}
  function closeOptions(){options.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');activeIndex=-1;}
  function choose(station){selectedId=station.id;input.value=station.name;closeOptions();updateSubmit();input.focus();}
  function highlight(){
    [...options.children].forEach((option,index)=>option.setAttribute('aria-selected',String(index===activeIndex)));
    if(activeIndex>=0){const option=options.children[activeIndex];input.setAttribute('aria-activedescendant',option.id);option.scrollIntoView({block:'nearest'});}
  }
  function listSuggestions(){
    matches=Core.suggestions(catalog.stations,input.value);options.replaceChildren();activeIndex=-1;
    for(const station of matches){
      const option=document.createElement('li');option.id='option-'+station.id;option.setAttribute('role','option');option.setAttribute('aria-selected','false');
      const name=document.createElement('span');name.textContent=station.name;
      const code=document.createElement('small');code.textContent=station.code;option.append(name,code);
      option.addEventListener('pointerdown',event=>event.preventDefault());option.addEventListener('click',()=>choose(station));options.append(option);
    }
    options.hidden=matches.length===0;input.setAttribute('aria-expanded',String(!options.hidden));input.removeAttribute('aria-activedescendant');
  }
  input.addEventListener('input',()=>{
    selectedId=null;
    const exact=catalog.stations.find(station=>Core.normalize(station.name)===Core.normalize(input.value));
    if(exact)selectedId=exact.id;
    listSuggestions();updateSubmit();
  });
  input.addEventListener('focus',()=>{if(catalog&&!input.disabled&&input.value)listSuggestions();});
  input.addEventListener('keydown',event=>{
    if(event.key==='Escape'){closeOptions();return;}
    if(['ArrowDown','ArrowUp'].includes(event.key)){
      event.preventDefault();if(options.hidden)listSuggestions();if(!matches.length)return;
      activeIndex=event.key==='ArrowDown'?(activeIndex+1)%matches.length:(activeIndex<=0?matches.length-1:activeIndex-1);highlight();
    }else if(event.key==='Enter'&&!options.hidden&&matches.length){event.preventDefault();choose(matches[Math.max(0,activeIndex)]);}
  });
  input.addEventListener('blur',()=>setTimeout(()=>{if(document.activeElement!==input)closeOptions();},150));
  document.addEventListener('pointerdown',event=>{if(!event.target.closest('.combobox-wrap'))closeOptions();});

  function preloadNext(){
    if(mode!=='endless'||endless.index+1>=endless.order.length)return;
    const next=Core.photoFor(catalog,endless.order[endless.index+1]);
    if(preloaded.has(next.id))return;preloaded.add(next.id);
    const preview=new Image();preview.decoding='async';preview.src=next.src;
  }
  function layoutPhoto(){
    if(!catalog||!photoReady)return;
    const image=$('station-photo'),frame=image.closest('.photo-frame'),photo=Core.photoFor(catalog,image.dataset.photoId);
    const layout=Core.photoLayout(image.naturalWidth,image.naturalHeight,frame.clientWidth,frame.clientHeight,photo.crop);
    if(!layout)return;
    Object.assign($('photo-window').style,{width:layout.width+'px',height:layout.height+'px'});
    Object.assign(image.style,{width:layout.imageWidth+'px',height:layout.imageHeight+'px',left:layout.left+'px',top:layout.top+'px'});
  }
  new ResizeObserver(layoutPhoto).observe(input.closest('.photo-layout').querySelector('.photo-frame'));
  function setPhoto(photo,revealed){
    const station=Core.stationFor(catalog,photo.stationId),image=$('station-photo');
    image.alt=revealed?`${station.name} MRT station`:'A Singapore MRT station to identify';
    $('photo-author').textContent='Photo: '+photo.credit.author;
    $('photo-view-note').hidden=!photo.crop;
    $('photo-license').textContent=photo.credit.license;$('photo-license').href=photo.credit.licenseUrl;
    $('photo-source').href=photo.credit.sourceUrl;
    $('photo-source').title=revealed?photo.credit.title:'View the original photo and attribution';
    if(image.dataset.photoId===photo.id){preloadNext();return;}
    image.dataset.photoId=photo.id;photoReady=false;image.hidden=true;$('photo-window').style.width='0px';$('photo-window').style.height='0px';$('photo-loading').hidden=false;$('image-error').hidden=true;
    image.onload=()=>{photoReady=true;layoutPhoto();image.hidden=false;$('photo-loading').hidden=true;$('image-error').hidden=true;updateSubmit();preloadNext();};
    image.onerror=()=>{photoReady=false;image.hidden=true;$('photo-loading').hidden=true;$('image-error').hidden=false;updateSubmit();};
    image.src=photo.src;
  }
  $('retry-image').addEventListener('click',()=>{const image=$('station-photo');const photo=Core.photoFor(catalog,image.dataset.photoId);delete image.dataset.photoId;setPhoto(photo,isFinished());});

  function render(){
    if(!catalog)return;
    selectedId=null;input.value='';closeOptions();
    document.querySelectorAll('[data-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===mode)));
    const isDaily=mode==='daily',status=isDaily?Core.dailyStatus(daily,catalog):null;
    const complete=!isDaily&&endless.index>=endless.order.length;
    const record=!isDaily?endless.answers[endless.index]:null;
    const revealed=isDaily?status.finished:Boolean(record)||complete;
    const photo=Core.photoFor(catalog,isDaily?daily.photoId:endless.order[Math.min(endless.index,endless.order.length-1)]);
    const station=Core.stationFor(catalog,photo.stationId),score=!isDaily?Core.score(endless):null;
    $('round-label').textContent=isDaily?new Intl.DateTimeFormat('en-SG',{day:'numeric',month:'short',year:'numeric',timeZone:Core.TIME_ZONE}).format(new Date(dateKey+'T12:00:00+08:00'))+' · Daily':'Endless · '+score.correct+' correct';
    $('round-count').textContent=isDaily?`${daily.guesses.length} / ${Core.DAILY_GUESSES} guesses`:`Photo ${Math.min(endless.index+1,endless.order.length)} / ${endless.order.length}`;
    $('question-title').textContent=complete?'Run complete!':'Which MRT station is this?';
    const rules=$('round-rules');
    if(rules)rules.textContent=isDaily?'One station for everyone. Six guesses to find it.':complete?`You went through all ${score.total} station photos.`:'One guess per photo. Skip a station if you don’t know it.';
    form.hidden=complete;input.disabled=revealed;
    $('skip-photo').hidden=isDaily;$('skip-photo').disabled=revealed;
    $('next-photo').hidden=isDaily||!record||complete;
    $('next-photo').textContent=endless.index===endless.order.length-1?'See score →':'Next photo →';
    $('station-reveal').hidden=!revealed||complete;
    $('reveal-label').textContent=isDaily?(status.won?'YOU GOT IT':'TODAY’S STATION'):record?.skipped?'SKIPPED':record?.correct?'CORRECT':'THE STATION WAS';
    $('answer-name').textContent=station.name;$('answer-code').textContent=station.code;
    $('guess-history').replaceChildren();$('guess-history').hidden=!isDaily;
    if(isDaily)for(const id of daily.guesses){
      const guess=Core.stationFor(catalog,id),correct=id===photo.stationId,li=document.createElement('li'),name=document.createElement('span'),mark=document.createElement('small');
      li.classList.toggle('correct',correct);name.textContent=guess.name;mark.textContent=correct?'Correct ✓':'Incorrect';li.append(name,mark);$('guess-history').prepend(li);
    }
    $('run-summary').hidden=!complete;$('restart-endless').hidden=!complete;
    if(complete){$('summary-correct').textContent=score.correct;$('summary-wrong').textContent=score.wrong;$('summary-skipped').textContent=score.skipped;}
    $('mode-footnote').textContent=isDaily?status.finished?'Your result is saved. The next station arrives at 00:00 Singapore time.':`Daily changes at midnight Singapore time. Pool: ${new Set(catalog.photos.map(p=>p.stationId)).size} stations · ${catalog.photos.length} photos.`:complete?'Every photo seen. Start a new run for a fresh shuffle.':`${score.correct} correct · ${score.wrong} incorrect · ${score.skipped} skipped. Each photo appears once per run.`;
    if(isDaily)feedback(status.won?'Correct! Nicely spotted.':status.finished?'No guesses left. Here’s today’s station.':daily.guesses.length?`Not quite. ${status.remaining} ${status.remaining===1?'guess':'guesses'} left.`:'',status.won?'correct':daily.guesses.length?'wrong':'');
    else feedback(complete?`${score.correct} out of ${score.total} correct.`:record?record.skipped?'Skipped. Ready for the next station?':record.correct?'That’s right!':'Not this time. Here’s the answer.':'',record?.correct?'correct':record&&!record.skipped?'wrong':'');
    setPhoto(photo,revealed);updateSubmit();
  }

  function checkDate(){
    if(!catalog)return false;
    const now=Core.singaporeDate();
    if(now===dateKey)return false;
    dateKey=now;daily=Core.restoreDaily(stored.daily[dateKey],dateKey,catalog);save();
    const showingDaily=mode==='daily';if(showingDaily)render();scheduleMidnight();return showingDaily;
  }
  function scheduleMidnight(){
    clearTimeout(rolloverTimer);
    const next=Date.parse(dateKey+'T00:00:00+08:00')+86400000;
    rolloverTimer=setTimeout(()=>{checkDate();scheduleMidnight();},Math.max(1000,next-Date.now()+100));
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkDate();});
  form.addEventListener('submit',event=>{
    event.preventDefault();if(checkDate()){feedback('A new daily station is ready.');return;}
    if(!selectedId||!photoReady){feedback('Choose a station from the suggestions.');return;}
    const result=mode==='daily'?Core.guessDaily(daily,selectedId,catalog):Core.answerEndless(endless,selectedId,catalog);
    if(!result.accepted){feedback(result.reason==='duplicate'?'You already guessed that station. Try another.':'This photo has already been answered.');return;}
    save();render();
  });
  $('skip-photo').addEventListener('click',()=>{if(mode!=='endless')return;if(Core.answerEndless(endless,null,catalog,true).accepted){save();render();}});
  $('next-photo').addEventListener('click',()=>{if(mode==='endless'&&Core.nextEndless(endless)){save();render();if(!input.disabled)input.focus();}});
  $('restart-endless').addEventListener('click',()=>{endless=Core.newEndless(catalog);save();render();});
  document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{
    if(!catalog)return;checkDate();mode=button.dataset.mode;
    const url=new URL(location.href);url.searchParams.set('mode',mode);history.replaceState(null,'',url);save();render();
  }));
  window.addEventListener('storage',event=>{
    if(event.key!==KEY||!catalog||!event.newValue)return;
    try{const value=JSON.parse(event.newValue);stored.daily=value.daily||{};daily=Core.restoreDaily(stored.daily[dateKey],dateKey,catalog);endless=Core.restoreEndless(value.endless,catalog);render();}catch{}
  });

  function validCatalog(value){
    if(value?.version!==1||!Array.isArray(value.stations)||!Array.isArray(value.photos)||value.photos.length<2)throw new Error('Invalid photo collection');
    const ids=new Set(value.stations.map(s=>s.id));
    if(ids.size!==value.stations.length||new Set(value.photos.map(p=>p.id)).size!==value.photos.length||new Set(value.photos.map(p=>p.stationId)).size<2)throw new Error('Invalid station/photo identifiers');
    for(const photo of value.photos){
      if(photo.crop&&!Core.validCrop(photo.crop))throw new Error('Invalid photo crop');
      if(!ids.has(photo.stationId)||!/^static\/mrt-photos\/[a-z0-9][a-z0-9._-]*\.(?:jpe?g|png|webp)$/i.test(photo.src)||!photo.credit||!photo.credit.author||!photo.credit.license||!['sourceUrl','licenseUrl'].every(key=>/^https:\/\//.test(photo.credit[key])))throw new Error('Invalid photo metadata');
    }
    return value;
  }
  async function load(){
    $('load-error').hidden=true;$('initial-loading').hidden=false;
    try{
      const response=await fetch('static/mrt-photos/manifest.json');if(!response.ok)throw new Error('Photo collection unavailable');
      catalog=validCatalog(await response.json());dateKey=Core.singaporeDate();
      daily=Core.restoreDaily(stored.daily[dateKey],dateKey,catalog);endless=Core.restoreEndless(stored.endless,catalog);
      $('initial-loading').hidden=true;$('photo-layout').hidden=false;save();render();scheduleMidnight();
    }catch(error){console.error('Photo quiz failed to load',error);$('initial-loading').hidden=true;$('photo-layout').hidden=true;$('load-error').hidden=false;}
  }
  $('retry-catalog').addEventListener('click',load);
  load();
})();
