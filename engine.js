/* Simulation and campaign data. Coordinates use a fixed 1000 × 562.5 battlefield. */
(() => {
  'use strict';
  const basalt = {
    id: 'basalt', name: 'Базальтовый разлом',
    path: [[4,39],[9,43],[16,45],[22,44],[27,40],[32,33],[37,29],[41,28.5],[45,30],[49,34],[53,40],[56,47],[58.5,56],[60.5,63],[64,66],[68.5,66],[72.5,62],[76,56],[80.5,50],[85,46],[91,44]],
    pads: [[25,20],[39,36.5],[53,21],[24.5,52],[45.8,55],[66.5,49],[71,35],[78,70],[53,81]],
    lift: [91.5,45]
  };
  const biomes = [basalt, ...(globalThis.extraBiomes || [])];
  const missions = [
    ['Первый спуск',0,12,840,'Разведка','Научи орудия держать первый поворот.'],
    ['Линь связи',0,15,920,'Косяк','Быстрые скаты заходят вслед за передовой стаей.'],
    ['Два притока',0,18,1080,'Притоки','Часть стаи приходит через нижнее русло.'],
    ['Чёрный ящик',1,14,1460,'Рой','Много мелких целей. Мины особенно эффективны.'],
    ['Сухой док',1,17,1680,'Панцири','Броневики прикрывают подход быстрых скатов.'],
    ['Последний рейс',1,20,1840,'Конвой','Два левиафана идут с коротким интервалом в финале.'],
    ['Холодный свет',2,16,2340,'Течение','Скаты двигаются быстрее обычного.'],
    ['Хрустальный свод',2,19,2680,'Броня','У панцирников усиленная защита.'],
    ['Ниже света',2,24,3120,'Матка','Смешанные стаи и тройная атака левиафанов в финале.']
  ].map(([name,zone,waves,depth,rule,brief],id)=>({id,name,zone,waves,depth,rule,brief}));
  const weapons = {
    harpoon:{name:'Гарпун',cost:60,damage:18,delay:0.9,range:177,desc:'Одиночная цель. Дальняя дистанция.',spec:['Лебёдка','Бронебой'],detail:['Каждый третий выстрел оттягивает цель назад.','Пробивает броню и на 4 с открывает цель для всех орудий.']},
    mine:{name:'Минная башня',cost:85,damage:19,delay:1.75,range:145,desc:'Взрыв задевает всю группу.',spec:['Кассета','Глубинная мина'],detail:['Расширяет область взрыва с 38 до 66 м.','Наносит на 65% больше урона при прямом попадании.']},
    cryo:{name:'Криоизлучатель',cost:70,damage:5,delay:0.62,range:130,desc:'Охлаждает и замедляет группу.',spec:['Вечная мерзлота','Резонанс'],detail:['Усиливает и продлевает замедление.','Охлаждённые цели получают на 30% больше урона.']}
  };
  const fauna = {
    fry:{name:'Рачок',hp:28,speed:30,armor:0,reward:3,leak:1,size:39},
    ray:{name:'Скат',hp:34,speed:55,armor:0,reward:4,leak:1,size:52},
    shell:{name:'Панцирник',hp:105,speed:21,armor:0.42,reward:8,leak:2,size:72},
    leviathan:{name:'Левиафан',hp:530,speed:16,armor:0.22,reward:30,leak:6,size:114}
  };
  const studies=[
    {name:'Грузовой отсек',desc:'+25 металла при высадке.'},
    {name:'Баллистика',desc:'+8% урона всех орудий.'},
    {name:'Переборки',desc:'+3 прочности лифта при высадке.'},
    {name:'Гидроакустика',desc:'На 3 с быстрее перезаряжается импульс.'}
  ];
  const pct=([x,y])=>({x:x*10,y:y*5.625});
  function route(points){
    const pts=points.map(pct), distances=[0];
    for(let i=1;i<pts.length;i++) distances.push(distances[i-1]+Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y));
    return {pts,distances,length:distances[distances.length-1]};
  }
  function point(r,d){
    let i=1;
    while(i<r.pts.length-1 && d>r.distances[i]) i++;
    const a=r.pts[i-1], b=r.pts[i], k=Math.max(0,Math.min(1,(d-r.distances[i-1])/(r.distances[i]-r.distances[i-1] || 1)));
    return {x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k,angle:Math.atan2(b.y-a.y,b.x-a.x)};
  }
  function profile(){return {best:missions.map(()=>0),cores:0,study:[0,0,0,0],record:0};}
  function unlocked(p,id){return id===0 || (id>0 && p.best[id-1]>=missions[id-1].waves);}
  function research(p,i){
    const lvl=p.study[i], cost=lvl+1;
    if(lvl>=3 || p.cores<cost) return false;
    p.cores-=cost;p.study[i]++;return true;
  }
  function roster(id,w){
    const m=missions[id], list=[], total=7+Math.floor(w*0.72)+m.zone*2+(id===3?4:0);
    for(let i=0;i<total;i++){
      const n=(i+w)%9;
      let kind='fry';
      if((w>=3 || id===1 || id===6) && (n===2 || n===3 || (id===1 && n===4))) kind='ray';
      if((w>=4 || id===4 || id===7) && (n===6 || ((id===4 || id===7) && n===7))) kind='shell';
      list.push(kind);
    }
    if(w%6===0 || w===m.waves){
      list.splice(Math.floor(total/3),0,'leviathan');
      if(w===m.waves && id>=5) list.push('leviathan');
      if(w===m.waves && id===8) list.splice(Math.floor(total/2),0,'leviathan');
    }else if(w%5===0){
      list.sort((a,b)=>fauna[a].speed-fauna[b].speed);
    }else if(w%4===0 && id>=3){
      list.splice(Math.floor(total/2),0,'ray','ray','ray','ray');
    }
    return list;
  }
  function stats(t,p){
    const b=weapons[t.type],lvl=t.level-1;
    return {damage:b.damage*(1+lvl*0.54)*(1+p.study[1]*0.08),range:b.range+lvl*7,delay:b.delay/(1+lvl*0.09)};
  }
  function upgradeCost(t){return Math.round(weapons[t.type].cost*(0.6+t.level*0.35));}
  class Battle {
    constructor(id,p,endless=false,checkpoint=null){
      this.id=id;this.p=p;this.m=missions[id];this.biome=biomes[this.m.zone];this.endless=endless;
      this.paths=[route(this.biome.path)];
      if(id===2) this.paths.push(route([[31,79],[35,77],[39,73],[45,71],[50,70],[56,70],[61,69],...basalt.path.slice(14)]));
      this.pads=this.biome.pads.map(pct);this.wave=0;this.maxHull=20+3*p.study[2];this.hull=this.maxHull;
      this.metal=145+25*p.study[0];this.towers=[];this.phase='ready';this.enemies=[];this.effects=[];this.queue=[];this.cool=0;this.time=0;this.sequence=0;
      if(checkpoint) {
        this.wave=checkpoint.wave;this.hull=checkpoint.hull;this.maxHull=checkpoint.maxHull;this.metal=checkpoint.metal;
        this.cool=checkpoint.cool;this.towers=checkpoint.towers.map(t=>({...t,wait:0,hits:0}));
      } else {
        const pick=this.pads.map((p,i)=>({i,dist:Math.min(...this.paths[0].pts.map(v=>Math.hypot(p.x-v.x,p.y-v.y)))})).filter(v=>v.dist<130);
        this.towers.push(this.newTower('harpoon',pick.length?pick[Math.min(1,pick.length-1)].i:0));
      }
    }
    newTower(type,pad){return {type,pad,level:1,spec:-1,wait:0,hits:0,spent:weapons[type].cost,angle:0};}
    snapshot(){return {id:this.id,endless:this.endless,wave:this.wave,hull:this.hull,maxHull:this.maxHull,metal:this.metal,cool:this.cool,towers:this.towers.map(({type,pad,level,spec,spent,angle})=>({type,pad,level,spec,spent,angle}))};}
    build(type,pad){
      if(!['ready','battle'].includes(this.phase)||!weapons[type]||!this.pads[pad]||this.towers.some(t=>t.pad===pad)||this.metal<weapons[type].cost)return false;
      this.metal-=weapons[type].cost;this.towers.push(this.newTower(type,pad));return true;
    }
    upgrade(t,spec=-1){
      if(!this.towers.includes(t)||t.level>=5||this.metal<upgradeCost(t)||(t.level===2 && ![0,1].includes(spec)))return false;
      const cost=upgradeCost(t);this.metal-=cost;t.spent+=cost;t.level++;if(t.level===3)t.spec=spec;return true;
    }
    sell(t){
      if(!this.towers.includes(t))return false;
      this.metal+=Math.floor(t.spent*0.65);this.towers.splice(this.towers.indexOf(t),1);return true;
    }
    launch(){
      if(this.phase!=='ready')return false;
      this.wave++;this.queue=roster(this.id,this.wave);this.spawnClock=0;this.phase='battle';return true;
    }
    spawn(type){
      const f=fauna[type],mult=(1+this.id*.10)*(1+0.14*(this.wave-1)+0.006*(this.wave-1)**2);
      const path=this.sequence++%this.paths.length;
      const e={type,hp:f.hp*mult,max:f.hp*mult,d:0,path,...point(this.paths[path],0),slow:0,factor:1,exposed:0,bonus:1,shield:0,callIn:7,uid:this.sequence};
      this.enemies.push(e);
    }
    pulse(){
      if(this.phase!=='battle'||this.cool>0||!this.enemies.length)return false;
      this.cool=28-3*this.p.study[3];this.effects.push({kind:'pulse',life:1,max:1,...pct(this.biome.lift)});
      for(const e of this.enemies){e.hp-=12+this.wave*1.7;e.slow=3;e.factor=0.48;e.shield=0;if(e.type==='leviathan')e.callIn=9;}return true;
    }
    fire(t,e){
      const base=stats(t,this.p),pos=this.pads[t.pad], type=t.type;
      t.wait=base.delay;t.hits++;t.angle=Math.atan2(e.y-pos.y,e.x-pos.x);
      this.effects.push({kind:type,life:0.28,max:0.28,x:pos.x,y:pos.y-18,tx:e.x,ty:e.y-5,level:t.level});
      t.aimX=e.x;t.aimY=e.y-5;
      const area=type==='mine'?(t.spec===0?66:38):type==='cryo'?26:0;
      for(const target of this.enemies){
        if(target!==e && (!area || Math.hypot(target.x-e.x,target.y-e.y)>area))continue;
        let armor=fauna[target.type].armor;
        if(this.id===7 && target.type==='shell')armor+=0.12;
        if(type==='harpoon' && t.spec===1){armor=0;target.exposed=4;target.bonus=1.22;}
        const damage=base.damage*(1-armor)*(target.shield>0?.55:1)*(target.exposed>0?target.bonus:1)*(type==='mine'&&t.spec===1&&target===e?1.65:1);
        target.hp-=damage;
        if(type==='cryo'){target.slow=t.spec===0?3:1.5;target.factor=t.spec===0?0.32:0.58;if(t.spec===1){target.exposed=2;target.bonus=1.3;}}
        if(type==='harpoon'&&t.spec===0&&t.hits%3===0)target.d=Math.max(0,target.d-(target.type==='leviathan'?7:23));
      }
    }
    tick(dt){
      if(this.phase!=='battle')return;
      this.time+=dt;this.cool=Math.max(0,this.cool-dt);
      for(const fx of this.effects)fx.life-=dt;
      this.effects=this.effects.filter(fx=>fx.life>0);
      this.spawnClock-=dt;
      if(this.queue.length && this.spawnClock<=0){this.spawn(this.queue.shift());this.spawnClock=Math.max(0.37,0.85-this.wave*0.012);}
      for(const e of this.enemies){
        e.shield=Math.max(0,e.shield-dt);
        if(e.type==='leviathan' && e.hp>0){
          e.callIn-=dt;
          if(e.callIn<=0){
            e.callIn=9;
            for(const ally of this.enemies)if(Math.hypot(ally.x-e.x,ally.y-e.y)<105)ally.shield=3;
            this.effects.push({kind:'call',x:e.x,y:e.y,life:.65,max:.65});
          }
        }
        e.slow=Math.max(0,e.slow-dt);e.exposed=Math.max(0,e.exposed-dt);
        e.d+=fauna[e.type].speed*(e.slow?e.factor:1)*(this.id===6 && e.type==='ray'?1.25:1)*dt;
        Object.assign(e,point(this.paths[e.path],e.d));
      }
      for(const t of this.towers){
        t.wait-=dt;if(t.wait>0)continue;
        const pos=this.pads[t.pad],range=stats(t,this.p).range;
        let target=null,left=Infinity;
        for(const e of this.enemies){const rem=this.paths[e.path].length-e.d;
          if(e.hp>0 && rem<left && Math.hypot(e.x-pos.x,e.y-pos.y)<=range){target=e;left=rem;}}
        if(target)this.fire(t,target);
      }
      this.enemies=this.enemies.filter(e=>{
        if(e.hp<=0){this.metal+=fauna[e.type].reward;return false;}
        if(e.d>=this.paths[e.path].length){this.hull=Math.max(0,this.hull-fauna[e.type].leak);return false;}
        return true;
      });
      if(this.hull<=0){this.phase='lost';return;}
      if(this.enemies.length||this.queue.length)return;
      this.metal+=14+this.m.zone*3;
      const prev=this.p.best[this.id];
      if(this.endless)this.p.record=Math.max(this.p.record,this.wave);
      else if(this.wave>prev){
        this.p.best[this.id]=this.wave;
        if(this.wave%4===0)this.p.cores++;
        if(this.wave===this.m.waves)this.p.cores+=2;
      }
      this.phase=!this.endless && this.wave===this.m.waves?'won':'ready';this.effects=[];
    }
  }
  globalThis.Deep={missions,biomes,weapons,fauna,studies,profile,unlocked,research,roster,stats,upgradeCost,Battle,pct,point};
})();
