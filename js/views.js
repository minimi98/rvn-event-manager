import {state,EVENT_DATE,ADMIN_KEY,roleById,peopleFor,scoringStations,scoreKey,scoreFor,totalFor,rankedParticipants} from "./state.js";
import {esc,cleanPhone,toast,downloadCSV} from "./utils.js";
import {db,collection,addDoc,deleteDoc,doc,setDoc,serverTimestamp} from "./firebase.js";

const stationAccess=()=>localStorage.getItem("rvn_station_access")||"";
const participantAccess=()=>localStorage.getItem("rvn_participant_id")||"";
const helperCanAccess=(role,phone)=>state.helpers.some(h=>h.role===role&&cleanPhone(h.phone)===cleanPhone(phone));
const isMeldestelle=()=>stationAccess()==="meldestelle";
const isSpringer=()=>stationAccess()==="springer-kfz";
const canManageParticipants=()=>state.isAdmin||isMeldestelle();
const canEditStation=id=>state.isAdmin||stationAccess()===id;
const currentParticipant=()=>state.participants.find(p=>p.id===participantAccess())||null;

export function shell(content){
return `<div class="shell"><header class="topbar"><div class="brand"><button class="menu" onclick="go('home')">☰</button><div><h1>RVN Event Manager</h1><p>O-Ritt 2026 · 26 Paare</p></div></div><img class="logo" src="assets/logo.jpg" alt="RVN Logo"></header><main class="main">${content}</main><nav class="bottom">${nav("home","🏠","Home")}${nav("oritt","🐴","O-Ritt")}${nav("helfer","🙋","Helfer")}${nav("zugang","🔑","Zugang")}${nav("admin","👑","Admin")}</nav></div>`}
const nav=(id,i,l)=>`<button class="nav ${state.page===id?"active":""}" onclick="go('${id}')"><span>${i}</span>${l}</button>`;

function countdown(){const diff=Math.max(0,EVENT_DATE-new Date()),d=Math.floor(diff/86400000),h=Math.floor(diff/3600000)%24,m=Math.floor(diff/60000)%60,s=Math.floor(diff/1000)%60;return `<div class="countdown"><div class="countbox"><strong>${d}</strong><span>Tage</span></div><div class="countbox"><strong>${h}</strong><span>Std</span></div><div class="countbox"><strong>${m}</strong><span>Min</span></div><div class="countbox"><strong>${s}</strong><span>Sek</span></div></div>`}

export function pageView(){
if(state.page==="home")return homePage();
if(state.page==="oritt")return orittPage();
if(state.page==="helfer")return helperPage();
if(state.page==="teilnehmer")return participantPage();
if(state.page==="zugang")return accessPage();
if(state.page==="meldestelle")return meldestellePage();
if(state.page==="station")return stationPage();
if(state.page==="springer")return alertsPage();
if(state.page==="ergebnisse")return resultsPage();
if(state.page==="admin")return adminPage();
return homePage();
}

function homePage(){return `<section class="hero"><div><div class="kicker">Reit- und Fahrverein Neuendettelsau e.V.</div><h2>RVN Event<br>Manager</h2><p>O-Ritt Organisation & Veranstaltungstag</p></div></section><section class="grid two"><article class="card"><div class="icon">🐴</div><h3>O-Ritt 2026</h3><p>26 Paare, Meldestelle, Stationen, Reitkarte und Ergebnisse.</p><button class="arrow" onclick="go('oritt')">›</button></article><article class="card"><div class="icon">🔐</div><h3>Zugänge</h3><p>Stationshelfer, Meldestelle und Springer melden sich per Telefonnummer an.</p><button class="arrow" onclick="go('zugang')">›</button></article></section>`}

