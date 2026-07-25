import {db,collection,doc,setDoc,getDoc,serverTimestamp,onSnapshot,query,orderBy} from "./firebase.js?v=10.12.6";
import {state,defaultSettings,defaultRoles,sortRoles} from "./state.js?v=10.12.6";
import {shell,pageView,attachForms} from "./views.js?v=10.12.6";
import {toast} from "./utils.js?v=10.12.6";

const appEl=document.getElementById("app");
function renderApp(){appEl.innerHTML=shell(pageView());attachForms(renderApp)}
window.renderApp=renderApp;
window.go=id=>{state.page=id;renderApp();scrollTo({top:0,behavior:"smooth"})};
// Separater Einstieg in den Helferbereich. Eine eventuell noch gespeicherte
// Teilnehmeranmeldung darf die Helfernavigation nicht beeinflussen.
window.openHelperArea=()=>{
  // Helferbereich immer als frische, eindeutige Anmeldung öffnen.
  // Alte Teilnehmer-, Admin- oder Helfersitzungen dürfen die Weiterleitung
  // zur eigenen Station nicht beeinflussen.
  localStorage.removeItem("rvn_participant_id");
  localStorage.removeItem("rvn_helper_id");
  localStorage.removeItem("rvn_helper_phone");
  localStorage.removeItem("rvn_station_access");
  sessionStorage.removeItem("rvn_helper_gate");
  localStorage.removeItem(ADMIN_KEY);
  state.isAdmin=false;
  state.page="helfer";
  renderApp();
  scrollTo({top:0,behavior:"smooth"});
};

async function ensureDefaults(){
const s=await getDoc(doc(db,"settings","main"));if(!s.exists())await setDoc(doc(db,"settings","main"),defaultSettings);
const seeded=await getDoc(doc(db,"meta","rolesSeededV6"));if(!seeded.exists()){for(const r of defaultRoles)await setDoc(doc(db,"roles",r.id),{...r,createdAt:serverTimestamp()},{merge:true});await setDoc(doc(db,"meta","rolesSeededV6"),{done:true,createdAt:serverTimestamp()})}
}

function init(){
try{
ensureDefaults();
onSnapshot(doc(db,"settings","main"),s=>{if(s.exists())state.settings={...defaultSettings,...s.data()};renderApp()});
onSnapshot(query(collection(db,"roles"),orderBy("createdAt","asc")),s=>{const x=s.docs.map(d=>({id:d.id,...d.data()}));state.roles=sortRoles(x.length?x:defaultRoles);renderApp()});
onSnapshot(query(collection(db,"helpers"),orderBy("createdAt","asc")),s=>{state.helpers=s.docs.map(d=>({id:d.id,...d.data()}));renderApp()});
onSnapshot(query(collection(db,"participants"),orderBy("createdAt","asc")),s=>{state.participants=s.docs.map(d=>({id:d.id,...d.data()}));renderApp()});
onSnapshot(collection(db,"scores"),s=>{state.scores=s.docs.map(d=>({id:d.id,...d.data()}));renderApp()});
onSnapshot(query(collection(db,"alerts"),orderBy("createdAt","desc")),s=>{state.alerts=s.docs.map(d=>({id:d.id,...d.data()}));renderApp()});
}catch(e){console.error(e);toast("Fehler beim Laden.");renderApp()}
}
init();

if("serviceWorker" in navigator){
  let reloading=false;
  navigator.serviceWorker.addEventListener("controllerchange",()=>{
    if(reloading)return;
    reloading=true;
    location.reload();
  });
  window.addEventListener("load",async()=>{
    try{
      const reg=await navigator.serviceWorker.register("./service-worker.js?v=10.12.6",{updateViaCache:"none"});
      await reg.update();
    }catch(e){console.warn(e)}
  });
}
setInterval(()=>{if(state.page==="oritt"||state.page==="home")renderApp()},1000);
