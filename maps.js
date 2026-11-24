/* ============================================================
   ПЕПЕЛ РАССВЕТА — карты локаций
   Тайлы: '.' трава  ',' тропа  'f' камень  'w' дерево  's' пепел
          '#' стена  'T' дерево  '~' вода  'p' колонна  'g' могила
          'r' обломки  'F' цветы
   ============================================================ */
'use strict';

const SOLID_TILES = new Set(['#', 'T', '~', 'p', 'g']);

function mulberry32(seed){
  let a = seed >>> 0;
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function blankMap(id, name, w, h, fillCh){
  const tiles = [];
  for(let y = 0; y < h; y++){ tiles.push(new Array(w).fill(fillCh)); }
  return { id, name, w, h, tiles,
    npcs:[], enemies:[], chests:[], pickups:[], bonfires:[], lanterns:[], exits:[], decor:[] };
}
function fillRect(m, x, y, w, h, ch){
  for(let j = y; j < y + h; j++)
    for(let i = x; i < x + w; i++)
      if(i >= 0 && j >= 0 && i < m.w && j < m.h) m.tiles[j][i] = ch;
}
function border(m, ch, gaps){
  for(let i = 0; i < m.w; i++){ m.tiles[0][i] = ch; m.tiles[m.h-1][i] = ch; }
  for(let j = 0; j < m.h; j++){ m.tiles[j][0] = ch; m.tiles[j][m.w-1] = ch; }
  (gaps||[]).forEach(g => fillRect(m, g.x, g.y, g.w, g.h, g.ch || ','));
}
function pathLine(m, x1, y1, x2, y2, width, ch){
  width = width || 1; ch = ch || ',';
  const steps = Math.max(Math.abs(x2-x1), Math.abs(y2-y1)) * 2;
  for(let s = 0; s <= steps; s++){
    const t = s / steps;
    const x = Math.round(x1 + (x2-x1)*t), y = Math.round(y1 + (y2-y1)*t);
    fillRect(m, x - (width>>1), y - (width>>1), width, width, ch);
  }
}
function building(m, x, y, w, h, door){
  fillRect(m, x, y, w, h, '#');
  fillRect(m, x+1, y+1, w-2, h-2, 'w');
  if(door === 'top') m.tiles[y][x + (w>>1)] = 'w';
  else m.tiles[y+h-1][x + (w>>1)] = 'w';
}
function scatter(m, rng, ch, density, onlyOn, avoid){
  avoid = avoid || [];
  for(let y = 1; y < m.h-1; y++)
    for(let x = 1; x < m.w-1; x++){
      if(m.tiles[y][x] !== onlyOn) continue;
      let ok = true;
      for(const a of avoid){
        const dx = x-a.x, dy = y-a.y;
        if(dx*dx + dy*dy < a.r*a.r){ ok = false; break; }
      }
      if(ok && rng() < density) m.tiles[y][x] = ch;
    }
}
function clearArea(m, x, y, r, ch){
  for(let j = y-r; j <= y+r; j++)
    for(let i = x-r; i <= x+r; i++){
      if(i<1||j<1||i>=m.w-1||j>=m.h-1) continue;
      if((i-x)*(i-x)+(j-y)*(j-y) <= r*r && (m.tiles[j][i]==='T'||m.tiles[j][i]==='F'))
        m.tiles[j][i] = ch || '.';
    }
}

/* -------------------- ТИХИЙ ДОЛ -------------------- */
function buildVillage(){
  const m = blankMap('village', 'Тихий Дол', 40, 30, '.');
  const rng = mulberry32(101);
  border(m, 'T', [ {x:39, y:13, w:1, h:5, ch:','} ]);

  fillRect(m, 15, 11, 10, 9, ',');            // площадь
  pathLine(m, 2, 15, 38, 15, 2);              // главная улица
  pathLine(m, 20, 5, 20, 26, 2);              // вертикальная
  building(m, 5, 4, 8, 6, 'bottom');          // дом старосты
  building(m, 27, 4, 8, 6, 'bottom');         // кузница
  building(m, 5, 21, 7, 6, 'top');            // башня чародейки
  building(m, 28, 21, 7, 6, 'top');           // лавка травницы
  pathLine(m, 9, 10, 9, 15, 1); pathLine(m, 31, 10, 31, 15, 1);
  pathLine(m, 8, 16, 8, 21, 1); pathLine(m, 31, 16, 31, 21, 1);

  m.tiles[17][13] = 'p'; m.decor.push({type:'well', x:13, y:17});
  scatter(m, rng, 'T', .16, '.', [
    {x:20,y:15,r:7},{x:9,y:7,r:6},{x:31,y:7,r:6},{x:8,y:24,r:5},{x:31,y:24,r:5},
    {x:20,y:8,r:3},{x:20,y:24,r:3},{x:36,y:15,r:4},{x:13,y:17,r:2},
    {x:9,y:12,r:2},{x:31,y:12,r:2},{x:8,y:19,r:2},{x:31,y:19,r:2},{x:24,y:17,r:2},
  ]);
  scatter(m, rng, 'F', .05, '.', []);

  m.bonfires.push({id:'bf_village', x:20, y:15, name:'Костёр Тихого Дола'});
  m.npcs.push(
    {id:'elder', x:9, y:11}, {id:'smith', x:31, y:11},
    {id:'mage', x:8, y:19}, {id:'herbalist', x:31, y:19},
    {id:'girl', x:24, y:17}, {id:'guard', x:36, y:15},
  );
  m.lanterns.push({x:16,y:12},{x:24,y:12},{x:16,y:18},{x:24,y:18},{x:34,y:15},{x:6,y:15},{x:20,y:6},{x:20,y:25});
  m.exits.push({x:39, y:13, w:1, h:5, to:'forest', spawn:{x:2, y:18}});
  return m;
}

/* -------------------- СУМРАЧНЫЙ ЛЕС -------------------- */
function buildForest(){
  const m = blankMap('forest', 'Сумрачный лес', 52, 36, '.');
  const rng = mulberry32(202);
  border(m, 'T', [
    {x:0, y:16, w:1, h:5, ch:','}, {x:24, y:0, w:5, h:1, ch:','}, {x:51, y:9, w:1, h:4, ch:','},
  ]);
  fillRect(m, 7, 7, 5, 4, '~');               // пруд
  pathLine(m, 0, 18, 14, 18, 2);
  pathLine(m, 14, 18, 20, 24, 2);
  pathLine(m, 20, 24, 40, 26, 2);
  pathLine(m, 14, 18, 14, 8, 2);
  pathLine(m, 14, 8, 26, 3, 2);
  pathLine(m, 26, 3, 26, 0, 2);
  pathLine(m, 30, 26, 44, 20, 2);
  pathLine(m, 44, 20, 48, 10, 2);
  pathLine(m, 48, 10, 51, 10, 2);
  pathLine(m, 33, 8, 38, 8, 2);
  pathLine(m, 26, 3, 33, 8, 1);

  const avoid = [
    {x:41,y:26,r:5},{x:36,y:8,r:6},{x:14,y:18,r:3},{x:20,y:24,r:3},{x:26,y:3,r:3},
    {x:48,y:10,r:3},{x:9,y:9,r:5},{x:6,y:6,r:2},{x:16,y:28,r:2},{x:30,y:16,r:2},
    {x:44,y:30,r:2},{x:48,y:22,r:2},{x:10,y:14,r:2},{x:46,y:4,r:2},
    {x:8,y:24,r:2},{x:10,y:26,r:2},{x:6,y:12,r:2},{x:12,y:30,r:2},{x:18,y:32,r:2},{x:28,y:32,r:2},
    {x:26,y:6,r:2},{x:20,y:10,r:2},{x:33,y:9,r:2},{x:38,y:10,r:2},{x:35,y:5,r:2},{x:40,y:7,r:2},
  ];
  scatter(m, rng, 'T', .30, '.', avoid);
  scatter(m, rng, 'F', .04, '.', []);
  clearArea(m, 41, 26, 4); clearArea(m, 36, 8, 5);
  m.decor.push({type:'tent', x:43, y:25});

  m.bonfires.push({id:'bf_forest', x:41, y:27, name:'Костёр отшельника'});
  m.npcs.push({id:'hermit', x:39, y:25});
  m.enemies.push(
    {type:'wolf', x:8, y:24}, {type:'wolf', x:10, y:26}, {type:'wolf', x:6, y:12},
    {type:'wolf', x:12, y:30}, {type:'wolf', x:18, y:32}, {type:'wolf', x:28, y:32},
    {type:'bandit', x:26, y:6}, {type:'bandit', x:20, y:10},
    {type:'bandit', x:33, y:9}, {type:'bandit', x:38, y:10},
    {type:'bandit', x:35, y:5}, {type:'bandit', x:40, y:7},
    {type:'bandit_chief', x:36, y:7},
  );
  m.pickups.push(
    {id:'herb1', item:'herb', x:6, y:6}, {id:'herb2', item:'herb', x:16, y:28},
    {id:'herb3', item:'herb', x:30, y:16}, {id:'herb4', item:'herb', x:44, y:30},
    {id:'herb5', item:'herb', x:48, y:22}, {id:'herb6', item:'herb', x:10, y:14},
  );
  m.chests.push({id:'forest_chest', x:46, y:4, items:[['resin',2]], souls:200});
  m.exits.push(
    {x:0, y:16, w:1, h:5, to:'village', spawn:{x:37, y:15}},
    {x:24, y:0, w:5, h:1, to:'ruins', spawn:{x:22, y:28}},
    {x:51, y:9, w:1, h:4, to:'crypt', spawn:{x:3, y:18},
      lock:{item:'rusty_key', msg:'Решётка заперта на ржавый замок. Ключ — у отшельника Одра (юго-восток леса).'}},
  );
  return m;
}

/* -------------------- СТАРЫЕ РУИНЫ -------------------- */
function buildRuins(){
  const m = blankMap('ruins', 'Старые руины', 44, 32, '.');
  const rng = mulberry32(303);
  border(m, '#', [
    {x:20, y:31, w:5, h:1, ch:','}, {x:20, y:0, w:5, h:1, ch:'f'},
  ]);
  fillRect(m, 6, 4, 32, 24, 'f');             // пол храма
  fillRect(m, 20, 28, 5, 3, ',');
  // колонны
  for(const px of [10, 16, 28, 34])
    for(const py of [8, 14, 20]) m.tiles[py][px] = 'p';
  // обрушенные стены
  fillRect(m, 6, 4, 10, 1, '#'); fillRect(m, 28, 4, 10, 1, '#');
  fillRect(m, 6, 4, 1, 8, '#'); fillRect(m, 37, 4, 1, 8, '#');
  fillRect(m, 6, 27, 8, 1, '#'); fillRect(m, 30, 27, 8, 1, '#');
  scatter(m, rng, 'r', .07, 'f', [{x:22,y:14,r:3}]);
  scatter(m, rng, 'T', .12, '.', [{x:22,y:28,r:5},{x:22,y:2,r:4}]);
  m.decor.push({type:'statue', x:19, y:6}, {type:'statue', x:25, y:6});
  m.tiles[6][19] = 'p'; m.tiles[6][25] = 'p';

  m.bonfires.push({id:'bf_ruins', x:22, y:27, name:'Костёр у руин'});
  m.enemies.push(
    {type:'skeleton', x:12, y:10}, {type:'skeleton', x:20, y:9}, {type:'skeleton', x:30, y:12},
    {type:'skeleton', x:16, y:18}, {type:'skeleton', x:28, y:20}, {type:'skeleton', x:10, y:22},
    {type:'cultist', x:24, y:6}, {type:'cultist', x:34, y:16}, {type:'cultist', x:14, y:14},
  );
  m.chests.push(
    {id:'ruins_amulet', x:8, y:6, items:[['amulet',1]], souls:100},
    {id:'ruins_cache', x:35, y:6, items:[['resin',2]], souls:300},
  );
  m.lanterns.push({x:18,y:26},{x:26,y:26},{x:18,y:5},{x:26,y:5});
  m.exits.push(
    {x:20, y:31, w:5, h:1, to:'forest', spawn:{x:26, y:2}},
    {x:20, y:0, w:5, h:1, to:'citadel', spawn:{x:20, y:26},
      lock:{quest:'main', stage:3, item:'dawn_heart',
        msg:'Врата Рассвета глухи, как могила. Нужно Сердце Рассвета — и слово старосты Берена.'}},
  );
  return m;
}

/* -------------------- КРИПТА УГАСАНИЯ -------------------- */
function buildCrypt(){
  const m = blankMap('crypt', 'Крипта Угасания', 46, 34, '#');
  // входной зал
  fillRect(m, 2, 14, 8, 8, 'f');
  fillRect(m, 0, 16, 2, 4, 'f');
  // западная сокровищница
  fillRect(m, 4, 4, 6, 6, 'f');
  fillRect(m, 6, 10, 2, 4, 'f');
  // коридор
  fillRect(m, 10, 17, 8, 3, 'f');
  // главный зал с могилами
  fillRect(m, 18, 10, 10, 14, 'f');
  for(const gx of [20, 22, 24, 26])
    for(const gy of [12, 16, 20]) m.tiles[gy][gx] = 'g';
  // северная ниша
  fillRect(m, 12, 4, 8, 6, 'f');
  fillRect(m, 18, 9, 2, 2, 'f');
  // южная ниша
  fillRect(m, 20, 26, 10, 6, 'f');
  fillRect(m, 23, 24, 2, 2, 'f');
  // коридор к арене
  fillRect(m, 28, 16, 6, 4, 'f');
  // арена Стража
  fillRect(m, 34, 8, 10, 18, 'f');
  m.tiles[9][35] = 'p'; m.tiles[9][42] = 'p';
  m.tiles[24][35] = 'p'; m.tiles[24][42] = 'p';

  m.bonfires.push({id:'bf_crypt', x:5, y:18, name:'Костёр крипты'});
  m.enemies.push(
    {type:'ghoul', x:14, y:18}, {type:'ghoul', x:22, y:22}, {type:'ghoul', x:26, y:13},
    {type:'skeleton', x:20, y:14}, {type:'skeleton', x:25, y:18},
    {type:'skeleton', x:19, y:22}, {type:'skeleton', x:24, y:10},
    {type:'wraith', x:16, y:6}, {type:'wraith', x:24, y:28}, {type:'wraith', x:31, y:17},
    {type:'boss_guardian', x:39, y:16},
  );
  m.chests.push(
    {id:'crypt_shard', x:14, y:5, items:[['estus_shard',1]], souls:150},
    {id:'crypt_fang', x:24, y:29, items:[['ice_fang',1]], souls:150},
    {id:'crypt_ring', x:6, y:5, items:[['ring_souls',1]], souls:150},
  );
  m.lanterns.push({x:10,y:17},{x:28,y:17},{x:34,y:12},{x:34,y:22},{x:12,y:4},{x:20,y:26});
  m.exits.push(
    {x:0, y:16, w:1, h:4, to:'forest', spawn:{x:48, y:10}},
  );
  return m;
}

/* -------------------- ПИК РАССВЕТА -------------------- */
function buildCitadel(){
  const m = blankMap('citadel', 'Пик Рассвета', 40, 30, 's');
  const rng = mulberry32(505);
  border(m, '#', [ {x:18, y:29, w:5, h:1, ch:'f'} ]);
  fillRect(m, 18, 20, 5, 9, 'f');
  fillRect(m, 10, 3, 20, 14, 'f');            // арена
  fillRect(m, 18, 17, 5, 3, 'f');
  m.tiles[5][12] = 'p'; m.tiles[5][27] = 'p';
  m.tiles[14][12] = 'p'; m.tiles[14][27] = 'p';
  scatter(m, rng, 'r', .08, 's', [{x:20,y:24,r:4}]);
  scatter(m, rng, 'r', .05, 'f', [{x:20,y:9,r:5}]);
  m.decor.push({type:'altar', x:20, y:4});
  m.tiles[4][20] = 'p';

  m.bonfires.push({id:'bf_citadel', x:20, y:25, name:'Костёр у Врат'});
  m.enemies.push(
    {type:'cultist', x:14, y:20}, {type:'cultist', x:26, y:20}, {type:'cultist', x:20, y:18},
    {type:'wraith', x:10, y:22}, {type:'wraith', x:30, y:22},
    {type:'boss_devourer', x:20, y:8},
  );
  m.lanterns.push({x:16,y:24},{x:24,y:24},{x:11,y:9},{x:28,y:9});
  m.exits.push(
    {x:18, y:29, w:5, h:1, to:'ruins', spawn:{x:22, y:2}},
  );
  return m;
}

/* ---------- Сборка и валидация ---------- */
function buildMaps(){
  const maps = {
    village: buildVillage(), forest: buildForest(), ruins: buildRuins(),
    crypt: buildCrypt(), citadel: buildCitadel(),
  };
  // guarantee: все сущности стоят на проходимых тайлах
  for(const id in maps){
    const m = maps[id];
    const walk = (x, y) => x>=0 && y>=0 && x<m.w && y<m.h && !SOLID_TILES.has(m.tiles[y][x]);
    const fix = (e) => {
      if(walk(e.x, e.y)) return;
      for(let r = 1; r < 8; r++){
        for(let j = -r; j <= r; j++)
          for(let i = -r; i <= r; i++){
            if(walk(e.x+i, e.y+j)){ e.x += i; e.y += j; return; }
          }
      }
    };
    m.npcs.forEach(fix); m.enemies.forEach(fix); m.chests.forEach(fix);
    m.pickups.forEach(fix); m.bonfires.forEach(fix);
    m.exits.forEach(ex => {
      for(let j = ex.y; j < ex.y + ex.h; j++)
        for(let i = ex.x; i < ex.x + ex.w; i++)
          if(SOLID_TILES.has(m.tiles[j][i])) m.tiles[j][i] = ',';
    });
  }
  return maps;
}