function orittPage(){return `<section class="hero"><div><div class="kicker">Orientierungsritt 2026</div><h2>${esc(state.settings.eventTitle)}</h2><p>${esc(state.settings.eventSubtitle)}</p><div class="chip">📅 25. Juli 2026 · Start ab 08:00 Uhr</div>${countdown()}</div></section><section class="grid"><article class="card"><div class="icon">🙋</div><h3>Helferanmeldung</h3><p>Bereiche ansehen und direkt anmelden.</p><button class="arrow" onclick="go('helfer')">›</button></article><article class="card"><div class="icon">📋</div><h3>Meldestelle</h3><p>Teilnehmer, Startzeiten und Paddocks verwalten.</p><button class="arrow" onclick="go('meldestelle')">›</button></article><article class="card"><div class="icon">🐴</div><h3>Stationsmodus</h3><p>Punkte eingeben und Meldungen senden.</p><button class="arrow" onclick="go('station')">›</button></article><article class="card"><div class="icon">🚙</div><h3>Springer</h3><p>Stationsmeldungen übernehmen und bearbeiten.</p><button class="arrow" onclick="go('springer')">›</button></article><article class="card"><div class="icon">🏆</div><h3>Ergebnisse</h3><p>Teilnehmer sehen nur den eigenen Rang.</p><button class="arrow" onclick="go('ergebnisse')">›</button></article></section>
  <section class="panel">
    <div class="head">
      <div>
        <h2>🐴 Stations- und Helferübersicht</h2>
        <p class="sub">Hier sehen Helfer sofort, welche Bereiche es gibt und wo noch Unterstützung gebraucht wird.</p>
      </div>
      <button class="btn alt" onclick="go('helfer')">Zur Helferanmeldung</button>
    </div>
    <div class="cards">
      ${state.roles.map(r=>{
        const count=peopleFor(r.id).length;
        const free=Math.max(0,Number(r.max||0)-count);
        return `<div class="info">
          <h3>${r.icon} ${esc(r.name)}</h3>
          <p>${esc(r.description||"Beschreibung folgt.")}</p>
          ${r.location?`<p><strong>📍 Standort:</strong> ${esc(r.location)}</p>`:""}
          ${r.dutyTime?`<p><strong>🕒 Einsatzzeit:</strong> ${esc(r.dutyTime)}</p>`:""}
          <p><strong>${count} / ${r.max}</strong> eingetragen · ${free===0?"voll":free+" frei"}</p>
          <button class="btn light" onclick="selectHelperRole('${r.id}');go('helfer')">Bereich wählen</button>
        </div>`;
      }).join("")}
    </div>
  </section>`}


function helperPage(){
  return `<section class="panel">
    <div class="head">
      <div>
        <h2>🙋 Helferanmeldung</h2>
        <p class="sub">Wähle einen Bereich und trag dich direkt ein.</p>
      </div>
    </div>

    <div class="cards">
      ${state.roles.map(r=>{
        const count=peopleFor(r.id).length;
        const free=Math.max(0,Number(r.max||0)-count);
        return `<div class="info">
          <h3>${r.icon} ${esc(r.name)}</h3>
          <p>${esc(r.description||"Beschreibung folgt.")}</p>
          ${r.location?`<p><strong>📍 Standort:</strong> ${esc(r.location)}</p>`:""}
          ${r.dutyTime?`<p><strong>🕒 Einsatzzeit:</strong> ${esc(r.dutyTime)}</p>`:""}
          ${r.contact?`<p><strong>👤 Ansprechpartner:</strong> ${esc(r.contact)}</p>`:""}
          <p><strong>${count} / ${r.max}</strong> eingetragen · ${free===0?"voll":free+" frei"}</p>
          <button class="btn ${free===0?"light":"alt"}" ${free===0?"disabled":""} onclick="selectHelperRole('${r.id}')">${free===0?"Voll":"Diesen Bereich wählen"}</button>
        </div>`;
      }).join("")}
    </div>
  </section>

  <section class="panel">
    <h2>📝 Als Helfer eintragen</h2>
    <div class="notice">Die Telefonnummer wird später zugleich für den Zugang zu deiner Station, der Meldestelle oder dem Springerbereich verwendet.</div>
    <form id="helperSignupForm" class="form">
      <label>Name<input id="helperName" required placeholder="Vor- und Nachname"></label>
      <label>Telefonnummer<input id="helperPhone" required placeholder="Telefonnummer"></label>
      <label>Bereich
        <select id="helperRole">
          ${state.roles.map(r=>`<option value="${r.id}">${r.icon} ${esc(r.name)}</option>`).join("")}
        </select>
      </label>
      <label>Zeitraum
        <select id="helperTime">
          <option>ganztags</option>
          <option>vormittags</option>
          <option>nachmittags</option>
          <option>abends</option>
          <option>nach Absprache</option>
        </select>
      </label>
      <label class="full">Bemerkung<textarea id="helperNote" placeholder="z. B. mit Auto, erst ab 12 Uhr"></textarea></label>
      <button class="btn full" type="submit">Verbindlich eintragen</button>
    </form>
  </section>

  ${state.isAdmin?adminHelperManagement():""}`;
}

