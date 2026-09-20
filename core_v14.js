window.P2CoreV14=(function(){
const F=(document.body?.dataset?.ficha||'').trim();
function uuid(){return crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2)}
async function send(action,data){
  if(!window.P2Auth?.valid?.()) return {ok:false,error:'SESSION_EXPIRED'};
  try{return await P2Auth.send(action,data||{})}catch(e){return {ok:false,error:String(e.message||e)}}
}
window.P2Integration={sendOrQueue:send};
function questionFor(el){let c=el?.closest?.('.card');return (c?.querySelector('p')?.textContent||c?.querySelector('h2')?.textContent||'Actividad').trim()}
async function save(itemId,question,type,response,validation,dimension,score,maxScore=100){
 if(window.P2Registro && !P2Registro.canSave()) return {ok:false,error:'REGISTRO_CERRADO'};
 return send('saveResponse',{eventId:uuid(),ficha:F,itemId,question,type,response,validation:validation||'',attempt:1,dimension:dimension||'',levelEvidence:'',score:score??'',maxScore});
}
function status(msg,ok=true){let e=document.getElementById('save-status-v14');if(!e){e=document.createElement('div');e.id='save-status-v14';e.style.cssText='position:fixed;right:14px;bottom:78px;z-index:10000;padding:9px 12px;border-radius:10px;background:#fff;border:1px solid #b8c8d5;box-shadow:0 2px 10px #0002;font:600 13px system-ui';document.body.appendChild(e)}e.textContent=msg;e.style.color=ok?'#14532d':'#7a1830';clearTimeout(e._t);e._t=setTimeout(()=>e.remove(),2600)}
async function saveOpenIn(screen){
 if(!screen)return; let els=[...screen.querySelectorAll('textarea,input[type=text],select')].filter(x=>x.value?.trim());
 for(let i=0;i<els.length;i++){let el=els[i],v=el.value.trim();if(el.dataset.lastSavedV14===v)continue;let id=el.id||`abierta_${[...document.querySelectorAll('.screen')].indexOf(screen)+1}_${i+1}`;let r=await save(id,questionFor(el),el.tagName==='SELECT'?'SELECT':'OPEN',v,'abierta','C','',100);if(r?.ok){el.dataset.lastSavedV14=v;status('Respuesta guardada ✓')}else status('No se pudo guardar: '+(r?.error||'error'),false)}
}
function install(){
 // authenticated identity; remove obsolete manual identity panel
 let s=P2Auth?.get?.()?.student;let p=document.getElementById('studentPanel');if(p)p.remove();
 let tools=document.querySelector('.teacher-tools');if(tools&&s){let h=document.getElementById('studentHello');if(h)h.textContent=`${s.name} · ${s.group}`;}
 let header=document.querySelector('header');if(header&&!document.getElementById('home-v14')){let a=document.createElement('a');a.id='home-v14';a.href='index.html';a.textContent='← Volver al inicio';a.style.cssText='display:inline-block;margin-top:8px;color:white;font-weight:700;text-decoration:underline';header.appendChild(a)}
 // numeric checks: preserve feedback and register exact response
 if(typeof window.num==='function'){let old=window.num;window.num=function(id,ans,tol,fid,hint){old(id,ans,tol,fid,hint);let el=document.getElementById(id),v=parseFloat(el?.value),ok=Number.isFinite(v)&&Math.abs(v-ans)<=tol;save(id,questionFor(el),'NUM',el?.value||'',ok?'correcto':'incorrecto','P',ok?100:0).then(r=>status(r?.ok?'Respuesta guardada ✓':'No se pudo guardar: '+(r?.error||'error'),!!r?.ok));}}
 if(typeof window.choice==='function'){let old=window.choice;window.choice=function(name,ans,fid,hint){old(name,ans,fid,hint);let el=document.querySelector(`input[name="${name}"]:checked`),ok=!!el&&el.value===ans;save(name,questionFor(el),'SC',el?.value||'',ok?'correcto':'incorrecto','R',ok?100:0).then(r=>status(r?.ok?'Respuesta guardada ✓':'No se pudo guardar: '+(r?.error||'error'),!!r?.ok));}}
 // compatibility functions used by later fichas
 window.emitEvidence=window.emitEvidence||function(type,item,response,dimension,correct){save(item,item,type,response,correct===true?'correcto':correct===false?'incorrecto':'abierta',dimension,correct===true?100:correct===false?0:'').then(r=>status(r?.ok?'Respuesta guardada ✓':'No se pudo guardar: '+(r?.error||'error'),!!r?.ok))};
 window.logObjective=window.logObjective||function(){};
 window.identifyStudent=window.identifyStudent||function(){};
 window.exportEvidence=window.exportEvidence||async function(){let r=await send('myData',{});let blob=new Blob([JSON.stringify(r,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`avance_${F||'P2'}.json`;a.click();URL.revokeObjectURL(a.href)};
 window.resetFicha=window.resetFicha||function(){if(confirm('¿Reiniciar la navegación visible de esta ficha?'))location.reload()};
 // Save open response + progress when advancing
 if(typeof window.next==='function'){let old=window.next;window.next=async function(){let screens=[...document.querySelectorAll('.screen')],cur=screens.find(x=>x.classList.contains('active'));await saveOpenIn(cur);old();let active=screens.findIndex(x=>x.classList.contains('active'));let prog=Math.round(((active+1)/Math.max(1,screens.length))*100);let r=await send('saveProgress',{ficha:F,completed:prog>=100,progress:prog});if(!r?.ok)status('Avance no guardado: '+(r?.error||'error'),false)}}
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0));
return {save,saveOpenIn};})();