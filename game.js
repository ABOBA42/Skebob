/* ============================================================
   ПЕПЕЛ РАССВЕТА — движок игры
   Экшен-RPG: боевая система в духе Dark Souls, мир в духе TES
   ============================================================ */
'use strict';

/* ================= Утилиты ================= */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const angTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
const angDiff = (a, b) => { let d = (a - b) % TAU; if(d > Math.PI) d -= TAU; if(d < -Math.PI) d += TAU; return d; };
const rnd = (a, b) => a + Math.random() * (b - a);
const $ = id => document.getElementById(id);
const fmt = n => Math.floor(n).toLocaleString('ru-RU');
const t2p = t => t * TILE + TILE / 2;
function hash2(x, y){ let h = (x * 374761393 + y * 668265263) ^ 0x5bf03635; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967296; }

/* ================= Канвас ================= */
const canvas = $('gameCanvas');
const ctx = canvas.getContext('2d');
const lightCv = document.createElement('canvas');
const lightCtx = lightCv.getContext('2d');
let VW = 0, VH = 0, DPR = 1;
function resize(){
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  VW = window.innerWidth; VH = window.innerHeight;
  canvas.width = VW * DPR; canvas.height = VH * DPR;
  canvas.style.width = VW + 'px'; canvas.style.height = VH + 'px';
  lightCv.width = VW; lightCv.height = VH;
}
window.addEventListener('resize', resize);
resize();

