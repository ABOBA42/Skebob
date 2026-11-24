/* ============================================================
   ПЕПЕЛ РАССВЕТА — данные игры
   Предметы, оружие, магия, враги, квесты, магазины, диалоги
   ============================================================ */
'use strict';

const TILE = 48;

/* ---------- Типы оружия: мувсеты (в секундах) ---------- */
const WTYPE = {
  sword:      { name:'Прямой меч',
    light:{wind:.16, act:.12, rec:.26, range:64, arc:1.9, stam:14, mult:1.0},
    heavy:{wind:.40, act:.14, rec:.45, range:72, arc:2.3, stam:28, mult:1.7} },
  dagger:     { name:'Кинжал',
    light:{wind:.10, act:.09, rec:.16, range:50, arc:1.5, stam:9,  mult:.8},
    heavy:{wind:.24, act:.10, rec:.30, range:56, arc:1.8, stam:18, mult:1.4} },
  axe:        { name:'Топор',
    light:{wind:.24, act:.13, rec:.36, range:66, arc:2.2, stam:20, mult:1.15},
    heavy:{wind:.55, act:.16, rec:.55, range:74, arc:2.5, stam:36, mult:2.0} },
  greatsword: { name:'Двуручный меч',
    light:{wind:.30, act:.15, rec:.42, range:82, arc:2.4, stam:24, mult:1.1},
    heavy:{wind:.65, act:.18, rec:.60, range:92, arc:2.6, stam:42, mult:2.1} },
  spear:      { name:'Копьё',
    light:{wind:.18, act:.12, rec:.30, range:98, arc:.7,  stam:15, mult:1.0},
    heavy:{wind:.42, act:.16, rec:.45, range:118,arc:.8,  stam:30, mult:1.8} },
  bow:        { name:'Лук',
    light:{wind:.30, act:.05, rec:.30, range:0, stam:12, mult:1.0, proj:'arrow'},
    heavy:{wind:.70, act:.05, rec:.40, range:0, stam:24, mult:1.9, proj:'arrow'} },
  staff:      { name:'Посох',
    light:{wind:.18, act:.10, rec:.28, range:56, arc:1.6, stam:10, mult:1.0},
    heavy:{wind:.35, act:.12, rec:.40, range:62, arc:2.0, stam:20, mult:1.5} },
};

