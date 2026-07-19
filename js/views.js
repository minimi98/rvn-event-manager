import {state,EVENT_DATE,ADMIN_KEY,roleById,peopleFor,scoringStations,scoreKey,scoreFor,totalFor,rankedParticipants} from "./state.js?v=10.4";
import {esc,cleanPhone,toast,downloadCSV} from "./utils.js?v=10.4";
import {db,collection,addDoc,deleteDoc,doc,setDoc,serverTimestamp} from "./firebase.js?v=10.4";

const stationAccess=()=>localStorage.getItem("rvn_station_access")||"";
const participantAccess=()=>localStorage.getItem("rvn_participant_id")||"";
const helperCanAccess=(role,phone)=>state.helpers.some(h=>h.role===role&&cleanPhone(h.phone)===cleanPhone(phone));
const isMeldestelle=()=>stationAccess()==="meldestelle";
const isSpringer=()=>stationAccess()==="springer-kfz";
const canManageParticipants=()=>state.isAdmin||isMeldestelle();
const canEditStation=id=>state.isAdmin||stationAccess()===id;
const currentParticipant=()=>state.participants.find(p=>p.id===participantAccess())||null;
const helperGateOpen=()=>state.isAdmin||sessionStorage.getItem("rvn_helper_gate")==="yes";
const assignedHelper=()=>state.helpers.find(h=>cleanPhone(h.phone)===cleanPhone(localStorage.getItem("rvn_helper_phone")||""))||null;

export function shell(content){
return `<div class="shell"><header class="topbar"><div class="brand"><button class="menu" aria-label="Startseite" onclick="go('home')">☰</button><div class="brand-copy"><h1>RVN Event Manager</h1><p>O-Ritt 2026 · Beach Please – wir reiten!</p></div></div><img class="logo" src="assets/logo.png" onerror="this.src='assets/logo.jpg'" alt="RVN Logo"></header><main class="main">${content}</main><nav class="bottom">${nav("home","🏠","Startseite")}${nav("oritt","🐴","O-Ritt")}${nav("teilnehmer","🏇","Teilnehmer")}${nav("ergebnisse","🏆","Ergebnisse")}</nav></div>`}
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

function homePage(){
const s=state.settings||{};
const maps=s.mapsUrl||"https://www.google.com/maps/search/?api=1&query=Reit-+und+Fahrverein+Neuendettelsau";
const link=(label,url,icon)=>url?`<a class="btn" href="${esc(url)}" target="_blank" rel="noopener">${icon} ${label}</a>`:`<button class="btn light" disabled>${icon} ${label} folgt</button>`;
return `<section class="hero"><div><div class="kicker">Reit- und Fahrverein Neuendettelsau e.V.</div><h2>Beach Please –<br>wir reiten!</h2><p>Herzlich willkommen beim O-Ritt 2026.</p><div class="chip">📅 25. Juli 2026 · Neuendettelsau</div>${countdown()}</div></section>
<section class="panel poster-strip"><img src="assets/beach-poster.png" alt="Offizielles Veranstaltungsplakat"><div><div class="kicker">O-Ritt 2026</div><h2>Willkommen!</h2><p>${esc(s.welcomeText||"Auf dieser Seite findest du alle öffentlichen Informationen zur Veranstaltung, zur Anreise und zum Ablauf.")}</p></div></section>
<section class="panel"><h2>📌 Wichtige Informationen</h2><div class="cards"><div class="info"><h3>📍 Adresse</h3><p>${esc(s.address||"Reit- und Fahrverein Neuendettelsau e.V.")}</p><a class="btn light" href="${esc(maps)}" target="_blank" rel="noopener">Google Maps öffnen</a></div><div class="info"><h3>🐴 Paddock</h3><p>${esc(s.paddockInfo||"Informationen zum Paddock folgen.")}</p></div><div class="info"><h3>🚗 Parken</h3><p>${esc(s.parkingInfo||"Informationen zu den Parkflächen folgen.")}</p></div></div></section>
<section class="panel"><h2>🗺️ Schnellzugriff</h2><div class="route-actions">${link("Ausschreibung",s.ausschreibungUrl,"📄")}${link("Zeitplan",s.zeitplanUrl,"🕒")}${link("Anmeldung",s.anmeldungUrl,"✍️")}${link("Anreise & Lageplan",s.lageplanUrl||"assets/lageplan.png","📍")}${link("Wichtige Hinweise",s.hinweiseUrl,"⚠️")}${link("Kontakt",s.kontaktUrl,"☎️")}</div></section>
<section class="panel"><h2>Seitenübersicht</h2><div class="cards"><div class="info"><h3>🐴 O-Ritt</h3><p>Öffentliche Veranstaltungsinformationen.</p><button class="btn light" onclick="go('oritt')">Öffnen</button></div><div class="info"><h3>🏇 Teilnehmer</h3><p>Persönlicher Zugang für angemeldete Teams.</p><button class="btn light" onclick="go('teilnehmer')">Öffnen</button></div><div class="info"><h3>🏆 Ergebnisse</h3><p>Öffentlich einsehbare Ergebnisse.</p><button class="btn light" onclick="go('ergebnisse')">Öffnen</button></div></div></section>
<section class="panel"><details><summary>Interner Zugang</summary><div class="route-actions" style="margin-top:12px"><button class="btn light" onclick="go('helfer')">Helferbereich</button><button class="btn light" onclick="go('admin')">Admin</button></div></details></section>`}