function adminHelperManagement(){
  return `<section class="panel">
    <h2>👑 Helferverwaltung</h2>
    ${state.helpers.length?state.helpers.map(h=>`
      <div class="entry">
        <div>
          <strong>${esc(h.name)}</strong><br>
          <small>${esc(h.phone||"-")} · ${esc(h.time||"-")} · ${esc(h.note||"keine Bemerkung")}</small>
        </div>
        <div>
          <select id="helper-role-${h.id}">
            ${state.roles.map(r=>`<option value="${r.id}" ${r.id===h.role?"selected":""}>${r.icon} ${esc(r.name)}</option>`).join("")}
          </select>
          <button class="btn light" onclick="moveHelper('${h.id}')">Verschieben</button>
          <button class="btn danger" onclick="deleteHelper('${h.id}')">Löschen</button>
        </div>
      </div>`).join(""):`<p class="sub">Noch keine Helfer eingetragen.</p>`}
  </section>`;
}

function accessPage(){return `<section class="panel"><h2>🔑 Helferzugang</h2><div class="notice">Station auswählen und die bei der Helferanmeldung hinterlegte Telefonnummer eingeben.</div><form id="accessForm" class="form"><label>Bereich<select id="accessRole">${state.roles.filter(r=>r.id==="meldestelle"||r.id==="springer-kfz"||r.id.startsWith("station-")).map(r=>`<option value="${r.id}">${r.icon} ${esc(r.name)}</option>`).join("")}</select></label><label>Telefonnummer<input id="accessPhone"></label><button class="btn full">Freischalten</button></form>${stationAccess()?`<div class="notice">Aktuell freigeschaltet: <strong>${esc(roleById(stationAccess())?.name||stationAccess())}</strong><br><button class="btn light" onclick="helperLogout()">Abmelden</button></div>`:""}</section>`}

function participantPage(){const p=currentParticipant();if(!p)return `<section class="panel"><h2>🗺️ Teilnehmerbereich</h2><div class="notice">Anmeldung mit Startnummer und Teamname.</div><form id="participantLoginForm" class="form"><label>Startnummer<input id="pLoginStart"></label><label>Teamname<input id="pLoginTeam"></label><button class="btn full">Öffnen</button></form></section>`;const rank=rankedParticipants().findIndex(x=>x.id===p.id)+1;const release=isRouteReleased(p);return `<section class="panel"><div class="head"><div><h2>🗺️ Teilnehmerbereich</h2><p class="sub">Teilnehmer: ${esc(p.name)} · Team: ${esc(p.horse||"-")}</p></div><button class="btn light" onclick="participantLogout()">Abmelden</button></div><div class="cards"><div class="info"><h3>🕒 Startzeit</h3><p>${esc(p.startTime||"-")}</p></div><div class="info"><h3>🏕️ Paddock</h3><p>${esc(p.paddock||"-")}</p></div><div class="info"><h3>🏅 Eigener Rang</h3><p>${rank>0?rank:"-"}</p></div></div></section><section class="panel"><h2>🧭 Reitkarte</h2>${release?`${p.routeGpxUrl?`<p><a class="btn alt" href="${esc(p.routeGpxUrl)}" target="_blank">GPX-/OsmAnd-Link öffnen</a></p>`:""}${p.routeMapUrl?`<p><a class="btn light" href="${esc(p.routeMapUrl)}" target="_blank">Kartenausschnitt öffnen</a></p>`:""}${!p.routeGpxUrl&&!p.routeMapUrl?`<div class="notice">Noch kein Kartenlink hinterlegt.</div>`:""}`:`<div class="notice">Freigabe 30 Minuten vor Startzeit.</div>`}</section>`}

