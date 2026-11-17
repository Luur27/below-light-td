(() => {
  'use strict';
  const D=window.Deep, $=id=>document.getElementById(id), dialog=$('dialog');
  const types=Object.keys(D.weapons), key='below-light.campaign.1';
  let data, storageOK=true;
  try{data=JSON.parse(localStorage.getItem(key)||'null');}catch{storageOK=false;}
  const saved=data?.version===1?data:null;
  const p=saved?.profile||D.profile();
  let checkpoint=saved?.checkpoint||null, sound=!!saved?.sound;
  let b, choice='harpoon', selected=null, hover=null, pause=false, speed=1, mode='', audio=null, lastTone=0, noticeTimer;
  const pics={};
  for(const [id,ext] of [...D.biomes.map(v=>[v.id,'webp']),...[...types,...Object.keys(D.fauna),'lift'].map(v=>[v,'png'])]){
    const img=new Image();img.src='assets/'+id+'.'+ext;pics[id]=img;
  }
  function save(){
    if(b.phase==='ready')checkpoint=b.snapshot();
    if(b.phase==='won'||b.phase==='lost')checkpoint=null;
    try{localStorage.setItem(key,JSON.stringify({version:1,profile:p,checkpoint,sound}));storageOK=true;}catch{storageOK=false;}
    $('save-info').textContent=storageOK?'Автосохранение между волнами':'Хранилище браузера недоступно — прогресс сохранится только до закрытия';
  }
  function tone(hz,duration=.09,volume=.025,type='sine'){
    if(!sound)return;
    try{
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if(audio.state==='suspended')audio.resume().catch(()=>{});
      const osc=audio.createOscillator(),gain=audio.createGain(),t=audio.currentTime;
      osc.type=type;osc.frequency.setValueAtTime(hz,t);osc.frequency.exponentialRampToValueAtTime(hz*.58,t+duration);
      gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(volume,t+.008);
      gain.gain.exponentialRampToValueAtTime(.0001,t+duration);osc.connect(gain);gain.connect(audio.destination);
      osc.start(t);osc.stop(t+duration+.02);
    }catch{}
  }
  function notice(message){clearTimeout(noticeTimer);$('notice').textContent=message;$('notice').hidden=false;noticeTimer=setTimeout(()=>$('notice').hidden=true,2700);}
  function start(id,endless=false,cp=null){
    b=new D.Battle(id,p,endless,cp);choice='harpoon';selected=null;hover=null;pause=false;speed=1;lastControls='';lastForecast='';
    if(dialog.open)dialog.close();mode='';$('notice').hidden=true;
    $('board').style.backgroundImage='url("assets/'+b.biome.id+'.webp")';
    $('sector').textContent='ОПЕРАЦИЯ '+String(id+1).padStart(2,'0')+' / '+(endless?'БЕСКОНЕЧНАЯ ВАХТА':b.m.name.toUpperCase());
    $('zone').textContent=b.biome.name;$('depth').textContent='−'+b.m.depth+' м';
    $('map-sign').textContent='● ЛИНИЯ СВЯЗИ  /  '+b.m.rule.toUpperCase();
    const pads=$('pads');pads.replaceChildren();
    b.pads.forEach((pos,i)=>{
      const btn=document.createElement('button');btn.className='pad';btn.style.left=pos.x/10+'%';btn.style.top=pos.y/5.625+'%';
      btn.onclick=()=>selectPad(i);btn.onpointerenter=btn.onfocus=()=>{hover=i;};
      btn.onpointerleave=btn.onblur=()=>{hover=null;};pads.append(btn);
    });
    update();save();
  }
  function selectPad(i){
    if(!['ready','battle'].includes(b.phase))return;
    const t=b.towers.find(t=>t.pad===i);
    if(t){selected=t;choice=null;}
    else if(!choice){notice('Сначала выбери орудие в панели обороны.');return;}
    else if(b.build(choice,i)){selected=b.towers[b.towers.length-1];choice=null;tone(380,.14);save();}
    else{notice('Не хватает металла для постройки.');return;}
    update();
  }
  function pick(type){choice=type;selected=null;update();}
  function launch(){
    if(b.phase!=='ready')return;
    save();pause=false;b.launch();tone(490,.24);update();
  }
  function impulse(){
    if(pause)return;
    if(b.pulse()){tone(155,.7,.065);notice('Импульс прошёл. Вся стая замедлена.');update();}
  }
  function togglePause(){if(b.phase!=='battle')return;pause=!pause;update();}
  $('launch').onclick=launch;$('pulse').onclick=impulse;$('pause').onclick=togglePause;
  $('speed').onclick=()=>{speed=speed===1?2:speed===2?3:1;update();};
  $('sound').onclick=()=>{sound=!sound;tone(500,.18);save();update();};
  for(const type of types){
    const w=D.weapons[type],btn=document.createElement('button');btn.className='weapon';btn.dataset.type=type;btn.title=w.desc+' Клавиша '+(types.indexOf(type)+1);
    btn.innerHTML='<img src="assets/'+type+'.png" alt=""><span><b>'+w.name+'</b><small>▰ '+w.cost+'</small></span>';
    btn.onclick=()=>pick(type);$('loadout').append(btn);
  }
  const action=(text,fn,cls='')=>{const btn=document.createElement('button');btn.textContent=text;btn.className=cls;btn.onclick=fn;return btn;};
  function inspector(){
    const box=$('inspector');box.replaceChildren();const info=document.createElement('div');info.className='info';box.append(info);
    if(!selected){
      const w=D.weapons[choice]||D.weapons.harpoon;
      info.innerHTML='<b>'+w.name+' · ▰ '+w.cost+'</b><p>'+w.desc+' Нажми на площадку с плюсом, чтобы построить.</p>';return;
    }
    const t=selected,w=D.weapons[t.type],s=D.stats(t,p),cost=D.upgradeCost(t);
    info.innerHTML='<b>'+w.name+' · Ур. '+t.level+(t.spec>=0?' · '+w.spec[t.spec]:'')+'</b><p>Урон '+Math.round(s.damage)+' · Дальность '+s.range+' м · Интервал '+s.delay.toFixed(2)+' с'+(t.spec>=0?' · '+w.detail[t.spec]:'')+'</p>';
    if(t.level<5){
      const specs=t.level===2?[0,1]:[-1];
      for(const spec of specs){
        const btn=action((spec<0?'Улучшить':w.spec[spec])+' · ▰ '+cost,()=>{
          if(b.upgrade(t,spec)){tone(590,.13);save();update();}
        });
        btn.disabled=b.metal<cost;if(spec>=0)btn.title=w.detail[spec];box.append(btn);
      }
      if(t.level===2)info.querySelector('p').append(' · '+w.spec[0]+': '+w.detail[0]+' '+w.spec[1]+': '+w.detail[1]);
    }
    box.append(action('Разобрать · +'+Math.floor(t.spent*.65),()=>{b.sell(t);selected=null;choice=t.type;save();update();}));
  }
  let lastControls='',lastForecast='';
  function update(){
    const ready=b.phase==='ready',active=b.phase==='battle';
    $('phase').textContent=ready?'ПОДГОТОВКА':b.phase==='won'?'ПОБЕДА':b.phase==='lost'?'АВАРИЯ':'ВОЛНА';
    $('wave').textContent=String(ready?b.wave+1:b.wave).padStart(2,'0')+' / '+(b.endless?'∞':b.m.waves);
    $('metal').textContent=b.metal;$('hull').textContent=b.hull+' / '+b.maxHull;$('cores').textContent=p.cores;
    $('paused').hidden=!pause;$('speed').textContent='×'+speed;$('pause').disabled=!active;$('pause').textContent=pause?'▶':'Ⅱ';
    $('pause').setAttribute('aria-label',pause?'Продолжить':'Пауза');$('sound').textContent=sound?'♫':'♪';$('sound').style.opacity=sound?'1':'.65';$('sound').setAttribute('aria-label',sound?'Выключить звук':'Включить звук');
    $('launch').disabled=!ready;$('launch').textContent=ready?'Начать волну '+(b.wave+1)+'  ›':active?'Идёт волна '+b.wave:'Оборона завершена';
    $('pulse').disabled=!active||pause||b.cool>0||!b.enemies.length;
    $('pulse').textContent=b.cool>0?'Импульс '+Math.ceil(b.cool)+' с':'Импульс';
    const forecastKey=[b.id,b.wave,b.phase,active?b.queue.length+b.enemies.length:0].join('/');
    if(forecastKey!==lastForecast){
      lastForecast=forecastKey;
      if(ready){
        const counts={};for(const k of D.roster(b.id,b.wave+1))counts[k]=(counts[k]||0)+1;
        $('forecast').innerHTML=Object.entries(counts).map(([k,v])=>'<span class="contact" title="'+D.fauna[k].name+'"><img alt="'+D.fauna[k].name+'" src="assets/'+k+'.png">×'+v+'</span>').join('');
      }else $('forecast').textContent=active?'Осталось целей: '+(b.queue.length+b.enemies.length):'Сигнал завершён';
    }
    const controlKey=[b.id,b.phase,choice,selected?.pad,b.metal,b.towers.map(t=>t.pad+'-'+t.level).join(',')].join('/');
    if(lastControls!==controlKey){
      lastControls=controlKey;
      for(const btn of $('loadout').children){const on=btn.dataset.type===choice;btn.classList.toggle('selected',on);btn.setAttribute('aria-pressed',String(on));}
      Array.from($('pads').children).forEach((btn,i)=>{const t=b.towers.find(t=>t.pad===i);btn.setAttribute('aria-label',t?D.weapons[t.type].name+', уровень '+t.level+', площадка '+(i+1):'Строить на площадке '+(i+1));});
      inspector();
    }
  }
  function open(title,tag,content,kind){
    mode=kind;$('modal-title').textContent=title;$('modal-tag').textContent=tag;$('modal-body').innerHTML=content;
    if(!dialog.open)dialog.showModal();dialog.scrollTop=0;
  }
  function leaveDialog(){dialog.close();if(['lost','won'].includes(b.phase))campaign();}
  $('close').onclick=leaveDialog;dialog.addEventListener('cancel',e=>{if(['won','lost'].includes(b.phase)){e.preventDefault();campaign();}});
  function campaign(){
    const html=D.biomes.map((zone,z)=>'<h3>'+zone.name+'</h3><div class="mission-grid">'+D.missions.filter(m=>m.zone===z).map(m=>{
      const avail=D.unlocked(p,m.id);
      return '<div class="mission-card"><small>0'+(m.id+1)+' / '+m.waves+' волн</small><b>'+m.name+'</b><p>'+m.brief+'</p><p>Рекорд '+p.best[m.id]+' / '+m.waves+'</p><button data-start="'+m.id+'" '+(avail?'':'disabled')+'>'+(avail?'Погружение':'Закрыто')+'</button></div>';
    }).join('')+'</div>').join('');
    const finished=p.best[8]>=D.missions[8].waves;
    open('Карта экспедиции','КАМПАНИЯ',html+'<h3>Бесконечная вахта</h3><p>Открывается после девятой операции. Рекорд: '+p.record+' волн.</p><button class="endless" id="infinite" '+(finished?'':'disabled')+'>Уйти в бездну</button>','campaign');
    for(const btn of $('modal-body').querySelectorAll('[data-start]'))btn.onclick=()=>briefing(+btn.dataset.start,false);
    $('infinite').onclick=()=>briefing(8,true);
  }
  function briefing(id,endless){
    const m=D.missions[id];open(endless?'Бесконечная вахта':m.name,m.waves+' ВОЛН · '+D.biomes[m.zone].name.toUpperCase(),
      '<p>'+m.brief+'</p><p>Новая высадка начнётся с первой волны. Текущая расстановка сменится, рекорды и исследования сохранятся.</p><div class="dialog-actions" id="dialog-actions"></div>','brief');
    $('dialog-actions').append(action('Начать погружение',()=>start(id,endless),'primary'),action('К карте',campaign));
  }
  function lab(){
    open('Лаборатория','ОБРАЗЦЫ · '+p.cores,'<p>Первое прохождение каждой четвёртой волны приносит образец, победа в операции — ещё два. Улучшения урона и перезарядки действуют сразу. Груз и переборки применяются при следующем погружении.</p><div class="study-grid">'+D.studies.map((s,i)=>{
      const lvl=p.study[i];return '<div class="study-card"><small>УРОВЕНЬ '+lvl+' / 3</small><b>'+s.name+'</b><p>'+s.desc+'</p><button data-study="'+i+'" '+(lvl>=3||p.cores<lvl+1?'disabled':'')+'>'+(lvl>=3?'Изучено':'Исследовать · '+(lvl+1)+' обр.')+'</button></div>';
    }).join('')+'</div>','lab');
    for(const btn of $('modal-body').querySelectorAll('[data-study]'))btn.onclick=()=>{if(D.research(p,+btn.dataset.study)){tone(670,.18);save();lastControls='';update();lab();}};
  }
  function guide(){
    open('Справочник оператора','УПРАВЛЕНИЕ',
      '<p>Сохрани хотя бы одну единицу прочности лифта до конца последней волны. Гидролокатор под полем показывает состав следующей стаи. В каждой операции один гарпун уже установлен.</p><h3>Оборона</h3><p>Выбери орудие, затем площадку с плюсом. Нажми на построенную башню, чтобы увидеть радиус, улучшить или разобрать её за 65% вложений. На уровне III выбираешь специализацию, предел — уровень V.</p>'+
      types.map(k=>'<div class="guide-row"><img class="guide-icon" alt="" src="assets/'+k+'.png"><b>'+D.weapons[k].name+'</b><p>'+D.weapons[k].desc+' '+D.weapons[k].spec.join(' / ')+'.</p></div>').join('')+
    '<h3>Контакты</h3>'+Object.entries(D.fauna).map(([k,f])=>'<div class="guide-row"><img class="guide-icon" alt="" src="assets/'+k+'.png"><b>'+f.name+'</b><p>Урон лифту '+f.leak+' · Броня '+Math.round(f.armor*100)+'% · Награда '+f.reward+' металла.'+(k==='leviathan'?' Каждые 9 с даёт стае рядом защиту на 3 с. Золотое кольцо выдаёт защищённую цель. Импульс снимает защиту.':'')+'</p></div>').join('')+
      '<h3>Клавиши</h3><p>1–3 — выбор орудия. Пробел — запуск волны или пауза. Q / Й — акустический импульс: наносит урон и замедляет всю стаю. Esc — закрыть окно или снять выбор.</p><h3>Прогресс</h3><p>Расстановка сохраняется перед каждой волной и после её завершения. Если закрыть игру посреди волны, она начнётся заново. Новая операция открывается после победы в предыдущей. Открытая панель и скрытая вкладка приостанавливают бой.</p>','guide');
  }
  function result(){
    const won=b.phase==='won';
    const finale=won&&b.id===8;
    const message=finale?'Последняя клеть выходит из бездны. На борту — образцы со всех трёх районов. Девять операций завершены. В Стеклянной бездне открыта бесконечная вахта.':won?'Груз доставлен. Прочность лифта '+b.hull+' из '+b.maxHull+'. Следующая операция открыта.':'Пройдено волн: '+(b.wave-1)+'. Открытые исследования и образцы сохранены.';
    open(finale?'Экспедиция вернулась':won?'Лифт поднялся':'Связь с лифтом потеряна',b.m.name.toUpperCase(),'<p>'+message+'</p><p>Образцы в лаборатории: '+p.cores+'.</p><div class="dialog-actions" id="dialog-actions"></div>','result');
    $('dialog-actions').append(action(won?(b.id<8?'Следующая операция':'Бесконечная вахта'):'Повторить погружение',()=>start(won?Math.min(8,b.id+1):b.id,won?b.id===8:b.endless),'primary'),action('Лаборатория',lab),action('Карта экспедиции',campaign));
  }
  for(const btn of document.querySelectorAll('[data-menu]'))btn.onclick=()=>({campaign,lab,guide}[btn.dataset.menu]());
  window.addEventListener('keydown',e=>{
    if(dialog.open||e.repeat||e.altKey||e.ctrlKey||e.metaKey)return;
    if(e.code==='Space'){e.preventDefault();b.phase==='ready'?launch():togglePause();}
    if(['Digit1','Digit2','Digit3'].includes(e.code))pick(types[Number(e.code.slice(-1))-1]);
    if(e.code==='KeyQ')impulse();if(e.key==='Escape'){selected=null;choice='harpoon';update();}
  });
  const canvas=$('ocean'),g=canvas.getContext('2d'),W=1000,H=562.5;
  function sprite(id,x,y,w,flip=false,rotation=0,alpha=1){
    const im=pics[id];if(!im?.naturalWidth)return;
    const h=w*im.naturalHeight/im.naturalWidth;
    g.save();g.translate(x,y);g.rotate(rotation);g.scale(flip?-1:1,1);g.globalAlpha=alpha;
    g.drawImage(im,-w/2,-h,w,h);g.restore();
  }
  function ellipse(x,y,rx,ry,color,stroke=false){
    g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);
    if(stroke){g.strokeStyle=color;g.stroke();}else{g.fillStyle=color;g.fill();}
  }
  function barrel(pos,level,tx,ty){
    const scale=69*(1+.035*(level-1))/394;
    const x=pos.x,y=pos.y+1-(282-113)*scale;
    const aim=Number.isFinite(tx)?Math.atan2(ty-y,tx-x):-.12;
    return {x,y,scale,aim};
  }
  function harpoon(pos,t){
    const im=pics.harpoon;if(!im.naturalWidth)return;
    const {x,y,scale,aim}=barrel(pos,t.level,t.aimX,t.aimY);
    g.save();g.translate(x,y);g.scale(scale,scale);
    g.drawImage(im,0,128,394,154,-110,15,394,154);
    const flip=Math.cos(aim)<0;
    g.scale(flip?-1:1,1);
    g.rotate(Math.atan2(Math.sin(aim),Math.abs(Math.cos(aim)))+.23);
    const recoil=b.phase==='battle'?Math.max(0,t.wait-D.stats(t,p).delay+.14)*60:0;
    g.drawImage(im,0,0,394,128,-110-recoil,-113,394,128);g.restore();
  }
  function range(pos,r){
    ellipse(pos.x,pos.y,r,r,'#79eeea15');g.lineWidth=1.4;g.setLineDash([6,5]);ellipse(pos.x,pos.y,r,r,'#9ff7e4a0',true);g.setLineDash([]);
  }
  function scenery(clock){
    const im=pics[b.biome.id];if(im?.naturalWidth)g.drawImage(im,0,0,W,H);else{g.fillStyle='#153642';g.fillRect(0,0,W,H);}
    const target=hover!==null?hover:selected?.pad;
    if(target!==undefined && target!==null){
      const t=b.towers.find(t=>t.pad===target),r=t?D.stats(t,p).range:D.weapons[choice||'harpoon'].range;range(b.pads[target],r);
    }
    if(b.phase==='ready'){
      for(const r of b.paths){
        for(let dist=24;dist<r.length-30;dist+=110){
          const v=D.point(r,(dist+(clock*10)%33));g.save();g.translate(v.x,v.y);g.rotate(v.angle);g.strokeStyle='#ecfff5aa';g.lineWidth=2;g.beginPath();g.moveTo(-5,-3);g.lineTo(0,0);g.lineTo(-5,3);g.stroke();g.restore();
        }
      }
    }
    b.pads.forEach((v,i)=>{
      if(b.towers.some(t=>t.pad===i))return;
      const hot=i===hover;
      g.lineWidth=1.2;ellipse(v.x,v.y,15,8,hot?'#072b30bd':'#17282bc4');
      ellipse(v.x,v.y,15,8,hot?'#a9f9ed':'#e2cd90c0',true);g.strokeStyle=hot?'#cafff5':'#ead29a';g.lineWidth=1.7;
      g.beginPath();g.moveTo(v.x-4,v.y);g.lineTo(v.x+4,v.y);g.moveTo(v.x,v.y-4);g.lineTo(v.x,v.y+4);g.stroke();
      if(hot&&choice)sprite(choice,v.x,v.y,45,false,0,.65);
    });
  }
  function paint(clock){
    g.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);scenery(clock);
    const lift=D.pct(b.biome.lift),lx=Math.min(lift.x,944),drawables=[{y:lift.y,draw:()=>{
      const w=105,top=lift.y+6-w*(pics.lift.naturalHeight/(pics.lift.naturalWidth||1))*.92;
      for(const offset of [-15,13]){
        g.beginPath();g.moveTo(lx+offset-3,-1);g.lineTo(lx+offset,top+7);g.lineWidth=2.6;g.strokeStyle='#172629';g.stroke();
        g.lineWidth=.65;g.strokeStyle='#c6a06c';g.stroke();
      }
      sprite('lift',lx,lift.y+6,w);
    }}];
    for(const t of b.towers){
      const pos=b.pads[t.pad];
      drawables.push({y:pos.y,draw:()=>{
        const firing=t.wait>0 && b.phase==='battle',flip=firing&&(t.type==='mine'?Math.cos(t.angle)>0:Math.cos(t.angle)<0);
        const w=t.type==='cryo'?51:69;ellipse(pos.x,pos.y-1,w*.43,w*.10,'#07171a66');
        if(t===selected){g.lineWidth=1.8;ellipse(pos.x,pos.y,w*.48,w*.15,'#9dfae9',true);}
        if(t.type==='harpoon')harpoon(pos,t);
        else sprite(t.type,pos.x,pos.y+1,w*(1+.035*(t.level-1)),flip);
        if(t.level>1){for(let j=0;j<t.level;j++){g.fillStyle=t.spec<0?'#a8f3ef':'#f9cb73';g.fillRect(pos.x-2.5*t.level+j*5,pos.y+3,3,2);}}
      }});
    }
    for(const e of b.enemies){
      drawables.push({y:e.y,draw:()=>{
        const f=D.fauna[e.type],w=f.size,swim=Math.sin(clock*(e.type==='ray'?5:8)+e.uid);
        ellipse(e.x,e.y+1,w*.36,w*.09,'#07171a55');if(e.slow)ellipse(e.x,e.y,w*.43,w*.13,'#6be9f391');
        sprite(e.type,e.x,e.y+2+swim*1.35,w,Math.cos(e.angle)<0,Math.sin(e.angle)*.15+swim*.025);
        if(e.shield>0){g.lineWidth=1.7;ellipse(e.x,e.y-w*.18,w*.51,w*.23,'#ffda85b0',true);}
        if(e.hp<e.max||e.type==='leviathan'){
          const width=e.type==='leviathan'?49:25,ratio=pics[e.type].naturalHeight/(pics[e.type].naturalWidth||1),y=e.y-w*ratio-3;
          g.fillStyle='#112124';g.fillRect(e.x-width/2-1,y-1,width+2,4.5);g.fillStyle=e.exposed?'#f9ca71':'#fc8e70';g.fillRect(e.x-width/2,y,width*Math.max(0,e.hp/e.max),2.5);
        }
      }});
    }
    drawables.sort((a,c)=>a.y-c.y).forEach(o=>o.draw());
    for(const fx of b.effects){
      const frac=fx.life/fx.max;g.save();g.globalAlpha=frac;g.lineWidth=fx.kind==='cryo'?2.2:1.5;
      if(fx.kind==='pulse'){g.lineWidth=4;ellipse(fx.x,fx.y,(1-frac)*1100+.01,(1-frac)*800+.01,'#b5fffd',true);}
      else if(fx.kind==='call'){g.lineWidth=2;ellipse(fx.x,fx.y,5+(1-frac)*100,3+(1-frac)*48,'#ffdb86',true);}
      else if(fx.kind==='mine'){ellipse(fx.tx,fx.ty,6+(1-frac)*32,4+(1-frac)*17,'#ffb85999');ellipse(fx.tx,fx.ty,6+(1-frac)*32,4+(1-frac)*17,'#fff3aa',true);}
      else{
        let startX=fx.x,startY=fx.y;
        if(fx.kind==='harpoon'){
          const mount=barrel({x:fx.x,y:fx.y+18},fx.level,fx.tx,fx.ty);
          const length=Math.min(282*mount.scale,Math.hypot(fx.tx-mount.x,fx.ty-mount.y));
          startX=mount.x+length*Math.cos(mount.aim);startY=mount.y+length*Math.sin(mount.aim);
        }
        g.strokeStyle=fx.kind==='cryo'?'#9effff':'#ffdf99';g.beginPath();g.moveTo(startX,startY);g.lineTo(fx.tx,fx.ty);g.stroke();
      }
      g.restore();
    }
    for(let i=0;i<16;i++){
      const x=(i*197.9+Math.sin(clock+i)*2)%W,y=H-((i*63.4+clock*(4+i%4))%H);
      g.lineWidth=.6;ellipse(x,y,1.1+i%3*.35,1.4+i%3*.35,'#cdfbff5e',true);
    }
  }
  function resize(){
    const density=Math.min(2,window.devicePixelRatio||1),width=Math.max(640,Math.round(canvas.clientWidth*density));
    canvas.width=width;canvas.height=Math.round(width*9/16);
  }
  const nextMission=p.best.findIndex((v,i)=>v<D.missions[i].waves);
  const resumeId=checkpoint?.id??(nextMission<0?8:nextMission);
  start(resumeId,!!checkpoint?.endless,checkpoint);resize();new ResizeObserver(resize).observe($('board'));
  let prev=0,acc=0,clock=0,refresh=0;
  function loop(ms){
    const dt=prev?Math.min(.1,(ms-prev)/1000):0;prev=ms;
    if(!dialog.open && !pause && !document.hidden){
      clock+=dt*(b.phase==='battle'?speed:1);
      if(b.phase==='battle'){
        acc+=dt*speed;const before=b.effects.length,coresBefore=p.cores;
        while(acc>=1/30 && b.phase==='battle'){b.tick(1/30);acc-=1/30;}
        if(b.effects.length>before && ms-lastTone>170){const fx=b.effects[b.effects.length-1];tone(fx.kind==='mine'?75:fx.kind==='cryo'?710:200,.08,.014);lastTone=ms;}
        if(b.phase!=='battle'){acc=0;save();update();if(b.phase==='ready'){tone(710,.2);notice(p.cores>coresBefore?'Волна отражена. +1 образец для лаборатории.':'Волна отражена. Можно укрепить оборону.');}else result();}
      }
    }
    if(!document.hidden){paint(clock);if(ms-refresh>150){update();refresh=ms;}}
    requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange',()=>{prev=0;acc=0;});requestAnimationFrame(loop);
})();