function orittPage(){
const s=state.settings||{};
return `<section class="hero"><div><div class="kicker">Orientierungsritt 2026</div><h2>${esc(s.eventTitle||"Beach Please – wir reiten!")}</h2><p>${esc(s.eventSubtitle||"Sommer, Sonne, Sattel")}</p><div class="chip">📅 25. Juli 2026 · Start ab 08:00 Uhr</div>${countdown()}</div></section>
<section class="panel"><h2>🐴 Der O-Ritt</h2><p>${esc(s.publicEventInfo||"Freut euch auf einen abwechslungsreichen Orientierungsritt mit Aufgabenstationen und gemeinsamer Siegerehrung.")}</p></section>
<section class="cards"><div class="info"><h3>🌊 Kleine Runde</h3><p>ca. 7 km</p></div><div class="info"><h3>🌴 Große Runde</h3><p>ca. 17 km</p></div><div class="info"><h3>🏆 Siegerehrung</h3><p>${esc(s.awardsInfo||"Weitere Informationen folgen.")}</p></div></section>
<section class="panel"><h2>Hinweis</h2><div class="notice">Strecken, GPX-Dateien, QR-Codes, Stationen und Helfereinteilungen sind nicht öffentlich sichtbar.</div></section>`}


function routeCard(name,length,url){const absolute=new URL(url,location.href).href;const qr="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data="+encodeURIComponent(absolute);return `<article class="route-card"><div class="route-layout"><div><h3>🐴 ${name}</h3><p>${length} · GPX-Datei für Navigations-Apps</p><div class="route-actions"><a class="btn" href="${url}" download>GPX herunterladen</a><a class="btn light" href="${url}" target="_blank" rel="noopener">Öffnen</a></div></div><img class="qr" src="${qr}" alt="QR-Code ${name}" loading="lazy"></div></article>`}

function helperPage(){
if(!helperGateOpen()) return `<section class="panel"><h2>🔒 Geschützter Helferbereich</h2><div class="notice">Helfer-, Stations- und Einsatzdaten sind nur mit Helferpasswort sichtbar.</div><form id="helperGateForm" class="form"><label class="full">Helferpasswort<input id="helperGatePassword" type="password" autocomplete="current-password"></label><button class="btn full">Helferbereich öffnen</button></form></section>`;
const helper=assignedHelper();
if(helper && helper.role?.startsWith("station-")) return stationPage();
if(helper?.role==="meldestelle") return meldestellePage();
if(helper?.role==="springer-kfz") return alertsPage();
return `<section class="panel"><div class="head"><div><h2>🙋 Helferbereich</h2><p class="sub">Übersicht, Anmeldung und persönlicher Zugang.</p></div><button class="btn light" onclick="closeHelperGate()">Bereich schließen</button></div>
<div class="cards"><div class="info"><h3>📞 Persönlicher Zugang</h3><p>Mit deiner bei der Helferanmeldung hinterlegten Telefonnummer öffnest du deinen Einsatzbereich.</p><form id="helperPhoneForm" class="form"><label class="full">Telefonnummer<input id="helperAccessPhone" inputmode="tel" autocomplete="tel"></label><button class="btn full">Meinen Bereich öffnen</button></form></div>
<div class="info"><h3>🕒 Tagesablauf</h3><p>${esc(state.settings.helperSchedule||"Der Tagesablauf wird hier veröffentlicht.")}</p></div>
<div class="info"><h3>🍽️ Verpflegung</h3><p>${esc(state.settings.cateringInfo||"Informationen zur Helferverpflegung folgen.")}</p></div>
<div class="info"><h3>🚗 Helferparken</h3><p>${esc(state.settings.helperParkingInfo||"Informationen zum Helferparken folgen.")}</p></div>
<div class="info"><h3>🚨 Notfall</h3><p>${esc(state.settings.emergencyInfo||"Im Notfall Meldestelle oder Springer verständigen.")}</p></div></div></section>
<section class="panel"><h2>📍 Stationen und Aufgaben</h2><div class="cards">${state.roles.map(r=>`<div class="info"><h3>${r.icon} ${esc(r.name)}</h3><p>${esc(r.description||"Beschreibung folgt.")}</p>${r.location?`<p><strong>Standort:</strong> ${esc(r.location)}</p>`:""}${r.dutyTime?`<p><strong>Einsatzzeit:</strong> ${esc(r.dutyTime)}</p>`:""}${r.contact?`<p><strong>Kontakt:</strong> ${esc(r.contact)}</p>`:""}<p><strong>Helfer:</strong><br>${peopleFor(r.id).length?peopleFor(r.id).map(h=>esc(h.name)).join("<br>"):"noch nicht besetzt"}</p></div>`).join("")}</div></section>
<section class="panel"><h2>📝 Helferanmeldung</h2><form id="helperSignupForm" class="form"><label>Name<input id="helperName" required></label><label>Telefonnummer<input id="helperPhone" required></label><label>Bereich<select id="helperRole">${state.roles.map(r=>`<option value="${r.id}">${r.icon} ${esc(r.name)}</option>`).join("")}</select></label><label>Zeitraum<select id="helperTime"><option>ganztags</option><option>vormittags</option><option>nachmittags</option><option>abends</option><option>nach Absprache</option></select></label><label class="full">Bemerkung<textarea id="helperNote"></textarea></label><button class="btn full">Verbindlich eintragen</button></form></section>${state.isAdmin?adminHelperManagement():""}` }

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
      </div>`).join(""):`<p class="sub">Noch keine Helfer eingetragen.</p>
  <section class="panel"><h2>📱 Persönlicher Helferzugang</h2><div class="notice">Mit der bei der Anmeldung hinterlegten Telefonnummer öffnest du ausschließlich deinen eigenen Bereich.</div><form id="helperPhoneForm" class="form"><label class="full">Telefonnummer<input id="helperAccessPhone" inputmode="tel" autocomplete="tel"></label><button class="btn full">Eigenen Bereich öffnen</button></form><button class="btn light" onclick="closeHelperGate()">Helferbereich schließen</button></section>`}

  </section>`;
}

