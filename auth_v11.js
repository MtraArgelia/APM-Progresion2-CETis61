window.P2Auth=(function(){
const API_URL='https://script.google.com/macros/s/AKfycbw1VO100NKmBFFETDvhjZ9Ld0B8qKaqXR5-NNqQOt_LdmPCKhGbcwmIOEFCnVZjprVi/exec',K='p2_auth_v11';
function get(){try{return JSON.parse(localStorage.getItem(K)||'null')}catch(e){return null}}
function set(v){localStorage.setItem(K,JSON.stringify(v))}
function clear(){localStorage.removeItem(K)}
function valid(){let s=get();return !!(s&&s.token&&s.expires&&new Date(s.expires).getTime()>Date.now())}
async function post(p){if(!configured())throw new Error('BACKEND_NOT_CONFIGURED');let r=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(p)});return r.json()}
async function login(email,password){let x=await post({action:'login',email,password});if(x.ok)set(x);return x}
async function send(action,data){let s=get();if(!s)return {ok:false,error:'SESSION_EXPIRED'};let x=await post({action,token:s.token,data:data||{}});if(x.error==='SESSION_EXPIRED')clear();return x}
function configured(){return !API_URL.startsWith('REEMPLAZAR_')}
return {get,set,clear,valid,login,send,configured};})();