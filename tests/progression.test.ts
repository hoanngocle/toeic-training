import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getProgression } from '../lib/progression/summary.ts';
import { progressionConfig } from '../lib/progression/config.ts';
test('Nova thresholds and realm stages survive the port',()=>{
 for(const [exp,level,realm,stage] of [[0,1,'Phàm Nhân',null],[281,2,'Luyện Khí','Tầng 1'],[5000,11,'Trúc Cơ','Tầng 1'],[172750,100,'Đại La Kim Tiên','Đại Viên Mãn'],[221388,116,'Thánh Nhân','Đại Viên Mãn'],[224570,117,'Vũ Trụ Cấp','Sơ Giai'],[540000,200,'Siêu Thoát','Cực Hạn']] as const){
  const s=getProgression(exp);assert.equal(s.level,level);assert.equal(s.realmName,realm);assert.equal(s.stageName,stage);
  if(exp) assert.equal(getProgression(exp-1).level,level-1);
  assert.equal(getProgression(exp+1).level,level);
 }
 assert.equal(progressionConfig.levels.length,200);assert.equal(progressionConfig.realms.length,42);
 const max=getProgression(600000);assert.equal(max.progressPercent,100);assert.equal(max.expToNextLevel,0);assert.equal(max.isMaxLevel,true);
 assert.equal(getProgression(280).expToNextLevel,1);
 for(const n of [-1,NaN,Infinity,0.5,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>getProgression(n));
});