function accessPage(){return `<section class="panel"><h2>🔑 Helferzugang</h2><div class="notice">Zuerst das Helferpasswort, anschließend Bereich und hinterlegte Telefonnummer eingeben.</div><form id="accessForm" class="form"><label class="full">Helferpasswort<input id="accessPassword" type="password" autocomplete="current-password" placeholder="Passwort"></label><label>Bereich<select id="accessRole">${state.roles.filter(r=>r.id==="meldestelle"||r.id==="springer-kfz"||r.id.startsWith("station-")).map(r=>`<option value="${r.id}">${r.icon} ${esc(r.name)}</option>`).join("")}</select></label><label>Telefonnummer<input id="accessPhone" inputmode="tel" autocomplete="tel"></label><button class="btn full">Freischalten</button></form>${stationAccess()?`<div class="notice">Aktuell freigeschaltet: <strong>${esc(roleById(stationAccess())?.name||stationAccess())}</strong><br><button class="btn light" onclick="helperLogout()">Abmelden</button></div>`:""}</section>`}

function participantPage(){
  const p=currentParticipant();
  if(!p){
    return `<section class="panel"><h2>🏇 Teilnehmerbereich</h2><div class="notice">Anmeldung mit Startnummer und Teamname.</div><form id="participantLoginForm" class="form"><label>Startnummer<input id="pLoginStart"></label><label>Teamname<input id="pLoginTeam"></label><button class="btn full">Öffnen</button></form></section>`;
  }
  const rank=rankedParticipants().findIndex(x=>x.id===p.id)+1;
  const released=Boolean(p.gpxReleased||p.routeReleased);
  const participantRoute=p.routeType||p.route;const routeLabel=participantRoute==="7 km"?"7 km – Kleine Runde":participantRoute==="17 km"?"17 km – Große Runde":(participantRoute||"Noch nicht festgelegt");
  const routeUrl=p.routeGpxUrl||(participantRoute==="7 km"?"strecken/strecken_kleine_runde.gpx":participantRoute==="17 km"?"strecken/strecken_grosse_runde.gpx":"");
  return `<section class="panel"><div class="head"><div><h2>🏇 Teilnehmerbereich</h2><p class="sub">${esc(p.name)} · Team ${esc(p.horse||"-")}</p></div><button class="btn light" onclick="participantLogout()">Abmelden</button></div></section>
  <section class="panel"><h2>📋 Meine Daten</h2><div class="cards"><div class="info"><h3>Startnummer</h3><p>${esc(p.startNumber||"-")}</p></div><div class="info"><h3>Startzeit</h3><p>${esc(p.startTime||"-")}</p></div><div class="info"><h3>Strecke</h3><p>${esc(routeLabel)}</p></div><div class="info"><h3>Status</h3><p>${esc(p.status||"Gemeldet")}</p></div></div></section>
  <section class="panel"><h2>🧭 Meine GPX-Strecke</h2>${released&&routeUrl?routeCard(routeLabel,"",routeUrl):`<div class="notice"><strong>Die Strecke wurde noch nicht freigegeben.</strong><br>Bitte melde dich vor dem Start an der Meldestelle.</div>`}</section>
  <section class="panel"><h2>🏅 Mein Rang</h2><div class="notice">Aktueller Rang: <strong>${rank>0?rank:"-"}</strong>. Punktzahlen bleiben bis zur Siegerehrung verborgen.</div></section>`;
}