function isRouteReleased(p){if(state.isAdmin||isMeldestelle())return true;if(!p.startTime)return false;const [h,m]=String(p.startTime).split(":").map(Number);const now=new Date(),start=new Date(now);start.setHours(h||0,m||0,0,0);return now.getTime()>=start.getTime()-30*60000}

function meldestellePage(){if(!canManageParticipants())return `<section class="panel"><h2>📋 Meldestelle</h2><div class="notice">Nur Admin oder eingetragene Helfer der Meldestelle.</div></section>`;const sorted=[...state.participants].sort((a,b)=>String(a.startTime||"99:99").localeCompare(String(b.startTime||"99:99")));return `<section class="panel"><div class="head"><h2>📋 Meldestelle</h2><button class="btn alt" onclick="exportParticipants()">CSV</button></div>${participantForm()}${sorted.map(p=>`<div class="entry"><div style="width:100%"><strong>${esc(p.startNumber||"-")} · ${esc(p.name)}</strong><div class="form"><label>Startnummer<input id="start-${p.id}" value="${esc(p.startNumber||"")}"></label><label>Teilnehmer<input id="name-${p.id}" value="${esc(p.name||"")}"></label><label>Teamname<input id="horse-${p.id}" value="${esc(p.horse||"")}"></label><label>Startzeit<input type="time" id="time-${p.id}" value="${esc(p.startTime||"")}"></label><label>Paddock<input id="paddock-${p.id}" value="${esc(p.paddock||"")}"></label><label>Status<select id="status-${p.id}"><option ${p.status==="gemeldet"?"selected":""}>gemeldet</option><option ${p.status==="gestartet"?"selected":""}>gestartet</option><option ${p.status==="im Ziel"?"selected":""}>im Ziel</option></select></label><label class="full">GPX-Link<input id="gpx-${p.id}" value="${esc(p.routeGpxUrl||"")}"></label><label class="full">Kartenlink<input id="map-${p.id}" value="${esc(p.routeMapUrl||"")}"></label></div><button class="btn light" onclick="saveParticipantMeta('${p.id}')">Teilnehmer speichern</button><button class="btn danger" onclick="deleteParticipant('${p.id}')">Löschen</button></div></div>`).join("")}</section>`}

function participantForm(){return `<form id="participantForm" class="form"><label>Startnummer<input id="pStart"></label><label>Teilnehmer<input id="pName"></label><label>Teamname<input id="pHorse"></label><label>Startzeit<input id="pTime" type="time"></label><label>Paddock<input id="pPaddock"></label><label>Strecke<select id="pRoute"><option>17 km</option></select></label><label class="full">GPX-/OsmAnd-Link<input id="pGpx"></label><label class="full">Kartenausschnitt-Link<input id="pMap"></label><button class="btn full">Teilnehmer hinzufügen</button></form>`}