/* ---------- Предметы ---------- */
const ITEMS = {
  /* Оружие */
  broken_sword: { name:'Сломанный меч', icon:'🗡️', kind:'weapon', wtype:'sword', dmg:38,
    scaling:{str:.3,dex:.3,int:0}, req:{}, weight:3, price:60,
    desc:'Щербатый клинок странника. Лучше, чем ничего. Едва.' },
  straight_sword:{ name:'Рыцарский меч', icon:'⚔️', kind:'weapon', wtype:'sword', dmg:62,
    scaling:{str:.5,dex:.4,int:0}, req:{str:10,dex:8}, weight:5, price:380,
    desc:'Надёжный прямой меч. Сбалансированные удары и умеренный расход выносливости.' },
  dagger:       { name:'Кинжал охотника', icon:'🔪', kind:'weapon', wtype:'dagger', dmg:44,
    scaling:{str:.1,dex:.8,int:0}, req:{dex:8}, weight:2, price:260,
    desc:'Быстрые выпады с малым расходом выносливости. Идеален для серии ударов и перекатов.' },
  axe:          { name:'Топор дровосека', icon:'🪓', kind:'weapon', wtype:'axe', dmg:80,
    scaling:{str:.8,dex:.1,int:0}, req:{str:12}, weight:8, price:520,
    desc:'Тяжёлый рубящий урон. Медленный, но сокрушает стойку врагов.' },
  spear:        { name:'Копьё ополчения', icon:'🔱', kind:'weapon', wtype:'spear', dmg:66,
    scaling:{str:.4,dex:.6,int:0}, req:{str:9,dex:10}, weight:6, price:560,
    desc:'Держите врага на расстоянии. Узкий, но очень длинный выпад.' },
  greatsword:   { name:'Клеймор рыцаря', icon:'🗡️', kind:'weapon', wtype:'greatsword', dmg:104,
    scaling:{str:.9,dex:.3,int:0}, req:{str:16,dex:8}, weight:12, price:1250,
    desc:'Огромный клинок. Широкие размашистые удары, пробивающие толпу.' },
  bow:          { name:'Длинный лук', icon:'🏹', kind:'weapon', wtype:'bow', dmg:56,
    scaling:{str:.1,dex:.9,int:0}, req:{dex:12}, weight:4, price:700,
    desc:'Стрелы летят далеко. Тяжёлый выстрел наносит почти двойной урон. Блок недоступен.' },
  staff:        { name:'Посох ученика', icon:'🪄', kind:'weapon', wtype:'staff', dmg:30,
    scaling:{str:.1,dex:.1,int:.6}, req:{int:8}, weight:3, price:420, spellPower:.20,
    desc:'Слаб в ближнем бою, но усиливает все заклинания на 20%.' },
  ice_fang:     { name:'Ледяной клык', icon:'❄️', kind:'weapon', wtype:'dagger', dmg:68,
    scaling:{str:.1,dex:.9,int:.3}, req:{dex:12,int:10}, weight:2, price:900, effect:'slow',
    desc:'Кинжал из вечного льда. Каждый удар замедляет врага на 2 секунды.' },
  dawnblade:    { name:'Клинок Рассвета', icon:'🌅', kind:'weapon', wtype:'greatsword', dmg:135,
    scaling:{str:.8,dex:.5,int:.4}, req:{str:18,int:12}, weight:10, price:3000, bonusFire:25,
    desc:'Легендарный клинок, выкованный из первого луча солнца. Пылает золотым огнём.' },

  /* Доспехи */
  cloth:   { name:'Дорожная одежда', icon:'👕', kind:'armor', def:8,  poise:0,  weight:2,  price:40,
    desc:'Простая одежда странника. Почти не защищает, но и не стесняет движений.' },
  leather: { name:'Кожаный доспех', icon:'🦺', kind:'armor', def:22, poise:4,  weight:6,  price:420,
    desc:'Лёгкая защита. Хороший выбор для тех, кто полагается на перекаты.' },
  chain:   { name:'Кольчуга', icon:'⛓️', kind:'armor', def:40, poise:10, weight:12, price:950,
    desc:'Крепкая защита. Средний вес — следите за нагрузкой.' },
  plate:   { name:'Латный доспех', icon:'🛡️', kind:'armor', def:62, poise:18, weight:20, price:1900,
    desc:'Лучшая защита кузнеца Хильды. Тяжёлый — перекат станет неуклюжим без высокой выносливости.' },

  /* Щиты */
  wooden: { name:'Деревянный щит', icon:'🪵', kind:'shield', block:.55, def:6,  stability:30, weight:3,  price:220,
    desc:'Поглощает 55% урона в блоке. Лёгкий, но хлипкий.' },
  iron:   { name:'Железный щит', icon:'🛡️', kind:'shield', block:.75, def:12, stability:50, weight:6,  price:650,
    desc:'Поглощает 75% урона в блоке. Надёжный выбор.' },
  tower:  { name:'Башенный щит', icon:'🏰', kind:'shield', block:.90, def:18, stability:75, weight:11, price:1150,
    desc:'Поглощает 90% урона в блоке и почти не тратит выносливость. Очень тяжёлый.' },

  /* Кольца */
  ring_stam:  { name:'Кольцо ветра', icon:'💍', kind:'ring', effect:'stamRegen', value:.35, price:800,
    desc:'Выносливость восстанавливается на 35% быстрее.' },
  ring_hp:    { name:'Кольцо жизни', icon:'💍', kind:'ring', effect:'hpMax', value:.15, price:900,
    desc:'Максимальное здоровье +15%.' },
  ring_magic: { name:'Кольцо чар', icon:'💍', kind:'ring', effect:'spellPower', value:.25, price:850,
    desc:'Сила заклинаний +25%.' },
  ring_souls: { name:'Кольцо жадности', icon:'💍', kind:'ring', effect:'souls', value:.25, price:1000,
    desc:'Души с поверженных врагов +25%.' },

  /* Расходники */
  resin: { name:'Золотая смола', icon:'🍯', kind:'consumable', use:'resin', price:160,
    desc:'Нанесите на оружие: +35% урона на 45 секунд.' },
  bread: { name:'Хлеб и сыр', icon:'🍞', kind:'consumable', use:'bread', price:50,
    desc:'Восстанавливает 20% здоровья. Можно есть на ходу, но медленно.' },
  estus_shard: { name:'Осколок эстуса', icon:'🏺', kind:'consumable', use:'estusShard', price:2500,
    desc:'Укован из осколков древних фляг. Навсегда +1 глоток эстуса (максимум 6).' },

  /* Квестовые */
  herb:       { name:'Светоцвет', icon:'🌼', kind:'quest', price:0,
    desc:'Светящийся цветок из Сумрачного леса. Травница Марта собирает их для лекарства.' },
  amulet:     { name:'Амулет Лии', icon:'📿', kind:'quest', price:0,
    desc:'Серебряный амулет с портретом. Обронен кем-то в старых руинах.' },
  rusty_key:  { name:'Ржавый ключ', icon:'🗝️', kind:'quest', price:0,
    desc:'Ключ от крипты на востоке Сумрачного леса. Пахнет сыростью и смертью.' },
  dawn_heart: { name:'Сердце Рассвета', icon:'💛', kind:'quest', price:0,
    desc:'Тёплый кристалл с заключённым внутри солнечным светом. Ключ к вратам Пика Рассвета.' },

  /* Гримуары (изучают заклинания) */
  spell_firebolt:  { name:'Гримуар: Огненный снаряд', icon:'📕', kind:'spell', spell:'firebolt',  price:300, desc:'Изучает заклинание «Огненный снаряд».' },
  spell_ice:       { name:'Гримуар: Ледяное копьё',   icon:'📘', kind:'spell', spell:'ice',       price:480, desc:'Изучает заклинание «Ледяное копьё».' },
  spell_soularrow: { name:'Гримуар: Стрела души',     icon:'📗', kind:'spell', spell:'soularrow', price:650, desc:'Изучает заклинание «Стрела души».' },
  spell_heal:      { name:'Гримуар: Исцеление',       icon:'📙', kind:'spell', spell:'heal',      price:550, desc:'Изучает заклинание «Исцеление».' },
  spell_stoneskin: { name:'Гримуар: Каменная кожа',   icon:'📓', kind:'spell', spell:'stoneskin', price:700, desc:'Изучает заклинание «Каменная кожа».' },
  spell_flame_wave:{ name:'Гримуар: Огненная волна',  icon:'📔', kind:'spell', spell:'flame_wave',price:900, desc:'Изучает заклинание «Огненная волна».' },
  spell_lightning: { name:'Гримуар: Гнев небес',      icon:'⚡', kind:'spell', spell:'lightning', price:1400, desc:'Изучает заклинание «Гнев небес».' },
};