function isRouteReleased(p){return Boolean(p.routeReleased)}

function statusOptions(current){const normalized={"gemeldet":"Gemeldet","gestartet":"Gestartet","im Ziel":"Im Ziel"}[current]||current;return ["Gemeldet","Startvorbereitung","Startbereit","Gestartet","Im Ziel"].map(v=>`<option value="${v}" ${normalized===v?"selected":""}>${v}</option>`).join("")}" ${current===v?"selected":""}>${v}</option>`).join("")}
function routeOptions(current){return `<option value="">Bitte wählen</option><option value="7 km" ${current==="7 km"?"selected":""}>7 km – Kleine Runde</option><option value="17 km" ${current==="17 km"?"selected":""}>17 km – Große Runde</option>`}
function teamStatus(p){const raw=p.status||"Gemeldet";const status={"gemeldet":"Gemeldet","gestartet":"Gestartet","im Ziel":"Im Ziel"}[raw]||raw;const icon=status==="Startvorbereitung"?"🟡":status==="Startbereit"?"🟢":status==="Gestartet"?"🔵":status==="Im Ziel"?"🏁":"⚪";return `${icon} ${status}`} ${status}`}

function meldestellePage(){
  if(!canManageParticipants())return `<section class="panel"><h2>📋 Meldestelle</h2><div class="notice">Nur Admin oder eingetragene Helfer der Meldestelle.</div></section>`;
  const sorted=[...state.participants].sort((a,b)=>String(a.startTime||"99:99").localeCompare(String(b.startTime||"99:99")));
  return `<section class="panel"><div class="head"><div><h2>📋 Meldestelle</h2><p class="sub">Strecke festlegen, Startbereitschaft bestätigen und Teamstatus verfolgen.</p></div><button class="btn alt" onclick="exportParticipants()">CSV</button></div>${participantForm()}${sorted.map(p=>`<div class="entry"><div style="width:100%"><div class="head"><div><strong>${esc(p.startNumber||"-")} · ${esc(p.name)}</strong><br><small>Team: ${esc(p.horse||"-")} · ${teamStatus(p)}</small></div>${p.routeReleased?`<span class="badge info">GPX freigegeben</span>`:""}</div><div class="form"><label>Startnummer<input id="start-${p.id}" value="${esc(p.startNumber||"")}"></label><label>Teilnehmer<input id="name-${p.id}" value="${esc(p.name||"")}"></label><label>Teamname<input id="horse-${p.id}" value="${esc(p.horse||"")}"></label><label>Startzeit<input type="time" id="time-${p.id}" value="${esc(p.startTime||"")}"></label><label>Paddock<input id="paddock-${p.id}" value="${esc(p.paddock||"")}"></label><label>Strecke<select id="route-${p.id}">${routeOptions(p.route||"")}</select></label><label>Status<select id="status-${p.id}">${statusOptions(p.status||"Gemeldet")}</select></label><label class="full">Optionaler Kartenlink<input id="map-${p.id}" value="${esc(p.routeMapUrl||"")}"></label></div><button class="btn light" onclick="saveParticipantMeta('${p.id}')">Teilnehmer speichern</button><button class="btn alt" onclick="confirmStartReady('${p.id}')" ${!p.route?'disabled title="Zuerst Strecke wählen"':""}>🟢 Startbereitschaft bestätigen</button><button class="btn light" onclick="setParticipantStatus('${p.id}','Gestartet')">🔵 Gestartet</button><button class="btn light" onclick="setParticipantStatus('${p.id}','Im Ziel')">🏁 Im Ziel</button><button class="btn danger" onclick="deleteParticipant('${p.id}')">Löschen</button>${p.routeReleasedAt?`<p class="sub">Freigabe gespeichert.</p>`:""}</div></div>`).join("")}</section>`;
}

function participantForm(){return `<form id="participantForm" class="form"><label>Startnummer<input id="pStart"></label><label>Teilnehmer<input id="pName"></label><label>Teamname<input id="pHorse"></label><label>Startzeit<input id="pTime" type="time"></label><label>Paddock<input id="pPaddock"></label><label>Strecke<select id="pRoute">${routeOptions("")}</select></label><button class="btn full">Teilnehmer hinzufügen</button></form>`}

function stationPage(){
const id=stationAccess();
if(!id||!id.startsWith("station-"))return `<section class="panel"><h2>🐴 Stationsmodus</h2><div class="notice">Bitte zuerst im Helferbereich mit deiner Telefonnummer anmelden.</div></section>`;
const st=roleById(id);
return `<section class="panel"><div class="head"><div><h2>${st.icon} ${esc(st.name)}</h2><p class="sub">${esc(st.description||"")}</p></div><button class="btn light" onclick="closeHelperGate()">Abmelden</button></div>
<div class="cards"><div class="info"><h3>📍 Standort</h3><p>${esc(st.location||"-")}</p></div><div class="info"><h3>🕒 Einsatzzeit</h3><p>${esc(st.dutyTime||"-")}</p></div><div class="info"><h3>☎️ Meldestelle</h3><p>${esc(state.settings.registrationContact||"Kontakt folgt.")}</p></div></div>
<label>Teilnehmer suchen<input id="stationSearch" oninput="filterStationParticipants(this.value)" placeholder="Startnummer, Name oder Team"></label>
<div class="entries" id="stationParticipantList">${state.participants.map(p=>`<form class="entry score-form station-participant" data-search="${esc(`${p.startNumber||""} ${p.name||""} ${p.horse||""}`.toLowerCase())}" data-participant="${p.id}" data-station="${id}"><div><strong>${esc(p.startNumber||"-")} · ${esc(p.name)}</strong><br><small>Team: ${esc(p.horse||"-")} · ${teamStatus(p)}</small></div><div><input name="points" type="number" min="0" max="${st.maxPoints||999}" step="0.5" value="${scoreFor(p.id,id)?.points??""}" placeholder="Punkte"><button class="btn alt">Speichern</button></div></form>`).join("")}</div></section>${alertForm(id)}` }

function alertForm(stationId){return `<section class="panel"><h2>🚨 Status / Vorfall melden</h2><form id="alertForm" class="form"><input type="hidden" id="alertStation" value="${stationId}"><label class="full">Status<select id="alertPriority"><option value="ok">🟢 Alles in Ordnung</option><option value="help">🟠 Unterstützung benötigt</option><option value="emergency">🔴 Notfall</option></select></label><label class="full">Beschreibung bei 🟠 oder 🔴<textarea id="alertText" placeholder="Was ist passiert und was wird benötigt?"></textarea></label><button class="btn danger full">Meldung senden</button></form></section>`}

function alertsPage(){if(!(state.isAdmin||isMeldestelle()||isSpringer()))return `<section class="panel"><h2>🚙 Meldungen</h2><div class="notice">Nur Admin, Meldestelle oder Springer.</div></section>`;return `<section class="panel"><h2>🚨 Stationsmeldungen</h2>${state.alerts.length?state.alerts.map(a=>`<div class="alert ${esc(a.priority||"info")}"><span class="badge ${esc(a.priority||"info")}">${a.priority==="emergency"?"Notfall":a.priority==="help"?"Hilfe":"Info"}</span><h3>${esc(roleById(a.stationId)?.name||a.stationId)}</h3><p>${esc(a.text)}</p><small>Status: ${esc(a.status||"offen")} ${a.assignedTo?`· übernommen von ${esc(a.assignedTo)}`:""}</small><div><button class="btn light" onclick="updateAlert('${a.id}','übernommen')">Übernommen</button><button class="btn light" onclick="updateAlert('${a.id}','unterwegs')">Unterwegs</button><button class="btn alt" onclick="updateAlert('${a.id}','erledigt')">Erledigt</button></div></div>`).join(""):`<p class="sub">Keine Meldungen.</p>`}</section>`}

function resultsPage(){if(state.isAdmin||isMeldestelle()||stationAccess().startsWith("station-")){const rank=rankedParticipants();return `<section class="panel"><h2>🏆 Vollständige Ergebnisansicht</h2>${rank.map((p,i)=>`<div class="entry"><div><strong>${i+1}. ${esc(p.name)}</strong><br><small>Team: ${esc(p.horse||"-")}</small></div><strong>${totalFor(p.id)} Punkte</strong></div>`).join("")}</section>`}return `<section class="panel"><h2>🏅 Eigenen Rang suchen</h2><div class="notice">Punktzahlen und vollständige Rangliste bleiben bis zur Siegerehrung verborgen.</div><form id="rankForm" class="form"><label>Gruppenname<input id="rankName"></label><label>Pferdename<input id="rankHorse"></label><button class="btn full">Rang suchen</button></form><div id="rankResult"></div></section>`}



function adminHelperOverview(){
  const total=state.helpers.length;
  const full=state.roles.filter(r=>peopleFor(r.id).length>=Number(r.max||0)).length;
  const empty=state.roles.filter(r=>peopleFor(r.id).length===0).length;
  const partial=state.roles.length-full-empty;

  return `<section class="panel">
    <div class="head">
      <div>
        <h2>👥 Komplette Helferverteilung</h2>
        <p class="sub">Alle Helfer nach Bereichen gruppiert und direkt bearbeitbar.</p>
      </div>
    </div>

    <div class="stats">
      <div class="stat"><strong>${total}</strong><span>Helfer gesamt</span></div>
      <div class="stat"><strong>${full}</strong><span>voll besetzt</span></div>
      <div class="stat"><strong>${partial}</strong><span>teilweise besetzt</span></div>
      <div class="stat"><strong>${empty}</strong><span>unbesetzt</span></div>
    </div>

    ${state.roles.map(r=>{
      const assigned=peopleFor(r.id);
      const count=assigned.length;
      const free=Math.max(0,Number(r.max||0)-count);
      const signal=count===0?"🔴":free===0?"🟢":"🟡";

      return `<div class="panel" style="margin:14px 0;padding:16px">
        <div class="head">
          <div>
            <h3>${signal} ${r.icon} ${esc(r.name)}</h3>
            <p class="sub">${count} / ${r.max} eingetragen · ${free===0?"voll":free+" frei"}</p>
          </div>
        </div>

        ${assigned.length?assigned.map(h=>`
          <div class="entry">
            <div style="width:100%">
              <div class="form">
                <label>Name<input id="helper-name-${h.id}" value="${esc(h.name||"")}"></label>
                <label>Telefon<input id="helper-phone-${h.id}" value="${esc(h.phone||"")}"></label>
                <label>Zeitraum<input id="helper-time-${h.id}" value="${esc(h.time||"")}"></label>
                <label>Bereich
                  <select id="helper-role-${h.id}">
                    ${state.roles.map(role=>`<option value="${role.id}" ${role.id===h.role?"selected":""}>${role.icon} ${esc(role.name)}</option>`).join("")}
                  </select>
                </label>
                <label class="full">Bemerkung<textarea id="helper-note-${h.id}">${esc(h.note||"")}</textarea></label>
              </div>
              <button class="btn alt" onclick="saveHelper('${h.id}')">Speichern / Verschieben</button>
              <button class="btn danger" onclick="deleteHelper('${h.id}')">Löschen</button>
            </div>
          </div>`).join(""):`<p class="sub">Noch keine Helfer in diesem Bereich.</p>`}
      </div>`;
    }).join("")}
  </section>`;
}

function adminExtras(){
  return `<section class="panel">
    <h2>⚙️ Veranstaltung & Teilnehmerinfos</h2>
    <form id="eventInfoForm" class="form">
      <label>Streckenlänge<input id="routeLength" value="${esc(state.settings.routeLength||"17 km")}"></label>
      <label class="full">Allgemeine Informationen für Teilnehmer<textarea id="participantGeneralInfo">${esc(state.settings.participantGeneralInfo||"")}</textarea></label>
      <button class="btn full">Speichern</button>
    </form>
  </section>
  <section class="panel">
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

