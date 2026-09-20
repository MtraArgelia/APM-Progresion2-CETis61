/* APM CETis 61 · v14.2 PROTOTIPO · Ficha continua
   Complementa core_v14_1.js. No sustituye la persistencia validada.
*/
window.P2CoreV142=(function(){
 const F=(document.body?.dataset?.ficha||'').trim();
 const core=()=>window.P2CoreV141;
 let saveTimer=null;
 function studentEmail(){return P2Auth?.get?.()?.student?.email||'anon'}
 function key(s){return `p2_v14_2:${studentEmail()}:${F}:${s}`}
 function stateEl(){return document.getElementById('saveStateV142')}
 function setState(text,kind='ok'){
   const e=stateEl(); if(!e)return;
   e.textContent=text; e.dataset.kind=kind;
 }
 function q(el){const a=el.closest('.activity-v142');return (a?.querySelector('.activity-question')?.textContent||a?.querySelector('h2')?.textContent||'Actividad').trim()}
 function dimension(el){return el.dataset.dimension||'C'}
 async function saveOpen(el){
   if(!el?.id||!core()?.save)return {ok:false,error:'CORE_NOT_READY'};
   const value=String(el.value||'').trim();
   if(!value){updateProgress();return {ok:true,empty:true}}
   setState('Guardando…','saving');
   const r=await core().save(el.id,q(el),'OPEN',value,'abierta',dimension(el),'',100);
   if(r?.ok)setState(r.unchanged?'✓ Guardado':'✓ Guardado','ok'); else setState('⚠ No se pudo guardar','error');
   updateProgress(); return r;
 }
 function schedule(el){clearTimeout(saveTimer);setState('Cambios sin guardar…','pending');saveTimer=setTimeout(()=>saveOpen(el),900)}
 function activities(){return [...document.querySelectorAll('.activity-v142')]}
 function completed(a){
   const fields=[...a.querySelectorAll('textarea,input[type=text],input[type=number],select')];
   const radios=[...a.querySelectorAll('input[type=radio]')];
   if(fields.length && fields.some(x=>String(x.value||'').trim()))return true;
   if(radios.length && radios.some(x=>x.checked))return true;
   return a.dataset.informative==='true';
 }
 async function updateProgress(){
   const list=activities().filter(a=>a.dataset.count!=='false');
   const done=list.filter(completed).length, pct=Math.round(done/Math.max(1,list.length)*100);
   const bar=document.querySelector('#progressV142 i'),label=document.getElementById('progressTextV142');
   if(bar)bar.style.width=pct+'%'; if(label)label.textContent=`${done} de ${list.length} actividades · ${pct}%`;
   document.querySelectorAll('.activity-v142').forEach(a=>{const b=a.querySelector('.activity-state-v142');if(b)b.textContent=completed(a)?'✓ Con evidencia':'○ Pendiente'});
   try{localStorage.setItem(key('progress'),String(pct))}catch(e){}
   if(window.P2Auth?.valid?.()) await P2Auth.send('saveProgress',{ficha:F,completed:pct>=100,progress:pct});
 }
 function rememberSection(id){try{localStorage.setItem(key('lastSection'),id)}catch(e){}}
 function restoreSection(){
   const id=localStorage.getItem(key('lastSection')); if(!id)return;
   const el=document.getElementById(id); if(el)setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'start'}),550);
 }
 function installObserver(){
   if(!('IntersectionObserver' in window))return;
   const ob=new IntersectionObserver(entries=>{entries.filter(x=>x.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio).slice(0,1).forEach(x=>rememberSection(x.target.id))},{threshold:[.35,.6]});
   activities().forEach(a=>ob.observe(a));
 }
 function gotoNext(btn){const a=btn.closest('.activity-v142'),list=activities(),i=list.indexOf(a),n=list[i+1];if(n){n.open=true;n.scrollIntoView({behavior:'smooth',block:'start'});rememberSection(n.id)}}
 async function logout(){
   setState('Cerrando sesión…','saving');
   try{P2Auth?.clear?.();localStorage.removeItem(key('lastSection'))}catch(e){}
   location.replace('login.html?return=index.html');
 }
 function install(){
   document.querySelectorAll('.activity-v142 textarea').forEach(el=>{
     el.addEventListener('input',()=>{schedule(el);updateProgress()});
     el.addEventListener('blur',()=>saveOpen(el));
   });
   document.querySelectorAll('.activity-v142 input,.activity-v142 select').forEach(el=>el.addEventListener('change',()=>setTimeout(updateProgress,80)));
   document.querySelectorAll('.continue-v142').forEach(b=>b.addEventListener('click',async()=>{const a=b.closest('.activity-v142'),open=[...a.querySelectorAll('textarea')];for(const el of open)await saveOpen(el);gotoNext(b)}));
   document.getElementById('logoutV142')?.addEventListener('click',logout);
   installObserver();
   setTimeout(()=>{updateProgress();restoreSection();setState('✓ Sin cambios pendientes','ok')},900);
 }
 document.addEventListener('DOMContentLoaded',install);
 return {saveOpen,updateProgress,logout};
})();
