/* APM CETis 61 · runtime de fichas v14.4.0
   Entrega explícita, restauración, avance separado de exactitud y vista docente de consulta.
*/
window.APMFichaV144=(function(){
  const F=(document.body?.dataset?.ficha||'').trim();
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  let me=null, teacherMode=false, committed=new Set();

  const studentKey=()=>String(me?.email||window.P2Auth?.get?.()?.student?.email||'anon').toLowerCase();
  const key=(suffix)=>`apm:v14.4:${studentKey()}:${F}:${suffix}`;
  const status=(msg,kind='ok')=>{
    const e=$('#saveState'); if(!e)return;
    e.textContent=msg; e.dataset.kind=kind;
  };
  const safeParse=v=>{try{return JSON.parse(v)}catch(e){return v}};
  const eventId=()=>crypto?.randomUUID?.() || ('e-'+Date.now()+'-'+Math.random().toString(16).slice(2));
  const tasks=()=>$$('.task[data-item]');

  function responseOf(task){
    const type=task.dataset.type;
    if(type==='MS') return $$('input[type=checkbox]',task).filter(x=>x.checked).map(x=>x.value);
    if(type==='SC') return $('input[type=radio]:checked',task)?.value ?? '';
    const el=$('[data-response]',task);
    return el ? String(el.value??'').trim() : '';
  }
  function hasResponse(v){return Array.isArray(v)?v.length>0:String(v??'').trim()!==''}
  function fillTask(task,value){
    const type=task.dataset.type;
    if(type==='MS'){
      const vals=Array.isArray(value)?value:[];
      $$('input[type=checkbox]',task).forEach(x=>x.checked=vals.includes(x.value));
    }else if(type==='SC'){
      $$('input[type=radio]',task).forEach(x=>x.checked=String(x.value)===String(value));
    }else{
      const el=$('[data-response]',task); if(el)el.value=value??'';
    }
  }
  function answerFor(task){
    if(!task.dataset.answer)return null;
    if(task.dataset.type==='MS'){try{return JSON.parse(task.dataset.answer)}catch(e){return []}}
    return task.dataset.answer;
  }
  function evaluate(task,response){
    const type=task.dataset.type, ans=answerFor(task);
    if(type==='OPEN' || ans===null)return {validation:'abierta',score:'',maxScore:100,correct:null};
    if(type==='NUM'){
      const n=Number(response), a=Number(ans), tol=Number(task.dataset.tol||0.01);
      const ok=Number.isFinite(n)&&Number.isFinite(a)&&Math.abs(n-a)<=tol;
      return {validation:ok?'correcta':'incorrecta',score:ok?100:0,maxScore:100,correct:ok};
    }
    if(type==='SC'){
      const ok=String(response)===String(ans);
      return {validation:ok?'correcta':'incorrecta',score:ok?100:0,maxScore:100,correct:ok};
    }
    if(type==='MS'){
      const a=[...(Array.isArray(ans)?ans:[])].sort(), b=[...(Array.isArray(response)?response:[])].sort();
      const ok=a.length===b.length && a.every((x,i)=>String(x)===String(b[i]));
      return {validation:ok?'correcta':'incorrecta',score:ok?100:0,maxScore:100,correct:ok};
    }
    return {validation:'registrada',score:'',maxScore:100,correct:null};
  }
  function setTaskState(task,state){
    const e=$('.task-state',task); if(!e)return;
    e.dataset.state=state;
    e.textContent=state==='done'?'✓ Completada':state==='progress'?'◐ En proceso':'○ Pendiente';
  }
  function updateProgress(){
    const list=tasks(), done=list.filter(t=>committed.has(t.dataset.item)).length;
    const pct=Math.round(done/Math.max(1,list.length)*100);
    const label=$('#progressText'), bar=$('#progressBar i');
    if(label)label.textContent=`${done}/${list.length} · ${pct}%`;
    if(bar)bar.style.width=pct+'%';
    list.forEach(t=>setTaskState(t,committed.has(t.dataset.item)?'done':hasResponse(responseOf(t))?'progress':'pending'));
    try{
      let pg=JSON.parse(localStorage.getItem('cetis61_p2_progress')||'{}');
      pg[F]={completed:pct>=100,progress:pct,updatedAt:new Date().toISOString()};
      localStorage.setItem('cetis61_p2_progress',JSON.stringify(pg));
    }catch(e){}
    if(!teacherMode && window.P2Auth?.valid?.()){
      P2Auth.send('saveProgress',{ficha:F,completed:pct>=100,progress:pct}).catch(()=>{});
    }
    return {done,total:list.length,pct};
  }
  function draftSave(task){
    if(teacherMode)return;
    const v=responseOf(task);
    try{localStorage.setItem(key('draft:'+task.dataset.item),JSON.stringify(v))}catch(e){}
    committed.delete(task.dataset.item);
    setTaskState(task,'progress'); updateProgress();
    status('Cambios sin guardar…','pending');
  }
  function restoreDraft(task){
    let raw=null; try{raw=localStorage.getItem(key('draft:'+task.dataset.item))}catch(e){}
    if(raw!==null)fillTask(task,safeParse(raw));
  }
  function clearDraft(task){try{localStorage.removeItem(key('draft:'+task.dataset.item))}catch(e){}}
  function feedback(task,msg,kind){
    const e=$('.feedback',task); if(!e)return;
    e.hidden=false; e.dataset.kind=kind||'ok'; e.textContent=msg;
  }
  function nextAttempt(item){
    const k=key('attempt:'+item);
    let n=Number(localStorage.getItem(k)||0)+1;
    localStorage.setItem(k,String(n)); return n;
  }
  async function saveTask(task){
    if(teacherMode)return;
    const response=responseOf(task);
    if(!hasResponse(response)){feedback(task,'Completa la respuesta antes de guardar.','warn');return}
    const ev=evaluate(task,response);
    const btn=$('.save-task',task); if(btn)btn.disabled=true;
    status('Guardando…','saving');
    const data={
      eventId:eventId(), ficha:F, itemId:task.dataset.item,
      question:($('.question',task)?.textContent||task.dataset.item).trim(),
      type:task.dataset.type, response,
      validation:ev.validation, attempt:nextAttempt(task.dataset.item),
      dimension:task.dataset.dimension||'C',
      levelEvidence:task.dataset.level||'PRACTICA',
      score:ev.score, maxScore:ev.maxScore
    };
    let r;
    try{r=await P2Auth.send('saveResponse',data)}catch(e){r={ok:false,error:'SIN_CONEXION'}}
    if(r?.ok){
      committed.add(task.dataset.item); clearDraft(task);
      if(ev.correct===true)feedback(task,'✓ Respuesta guardada. Coincide con el criterio automático.','ok');
      else if(ev.correct===false)feedback(task,'✓ Respuesta guardada. Revisa la retroalimentación y tu procedimiento; el avance registra que realizaste la actividad.','warn');
      else feedback(task,'✓ Evidencia guardada. La calidad de esta respuesta se valora por separado del avance.','ok');
      status('✓ Todo guardado','ok'); updateProgress();
    }else{
      feedback(task,'No se pudo guardar: '+String(r?.error||'error desconocido'),'bad');
      status('⚠ No se pudo guardar','error');
    }
    if(btn)btn.disabled=false;
  }
  async function restoreSubmitted(){
    let r; try{r=await P2Auth.send('myData',{})}catch(e){return}
    if(!r?.ok)return;
    const rows=(r.responses||[]).filter(x=>String(x[4]||'')===F);
    const latest={};
    rows.forEach((row,i)=>{
      const id=String(row[5]||''); if(!id)return;
      const prev=latest[id], t=new Date(row[15]||0).getTime();
      if(!prev || t>=prev.t)latest[id]={row,t:Number.isFinite(t)?t:i};
    });
    tasks().forEach(task=>{
      const hit=latest[task.dataset.item];
      if(hit){
        fillTask(task,safeParse(hit.row[8]));
        committed.add(task.dataset.item);
        clearDraft(task);
        const val=String(hit.row[9]||'');
        if(val==='correcta')feedback(task,'✓ Evidencia recuperada: respuesta registrada como correcta.','ok');
        else if(val==='incorrecta')feedback(task,'Evidencia recuperada. Puedes revisarla y volver a guardar una nueva entrega.','warn');
        else feedback(task,'✓ Evidencia recuperada.','ok');
      }else restoreDraft(task);
    });
    updateProgress();
  }
  function bind(){
    tasks().forEach(task=>{
      $$('textarea,input',task).forEach(el=>{
        const ev=(el.type==='radio'||el.type==='checkbox')?'change':'input';
        el.addEventListener(ev,()=>draftSave(task));
      });
      $('.save-task',task)?.addEventListener('click',()=>saveTask(task));
    });
    $('#logout')?.addEventListener('click',()=>{try{P2Auth.clear()}catch(e){} location.replace('login.html')});
  }
  async function init(){
    if(!window.P2Auth?.valid?.()){location.replace('login.html?return='+encodeURIComponent(location.pathname.split('/').pop()));return}
    let r; try{r=await P2Auth.send('me',{})}catch(e){}
    if(!r?.ok){try{P2Auth.clear()}catch(e){}location.replace('login.html');return}
    me=r.student||{}; const role=String(me.role||'').toLowerCase();
    teacherMode=['docente','admin'].includes(role);
    document.documentElement.dataset.auth='ok';
    const who=$('#who'); if(who)who.textContent=`${me.name||''}${me.group?' · Grupo '+me.group:''} · ${teacherMode?'Vista docente':'Estudiante'}`;
    if(teacherMode){
      document.body.classList.add('teacher-mode');
      $$('.save-task').forEach(b=>b.disabled=true);
      $$('textarea,input').forEach(x=>x.disabled=true);
      const note=$('#teacherNotice'); if(note){note.hidden=false;note.textContent='Vista docente de consulta: las respuestas no se guardan desde esta vista.'}
    }
    bind(); await restoreSubmitted(); status('✓ Listo','ok');
  }
  document.addEventListener('DOMContentLoaded',init);
  return {init,saveTask,updateProgress};
})();