function adminPage(){if(!state.isAdmin)return `<section class="panel"><h2>🔒 Admin</h2><form id="adminForm" class="form"><label>Passwort<input id="adminPassword" type="password"></label><button class="btn full">Einloggen</button></form></section>`;return `<section class="panel"><div class="head"><h2>👑 Admin Dashboard</h2><button class="btn light" onclick="adminLogout()">Abmelden</button></div><div class="stats"><div class="stat"><strong>${state.participants.length}</strong><span>Teilnehmer</span></div><div class="stat"><strong>${state.helpers.length}</strong><span>Helfer</span></div><div class="stat"><strong>${state.alerts.filter(a=>a.status!=="erledigt").length}</strong><span>offene Meldungen</span></div><div class="stat"><strong>${scoringStations().length}</strong><span>Stationen</span></div></div><button class="btn" onclick="go('meldestelle')">Meldestelle</button><button class="btn" onclick="go('springer')">Meldungen</button><button class="btn" onclick="go('ergebnisse')">Ergebnisse</button></section>${adminHelperOverview()}${adminExtras()}`}

export function attachForms(render){
const hg=document.getElementById("helperGateForm");if(hg)hg.addEventListener("submit",helperGateLogin);
const hp=document.getElementById("helperPhoneForm");if(hp)hp.addEventListener("submit",helperPhoneLogin);
const a=document.getElementById("accessForm");if(a)a.addEventListener("submit",accessLogin);
const hs=document.getElementById("helperSignupForm");if(hs){hs.addEventListener("submit",submitHelperSignup);const pre=sessionStorage.getItem("rvn_preselect_helper_role");if(pre){const sel=document.getElementById("helperRole");if(sel)sel.value=pre;sessionStorage.removeItem("rvn_preselect_helper_role");}}
const p=document.getElementById("participantLoginForm");if(p)p.addEventListener("submit",participantLogin);
const pf=document.getElementById("participantForm");if(pf)pf.addEventListener("submit",addParticipant);
const af=document.getElementById("alertForm");if(af)af.addEventListener("submit",sendAlert);
const ei=document.getElementById("eventInfoForm");if(ei)ei.addEventListener("submit",saveEventInfo);
const dt=document.getElementById("documentsToggleForm");if(dt)dt.addEventListener("submit",saveDocumentsToggle);
const adm=document.getElementById("adminForm");if(adm)adm.addEventListener("submit",e=>{e.preventDefault();if(document.getElementById("adminPassword").value===state.settings.adminPassword){state.isAdmin=true;localStorage.setItem(ADMIN_KEY,"yes");render()}else toast("Falsches Passwort.")});
const rf=document.getElementById("rankForm");if(rf)rf.addEventListener("submit",rankSearch);
document.querySelectorAll(".score-form").forEach(f=>f.addEventListener("submit",saveScore));
}