function stationPage(){const id=stationAccess();if(!id||!id.startsWith("station-"))return `<section class="panel"><h2>🐴 Stationsmodus</h2><div class="notice">Bitte zuerst über „Zugang“ freischalten.</div></section>`;const st=roleById(id);return `<section class="panel"><div class="head"><h2>${st.icon} ${esc(st.name)}</h2><button class="btn light" onclick="go('zugang')">Zugang wechseln</button></div><div class="entries">${state.participants.map(p=>`<form class="entry score-form" data-participant="${p.id}" data-station="${id}"><div><strong>${esc(p.startNumber||"-")} · ${esc(p.name)}</strong><br><small>Team: ${esc(p.horse||"-")}</small></div><div><input name="points" type="number" min="0" max="${st.maxPoints||999}" step="0.5" value="${scoreFor(p.id,id)?.points??""}" placeholder="Punkte"><button class="btn alt">Speichern</button></div></form>`).join("")}</div></section>${alertForm(id)}`}

function alertForm(stationId){return `<section class="panel"><h2>🚨 Meldung an Meldestelle</h2><form id="alertForm" class="form"><input type="hidden" id="alertStation" value="${stationId}"><label>Priorität<select id="alertPriority"><option value="info">Info</option><option value="help">Hilfe benötigt</option><option value="emergency">Notfall</option></select></label><label class="full">Nachricht<textarea id="alertText"></textarea></label><button class="btn danger full">Meldung senden</button></form></section>`}

function alertsPage(){if(!(state.isAdmin||isMeldestelle()||isSpringer()))return `<section class="panel"><h2>🚙 Meldungen</h2><div class="notice">Nur Admin, Meldestelle oder Springer.</div></section>`;return `<section class="panel"><h2>🚨 Stationsmeldungen</h2>${state.alerts.length?state.alerts.map(a=>`<div class="alert ${esc(a.priority||"info")}"><span class="badge ${esc(a.priority||"info")}">${a.priority==="emergency"?"Notfall":a.priority==="help"?"Hilfe":"Info"}</span><h3>${esc(roleById(a.stationId)?.name||a.stationId)}</h3><p>${esc(a.text)}</p><small>Status: ${esc(a.status||"offen")} ${a.assignedTo?`· übernommen von ${esc(a.assignedTo)}`:""}</small><div><button class="btn light" onclick="updateAlert('${a.id}','übernommen')">Übernommen</button><button class="btn light" onclick="updateAlert('${a.id}','unterwegs')">Unterwegs</button><button class="btn alt" onclick="updateAlert('${a.id}','erledigt')">Erledigt</button></div></div>`).join(""):`<p class="sub">Keine Meldungen.</p>`}</section>`}

function resultsPage(){if(state.isAdmin||isMeldestelle()||stationAccess().startsWith("station-")){const rank=rankedParticipants();return `<section class="panel"><h2>🏆 Vollständige Ergebnisansicht</h2>${rank.map((p,i)=>`<div class="entry"><div><strong>${i+1}. ${esc(p.name)}</strong><br><small>Team: ${esc(p.horse||"-")}</small></div><strong>${totalFor(p.id)} Punkte</strong></div>`).join("")}</section>`}return `<section class="panel"><h2>🏅 Eigenen Rang suchen</h2><div class="notice">Punktzahlen und vollständige Rangliste bleiben bis zur Siegerehrung verborgen.</div><form id="rankForm" class="form"><label>Gruppenname<input id="rankName"></label><label>Pferdename<input id="rankHorse"></label><button class="btn full">Rang suchen</button></form><div id="rankResult"></div></section>`}