/* ---------- Заклинания ---------- */
const SPELLS = {
  firebolt:  { name:'Огненный снаряд', icon:'🔥', cost:16, cd:.8,  req:7,  type:'proj', dmg:70,
    speed:430, color:'#ff8c3a', explode:52, desc:'Швыряет сгусток пламени, взрывающийся при попадании.' },
  ice:       { name:'Ледяное копьё', icon:'❄️', cost:20, cd:1.1, req:10, type:'proj', dmg:55,
    speed:520, color:'#7fd8ff', slow:3, desc:'Осколок вечного льда. Замедляет врага на 3 секунды.' },
  soularrow: { name:'Стрела души', icon:'🔮', cost:14, cd:.7,  req:9,  type:'proj', dmg:48,
    speed:340, color:'#b48cff', homing:true, desc:'Самонаводящаяся стрела из чистой души.' },
  heal:      { name:'Исцеление', icon:'💚', cost:30, cd:5,   req:10, type:'self', heal:.35,
    color:'#7dff9e', desc:'Восстанавливает 35% здоровья. Долгое сотворение — вас могут ударить.' },
  stoneskin: { name:'Каменная кожа', icon:'🪨', cost:25, cd:12,  req:12, type:'self', buff:{def:60, dur:8},
    color:'#c9b28a', desc:'Кожа твердеет как камень: +60 защиты на 8 секунд.' },
  flame_wave:{ name:'Огненная волна', icon:'🌋', cost:30, cd:3,   req:12, type:'aoe', dmg:85, radius:135,
    color:'#ff6a3a', desc:'Кольцо пламени вокруг вас. Отбрасывает и обжигает всех рядом.' },
  lightning: { name:'Гнев небес', icon:'⚡', cost:34, cd:2.2, req:14, type:'beam', dmg:130, range:400,
    color:'#ffe97f', desc:'Молния бьёт в захваченную цель или ближайшего врага. Огромный урон.' },
};