async function saveEventInfo(e){e.preventDefault();if(!state.isAdmin)return toast("Keine Berechtigung.");await setDoc(doc(db,"settings","main"),{routeLength:document.getElementById("routeLength").value,participantGeneralInfo:document.getElementById("participantGeneralInfo").value},{merge:true});toast("Veranstaltungsinformationen gespeichert.");}

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


function helperGateLogin(e){e.preventDefault();if(document.getElementById("helperGatePassword").value!=="Helfer")return toast("Falsches Helferpasswort.");sessionStorage.setItem("rvn_helper_gate","yes");window.renderApp()}
function helperPhoneLogin(e){e.preventDefault();const phone=document.getElementById("helperAccessPhone").value;const helper=state.helpers.find(h=>cleanPhone(h.phone)===cleanPhone(phone));if(!helper)return toast("Keine passende Helferanmeldung gefunden.");localStorage.setItem("rvn_helper_phone",phone);localStorage.setItem("rvn_station_access",helper.role||"");window.renderApp()}
window.closeHelperGate=()=>{sessionStorage.removeItem("rvn_helper_gate");localStorage.removeItem("rvn_helper_phone");localStorage.removeItem("rvn_station_access");window.renderApp()};

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

window.saveHelper=async id=>{
  if(!state.isAdmin) return toast("Keine Berechtigung.");

  const targetRole=document.getElementById("helper-role-"+id).value;
  const target=roleById(targetRole);
  const count=peopleFor(targetRole).filter(h=>h.id!==id).length;

  if(target && count>=Number(target.max||0)){
    return toast("Der Zielbereich ist bereits voll.");
  }

  await setDoc(doc(db,"helpers",id),{
    name:document.getElementById("helper-name-"+id).value,
    phone:document.getElementById("helper-phone-"+id).value,
    time:document.getElementById("helper-time-"+id).value,
    role:targetRole,
    note:document.getElementById("helper-note-"+id).value,
    updatedAt:serverTimestamp()
  },{merge:true});

  toast("Helfer gespeichert.");
};

