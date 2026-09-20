/* APM CETis 61 · v14.2.1 PROTOTIPO · Ficha continua refinada
   Mantiene core_v14_1.js como capa de persistencia validada.
*/
window.P2CoreV1421=(function(){
 const F=(document.body?.dataset?.ficha||'').trim();
 const core=()=>window.P2CoreV141;
 let saveTimer=null;
 function studentEmail(){return P2Auth?.get?.()?.student?.email||'anon'}
 function key(s){return `p2_v14_2_1:${studentEmail()}:${F}:${s}`}
 function stateEl(){return document.getElementById('saveStateV142')}
 function setState(text,kind='ok'){const e=stateEl();if(!e)return;e.textContent=text;e.dataset.kind=kind}
 function q(el){const a=el.closest('.activity-v142');return (a?.querySelector('.activity-question')?.textContent||a?.querySelector('h2')?.textContent||'Actividad').trim()}
 function dimension(el){return el.dataset.dimension||'C'}
 async function saveOpen(el){
   if(!el?.id||!core()?.save)return {ok:false,error:'CORE_NOT_READY'};
   const value=String(el.value||'').trim();
   if(!value){updateProgress();return {ok:true,empty:true}}
   setState('Guardando…','saving');
   const r=await core().save(el.id,q(el),'OPEN',value,'abierta',dimension(el),'',100);
   setState(r?.ok?'✓ Todo guardado':'⚠ No se pudo guardar',r?.ok?'ok':'error');
   updateProgress();return r;
 }
 function schedule(el){clearTimeout(saveTimer);setState('Cambios sin guardar…','pending');saveTimer=setTimeout(()=>saveOpen(el),900)}
 function activities(){return [...document.querySelectorAll('.activity-v142')]}
 function fieldStatus(a){
   const textFields=[...a.querySelectorAll('textarea,input[type=text],input[type=number],select')];
   const radioNames=[...new Set([...a.querySelectorAll('input[type=radio]')].map(x=>x.name).filter(Boolean))];
   const required=textFields.length+radioNames.length;
   let filled=textFields.filter(x=>String(x.value||'').trim()!=='').length;
   filled+=radioNames.filter(n=>a.querySelector(`input[type="radio"][name="${CSS.escape(n)}"]:checked`)).length;
   if(a.dataset.informative==='true')return {state:'done',filled:1,required:1};
   if(!required||filled===0)return {state:'pending',filled,required};
   if(filled<required)return {state:'progress',filled,required};
   return {state:'done',filled,required};
 }
 function updateProgress(){
   const list=activities().filter(a=>a.dataset.count!=='false');
   const done=list.filter(a=>fieldStatus(a).state==='done').length;
   const pct=Math.round(done/Math.max(1,list.length)*100);
   const bar=document.querySelector('#progressV142 i'),label=document.getElementById('progressTextV142');
   if(bar)bar.style.width=pct+'%';if(label)label.textContent=`${done}/${list.length} · ${pct}%`;
   activities().forEach(a=>{const b=a.querySelector('.activity-state-v142');if(!b)return;const s=fieldStatus(a).state;b.dataset.state=s;b.textContent=s==='done'?'✓ Completada':s==='progress'?'◐ En proceso':'○ Pendiente'});
   try{localStorage.setItem(key('progress'),String(pct))}catch(e){}
   if(window.P2Auth?.valid?.())P2Auth.send('saveProgress',{ficha:F,completed:pct>=100,progress:pct}).catch(()=>{});
   return {done,total:list.length,pct};
 }
 function rememberSection(id){try{localStorage.setItem(key('lastSection'),id)}catch(e){}}
 function restoreSection(){const id=localStorage.getItem(key('lastSection'));if(!id)return;const el=document.getElementById(id);if(el)setTimeout(()=>{el.open=true;el.scrollIntoView({behavior:'smooth',block:'start'})},550)}
 function installObserver(){if(!('IntersectionObserver' in window))return;const ob=new IntersectionObserver(entries=>{entries.filter(x=>x.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio).slice(0,1).forEach(x=>rememberSection(x.target.id))},{threshold:[.35,.6]});activities().forEach(a=>ob.observe(a))}
 function gotoActivity(id){const el=document.getElementById(id);if(!el)return;el.open=true;el.scrollIntoView({behavior:'smooth',block:'start'});rememberSection(id)}
 function gotoNext(btn){const a=btn.closest('.activity-v142'),list=activities(),i=list.indexOf(a),n=list[i+1];if(n)gotoActivity(n.id)}
 function pendingList(){return activities().filter(a=>fieldStatus(a).state!=='done')}
 function showPending(){
   const box=document.getElementById('pendingSummaryV1421');if(!box)return;
   const pending=pendingList();
   if(!pending.length){box.hidden=false;box.innerHTML='<b>✓ Ficha completa.</b> Todas las actividades cuentan con evidencia.';return}
   box.hidden=false;
   box.innerHTML=`<b>Tu ficha tiene ${pending.length} actividad${pending.length===1?'':'es'} pendiente${pending.length===1?'':'s'}.</b> Puedes continuar y regresar cuando quieras.<br>${pending.map(a=>`<a href="#${a.id}" data-jump="${a.id}">${a.querySelector('summary span')?.textContent||a.id}</a>`).join(' · ')}`;
   box.querySelectorAll('[data-jump]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();gotoActivity(a.dataset.jump)}));
 }
 async function logout(){setState('Cerrando sesión…','saving');try{P2Auth?.clear?.()}catch(e){}location.replace('login.html?return=index.html')}
 function install(){
   document.querySelectorAll('.activity-v142 textarea').forEach(el=>{el.addEventListener('input',()=>{schedule(el);updateProgress()});el.addEventListener('blur',()=>saveOpen(el))});
   document.querySelectorAll('.activity-v142 input,.activity-v142 select').forEach(el=>el.addEventListener('change',()=>setTimeout(updateProgress,80)));
   document.querySelectorAll('.continue-v142').forEach(b=>b.addEventListener('click',async()=>{const a=b.closest('.activity-v142');for(const el of a.querySelectorAll('textarea'))await saveOpen(el);updateProgress();if(b.classList.contains('final-v1421'))showPending();else gotoNext(b)}));
   document.querySelectorAll('.quicknav-v142 a').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();gotoActivity((a.getAttribute('href')||'').replace('#',''))}));
   document.querySelectorAll('.visual-v1421').forEach(img=>img.addEventListener('click',()=>img.classList.toggle('zoom-v1421')));
   document.getElementById('logoutV142')?.addEventListener('click',logout);
   installObserver();setTimeout(()=>{updateProgress();restoreSection();setState('✓ Todo guardado','ok')},900);
 }
 document.addEventListener('DOMContentLoaded',install);
 return {saveOpen,updateProgress,logout,showPending,gotoActivity};
})();
