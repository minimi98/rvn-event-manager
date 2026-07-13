export const EVENT_DATE = new Date("2026-07-25T08:00:00");
export const ADMIN_KEY = "rvn_admin_logged_in";
export const defaultSettings={adminPassword:"RVN2026!",whatsappText:"🐴 RVN Event Manager – Helferanmeldung O-Ritt 2026:",eventTitle:"Beach Please – wir reiten!",eventSubtitle:"Sommer, Sonne, Sattel"};
export const defaultRoles=[
{id:"aufbau",order:-2,name:"Aufbauteam",icon:"🔧",max:6,maxPoints:0,description:"Aufbau vor der Veranstaltung."},
{id:"meldestelle",order:0,name:"Meldestelle",icon:"📋",max:4,maxPoints:0,description:"Anmeldung, Startzeiten, Paddocks und Rückfragen."},
...Array.from({length:8},(_,i)=>({id:`station-${i+1}`,order:i+1,name:`Station ${i+1}`,icon:"🐴",max:3,maxPoints:10,description:""})),
{id:"springer-kfz",order:20,name:"Springer mit KFZ",icon:"🚙",max:4,maxPoints:0,description:"Übernimmt Stationsmeldungen und Notfälle."},
{id:"grillen",order:30,name:"Grillteam",icon:"🔥",max:6,maxPoints:0,description:"Verpflegung."},
{id:"abbau",order:40,name:"Abbauteam",icon:"🔨",max:6,maxPoints:0,description:"Abbau nach der Veranstaltung."}
];
export const state={settings:{...defaultSettings},roles:[...defaultRoles],helpers:[],participants:[],scores:[],alerts:[],page:"home",isAdmin:localStorage.getItem(ADMIN_KEY)==="yes"};
export const sortRoles=a=>[...a].sort((x,y)=>Number(x.order??999)-Number(y.order??999)||String(x.name||"").localeCompare(String(y.name||"")));
export const roleById=id=>state.roles.find(r=>r.id===id);
export const peopleFor=id=>state.helpers.filter(h=>h.role===id);
export const scoringStations=()=>state.roles.filter(r=>r.id.startsWith("station-"));
export const scoreKey=(p,s)=>p+"__"+s;
export const scoreFor=(p,s)=>state.scores.find(x=>x.participantId===p&&x.stationId===s);
export const totalFor=p=>scoringStations().reduce((sum,st)=>sum+Number(scoreFor(p,st.id)?.points||0),0);
export const rankedParticipants=()=>[...state.participants].sort((a,b)=>totalFor(b.id)-totalFor(a.id)||String(a.startNumber||"").localeCompare(String(b.startNumber||"")));