window.deleteHelper=async id=>{
  if(!state.isAdmin) return toast("Keine Berechtigung.");
  if(confirm("Helfer wirklich löschen?")){
    await deleteDoc(doc(db,"helpers",id));
    toast("Helfer gelöscht.");
  }
};

async function accessLogin(e){e.preventDefault();const password=document.getElementById("accessPassword").value,role=document.getElementById("accessRole").value,phone=document.getElementById("accessPhone").value;if(password!=="Helfer")return toast("Falsches Helferpasswort.");if(!helperCanAccess(role,phone))return toast("Keine passende Helferanmeldung gefunden.");localStorage.setItem("rvn_station_access",role);toast("Zugang freigeschaltet.");window.go(role==="meldestelle"?"meldestelle":role==="springer-kfz"?"springer":"station")}
function participantLogin(e){e.preventDefault();const s=String(document.getElementById("pLoginStart").value).trim(),t=String(document.getElementById("pLoginTeam").value).trim().toLowerCase();const p=state.participants.find(x=>String(x.startNumber||"").trim()===s&&String(x.horse||"").trim().toLowerCase()===t);if(!p)return toast("Nicht gefunden.");localStorage.setItem("rvn_participant_id",p.id);window.renderApp()}
async function addParticipant(e){e.preventDefault();const route=document.getElementById("pRoute").value;await addDoc(collection(db,"participants"),{startNumber:document.getElementById("pStart").value.trim(),name:document.getElementById("pName").value.trim(),horse:document.getElementById("pHorse").value.trim(),startTime:document.getElementById("pTime").value,paddock:document.getElementById("pPaddock").value.trim(),route,routeType:route,status:"Gemeldet",routeReleased:false,gpxReleased:false,qrReleased:false,createdAt:serverTimestamp()});e.target.reset();toast("Teilnehmer hinzugefügt.")}
async function saveScore(e){e.preventDefault();const p=e.currentTarget.dataset.participant,st=e.currentTarget.dataset.station;if(!canEditStation(st))return toast("Keine Berechtigung.");await setDoc(doc(db,"scores",scoreKey(p,st)),{participantId:p,stationId:st,points:Number(e.currentTarget.points.value||0),updatedAt:serverTimestamp()},{merge:true});toast("Punkte gespeichert.")}
async function sendAlert(e){e.preventDefault();const priority=document.getElementById("alertPriority").value;const text=document.getElementById("alertText").value.trim();if((priority==="help"||priority==="emergency")&&!text)return toast("Bei Unterstützung oder Notfall ist eine Beschreibung erforderlich.");await addDoc(collection(db,"alerts"),{stationId:document.getElementById("alertStation").value,priority,text:text||(priority==="ok"?"Alles in Ordnung":""),status:"offen",createdAt:serverTimestamp()});e.target.reset();toast("Meldung gesendet.")});e.target.reset();toast("Meldung gesendet.")}
function rankSearch(e){e.preventDefault();const n=String(document.getElementById("rankName").value).toLowerCase().trim(),h=String(document.getElementById("rankHorse").value).toLowerCase().trim(),rank=rankedParticipants(),p=rank.find(x=>(!n||String(x.name||"").toLowerCase().includes(n))&&(!h||String(x.horse||"").toLowerCase().includes(h))),r=document.getElementById("rankResult");r.innerHTML=p?`<div class="notice"><strong>${esc(p.name)}</strong>: aktueller Rang <strong>${rank.findIndex(x=>x.id===p.id)+1}</strong>.</div>`:`<div class="notice">Nicht gefunden.</div>`}

