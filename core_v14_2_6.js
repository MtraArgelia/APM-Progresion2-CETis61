/* APM CETis 61 · v14.2.6 PROTOTIPO · RESTAURACIÓN DE AVANCE
   Ajusta actividades mixtas: completitud por entrega de evidencias, no por exactitud.
   Pendiente -> En proceso -> Completada cuando todas las evidencias requeridas fueron respondidas y la parte objetiva fue comprobada.
   Mantiene core_v14_1.js como capa de persistencia de respuestas.
*/
window.P2_CORE_CONTINUO_VERSION='14.2.6';
window.P2CoreV1422=(function(){
 const F=(document.body?.dataset?.ficha||'').trim();
 const core=()=>window.P2CoreV141;
 function studentEmail(){return window.P2Auth?.get?.()?.student?.email||'anon'}
 function key(s){return `p2_v14_2_2:${studentEmail()}:${F}:${s}`}
 function stateEl(){return document.getElementById('saveStateV142')}
 function setState(text,kind='ok'){const e=stateEl();if(!e)return;e.textContent=text;e.dataset.kind=kind}
 function activities(){return [...document.querySelectorAll('.activity-v142')]}
 function activityOf(el){return el?.closest?.('.activity-v142')||null}
 function q(el){const a=activityOf(el);return (a?.querySelector('.activity-question')?.textContent||a?.querySelector('h2')?.textContent||'Actividad').trim()}
 function dimension(el){return el.dataset.dimension||'C'}
 function readSet(name){try{return new Set(JSON.parse(localStorage.getItem(key(name))||'[]'))}catch(e){return new Set()}}
 function writeSet(name,set){try{localStorage.setItem(key(name),JSON.stringify([...set]))}catch(e){}}
 function checkedSet(){return readSet('checked')}
 function committedSet(){return readSet('committed')}
 function activityId(a){return a?.id||''}
 function markChecked(el,correct){
   const a=activityOf(el); if(!a)return;
   const set=checkedSet(); set.add(activityId(a)); writeSet('checked',set);
   a.dataset.lastValidation=correct?'correct':'retry';
   updateProgress();
 }
 function markCommitted(a){const set=committedSet();set.add(activityId(a));writeSet('committed',set);updateProgress()}
 async function saveOpen(el){
   if(!el?.id||!core()?.save)return {ok:false,error:'CORE_NOT_READY'};
   const value=String(el.value||'').trim();
   if(!value){updateProgress();return {ok:true,empty:true}}
   setState('Guardando…','saving');
   const r=await core().save(el.id,q(el),'OPEN',value,'abierta',dimension(el),'',100);
   setState(r?.ok?'✓ Todo guardado':'⚠ No se pudo guardar',r?.ok?'ok':'error');
   if(r?.ok) clearDraft(el);
   updateProgress(); return r;
 }
 function draftKey(el){return key('draft:'+el.id)}
 function saveDraft(el){
   if(!el?.id)return;
   try{localStorage.setItem(draftKey(el),String(el.value||''))}catch(e){}
   setState('Cambios sin guardar…','pending');
 }
 function clearDraft(el){if(!el?.id)return;try{localStorage.removeItem(draftKey(el))}catch(e){}}
 function parseStoredValue(v){
   if(v===null||v===undefined)return '';
   if(typeof v!=='string')return v;
   try{return JSON.parse(v)}catch(e){return v}
 }
 function latestSubmittedRows(rows){
   const latest={};
   (rows||[]).forEach((r,i)=>{
     if(!Array.isArray(r)||String(r[4]||'').trim()!==F)return;
     const id=String(r[5]||'').trim(); if(!id)return;
     const attempt=Number(r[10]||0);
     const prev=latest[id];
     if(!prev || attempt>prev.attempt || (attempt===prev.attempt && i>prev.i)){
       latest[id]={row:r,attempt,i};
     }
   });
   return latest;
 }
 function restoreFieldFromRow(id,row){
   const value=parseStoredValue(row?.[8]);
   if(id==='c20'){
     const radio=[...document.querySelectorAll('input[type=radio][name="c20"]')]
       .find(x=>String(x.value)===String(value));
     if(radio)radio.checked=true;
     return;
   }
   const el=document.getElementById(id);
   if(el && String(el.value||'').trim()==='')el.value=String(value??'');
 }
 async function restoreSubmittedState(){
   if(!window.P2Auth?.valid?.())return {ok:false,error:'NO_SESSION'};
   let data;
   try{data=await P2Auth.send('myData',{})}
   catch(e){return {ok:false,error:String(e)}}
   if(!data?.ok||!Array.isArray(data.responses))return {ok:false,error:data?.error||'NO_DATA'};

   const latest=latestSubmittedRows(data.responses);
   Object.entries(latest).forEach(([id,x])=>restoreFieldFromRow(id,x.row));

   // Una fila en RESPUESTAS demuestra una entrega real. Reconstruimos estado,
   // pero NO creamos intentos nuevos ni cambiamos la exactitud histórica.
   const checked=checkedSet();
   if(latest.n20)checked.add('act20-a');
   if(latest.n21)checked.add('act20-b');
   if(latest.c20)checked.add('act20-c');
   writeSet('checked',checked);

   const committed=committedSet();
   if(latest.abierta_2_1)committed.add('act20-reto');
   if(latest.abierta_4_1)committed.add('act20-b');
   if(latest.abierta_6_1)committed.add('act20-cierre');
   writeSet('committed',committed);

   updateProgress();
   return {ok:true,restored:Object.keys(latest).length};
 }
 function restoreDrafts(){
   document.querySelectorAll('.activity-v142 textarea').forEach(el=>{
     let v=null;try{v=localStorage.getItem(draftKey(el))}catch(e){}
     if(v!==null){el.value=v;}
   });
   updateProgress();
 }
 function rawFields(a){
   const text=[...a.querySelectorAll('textarea,input[type=text],input[type=number],select')];
   const radios=[...new Set([...a.querySelectorAll('input[type=radio]')].map(x=>x.name).filter(Boolean))];
   let filled=text.filter(x=>String(x.value||'').trim()!=='').length;
   filled+=radios.filter(n=>a.querySelector(`input[type="radio"][name="${CSS.escape(n)}"]:checked`)).length;
   return {text,radios,required:text.length+radios.length,filled};
 }
 function hasObjective(a){return !!a.querySelector('input[type=number], input[type=radio]')}
 function fieldStatus(a){
   if(a.dataset.informative==='true')return {state:'done'};
   const f=rawFields(a), id=activityId(a), checked=checkedSet().has(id), committed=committedSet().has(id);
   if(!f.required||f.filled===0)return {state:'pending'};
   // Actividades objetivas simples: solo cuentan después de Comprobar.
   if(hasObjective(a) && !checked)return {state:'progress'};
   // No se completa si aún falta una evidencia obligatoria.
   if(f.filled<f.required)return {state:'progress'};
   // En actividades mixtas (objetiva + abierta), escribir NO equivale a entregar.
   // Debe haberse comprobado la parte objetiva y pulsado Guardar/Continuar para
   // confirmar la evidencia abierta. La exactitud NO determina el avance.
   if(hasObjective(a) && a.querySelector('textarea') && !committed)return {state:'progress'};
   if(hasObjective(a) && a.querySelector('textarea'))return {state:'done'};
   // Actividades abiertas puras: Guardar/Continuar confirma que el alumno terminó por ahora.
   if(!hasObjective(a) && !committed)return {state:'progress'};
   return {state:'done'};
 }
 function updateProgress(){
   const list=activities().filter(a=>a.dataset.count!=='false');
   const done=list.filter(a=>fieldStatus(a).state==='done').length;
   const pct=Math.round(done/Math.max(1,list.length)*100);
   const bar=document.querySelector('#progressV142 i'), label=document.getElementById('progressTextV142');
   if(bar)bar.style.width=pct+'%'; if(label)label.textContent=`${done}/${list.length} · ${pct}%`;
   activities().forEach(a=>{const b=a.querySelector('.activity-state-v142');if(!b)return;const s=fieldStatus(a).state;b.dataset.state=s;b.textContent=s==='done'?'✓ Completada':s==='progress'?'◐ En proceso':'○ Pendiente'});
   try{localStorage.setItem(key('progress'),String(pct))}catch(e){}
   if(window.P2Auth?.valid?.())P2Auth.send('saveProgress',{ficha:F,completed:pct>=100,progress:pct}).catch(()=>{});
   return {done,total:list.length,pct};
 }
 function rememberSection(id){try{localStorage.setItem(key('lastSection'),id)}catch(e){}}
 function restoreSection(){let id=null;try{id=localStorage.getItem(key('lastSection'))}catch(e){};if(!id)return;const el=document.getElementById(id);if(el)setTimeout(()=>{el.open=true;el.scrollIntoView({behavior:'smooth',block:'start'})},550)}
 function installObserver(){if(!('IntersectionObserver' in window))return;const ob=new IntersectionObserver(entries=>{entries.filter(x=>x.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio).slice(0,1).forEach(x=>rememberSection(x.target.id))},{threshold:[.35,.6]});activities().forEach(a=>ob.observe(a))}
 function gotoActivity(id){const el=document.getElementById(id);if(!el)return;el.open=true;el.scrollIntoView({behavior:'smooth',block:'start'});rememberSection(id)}
 function gotoNext(btn){const a=activityOf(btn),list=activities(),i=list.indexOf(a),n=list[i+1];if(n)gotoActivity(n.id)}
 function pendingList(){return activities().filter(a=>fieldStatus(a).state!=='done')}
 function showPending(){
   const box=document.getElementById('pendingSummaryV1421');if(!box)return;
   const pending=pendingList();
   if(!pending.length){box.hidden=false;box.innerHTML='<b>✓ Ficha completa.</b> Todas las actividades cuentan con evidencia.';return}
   box.hidden=false;box.innerHTML=`<b>Tu ficha tiene ${pending.length} actividad${pending.length===1?'':'es'} pendiente${pending.length===1?'':'s'}.</b> Puedes continuar y regresar cuando quieras.<br>${pending.map(a=>`<a href="#${a.id}" data-jump="${a.id}">${a.querySelector('summary span')?.textContent||a.id}</a>`).join(' · ')}`;
   box.querySelectorAll('[data-jump]').forEach(x=>x.addEventListener('click',e=>{e.preventDefault();gotoActivity(x.dataset.jump)}));
 }
 async function logout(){setState('Cerrando sesión…','saving');try{P2Auth?.clear?.()}catch(e){}location.replace('login.html?return=index.html')}
 function install(){
   // v14.2.5: escribir solo conserva un borrador local. No crea intentos en Google Sheets.
   // La evidencia abierta se envía al servidor únicamente al pulsar Guardar/Continuar.
   document.querySelectorAll('.activity-v142 textarea').forEach(el=>{el.addEventListener('input',()=>{saveDraft(el);updateProgress()})});
   document.querySelectorAll('.activity-v142 input,.activity-v142 select').forEach(el=>el.addEventListener('change',()=>setTimeout(updateProgress,80)));
   document.querySelectorAll('.continue-v142').forEach(b=>b.addEventListener('click',async()=>{
     const a=activityOf(b); for(const el of a.querySelectorAll('textarea'))await saveOpen(el);
     // Continuar confirma la actividad solo si hay evidencia; nunca convierte un campo vacío en completado.
     const f=rawFields(a); if(f.filled>0)markCommitted(a); else updateProgress();
     if(b.classList.contains('final-v1421'))showPending(); else gotoNext(b);
   }));
   document.querySelectorAll('.quicknav-v142 a').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();gotoActivity((a.getAttribute('href')||'').replace('#',''))}));
   document.querySelectorAll('.visual-v1421').forEach(img=>img.addEventListener('click',()=>img.classList.toggle('zoom-v1421')));
   document.getElementById('logoutV142')?.addEventListener('click',logout);
   installObserver();
   // Reconstruye desde RESPUESTAS las evidencias ya entregadas y después aplica
   // cualquier borrador local no enviado. Así un regreso a la ficha no reinicia el avance.
   setTimeout(async()=>{
     await restoreSubmittedState();
     restoreDrafts();
     restoreSection();
     updateProgress();
     setState('✓ Todo guardado','ok');
   },1100);
 }
 document.addEventListener('DOMContentLoaded',install);
 return {saveOpen,updateProgress,logout,showPending,gotoActivity,markChecked,restoreSubmittedState};
})();
