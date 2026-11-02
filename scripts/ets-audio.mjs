import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const require = createRequire('C:/Users/NYX/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const { chromium } = require('playwright');
const root = join(process.cwd(), 'ETS 2024/AUDIO - ETS 2024');
const files = [];
for (let part = 1; part <= 4; part++) for(let test=1;test<=5;test++) files.push({id:test===1?`cut-${part}`:`cut-${part}-${test}`,path:join(root,`AUDIO CẮT TỪNG PART/PART ${part}/PART ${part} - TEST ${test}.mp3`)});
for (let test = 1; test <= 10; test++) files.push({id:`full-${test}`,path:join(root,`AUDIO - FULL TEST/Test_${String(test).padStart(2,'0')}.mp3`)});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-gpu','--no-sandbox']});
try {
 const page=await browser.newPage();
 let envelopes={};try{envelopes=JSON.parse(readFileSync(join(process.cwd(),'scripts/ets-audio.envelope.json'),'utf8'));}catch{}
 for(const file of files){
  if(envelopes[file.id])continue;
  const result=await page.evaluate(async base64=>{
   const ctx=new OfflineAudioContext(1,1,16000);
   const raw=atob(base64);const bytes=new Uint8Array(raw.length);for(let n=0;n<raw.length;n++)bytes[n]=raw.charCodeAt(n);
   const buffer=await ctx.decodeAudioData(bytes.buffer);
   const channel=buffer.getChannelData(0);const step=Math.round(buffer.sampleRate/50);const rms=[];
   for(let start=0;start<channel.length;start+=step){let sum=0;for(let n=start;n<Math.min(start+step,channel.length);n++)sum+=channel[n]*channel[n];rms.push(Math.sqrt(sum/step));}
   return {duration:buffer.duration,sampleRate:buffer.sampleRate,hz:buffer.sampleRate/step,rms};
  },readFileSync(file.path).toString('base64'));
  envelopes[file.id]=result;console.log(file.id,result.duration,result.sampleRate);
 }
 writeFileSync(join(process.cwd(),'scripts/ets-audio.envelope.json'),JSON.stringify(envelopes));
}finally{await browser.close();}