window.saveParticipantMeta=async id=>{if(!canManageParticipants())return toast("Keine Berechtigung.");const route=document.getElementById("route-"+id).value;await setDoc(doc(db,"participants",id),{startNumber:document.getElementById("start-"+id).value,name:document.getElementById("name-"+id).value,horse:document.getElementById("horse-"+id).value,startTime:document.getElementById("time-"+id).value,paddock:document.getElementById("paddock-"+id).value,route,routeType:route,status:document.getElementById("status-"+id).value,routeMapUrl:document.getElementById("map-"+id).value,updatedAt:serverTimestamp()},{merge:true});toast("Gespeichert.")}
window.confirmStartReady=async id=>{if(!canManageParticipants())return toast("Keine Berechtigung.");const select=document.getElementById("route-"+id);const existing=state.participants.find(p=>p.id===id);const route=select?select.value:existing?.route;if(!route)return toast("Bitte zuerst 7 km oder 17 km auswählen.");const routeGpxUrl=route==="7 km"?"strecken/strecken_kleine_runde.gpx":"strecken/strecken_grosse_runde.gpx";await setDoc(doc(db,"participants",id),{route,routeType:route,routeGpxUrl,routeReleased:true,gpxReleased:true,qrReleased:true,routeReleasedAt:serverTimestamp(),releasedAt:serverTimestamp(),status:"Startbereit",updatedAt:serverTimestamp()},{merge:true});toast("Startbereitschaft bestätigt – GPX wurde freigegeben.")}
window.setParticipantStatus=async(id,status)=>{if(!canManageParticipants())return toast("Keine Berechtigung.");await setDoc(doc(db,"participants",id),{status,updatedAt:serverTimestamp()},{merge:true});toast("Status aktualisiert.")}
window.deleteParticipant=async id=>{if(canManageParticipants()&&confirm("Teilnehmer löschen?"))await deleteDoc(doc(db,"participants",id))}
window.updateAlert=async(id,status)=>{if(!(state.isAdmin||isMeldestelle()||isSpringer()))return toast("Keine Berechtigung.");await setDoc(doc(db,"alerts",id),{status,assignedTo:roleById(stationAccess())?.name||"Admin",updatedAt:serverTimestamp()},{merge:true});toast("Meldung aktualisiert.")}
window.helperLogout=()=>{localStorage.removeItem("rvn_station_access");window.renderApp()}
window.participantLogout=()=>{localStorage.removeItem("rvn_participant_id");window.renderApp()}
window.adminLogout=()=>{state.isAdmin=false;localStorage.removeItem(ADMIN_KEY);window.renderApp()}
window.exportParticipants=()=>{const rows=[["Startnr","Name","Team","Startzeit","Paddock","Strecke","Status","GPX freigegeben"]];state.participants.forEach(p=>rows.push([p.startNumber||"",p.name||"",p.horse||"",p.startTime||"",p.paddock||"",p.route||"",p.status||"",p.routeReleased?"ja":"nein"]));downloadCSV(rows,"RVN_Teilnehmer.csv")}

window.filterStationParticipants=q=>{const value=String(q||"").toLowerCase().trim();document.querySelectorAll(".station-participant").forEach(el=>el.style.display=!value||String(el.dataset.search||"").includes(value)?"":"none")};