function adminExtras(){
  return `<section class="panel">
    <h2>📄 Dokumentencenter</h2>
    <form id="documentsToggleForm" class="form">
      <label class="full">Öffentliche Anzeige
        <select id="documentsPublic">
          <option value="false" ${!state.settings.documentsPublic?"selected":""}>deaktiviert</option>
          <option value="true" ${state.settings.documentsPublic?"selected":""}>aktiviert</option>
        </select>
      </label>
      <button class="btn full">Speichern</button>
    </form>
  </section>
  <section class="panel">
    <h2>📍 Stationsinformationen</h2>
    ${state.roles.filter(r=>r.id.startsWith("station-")).map(r=>`
      <div class="entry">
        <div style="width:100%">
          <strong>${esc(r.name)}</strong>
          <div class="form">
            <label>Stationsname / Nummer<input id="station-name-${r.id}" value="${esc(r.name||"")}"></label>
            <label>Reihenfolge<input id="station-order-${r.id}" type="number" value="${r.order ?? 999}"></label>
            <label>Standort<input id="loc-${r.id}" value="${esc(r.location||"")}"></label>
            <label>Einsatzzeit<input id="duty-${r.id}" value="${esc(r.dutyTime||"")}"></label>
            <label>Ansprechpartner<input id="contact-${r.id}" value="${esc(r.contact||"")}"></label>
            <label class="full">Beschreibung<textarea id="desc-${r.id}">${esc(r.description||"")}</textarea></label>
          </div>
          <button class="btn light" type="button" onclick="moveStation('${r.id}',-1)">↑ Nach oben</button>
          <button class="btn light" type="button" onclick="moveStation('${r.id}',1)">↓ Nach unten</button>
          <button class="btn alt" onclick="saveStationInfo('${r.id}')">Station speichern</button>
        </div>
      </div>`).join("")}
  </section>`;
}

function adminPage(){if(!state.isAdmin)return `<section class="panel"><h2>🔒 Admin</h2><form id="adminForm" class="form"><label>Passwort<input id="adminPassword" type="password"></label><button class="btn full">Einloggen</button></form></section>`;return `<section class="panel"><div class="head"><h2>👑 Admin Dashboard</h2><button class="btn light" onclick="adminLogout()">Abmelden</button></div><div class="stats"><div class="stat"><strong>${state.participants.length}</strong><span>Teilnehmer</span></div><div class="stat"><strong>${state.helpers.length}</strong><span>Helfer</span></div><div class="stat"><strong>${state.alerts.filter(a=>a.status!=="erledigt").length}</strong><span>offene Meldungen</span></div><div class="stat"><strong>${scoringStations().length}</strong><span>Stationen</span></div></div><button class="btn" onclick="go('meldestelle')">Meldestelle</button><button class="btn" onclick="go('springer')">Meldungen</button><button class="btn" onclick="go('ergebnisse')">Ergebnisse</button></section>${adminExtras()}`}

export function attachForms(render){
const a=document.getElementById("accessForm");if(a)a.addEventListener("submit",accessLogin);
const hs=document.getElementById("helperSignupForm");if(hs){hs.addEventListener("submit",submitHelperSignup);const pre=sessionStorage.getItem("rvn_preselect_helper_role");if(pre){const sel=document.getElementById("helperRole");if(sel)sel.value=pre;sessionStorage.removeItem("rvn_preselect_helper_role");}}
const p=document.getElementById("participantLoginForm");if(p)p.addEventListener("submit",participantLogin);
const pf=document.getElementById("participantForm");if(pf)pf.addEventListener("submit",addParticipant);
const af=document.getElementById("alertForm");if(af)af.addEventListener("submit",sendAlert);
const dt=document.getElementById("documentsToggleForm");if(dt)dt.addEventListener("submit",saveDocumentsToggle);
const adm=document.getElementById("adminForm");if(adm)adm.addEventListener("submit",e=>{e.preventDefault();if(document.getElementById("adminPassword").value===state.settings.adminPassword){state.isAdmin=true;localStorage.setItem(ADMIN_KEY,"yes");render()}else toast("Falsches Passwort.")});
const rf=document.getElementById("rankForm");if(rf)rf.addEventListener("submit",rankSearch);
document.querySelectorAll(".score-form").forEach(f=>f.addEventListener("submit",saveScore));
}


async function saveDocumentsToggle(e){
  e.preventDefault();
  if(!state.isAdmin) return toast("Keine Berechtigung.");
  await setDoc(doc(db,"settings","main"),{documentsPublic:document.getElementById("documentsPublic").value==="true"},{merge:true});
  toast("Dokumentencenter gespeichert.");
}

