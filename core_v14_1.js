/* APM CETis 61 · v14.1 · Persistencia de respuestas
   - Restaura respuestas al volver, recargar o iniciar sesión de nuevo.
   - Cache local por estudiante + ficha para respuesta inmediata.
   - Google Sheets (myData) es la fuente persistente entre dispositivos/sesiones.
   - Evita duplicados si la respuesta no cambió e incrementa Intento si cambia.
*/
window.P2CoreV141=(function(){
const F=(document.body?.dataset?.ficha||'').trim();
const lastSaved=new Map();
const attempts=new Map();
let student=null, hydrating=false;
function uuid(){return crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2)}
async function send(action,data){
  if(!window.P2Auth?.valid?.()) return {ok:false,error:'SESSION_EXPIRED'};
  try{return await P2Auth.send(action,data||{})}catch(e){return {ok:false,error:String(e.message||e)}}
}
window.P2Integration={sendOrQueue:send};
function norm(v){return String(v??'').trim()}
function parseStored(v){try{let x=JSON.parse(v);return x==null?'':String(x)}catch(e){return String(v??'')}}
function questionFor(el){let c=el?.closest?.('.card');return (c?.querySelector('p')?.textContent||c?.querySelector('h2')?.textContent||'Actividad').trim()}
function allScreens(){return [...document.querySelectorAll('.screen')]}
function fieldKey(el){
 if(!el)return '';
 if(el.type==='radio'||el.type==='checkbox')return el.name||el.id||'';
 if(el.id)return el.id;
 let screen=el.closest('.screen'),si=Math.max(0,allScreens().indexOf(screen)),fields=[...screen.querySelectorAll('textarea,input[type=text],select')],fi=Math.max(0,fields.indexOf(el));
 return `abierta_${si+1}_${fi+1}`;
}
function cacheKey(){let email=student?.email||P2Auth?.get?.()?.student?.email||'anon';return `p2_v14_1:${email}:${F}`}
function readCache(){try{return JSON.parse(localStorage.getItem(cacheKey())||'{"fields":{}}')}catch(e){return {fields:{}}}}
function writeCacheField(key,value){if(!key||hydrating)return;try{let c=readCache();c.fields=c.fields||{};c.fields[key]={value:String(value??''),updated:new Date().toISOString()};c.updated=new Date().toISOString();localStorage.setItem(cacheKey(),JSON.stringify(c))}catch(e){}}
function applyValue(key,value){
 let el=document.getElementById(key);
 if(el && !['radio','checkbox'].includes(el.type)){el.value=value;return true}
 let radios=[...document.querySelectorAll(`input[type="radio"][name="${CSS.escape(key)}"]`)];if(radios.length){radios.forEach(r=>r.checked=String(r.value)===String(value));return true}
 let checks=[...document.querySelectorAll(`input[type="checkbox"][name="${CSS.escape(key)}"]`)];if(checks.length){let vals=Array.isArray(value)?value.map(String):String(value).split('|');checks.forEach(r=>r.checked=vals.includes(String(r.value)));return true}
 let candidates=[...document.querySelectorAll('textarea,input[type=text],select')];let target=candidates.find(x=>fieldKey(x)===key);if(target){target.value=value;return true}
 return false;
}
function captureLocal(){
 document.addEventListener('input',e=>{let el=e.target;if(el.matches?.('textarea,input[type=text],input[type=number],select'))writeCacheField(fieldKey(el),el.value)});
 document.addEventListener('change',e=>{let el=e.target;if(el.matches?.('input[type=radio]'))writeCacheField(fieldKey(el),el.checked?el.value:'');});
}
function restoreLocal(){let c=readCache();hydrating=true;Object.entries(c.fields||{}).forEach(([k,x])=>applyValue(k,x?.value??''));hydrating=false}
function latestServerRows(rows){
 let m=new Map();(rows||[]).forEach((r,idx)=>{if(String(r[4]??'')!==F)return;let key=String(r[5]??'');if(!key)return;let t=Date.parse(r[15])||idx;let prev=m.get(key);if(!prev||t>=prev.t)m.set(key,{row:r,t,idx})});return m;
}
async function restoreServer(){
 let r=await send('myData',{});if(!r?.ok)return r;
 let latest=latestServerRows(r.responses);hydrating=true;
 latest.forEach(({row},key)=>{let value=parseStored(row[8]);applyValue(key,value);lastSaved.set(key,norm(value));attempts.set(key,Number(row[10])||1);writeCacheField(key,value)});
 hydrating=false;
 // persist server-restored values locally after hydration guard
 try{let c=readCache();latest.forEach(({row},key)=>{c.fields=c.fields||{};c.fields[key]={value:parseStored(row[8]),updated:String(row[15]||new Date().toISOString())}});localStorage.setItem(cacheKey(),JSON.stringify(c))}catch(e){}
 return {ok:true,count:latest.size};
}
async function save(itemId,question,type,response,validation,dimension,score,maxScore=100){
 if(window.P2Registro && !P2Registro.canSave()) return {ok:false,error:'REGISTRO_CERRADO'};
 let value=norm(response),key=String(itemId||'');
 if(lastSaved.has(key)&&lastSaved.get(key)===value)return {ok:true,unchanged:true};
 let attempt=(attempts.get(key)||0)+1;
 let r=await send('saveResponse',{eventId:uuid(),ficha:F,itemId:key,question,type,response,validation:validation||'',attempt,dimension:dimension||'',levelEvidence:'',score:score??'',maxScore});
 if(r?.ok){lastSaved.set(key,value);attempts.set(key,attempt);writeCacheField(key,response)}
 return r;
}
function status(msg,ok=true){let e=document.getElementById('save-status-v14');if(!e){e=document.createElement('div');e.id='save-status-v14';e.style.cssText='position:fixed;right:14px;bottom:78px;z-index:10000;padding:9px 12px;border-radius:10px;background:#fff;border:1px solid #b8c8d5;box-shadow:0 2px 10px #0002;font:600 13px system-ui';document.body.appendChild(e)}e.textContent=msg;e.style.color=ok?'#14532d':'#7a1830';clearTimeout(e._t);e._t=setTimeout(()=>e.remove(),2600)}
async function saveOpenIn(screen){
 if(!screen)return;let els=[...screen.querySelectorAll('textarea,input[type=text],select')].filter(x=>norm(x.value));
 for(let el of els){let v=norm(el.value),id=fieldKey(el);let r=await save(id,questionFor(el),el.tagName==='SELECT'?'SELECT':'OPEN',v,'abierta','C','',100);if(r?.ok&&!r.unchanged)status('Respuesta guardada ✓');else if(!r?.ok)status('No se pudo guardar: '+(r?.error||'error'),false)}
}
function install(){
 student=P2Auth?.get?.()?.student||null;
 let p=document.getElementById('studentPanel');if(p)p.remove();
 let tools=document.querySelector('.teacher-tools');if(tools&&student){let h=document.getElementById('studentHello');if(h){h.style.display='inline-block';h.textContent=`${student.name} · ${student.group}`}}
 let header=document.querySelector('header');if(header&&!document.getElementById('home-v14')){let a=document.createElement('a');a.id='home-v14';a.href='index.html';a.textContent='← Volver al inicio';a.style.cssText='display:inline-block;margin-top:8px;color:white;font-weight:700;text-decoration:underline';header.appendChild(a)}
 captureLocal();restoreLocal();restoreServer().then(r=>{if(r?.ok&&r.count)status(`Se recuperaron ${r.count} respuesta${r.count===1?'':'s'} ✓`)});
 if(typeof window.num==='function'){let old=window.num;window.num=function(id,ans,tol,fid,hint){old(id,ans,tol,fid,hint);let el=document.getElementById(id),v=parseFloat(el?.value),ok=Number.isFinite(v)&&Math.abs(v-ans)<=tol;save(id,questionFor(el),'NUM',el?.value||'',ok?'correcto':'incorrecto','P',ok?100:0).then(r=>{if(!r?.unchanged)status(r?.ok?'Respuesta guardada ✓':'No se pudo guardar: '+(r?.error||'error'),!!r?.ok)});}}
 if(typeof window.choice==='function'){let old=window.choice;window.choice=function(name,ans,fid,hint){old(name,ans,fid,hint);let el=document.querySelector(`input[name="${name}"]:checked`),ok=!!el&&el.value===ans;save(name,questionFor(el),'SC',el?.value||'',ok?'correcto':'incorrecto','R',ok?100:0).then(r=>{if(!r?.unchanged)status(r?.ok?'Respuesta guardada ✓':'No se pudo guardar: '+(r?.error||'error'),!!r?.ok)});}}
 window.emitEvidence=window.emitEvidence||function(type,item,response,dimension,correct){save(item,item,type,response,correct===true?'correcto':correct===false?'incorrecto':'abierta',dimension,correct===true?100:correct===false?0:'').then(r=>{if(!r?.unchanged)status(r?.ok?'Respuesta guardada ✓':'No se pudo guardar: '+(r?.error||'error'),!!r?.ok)})};
 window.logObjective=window.logObjective||function(){};window.identifyStudent=window.identifyStudent||function(){};
 window.exportEvidence=window.exportEvidence||async function(){let r=await send('myData',{});let blob=new Blob([JSON.stringify(r,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`avance_${F||'P2'}.json`;a.click();URL.revokeObjectURL(a.href)};
 window.resetFicha=window.resetFicha||function(){if(confirm('¿Reiniciar solo la navegación visible? Tus respuestas guardadas se conservarán.')){try{localStorage.removeItem(cacheKey())}catch(e){}location.reload()}};
 if(typeof window.next==='function'){let old=window.next;window.next=async function(){let screens=allScreens(),cur=screens.find(x=>x.classList.contains('active'));await saveOpenIn(cur);old();let active=screens.findIndex(x=>x.classList.contains('active'));let prog=Math.round(((active+1)/Math.max(1,screens.length))*100);let r=await send('saveProgress',{ficha:F,completed:prog>=100,progress:prog});if(!r?.ok)status('Avance no guardado: '+(r?.error||'error'),false)}}
 if(typeof window.prev==='function'){let old=window.prev;window.prev=async function(){let screens=allScreens(),cur=screens.find(x=>x.classList.contains('active'));await saveOpenIn(cur);old()}}
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0));
return {save,saveOpenIn,restoreServer,restoreLocal};})();