/* ---------- Враги ---------- */
const ENEMIES = {
  wolf:     { name:'Сумрачный волк', hp:130, dmg:32, def:4,  speed:175, range:48,
    windup:.45, active:.12, recover:.5, cooldown:1.1, aggro:270, souls:45, size:15,
    behavior:'melee', poise:20, color:'#8a8f98', kind:'beast' },
  bandit:   { name:'Разбойник', hp:200, dmg:44, def:10, speed:140, range:58,
    windup:.55, active:.14, recover:.6, cooldown:1.3, aggro:300, souls:80, size:16,
    behavior:'melee', poise:45, color:'#a3653a', kind:'human' },
  bandit_chief:{ name:'Атаман Грыж', hp:620, dmg:62, def:16, speed:150, range:66,
    windup:.5, active:.16, recover:.55, cooldown:1.1, aggro:340, souls:450, size:20,
    behavior:'melee', poise:90, color:'#c0392b', kind:'human', mini:true },
  skeleton: { name:'Скелет-страж', hp:240, dmg:52, def:14, speed:125, range:60,
    windup:.6, active:.14, recover:.65, cooldown:1.4, aggro:300, souls:110, size:16,
    behavior:'melee', poise:60, color:'#d8d4c8', kind:'undead' },
  cultist:  { name:'Культист Угасания', hp:180, dmg:46, def:8, speed:110, range:330,
    windup:.8, active:.1, recover:.7, cooldown:2.0, aggro:360, souls:130, size:16,
    behavior:'ranged', poise:30, color:'#6a3fa0', kind:'human',
    proj:{speed:270, color:'#9b59d0', r:7} },
  ghoul:    { name:'Упырь', hp:300, dmg:60, def:12, speed:168, range:52,
    windup:.4, active:.13, recover:.5, cooldown:1.0, aggro:320, souls:150, size:17,
    behavior:'melee', poise:55, color:'#7a9a6a', kind:'undead' },
  wraith:   { name:'Призрак крипты', hp:260, dmg:55, def:6, speed:190, range:280,
    windup:.7, active:.1, recover:.6, cooldown:1.8, aggro:380, souls:190, size:17,
    behavior:'caster', poise:40, color:'#8fd8e8', kind:'undead',
    proj:{speed:230, color:'#a8ecff', r:8, homing:true} },
  boss_guardian:{ name:'Костяной Страж', hp:1700, dmg:85, def:20, speed:132, range:100,
    windup:.75, active:.2, recover:.8, cooldown:1.6, aggro:430, souls:2200, size:34,
    behavior:'boss1', poise:300, color:'#e8e2d0', kind:'undead', boss:true },
  boss_devourer:{ name:'Пожиратель Рассвета', hp:3400, dmg:110, def:26, speed:148, range:110,
    windup:.7, active:.22, recover:.7, cooldown:1.4, aggro:540, souls:6000, size:40,
    behavior:'boss2', poise:999, color:'#3a2a5a', kind:'demon', boss:true },
};

/* ---------- Квесты ---------- */
const QUESTS = {
  main: { title:'Пепел Рассвета', main:true, stages:[
    { type:'talk', target:'hermit', count:1,
      desc:'Найдите отшельника Одра в Сумрачном лесу — его лагерь на юго-востоке.' },
    { type:'boss', target:'boss_guardian', count:1,
      desc:'Ржавым ключом откройте крипту на востоке леса и добудьте Сердце Рассвета.' },
    { type:'talk', target:'elder', count:1,
      desc:'Вернитесь к старосте Берену с Сердцем Рассвета.' },
    { type:'boss', target:'boss_devourer', count:1,
      desc:'Северные врата руин откроются Сердцем. Взойдите на Пик Рассвета и сразите Пожирателя.' },
  ], rewards:{ souls:0 } },

  side_herbs: { title:'Свет во тьме', giver:'herbalist', stages:[
    { type:'collect', target:'herb', count:5,
      desc:'Соберите 5 светоцветов в Сумрачном лесу (светятся золотым).' },
    { type:'talk', target:'herbalist', count:1,
      desc:'Отнесите светоцветы травнице Марте.' },
  ], rewards:{ souls:300, items:[['estus_shard',1],['bread',3]] } },

  side_bandits: { title:'Сталь и порядок', giver:'smith', stages:[
    { type:'kill', target:'bandit', count:6,
      desc:'Истребите 6 разбойников в Сумрачном лесу и старых руинах.' },
    { type:'talk', target:'smith', count:1,
      desc:'Доложите кузнецу Хильде о зачистке.' },
  ], rewards:{ souls:400, items:[['greatsword',1]] } },

  side_amulet: { title:'Память о матери', giver:'girl', stages:[
    { type:'collect', target:'amulet', count:1,
      desc:'Найдите амулет Лии в старых руинах (говорят, в сундуке на западе).' },
    { type:'talk', target:'girl', count:1,
      desc:'Верните амулет Лии в деревне.' },
  ], rewards:{ souls:250, items:[['ring_hp',1]] } },

  side_wraiths: { title:'Покой для мёртвых', giver:'mage', stages:[
    { type:'kill', target:'wraith', count:3,
      desc:'Упокойте 3 призраков в крипте.' },
    { type:'talk', target:'mage', count:1,
      desc:'Расскажите чародейке Вейле, что крипта очищена.' },
  ], rewards:{ souls:500, items:[['spell_lightning',1]] } },
};

