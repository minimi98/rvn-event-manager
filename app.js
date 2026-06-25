import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore, collection, addDoc, deleteDoc, doc,
  serverTimestamp, onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const EVENT_DATE = new Date("2026-07-25T09:00:00");
const ADMIN_PASSWORD = "beach2026";

const roles = [
  ...Array.from({length:9}, (_,i)=>({ id:`station-${i+1}`, name:`Station ${i+1}`, icon:"🐴", max:5 })),
  { id:"haengerplatz", name:"Hängerplatz", icon:"🚗", max:4 },
  { id:"grillen", name:"Grillteam", icon:"🔥", max:6 },
  { id:"meldestelle", name:"Meldestelle", icon:"📋", max:4 },
  { id:"aufbau", name:"Aufbauteam", icon:"🔧", max:6 },
  { id:"abbau", name:"Abbauteam", icon:"🔨", max:6 },
  { id:"springer-kfz", name:"Springer mit KFZ", icon:"🚙", max:4 }
];

let helpers = [];
let db = null;
let page = "home";

const appEl = document.getElementById("app");

function logo(){ return document.getElementById("rvnLogo").innerHTML; }
function escapeHtml(str){ return String(str || "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m])); }
function roleById(id){ return roles.find(r => r.id === id); }
function peopleFor(roleId){ return helpers.filter(h => h.role === roleId); }
function totalSlots(){ return roles.reduce((sum,r)=>sum+r.max,0); }
function missingSlots(){ return Math.max(0, totalSlots() - helpers.length); }

function shell(content){
  return `
    <div class="app-shell">
      <header class="topbar">
        <div class="brand">
          <button class="menu-btn" onclick="go('home')">☰</button>
          <div><h1>RVN Event Manager</h1><p>O-Ritt & Turnier</p></div>
        </div>
        ${logo()}
      </header>
      <main class="main">${content}</main>
      <nav class="bottom-nav">
        ${navItem("home","🏠","Home")}
        ${navItem("oritt","🐴","O-Ritt")}
        ${navItem("turnier","🏇","Turnier")}
        ${navItem("helfer","👥","Helfer")}
        ${navItem("admin","👑","Admin")}
      </nav>
    </div>
  `;
}
function navItem(id, icon, label){ return `<button class="nav-item ${page===id?"active":""}" onclick="go('${id}')"><span>${icon}</span>${label}</button>`; }

window.go = function(id){ page = id; render(); window.scrollTo({top:0, behavior:"smooth"}); };

function countdownHtml(){
  const diff = Math.max(0, EVENT_DATE - new Date());
  const d = Math.floor(diff / (1000*60*60*24));
  const h = Math.floor(diff / (1000*60*60)) % 24;
  const m = Math.floor(diff / (1000*60)) % 60;
  const s = Math.floor(diff / 1000) % 60;
  return `<div class="countdown">
    <div class="countbox"><strong>${d}</strong><span>Tage</span></div>
    <div class="countbox"><strong>${h}</strong><span>Std</span></div>
    <div class="countbox"><strong>${m}</strong><span>Min</span></div>
    <div class="countbox"><strong>${s}</strong><span>Sek</span></div>
  </div>`;
}

function homePage(){
  return `
    <section class="hero">
      <div class="hero-title">
        <div class="kicker">Reit- und Fahrverein Neuendettelsau e.V.</div>
        <h2>RVN Event<br>Manager</h2>
        <p>O-Ritt & Turnier – alles an einem Ort</p>
      </div>
    </section>
    <section class="grid-actions two-actions">
      <article class="action-card"><div class="icon">🐴</div><h3>O-Ritt 2026</h3><p>Beach Please – wir reiten! Helfer, Infos, PDF-Hinweise und Adminbereich.</p><button class="arrow" onclick="go('oritt')">›</button></article>
      <article class="action-card"><div class="icon">🏇</div><h3>Turnier</h3><p>Bereich ist vorbereitet. Funktionen können später ergänzt werden.</p><button class="arrow" onclick="go('turnier')">›</button></article>
    </section>`;
}

function orittPage(){
  const filled = helpers.length, total = totalSlots();
  return `
    <section class="hero">
      <div class="hero-title">
        <div class="kicker">Orientierungsritt 2026</div>
        <h2>Beach Please<br>wir reiten!</h2>
        <p>Sommer, Sonne, Sattel</p>
        <div class="date-chip">📅 25. Juli 2026</div>
        ${countdownHtml()}
      </div>
    </section>
    <section class="grid-actions">
      <article class="action-card"><div class="icon">📄</div><h3>PDF-Anmeldung</h3><p>Teilnehmeranmeldung läuft 2026 über die offiziellen PDF-Unterlagen.</p><button class="arrow" onclick="go('pdf')">›</button></article>
      <article class="action-card"><div class="icon">👥</div><h3>Als Helfer eintragen</h3><p>Werde Teil unseres Teams und unterstütze uns beim O-Ritt.</p><button class="arrow" onclick="go('helfer')">›</button></article>
      <article class="action-card"><div class="icon">📍</div><h3>Infos zum O-Ritt</h3><p>Strecken, Parken, Siegerehrung und Kostümwertung.</p><button class="arrow" onclick="go('infos')">›</button></article>
      <article class="action-card"><div class="icon">👑</div><h3>Admin</h3><p>Helferübersicht, CSV-Export und Leitstellenansicht.</p><button class="arrow" onclick="go('admin')">›</button></article>
    </section>
    <section class="panel">
      <div class="panel-head">
        <div><h2>👥 Helferübersicht</h2><p class="sub">Live-Stand – <span class="accent">${filled} von ${total}</span> Helferplätzen belegt</p></div>
        <button class="btn" onclick="go('helfer')">Zur Detailansicht ›</button>
      </div>
      ${helperOverview(false)}
    </section>`;
}

function turnierPage(){
  return `
    <section class="panel">
      <h2>🏇 Turnier</h2>
      <div class="notice">Der Turnierbereich ist vorbereitet. Hier können später Helferlisten, Zeiteinteilung, Meldestelle, Parcoursdienst, Aufbau/Abbau und Ergebnislisten ergänzt werden.</div>
      <div class="cards">
        <div class="info-card"><h3>👥 Helfer</h3><p>Vorbereitet für spätere Turnier-Helferplanung.</p></div>
        <div class="info-card"><h3>📋 Meldestelle</h3><p>Platzhalter für Turnierorganisation.</p></div>
        <div class="info-card"><h3>🏆 Ergebnisse</h3><p>Kann später ergänzt werden.</p></div>
      </div>
    </section>`;
}

function helperOverview(detailed=true){
  return `<div class="helper-list">${roles.map(r=>{
    const count=peopleFor(r.id).length, free=Math.max(0,r.max-count);
    const cls=free===0?"full":free<=1?"low":"free";
    return `<div class="helper-row">
      <div class="row-icon">${r.icon}</div>
      <div><strong>${r.name}</strong>${detailed?`<div class="sub">${count} / ${r.max} eingetragen</div>`:""}</div>
      <div class="bar"><div style="width:${Math.min(100,count/r.max*100)}%"></div></div>
      <div>${count} / ${r.max}</div>
      <div class="status ${cls}">${free===0?"Voll":free+" frei"}</div>
      <button class="menu-btn" onclick="openRole('${r.id}')">›</button>
    </div>`;}).join("")}</div>`;
}

window.openRole=function(roleId){ page="role:"+roleId; render(); window.scrollTo({top:0, behavior:"smooth"}); };

function helperPage(){
  return `<section class="panel">
    <div class="panel-head">
      <div><h2>👥 O-Ritt Helfer eintragen</h2><p class="sub">Wähle einen Bereich und trage dich ein. Die Liste aktualisiert sich live.</p></div>
      <button class="btn secondary" onclick="shareWhatsApp()">📲 WhatsApp teilen</button>
    </div>${helperForm()}</section>
    <section class="panel"><div class="panel-head"><h2>Helferübersicht</h2></div>${helperOverview(true)}</section>`;
}

function helperForm(prefRole="station-1"){
  return `<form id="helperForm" class="form-grid">
    <label>Name<input id="name" required placeholder="Dein Name"></label>
    <label>Telefon<input id="phone" required placeholder="Telefonnummer"></label>
    <label>Bereich<select id="role">${roles.map(r=>`<option value="${r.id}" ${prefRole===r.id?"selected":""}>${r.icon} ${r.name}</option>`).join("")}</select></label>
    <label>Zeitraum<select id="time"><option>ganztags</option><option>vormittags</option><option>nachmittags</option><option>abends</option><option>nach Absprache</option></select></label>
    <label class="fullspan">Bemerkung<textarea id="note" placeholder="z. B. mit Auto, ab 15 Uhr, kann auch Station wechseln"></textarea></label>
    <button class="btn fullspan" type="submit">Eintragen</button>
  </form>`;
}

function rolePage(roleId){
  const r=roleById(roleId), people=peopleFor(roleId), free=Math.max(0,r.max-people.length);
  return `<section class="panel">
    <button class="btn light" onclick="go('helfer')">‹ Zurück</button>
    <div class="panel-head" style="margin-top:14px"><div><h2>${r.icon} ${r.name}</h2><p class="sub"><span class="accent">${people.length} / ${r.max}</span> Helfer eingetragen · ${free===0?"voll":free+" frei"}</p></div></div>
    <div class="bar" style="margin:16px 0"><div style="width:${Math.min(100,people.length/r.max*100)}%"></div></div>
    <h3>Eingetragene Helfer</h3><div class="entries">${people.length?people.map(h=>entryHtml(h)).join(""):`<p class="sub">Noch niemand eingetragen.</p>`}</div>
    <h3>Noch freie Plätze</h3><div class="cards">${Array.from({length:free},()=>`<div class="info-card"><h3>➕ Platz frei</h3><p>Hier wird noch Hilfe gesucht.</p></div>`).join("")||`<div class="info-card"><h3>✅ Voll</h3><p>Dieser Bereich ist besetzt.</p></div>`}</div>
  </section>
  <section class="panel"><h2>Ich möchte hier helfen</h2>${free>0?helperForm(roleId):`<p>Dieser Bereich ist bereits voll. Bitte wähle einen anderen Bereich.</p>`}</section>`;
}

function entryHtml(h){
  return `<div class="entry"><div><strong>${escapeHtml(h.name)}</strong><br><small>${escapeHtml(h.time||"")} · ${escapeHtml(h.note||"Keine Bemerkung")}</small></div><button class="btn danger" onclick="deleteHelper('${h.id}')">Löschen</button></div>`;
}

function infoPage(){
  return `<section class="panel"><h2>ℹ️ Infos zum O-Ritt</h2><div class="cards">
    <div class="info-card"><h3>📅 Datum</h3><p>Samstag, 25.07.2026</p></div>
    <div class="info-card"><h3>🏖️ Motto</h3><p>Beach Please – wir reiten! Sommer, Sonne, Sattel.</p></div>
    <div class="info-card"><h3>🗺️ Strecken</h3><p>Kleine Runde ca. 7 km, große Runde ca. 17 km.</p></div>
    <div class="info-card"><h3>🏆 Siegerehrung</h3><p>Die Siegerehrung findet im Reitverein Neuendettelsau statt.</p></div>
    <div class="info-card"><h3>🎭 Kostümwertung</h3><p>Das Reiterpaar mit dem ausgefallensten Kostüm bekommt einen Sonderpreis.</p></div>
    <div class="info-card"><h3>🚴 Begleiter</h3><p>Begleiter dürfen mit dem Rad mitfahren. Das Rad sollte geländetauglich sein; Grundkondition erforderlich.</p></div>
    <div class="info-card"><h3>⛑️ Teilnahme</h3><p>Helmpflicht, Teilnahme auf eigene Gefahr, Minderjährige nur in Begleitung eines Erwachsenen.</p></div>
    <div class="info-card"><h3>⏰ Anmeldefrist</h3><p>10.07.2026</p></div>
  </div></section>`;
}

function pdfPage(){
  return `<section class="panel"><h2>📄 PDF-Anmeldung 2026</h2>
    <div class="notice">Die Teilnehmeranmeldung für den O-Ritt 2026 läuft weiterhin über die offiziellen PDF-Unterlagen. Eine Online-Teilnehmeranmeldung kann für 2027 ergänzt werden.</div>
    <div class="cards">
      <div class="info-card"><h3>📝 Anmeldung</h3><p>PDF-Anmeldeformular ausfüllen und wie gewohnt einreichen.</p></div>
      <div class="info-card"><h3>✅ Teilnahmebedingungen</h3><p>Haftung, Versicherung, Helmpflicht und Minderjährige werden über die Anmeldung bestätigt.</p></div>
      <div class="info-card"><h3>📬 Rückgabe</h3><p>Bitte die in der Ausschreibung genannte Rückgabe- oder Kontaktmöglichkeit nutzen.</p></div>
    </div></section>`;
}

function adminPage(){
  const filled=helpers.length,total=totalSlots(),full=roles.filter(r=>peopleFor(r.id).length>=r.max).length;
  return `<section class="panel"><h2>👑 Admin Dashboard</h2>
    <div class="admin-grid"><div class="stat"><strong>${filled}</strong><span>Helfer</span></div><div class="stat"><strong>${total}</strong><span>Plätze</span></div><div class="stat"><strong>${missingSlots()}</strong><span>frei</span></div><div class="stat"><strong>${full}</strong><span>Bereiche voll</span></div></div>
    <label>Admin-Passwort<input id="adminPassword" type="password" placeholder="Passwort"></label>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px"><button class="btn" onclick="exportCSV()">Helferliste CSV exportieren</button><button class="btn secondary" onclick="shareWhatsApp()">WhatsApp-Link teilen</button><button class="btn light" onclick="print()">Druckliste öffnen</button></div>
    <div class="notice">Zum Löschen einzelner Helfer bitte das Admin-Passwort eingeben. Standard ist <strong>beach2026</strong>.</div>
    ${helperOverview(true)}
  </section>`;
}

function render(){
  let content="";
  if(page==="home") content=homePage();
  else if(page==="oritt") content=orittPage();
  else if(page==="turnier") content=turnierPage();
  else if(page==="helfer") content=helperPage();
  else if(page==="infos") content=infoPage();
  else if(page==="pdf") content=pdfPage();
  else if(page==="admin") content=adminPage();
  else if(page.startsWith("role:")) content=rolePage(page.split(":")[1]);
  appEl.innerHTML=shell(content);
  attachFormHandler();
}

function attachFormHandler(){
  const form=document.getElementById("helperForm");
  if(!form) return;
  form.addEventListener("submit", async e=>{
    e.preventDefault();
    const role=document.getElementById("role").value;
    const r=roleById(role), count=peopleFor(role).length;
    if(count>=r.max){ toast("Dieser Bereich ist bereits voll."); return; }
    const payload={name:document.getElementById("name").value.trim(), phone:document.getElementById("phone").value.trim(), role, time:document.getElementById("time").value, note:document.getElementById("note").value.trim(), createdAt:serverTimestamp()};
    if(!payload.name || !payload.phone){ toast("Bitte Name und Telefon eintragen."); return; }
    await addDoc(collection(db,"helpers"), payload);
    toast("Danke! Du bist eingetragen.");
    form.reset();
  });
}

window.deleteHelper=async function(id){
  const pw=document.getElementById("adminPassword")?.value||"";
  if(pw!==ADMIN_PASSWORD){ toast("Bitte Admin-Passwort eingeben."); return; }
  if(confirm("Eintrag wirklich löschen?")) await deleteDoc(doc(db,"helpers",id));
};

window.exportCSV=function(){
  const rows=[["Bereich","Name","Telefon","Zeitraum","Bemerkung"]];
  helpers.forEach(h=>rows.push([roleById(h.role)?.name||h.role,h.name,h.phone,h.time||"",h.note||""]));
  const csv=rows.map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(";")).join("\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob); const a=document.createElement("a");
  a.href=url; a.download="RVN_Oritt_Helferliste_2026.csv"; a.click(); URL.revokeObjectURL(url);
};

window.shareWhatsApp=async function(){
  const text="🐴 RVN Event Manager – Helferanmeldung O-Ritt 2026: Trag dich hier ein:";
  if(navigator.share) await navigator.share({title:"RVN Event Manager", text, url:location.href});
  else window.open(`https://wa.me/?text=${encodeURIComponent(text+" "+location.href)}`,"_blank");
};

window.toast=function(msg){
  const el=document.createElement("div"); el.className="toast"; el.textContent=msg; document.body.appendChild(el); setTimeout(()=>el.remove(),2600);
};

function init(){
  try{
    const app=initializeApp(firebaseConfig); db=getFirestore(app);
    const q=query(collection(db,"helpers"), orderBy("createdAt","asc"));
    onSnapshot(q, snap=>{ helpers=snap.docs.map(d=>({id:d.id,...d.data()})); render(); }, err=>{ console.error(err); render(); toast("Firebase-Regeln oder Config prüfen."); });
  }catch(err){ console.error(err); render(); toast("Firebase-Konfiguration fehlt noch."); }
  setInterval(()=>{ if(page==="oritt") render(); }, 1000);
}
init();