window.moveStation=async(id,delta)=>{
  if(!state.isAdmin) return toast("Keine Berechtigung.");
  const station=roleById(id);
  if(!station) return;
  await setDoc(doc(db,"roles",id),{
    order:Number(station.order??999)+delta,
    updatedAt:serverTimestamp()
  },{merge:true});
  toast("Reihenfolge geändert.");
};

window.saveStationInfo=async id=>{
  if(!state.isAdmin) return toast("Keine Berechtigung.");
  await setDoc(doc(db,"roles",id),{
    name:document.getElementById("station-name-"+id).value,
    order:Number(document.getElementById("station-order-"+id).value||999),
    location:document.getElementById("loc-"+id).value,
    dutyTime:document.getElementById("duty-"+id).value,
    contact:document.getElementById("contact-"+id).value,
    description:document.getElementById("desc-"+id).value,
    updatedAt:serverTimestamp()
  },{merge:true});
  toast("Station gespeichert.");
};


async function submitHelperSignup(e){
  e.preventDefault();
  const role=document.getElementById("helperRole").value;
  const roleData=roleById(role);
  const count=peopleFor(role).length;

  if(roleData && count>=Number(roleData.max||0)){
    return toast("Dieser Bereich ist bereits voll.");
  }

  const payload={
    name:document.getElementById("helperName").value.trim(),
    phone:document.getElementById("helperPhone").value.trim(),
    role,
    time:document.getElementById("helperTime").value,
    note:document.getElementById("helperNote").value.trim(),
    createdAt:serverTimestamp()
  };

  if(!payload.name||!payload.phone){
    return toast("Bitte Name und Telefonnummer eintragen.");
  }

  await addDoc(collection(db,"helpers"),payload);
  e.target.reset();
  toast("Danke! Du bist als Helfer eingetragen.");
}

window.selectHelperRole=id=>{
  sessionStorage.setItem("rvn_preselect_helper_role",id);
  const select=document.getElementById("helperRole");
  if(select){
    select.value=id;
    select.scrollIntoView({behavior:"smooth",block:"center"});
  }
};

window.moveHelper=async id=>{
  if(!state.isAdmin) return toast("Keine Berechtigung.");
  const role=document.getElementById("helper-role-"+id).value;
  const roleData=roleById(role);
  const count=peopleFor(role).filter(h=>h.id!==id).length;
  if(roleData && count>=Number(roleData.max||0)){
    return toast("Der Zielbereich ist bereits voll.");
  }
  await setDoc(doc(db,"helpers",id),{role,updatedAt:serverTimestamp()},{merge:true});
  toast("Helfer verschoben.");
};

window.deleteHelper=async id=>{
  if(!state.isAdmin) return toast("Keine Berechtigung.");
  if(confirm("Helfer wirklich löschen?")){
    await deleteDoc(doc(db,"helpers",id));
    toast("Helfer gelöscht.");
  }
};

