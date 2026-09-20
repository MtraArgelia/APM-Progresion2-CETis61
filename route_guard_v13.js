
(function(){
  const LOGIN='login.html';
  const here=(location.pathname.split('/').pop()||'index.html');
  if(here.toLowerCase()===LOGIN) return;

  function redirect(){
    const target=encodeURIComponent(here + location.search + location.hash);
    location.replace(LOGIN+'?return='+target);
  }

  async function protect(){
    try{
      if(!window.P2Auth || !P2Auth.valid || !P2Auth.valid()){
        redirect(); return;
      }
      const r=await P2Auth.send('me',{});
      if(!r || !r.ok){
        if(P2Auth.clear) P2Auth.clear();
        redirect(); return;
      }
      document.documentElement.dataset.auth='ok';
      window.dispatchEvent(new CustomEvent('p2-auth-ready',{detail:r.student||{}}));
    }catch(e){
      redirect();
    }
  }
  protect();
})();
