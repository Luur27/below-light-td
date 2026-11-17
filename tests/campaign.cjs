'use strict';
const assert=require('node:assert/strict');
global.window=global;
require('../biomes.js');
require('../engine.js');
const D=global.Deep, profile=D.profile();
function coverage(b,pad,type){
  const {range}=D.weapons[type],v=b.pads[pad];
  return b.paths.reduce((score,path)=>{
    for(let d=0;d<path.length;d+=10){
      const s=D.point(path,d);
      if(Math.hypot(v.x-s.x,v.y-s.y)<range)score++;
    }
    return score;
  },0);
}
function prepare(b){
  const types=['mine','cryo','harpoon','mine'];
  let changed=true;
  while(changed){
    changed=false;
    if(b.towers.length<5){
      const type=types[b.towers.length-1],candidates=b.pads.map((_,i)=>i).filter(i=>!b.towers.some(t=>t.pad===i));
      candidates.sort((i,j)=>coverage(b,j,type)-coverage(b,i,type));
      changed=b.build(type,candidates[0]);
    }else{
      const viable=b.towers.filter(t=>t.level<5);
      viable.sort((a,c)=>a.level-c.level||coverage(b,c.pad,c.type)-coverage(b,a.pad,a.type));
      if(viable.length){
        const t=viable[0];changed=b.upgrade(t,t.type==='harpoon'?1:0);
      }else if(b.towers.length<b.pads.length){
        const pad=b.pads.findIndex((_,i)=>!b.towers.some(t=>t.pad===i));
        changed=b.build('harpoon',pad);
      }
    }
  }
}
function resolveWave(b){
  assert(b.launch());let i=0;
  while(b.phase==='battle' && i++<18000){
    if(b.cool<=0 && b.enemies.length>=5)b.pulse();
    b.tick(1/30);
  }
  assert.notEqual(b.phase,'battle','wave timed out');
}
let campaignSeconds=0;
for(const m of D.missions){
  assert(D.unlocked(profile,m.id));
  let b=new D.Battle(m.id,profile);
  for(let w=1;w<=m.waves;w++){
    prepare(b);
    if(w===2){
      campaignSeconds+=b.time;
      const cp=JSON.parse(JSON.stringify(b.snapshot()));
      b=new D.Battle(m.id,profile,false,cp);
      assert.deepEqual(b.snapshot(),cp);
    }
    resolveWave(b);assert.notEqual(b.phase,'lost',m.name+' lost at wave '+w);
  }
  assert.equal(b.phase,'won');assert.equal(profile.best[m.id],m.waves);
  campaignSeconds+=b.time;
  console.log(m.name+' — '+m.waves+' waves, hull '+b.hull+'/'+b.maxHull);
  for(const i of [1,0,3,2])D.research(profile,i);
}
console.log('Campaign battle time at 1x: '+Math.round(campaignSeconds/60)+' minutes');
const bonus=profile.cores, replay=new D.Battle(0,profile);
for(let i=0;i<4;i++){prepare(replay);resolveWave(replay);}
assert.equal(profile.cores,bonus,'repeat wave paid research twice');
const endless=new D.Battle(8,profile,true);
for(let i=0;i<26;i++){prepare(endless);resolveWave(endless);}
assert.equal(endless.phase,'ready');assert.equal(profile.record,26);
const failed=new D.Battle(0,D.profile());failed.towers=[];
while(failed.phase==='ready')resolveWave(failed);
assert.equal(failed.phase,'lost');assert.equal(failed.hull,0);
const signal=new D.Battle(0,D.profile());signal.launch();signal.towers=[];signal.spawn('leviathan');signal.spawn('shell');
signal.enemies[0].callIn=0;signal.tick(1/30);
assert(signal.enemies.every(e=>e.shield>0));assert(signal.pulse());assert(signal.enemies.every(e=>e.shield===0));
for(const type of Object.keys(D.weapons)){
  for(const spec of [0,1]){
    const b=new D.Battle(0,D.profile());b.metal=2000;b.towers=[];
    assert(b.build(type,1));assert.equal(b.build(type,1),false);
    const t=b.towers[0];assert(b.upgrade(t));assert.equal(b.upgrade(t),false);assert(b.upgrade(t,spec));
    assert.equal(t.spec,spec);assert(b.upgrade(t));assert(b.upgrade(t));assert.equal(b.upgrade(t),false);
    const prev=b.metal;assert(b.sell(t));assert.equal(b.metal,prev+Math.floor(t.spent*.65));assert.equal(b.sell(t),false);
  }
}
console.log('OK · campaign, replay, defeat, save round-trip, all specializations, endless wave 26');