async function accessLogin(e){e.preventDefault();const role=document.getElementById("accessRole").value,phone=document.getElementById("accessPhone").value;if(!helperCanAccess(role,phone))return toast("Keine passende Helferanmeldung gefunden.");localStorage.setItem("rvn_station_access",role);toast("Zugang freigeschaltet.");window.go(role==="meldestelle"?"meldestelle":role==="springer-kfz"?"springer":"station")}
function participantLogin(e){e.preventDefault();const s=String(document.getElementById("pLoginStart").value).trim(),t=String(document.getElementById("pLoginTeam").value).trim().toLowerCase();const p=state.participants.find(x=>String(x.startNumber||"").trim()===s&&String(x.horse||"").trim().toLowerCase()===t);if(!p)return toast("Nicht gefunden.");localStorage.setItem("rvn_participant_id",p.id);window.renderApp()}
async function addParticipant(e){e.preventDefault();await addDoc(collection(db,"participants"),{startNumber:document.getElementById("pStart").value.trim(),name:document.getElementById("pName").value.trim(),horse:document.getElementById("pHorse").value.trim(),startTime:document.getElementById("pTime").value,paddock:document.getElementById("pPaddock").value.trim(),route:document.getElementById("pRoute").value,routeGpxUrl:document.getElementById("pGpx").value.trim(),routeMapUrl:document.getElementById("pMap").value.trim(),status:"gemeldet",createdAt:serverTimestamp()});e.target.reset();toast("Teilnehmer hinzugefügt.")}
async function saveScore(e){e.preventDefault();const p=e.currentTarget.dataset.participant,st=e.currentTarget.dataset.station;if(!canEditStation(st))return toast("Keine Berechtigung.");await setDoc(doc(db,"scores",scoreKey(p,st)),{participantId:p,stationId:st,points:Number(e.currentTarget.points.value||0),updatedAt:serverTimestamp()},{merge:true});toast("Punkte gespeichert.")}
async function sendAlert(e){e.preventDefault();await addDoc(collection(db,"alerts"),{stationId:document.getElementById("alertStation").value,priority:document.getElementById("alertPriority").value,text:document.getElementById("alertText").value.trim(),status:"offen",createdAt:serverTimestamp()});e.target.reset();toast("Meldung gesendet.")}
function rankSearch(e){e.preventDefault();const n=String(document.getElementById("rankName").value).toLowerCase().trim(),h=String(document.getElementById("rankHorse").value).toLowerCase().trim(),rank=rankedParticipants(),p=rank.find(x=>(!n||String(x.name||"").toLowerCase().includes(n))&&(!h||String(x.horse||"").toLowerCase().includes(h))),r=document.getElementById("rankResult");r.innerHTML=p?`<div class="notice"><strong>${esc(p.name)}</strong>: aktueller Rang <strong>${rank.findIndex(x=>x.id===p.id)+1}</strong>.</div>`:`<div class="notice">Nicht gefunden.</div>`}

window.saveParticipantMeta=async id=>{if(!canManageParticipants())return toast("Keine Berechtigung.");await setDoc(doc(db,"participants",id),{startNumber:document.getElementById("start-"+id).value,name:document.getElementById("name-"+id).value,horse:document.getElementById("horse-"+id).value,startTime:document.getElementById("time-"+id).value,paddock:document.getElementById("paddock-"+id).value,status:document.getElementById("status-"+id).value,routeGpxUrl:document.getElementById("gpx-"+id).value,routeMapUrl:document.getElementById("map-"+id).value,updatedAt:serverTimestamp()},{merge:true});toast("Gespeichert.")}
window.deleteParticipant=async id=>{if(canManageParticipants()&&confirm("Teilnehmer löschen?"))await deleteDoc(doc(db,"participants",id))}
window.updateAlert=async(id,status)=>{if(!(state.isAdmin||isMeldestelle()||isSpringer()))return toast("Keine Berechtigung.");await setDoc(doc(db,"alerts",id),{status,assignedTo:roleById(stationAccess())?.name||"Admin",updatedAt:serverTimestamp()},{merge:true});toast("Meldung aktualisiert.")}
window.helperLogout=()=>{localStorage.removeItem("rvn_station_access");window.renderApp()}
window.participantLogout=()=>{localStorage.removeItem("rvn_participant_id");window.renderApp()}
window.adminLogout=()=>{state.isAdmin=false;localStorage.removeItem(ADMIN_KEY);window.renderApp()}
window.exportParticipants=()=>{const rows=[["Startnr","Name","Pferd","Startzeit","Paddock","GPX","Karte"]];state.participants.forEach(p=>rows.push([p.startNumber||"",p.name||"",p.horse||"",p.startTime||"",p.paddock||"",p.routeGpxUrl||"",p.routeMapUrl||""]));downloadCSV(rows,"RVN_Teilnehmer.csv")}