/* ---------- Магазины ---------- */
const SHOPS = {
  smith: { name:'Кузница Хильды', keeper:'smith', items:[
    'straight_sword','dagger','axe','spear','bow','greatsword',
    'wooden','iron','tower','leather','chain','plate','resin','ring_stam','estus_shard' ],
    stock:{ estus_shard:1 } },
  mage: { name:'Башня Вейлы', keeper:'mage', items:[
    'staff','spell_firebolt','spell_ice','spell_soularrow','spell_heal',
    'spell_stoneskin','spell_flame_wave','spell_lightning','ring_magic' ] },
  herbalist: { name:'Лавка Марты', keeper:'herbalist', items:[ 'bread','resin','ring_hp' ] },
};

/* ---------- NPC и диалоги ----------
   api: { G, say(text,opts), close(), startQuest(id), advance(id), openShop(id),
          give(id,n), take(id,n), has(id,n), q(id), flag(f), setFlag(f,v), toast(t) } */
const NPCS = {
  elder: { name:'Староста Берен', color:'#c9a86a', role:'Староста Тихого Дола',
    talk(api){
      const q = api.q('main');
      if(!q){
        api.say('Странник… Ты пришёл в дурной час. Солнце угасает — каждый рассвет короче прежнего. Культ Угасания похитил Сердце Рассвета и спрятал его в крипте за Сумрачным лесом. Без него тьма поглотит мир.', [
          { label:'Я добуду Сердце. С чего начать?', fn(){ api.startQuest('main');
            api.say('Найдите отшельника Одра — он живёт на юго-востоке Сумрачного леса и знает тропу к крипте. Восточная тропа из деревни ведёт в лес. Да хранит вас последний свет.', [
              { label:'Я отправляюсь.', fn: api.close } ]); } },
          { label:'Мне нужно подумать.', fn: api.close },
        ]);
      } else if(q.done){
        api.say('Рассвет вернулся, странник. Твоё имя будут петь у каждого костра. Тихий Дол навсегда в твоём долгу.', [
          { label:'Свет вернулся не для того, чтобы стоять на месте.', fn: api.close } ]);
      } else if(q.stage===2){
        api.say('Сердце Рассвета! Я чувствую его тепло даже сквозь ткань. Слушай: Сердце — ключ. На севере старых руин стоят Врата Рассвета. Приложи Сердце к ним — и они откроют Пик, где гнездится Пожиратель. Убей его, и солнце взойдёт навеки.', [
          { label:'Я поднимусь на Пик.', fn(){ api.advance('main'); api.close(); } },
          { label:'Что за тварь этот Пожиратель?', fn(){
            api.say('Древний демон, рождённый из первой ночи. Он питается светом. Культисты кормят его рассветами — потому солнце и гаснет. Сталь и магия — вот весь мой совет. И фляга. Не забывайте флягу.', [
              { label:'Я готов.', fn(){ api.advance('main'); api.close(); } } ]); } },
        ]);
      } else if(q.stage===0){
        api.say('Отшельник Одр ждёт вас на юго-востоке Сумрачного леса. Идите по восточной тропе из деревни.', [
          { label:'Иду.', fn: api.close } ]);
      } else if(q.stage===1){
        api.say('Крипта — на востоке леса, за запертой решёткой. Одр должен был дать вам ключ. Будьте осторожны: мёртвые там не спят.', [
          { label:'Я справлюсь.', fn: api.close } ]);
      } else {
        api.say('Врата Рассвета — на севере руин. Сердце откроет их. Судьба мира в ваших руках, странник.', [
          { label:'Я не подведу.', fn: api.close } ]);
      }
    } },

  smith: { name:'Кузнец Хильда', color:'#b06a3a', role:'Кузнец',
    talk(api){
      const q = api.q('side_bandits');
      if(q && !q.done && q.stage===1){
        api.say('Дороги чисты?! Ха! Отличная работа. Держи — клеймор, который я ковала для сына. Пусть он служит тому, кто не боится крови. И заходи за снаряжением.', [
          { label:'Спасибо, Хильда. (Получить клеймор и 400 душ)', fn(){ api.advance('side_bandits'); api.close(); } },
          { label:'Показать товар.', fn(){ api.advance('side_bandits'); api.openShop('smith'); } },
        ]);
        return;
      }
      const opts = [ { label:'Показать товар.', fn(){ api.openShop('smith'); } } ];
      if(!q) opts.unshift({ label:'Есть работа для стали?', fn(){ api.startQuest('side_bandits');
        api.say('Разбойники обнаглели — режут караваны в лесу и руинах. Прибей шестерых, и я отдам тебе лучшую сталь, что вышла из этого горна. Договорились?', [
          { label:'Договорились.', fn: api.close } ]); } });
      if(q && !q.done && q.stage===0) opts.unshift({ label:'Как успехи с разбойниками?', fn(){
        api.say('Шестерых, странник. Считай ворон и не жалей сталь. Пока — ' + api.q('side_bandits').prog + ' из 6.', [
          { label:'Продолжаю охоту.', fn: api.close } ]); } });
      opts.push({ label:'До встречи.', fn: api.close });
      api.say('Сталь не любит ржавчину, а я — бездельников. Покупай, что по карману, или заслужи клеймор делом.', opts);
    } },

  mage: { name:'Чародейка Вейла', color:'#7a5fd0', role:'Чародейка',
    talk(api){
      const q = api.q('side_wraiths');
      if(!api.flag('mageGift')){
        api.setFlag('mageGift', true);
        api.give('spell_firebolt',1);
        api.say('Новое лицо. Тьма сгущается, и одной стали тебе не хватит. Возьми этот гримуар — «Огненный снаряд». Первый урок бесплатно. Сотворение — клавиша F, выбор чар — цифры 1–7. Интеллект усиливает магию.', [
          { label:'Благодарю. Что ещё у вас есть?', fn(){ api.mageMenu(); } },
          { label:'Я запомню.', fn: api.close },
        ]);
        return;
      }
      if(q && !q.done && q.stage===1){
        api.say('Призраки упокоены… Крипта вздохнула свободно. Ты сделал больше, чем целая гвардия. Возьми «Гнев небес» — молнию, которой я боялась учить кого-либо. И души в придачу.', [
          { label:'Принимаю дар. (Изучить «Гнев небес», +500 душ)', fn(){ api.advance('side_wraiths'); api.close(); } } ]);
        return;
      }
      api.mageMenu();
    },
    mageMenu(api){
      const q = api.q('side_wraiths');
      const opts = [ { label:'Показать гримуары и посохи.', fn(){ api.openShop('mage'); } } ];
      if(!q) opts.unshift({ label:'Есть дело для чар?', fn(){ api.startQuest('side_wraiths');
        api.say('В крипте рыщут призраки — души, не нашедшие покоя. Упокой троих, и я открою тебе тайну молнии. Призраки бьют издалека самонаводящимися сгустками — перекатывайся сквозь них.', [
          { label:'Я упокою их.', fn: api.close } ]); } });
      opts.push({ label:'До встречи.', fn: api.close });
      api.say('Магия — это воля, оформленная в свет. Что тебе нужно, странник?', opts);
    } },

  herbalist: { name:'Травница Марта', color:'#5fa05a', role:'Травница',
    talk(api){
      const q = api.q('side_herbs');
      if(q && !q.done && q.stage===1){
        api.say('Светоцветы! Живые, светятся… Из них выйдет лекарство для стариков — тьма плохо влияет на сердце. Возьми осколок эстуса: уковывай его у костра… впрочем, он сам прирастёт к фляге. И хлеба в дорогу.', [
          { label:'Рада помочь. (Осколок эстуса, хлеб ×3, 300 душ)', fn(){
            api.take('herb',5); api.advance('side_herbs'); api.close(); } },
        ]);
        return;
      }
      const opts = [ { label:'Что продаёте?', fn(){ api.openShop('herbalist'); } } ];
      if(!q) opts.unshift({ label:'Нужна помощь?', fn(){ api.startQuest('side_herbs');
        api.say('Ох, милок… Светоцветы растут в Сумрачном лесу — золотые, светятся даже днём. Принеси пять штук. Без лекарства тьма сведёт стариков в могилы раньше срока. Отдам осколок эстуса — у меня припрятан.', [
          { label:'Соберу пять.', fn: api.close } ]); } });
      if(q && !q.done && q.stage===0) opts.unshift({ label:'О светоцветах…', fn(){
        api.say('Пять штук, милок. Они светятся золотым — не пропустишь. Сейчас у тебя ' + api.count('herb') + ' из 5.', [
          { label:'Ищу дальше.', fn: api.close } ]); } });
      opts.push({ label:'Будьте здоровы.', fn: api.close });
      api.say('Заходи, заходи. Хлеб свежий, смола липкая, а тьма — густая. Чем помочь?', opts);
    } },

  girl: { name:'Лия', color:'#d08ab0', role:'Жительница деревни',
    talk(api){
      const q = api.q('side_amulet');
      if(q && !q.done && q.stage===1){
        api.say('Мамин амулет!! Я думала, потеряла его навсегда, когда бегела от разбойников через руины… Возьми кольцо — оно мамино, но она хотела бы, чтобы оно защищало того, кто вернул мне память. Спасибо, странник!', [
          { label:'Носите его память с гордостью. (Кольцо жизни, 250 душ)', fn(){
            api.take('amulet',1); api.advance('side_amulet'); api.close(); } },
        ]);
        return;
      }
      if(!q){
        api.say('Ой… незнакомец. Я Лия. Я… потеряла амулет мамы в старых руинах к северу от леса. Там теперь скелеты, и я боюсь. Он в сундуке — я спрятала его, когда убегала, да так и не вернулась…', [
          { label:'Я найду амулет.', fn(){ api.startQuest('side_amulet');
            api.say('Правда?! Руины — на севере леса. Сундук стоит у западной стены, среди колонн. Спасибо! И… берегись скелетов, они притворяются мёртвыми.', [
              { label:'Берегись сама.', fn: api.close } ]); } },
          { label:'Не сейчас.', fn: api.close },
        ]);
      } else if(q.done){
        api.say('Кольцо греет палец, а сердце — память. Спасибо тебе, странник. Если тьма отступит — приходи на праздник урожая!', [
          { label:'Обязательно.', fn: api.close } ]);
      } else {
        api.say('Амулет… в сундуке у западной стены руин. Серебряный, с портретом. Пожалуйста, будь осторожен.', [
          { label:'Я помню.', fn: api.close } ]);
      }
    } },

  guard: { name:'Стражник Бран', color:'#7a8aa0', role:'Стражник у восточных ворот',
    talk(api){
      api.say('Ворота на восток ведут в Сумрачный лес. Памятка новичку: держи щит (удерживай C), перекатывайся (Пробел) сквозь удары — в перекате ты неуязвим, и пей эстус (R) ДО того, как останется капля здоровья. Выносливость — твоя вторая жизнь: без неё ни удара, ни переката. Ночью твари злее, но душ с них больше.', [
        { label:'Что за тьма творится?', fn(){ api.say('Солнце гаснет, вот что. Староста знает больше. И костёр жги почаще — у костра и фляга полнится, и раны затягиваются, и душу можно в силу обратить. Правда, твари после отдыха восстают. Такова цена света.', [
          { label:'Понял. Спасибо.', fn: api.close } ]); } },
        { label:'Спасибо за совет.', fn: api.close },
      ]);
    } },

  hermit: { name:'Отшельник Одр', color:'#8a9a7a', role:'Отшельник Сумрачного леса',
    talk(api){
      const q = api.q('main');
      if(q && !q.done && q.stage===0){
        api.say('Хе-хе… Живой. Давно не видел живых. Значит, Берен послал тебя за Сердцем? Слушай: крипта — на востоке леса, за ржавой решёткой. Вот ключ. Внутри — Костяной Страж, груда костей на службе культа. Бей по ногам… шучу, бей чем угодно, но перекатывайся сквозь его размашистые удары. И держи флягу полной.', [
          { label:'Взять ключ и отправиться в крипту.', fn(){
            api.give('rusty_key',1); api.advance('main');
            if(!api.flag('hermitShard')){ api.setFlag('hermitShard',true); api.give('estus_shard',1);
              api.say('И вот ещё — осколок эстуса. Нашёл на месте гибели одного такого же смельчака. Пусть его фляга поит твою. Ключ у тебя. Крипта — на востоке, за решёткой. Ступай.', [
                { label:'Спасибо, Одр. (Ключ, осколок эстуса)', fn: api.close } ]);
            } else api.close(); } },
          { label:'Расскажи о лесе.', fn(){ api.say('Волки стаями на западе, разбойники на северо-востоке — их атаман Грыж опасен, но душ с него много. Светоцветы светятся золотым — Марта их скупает. А мой костёр жги смело: он твой, пока ты жив. Хе-хе.', [
            { label:'Пора в крипту. (Взять ключ)', fn(){
              api.give('rusty_key',1); api.advance('main'); api.close(); } },
            { label:'Позже.', fn: api.close } ]); } },
        ]);
      } else if(!q){
        api.say('Хе-хе… Странник без цели. Поговори со старостой Береном в Тихом Доле — он ищет храбреца. А я пока подброшу дров в костёр.', [
          { label:'Пожалуй, так и сделаю.', fn: api.close } ]);
      } else if(q.done){
        api.say('Солнце… настоящее, тёплое. Я и забыл, какое оно. Хе-хе… Спасибо, странник. Садись к костру, расскажи, как ты разделался с Пожирателем.', [
          { label:'В другой раз, Одр.', fn: api.close } ]);
      } else if(q.stage===1){
        api.say('Крипта — на востоке леса. Ключ у тебя. Костяной Страж силён, но каждый его удар виден заранее: красная дуга на земле — уходи перекатом. Ступай.', [
          { label:'Иду.', fn: api.close } ]);
      } else {
        api.say('Врата Рассвета — на севере руин. Сердце откроет их. Дальше — только ты и тьма. Хе-хе… Удачи, странник.', [
          { label:'Спасибо.', fn: api.close } ]);
      }
    } },
};

