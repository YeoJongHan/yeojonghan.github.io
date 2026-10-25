(() => {
  'use strict';
  const {dogs,rarities} = globalThis.DogClubData;
  const Core = globalThis.DogClubCore;
  const rarityMap = new Map(rarities.map(rarity=>[rarity.id,rarity]));
  const roller = document.querySelector('.pet-roller');
  const stage = roller.querySelector('.pet-stage');
  const scene = roller.closest('.scene');
  const sprite = roller.querySelector('.pet-sprite');
  const breedLabel = roller.querySelector('.pet-breed');
  const rewardLabel = roller.querySelector('.pet-reward');
  const rollButton = roller.querySelector('.pet-roll');
  const rollLabel = roller.querySelector('.roll-label');
  const announcement = roller.querySelector('.pet-announcement');
  const dialog = document.querySelector('.collection-dialog');
  const shop = document.querySelector('.upgrade-dialog');
  const rebirthDialog = document.querySelector('.rebirth-dialog');
  const unlockDialog = document.querySelector('.level-unlock-dialog');
  const completionDialog = document.querySelector('.completion-dialog');
  const grid = dialog.querySelector('.collection-grid');
  const search = dialog.querySelector('.collection-search');
  const rarityFilter = dialog.querySelector('.collection-rarity');
  const chapterFilter = dialog.querySelector('.collection-chapter');
  const foundFilter = dialog.querySelector('.owned-filter');
  const upgrades = roller.querySelector('.game-upgrades');
  const upgradeButtons = [...upgrades.querySelectorAll('[data-upgrade]')];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const compact = window.matchMedia('(max-width: 900px), (max-height: 850px)');
  const STORAGE_KEY = 'yjh.good-dog-club.v1';
  const PAGE_SIZE = 24;
  const escape = value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const number = value=>value.toLocaleString('en');
  const art = pet=>pet.species === 'cats' ? CatClubArt.makeCatSVG(pet) : DogClubArt.makeDogSVG(pet);
  let isFresh = true;
  let state;
  let rolling = false;
  let albumPage = 0;
  let revealTimer = 0;
  let coinTimer = 0;
  let pendingPet = null;
  let unlockPending = false;
  let unlockTimer = 0;
  const openingTimers = new Set();

  function scheduleOpening(callback,delay) {
    const timer = window.setTimeout(()=>{openingTimers.delete(timer);callback();},delay);
    openingTimers.add(timer);
  }

  function clearOpeningTimers() {
    openingTimers.forEach(timer=>window.clearTimeout(timer));
    openingTimers.clear();
  }

  function clearSecretPresentation() {
    roller.classList.remove('is-secret-opening','is-secret-reveal');
    delete roller.dataset.openingPhase;
    scene.classList.remove('secret-moment');
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    state = stored ? Core.validateState(JSON.parse(stored)) : Core.freshState();
    isFresh = !stored;
  } catch { state = Core.freshState(); }

  const progress = ()=>Core.active(state);
  const pets = ()=>Core.catalog(state);
  const animal = ()=>state.chapter === 'cats' ? 'cat' : 'dog';
  const currentPet = ()=>pets().find(pet=>pet.id === progress().lastId);

  function save() {
    const status = roller.querySelector('.save-status');
    try {
      localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
      status.textContent = 'Saved on this device';
      status.classList.remove('unsaved');
    } catch {
      status.textContent = 'Session only · saving unavailable';
      status.classList.add('unsaved');
    }
  }

  function configureChapter() {
    const name = animal();
    const featured = pets().find(pet=>pet.featured);
    roller.querySelector('.club-name').textContent = state.chapter === 'cats' ? 'Good Cat Club' : 'Good Dog Club';
    roller.querySelector('.game-rules').textContent = `Every roll is free. Discover a new ${name} for bonus coins; duplicates earn coins too.`;
    roller.querySelector('.featured-rules').textContent = `${featured.name} is featured: twice the weight of another ${name} within the Legendary pool.`;
    dialog.querySelector('#collection-title').textContent = `The ${name} album`;
    search.placeholder = `Find a ${name}…`;
    search.setAttribute('aria-label',`Search ${name} collection`);
    chapterFilter.hidden = !state.catsUnlocked;
    chapterFilter.value = state.chapter;
    roller.querySelector('.species-switch').hidden = !state.catsUnlocked;
    roller.querySelectorAll('[data-roll-species]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.rollSpecies===state.chapter)));
    shop.querySelector('#upgrade-title').textContent = state.chapter === 'cats' ? 'Cat upgrades' : 'Dog upgrades';
    rollLabel.textContent = `Roll a ${name}`;
  }

  function percentage(value) { return `${(value*100).toFixed(value < 0.01 ? 2 : 1)}%`; }
  function pityChance(level) { return Core.odds(level).slice(Core.pityTarget({luck:level})).reduce((sum,value)=>sum+value,0); }

  function renderStats() {
    const list = pets();
    const found = Object.keys(progress().owned).length;
    const secrets = list.filter(pet=>pet.secret && progress().owned[pet.id]).length;
    roller.querySelector('.coin-balance').textContent = number(state.coins);
    roller.querySelector('.coin-wallet').setAttribute('aria-label',`${number(state.coins)} coins`);
    roller.querySelector('.collection-count').textContent = `${found} / ${list.length}`;
    roller.querySelector('.secret-count').textContent = `${secrets} / 8 secrets found`;
    roller.querySelector('.roll-total').textContent = `${number(progress().rolls)} rolls`;
    const pityTier = `${rarities[Core.pityTarget(state)].label}+`;
    const guaranteed = Core.minimumRarity(state);
    roller.querySelector('.pity-label').textContent = guaranteed ? `${rarities[guaranteed].label}+ on your next roll!` : `${pityTier} in ${20-progress().pityRare} rolls`;
    roller.querySelector('.pity-track span').style.width = `${progress().pityRare/20*100}%`;
    roller.querySelector('.roll-timing').textContent = `FREE · ${(Core.rollDuration(progress().speed)/1000).toFixed(1)}s`;
    document.querySelector('.luck-effect').textContent = `${percentage(pityChance(progress().luck))} ${pityTier}`;
    document.querySelector('.speed-effect').textContent = `${(Core.rollDuration(progress().speed)/1000).toFixed(2)}s per roll`;
    shop.querySelector('.shop-balance').textContent = `${number(state.coins)} shared coins · ${animal()} upgrades only`;

    for (const button of upgradeButtons) {
      const kind = button.dataset.upgrade;
      const maximum = kind === 'luck' ? Core.MAX_LUCK : Core.MAX_SPEED;
      const cost = Core.upgradeCost(kind,progress()[kind]);
      document.querySelector(`.${kind}-level`).textContent = `Lv. ${progress()[kind]} / ${maximum}`;
      button.querySelector('.upgrade-price').textContent = cost === null ? 'MAXED' : number(cost);
      button.querySelector('span:last-child').hidden = cost === null;
      button.disabled = rolling || cost === null || state.coins < cost;
      button.setAttribute('aria-label',cost === null ? `${kind} fully upgraded` : `Upgrade ${kind} to level ${progress()[kind]+1} for ${cost} coins. You have ${state.coins}.`);
    }
    const odds = Core.odds(progress().luck,Core.minimumRarity(state));
    roller.querySelector('.odds-list').innerHTML = rarities.map((rarity,index)=>`<div class="odds-row"><span style="color:${rarity.color}">${rarity.label}</span><span>${percentage(odds[index])}</span></div>`).join('');
    const rebirth = roller.querySelector('.rebirth-option');
    rebirth.hidden = !Core.rebirthUnlocked(state);
    rebirth.disabled = rolling || unlockPending || state.coins < Core.REBIRTH_COST;
    rebirth.setAttribute('aria-label',state.coins >= Core.REBIRTH_COST ? 'Rebirth to cats for 10,000 coins' : `Rebirth to cats costs 10,000 coins. Earn ${number(Core.REBIRTH_COST-state.coins)} more.`);
    const finish = roller.querySelector('.finish-option');
    finish.hidden = !state.gameCompleted && !Core.finishUnlocked(state);
    roller.querySelector('.species-label').hidden = !finish.hidden;
    finish.disabled = rolling || unlockPending || (!state.gameCompleted && state.coins < Core.FINISH_COST);
    finish.querySelector('.finish-label').textContent = state.gameCompleted ? 'Game completed' : 'Finish game';
    finish.querySelector('.finish-price').textContent = state.gameCompleted ? 'View ending' : `${number(Core.FINISH_COST)} coins`;
    finish.setAttribute('aria-label',state.gameCompleted ? 'Game completed. View ending.' : state.coins >= Core.FINISH_COST ? 'Finish the game for 20,000 coins' : `Finish game unlocked. Earn ${number(Core.FINISH_COST-state.coins)} more coins to finish.`);
    roller.querySelector('.collection-open').disabled = rolling || unlockPending;
    roller.querySelector('.shop-open').disabled = rolling || unlockPending;
    rollButton.disabled = rolling || unlockPending;
    roller.querySelectorAll('[data-roll-species]').forEach(button=>{button.disabled=rolling||unlockPending;});
  }

  function displayPet(pet,message,isNew=false) {
    const rarity = rarityMap.get(pet.rarity);
    roller.style.setProperty('--rarity',rarity.color);
    stage.dataset.rarity = pet.rarity;
    sprite.innerHTML = art(pet);
    sprite.removeAttribute('aria-hidden');
    breedLabel.textContent = pet.name;
    roller.querySelector('.rarity-badge').textContent = pet.secret ? '✦ Secret discovery' : rarity.label;
    rewardLabel.textContent = message;
    roller.querySelector('.discovery-badge').hidden = !isNew;
    stage.setAttribute('aria-busy','false');
  }

  function finishRoll(pet) {
    const previouslyUnlocked = Core.rebirthUnlocked(state);
    const finaleWasUnlocked = Core.finishUnlocked(state);
    const result = Core.awardDog(state,pet);
    rolling = false;
    roller.classList.remove('is-rolling','is-secret-opening');
    delete roller.dataset.openingPhase;
    rollLabel.textContent = 'Roll again';
    displayPet(pet,`+${number(result.reward)} coins · ${result.isNew ? 'New discovery!' : `A familiar friend. ×${progress().owned[pet.id]}`}`,result.isNew);
    save();
    renderStats();
    clearTimeout(revealTimer);
    clearTimeout(coinTimer);
    const grandReveal = pet.rarity === 'secret' && result.isNew && !motion.matches;
    renderParticles(grandReveal);
    roller.classList.add('is-revealing');
    roller.classList.toggle('is-secret-reveal',grandReveal);
    scene.classList.toggle('secret-moment',grandReveal);
    roller.querySelector('.coin-wallet').classList.add('coin-pop');
    revealTimer = setTimeout(()=>{
      roller.classList.remove('is-revealing');
      clearSecretPresentation();
    },grandReveal ? 2800 : 1200);
    coinTimer = setTimeout(()=>roller.querySelector('.coin-wallet').classList.remove('coin-pop'),450);
    const unlock = !previouslyUnlocked && Core.rebirthUnlocked(state) ? ' Final secret dog discovered! Cat rebirth is now unlocked for 10,000 coins.' : '';
    announcement.textContent = `${result.isNew ? 'New discovery!' : 'You met'} ${pet.name}, ${result.rarity.label}. Earned ${result.reward} coins. ${Object.keys(progress().owned).length} of ${pets().length} companions found.${unlock}`;
    if (!finaleWasUnlocked && Core.finishUnlocked(state)) {
      rewardLabel.textContent = `+${number(result.reward)} coins · All breeds found! Finale unlocked.`;
      announcement.textContent += ' All dogs and cats discovered! Finish game is now unlocked for 20,000 coins.';
    }
    if (unlock) queueCatUnlock(grandReveal ? 1800 : 200);
  }

  function queueCatUnlock(delay=200) {
    if (!Core.rebirthUnlocked(state) || state.catUnlockNotified) return;
    clearTimeout(unlockTimer);
    unlockPending = true;
    renderStats();
    unlockTimer = window.setTimeout(showCatUnlock,delay);
  }

  function showCatUnlock() {
    unlockTimer = 0;
    if (!Core.rebirthUnlocked(state) || state.catUnlockNotified) {
      unlockPending = false;
      renderStats();
      return;
    }
    if (rolling || document.querySelector('dialog[open]')) {
      unlockTimer = window.setTimeout(showCatUnlock,250);
      return;
    }
    unlockPending = false;
    unlockDialog.querySelector('.level-unlock-art').innerHTML = CatClubArt.makeCatSVG(CatClubData.cats[0]);
    const remaining = Math.max(0,Core.REBIRTH_COST-state.coins);
    unlockDialog.querySelector('#level-unlock-balance').textContent = remaining ? `You have ${number(state.coins)} coins. Collect ${number(remaining)} more to rebirth.` : `You have ${number(state.coins)} coins—enough to begin the cat chapter.`;
    unlockDialog.querySelector('.level-unlock-rebirth').disabled = remaining > 0;
    unlockDialog.showModal();
    state.catUnlockNotified = true;
    save();
    renderStats();
    announcement.textContent = 'New level unlocked! The cat chapter is now available. Rebirth costs 10,000 coins.';
  }

  function completeOpening() {
    if (!pendingPet) return;
    const pet = pendingPet;
    pendingPet = null;
    clearOpeningTimers();
    finishRoll(pet);
  }

  function beginSecretOpening() {
    if (!pendingPet) return;
    const isNew = !progress().owned[pendingPet.id];
    const duration = Core.openingDuration(progress().speed,pendingPet.rarity,motion.matches,isNew) - Core.rollDuration(progress().speed);
    if (!duration) { completeOpening();return; }
    roller.classList.add('is-secret-opening');
    roller.dataset.openingPhase = 'charging';
    scene.classList.add('secret-moment');
    roller.querySelector('.rarity-badge').textContent = '✦ Secret signal';
    breedLabel.textContent = 'Something extraordinary…';
    rewardLabel.textContent = 'An unfamiliar energy gathers inside.';
    rollLabel.textContent = 'Unsealing…';
    roller.querySelector('.roll-timing').textContent = 'SECRET';
    announcement.textContent = 'A Secret-tier companion is awakening. The capsule is opening.';
    scheduleOpening(()=>{
      roller.dataset.openingPhase = 'cracking';
      rewardLabel.textContent = 'Hold on… the seal is breaking.';
    },duration * .36);
    scheduleOpening(()=>{
      roller.dataset.openingPhase = 'unsealing';
      rewardLabel.textContent = 'One last moment…';
    },duration * .7);
    scheduleOpening(completeOpening,duration);
  }

  rollButton.addEventListener('click',()=>{
    if (rolling || unlockPending) return;
    const pet = Core.chooseDog(state);
    pendingPet = pet;
    clearOpeningTimers();
    clearTimeout(revealTimer);
    clearTimeout(coinTimer);
    clearSecretPresentation();
    roller.querySelector('.coin-wallet').classList.remove('coin-pop');
    rolling = true;
    roller.querySelector('.game-odds').open = false;
    roller.classList.remove('is-revealing');
    roller.classList.add('is-rolling');
    stage.setAttribute('aria-busy','true');
    sprite.setAttribute('aria-hidden','true');
    breedLabel.textContent = 'Who’s in the capsule?';
    rewardLabel.textContent = `A very good ${animal()} is on the way…`;
    rollLabel.textContent = 'Opening…';
    announcement.textContent = '';
    renderStats();
    scheduleOpening(beginSecretOpening,Core.rollDuration(progress().speed));
  });

  upgradeButtons.forEach(button=>button.addEventListener('click',()=>{
    const kind = button.dataset.upgrade;
    if (rolling || !Core.buyUpgrade(state,kind)) return;
    save();
    renderStats();
    const message = kind === 'luck' ? (progress().luck === Core.MAX_LUCK ? 'Lucky charm maxed · 20-roll pity is now Legendary+' : `Lucky charm upgraded · ${percentage(pityChance(progress().luck))} Epic+ chance`) : `Quick paws upgraded · ${(Core.rollDuration(progress().speed)/1000).toFixed(2)}s per roll`;
    rewardLabel.textContent = announcement.textContent = message;
  }));

  function placeUpgrades() {
    if (compact.matches) {
      shop.querySelector('.upgrade-host').append(upgrades);
    } else {
      if (shop.open) shop.close();
      roller.insertBefore(upgrades,roller.querySelector('.rebirth-option'));
    }
    roller.querySelector('.shop-open').hidden = !compact.matches;
  }
  compact.addEventListener('change',placeUpgrades);
  roller.querySelector('.shop-open').addEventListener('click',()=>{
    if (!rolling) shop.showModal();
  });
  shop.querySelector('.shop-close').addEventListener('click',()=>shop.close());

  function renderEnding() {
    const completed = state.gameCompleted;
    completionDialog.classList.toggle('is-complete',completed);
    completionDialog.querySelector('.completion-art').innerHTML = `<span>${DogClubArt.makeDogSVG(DogClubData.dogs[0])}</span><span>${CatClubArt.makeCatSVG(CatClubData.cats[0])}</span>`;
    completionDialog.querySelector('.game-kicker').textContent = completed ? 'THE ADVENTURE IS COMPLETE' : 'EVERY COMPANION DISCOVERED';
    completionDialog.querySelector('#completion-title').textContent = completed ? 'Game complete!' : 'The whole pack, together.';
    completionDialog.querySelector('.completion-total').textContent = `${DogClubData.dogs.length} dogs + ${CatClubData.cats.length} cats · Every secret found`;
    completionDialog.querySelector('#completion-copy').innerHTML = completed ? 'Every breed. Every secret. Every friend, home.<br>Thank you for playing. Your whole pack is yours to keep.' : 'Every breed. Every secret. One very good collection. Finish your adventure for <strong>20,000 coins</strong>.';
    const balance = completionDialog.querySelector('#completion-balance');
    balance.hidden = completed;
    balance.textContent = `${number(state.coins)} coins → ${number(Math.max(0,state.coins-Core.FINISH_COST))} after finishing.`;
    const confirm = completionDialog.querySelector('.completion-confirm');
    confirm.hidden = completed;
    confirm.disabled = rolling || !Core.finishUnlocked(state) || state.coins < Core.FINISH_COST;
  }
  roller.querySelector('.finish-option').addEventListener('click',()=>{
    if (rolling || unlockPending || (!state.gameCompleted && (!Core.finishUnlocked(state) || state.coins < Core.FINISH_COST))) return;
    roller.querySelector('.game-odds').open = false;
    renderEnding();
    completionDialog.showModal();
  });
  completionDialog.querySelector('.completion-close').addEventListener('click',()=>completionDialog.close());
  completionDialog.querySelector('.completion-confirm').addEventListener('click',()=>{
    if (rolling || unlockPending || !Core.finishGame(state)) return;
    clearTimeout(revealTimer);
    clearSecretPresentation();
    roller.classList.remove('is-revealing');
    save();renderStats();renderEnding();
    completionDialog.querySelector('.completion-close').focus();
    rewardLabel.textContent = 'Game complete. Every companion, home.';
    announcement.textContent = 'Game complete! Every dog and cat discovered. 20,000 coins spent. Your collections and upgrades are preserved.';
  });

  function openRebirthDialog() {
    if (rolling || !Core.rebirthUnlocked(state) || state.coins < Core.REBIRTH_COST) return;
    rebirthDialog.querySelector('.rebirth-balance').textContent = `${number(state.coins)} coins → ${number(state.coins-Core.REBIRTH_COST)} coins after rebirth.`;
    rebirthDialog.showModal();
  }
  roller.querySelector('.rebirth-option').addEventListener('click',openRebirthDialog);
  unlockDialog.querySelector('.level-unlock-continue').addEventListener('click',()=>unlockDialog.close());
  unlockDialog.querySelector('.level-unlock-rebirth').addEventListener('click',()=>{
    if (state.coins < Core.REBIRTH_COST) return;
    unlockDialog.close();
    openRebirthDialog();
  });
  rebirthDialog.querySelector('.rebirth-cancel').addEventListener('click',()=>rebirthDialog.close());
  rebirthDialog.querySelector('.rebirth-confirm').addEventListener('click',()=>{
    if (rolling || !Core.rebirthToCats(state)) return;
    rebirthDialog.close();
    clearTimeout(revealTimer);
    clearTimeout(coinTimer);
    clearOpeningTimers();
    pendingPet = null;
    clearSecretPresentation();
    roller.classList.remove('is-revealing','is-rolling');
    roller.querySelector('.coin-wallet').classList.remove('coin-pop');
    search.value = '';
    rarityFilter.value = 'all';
    foundFilter.setAttribute('aria-pressed','false');
    albumPage = 0;
    configureChapter();
    displayPet(currentPet(),'Cats unlocked! Switch animals to keep growing both collections.');
    save();
    renderStats();
    announcement.textContent = 'Cats unlocked! 10,000 coins spent. Dog progress is preserved. Cats have their own upgrades and pity. Switch animals anytime.';
  });

  roller.querySelectorAll('[data-roll-species]').forEach(button=>button.addEventListener('click',()=>{
    if(rolling||unlockPending||!Core.switchAnimal(state,button.dataset.rollSpecies))return;
    clearTimeout(revealTimer);clearTimeout(coinTimer);clearSecretPresentation();
    roller.classList.remove('is-revealing');
    roller.querySelector('.coin-wallet').classList.remove('coin-pop');
    search.value='';rarityFilter.value='all';albumPage=0;
    configureChapter();displayPet(currentPet(),`Your ${animal()} upgrades and pity are ready.`);
    save();renderStats();
    announcement.textContent=`Now rolling for ${state.chapter}. Your ${animal()} upgrades and pity have been restored.`;
  }));

  function renderParticles(grand=false) {
    const count = grand ? 64 : 18;
    const bounds = stage.getBoundingClientRect();
    const reach = grand ? Math.min(bounds.width*.46,bounds.height*.75,170) : 68;
    stage.querySelector('.pet-particles').innerHTML = Array.from({length:count},(_,index)=>{
      const angle = index/count*Math.PI*2;
      const radius = grand ? reach*(.55+(index%5)*.11) : 68+(index%4)*19;
      return `<i style="--dx:${Math.cos(angle)*radius}px;--dy:${Math.sin(angle)*radius}px;--delay:${index%5*45}ms;--spark-size:${grand && index%4===0 ? 5 : 3}px"></i>`;
    }).join('');
  }
  renderParticles();
  rarities.forEach(rarity=>{
    const option = document.createElement('option');
    option.value = rarity.id;
    option.textContent = rarity.label;
    rarityFilter.append(option);
  });

  function renderAlbum() {
    const albumChapter = state.catsUnlocked ? chapterFilter.value : state.chapter;
    const list = Core.catalog(state,albumChapter);
    const owned = Core.progressFor(state,albumChapter).owned;
    const name = albumChapter === 'cats' ? 'cat' : 'dog';
    const query = search.value.trim().toLocaleLowerCase();
    const foundOnly = foundFilter.getAttribute('aria-pressed') === 'true';
    dialog.querySelector('#collection-title').textContent = `The ${name} album`;
    search.placeholder = `Find a ${name}…`;
    search.setAttribute('aria-label',`Search ${name} collection`);
    const filtered = list.filter(pet=>{
      const known = Boolean(owned[pet.id]);
      const publicName = pet.secret && !known ? 'Unknown secret' : pet.name;
      return (!foundOnly || known) && (rarityFilter.value === 'all' || pet.rarity === rarityFilter.value) && publicName.toLocaleLowerCase().includes(query);
    });
    const pageCount = Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
    albumPage = Math.min(pageCount-1,Math.max(0,albumPage));
    const visible = filtered.slice(albumPage*PAGE_SIZE,(albumPage+1)*PAGE_SIZE);
    dialog.querySelector('.album-progress').textContent = `${Object.keys(owned).length} / ${list.length} companions · ${list.filter(pet=>pet.secret && owned[pet.id]).length} / 8 secrets`;
    grid.innerHTML = visible.length ? visible.map(pet=>{
      const count = owned[pet.id] || 0,name = pet.secret && !count ? 'Unknown secret' : pet.name,rarity = rarityMap.get(pet.rarity);
      return `<button type="button" class="collection-card" data-dog-id="${pet.id}" style="--rarity:${rarity.color}" ${count ? '' : 'disabled'} aria-label="${escape(count ? `Display ${name}. ${count} found.` : `${name}. Not discovered yet.`)}"><span class="album-art">${count ? art(pet) : `<span class="locked-paw" aria-hidden="true">${pet.secret ? '✦' : '?'}</span>`}</span><span class="album-name">${escape(name)}</span><span class="album-rarity">${rarity.label}</span>${count ? `<span class="album-copies">×${number(count)}</span>` : ''}</button>`;
    }).join('') : '<p class="collection-empty">No companions here yet. Try another filter.</p>';
    dialog.querySelector('.collection-page').textContent = `${albumPage+1} / ${pageCount}`;
    dialog.querySelector('.collection-previous').disabled = albumPage === 0;
    dialog.querySelector('.collection-next').disabled = albumPage >= pageCount-1;
  }

  roller.querySelector('.collection-open').addEventListener('click',()=>{
    if (rolling) return;
    albumPage = 0;
    renderAlbum();
    dialog.showModal();
  });
  dialog.querySelector('.collection-close').addEventListener('click',()=>dialog.close());
  for (const modal of [dialog,shop,rebirthDialog,unlockDialog,completionDialog]) modal.addEventListener('click',event=>{
    if (event.target !== modal) return;
    const bounds = modal.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) modal.close();
  });
  search.addEventListener('input',()=>{albumPage = 0;renderAlbum();});
  rarityFilter.addEventListener('change',()=>{albumPage = 0;renderAlbum();});
  chapterFilter.addEventListener('change',()=>{albumPage = 0;search.value = '';renderAlbum();});
  foundFilter.addEventListener('click',()=>{
    foundFilter.setAttribute('aria-pressed',String(foundFilter.getAttribute('aria-pressed') !== 'true'));
    albumPage = 0;
    renderAlbum();
  });
  dialog.querySelector('.collection-previous').addEventListener('click',()=>{albumPage--;renderAlbum();dialog.scrollTop = 0;});
  dialog.querySelector('.collection-next').addEventListener('click',()=>{albumPage++;renderAlbum();dialog.scrollTop = 0;});
  grid.addEventListener('click',event=>{
    const card = event.target.closest('[data-dog-id]');
    const selectedChapter=state.catsUnlocked?chapterFilter.value:state.chapter;
    if (!card || !Core.progressFor(state,selectedChapter).owned[card.dataset.dogId]) return;
    if(selectedChapter!==state.chapter){Core.switchAnimal(state,selectedChapter);configureChapter();renderStats();}
    const pet = pets().find(item=>item.id === card.dataset.dogId);
    progress().lastId = pet.id;
    save();
    displayPet(pet,'From your collection · ready for another roll?');
    announcement.textContent = `Your companion is now ${pet.name}.`;
    dialog.close();
  });
  document.addEventListener('pointerdown',event=>{
    if (!event.target.closest('.game-odds')) roller.querySelector('.game-odds').open = false;
  },{passive:true});
  motion.addEventListener('change',()=>{
    if (!motion.matches) return;
    const opening = roller.classList.contains('is-secret-opening');
    roller.classList.remove('is-revealing');
    clearSecretPresentation();
    if (opening) completeOpening();
  });

  configureChapter();
  displayPet(currentPet(),isFresh ? 'Your starter companion. +30 coins.' : 'Welcome back. Your pack is right here.');
  renderStats();
  save();
  placeUpgrades();
  roller.hidden = false;
  document.documentElement.classList.add('has-pets');
  function sizeSprite() {
    const bounds = stage.getBoundingClientRect();
    const size = Math.max(1,Math.min(224,bounds.width,bounds.height-2));
    sprite.style.width = sprite.style.height = `${size}px`;
    stage.style.setProperty('--capsule-size',`${Math.max(18,Math.min(100,bounds.width*.3,bounds.height*.64))}px`);
    stage.style.setProperty('--lid-lift',`${Math.min(52,bounds.height*.18)}px`);
  }
  // A short viewport must shrink the illustration, not crop the animal.
  if ('ResizeObserver' in window) new ResizeObserver(sizeSprite).observe(stage);
  else window.addEventListener('resize',sizeSprite,{passive:true});
  sizeSprite();
  if (Core.rebirthUnlocked(state) && !state.catUnlockNotified) queueCatUnlock(200);
})();