/* ================= Звук (WebAudio-синтез) ================= */
const AudioSys = {
  ctx:null, master:null, muted:false,
  ensure(){
    if(!this.ctx){
      try{
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = .5;
        this.master.connect(this.ctx.destination);
      }catch(e){}
    }
    if(this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  tone(f, dur, type, vol, slide){
    if(!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(vol || .2, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + .02);
  },
  noise(dur, freq, vol, q){
    if(!this.ctx || this.muted) return;
    const t = this.ctx.currentTime, sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, sr * dur, sr);
    const d = buf.getChannelData(0);
    for(let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol || .2, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  },
  swing(){ this.noise(.14, 900, .12, 2); },
  hit(){ this.noise(.1, 300, .3, 1); this.tone(120, .12, 'triangle', .25, 60); },
  hurt(){ this.tone(160, .25, 'sawtooth', .22, 70); this.noise(.15, 500, .15); },
  block(){ this.tone(500, .1, 'square', .12, 300); this.noise(.08, 2000, .1); },
  roll(){ this.noise(.18, 600, .08, 1.5); },
  fire(){ this.tone(300, .3, 'sawtooth', .18, 90); this.noise(.25, 1200, .1); },
  ice(){ this.tone(1200, .2, 'sine', .15, 1800); },
  lightning(){ this.noise(.3, 3000, .25, .5); this.tone(80, .3, 'sawtooth', .2, 40); },
  soul(){ this.tone(700, .25, 'sine', .12, 1100); },
  heal(){ this.tone(520, .18, 'sine', .15); setTimeout(() => this.tone(780, .25, 'sine', .15), 120); },
  drink(){ this.tone(300, .12, 'sine', .15, 200); setTimeout(() => this.tone(260, .12, 'sine', .15, 180), 140); },
  levelup(){ [440, 550, 660, 880].forEach((f, i) => setTimeout(() => this.tone(f, .3, 'triangle', .16), i * 110)); },
  death(){ this.tone(120, 1.4, 'sawtooth', .25, 35); },
  boss(){ this.tone(70, .9, 'sawtooth', .3, 45); this.noise(.7, 200, .2); },
  coin(){ this.tone(900, .08, 'square', .08); this.tone(1300, .1, 'square', .06); },
  ui(){ this.tone(600, .05, 'square', .05); },
  chest(){ this.tone(200, .15, 'triangle', .15, 320); setTimeout(() => this.tone(500, .2, 'triangle', .12), 130); },
  quest(){ this.tone(660, .15, 'triangle', .14); setTimeout(() => this.tone(990, .25, 'triangle', .14), 140); },
  pickup(){ this.tone(800, .1, 'sine', .1, 1000); },
  gate(){ this.tone(150, .4, 'triangle', .2, 90); this.noise(.3, 400, .12); },
  skill(){ this.tone(420, .25, 'triangle', .18, 880); this.noise(.2, 1400, .1, 3); },
  crit(){ this.tone(980, .18, 'square', .16, 240); this.noise(.16, 2600, .14, 2); },
  slam(){ this.tone(60, .5, 'sine', .35, 30); this.noise(.4, 220, .3, .7); },
  evade(){ this.noise(.16, 1500, .09, 2.5); },
};

/* ================= Состояние игры ================= */
const MAPS = buildMaps();
const SAVE_KEY = 'ashesOfDawn_v1';
let G = null;                 // сохраняемое состояние
let W = null;                 // рантайм мира текущей карты
const cam = { x:0, y:0 };
let shake = 0, fadeAlpha = 0, fadeDir = 0, pendingTravel = null;
let lastToastMsg = '', lastToastTime = 0;

function defaultState(){
  return {
    state:'play', mapId:'village', px:t2p(20), py:t2p(17),
    stats:{ vig:8, end:8, str:9, dex:9, int:7 }, level:8,
    souls:0, hp:1, stam:1, mp:1,
    estus:3, estusMax:3,
    inv:{ broken_sword:1, cloth:1, wooden:1, bread:2 },
    equip:{ weapon:'broken_sword', armor:'cloth', shield:'wooden', ring:null },
    spells:[], spellSel:0,
    quests:{}, flags:{}, chests:{}, pickups:{}, bosses:{}, shopStock:{},
    discovered:{ village:true },
    bonfire:{ map:'village', id:'bf_village' },
    bloodstain:null,
    time:8 * 60, deaths:0, kills:0, playtime:0,
    buffs:{ resin:0, stoneskin:0 },
  };
}

/* ---------- Производные характеристики ---------- */
function maxHp(){ const r = ringVal('hpMax'); return Math.floor((200 + G.stats.vig * 30) * (1 + r)); }
function maxStam(){ return 60 + G.stats.end * 7; }
function maxMp(){ return 30 + G.stats.int * 9; }
function ringVal(effect){
  const id = G.equip.ring;
  if(id && ITEMS[id] && ITEMS[id].effect === effect) return ITEMS[id].value;
  return 0;
}
function equipWeight(){
  let w = 0;
  for(const slot of ['weapon', 'armor', 'shield']){
    const id = G.equip[slot];
    if(id && ITEMS[id]) w += ITEMS[id].weight || 0;
  }
  if(G.equip.ring) w += .5;
  return w;
}
function loadCapacity(){ return 30 + G.stats.end * 2.2; }
function loadRatio(){ return equipWeight() / loadCapacity(); }
function armorDef(){
  let d = ITEMS[G.equip.armor] ? ITEMS[G.equip.armor].def : 0;
  if(G.buffs.stoneskin > 0) d += 60;
  return d;
}
function spellPower(){
  let p = 0;
  const w = ITEMS[G.equip.weapon];
  if(w && w.spellPower) p += w.spellPower;
  p += ringVal('spellPower');
  if(P.skillBuffs.staff > 0) p += .5;   // навык посоха: Вспышка маны
  return p;
}
function weaponDmg(){
  const w = ITEMS[G.equip.weapon];
  if(!w) return 20;
  let d = w.dmg;
  const sc = w.scaling || {};
  d *= 1 + (sc.str || 0) * G.stats.str / 25 + (sc.dex || 0) * G.stats.dex / 25 + (sc.int || 0) * G.stats.int / 25;
  if(G.buffs.resin > 0) d *= 1.35;
  if(!meetsReq(w)) d *= .5;
  return d;
}
function meetsReq(item){
  const r = item.req || {};
  return (!r.str || G.stats.str >= r.str) && (!r.dex || G.stats.dex >= r.dex) && (!r.int || G.stats.int >= r.int);
}
function spellDmg(sp){ return sp.dmg * (1 + G.stats.int * .045) * (1 + spellPower()); }
function levelCost(){ return Math.floor(60 + G.level * 45 + G.level * G.level * 6); }
function isNight(){ return darkness() > .4; }
function darkness(){
  const h = (G.time / 60) % 24;
  if(h >= 7 && h < 18) return 0;
  if(h >= 18 && h < 21) return (h - 18) / 3 * .72;
  if(h >= 21 || h < 4) return .72;
  return (7 - h) / 3 * .72;
}

/* ================= Рантайм игрока ================= */
const P = {
  act:'idle', t:0, move:null, heavy:false, phase:'wind', hitSet:null,
  facing:0, lock:null, blocking:false, iframes:0, stamDelay:0,
  drinkKind:null, drinkHealed:false, castSpell:null, castDone:false,
  rollDir:0, rollDist:0, rollDur:0, rollIf:[0, 0],
  cds:{}, hurtFlash:0, atkBuf:null, vx:0, vy:0,
  walkCycle:0, swingAnim:0, animStyle:'sword', comboStep:0,
  // навык оружия (G)
  skillCd:0, skillBuffs:{ sword:0, dagger:0, staff:0 }, critReady:false,
  thrustsLeft:0, thrustT:0, hidden:false, sprintFx:0,
};
function resetRuntime(){
  P.act = 'idle'; P.t = 0; P.lock = null; P.blocking = false;
  P.iframes = 0; P.cds = {}; P.hurtFlash = 0; P.atkBuf = null;
  P.skillCd = 0; P.skillBuffs = { sword:0, dagger:0, staff:0 };
  P.critReady = false; P.thrustsLeft = 0; P.hidden = false;
}

/* ================= Мир ================= */
let uidSeq = 1;
function makeEnemy(type, x, y){
  const d = ENEMIES[type];
  return {
    uid:uidSeq++, type, d, x, y, hp:d.hp, hpMax:d.hp,
    state:'idle', t:0, facing:rnd(0, TAU), home:{ x, y },
    wanderT:rnd(1, 4), wanderDir:rnd(0, TAU),
    aggroed:false, slow:0, hitFlash:0, poiseAcc:0,
    cd:rnd(0, .8), deadT:0, phase2:false, summoned:false,
    dashVX:0, dashVY:0, atkKind:null, hitPlayer:false,
    // --- тактический ИИ ---
    strafeDir:Math.random() < .5 ? 1 : -1, strafeT:rnd(1, 2.6),
    evadeCd:rnd(.4, 1.4), flankT:rnd(1.5, 3.5), flankSide:Math.random() < .5 ? 1 : -1,
    backoffCd:rnd(1, 2.5), reactCd:0, wantWindup:false, lunge:false,
    rollT:0, rollDur:.5, rollDirA:0, anim:'idle', animT:0, walkPhase:rnd(0, TAU),
  };
}
function loadMap(id, spawn){
  const m = MAPS[id];
  G.mapId = id;
  W = {
    map:m, enemies:[], projectiles:[], particles:[], floats:[],
    npcs:m.npcs.map(n => ({ ...n, x:t2p(n.x), y:t2p(n.y), bob:rnd(0, TAU) })),
    chests:m.chests.map(c => ({ ...c, x:t2p(c.x), y:t2p(c.y) })),
    pickups:m.pickups.filter(p => !G.pickups[p.id]).map(p => ({ ...p, x:t2p(p.x), y:t2p(p.y), bob:rnd(0, TAU) })),
    bonfires:m.bonfires.map(b => ({ ...b, x:t2p(b.x), y:t2p(b.y) })),
    lanterns:m.lanterns.map(l => ({ x:t2p(l.x), y:t2p(l.y) })),
    trees:[], pillars:[],
  };
  for(const s of m.enemies){
    if(ENEMIES[s.type].boss && G.bosses[s.type]) continue;
    W.enemies.push(makeEnemy(s.type, t2p(s.x), t2p(s.y)));
  }
  for(let y = 0; y < m.h; y++)
    for(let x = 0; x < m.w; x++){
      if(m.tiles[y][x] === 'T') W.trees.push({ x:t2p(x), y:t2p(y), v:hash2(x, y) });
      if(m.tiles[y][x] === 'p') W.pillars.push({ x:t2p(x), y:t2p(y) });
    }
  if(spawn){ G.px = t2p(spawn.x); G.py = t2p(spawn.y); }
  P.lock = null; P.act = 'idle';
  cam.x = G.px; cam.y = G.py;
  G.discovered[id] = true;
  showBanner(LOC_INFO[id].name);
}
function movePlayer(dx, dy, r){
  const o = { x:G.px, y:G.py };
  moveCircle(o, dx, dy, r);
  G.px = o.x; G.py = o.y;
}
function tileAt(px, py){
  const m = W.map;
  const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
  if(tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return '#';
  return m.tiles[ty][tx];
}
function solidAt(px, py){ return SOLID_TILES.has(tileAt(px, py)); }
function moveCircle(o, dx, dy, r){
  // по X
  o.x += dx;
  let x0 = Math.floor((o.x - r) / TILE), x1 = Math.floor((o.x + r) / TILE);
  let y0 = Math.floor((o.y - r) / TILE), y1 = Math.floor((o.y + r) / TILE);
  for(let ty = y0; ty <= y1; ty++)
    for(let tx = x0; tx <= x1; tx++){
      const ch = (tx < 0 || ty < 0 || tx >= W.map.w || ty >= W.map.h) ? '#' : W.map.tiles[ty][tx];
      if(!SOLID_TILES.has(ch)) continue;
      const L = tx * TILE, R = L + TILE, T = ty * TILE, B = T + TILE;
      if(o.y + r > T && o.y - r < B){
        if(dx > 0 && o.x + r > L && o.x - r < L) o.x = L - r - .01;
        else if(dx < 0 && o.x - r < R && o.x + r > R) o.x = R + r + .01;
      }
    }
  // по Y
  o.y += dy;
  x0 = Math.floor((o.x - r) / TILE); x1 = Math.floor((o.x + r) / TILE);
  y0 = Math.floor((o.y - r) / TILE); y1 = Math.floor((o.y + r) / TILE);
  for(let ty = y0; ty <= y1; ty++)
    for(let tx = x0; tx <= x1; tx++){
      const ch = (tx < 0 || ty < 0 || tx >= W.map.w || ty >= W.map.h) ? '#' : W.map.tiles[ty][tx];
      if(!SOLID_TILES.has(ch)) continue;
      const L = tx * TILE, R = L + TILE, T = ty * TILE, B = T + TILE;
      if(o.x + r > L && o.x - r < R){
        if(dy > 0 && o.y + r > T && o.y - r < T) o.y = T - r - .01;
        else if(dy < 0 && o.y - r < B && o.y + r > B) o.y = B + r + .01;
      }
    }
  o.x = clamp(o.x, r, W.map.w * TILE - r);
  o.y = clamp(o.y, r, W.map.h * TILE - r);
}

/* ================= Частицы и надписи ================= */
function burst(x, y, color, n, spd, life, size){
  for(let i = 0; i < n; i++){
    const a = rnd(0, TAU), s = rnd(spd * .3, spd);
    W.particles.push({ x, y, vx:Math.cos(a) * s, vy:Math.sin(a) * s, life:rnd(life * .5, life), t:0, color, size:rnd(size * .5, size), grav:0 });
  }
}
function soulWisps(x, y, n){
  for(let i = 0; i < n; i++)
    W.particles.push({ x:x + rnd(-10, 10), y:y + rnd(-10, 10), vx:rnd(-20, 20), vy:rnd(-60, -30), life:rnd(.7, 1.3), t:0, color:'#bfe8ff', size:rnd(2, 4), grav:0, soul:true });
}
function ember(x, y){
  if(W.particles.length > 350) return;
  W.particles.push({ x:x + rnd(-6, 6), y, vx:rnd(-8, 8), vy:rnd(-45, -25), life:rnd(.5, 1.1), t:0, color:Math.random() < .5 ? '#ffb347' : '#ff7b3a', size:rnd(1.5, 3), grav:0 });
}
function floatText(x, y, txt, color, big){
  W.floats.push({ x:x + rnd(-8, 8), y, txt, color, t:0, life:big ? 1.4 : .9, big });
}

/* ================= Квесты ================= */
function startQuest(id){
  if(G.quests[id]) return;
  G.quests[id] = { stage:0, prog:0, done:false };
  toast('📜 Новый квест: «' + QUESTS[id].title + '»', 'quest');
  AudioSys.quest();
  checkCollect(id);
  updateQuestTracker();
}
function advanceQuest(id){
  const q = G.quests[id];
  if(!q || q.done) return;
  q.stage++; q.prog = 0;
  const def = QUESTS[id];
  if(q.stage >= def.stages.length){
    q.done = true;
    const rw = def.rewards || {};
    if(rw.souls){ G.souls += rw.souls; floatText(G.px, G.py - 30, '+' + rw.souls + ' душ', '#bfe8ff'); }
    if(rw.items) for(const [iid, n] of rw.items) giveItem(iid, n, true);
    toast('✅ Квест выполнен: «' + def.title + '»', 'quest');
    AudioSys.quest();
  } else {
    toast('📜 Квест обновлён: «' + def.title + '»', 'quest');
    AudioSys.quest();
    checkCollect(id);
  }
  updateQuestTracker();
}
function checkCollect(id){
  const q = G.quests[id];
  if(!q || q.done) return;
  const st = QUESTS[id].stages[q.stage];
  if(st && st.type === 'collect'){
    q.prog = countItem(st.target);
    if(q.prog >= st.count) advanceQuest(id);
  }
}
function questEvent(kind, target){
  for(const id in G.quests){
    const q = G.quests[id];
    if(q.done) continue;
    const st = QUESTS[id].stages[q.stage];
    if(!st || st.type !== kind) continue;
    let match = st.target === target;
    if(kind === 'kill' && st.target === 'bandit' && target === 'bandit_chief') match = true;
    if(!match) continue;
    q.prog++;
    if(q.prog >= st.count) advanceQuest(id);
    else updateQuestTracker();
  }
}
function countItem(id){ return G.inv[id] || 0; }
function giveItem(id, n, silent){
  n = n || 1;
  const it = ITEMS[id];
  if(it.kind === 'spell'){ learnSpell(it.spell); return; }
  if(id === 'estus_shard' && G.estusMax < 6){
    G.estusMax += n; G.estus += n;
    if(G.estusMax > 6){ G.estusMax = 6; G.estus = Math.min(G.estus, 6); }
    toast('🏺 Эстус усилен: ' + G.estusMax + ' глотков!', 'quest');
    AudioSys.levelup();
    return;
  }
  G.inv[id] = (G.inv[id] || 0) + n;
  if(!silent) toast(it.icon + ' Получено: ' + it.name + (n > 1 ? ' ×' + n : ''), 'item');
  else toast(it.icon + ' Награда: ' + it.name + (n > 1 ? ' ×' + n : ''), 'item');
  for(const qid in G.quests) checkCollect(qid);
  updateQuestTracker();
}
function takeItem(id, n){
  n = n || 1;
  if(G.inv[id]){ G.inv[id] -= n; if(G.inv[id] <= 0) delete G.inv[id]; }
}
function learnSpell(sid){
  if(G.spells.includes(sid)){ toast('✨ Заклинание уже известно: ' + SPELLS[sid].name, 'item'); return; }
  G.spells.push(sid);
  G.spellSel = G.spells.length - 1;
  toast('✨ Изучено заклинание: ' + SPELLS[sid].name + ' (F — сотворить)', 'quest');
  AudioSys.levelup();
}

/* ================= Предметы: использование и экипировка ================= */
function useItem(id){
  const it = ITEMS[id];
  if(!it || !countItem(id)) return;
  if(it.kind === 'weapon' || it.kind === 'armor' || it.kind === 'shield' || it.kind === 'ring'){
    const slot = it.kind === 'weapon' ? 'weapon' : it.kind === 'armor' ? 'armor' : it.kind === 'shield' ? 'shield' : 'ring';
    G.equip[slot] = id;
    toast(it.icon + ' Экипировано: ' + it.name, 'item');
    AudioSys.ui();
    if(!meetsReq(it)) toast('⚠️ Не хватает характеристик для ' + it.name + ' — урон снижен', 'warn');
    renderMenu();
    return;
  }
  if(it.kind === 'spell'){ learnSpell(it.spell); takeItem(id, 1); renderMenu(); return; }
  if(it.kind === 'consumable'){
    if(it.use === 'estusShard'){
      if(G.estusMax >= 6){ toast('🏺 Фляга уже предельна (6 глотков)', 'warn'); return; }
      G.estusMax++; G.estus++;
      takeItem(id, 1);
      toast('🏺 Эстус усилен: ' + G.estusMax + ' глотков!', 'quest');
      AudioSys.levelup(); renderMenu(); return;
    }
    if(it.use === 'resin'){
      takeItem(id, 1); G.buffs.resin = 45;
      burst(G.px, G.py, '#ffd76a', 16, 90, .7, 3);
      toast('🍯 Оружие покрыто золотой смолой (+35% урона, 45 с)', 'item');
      AudioSys.heal(); renderMenu(); return;
    }
    if(it.use === 'bread'){
      if(P.act !== 'idle'){ toast('Сейчас не до еды…', 'warn'); return; }
      takeItem(id, 1);
      P.act = 'drink'; P.t = 0; P.drinkKind = 'bread'; P.drinkHealed = false;
      closeOverlays(); AudioSys.drink(); return;
    }
  }
}
function cycleWeapon(dir){
  const weapons = Object.keys(G.inv).filter(id => ITEMS[id] && ITEMS[id].kind === 'weapon');
  if(weapons.length < 2) return;
  let i = weapons.indexOf(G.equip.weapon);
  i = (i + (dir || 1) + weapons.length) % weapons.length;
  G.equip.weapon = weapons[i];
  toast(ITEMS[weapons[i]].icon + ' ' + ITEMS[weapons[i]].name, 'item');
  AudioSys.ui();
}

/* ================= Боевые действия игрока ================= */
function tryAttack(heavy){
  if(G.state !== 'play') return;
  if(P.act === 'attack'){
    if(P.phase === 'rec') P.atkBuf = heavy;
    return;
  }
  if(P.act !== 'idle') return;
  const w = ITEMS[G.equip.weapon];
  const wt = w.wtype;
  let mv = WTYPE[wt][heavy ? 'heavy' : 'light'];
  // «Танец клинка»: атаки быстрее и почти без выносливости
  if(P.skillBuffs.sword > 0 && !heavy) mv = { ...mv, wind:mv.wind * .65, rec:mv.rec * .6, stam:Math.ceil(mv.stam * .3) };
  if(G.stam < mv.stam){ flashStam(); return; }
  G.stam -= mv.stam; P.stamDelay = .6;
  // комбо-счётчик для уникальных анимаций (сбрасывается при простое)
  P.comboStep = (P.lastAtk !== undefined && performance.now() / 1000 - P.lastAtk < mv.wind + mv.act + mv.rec + .55) ? (P.comboStep % 3) + 1 : 1;
  P.lastAtk = performance.now() / 1000;
  P.act = 'attack'; P.t = 0; P.move = mv; P.heavy = heavy;
  P.animStyle = wt;
  P.phase = 'wind'; P.hitSet = new Set(); P.atkBuf = null;
  P.blocking = false;
  if(P.lock) P.facing = angTo(G.px, G.py, P.lock.x, P.lock.y);
  AudioSys.swing();
}

/* ---------- Уникальный навык оружия (клавиша G) ---------- */
function currentSkill(){
  const w = ITEMS[G.equip.weapon];
  return w ? WSKILL[w.wtype] : null;
}
function trySkill(){
  if(G.state !== 'play') return;
  if(P.act !== 'idle') return;
  const w = ITEMS[G.equip.weapon];
  const sk = WSKILL[w.wtype];
  if(!sk) return;
  if(P.skillCd > 0){ toast('⏳ Навык перезаряжается: ' + Math.ceil(P.skillCd) + ' с', 'warn'); return; }
  if(G.stam < sk.stam){ flashStam(); return; }
  G.stam -= sk.stam; P.stamDelay = .7;
  P.skillCd = sk.cd;
  AudioSys.skill();
  floatText(G.px, G.py - 42, sk.icon + ' ' + sk.name, '#ffd76a', true);
  switch(w.wtype){
    case 'sword': // Танец клинка — ускоренная серия ударов
      P.skillBuffs.sword = sk.dur;
      burst(G.px, G.py, '#cfe8ff', 16, 90, .5, 2.5);
      break;
    case 'dagger': // Тень убийцы — невидимость + следующий удар критический
      P.skillBuffs.dagger = sk.dur;
      P.critReady = true;
      burst(G.px, G.py, '#3a3a55', 22, 110, .7, 3);
      break;
    case 'axe': // Круг мясника — круговой удар вокруг себя
      axeCleave();
      break;
    case 'spear': // Шквал копий — 4 быстрых выпада
      P.thrustsLeft = 4; P.thrustT = 0;
      P.act = 'thrust'; P.t = 0; P.hitSet = new Set();
      if(P.lock) P.facing = angTo(G.px, G.py, P.lock.x, P.lock.y);
      break;
    case 'greatsword': // Землетряс — удар в землю по площади
      P.act = 'slam'; P.t = 0; P.hitSet = new Set();
      if(P.lock) P.facing = angTo(G.px, G.py, P.lock.x, P.lock.y);
      break;
    case 'bow': // Дождь стрел — веер из 5 стрел
      arrowRain();
      break;
    case 'staff': // Вспышка маны — восстановление маны + усиление чар
      G.mp = Math.min(maxMp(), G.mp + maxMp() * .5);
      P.skillBuffs.staff = 8;
      burst(G.px, G.py, '#9b7fd0', 24, 130, .7, 3);
      floatText(G.px, G.py - 26, '+' + Math.floor(maxMp() * .5) + ' маны', '#b9a0ff');
      AudioSys.soul();
      break;
  }
}
function axeCleave(){
  const w = ITEMS[G.equip.weapon];
  const R = 120;
  shake = Math.max(shake, 8);
  AudioSys.slam();
  burst(G.px, G.py, '#c0392b', 30, 240, .5, 3.5);
  for(const e of W.enemies){
    if(e.state === 'dead') continue;
    if(dist(G.px, G.py, e.x, e.y) < R + e.d.size){
      let dmg = weaponDmg() * 2.2;
      if(w.bonusFire) dmg += w.bonusFire;
      damageEnemy(e, dmg, { knock:55, poiseBreak:true });
    }
  }
}
function arrowRain(){
  const w = ITEMS[G.equip.weapon];
  const a0 = P.facing;
  for(let i = -2; i <= 2; i++){
    const a = a0 + i * .16;
    W.projectiles.push({
      x:G.px + Math.cos(a) * 20, y:G.py + Math.sin(a) * 20,
      vx:Math.cos(a) * 540, vy:Math.sin(a) * 540,
      r:4, dmg:weaponDmg() * .62, owner:'player', ttl:1.5,
      color:'#e8d8a0', arrow:true, bonusFire:w.bonusFire || 0,
    });
  }
  AudioSys.swing();
}
function tryRoll(){
  if(G.state !== 'play' || P.act === 'roll' || P.act === 'stagger' || P.act === 'dead') return;
  if(P.act === 'attack' && P.phase !== 'rec') return;
  if(P.act === 'drink' || P.act === 'cast') return;
  const ratio = loadRatio();
  const fat = ratio >= .75;
  const cost = fat ? 26 : 18;
  if(G.stam < cost){ flashStam(); return; }
  G.stam -= cost; P.stamDelay = .6;
  const input = inputDir();
  P.rollDir = (input.x || input.y) ? Math.atan2(input.y, input.x) : P.facing;
  if(ratio < .35){ P.rollDur = .4; P.rollIf = [.03, .34]; P.rollDist = 175; }
  else if(!fat){ P.rollDur = .45; P.rollIf = [.05, .32]; P.rollDist = 150; }
  else { P.rollDur = .62; P.rollIf = [.08, .3]; P.rollDist = 120; }
  P.act = 'roll'; P.t = 0; P.blocking = false; P.atkBuf = null;
  AudioSys.roll();
  burst(G.px, G.py + 8, '#cbbfa0', 6, 50, .4, 2);
}
function tryDrink(){
  if(G.state !== 'play' || P.act !== 'idle') return;
  if(G.estus <= 0){ toast('🏺 Фляга пуста. Отдохните у костра.', 'warn'); return; }
  if(G.hp >= maxHp()){ toast('Здоровье уже полное.', 'warn'); return; }
  P.act = 'drink'; P.t = 0; P.drinkKind = 'estus'; P.drinkHealed = false;
  AudioSys.drink();
}
function tryCast(){
  if(G.state !== 'play' || P.act !== 'idle') return;
  if(!G.spells.length){ toast('✨ Нет изученных заклинаний. Загляните к чародейке Вейле.', 'warn'); return; }
  const sid = G.spells[G.spellSel];
  const sp = SPELLS[sid];
  if((P.cds[sid] || 0) > 0) return;
  if(G.stats.int < sp.req){ toast('⚠️ Нужно интеллекта: ' + sp.req, 'warn'); return; }
  if(G.mp < sp.cost){ toast('🔮 Не хватает маны', 'warn'); return; }
  G.mp -= sp.cost;
  P.act = 'cast'; P.t = 0; P.castSpell = sid; P.castDone = false;
  if(P.lock) P.facing = angTo(G.px, G.py, P.lock.x, P.lock.y);
}
function resolveCast(){
  const sid = P.castSpell, sp = SPELLS[sid];
  P.cds[sid] = sp.cd;
  const dmg = sp.dmg ? spellDmg(sp) : 0;
  if(sp.type === 'proj'){
    const a = P.facing;
    W.projectiles.push({
      x:G.px + Math.cos(a) * 22, y:G.py + Math.sin(a) * 22,
      vx:Math.cos(a) * sp.speed, vy:Math.sin(a) * sp.speed,
      r:7, dmg, owner:'player', ttl:2.6, color:sp.color,
      explode:sp.explode || 0, slow:sp.slow || 0, homing:sp.homing, spell:sid,
    });
    if(sid === 'firebolt') AudioSys.fire(); else if(sid === 'ice') AudioSys.ice(); else AudioSys.soul();
  } else if(sp.type === 'self'){
    if(sp.heal){
      const h = Math.floor(maxHp() * sp.heal * (1 + G.stats.int * .015));
      G.hp = Math.min(maxHp(), G.hp + h);
      floatText(G.px, G.py - 34, '+' + h, '#7dff9e', true);
      burst(G.px, G.py, '#7dff9e', 20, 80, .8, 3);
      AudioSys.heal();
    }
    if(sp.buff){
      G.buffs.stoneskin = sp.buff.dur;
      burst(G.px, G.py, '#c9b28a', 18, 70, .8, 3);
      toast('🪨 Каменная кожа: +' + sp.buff.def + ' защиты (' + sp.buff.dur + ' с)', 'item');
      AudioSys.ice();
    }
  } else if(sp.type === 'aoe'){
    burst(G.px, G.py, sp.color, 40, 260, .6, 4);
    shake = Math.max(shake, 6);
    AudioSys.fire();
    for(const e of W.enemies){
      if(e.state === 'dead') continue;
      if(dist(G.px, G.py, e.x, e.y) < sp.radius + e.d.size){
        damageEnemy(e, dmg, { knock:14 });
      }
    }
  } else if(sp.type === 'beam'){
    let target = P.lock && P.lock.state !== 'dead' ? P.lock : null;
    if(!target){
      let best = sp.range;
      for(const e of W.enemies){
        if(e.state === 'dead') continue;
        const d = dist(G.px, G.py, e.x, e.y);
        if(d < best){ best = d; target = e; }
      }
    }
    if(target && dist(G.px, G.py, target.x, target.y) < sp.range + 60){
      W.projectiles.push({ beam:true, x:G.px, y:G.py, tx:target.x, ty:target.y, ttl:.22, t:0, color:sp.color, owner:'player' });
      damageEnemy(target, dmg, {});
      burst(target.x, target.y, sp.color, 24, 180, .5, 3);
      shake = Math.max(shake, 5);
      AudioSys.lightning();
    } else {
      const a = P.facing;
      W.projectiles.push({ beam:true, x:G.px, y:G.py, tx:G.px + Math.cos(a) * sp.range, ty:G.py + Math.sin(a) * sp.range, ttl:.22, t:0, color:sp.color, owner:'player' });
      AudioSys.lightning();
      for(const e of W.enemies){
        if(e.state === 'dead') continue;
        const d = dist(G.px, G.py, e.x, e.y);
        if(d < sp.range && Math.abs(angDiff(a, angTo(G.px, G.py, e.x, e.y))) < .3)
          damageEnemy(e, dmg, {});
      }
    }
  }
}
function flashStam(){
  const el = $('barStam');
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
}

/* ---------- Урон по врагу ---------- */
function damageEnemy(e, dmg, opts){
  if(e.state === 'dead') return;
  opts = opts || {};
  dmg *= 100 / (100 + e.d.def);
  dmg *= rnd(.92, 1.08);
  dmg = Math.max(1, Math.floor(dmg));
  e.hp -= dmg;
  e.hitFlash = .15;
  e.aggroed = true;
  floatText(e.x, e.y - e.d.size - 8, dmg, '#ffd76a');
  burst(e.x, e.y, e.d.kind === 'undead' ? '#d8d4c8' : '#c0392b', 8, 120, .4, 2.5);
  AudioSys.hit();
  if(opts.slow) e.slow = Math.max(e.slow, opts.slow);
  if(opts.knock){
    const a = angTo(G.px, G.py, e.x, e.y);
    moveCircle(e, Math.cos(a) * opts.knock, Math.sin(a) * opts.knock, e.d.size);
  }
  e.poiseAcc += dmg;
  if(opts.poiseBreak) e.poiseAcc += e.d.poise; // гарантированный слом стойки
  if(e.poiseAcc > e.d.poise && !e.d.boss){
    e.state = 'stagger'; e.t = 0; e.poiseAcc = 0;
  }
  if(e.hp <= 0) killEnemy(e);
}
function killEnemy(e){
  e.state = 'dead'; e.deadT = 0; e.hp = 0;
  G.kills++;
  let souls = e.d.souls;
  if(isNight()) souls = Math.floor(souls * 1.5);
  souls = Math.floor(souls * (1 + ringVal('souls')));
  G.souls += souls;
  floatText(e.x, e.y - 20, '+' + souls + ' душ', '#bfe8ff', true);
  soulWisps(e.x, e.y, e.d.boss ? 30 : 8);
  AudioSys.soul();
  questEvent('kill', e.type);
  if(e.type === 'bandit_chief'){ giveItem('resin', 1); toast('💀 Атаман Грыж повержен!', 'quest'); }
  if(e.d.boss){
    G.bosses[e.type] = true;
    shake = Math.max(shake, 12);
    AudioSys.boss();
    if(e.type === 'boss_guardian'){
      toast('💀 Костяной Страж повержен!', 'quest');
      giveItem('dawn_heart', 1);
      questEvent('boss', 'boss_guardian');
    }
    if(e.type === 'boss_devourer'){
      toast('🌅 Пожиратель Рассвета уничтожен!', 'quest');
      giveItem('dawnblade', 1);
      questEvent('boss', 'boss_devourer');
      setTimeout(startEnding, 1800);
    }
  }
  if(P.lock === e) P.lock = null;
  updateQuestTracker();
}

/* ---------- Урон по игроку ---------- */
function damagePlayer(dmg, srcX, srcY, opts){
  if(G.state !== 'play' || P.act === 'dead') return;
  if(P.iframes > 0){ floatText(G.px, G.py - 30, 'перекат!', '#9fe8ff'); return; }
  opts = opts || {};
  if(isNight()) dmg *= 1.25;
  let blocked = false;
  const shield = G.equip.shield ? ITEMS[G.equip.shield] : null;
  const w = ITEMS[G.equip.weapon];
  const canBlock = P.blocking && shield && w && w.wtype !== 'bow';
  if(canBlock && srcX !== undefined){
    const aTo = angTo(G.px, G.py, srcX, srcY);
    if(Math.abs(angDiff(P.facing, aTo)) < 1.25){
      const cost = dmg * .55 * (1 - shield.stability / 160);
      if(G.stam >= cost){
        G.stam -= cost; P.stamDelay = .7;
        dmg *= 1 - shield.block;
        blocked = true;
        AudioSys.block();
        burst(G.px + Math.cos(aTo) * 18, G.py + Math.sin(aTo) * 18, '#ffe9a0', 10, 130, .35, 2);
      } else {
        G.stam = 0;
        P.act = 'stagger'; P.t = 0;
        dmg *= .5;
        toast('🛡️ Защита сломлена!', 'warn');
        floatText(G.px, G.py - 34, 'GUARD BREAK', '#ff6a3a', true);
      }
    }
  }
  dmg *= 100 / (100 + armorDef());
  dmg = Math.max(1, Math.floor(dmg * rnd(.92, 1.08)));
  G.hp -= dmg;
  P.hurtFlash = .25;
  shake = Math.max(shake, blocked ? 2 : 5);
  if(!blocked){
    floatText(G.px, G.py - 34, '-' + dmg, '#ff6a5a');
    burst(G.px, G.py, '#c0392b', 10, 130, .45, 2.5);
    AudioSys.hurt();
    if(P.act === 'attack' && P.phase === 'wind' && dmg > 25){ /* удар сбит */ P.act = 'idle'; }
  }
  if(G.hp <= 0){ G.hp = 0; playerDie(); }
}
function playerDie(){
  P.act = 'dead';
  G.state = 'dead';
  G.deaths++;
  AudioSys.death();
  if(G.souls > 0){
    G.bloodstain = { map:G.mapId, x:G.px, y:G.py, souls:G.souls };
    G.souls = 0;
  }
  $('deathScreen').classList.remove('hidden');
  saveGame();
  setTimeout(respawn, 2800);
}
function respawn(){
  $('deathScreen').classList.add('hidden');
  const bf = MAPS[G.bonfire.map].bonfires.find(b => b.id === G.bonfire.id);
  G.hp = maxHp(); G.stam = maxStam(); G.mp = maxMp(); G.estus = G.estusMax;
  G.buffs.resin = 0; G.buffs.stoneskin = 0;
  resetRuntime();
  G.state = 'play';
  loadMap(G.bonfire.map, { x:bf.x, y:bf.y + 1 });
  if(G.bloodstain) toast('💠 Души остались на месте гибели. Вернитесь за ними.', 'warn');
  saveGame();
}

/* ================= Ввод ================= */
const keys = {};
let mouseX = 0, mouseY = 0;
function inputDir(){
  let x = 0, y = 0;
  if(keys['KeyW'] || keys['ArrowUp']) y -= 1;
  if(keys['KeyS'] || keys['ArrowDown']) y += 1;
  if(keys['KeyA'] || keys['ArrowLeft']) x -= 1;
  if(keys['KeyD'] || keys['ArrowRight']) x += 1;
  if(x && y){ x *= .7071; y *= .7071; }
  return { x, y };
}
window.addEventListener('keydown', e => {
  AudioSys.ensure();
  if(e.code === 'Tab'){ e.preventDefault(); toggleMenu(); return; }
  if(e.code === 'Escape'){ e.preventDefault(); handleEscape(); return; }
  if(overlayOpen()){
    keys[e.code] = true;
    return;
  }
  if(e.repeat){ keys[e.code] = true; return; }
  keys[e.code] = true;
  if(G.state !== 'play') return;
  switch(e.code){
    case 'Space': e.preventDefault(); tryRoll(); break;
    case 'KeyJ': tryAttack(false); break;
    case 'KeyK': tryAttack(true); break;
    case 'KeyR': tryDrink(); break;
    case 'KeyF': tryCast(); break;
    case 'KeyE': interact(); break;
    case 'KeyQ': toggleLock(); break;
    case 'KeyX': cycleWeapon(1); break;
    case 'KeyM': toggleMute(); break;
    case 'KeyI': toggleMenu(); break;
    default:
      if(e.code.startsWith('Digit')){
        const n = +e.code.slice(5) - 1;
        if(n >= 0 && n < G.spells.length){ G.spellSel = n; AudioSys.ui(); }
      }
  }
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
canvas.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
canvas.addEventListener('mousedown', e => {
  AudioSys.ensure();
  if(overlayOpen() || G.state !== 'play') return;
  if(e.button === 0) tryAttack(false);
  if(e.button === 2) tryAttack(true);
});
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('wheel', e => {
  if(overlayOpen() || G.state !== 'play') return;
  cycleWeapon(e.deltaY > 0 ? 1 : -1);
}, { passive:true });
window.addEventListener('blur', () => { for(const k in keys) keys[k] = false; });

function toggleLock(){
  if(P.lock){ P.lock = null; return; }
  let best = null, bd = 470;
  for(const e of W.enemies){
    if(e.state === 'dead') continue;
    const d = dist(G.px, G.py, e.x, e.y);
    if(d < bd){ bd = d; best = e; }
  }
  if(best){ P.lock = best; AudioSys.ui(); }
}

/* ================= Взаимодействие ================= */
function nearestInteract(){
  let best = null, bd = 1e9, label = '';
  for(const n of W.npcs){
    const d = dist(G.px, G.py, n.x, n.y);
    if(d < 78 && d < bd){ bd = d; best = { kind:'npc', o:n }; label = 'Поговорить: ' + NPCS[n.id].name; }
  }
  for(const b of W.bonfires){
    const d = dist(G.px, G.py, b.x, b.y);
    if(d < 88 && d < bd){ bd = d; best = { kind:'bonfire', o:b }; label = 'Костёр: ' + b.name; }
  }
  for(const c of W.chests){
    if(G.chests[c.id]) continue;
    const d = dist(G.px, G.py, c.x, c.y);
    if(d < 70 && d < bd){ bd = d; best = { kind:'chest', o:c }; label = 'Открыть сундук'; }
  }
  return best ? { ...best, label } : null;
}
function interact(){
  const n = nearestInteract();
  if(!n) return;
  if(n.kind === 'npc') openDialog(n.o.id);
  else if(n.kind === 'bonfire') openBonfire(n.o);
  else if(n.kind === 'chest') openChest(n.o);
}
function openChest(c){
  G.chests[c.id] = true;
  AudioSys.chest();
  burst(c.x, c.y, '#ffd76a', 20, 110, .7, 3);
  if(c.souls){ G.souls += c.souls; floatText(c.x, c.y - 24, '+' + c.souls + ' душ', '#bfe8ff'); }
  for(const [id, n] of c.items) giveItem(id, n);
  saveGame();
}
function checkPickups(){
  for(let i = W.pickups.length - 1; i >= 0; i--){
    const p = W.pickups[i];
    if(dist(G.px, G.py, p.x, p.y) < 36){
      G.pickups[p.id] = true;
      W.pickups.splice(i, 1);
      giveItem(p.item, 1);
      AudioSys.pickup();
      burst(p.x, p.y, '#ffd76a', 10, 80, .5, 2);
    }
  }
  if(G.bloodstain && G.bloodstain.map === G.mapId && dist(G.px, G.py, G.bloodstain.x, G.bloodstain.y) < 42){
    G.souls += G.bloodstain.souls;
    floatText(G.px, G.py - 36, '+' + fmt(G.bloodstain.souls) + ' душ возвращено', '#bfe8ff', true);
    toast('💠 Души возвращены: ' + fmt(G.bloodstain.souls), 'quest');
    G.bloodstain = null;
    AudioSys.levelup();
    saveGame();
  }
}
let exitToastCd = 0;
function checkExits(){
  const tx = Math.floor(G.px / TILE), ty = Math.floor(G.py / TILE);
  for(const ex of W.map.exits){
    if(tx >= ex.x && tx < ex.x + ex.w && ty >= ex.y && ty < ex.y + ex.h){
      if(ex.lock){
        let ok = true;
        if(ex.lock.item && !countItem(ex.lock.item)) ok = false;
        if(ex.lock.quest){
          const q = G.quests[ex.lock.quest];
          if(!q || q.stage < ex.lock.stage) ok = false;
        }
        if(!ok){
          if(exitToastCd <= 0){ toast('🔒 ' + ex.lock.msg, 'warn'); exitToastCd = 2.5; AudioSys.block(); }
          const cx = (ex.x + ex.w / 2) * TILE, cy = (ex.y + ex.h / 2) * TILE;
          const a = angTo(cx, cy, G.px, G.py);
          G.px += Math.cos(a) * 6; G.py += Math.sin(a) * 6;
          return;
        }
        if(ex.lock.item && ex.lock.quest){ /* врата: ключ остаётся */ }
        else if(ex.lock.item){ takeItem(ex.lock.item, 1); toast('🗝️ Замок открыт.', 'item'); }
        AudioSys.gate();
      }
      startTravel(ex.to, ex.spawn);
      return;
    }
  }
}
function startTravel(to, spawn){
  if(fadeDir !== 0) return;
  pendingTravel = { to, spawn };
  fadeDir = 1;
}
function doTravel(){
  const t = pendingTravel; pendingTravel = null;
  loadMap(t.to, t.spawn);
  saveGame();
  fadeDir = -1;
}

/* ================= Обновление игрока ================= */
function updatePlayer(dt){
  const m = W.map;
  P.iframes = Math.max(0, P.iframes - dt);
  P.hurtFlash = Math.max(0, P.hurtFlash - dt);
  P.stamDelay = Math.max(0, P.stamDelay - dt);
  for(const k in P.cds) P.cds[k] = Math.max(0, P.cds[k] - dt);
  G.buffs.resin = Math.max(0, G.buffs.resin - dt);
  G.buffs.stoneskin = Math.max(0, G.buffs.stoneskin - dt);
  exitToastCd = Math.max(0, exitToastCd - dt);

  // регенерация
  if(P.stamDelay <= 0 && !P.blocking && P.act !== 'attack')
    G.stam = Math.min(maxStam(), G.stam + 26 * (1 + ringVal('stamRegen')) * dt);
  G.mp = Math.min(maxMp(), G.mp + (2.5 + G.stats.int * .05) * dt);

  // захват цели
  if(P.lock){
    if(P.lock.state === 'dead' || dist(G.px, G.py, P.lock.x, P.lock.y) > 580) P.lock = null;
  }

  // направление взгляда
  if(P.act !== 'attack' && P.act !== 'roll' && P.act !== 'stagger'){
    if(P.lock) P.facing = angTo(G.px, G.py, P.lock.x, P.lock.y);
    else {
      const wx = mouseX + cam.x - VW / 2, wy = mouseY + cam.y - VH / 2;
      P.facing = angTo(G.px, G.py, wx, wy);
    }
  }

  P.blocking = !!keys['KeyC'] && P.act === 'idle' && !!G.equip.shield && ITEMS[G.equip.weapon].wtype !== 'bow';

  const dir = inputDir();
  let speed = 175;
  if(P.lock) speed *= .85;
  if(P.blocking) speed *= .45;

  if(P.act === 'idle'){
    if(dir.x || dir.y){
      movePlayer(dir.x * speed * dt, dir.y * speed * dt, 14);
      P.walkCycle += dt * 10;
    }
    if(P.atkBuf !== null){ const h = P.atkBuf; P.atkBuf = null; tryAttack(h); }
  }
  else if(P.act === 'attack'){
    P.t += dt;
    const mv = P.move;
    // небольшой шаг вперёд в активной фазе
    if(P.phase === 'wind' && P.t >= mv.wind){
      P.phase = 'act'; P.t = 0;
      const w = ITEMS[G.equip.weapon];
      if(mv.proj){
        const a = P.facing;
        W.projectiles.push({
          x:G.px + Math.cos(a) * 20, y:G.py + Math.sin(a) * 20,
          vx:Math.cos(a) * 560, vy:Math.sin(a) * 560,
          r:4, dmg:weaponDmg() * mv.mult, owner:'player', ttl:1.4,
          color:'#e8d8a0', arrow:true, bonusFire:w.bonusFire || 0,
        });
        AudioSys.swing();
      }
    } else if(P.phase === 'act'){
      if(!mv.proj){
        const w = ITEMS[G.equip.weapon];
        for(const e of W.enemies){
          if(e.state === 'dead' || P.hitSet.has(e.uid)) continue;
          const d = dist(G.px, G.py, e.x, e.y);
          if(d < mv.range + e.d.size && Math.abs(angDiff(P.facing, angTo(G.px, G.py, e.x, e.y))) < mv.arc / 2 + .2){
            P.hitSet.add(e.uid);
            let dmg = weaponDmg() * mv.mult;
            const opts = { knock:P.heavy ? 10 : 3 };
            if(w.effect === 'slow') opts.slow = 2;
            if(w.bonusFire){ dmg += w.bonusFire; burst(e.x, e.y, '#ffb347', 8, 100, .4, 2); }
            damageEnemy(e, dmg, opts);
            if(P.heavy) shake = Math.max(shake, 3);
          }
        }
      }
      // лёгкое продвижение
      movePlayer(Math.cos(P.facing) * 40 * dt, Math.sin(P.facing) * 40 * dt, 14);
      if(P.t >= mv.act){ P.phase = 'rec'; P.t = 0; }
    } else if(P.phase === 'rec'){
      if(dir.x || dir.y) movePlayer(dir.x * speed * .35 * dt, dir.y * speed * .35 * dt, 14);
      if(P.t >= mv.rec){
        P.act = 'idle';
        if(P.atkBuf !== null){ const h = P.atkBuf; P.atkBuf = null; tryAttack(h); }
      }
    }
    P.swingAnim = P.phase === 'wind' ? -0.6 : P.phase === 'act' ? 1 : .4;
  }
  else if(P.act === 'roll'){
    P.t += dt;
    const k = P.t / P.rollDur;
    const spd = P.rollDist / P.rollDur * (1.4 - k * .8);
    movePlayer(Math.cos(P.rollDir) * spd * dt, Math.sin(P.rollDir) * spd * dt, 14);
    if(P.t >= P.rollIf[0] && P.t <= P.rollIf[1]) P.iframes = .05;
    if(P.t >= P.rollDur){ P.act = 'idle'; }
  }
  else if(P.act === 'drink'){
    P.t += dt;
    const dur = P.drinkKind === 'estus' ? 1.15 : 1.0;
    if(dir.x || dir.y) movePlayer(dir.x * speed * .35 * dt, dir.y * speed * .35 * dt, 14);
    if(!P.drinkHealed && P.t >= dur * .7){
      P.drinkHealed = true;
      if(P.drinkKind === 'estus'){
        G.estus--;
        const h = Math.floor(maxHp() * .45);
        G.hp = Math.min(maxHp(), G.hp + h);
        floatText(G.px, G.py - 34, '+' + h, '#ffb347', true);
        burst(G.px, G.py, '#ffb347', 14, 70, .7, 3);
        AudioSys.heal();
      } else {
        const h = Math.floor(maxHp() * .2);
        G.hp = Math.min(maxHp(), G.hp + h);
        floatText(G.px, G.py - 34, '+' + h, '#7dff9e');
        AudioSys.heal();
      }
    }
    if(P.t >= dur) P.act = 'idle';
  }
  else if(P.act === 'cast'){
    P.t += dt;
    const sp = SPELLS[P.castSpell];
    const dur = sp.type === 'self' && sp.heal ? .9 : .55;
    if(dir.x || dir.y) movePlayer(dir.x * speed * .3 * dt, dir.y * speed * .3 * dt, 14);
    if(!P.castDone && P.t >= dur * .8){ P.castDone = true; resolveCast(); }
    if(P.t >= dur) P.act = 'idle';
  }
  else if(P.act === 'stagger'){
    P.t += dt;
    if(P.t >= 1.2) P.act = 'idle';
  }

  checkPickups();
  checkExits();
}

/* ================= ИИ врагов (тактический) =================
   Враги читают замах игрока: уходят перекатом из-под удара,
   отступают, расходятся по флангам и стрейфят, вместо того чтобы
   идти прямо в клинок. Поведение зависит от типа врага. */

// игрок сейчас замахивается melee-атакой?
function playerThreatening(){
  if(P.act !== 'attack' || P.move.proj) return false;
  return P.phase === 'wind' || (P.phase === 'act' && P.t < .08);
}
function playerAttacking(){
  return (P.act === 'attack' && !P.move.proj) || P.act === 'slam' || P.act === 'thrust';
}
// шанс "прочитать" удар зависит от ловкости врага (мини-боссы читают лучше)
function readChance(e){
  let c = clamp((e.d.speed - 110) / 260, .12, .55);
  if(e.d.mini) c += .15;
  if(e.d.boss) c -= .3;          // боссы не убегают — они стоят своего
  if(e.hp < e.hpMax * .35) c += .12; // раненые осторожнее
  return c;
}
function enemyRoll(e, dirA){
  e.state = 'evade'; e.t = 0;
  e.rollDur = .5;
  e.rollDirA = dirA;
  e.iframes = true;
  AudioSys.evade();
  burst(e.x, e.y + 6, '#9aa4b8', 6, 60, .35, 2);
}
// реакция на замах: перекат в сторону / назад / выпад назад
function enemyReact(e, dd, aToP){
  const r = Math.random();
  if(r < .45){
    // перекат вбок от линии удара (в сторону, куда смотрит враг)
    const side = Math.random() < .5 ? 1 : -1;
    enemyRoll(e, aToP + side * Math.PI / 2 + rnd(-.35, .35));
  } else if(r < .75){
    enemyRoll(e, aToP + Math.PI + rnd(-.6, .6)); // назад
  } else {
    // быстрый отход без переката
    e.state = 'retreat'; e.t = 0; e.retreatDur = rnd(.5, .8);
  }
  e.evadeCd = rnd(1.8, 3.2);
  e.strafeT = .3; // сменить тактику после ухода
}
// движение с обходом препятствий: если впереди стена — скользим вдоль неё
function smartMove(e, dx, dy, r){
  const bx = e.x, by = e.y;
  moveCircle(e, dx, dy, r);
  if(Math.abs(e.x - bx) < Math.abs(dx) * .25 && Math.abs(dy) > 1){
    moveCircle(e, 0, dy * 1.2, r); // упёрся по X — compensate по Y
  } else if(Math.abs(e.y - by) < Math.abs(dy) * .25 && Math.abs(dx) > 1){
    moveCircle(e, dx * 1.2, 0, r);
  }
}
function enemySpeed(e){
  let s = e.d.speed;
  if(e.slow > 0) s *= .45;
  if(e.d.boss && e.phase2) s *= 1.3;
  if(e.state === 'retreat') s *= 1.15;
  return s;
}
function startEnemyAttack(e, kind){
  e.state = 'windup'; e.t = 0; e.atkKind = kind; e.hitPlayer = false;
  e.lunge = false;
  e.facing = angTo(e.x, e.y, G.px, G.py);
}
function enemyStrike(e){
  const d = e.d;
  if(e.atkKind === 'sweep' || e.atkKind === 'melee'){
    const range = d.range + (e.d.boss ? 20 : 0) + (e.lunge ? 36 : 0);
    const arc = e.d.boss ? 2.6 : 1.9;
    const dd = dist(e.x, e.y, G.px, G.py);
    if(dd < range + 14 && Math.abs(angDiff(e.facing, angTo(e.x, e.y, G.px, G.py))) < arc / 2 + .25){
      damagePlayer(d.dmg * (e.atkKind === 'sweep' ? 1.15 : 1), e.x, e.y);
    }
    burst(e.x + Math.cos(e.facing) * range * .6, e.y + Math.sin(e.facing) * range * .6, '#ffffff', 5, 90, .25, 2);
    AudioSys.swing();
  }
  else if(e.atkKind === 'shoot'){
    const a = angTo(e.x, e.y, G.px, G.py);
    const pr = d.proj;
    W.projectiles.push({
      x:e.x + Math.cos(a) * (d.size + 6), y:e.y + Math.sin(a) * (d.size + 6),
      vx:Math.cos(a) * pr.speed, vy:Math.sin(a) * pr.speed,
      r:pr.r, dmg:d.dmg, owner:'enemy', ttl:3, color:pr.color, homing:pr.homing,
    });
    AudioSys.fire();
  }
  else if(e.atkKind === 'volley'){
    const a = angTo(e.x, e.y, G.px, G.py);
    for(let i = -1; i <= 1; i++){
      const aa = a + i * .28;
      W.projectiles.push({
        x:e.x + Math.cos(aa) * (d.size + 6), y:e.y + Math.sin(aa) * (d.size + 6),
        vx:Math.cos(aa) * 300, vy:Math.sin(aa) * 300,
        r:7, dmg:d.dmg * .7, owner:'enemy', ttl:2.6, color:'#e8e2d0', bone:true,
      });
    }
    AudioSys.swing();
  }
  else if(e.atkKind === 'burst'){
    const n = e.phase2 ? 12 : 8;
    for(let i = 0; i < n; i++){
      const a = i / n * TAU + rnd(-.1, .1);
      W.projectiles.push({
        x:e.x + Math.cos(a) * (d.size + 6), y:e.y + Math.sin(a) * (d.size + 6),
        vx:Math.cos(a) * 240, vy:Math.sin(a) * 240,
        r:8, dmg:d.dmg * .65, owner:'enemy', ttl:3, color:'#9b59d0',
      });
    }
    AudioSys.boss();
  }
  else if(e.atkKind === 'wave'){
    burst(e.x, e.y, '#9b59d0', 36, 240, .6, 4);
    shake = Math.max(shake, 7);
    AudioSys.fire();
    if(dist(e.x, e.y, G.px, G.py) < 160) damagePlayer(d.dmg * .9, e.x, e.y);
  }
  else if(e.atkKind === 'dash'){
    const a = angTo(e.x, e.y, G.px, G.py);
    e.dashVX = Math.cos(a) * 560; e.dashVY = Math.sin(a) * 560;
    AudioSys.boss();
  }
}
function updateEnemy(e, dt){
  const d = e.d;
  if(e.state === 'dead'){ e.deadT += dt; return; }
  e.hitFlash = Math.max(0, e.hitFlash - dt);
  e.slow = Math.max(0, e.slow - dt);
  e.cd = Math.max(0, e.cd - dt);
  e.poiseAcc = Math.max(0, e.poiseAcc - dt * 20);
  const dd = dist(e.x, e.y, G.px, G.py);
  const aggroR = d.aggro * (isNight() ? 1.2 : 1);
  if(!e.aggroed && dd < aggroR && G.state === 'play'){
    e.aggroed = true;
    if(d.boss){ AudioSys.boss(); shake = Math.max(shake, 6); toast('⚔️ ' + d.name, 'warn'); }
  }
  if(d.boss && !e.phase2 && e.hp < e.hpMax * (e.type === 'boss_devourer' ? .4 : .5)){
    e.phase2 = true;
    toast('💢 ' + d.name + ' в ярости!', 'warn');
    AudioSys.boss(); shake = Math.max(shake, 8);
    if(e.type === 'boss_guardian' && !e.summoned){
      e.summoned = true;
      W.enemies.push(makeEnemy('skeleton', e.x - 70, e.y + 50));
      W.enemies.push(makeEnemy('skeleton', e.x + 70, e.y + 50));
      W.enemies[W.enemies.length - 1].aggroed = true;
      W.enemies[W.enemies.length - 2].aggroed = true;
    }
  }

  if(e.state === 'idle'){
    e.wanderT -= dt;
    if(e.wanderT <= 0){ e.wanderT = rnd(1.5, 4); e.wanderDir = rnd(0, TAU); }
    if(e.wanderT > 1){
      moveCircle(e, Math.cos(e.wanderDir) * d.speed * .25 * dt, Math.sin(e.wanderDir) * d.speed * .25 * dt, d.size);
      e.facing = lerpAngle(e.facing, e.wanderDir, dt * 3);
    }
    if(e.aggroed) e.state = 'chase';
  }
  else if(e.state === 'chase'){
    if(!e.aggroed){ e.state = 'idle'; return; }
    const spd = enemySpeed(e);
    const aToP = angTo(e.x, e.y, G.px, G.py);

    /* ---- РЕАКЦИЯ НА ЗАМАХ ИГРОКА: перекат / отход ---- */
    e.evadeCd = Math.max(0, (e.evadeCd || 0) - dt);
    if(!d.boss && e.evadeCd <= 0 && playerThreatening() &&
       dd < P.move.range + d.size + 46 && !e.slow){
      // враг "видит" замах и уходит из-под удара
      if(Math.random() < readChance(e)) enemyReact(e, dd, aToP);
      else e.evadeCd = .7; // не успел прочитать — попробует в следующий раз
    }

    /* ---- ближний бой: фланги, стрейфы, ложные сближения ---- */
    if(d.behavior === 'melee' || d.behavior === 'boss1' || d.behavior === 'boss2'){
      const engage = d.range * (d.behavior === 'melee' ? .78 : .9);
      // сторона обхода периодически меняется; при атаке игрока — активнее уводим бок
      e.flankT -= dt;
      if(e.flankT <= 0){
        e.flankT = rnd(1.4, 3.2) * (playerAttacking() ? .5 : 1);
        if(Math.random() < .6) e.flankSide = -e.flankSide;
      }
      // волки и упыры любят нырять в атаку рывком
      const brawler = e.type === 'wolf' || e.type === 'ghoul' || d.mini;

      if(dd > engage + 40){
        // сближение по дуге, а не直线 в клинок
        const arcOff = clamp((dd - engage) / 220, 0, 1) * .9 * e.flankSide;
        const a = aToP + arcOff;
        smartMove(e, Math.cos(a) * spd * dt, Math.sin(a) * spd * dt, d.size);
        e.facing = lerpAngle(e.facing, aToP, dt * 8);
      } else {
        // дистанция боя: держим круг вокруг игрока
        e.strafeT -= dt;
        if(e.strafeT <= 0){ e.strafeT = rnd(.8, 2.0); if(Math.random() < .5) e.strafeDir = -e.strafeDir; }
        let mvx = 0, mvy = 0;
        if(playerAttacking() && !d.boss){
          // под атакой отходим по касательной назад
          const ta = aToP + Math.PI * .72 * e.strafeDir;
          mvx = Math.cos(ta) * spd * .9; mvy = Math.sin(ta) * spd * .9;
        } else if(dd < engage * .62){
          // слишком плотно — чуть отпускаем
          mvx = -Math.cos(aToP) * spd * .5; mvy = -Math.sin(aToP) * spd * .5;
        } else {
          // чистый стрейф вокруг игрока
          const ta = aToP + Math.PI / 2 * e.strafeDir;
          mvx = Math.cos(ta) * spd * .55; mvy = Math.sin(ta) * spd * .55;
        }
        smartMove(e, mvx * dt, mvy * dt, d.size);
        e.facing = lerpAngle(e.facing, aToP, dt * 10);
      }

      if(e.cd <= 0){
        if(d.behavior === 'boss1'){
          if(dd < d.range + 20) startEnemyAttack(e, 'sweep');
          else startEnemyAttack(e, 'volley');
        } else if(d.behavior === 'boss2'){
          const roll = Math.random();
          if(dd < d.range + 10) startEnemyAttack(e, roll < .5 ? 'sweep' : 'wave');
          else if(dd < 340 && roll < .55) startEnemyAttack(e, 'dash');
          else startEnemyAttack(e, 'burst');
        } else if(dd < d.range + 8){
          // добиваем убегающего длинным выпадом
          e.lunge = brawler && dd > d.range * .55 && Math.random() < .5;
          startEnemyAttack(e, Math.random() < .35 ? 'sweep' : 'melee');
        }
      }
    } else { // ranged / caster — держат дистанцию и kite-ят
      const want = d.range * .7;
      const a = aToP;
      e.strafeT -= dt;
      if(e.strafeT <= 0){ e.strafeT = rnd(1, 2.4); if(Math.random() < .5) e.strafeDir = -e.strafeDir; }
      if(dd < want * .55) smartMove(e, -Math.cos(a) * spd * dt, -Math.sin(a) * spd * dt, d.size);
      else if(dd > d.range * .95) smartMove(e, Math.cos(a) * spd * dt, Math.sin(a) * spd * dt, d.size);
      else {
        const sa = a + Math.PI / 2 * e.strafeDir + (playerAttacking() ? Math.PI * .25 * e.strafeDir : 0);
        smartMove(e, Math.cos(sa) * spd * (playerAttacking() ? .8 : .45) * dt, Math.sin(sa) * spd * .45 * dt, d.size);
      }
      if(e.cd <= 0 && dd < d.range + 40) startEnemyAttack(e, 'shoot');
    }
    if(dd > aggroR * 2.2 && !d.boss){ e.aggroed = false; e.state = 'idle'; }
  }
  /* ---- перекат-уклонение ---- */
  else if(e.state === 'evade'){
    e.t += dt;
    const k = e.t / e.rollDur;
    const spd = d.speed * (1.5 - k * .7);
    // направление слегка доворачиваем к текущему положению игрока (чтоб не в стену)
    if(k < .4) e.rollDirA = lerpAngle(e.rollDirA, angTo(e.x, e.y, G.px, G.py) + Math.PI / 2 * e.strafeDir, dt * 1.5);
    moveCircle(e, Math.cos(e.rollDirA) * spd * dt, Math.sin(e.rollDirA) * spd * dt, d.size);
    if(e.t >= e.rollDur){
      e.state = 'chase'; e.iframes = false;
      e.facing = angTo(e.x, e.y, G.px, G.py);
    }
  }
  /* ---- отход без переката ---- */
  else if(e.state === 'retreat'){
    e.t += dt;
    const a = angTo(e.x, e.y, G.px, G.py) + Math.PI;
    const spd = enemySpeed(e);
    smartMove(e, Math.cos(a) * spd * dt, Math.sin(a) * spd * dt, d.size);
    e.facing = lerpAngle(e.facing, angTo(e.x, e.y, G.px, G.py), dt * 6);
    if(e.t >= e.retreatDur) e.state = 'chase';
  }
  else if(e.state === 'windup'){
    e.t += dt;
    const wind = d.windup * (e.phase2 ? .75 : 1) * (e.atkKind === 'dash' ? .7 : 1);
    if(e.atkKind !== 'dash') e.facing = lerpAngle(e.facing, angTo(e.x, e.y, G.px, G.py), dt * 4);
    if(e.lunge && e.t > wind * .45){
      // короткий шаг-выпад в момент замаха
      const a = e.facing;
      moveCircle(e, Math.cos(a) * d.speed * 1.3 * dt, Math.sin(a) * d.speed * 1.3 * dt, d.size);
    }
    if(e.t >= wind){
      e.state = 'strike'; e.t = 0;
      enemyStrike(e);
    }
  }
  else if(e.state === 'strike'){
    e.t += dt;
    if(e.atkKind === 'dash'){
      moveCircle(e, e.dashVX * dt, e.dashVY * dt, d.size);
      if(!e.hitPlayer && dist(e.x, e.y, G.px, G.py) < d.size + 20){
        e.hitPlayer = true;
        damagePlayer(d.dmg * 1.1, e.x, e.y);
      }
      if(e.t >= .38){ e.state = 'recover'; e.t = 0; }
    } else if(e.t >= d.active){
      e.state = 'recover'; e.t = 0;
    }
  }
  else if(e.state === 'recover'){
    e.t += dt;
    if(e.t >= d.recover){
      e.state = 'chase';
      e.cd = d.cooldown * (e.phase2 ? .7 : 1) * rnd(.85, 1.15);
    }
  }
  else if(e.state === 'stagger'){
    e.t += dt;
    if(e.t >= .8){ e.state = 'chase'; e.aggroed = true; }
  }

  // расталкивание врагов
  for(const o of W.enemies){
    if(o === e || o.state === 'dead') continue;
    const dd2 = dist(e.x, e.y, o.x, o.y);
    const min = e.d.size + o.d.size;
    if(dd2 < min && dd2 > .01){
      const a = angTo(o.x, o.y, e.x, e.y);
      const push = (min - dd2) * .5;
      e.x += Math.cos(a) * push; e.y += Math.sin(a) * push;
    }
  }
}
function lerpAngle(a, b, t){ return a + angDiff(b, a) * clamp(t, 0, 1); }

/* ================= Снаряды ================= */
function updateProjectiles(dt){
  for(let i = W.projectiles.length - 1; i >= 0; i--){
    const p = W.projectiles[i];
    if(p.beam){
      p.t += dt;
      if(p.t >= p.ttl) W.projectiles.splice(i, 1);
      continue;
    }
    p.ttl -= dt;
    if(p.homing){
      const target = p.owner === 'player'
        ? (P.lock && P.lock.state !== 'dead' ? P.lock : nearestEnemyTo(p.x, p.y, 300))
        : (G.state === 'play' ? { x:G.px, y:G.py } : null);
      if(target){
        const want = angTo(p.x, p.y, target.x, target.y);
        const cur = Math.atan2(p.vy, p.vx);
        const na = lerpAngle(cur, want, dt * 3.2);
        const sp = Math.hypot(p.vx, p.vy);
        p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp;
      }
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if(Math.random() < .5)
      W.particles.push({ x:p.x, y:p.y, vx:rnd(-10, 10), vy:rnd(-10, 10), life:.3, t:0, color:p.color, size:2, grav:0 });
    let dead = p.ttl <= 0;
    if(!dead && solidAt(p.x, p.y)){ dead = true; }
    if(!dead && p.owner === 'player'){
      for(const e of W.enemies){
        if(e.state === 'dead') continue;
        if(dist(p.x, p.y, e.x, e.y) < p.r + e.d.size){
          let dmg = p.dmg;
          if(p.bonusFire){ dmg += p.bonusFire; burst(e.x, e.y, '#ffb347', 8, 100, .4, 2); }
          damageEnemy(e, dmg, { slow:p.slow });
          dead = true; break;
        }
      }
    } else if(!dead && p.owner === 'enemy' && G.state === 'play'){
      if(dist(p.x, p.y, G.px, G.py) < p.r + 14){
        damagePlayer(p.dmg, p.x - p.vx * .05, p.y - p.vy * .05);
        dead = true;
      }
    }
    if(dead){
      if(p.explode){
        burst(p.x, p.y, p.color, 22, 170, .5, 3.5);
        shake = Math.max(shake, 3);
        for(const e of W.enemies){
          if(e.state === 'dead') continue;
          if(dist(p.x, p.y, e.x, e.y) < p.explode + e.d.size) damageEnemy(e, p.dmg * .6, {});
        }
        AudioSys.fire();
      } else {
        burst(p.x, p.y, p.color, 8, 90, .35, 2);
      }
      W.projectiles.splice(i, 1);
    }
  }
}
function nearestEnemyTo(x, y, maxD){
  let best = null, bd = maxD;
  for(const e of W.enemies){
    if(e.state === 'dead') continue;
    const d = dist(x, y, e.x, e.y);
    if(d < bd){ bd = d; best = e; }
  }
  return best;
}

/* ================= День/ночь и время ================= */
function updateTime(dt){
  G.time = (G.time + dt * 3) % 1440;
  G.playtime += dt;
}
function clockStr(){
  const h = Math.floor(G.time / 60), m = Math.floor(G.time % 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

/* ================= Сохранение ================= */
function saveGame(){
  try{
    const s = { ...G };
    s.state = 'play';
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  }catch(e){}
}
function loadGame(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return null;
    const s = JSON.parse(raw);
    if(!s || !s.stats) return null;
    return s;
  }catch(e){ return null; }
}
function hasSave(){ return !!loadGame(); }
setInterval(() => { if(G && G.state === 'play' && !overlayOpen()) saveGame(); }, 25000);

/* ================= UI: тосты, баннер, трекер ================= */
function toast(msg, kind){
  const now = performance.now();
  if(msg === lastToastMsg && now - lastToastTime < 1500) return;
  lastToastMsg = msg; lastToastTime = now;
  const box = $('toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + (kind || '');
  el.textContent = msg;
  box.appendChild(el);
  while(box.children.length > 5) box.removeChild(box.firstChild);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 500); }, 3200);
}
let bannerTimer = null;
function showBanner(name){
  const b = $('banner');
  b.textContent = name;
  b.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => b.classList.remove('show'), 2600);
}
function updateQuestTracker(){
  const el = $('questTracker');
  let html = '';
  const main = G.quests.main;
  if(main && !main.done){
    const st = QUESTS.main.stages[main.stage];
    html += '<div class="qt-main">⚜️ ' + QUESTS.main.title + '</div><div class="qt-desc">' + st.desc + '</div>';
  } else if(main && main.done){
    html += '<div class="qt-main">🌅 Рассвет восстановлен</div>';
  }
  let sides = '';
  for(const id in G.quests){
    if(id === 'main') continue;
    const q = G.quests[id];
    if(q.done) continue;
    const st = QUESTS[id].stages[q.stage];
    let prog = '';
    if(st.type === 'kill' || st.type === 'collect') prog = ' (' + Math.min(q.prog, st.count) + '/' + st.count + ')';
    sides += '<div class="qt-side">• ' + QUESTS[id].title + prog + '</div>';
  }
  el.innerHTML = html + sides;
}

/* ================= UI: оверлеи ================= */
const OVERLAYS = ['dialog', 'shop', 'menu', 'bonfire', 'levelup'];
function overlayOpen(){
  return OVERLAYS.some(id => !$(id).classList.contains('hidden'))
    || !$('titleScreen').classList.contains('hidden')
    || !$('endScreen').classList.contains('hidden');
}
function closeOverlays(){
  for(const id of OVERLAYS) $(id).classList.add('hidden');
}
function handleEscape(){
  if(!$('titleScreen').classList.contains('hidden') || !$('endScreen').classList.contains('hidden')) return;
  if(overlayOpen()) closeOverlays();
  else toggleMenu();
}
function toggleMenu(){
  if(G.state !== 'play') return;
  const m = $('menu');
  if(m.classList.contains('hidden')){
    closeOverlays();
    renderMenu();
    m.classList.remove('hidden');
    AudioSys.ui();
  } else m.classList.add('hidden');
}

/* ---------- Диалоги ---------- */
let dlgNpc = null;
function openDialog(npcId){
  closeOverlays();
  dlgNpc = npcId;
  $('dialog').classList.remove('hidden');
  const api = makeDialogApi(npcId);
  NPCS[npcId].talk(api);
}
function makeDialogApi(npcId){
  const api = {
    G,
    say(text, opts){
      $('dlgName').textContent = NPCS[npcId].name;
      $('dlgRole').textContent = NPCS[npcId].role || '';
      $('dlgText').textContent = text;
      const box = $('dlgOpts');
      box.innerHTML = '';
      (opts || [{ label:'…', fn: api.close }]).forEach(o => {
        const b = document.createElement('button');
        b.className = 'dlg-btn';
        b.textContent = o.label;
        b.onclick = () => { AudioSys.ui(); o.fn(); };
        box.appendChild(b);
      });
    },
    close(){ $('dialog').classList.add('hidden'); saveGame(); },
    startQuest, advance: advanceQuest,
    openShop(id){ $('dialog').classList.add('hidden'); openShop(id); },
    give: giveItem, take: takeItem,
    has: (id, n) => countItem(id) >= (n || 1),
    count: countItem,
    q: id => G.quests[id] || null,
    flag: f => !!G.flags[f],
    setFlag: (f, v) => { G.flags[f] = v; },
    toast,
    mageMenu(){ NPCS.mage.mageMenu(api); },
  };
  return api;
}

/* ---------- Магазин ---------- */
let shopId = null, shopSel = null, shopMode = 'buy';
function openShop(id){
  closeOverlays();
  shopId = id; shopSel = null; shopMode = 'buy';
  $('shop').classList.remove('hidden');
  renderShop();
}
function shopStockLeft(iid){
  const def = SHOPS[shopId];
  if(def.stock && def.stock[iid] !== undefined){
    const key = shopId + ':' + iid;
    const used = G.shopStock[key] || 0;
    return def.stock[iid] - used;
  }
  return Infinity;
}
function renderShop(){
  const def = SHOPS[shopId];
  $('shopName').textContent = def.name;
  $('shopSouls').textContent = fmt(G.souls) + ' душ';
  const buy = $('buyList'), sell = $('sellList');
  buy.innerHTML = ''; sell.innerHTML = '';
  for(const iid of def.items){
    const it = ITEMS[iid];
    if(it.kind === 'spell' && G.spells.includes(it.spell)) continue;
    const left = shopStockLeft(iid);
    if(left <= 0) continue;
    const row = document.createElement('div');
    row.className = 'shop-row' + (shopSel === iid && shopMode === 'buy' ? ' sel' : '');
    row.innerHTML = '<span class="si">' + it.icon + '</span><span class="sn">' + it.name +
      (left !== Infinity ? ' <small>(осталось ' + left + ')</small>' : '') +
      '</span><span class="sp">' + fmt(it.price) + '</span>';
    row.onclick = () => { shopSel = iid; shopMode = 'buy'; renderShop(); };
    buy.appendChild(row);
  }
  for(const iid in G.inv){
    const it = ITEMS[iid];
    if(!it || it.kind === 'quest' || it.price <= 0) continue;
    const equipped = Object.values(G.equip).includes(iid);
    const row = document.createElement('div');
    row.className = 'shop-row' + (shopSel === iid && shopMode === 'sell' ? ' sel' : '');
    row.innerHTML = '<span class="si">' + it.icon + '</span><span class="sn">' + it.name +
      ' ×' + G.inv[iid] + (equipped ? ' <small>(надето)</small>' : '') +
      '</span><span class="sp">' + fmt(Math.floor(it.price * .4)) + '</span>';
    row.onclick = () => { shopSel = iid; shopMode = 'sell'; renderShop(); };
    sell.appendChild(row);
  }
  renderShopDetail();
}
function renderShopDetail(){
  const box = $('shopDetail');
  if(!shopSel){ box.innerHTML = '<div class="sd-hint">Выберите предмет</div>'; return; }
  const it = ITEMS[shopSel];
  const price = shopMode === 'buy' ? it.price : Math.floor(it.price * .4);
  let stats = itemStatsHtml(it);
  let btn = '';
  if(shopMode === 'buy'){
    const can = G.souls >= price;
    btn = '<button id="shopAction" class="gold-btn"' + (can ? '' : ' disabled') + '>Купить за ' + fmt(price) + ' душ</button>';
  } else {
    const equipped = Object.values(G.equip).includes(shopSel);
    const can = !equipped || G.inv[shopSel] > 1;
    btn = '<button id="shopAction" class="gold-btn"' + (can ? '' : ' disabled') + '>Продать за ' + fmt(price) + ' душ</button>';
  }
  box.innerHTML = '<div class="sd-icon">' + it.icon + '</div><div class="sd-name">' + it.name + '</div>' +
    '<div class="sd-desc">' + it.desc + '</div>' + stats + btn;
  $('shopAction').onclick = () => {
    if(shopMode === 'buy'){
      if(G.souls < price) return;
      G.souls -= price;
      const key = shopId + ':' + shopSel;
      if(SHOPS[shopId].stock && SHOPS[shopId].stock[shopSel] !== undefined)
        G.shopStock[key] = (G.shopStock[key] || 0) + 1;
      giveItem(shopSel, 1);
      AudioSys.coin();
    } else {
      const equipped = Object.values(G.equip).includes(shopSel);
      if(equipped && G.inv[shopSel] <= 1) return;
      takeItem(shopSel, 1);
      G.souls += price;
      AudioSys.coin();
      if(!countItem(shopSel)) shopSel = null;
    }
    renderShop(); saveGame();
  };
}
function itemStatsHtml(it){
  let s = '<div class="sd-stats">';
  if(it.kind === 'weapon'){
    s += 'Тип: ' + WTYPE[it.wtype].name + ' · Урон: ' + it.dmg + ' · Вес: ' + it.weight;
    const sc = it.scaling || {};
    const parts = [];
    if(sc.str) parts.push('Сила ' + Math.round(sc.str * 100) + '%');
    if(sc.dex) parts.push('Ловк. ' + Math.round(sc.dex * 100) + '%');
    if(sc.int) parts.push('Интел. ' + Math.round(sc.int * 100) + '%');
    if(parts.length) s += '<br>Масштабирование: ' + parts.join(', ');
    const r = it.req || {};
    const reqs = [];
    if(r.str) reqs.push('Сила ' + r.str);
    if(r.dex) reqs.push('Ловк. ' + r.dex);
    if(r.int) reqs.push('Интел. ' + r.int);
    if(reqs.length) s += '<br>Требования: ' + reqs.join(', ');
    if(it.spellPower) s += '<br>Сила чар +' + Math.round(it.spellPower * 100) + '%';
  }
  if(it.kind === 'armor') s += 'Защита: ' + it.def + ' · Стойкость: ' + it.poise + ' · Вес: ' + it.weight;
  if(it.kind === 'shield') s += 'Блок: ' + Math.round(it.block * 100) + '% · Стабильность: ' + it.stability + ' · Вес: ' + it.weight;
  if(it.kind === 'spell'){
    const sp = SPELLS[it.spell];
    s += 'Мана: ' + sp.cost + ' · КД: ' + sp.cd + 'с · Треб. интеллект: ' + sp.req;
    if(sp.dmg) s += ' · Урон: ' + sp.dmg;
  }
  s += '</div>';
  return s;
}

/* ---------- Меню (инвентарь / персонаж / квесты / карта / управление) ---------- */
let menuTab = 'inv', menuSel = null;
function renderMenu(){
  const m = $('menu');
  if(m.classList.contains('hidden')) return;
  document.querySelectorAll('.menu-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === menuTab));
  const body = $('menuBody');
  if(menuTab === 'inv') renderInv(body);
  else if(menuTab === 'char') renderChar(body);
  else if(menuTab === 'quests') renderQuests(body);
  else if(menuTab === 'map') renderMapTab(body);
  else renderControls(body);
}
function renderInv(body){
  let grid = '<div class="inv-grid">';
  const ids = Object.keys(G.inv);
  if(!ids.length) grid += '<div class="sd-hint">Пусто…</div>';
  for(const id of ids){
    const it = ITEMS[id];
    if(!it) continue;
    const eq = Object.values(G.equip).includes(id);
    grid += '<div class="inv-cell' + (menuSel === id ? ' sel' : '') + (eq ? ' eq' : '') + '" data-item="' + id + '">' +
      '<span class="ic">' + it.icon + '</span><span class="cn">' + (G.inv[id] > 1 ? G.inv[id] : '') + '</span>' +
      (eq ? '<span class="eqm">✓</span>' : '') + '</div>';
  }
  grid += '</div>';
  let detail = '<div class="inv-detail">';
  if(menuSel && ITEMS[menuSel] && countItem(menuSel)){
    const it = ITEMS[menuSel];
    detail += '<div class="sd-icon">' + it.icon + '</div><div class="sd-name">' + it.name + '</div>' +
      '<div class="sd-desc">' + it.desc + '</div>' + itemStatsHtml(it);
    const eq = Object.values(G.equip).includes(menuSel);
    if(['weapon', 'armor', 'shield', 'ring'].includes(it.kind) && !eq)
      detail += '<button class="gold-btn" data-act="equip">Экипировать</button>';
    if(it.kind === 'consumable')
      detail += '<button class="gold-btn" data-act="use">Использовать</button>';
    if(it.kind === 'spell')
      detail += '<button class="gold-btn" data-act="use">Изучить</button>';
  } else detail += '<div class="sd-hint">Выберите предмет.<br><br>Оружие меняется также клавишей X или колесом мыши. Заклинания — цифры 1–7, сотворение — F.</div>';
  detail += '</div>';
  body.innerHTML = grid + detail;
  body.querySelectorAll('.inv-cell').forEach(c => c.onclick = () => { menuSel = c.dataset.item; AudioSys.ui(); renderMenu(); });
  body.querySelectorAll('[data-act]').forEach(b => b.onclick = () => { useItem(menuSel); });
}
function renderChar(body){
  const s = G.stats;
  const ratio = loadRatio();
  const rollStyle = ratio < .35 ? 'быстрый перекат' : ratio < .75 ? 'обычный перекат' : 'тяжёлый перекат ⚠️';
  const w = ITEMS[G.equip.weapon];
  const statRow = (k, name, desc) => '<div class="stat-row"><span>' + name + '</span><b>' + s[k] + '</b><small>' + desc + '</small></div>';
  body.innerHTML =
    '<div class="char-cols"><div class="char-col">' +
    '<h3>Странник · уровень ' + G.level + '</h3>' +
    statRow('vig', 'Живучесть', 'здоровье') +
    statRow('end', 'Выносливость', 'запас сил и нагрузка') +
    statRow('str', 'Сила', 'тяжёлое оружие') +
    statRow('dex', 'Ловкость', 'быстрое оружие и луки') +
    statRow('int', 'Интеллект', 'магия и мана') +
    '<div class="char-derived">' +
    '❤️ Здоровье: ' + Math.floor(G.hp) + ' / ' + maxHp() + '<br>' +
    '🟢 Выносливость: ' + Math.floor(G.stam) + ' / ' + maxStam() + '<br>' +
    '🔮 Мана: ' + Math.floor(G.mp) + ' / ' + maxMp() + '<br>' +
    '🛡️ Защита: ' + armorDef() + '<br>' +
    '⚔️ Урон оружием: ' + Math.floor(weaponDmg()) + '<br>' +
    '✨ Сила чар: +' + Math.round(spellPower() * 100) + '%<br>' +
    '🏺 Эстус: ' + G.estus + ' / ' + G.estusMax +
    '</div></div><div class="char-col">' +
    '<h3>Снаряжение</h3>' +
    ['weapon', 'armor', 'shield', 'ring'].map(slot => {
      const id = G.equip[slot];
      const names = { weapon:'Оружие', armor:'Доспех', shield:'Щит', ring:'Кольцо' };
      return '<div class="equip-row"><small>' + names[slot] + '</small><span>' + (id ? ITEMS[id].icon + ' ' + ITEMS[id].name : '—') + '</span></div>';
    }).join('') +
    '<div class="load-box"><small>Нагрузка: ' + equipWeight().toFixed(1) + ' / ' + loadCapacity().toFixed(1) + '</small>' +
    '<div class="load-bar"><div style="width:' + Math.min(100, ratio * 100) + '%"></div></div>' +
    '<small>' + rollStyle + '</small></div>' +
    '<h3>Известные чары</h3>' +
    (G.spells.length ? G.spells.map((sid, i) => '<div class="spell-row">' + (i + 1) + '. ' + SPELLS[sid].icon + ' ' + SPELLS[sid].name + ' <small>(' + SPELLS[sid].cost + ' маны)</small></div>').join('') : '<div class="sd-hint">Пока ничего. Загляните к Вейле.</div>') +
    '<div class="char-derived">💀 Смертей: ' + G.deaths + ' · ⚔️ Убийств: ' + G.kills + '</div>' +
    '</div></div>';
}
function renderQuests(body){
  let html = '';
  const order = ['main', ...Object.keys(G.quests).filter(k => k !== 'main')];
  let any = false;
  for(const id of order){
    const q = G.quests[id];
    if(!q) continue;
    any = true;
    const def = QUESTS[id];
    const st = q.done ? null : def.stages[q.stage];
    let prog = '';
    if(st && (st.type === 'kill' || st.type === 'collect')) prog = ' — ' + Math.min(q.prog, st.count) + '/' + st.count;
    html += '<div class="quest-card' + (q.done ? ' done' : '') + (def.main ? ' mainq' : '') + '">' +
      '<div class="q-title">' + (def.main ? '⚜️ ' : '📜 ') + def.title + (q.done ? ' ✅' : '') + '</div>' +
      '<div class="q-desc">' + (q.done ? 'Завершён.' : st.desc + prog) + '</div></div>';
  }
  if(!any) html = '<div class="sd-hint">Квестов пока нет. Поговорите со старостой Береном у костра деревни.</div>';
  body.innerHTML = '<div class="quest-list">' + html + '</div>';
}
function renderMapTab(body){
  let html = '<div class="map-list">';
  for(const id in LOC_INFO){
    const disc = G.discovered[id];
    html += '<div class="map-card' + (id === G.mapId ? ' here' : '') + (disc ? '' : ' undisc') + '">' +
      '<div class="q-title">' + (disc ? LOC_INFO[id].name : '???') + (id === G.mapId ? ' 📍' : '') + '</div>' +
      '<div class="q-desc">' + (disc ? LOC_INFO[id].desc : 'Не открыто.') + '</div></div>';
  }
  html += '</div><div class="sd-hint" style="padding:10px">Быстрое перемещение между кострами доступно у любого костра.</div>';
  body.innerHTML = html;
}
function renderControls(body){
  const rows = [
    ['W A S D / стрелки', 'Движение'],
    ['Мышь', 'Прицел / направление взгляда'],
    ['ЛКМ / J', 'Лёгкий удар'],
    ['ПКМ / K', 'Тяжёлый удар (больше урона и выносливости)'],
    ['Пробел', 'Перекат — неуязвимость в середине переката'],
    ['C (удерживать)', 'Блок щитом (нужен щит; не с луком)'],
    ['Q', 'Захват цели / сброс'],
    ['R', 'Выпить эстус (лечение, ограниченные глотки)'],
    ['F', 'Сотворить выбранное заклинание'],
    ['1–7', 'Выбор заклинания'],
    ['X / колесо мыши', 'Смена оружия'],
    ['E', 'Говорить / костёр / сундук'],
    ['Tab / I', 'Меню: инвентарь, персонаж, квесты, карта'],
    ['Esc', 'Закрыть окно / меню'],
    ['M', 'Звук вкл/выкл'],
  ];
  body.innerHTML = '<div class="controls-list">' +
    rows.map(r => '<div class="ctl-row"><kbd>' + r[0] + '</kbd><span>' + r[1] + '</span></div>').join('') +
    '<div class="sd-hint" style="padding:12px">Советы: красная дуга на земле — враг сейчас ударит, перекатывайтесь сквозь неё. Пейте эстус заранее. Отдых у костра пополняет флягу и воскрешает врагов. При смерти души остаются на месте гибели — вернитесь за ними. Ночью враги сильнее, но душ дают больше.</div></div>';
}

/* ---------- Костёр ---------- */
let bfCur = null;
function openBonfire(b){
  closeOverlays();
  bfCur = b;
  $('bonfire').classList.remove('hidden');
  $('bfName').textContent = '🔥 ' + b.name;
  renderBonfireOpts();
}
function renderBonfireOpts(){
  const box = $('bfOpts');
  box.innerHTML = '';
  const mk = (label, fn, dis) => {
    const b = document.createElement('button');
    b.className = 'gold-btn bf-btn';
    b.innerHTML = label;
    b.disabled = !!dis;
    b.onclick = () => { AudioSys.ui(); fn(); };
    box.appendChild(b);
  };
  mk('🔥 Отдохнуть до утра<small>Полное восстановление, фляга полна. Враги восстанут. Игра сохраняется.</small>', () => {
    restAtBonfire(bfCur);
    closeOverlays();
  });
  mk('⬆️ Повысить уровень<small>Стоимость: ' + fmt(levelCost()) + ' душ (у вас ' + fmt(G.souls) + ')</small>', () => {
    $('bonfire').classList.add('hidden');
    openLevelup();
  });
  mk('🌀 Переместиться к костру', () => {
    const box2 = $('bfOpts');
    box2.innerHTML = '';
    for(const mid in MAPS){
      if(!G.discovered[mid]) continue;
      for(const b of MAPS[mid].bonfires){
        const bb = document.createElement('button');
        bb.className = 'gold-btn bf-btn';
        bb.innerHTML = '🔥 ' + b.name + '<small>' + LOC_INFO[mid].name + '</small>';
        bb.onclick = () => {
          closeOverlays();
          G.bonfire = { map:mid, id:b.id };
          restAtBonfire(b, true, mid);
          startTravel(mid, { x:b.x, y:b.y + 1 });
        };
        box2.appendChild(bb);
      }
    }
    const back = document.createElement('button');
    back.className = 'dlg-btn';
    back.textContent = '← Назад';
    back.onclick = renderBonfireOpts;
    box2.appendChild(back);
  });
  mk('Уйти', closeOverlays);
}
function restAtBonfire(b, quiet, mapId){
  G.hp = maxHp(); G.stam = maxStam(); G.mp = maxMp(); G.estus = G.estusMax;
  G.bonfire = { map:mapId || G.mapId, id:b.id };
  G.time = 6 * 60;
  resetRuntime();
  // враги восстают
  const m = W.map;
  W.enemies = [];
  for(const s of m.enemies){
    if(ENEMIES[s.type].boss && G.bosses[s.type]) continue;
    W.enemies.push(makeEnemy(s.type, t2p(s.x), t2p(s.y)));
  }
  W.projectiles = [];
  if(!quiet) toast('🔥 Вы отдохнули. Фляга полна, раны затянулись. Тьма тоже не спала…', 'item');
  AudioSys.heal();
  saveGame();
}

/* ---------- Прокачка ---------- */
function openLevelup(){
  $('levelup').classList.remove('hidden');
  renderLevelup();
}
function renderLevelup(){
  $('luSouls').textContent = fmt(G.souls) + ' душ';
  $('luCost').textContent = 'Стоимость следующего уровня: ' + fmt(levelCost());
  const box = $('luStats');
  box.innerHTML = '';
  const defs = [
    ['vig', 'Живучесть', '+30 здоровья'],
    ['end', 'Выносливость', '+7 запаса сил, +2.2 нагрузки'],
    ['str', 'Сила', 'урон тяжёлого оружия'],
    ['dex', 'Ловкость', 'урон быстрого оружия и луков'],
    ['int', 'Интеллект', '+9 маны, сила чар'],
  ];
  for(const [k, name, desc] of defs){
    const b = document.createElement('button');
    b.className = 'lu-row';
    b.disabled = G.souls < levelCost();
    b.innerHTML = '<span class="lu-name">' + name + '</span><span class="lu-val">' + G.stats[k] + ' → ' + (G.stats[k] + 1) + '</span><small>' + desc + '</small>';
    b.onclick = () => {
      const cost = levelCost();
      if(G.souls < cost) return;
      G.souls -= cost;
      G.stats[k]++;
      G.level++;
      if(k === 'vig') G.hp += 30;
      if(k === 'end') G.stam += 7;
      if(k === 'int') G.mp += 9;
      AudioSys.levelup();
      burst(G.px, G.py, '#ffd76a', 24, 120, .9, 3);
      toast('⬆️ Уровень ' + G.level + '! ' + name + ' +1', 'quest');
      renderLevelup(); saveGame();
    };
    box.appendChild(b);
  }
}

/* ================= Рендер ================= */
const TILE_COLORS = {
  '.': ['#3a5a34', '#3f6138', '#375632'],
  ',': ['#7a6a4a', '#82714f', '#756547'],
  'f': ['#5a5a62', '#606068', '#56565e'],
  'w': ['#7a5a3a', '#82613f', '#755637'],
  's': ['#4a4448', '#514a4f', '#453f43'],
  '#': ['#3a3a44', '#3a3a44', '#3a3a44'],
  'T': ['#3a5a34', '#3f6138', '#375632'],
  '~': ['#2a4a6a', '#2f5275', '#284664'],
  'p': ['#5a5a62', '#606068', '#56565e'],
  'g': ['#5a5a62', '#606068', '#56565e'],
  'r': ['#5a5a62', '#606068', '#56565e'],
  'F': ['#3a5a34', '#3f6138', '#375632'],
};
function drawTiles(){
  const m = W.map;
  const x0 = Math.max(0, Math.floor((cam.x - VW / 2) / TILE) - 1);
  const y0 = Math.max(0, Math.floor((cam.y - VH / 2) / TILE) - 1);
  const x1 = Math.min(m.w - 1, Math.ceil((cam.x + VW / 2) / TILE) + 1);
  const y1 = Math.min(m.h - 1, Math.ceil((cam.y + VH / 2) / TILE) + 1);
  for(let ty = y0; ty <= y1; ty++)
    for(let tx = x0; tx <= x1; tx++){
      const ch = m.tiles[ty][tx];
      const v = hash2(tx, ty);
      const cols = TILE_COLORS[ch] || TILE_COLORS['.'];
      ctx.fillStyle = cols[Math.floor(v * cols.length) % cols.length];
      ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      const px = tx * TILE, py = ty * TILE;
      if(ch === '#'){
        ctx.fillStyle = '#2a2a32';
        ctx.fillRect(px, py + TILE - 8, TILE, 8);
        ctx.fillStyle = '#4a4a56';
        ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 12);
        ctx.strokeStyle = 'rgba(0,0,0,.25)';
        ctx.strokeRect(px + 2.5, py + 2.5, TILE - 5, TILE - 12);
      }
      else if(ch === '~'){
        ctx.fillStyle = 'rgba(255,255,255,' + (.05 + .04 * Math.sin(performance.now() / 700 + tx + ty)) + ')';
        ctx.fillRect(px + 6, py + 10 + 4 * Math.sin(performance.now() / 900 + tx), TILE - 12, 3);
      }
      else if(ch === 'F'){
        ctx.fillStyle = v > .5 ? '#e8c86a' : '#d88ab0';
        ctx.beginPath(); ctx.arc(px + 12 + v * 20, py + 12 + v * 18, 3, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff2b0';
        ctx.beginPath(); ctx.arc(px + 30 - v * 12, py + 32 - v * 10, 2.4, 0, TAU); ctx.fill();
      }
      else if(ch === 'r'){
        ctx.fillStyle = 'rgba(0,0,0,.2)';
        ctx.fillRect(px + 8 + v * 10, py + 10 + v * 8, 10, 7);
        ctx.fillRect(px + 26 - v * 8, py + 28, 8, 6);
      }
      else if(ch === 'g'){
        ctx.fillStyle = '#6a6a72';
        ctx.fillRect(px + 10, py + 8, TILE - 20, TILE - 14);
        ctx.fillStyle = '#7a7a84';
        ctx.fillRect(px + 12, py + 6, TILE - 24, 8);
        ctx.strokeStyle = '#3a3a42';
        ctx.beginPath();
        ctx.moveTo(px + TILE / 2, py + 16); ctx.lineTo(px + TILE / 2, py + 32);
        ctx.moveTo(px + 16, py + 22); ctx.lineTo(px + TILE - 16, py + 22);
        ctx.stroke();
      }
      else if(ch === ',' && v > .8){
        ctx.fillStyle = 'rgba(0,0,0,.12)';
        ctx.fillRect(px + v * 24, py + v * 20, 6, 4);
      }
      else if(ch === '.' && v > .86){
        ctx.strokeStyle = 'rgba(120,180,100,.35)';
        ctx.beginPath();
        ctx.moveTo(px + 10 + v * 20, py + 30);
        ctx.lineTo(px + 12 + v * 20, py + 22);
        ctx.stroke();
      }
    }
}
function drawShadow(x, y, r){
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath(); ctx.ellipse(x, y + r * .7, r * .95, r * .42, 0, 0, TAU); ctx.fill();
}
function drawTree(t){
  const x = t.x, y = t.y;
  drawShadow(x, y + 6, 20);
  ctx.fillStyle = '#5a4028';
  ctx.fillRect(x - 5, y - 8, 10, 20);
  const g = ctx.createRadialGradient(x - 6, y - 22, 4, x, y - 18, 26);
  const dark = W.map.id === 'forest';
  g.addColorStop(0, dark ? '#3f6a38' : '#4a7a40');
  g.addColorStop(1, dark ? '#26421f' : '#2f5228');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y - 18, 22 + t.v * 6, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.06)';
  ctx.beginPath(); ctx.arc(x - 8, y - 26, 9, 0, TAU); ctx.fill();
}
function drawPillar(p){
  drawShadow(p.x, p.y + 8, 16);
  ctx.fillStyle = '#6a6a74';
  ctx.fillRect(p.x - 10, p.y - 34, 20, 44);
  ctx.fillStyle = '#7a7a86';
  ctx.fillRect(p.x - 13, p.y - 38, 26, 8);
  ctx.fillRect(p.x - 13, p.y + 6, 26, 6);
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  ctx.fillRect(p.x - 10, p.y - 34, 5, 44);
}
function drawBonfire(b){
  const x = b.x, y = b.y;
  drawShadow(x, y + 4, 18);
  ctx.strokeStyle = '#5a4028'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 12, y + 6); ctx.lineTo(x + 12, y - 2);
  ctx.moveTo(x - 12, y - 2); ctx.lineTo(x + 12, y + 6);
  ctx.stroke();
  ctx.strokeStyle = '#8a8a92'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x, y - 26); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 7, y - 20); ctx.lineTo(x + 7, y - 20); ctx.stroke();
  const t = performance.now() / 120;
  for(let i = 0; i < 3; i++){
    const h = 16 + 6 * Math.sin(t + i * 2);
    ctx.fillStyle = i === 0 ? '#ff7b3a' : i === 1 ? '#ffb347' : '#ffe9a0';
    ctx.beginPath();
    ctx.ellipse(x + (i - 1) * 4, y - 6 - h / 2 + 2 * Math.sin(t * 1.3 + i), 6 - i * 1.5, h / 2, 0, 0, TAU);
    ctx.fill();
  }
  if(Math.random() < .3) ember(x, y - 10);
}
function drawChest(c){
  const opened = G.chests[c.id];
  drawShadow(c.x, c.y + 4, 14);
  ctx.fillStyle = opened ? '#5a4a32' : '#7a5a32';
  ctx.fillRect(c.x - 14, c.y - 10, 28, 20);
  ctx.fillStyle = opened ? '#4a3a26' : '#8a6a3a';
  ctx.fillRect(c.x - 14, c.y - 14, 28, 8);
  ctx.fillStyle = '#c9a86a';
  ctx.fillRect(c.x - 2, c.y - 8, 4, 8);
  if(!opened){
    const g = .5 + .5 * Math.sin(performance.now() / 400);
    ctx.fillStyle = 'rgba(255,215,106,' + (.15 + .15 * g) + ')';
    ctx.beginPath(); ctx.arc(c.x, c.y - 4, 22, 0, TAU); ctx.fill();
  }
}
function drawPickup(p){
  const bob = Math.sin(performance.now() / 350 + p.bob) * 3;
  const g = .5 + .5 * Math.sin(performance.now() / 300 + p.bob);
  ctx.fillStyle = 'rgba(255,215,106,' + (.2 + .2 * g) + ')';
  ctx.beginPath(); ctx.arc(p.x, p.y + bob, 14, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath(); ctx.arc(p.x, p.y + bob, 5, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff2b0';
  for(let i = 0; i < 5; i++){
    const a = i / 5 * TAU + performance.now() / 1500;
    ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * 8, p.y + bob + Math.sin(a) * 8, 2, 0, TAU); ctx.fill();
  }
}
function drawLantern(l){
  ctx.fillStyle = '#3a3a42';
  ctx.fillRect(l.x - 2, l.y - 26, 4, 30);
  const night = darkness() > .1;
  ctx.fillStyle = night ? '#ffcf7a' : '#8a8a92';
  ctx.beginPath(); ctx.arc(l.x, l.y - 30, 6, 0, TAU); ctx.fill();
  if(night){
    ctx.fillStyle = 'rgba(255,207,122,.18)';
    ctx.beginPath(); ctx.arc(l.x, l.y - 30, 16, 0, TAU); ctx.fill();
  }
}
function drawDecor(d){
  const x = t2p(d.x), y = t2p(d.y);
  if(d.type === 'well'){
    drawShadow(x, y + 4, 16);
    ctx.fillStyle = '#6a6a74';
    ctx.beginPath(); ctx.arc(x, y, 15, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a4a6a';
    ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill();
  } else if(d.type === 'tent'){
    drawShadow(x, y + 6, 20);
    ctx.fillStyle = '#7a6a4a';
    ctx.beginPath();
    ctx.moveTo(x - 22, y + 10); ctx.lineTo(x, y - 22); ctx.lineTo(x + 22, y + 10);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4a3a26';
    ctx.beginPath();
    ctx.moveTo(x - 7, y + 10); ctx.lineTo(x, y - 6); ctx.lineTo(x + 7, y + 10);
    ctx.closePath(); ctx.fill();
  } else if(d.type === 'statue'){
    drawShadow(x, y + 8, 14);
    ctx.fillStyle = '#7a7a86';
    ctx.fillRect(x - 8, y - 30, 16, 38);
    ctx.beginPath(); ctx.arc(x, y - 36, 8, 0, TAU); ctx.fill();
  } else if(d.type === 'altar'){
    drawShadow(x, y + 6, 20);
    ctx.fillStyle = '#5a5a66';
    ctx.fillRect(x - 20, y - 14, 40, 22);
    const g = .5 + .5 * Math.sin(performance.now() / 500);
    ctx.fillStyle = G.bosses.boss_devourer ? 'rgba(255,215,106,' + (.4 + .3 * g) + ')' : 'rgba(155,89,208,' + (.3 + .2 * g) + ')';
    ctx.beginPath(); ctx.arc(x, y - 20, 10 + 3 * g, 0, TAU); ctx.fill();
  }
}
function drawHumanoid(x, y, r, color, facing, o){
  o = o || {};
  drawShadow(x, y, r);
  const bob = o.walk ? Math.sin(o.walk) * 1.5 : 0;
  // тело
  const g = ctx.createRadialGradient(x - r * .3, y - r * .4 + bob, r * .2, x, y + bob, r * 1.2);
  g.addColorStop(0, lighten(color, 30));
  g.addColorStop(1, color);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y + bob, r, 0, TAU); ctx.fill();
  if(o.skeleton){
    ctx.strokeStyle = 'rgba(60,60,70,.6)'; ctx.lineWidth = 1.5;
    for(let i = -1; i <= 1; i++){
      ctx.beginPath(); ctx.arc(x, y + bob + i * 4, r * .6, .2, Math.PI - .2); ctx.stroke();
    }
  }
  if(o.hood){
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath(); ctx.arc(x, y + bob, r, 0, TAU); ctx.fill();
  }
  // голова
  const hx = x + Math.cos(facing) * r * .45, hy = y + Math.sin(facing) * r * .45 + bob - r * .25;
  ctx.fillStyle = o.skeleton ? '#e8e2d0' : o.skin || '#d8b088';
  ctx.beginPath(); ctx.arc(hx, hy, r * .55, 0, TAU); ctx.fill();
  if(o.hood){
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(hx, hy, r * .62, facing + Math.PI * .6, facing - Math.PI * .6); ctx.fill();
  }
  if(o.eyes){
    ctx.fillStyle = o.eyes;
    const ea = facing;
    ctx.beginPath();
    ctx.arc(hx + Math.cos(ea - .4) * r * .3, hy + Math.sin(ea - .4) * r * .3, 2, 0, TAU);
    ctx.arc(hx + Math.cos(ea + .4) * r * .3, hy + Math.sin(ea + .4) * r * .3, 2, 0, TAU);
    ctx.fill();
  }
  // оружие
  if(o.weapon){
    const swing = o.swing || 0;
    const wa = facing + swing * (o.swingDir || 1);
    const len = o.weaponLen || r * 2.1;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.rotate(wa);
    ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(r * .5, 0); ctx.lineTo(r * .9, 0); ctx.stroke();
    ctx.strokeStyle = o.weaponColor || '#c8c8d0'; ctx.lineWidth = o.weaponWide ? 5 : 3;
    ctx.beginPath(); ctx.moveTo(r * .9, 0); ctx.lineTo(len, 0); ctx.stroke();
    if(o.weaponWide){
      ctx.fillStyle = o.weaponColor || '#c8c8d0';
      ctx.beginPath();
      ctx.moveTo(len * .6, -6); ctx.lineTo(len, 0); ctx.lineTo(len * .6, 6);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  // щит
  if(o.shield){
    const sa = facing + Math.PI * .45;
    ctx.fillStyle = o.shieldColor || '#8a6a3a';
    ctx.beginPath();
    ctx.arc(x + Math.cos(sa) * r * .9, y + Math.sin(sa) * r * .9 + bob, r * .55, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#c9a86a'; ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  if(o.crown){
    ctx.fillStyle = '#c9a86a';
    ctx.beginPath();
    ctx.moveTo(hx - 6, hy - 6); ctx.lineTo(hx - 3, hy - 12); ctx.lineTo(hx, hy - 7);
    ctx.lineTo(hx + 3, hy - 12); ctx.lineTo(hx + 6, hy - 6);
    ctx.closePath(); ctx.fill();
  }
}
function lighten(hex, amt){
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
  r = clamp(r, 0, 255); g = clamp(g, 0, 255); b = clamp(b, 0, 255);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
function drawEnemy(e){
  const d = e.d;
  if(e.state === 'dead'){
    const a = Math.max(0, 1 - e.deadT / 1.2);
    if(a <= 0) return;
    ctx.globalAlpha = a * .6;
    ctx.fillStyle = d.color;
    ctx.beginPath(); ctx.arc(e.x, e.y, d.size * (1 - e.deadT * .3), 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }
  // телеграф атаки
  if(e.state === 'windup'){
    const k = e.t / (d.windup * (e.phase2 ? .75 : 1));
    if(e.atkKind === 'sweep' || e.atkKind === 'melee'){
      const range = d.range + (d.boss ? 20 : 0);
      const arc = d.boss ? 2.6 : 1.9;
      ctx.fillStyle = 'rgba(255,60,40,' + (.12 + .2 * k) + ')';
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.arc(e.x, e.y, range, e.facing - arc / 2, e.facing + arc / 2);
      ctx.closePath(); ctx.fill();
    } else if(e.atkKind === 'wave'){
      ctx.strokeStyle = 'rgba(155,89,208,' + (.3 + .4 * k) + ')';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(e.x, e.y, 160 * k, 0, TAU); ctx.stroke();
    } else if(e.atkKind === 'dash'){
      ctx.strokeStyle = 'rgba(255,60,40,' + (.25 + .35 * k) + ')';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.x + Math.cos(e.facing) * 220, e.y + Math.sin(e.facing) * 220);
      ctx.stroke();
    }
  }
  const flash = e.hitFlash > 0;
  const color = flash ? '#ffffff' : (e.slow > 0 ? '#7fb8d8' : d.color);
  const walk = e.state === 'chase' ? performance.now() / 90 : 0;
  if(d.kind === 'beast'){
    drawShadow(e.x, e.y, d.size);
    ctx.fillStyle = color;
    ctx.save();
    ctx.translate(e.x, e.y); ctx.rotate(e.facing);
    ctx.beginPath(); ctx.ellipse(0, 0, d.size * 1.3, d.size * .8, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(d.size * 1.1, 0, d.size * .55, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff5a3a';
    ctx.beginPath(); ctx.arc(d.size * 1.3, -3, 1.8, 0, TAU); ctx.arc(d.size * 1.3, 3, 1.8, 0, TAU); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-d.size * 1.2, 0); ctx.lineTo(-d.size * 1.7, Math.sin(performance.now() / 200) * 4); ctx.stroke();
    ctx.restore();
  } else if(e.type === 'wraith'){
    const bob = Math.sin(performance.now() / 300 + e.uid) * 4;
    ctx.globalAlpha = .75;
    const g = ctx.createRadialGradient(e.x, e.y + bob, 2, e.x, e.y + bob, d.size * 1.6);
    g.addColorStop(0, flash ? '#ffffff' : '#d8f4ff');
    g.addColorStop(1, 'rgba(143,216,232,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(e.x, e.y + bob, d.size * 1.6, 0, TAU); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(e.x, e.y + bob, d.size * .8, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0a3a4a';
    ctx.beginPath();
    ctx.arc(e.x - 4, e.y + bob - 2, 2.5, 0, TAU);
    ctx.arc(e.x + 4, e.y + bob - 2, 2.5, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if(e.type === 'boss_devourer'){
    drawShadow(e.x, e.y, d.size);
    const aura = .3 + .2 * Math.sin(performance.now() / 250);
    ctx.fillStyle = 'rgba(155,89,208,' + aura * .4 + ')';
    ctx.beginPath(); ctx.arc(e.x, e.y, d.size * 1.7, 0, TAU); ctx.fill();
    const g = ctx.createRadialGradient(e.x - 8, e.y - 10, 4, e.x, e.y, d.size * 1.2);
    g.addColorStop(0, flash ? '#ffffff' : (e.phase2 ? '#6a3a8a' : '#4a3a6a'));
    g.addColorStop(1, '#1a1030');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(e.x, e.y, d.size, 0, TAU); ctx.fill();
    // рога
    ctx.strokeStyle = '#2a1a40'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(e.x - d.size * .5, e.y - d.size * .6); ctx.lineTo(e.x - d.size * .9, e.y - d.size * 1.2);
    ctx.moveTo(e.x + d.size * .5, e.y - d.size * .6); ctx.lineTo(e.x + d.size * .9, e.y - d.size * 1.2);
    ctx.stroke();
    // глаза
    ctx.fillStyle = e.phase2 ? '#ff5a3a' : '#ffd76a';
    const ea = e.facing;
    ctx.beginPath();
    ctx.arc(e.x + Math.cos(ea - .35) * d.size * .5, e.y + Math.sin(ea - .35) * d.size * .5, 4, 0, TAU);
    ctx.arc(e.x + Math.cos(ea + .35) * d.size * .5, e.y + Math.sin(ea + .35) * d.size * .5, 4, 0, TAU);
    ctx.fill();
  } else {
    drawHumanoid(e.x, e.y, d.size, color, e.facing, {
      walk, skeleton:d.kind === 'undead', hood:e.type === 'cultist',
      eyes:d.kind === 'undead' ? '#7fd8ff' : (e.type === 'bandit_chief' ? '#ff5a3a' : null),
      skin:d.kind === 'undead' ? '#e8e2d0' : '#d8b088',
      weapon:e.atkKind !== 'shoot', weaponLen:d.size * (d.boss ? 2.6 : 2),
      weaponWide:d.boss || e.type === 'bandit_chief',
      swing:e.state === 'windup' ? -.7 : e.state === 'strike' ? 1 : 0,
      crown:e.type === 'boss_guardian',
      shield:e.type === 'skeleton',
      shieldColor:'#6a6a72',
    });
  }
  // полоска здоровья над врагом
  if(e.hp < e.hpMax && !d.boss){
    const w = d.size * 2.2;
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    ctx.fillRect(e.x - w / 2, e.y - d.size - 14, w, 4);
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(e.x - w / 2, e.y - d.size - 14, w * e.hp / e.hpMax, 4);
  }
}
function drawNpc(n){
  const d = NPCS[n.id];
  const bob = Math.sin(performance.now() / 600 + n.bob) * 1.5;
  const facing = angTo(n.x, n.y, G.px, G.py);
  drawHumanoid(n.x, n.y + bob, 15, d.color, dist(G.px, G.py, n.x, n.y) < 160 ? facing : n.bob, {
    skin:'#d8b088',
    hood:n.id === 'mage' || n.id === 'hermit',
    weapon:n.id === 'guard' || n.id === 'smith',
    weaponLen:30,
  });
  // маркер квеста
  let mark = null;
  for(const qid in QUESTS){
    const def = QUESTS[qid];
    const q = G.quests[qid];
    if(def.giver === n.id && !q) mark = '!';
    if(q && !q.done){
      const st = def.stages[q.stage];
      if(st.type === 'talk' && st.target === n.id) mark = '?';
    }
    if(qid === 'main' && !q && n.id === 'elder') mark = '!';
    if(qid === 'main' && q && !q.done){
      const st = QUESTS.main.stages[q.stage];
      if(st.type === 'talk' && st.target === n.id) mark = '?';
    }
  }
  if(mark){
    ctx.font = 'bold 20px Georgia';
    ctx.textAlign = 'center';
    ctx.fillStyle = mark === '!' ? '#ffd76a' : '#7fd8ff';
    ctx.fillText(mark, n.x, n.y - 30 + Math.sin(performance.now() / 300) * 3);
  }
  if(dist(G.px, G.py, n.x, n.y) < 170){
    ctx.font = '12px Georgia';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,240,200,.9)';
    ctx.fillText(d.name, n.x, n.y - 42);
  }
}
function drawPlayer(){
  const x = G.px, y = G.py;
  if(P.act === 'roll'){
    const k = P.t / P.rollDur;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(P.rollDir);
    ctx.globalAlpha = .85;
    ctx.fillStyle = '#7a8aa0';
    ctx.beginPath(); ctx.ellipse(0, 0, 16, 10 + 4 * Math.sin(k * Math.PI), 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#d8b088';
    ctx.beginPath(); ctx.arc(8 * Math.cos(k * TAU), 8 * Math.sin(k * TAU), 6, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
    return;
  }
  const armor = ITEMS[G.equip.armor];
  const armorColors = { cloth:'#7a8aa0', leather:'#8a6a4a', chain:'#8a8a96', plate:'#a8a8b8' };
  const color = P.hurtFlash > 0 ? '#ff8a7a' : (armorColors[G.equip.armor] || '#7a8aa0');
  const w = ITEMS[G.equip.weapon];
  const swing = P.act === 'attack' ? P.swingAnim : 0;
  const walk = (inputDir().x || inputDir().y) && P.act === 'idle' ? P.walkCycle : 0;
  // дуга удара
  if(P.act === 'attack' && P.phase === 'act' && !P.move.proj){
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, P.move.range, P.facing - P.move.arc / 2, P.facing + P.move.arc / 2);
    ctx.closePath(); ctx.fill();
  }
  if(P.act === 'cast'){
    const sp = SPELLS[P.castSpell];
    const k = P.t / .55;
    ctx.strokeStyle = sp.color; ctx.globalAlpha = .7;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 24 + 8 * Math.sin(k * 6), 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if(G.buffs.stoneskin > 0){
    ctx.strokeStyle = 'rgba(201,178,138,.6)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, 20, 0, TAU); ctx.stroke();
  }
  drawHumanoid(x, y, 14, color, P.facing, {
    walk, skin:'#d8b088',
    weapon:true,
    weaponLen:w.wtype === 'spear' ? 44 : w.wtype === 'greatsword' ? 38 : w.wtype === 'staff' ? 34 : 28,
    weaponWide:w.wtype === 'greatsword' || w.wtype === 'axe',
    weaponColor:G.buffs.resin > 0 ? '#ffd76a' : (w.wtype === 'staff' ? '#9b7fd0' : '#c8c8d0'),
    swing, swingDir:P.heavy ? 1.4 : 1,
    shield:P.blocking,
    shieldColor:G.equip.shield === 'tower' ? '#7a7a86' : '#8a6a3a',
  });
  if(P.act === 'drink'){
    const k = P.t / 1.15;
    ctx.fillStyle = '#ffb347';
    ctx.beginPath(); ctx.arc(x + Math.cos(P.facing) * 12, y + Math.sin(P.facing) * 12 - 8 - k * 6, 4, 0, TAU); ctx.fill();
  }
  if(P.act === 'stagger'){
    ctx.font = '14px Georgia'; ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd76a';
    ctx.fillText('✦ ✦ ✦', x, y - 28);
  }
  // захват цели
  if(P.lock && P.lock.state !== 'dead'){
    const t = P.lock;
    const r = t.d.size + 10 + 2 * Math.sin(performance.now() / 200);
    ctx.strokeStyle = 'rgba(255,215,106,.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.arc(t.x, t.y, r, performance.now() / 600, performance.now() / 600 + TAU); ctx.stroke();
    ctx.setLineDash([]);
  }
}
function drawBloodstain(){
  if(!G.bloodstain || G.bloodstain.map !== G.mapId) return;
  const b = G.bloodstain;
  const g = .5 + .5 * Math.sin(performance.now() / 300);
  ctx.fillStyle = 'rgba(120,220,180,' + (.25 + .2 * g) + ')';
  ctx.beginPath(); ctx.arc(b.x, b.y, 18 + 4 * g, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(180,255,220,.8)';
  ctx.beginPath(); ctx.arc(b.x, b.y, 6, 0, TAU); ctx.fill();
  ctx.font = '11px Georgia'; ctx.textAlign = 'center';
  ctx.fillStyle = '#bfe8d8';
  ctx.fillText(fmt(b.souls) + ' душ', b.x, b.y - 26);
}
function drawProjectiles(){
  for(const p of W.projectiles){
    if(p.beam){
      const a = 1 - p.t / p.ttl;
      ctx.strokeStyle = p.color; ctx.globalAlpha = a;
      ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      const segs = 6;
      for(let i = 1; i <= segs; i++){
        const t = i / segs;
        ctx.lineTo(lerp(p.x, p.tx, t) + rnd(-8, 8), lerp(p.y, p.ty, t) + rnd(-8, 8));
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      continue;
    }
    if(p.arrow){
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.strokeStyle = '#c9a86a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(8, 0); ctx.stroke();
      ctx.fillStyle = '#e8e8f0';
      ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(2, -3); ctx.lineTo(2, 3); ctx.closePath(); ctx.fill();
      ctx.restore();
      continue;
    }
    const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.r * 2.4);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(.4, p.color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2.4, 0, TAU); ctx.fill();
  }
}
function drawParticles(){
  for(const p of W.particles){
    const a = 1 - p.t / p.life;
    if(a <= 0) continue;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function drawFloats(){
  ctx.textAlign = 'center';
  for(const f of W.floats){
    const a = 1 - f.t / f.life;
    if(a <= 0) continue;
    ctx.globalAlpha = a;
    ctx.font = (f.big ? 'bold 17px' : 'bold 13px') + ' Georgia';
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillText(f.txt, f.x + 1, f.y - f.t * 34 + 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.txt, f.x, f.y - f.t * 34);
  }
  ctx.globalAlpha = 1;
}
function drawLighting(){
  const dark = darkness();
  const h = (G.time / 60) % 24;
  // тёплый тинт рассвета/заката
  let tint = null;
  if(h >= 5 && h < 7) tint = 'rgba(255,150,80,' + (.12 * (1 - Math.abs(h - 6))) + ')';
  else if(h >= 18 && h < 20) tint = 'rgba(255,110,60,' + (.14 * (1 - Math.abs(h - 19))) + ')';
  if(tint){ ctx.fillStyle = tint; ctx.fillRect(0, 0, VW, VH); }
  if(dark <= .02) return;
  lightCtx.clearRect(0, 0, VW, VH);
  lightCtx.fillStyle = 'rgba(8,10,30,' + dark + ')';
  lightCtx.fillRect(0, 0, VW, VH);
  lightCtx.globalCompositeOperation = 'destination-out';
  const punch = (wx, wy, r, strength) => {
    const sx = wx - cam.x + VW / 2, sy = wy - cam.y + VH / 2;
    if(sx < -r || sy < -r || sx > VW + r || sy > VH + r) return;
    const g = lightCtx.createRadialGradient(sx, sy, r * .15, sx, sy, r);
    g.addColorStop(0, 'rgba(0,0,0,' + strength + ')');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    lightCtx.fillStyle = g;
    lightCtx.beginPath(); lightCtx.arc(sx, sy, r, 0, TAU); lightCtx.fill();
  };
  punch(G.px, G.py, 190, .9);
  for(const b of W.bonfires) punch(b.x, b.y, 230 + 12 * Math.sin(performance.now() / 200), 1);
  for(const l of W.lanterns) punch(l.x, l.y - 30, 130, .85);
  for(const p of W.projectiles) if(!p.beam && p.color) punch(p.x, p.y, 70, .6);
  for(const c of W.chests) if(!G.chests[c.id]) punch(c.x, c.y, 60, .4);
  for(const p of W.pickups) punch(p.x, p.y, 70, .5);
  if(G.bloodstain && G.bloodstain.map === G.mapId) punch(G.bloodstain.x, G.bloodstain.y, 90, .6);
  lightCtx.globalCompositeOperation = 'source-over';
  ctx.drawImage(lightCv, 0, 0, VW, VH);
}
function render(){
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#0a0c12';
  ctx.fillRect(0, 0, VW, VH);
  if(!W) return;
  const sx = shake > 0 ? rnd(-shake, shake) : 0;
  const sy = shake > 0 ? rnd(-shake, shake) : 0;
  ctx.save();
  ctx.translate(VW / 2 - cam.x + sx, VH / 2 - cam.y + sy);
  drawTiles();
  drawBloodstain();
  // y-сортировка объектов
  const objs = [];
  for(const t of W.trees) objs.push({ y:t.y, f:() => drawTree(t) });
  for(const p of W.pillars) objs.push({ y:p.y, f:() => drawPillar(p) });
  for(const d of W.map.decor) objs.push({ y:t2p(d.y), f:() => drawDecor(d) });
  for(const l of W.lanterns) objs.push({ y:l.y, f:() => drawLantern(l) });
  for(const b of W.bonfires) objs.push({ y:b.y, f:() => drawBonfire(b) });
  for(const c of W.chests) objs.push({ y:c.y, f:() => drawChest(c) });
  for(const p of W.pickups) objs.push({ y:p.y, f:() => drawPickup(p) });
  for(const n of W.npcs) objs.push({ y:n.y, f:() => drawNpc(n) });
  for(const e of W.enemies) objs.push({ y:e.y, f:() => drawEnemy(e) });
  objs.push({ y:G.py, f:drawPlayer });
  objs.sort((a, b) => a.y - b.y);
  for(const o of objs) o.f();
  drawProjectiles();
  drawParticles();
  drawFloats();
  ctx.restore();
  drawLighting();
  // затемнение перехода
  if(fadeAlpha > 0){
    ctx.fillStyle = 'rgba(0,0,0,' + fadeAlpha + ')';
    ctx.fillRect(0, 0, VW, VH);
  }
}

/* ================= HUD ================= */
function updateHUD(){
  $('hpFill').style.width = clamp(G.hp / maxHp() * 100, 0, 100) + '%';
  $('stamFill').style.width = clamp(G.stam / maxStam() * 100, 0, 100) + '%';
  $('mpFill').style.width = clamp(G.mp / maxMp() * 100, 0, 100) + '%';
  $('hpText').textContent = Math.ceil(G.hp) + ' / ' + maxHp();
  $('estusCount').textContent = '×' + G.estus;
  $('estusBox').classList.toggle('empty', G.estus <= 0);
  $('soulsCount').textContent = fmt(G.souls);
  $('clockTime').textContent = clockStr();
  $('clockIcon').textContent = isNight() ? '🌙' : '☀️';
  $('locName').textContent = LOC_INFO[G.mapId].name;
  const w = ITEMS[G.equip.weapon];
  $('weaponIcon').textContent = w.icon;
  $('weaponName').textContent = w.name;
  $('resinBadge').style.display = G.buffs.resin > 0 ? '' : 'none';
  // панель заклинаний
  const sb = $('spellBar');
  if(sb.dataset.sig !== G.spells.join(',') + '|' + G.spellSel){
    sb.dataset.sig = G.spells.join(',') + '|' + G.spellSel;
    sb.innerHTML = '';
    G.spells.forEach((sid, i) => {
      const sp = SPELLS[sid];
      const el = document.createElement('div');
      el.className = 'spell-slot' + (i === G.spellSel ? ' sel' : '');
      el.innerHTML = '<span class="ss-key">' + (i + 1) + '</span><span class="ss-icon">' + sp.icon + '</span><span class="ss-cost">' + sp.cost + '</span><div class="ss-cd"></div>';
      el.title = sp.name;
      el.onclick = () => { G.spellSel = i; AudioSys.ui(); };
      sb.appendChild(el);
    });
    if(!G.spells.length) sb.innerHTML = '<div class="spell-slot empty" title="Изучите заклинания у Вейлы">✨<span class="ss-key">F</span></div>';
  }
  const slots = sb.querySelectorAll('.spell-slot');
  G.spells.forEach((sid, i) => {
    if(!slots[i]) return;
    const cd = P.cds[sid] || 0;
    const cdEl = slots[i].querySelector('.ss-cd');
    if(cdEl) cdEl.style.height = (cd / SPELLS[sid].cd * 100) + '%';
    slots[i].classList.toggle('sel', i === G.spellSel);
    slots[i].classList.toggle('nomana', G.mp < SPELLS[sid].cost);
  });
  // подсказка взаимодействия
  const n = G.state === 'play' && !overlayOpen() ? nearestInteract() : null;
  const pr = $('prompt');
  if(n){ pr.textContent = 'E — ' + n.label; pr.classList.add('show'); }
  else pr.classList.remove('show');
  // босс-бар
  const boss = W.enemies.find(e => e.d.boss && e.state !== 'dead' && e.aggroed);
  const bb = $('bossBar');
  if(boss){
    bb.classList.add('show');
    $('bossName').textContent = boss.d.name;
    $('bossFill').style.width = clamp(boss.hp / boss.hpMax * 100, 0, 100) + '%';
  } else bb.classList.remove('show');
  // виньетка при низком HP
  $('vignette').style.opacity = G.hp < maxHp() * .3 ? (.5 + .3 * Math.sin(performance.now() / 300)) : 0;
}

/* ================= Главный цикл ================= */
let lastT = performance.now();
function loop(now){
  requestAnimationFrame(loop);
  let dt = (now - lastT) / 1000;
  lastT = now;
  dt = Math.min(dt, .05);
  shake = Math.max(0, shake - dt * 22);
  // переход между локациями
  if(fadeDir === 1){
    fadeAlpha = Math.min(1, fadeAlpha + dt * 3);
    if(fadeAlpha >= 1) doTravel();
  } else if(fadeDir === -1){
    fadeAlpha = Math.max(0, fadeAlpha - dt * 2.2);
    if(fadeAlpha <= 0) fadeDir = 0;
  }
  if(G && W){
    const paused = overlayOpen() || G.state !== 'play' || fadeDir === 1;
    if(!paused){
      updateTime(dt);
      updatePlayer(dt);
      for(const e of W.enemies) updateEnemy(e, dt);
      W.enemies = W.enemies.filter(e => e.state !== 'dead' || e.deadT < 1.3);
      updateProjectiles(dt);
      for(const p of W.particles){
        p.t += dt;
        if(p.soul){
          const a = angTo(p.x, p.y, G.px, G.py);
          p.vx = lerp(p.vx, Math.cos(a) * 240, dt * 4);
          p.vy = lerp(p.vy, Math.sin(a) * 240, dt * 4);
        }
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
      W.particles = W.particles.filter(p => p.t < p.life);
      for(const f of W.floats) f.t += dt;
      W.floats = W.floats.filter(f => f.t < f.life);
    }
    // камера
    cam.x = lerp(cam.x, G.px, 1 - Math.pow(.001, dt));
    cam.y = lerp(cam.y, G.py, 1 - Math.pow(.001, dt));
    cam.x = clamp(cam.x, VW / 2, W.map.w * TILE - VW / 2);
    cam.y = clamp(cam.y, VH / 2, W.map.h * TILE - VH / 2);
    if(W.map.w * TILE < VW) cam.x = W.map.w * TILE / 2;
    if(W.map.h * TILE < VH) cam.y = W.map.h * TILE / 2;
    render();
    updateHUD();
  }
}
requestAnimationFrame(loop);

/* ================= Старт / финал ================= */
function startNewGame(){
  G = defaultState();
  G.hp = maxHp(); G.stam = maxStam(); G.mp = maxMp();
  resetRuntime();
  $('titleScreen').classList.add('hidden');
  loadMap('village', { x:20, y:17 });
  updateQuestTracker();
  saveGame();
  const tut = [
    '🕯️ WASD — движение, мышь — взгляд. E — говорить.',
    '⚔️ ЛКМ — удар, ПКМ — тяжёлый удар. Пробел — перекат (неуязвимость!).',
    '🛡️ C — блок щитом. R — эстус. Q — захват цели.',
    '🔥 Поговорите со старостой Береном (дом слева вверху, маркер «!»).',
  ];
  tut.forEach((t, i) => setTimeout(() => toast(t, 'item'), 800 + i * 3600));
}
function continueGame(){
  const s = loadGame();
  if(!s){ startNewGame(); return; }
  G = s;
  G.hp = Math.min(G.hp, maxHp());
  G.buffs = G.buffs || { resin:0, stoneskin:0 };
  resetRuntime();
  $('titleScreen').classList.add('hidden');
  const m = MAPS[G.mapId] ? G.mapId : 'village';
  loadMap(m, null);
  G.px = s.px; G.py = s.py;
  cam.x = G.px; cam.y = G.py;
  updateQuestTracker();
  toast('🕯️ Путешествие продолжается.', 'item');
}
function startEnding(){
  if(G.state === 'ending') return;
  G.state = 'ending';
  const q = G.quests.main;
  if(q && !q.done){ q.stage = QUESTS.main.stages.length; q.done = true; }
  G.time = 6.5 * 60;
  saveGame();
  const box = $('endText');
  box.innerHTML = '';
  ENDING_TEXT.forEach((t, i) => {
    const p = document.createElement('p');
    p.textContent = t;
    p.style.animationDelay = (i * 1.2) + 's';
    box.appendChild(p);
  });
  const mins = Math.floor(G.playtime / 60);
  $('endStats').innerHTML = '⏱️ Время в пути: ' + mins + ' мин · 💀 Смертей: ' + G.deaths +
    ' · ⚔️ Убийств: ' + G.kills + ' · ⬆️ Уровень: ' + G.level;
  setTimeout(() => $('endScreen').classList.remove('hidden'), 600);
  AudioSys.levelup();
}
function toggleMute(){
  AudioSys.muted = !AudioSys.muted;
  $('muteBtn').textContent = AudioSys.muted ? '🔇' : '🔊';
  toast(AudioSys.muted ? '🔇 Звук выключен' : '🔊 Звук включён', 'item');
}

/* ================= Привязка UI ================= */
$('btnNew').onclick = () => { AudioSys.ensure(); AudioSys.ui(); startNewGame(); };
$('btnContinue').onclick = () => { AudioSys.ensure(); AudioSys.ui(); continueGame(); };
$('btnEndContinue').onclick = () => {
  $('endScreen').classList.add('hidden');
  G.state = 'play';
  toast('🌅 Мир спасён. Странствие продолжается — собирайте снаряжение и закрывайте квесты.', 'quest');
  saveGame();
};
$('shopClose').onclick = () => { $('shop').classList.add('hidden'); saveGame(); };
$('menuClose').onclick = () => $('menu').classList.add('hidden');
$('luBack').onclick = () => { $('levelup').classList.add('hidden'); openBonfire(bfCur); };
$('muteBtn').onclick = toggleMute;
document.querySelectorAll('.menu-tab').forEach(b => {
  b.onclick = () => { menuTab = b.dataset.tab; menuSel = null; AudioSys.ui(); renderMenu(); };
});
document.querySelectorAll('.dlg-close').forEach(b => b.onclick = closeOverlays);

/* ---------- Титульный экран ---------- */
(function initTitle(){
  const intro = $('introBox');
  INTRO_TEXT.forEach((t, i) => {
    const p = document.createElement('p');
    p.textContent = t;
    p.style.animationDelay = (.4 + i * .9) + 's';
    intro.appendChild(p);
  });
  $('btnContinue').style.display = hasSave() ? '' : 'none';
  // угли на титульнике
  const emb = $('titleEmbers');
  for(let i = 0; i < 26; i++){
    const s = document.createElement('span');
    s.style.left = Math.random() * 100 + '%';
    s.style.animationDuration = (4 + Math.random() * 6) + 's';
    s.style.animationDelay = (Math.random() * 6) + 's';
    s.style.width = s.style.height = (2 + Math.random() * 4) + 'px';
    emb.appendChild(s);
  }
})();