/* ---------- Локации (описания для вкладки «Карта») ---------- */
const LOC_INFO = {
  village: { name:'Тихий Дол', desc:'Деревня у костра. Кузница, башня чародейки, лавка травницы. Здесь безопасно.' },
  forest:  { name:'Сумрачный лес', desc:'Волки, разбойники и светоцветы. Лагерь отшельника на юго-востоке. Крипта — за восточной решёткой.' },
  ruins:   { name:'Старые руины', desc:'Колонны павшего храма. Скелеты и культисты. На севере — Врата Рассвета.' },
  crypt:   { name:'Крипта Угасания', desc:'Гробница под лесом. Упыри, призраки и Костяной Страж с Сердцем Рассвета.' },
  citadel: { name:'Пик Рассвета', desc:'Пепельная вершина над миром. Логово Пожирателя Рассвета.' },
};

/* ---------- Тексты ---------- */
const INTRO_TEXT = [
  'Триста лет солнце всходило над Тихым Долом. Теперь каждый рассвет короче прежнего.',
  'Культ Угасания похитил Сердце Рассвета и кормит им древнего демона — Пожирателя, что пожирает свет на Пике Рассвета.',
  'Ты — безымянный странник с обломком меча и флягой эстуса. У костров ты обратишь души в силу. У тьмы — отберёшь рассвет.',
];
const ENDING_TEXT = [
  'Пожиратель рассыпается пеплом — и пепел этот впервые за триста лет светится.',
  'Сердце Рассвета вспыхивает в твоих руках, и небо над Пиком раскалывается золотом.',
  'Солнце восходит. Полное, тёплое, настоящее. Где-то далеко, в Тихом Доле, староста Берен снимает шапку.',
  'Твоё имя будут петь у каждого костра, странник. Рассвет вернулся.',
];