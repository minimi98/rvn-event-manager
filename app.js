import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, setDoc, getDoc, serverTimestamp, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const EVENT_DATE = new Date("2026-07-25T09:00:00");
const ADMIN_KEY = "rvn_admin_logged_in";

const defaultSettings = {
  adminPassword: "RVN2026!",
  whatsappText: "🐴 RVN Event Manager – Helferanmeldung O-Ritt 2026: Trag dich hier ein:",
  eventTitle: "Beach Please – wir reiten!",
  eventSubtitle: "Sommer, Sonne, Sattel"
};

const defaultRoles = [
  ...Array.from({ length: 9 }, (_, i) => ({ id: `station-${i + 1}`, name: `Station ${i + 1}`, icon: "🐴", max: 5, order: i + 1, description: "" })),
  { id: "haengerplatz", name: "Hängerplatz", icon: "🚗", max: 4, order: 10, description: "Einweisung und Ordnung am Hängerparkplatz." },
  { id: "grillen", name: "Grillteam", icon: "🔥", max: 6, order: 14, description: "Unterstützung beim Grillen und Abspülen am Abend." },
  { id: "meldestelle", name: "Meldestelle", icon: "📋", max: 4, order: 0, description: "Anmeldung, Startunterlagen und Rückfragen." },
  { id: "aufbau", name: "Aufbauteam", icon: "🔧", max: 6, order: -2, description: "Aufbau vor der Veranstaltung." },
  { id: "abbau", name: "Abbauteam", icon: "🔨", max: 6, order: 15, description: "Abbau nach der Veranstaltung." },
  { id: "springer-kfz", name: "Springer mit KFZ", icon: "🚙", max: 4, order: 11, description: "Kontrolle der Stationen mit Fahrzeug." }
];

let helpers = [];
let news = [];
let settings = { ...defaultSettings };
let roles = sortRoles(defaultRoles);
let participants = [];
let scores = [];
let db = null;
let page = "home";
let isAdmin = localStorage.getItem(ADMIN_KEY) === "yes";
const appEl = document.getElementById("app");

const esc = (s) => String(s || "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
const slug = (s) => String(s).toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now().toString().slice(-5);
const roleById = (id) => roles.find(r => r.id === id);
const peopleFor = (id) => helpers.filter(h => h.role === id);
const totalSlots = () => roles.reduce((a, r) => a + Number(r.max || 0), 0);
const missing = () => Math.max(0, totalSlots() - helpers.length);
const scoringStations = () => roles.filter(r => r.id.startsWith("station-"));
const scoreKey = (participantId, stationId) => participantId + "__" + stationId;
const stationNumber = (id) => { const m = String(id || "").match(/station-(\d+)/); return m ? Number(m[1]) : 999; };
const roleOrder = (r) => Number.isFinite(Number(r.order)) ? Number(r.order) : stationNumber(r.id);
const sortRoles = (arr) => [...arr].sort((a, b) => roleOrder(a) - roleOrder(b) || String(a.name || "").localeCompare(String(b.name || "")));
const scoreFor = (participantId, stationId) => scores.find(s => s.participantId === participantId && s.stationId === stationId);
const totalFor = (participantId) => scoringStations().reduce((sum, st) => sum + Number(scoreFor(participantId, st.id)?.points || 0), 0);
const rankedParticipants = () => [...participants].sort((a, b) => totalFor(b.id) - totalFor(a.id) || String(a.startNumber || "").localeCompare(String(b.startNumber || "")));

function shell(content) {
  return `<div class="shell">
    <header class="topbar">
      <div class="brand"><button class="menu" onclick="go('home')">☰</button><div><h1>RVN Event Manager</h1><p>O-Ritt & Turnier</p></div></div>
      <img class="logo" src="rvn-logo-original.jpg" alt="RVN Logo">
    </header>
    <main class="main">${content}</main>
    <nav class="bottom">
      ${nav("home", "🏠", "Home")}${nav("oritt", "🐴", "O-Ritt")}${nav("turnier", "🏇", "Turnier")}${nav("helfer", "👥", "Helfer")}${nav("admin", "👑", "Admin")}
    </nav>
  </div>`;
}

function nav(id, icon, label) {
  return `<button class="nav ${page === id ? "active" : ""}" onclick="go('${id}')"><span>${icon}</span>${label}</button>`;
}

window.go = (id) => { page = id; render(); scrollTo({ top: 0, behavior: "smooth" }); };

function countdown() {
  const diff = Math.max(0, EVENT_DATE - new Date());
  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff / 3600000) % 24;
  const m = Math.floor(diff / 60000) % 60;
  const s = Math.floor(diff / 1000) % 60;
  return `<div class="countdown"><div class="countbox"><strong>${d}</strong><span>Tage</span></div><div class="countbox"><strong>${h}</strong><span>Std</span></div><div class="countbox"><strong>${m}</strong><span>Min</span></div><div class="countbox"><strong>${s}</strong><span>Sek</span></div></div>`;
}

function homePage() {
  return `<section class="hero"><div><div class="kicker">Reit- und Fahrverein Neuendettelsau e.V.</div><h2>RVN Event<br>Manager</h2><p>O-Ritt & Turnier – alles an einem Ort</p></div></section>
  <section class="grid two"><article class="card"><div class="icon">🐴</div><h3>O-Ritt 2026</h3><p>${esc(settings.eventTitle)} – Helfer, Infos, Ergebnisse und Adminbereich.</p><button class="arrow" onclick="go('oritt')">›</button></article><article class="card"><div class="icon">🏇</div><h3>Turnier</h3><p>Bereich ist vorbereitet. Helfer und Turnierfunktionen können später ergänzt werden.</p><button class="arrow" onclick="go('turnier')">›</button></article></section>`;
}

function orittPage() {
  return `<section class="hero"><div><div class="kicker">Orientierungsritt 2026</div><h2>${esc(settings.eventTitle)}</h2><p>${esc(settings.eventSubtitle)}</p><div class="chip">📅 25. Juli 2026</div>${countdown()}</div></section>
  <section class="grid"><article class="card"><div class="icon">📄</div><h3>PDF-Anmeldung</h3><p>Teilnehmeranmeldung läuft 2026 über PDF-Unterlagen.</p><button class="arrow" onclick="go('pdf')">›</button></article><article class="card"><div class="icon">👥</div><h3>Als Helfer eintragen</h3><p>Trag dich live in einen freien Bereich ein.</p><button class="arrow" onclick="go('helfer')">›</button></article><article class="card"><div class="icon">🏆</div><h3>Ergebnisse</h3><p>Punkte pro Station eintragen und Rangliste anzeigen.</p><button class="arrow" onclick="go('ergebnisse')">›</button></article><article class="card"><div class="icon">📢</div><h3>Aktuelles</h3><p>Kurze Hinweise für alle.</p><button class="arrow" onclick="go('news')">›</button></article></section>
  <section class="panel"><div class="head"><div><h2>👥 Helferübersicht</h2><p class="sub">Live-Stand – <span class="accent">${helpers.length} von ${totalSlots()}</span> Helferplätzen belegt</p></div><button class="btn" onclick="go('helfer')">Zur Detailansicht ›</button></div>${helperOverview(false)}</section>`;
}

function turnierPage() {
  return `<section class="panel"><h2>🏇 Turnier</h2><div class="notice">Der Turnierbereich ist vorbereitet. Hier können später Helfer, Zeiteinteilung, Meldestelle und Ergebnisse ergänzt werden.</div><div class="cards"><div class="info"><h3>👥 Helfer</h3><p>Vorbereitet für Turnier-Helferplanung.</p></div><div class="info"><h3>📋 Meldestelle</h3><p>Platzhalter für Turnierorganisation.</p></div><div class="info"><h3>🏆 Ergebnisse</h3><p>Kann später ergänzt werden.</p></div></div></section>`;
}

function helperOverview(detailed = true) {
  return `<div class="list">${roles.map(r => {
    const c = peopleFor(r.id).length;
    const f = Math.max(0, Number(r.max) - c);
    const cls = f === 0 ? "full" : f <= 1 ? "low" : "free";
    return `<div class="row"><div class="r-icon">${r.icon}</div><div><strong>${esc(r.name)}</strong>${detailed ? `<div class="sub">${c} / ${r.max} eingetragen</div>${r.description ? `<div class="sub">${esc(r.description)}</div>` : ""}` : ""}</div><div class="bar"><div style="width:${Math.min(100, c / Number(r.max) * 100)}%"></div></div><div>${c} / ${r.max}</div><div class="status ${cls}">${f === 0 ? "Voll" : f + " frei"}</div><button class="menu" onclick="openRole('${r.id}')">›</button></div>`;
  }).join("")}</div>`;
}

window.openRole = (id) => { page = "role:" + id; render(); scrollTo({ top: 0, behavior: "smooth" }); };

function helperPage() {
  return `<section class="panel"><div class="head"><div><h2>👥 O-Ritt Helfer eintragen</h2><p class="sub">Die Liste aktualisiert sich live.</p></div><button class="btn alt" onclick="shareWhatsApp()">📲 WhatsApp teilen</button></div>${helperForm()}</section><section class="panel"><h2>Helferübersicht</h2>${helperOverview(true)}</section>`;
}

function helperForm(pref = roles[0]?.id || "") {
  return `<form id="helperForm" class="form"><label>Name<input id="name" required placeholder="Dein Name"></label><label>Telefon<input id="phone" required placeholder="Telefonnummer"></label><label>Bereich<select id="role">${roles.map(r => `<option value="${r.id}" ${pref === r.id ? "selected" : ""}>${r.icon} ${esc(r.name)}</option>`).join("")}</select></label><label>Zeitraum<select id="time"><option>ganztags</option><option>vormittags</option><option>nachmittags</option><option>abends</option><option>nach Absprache</option></select></label><label class="full">Bemerkung<textarea id="note" placeholder="z. B. mit Auto, ab 15 Uhr"></textarea></label><button class="btn full" type="submit">Eintragen</button></form>`;
}

function rolePage(id) {
  const r = roleById(id);
  if (!r) return `<section class="panel"><h2>Bereich nicht gefunden</h2></section>`;
  const p = peopleFor(id);
  const f = Math.max(0, Number(r.max) - p.length);
  return `<section class="panel"><button class="btn light" onclick="go('helfer')">‹ Zurück</button><div class="head" style="margin-top:14px"><div><h2>${r.icon} ${esc(r.name)}</h2><p class="sub"><span class="accent">${p.length} / ${r.max}</span> Helfer eingetragen · ${f === 0 ? "voll" : f + " frei"}</p>${r.description ? `<p class="sub">${esc(r.description)}</p>` : ""}</div></div><div class="bar" style="margin:16px 0"><div style="width:${Math.min(100, p.length / Number(r.max) * 100)}%"></div></div><h3>Eingetragene Helfer</h3>${p.length ? p.map(entryHtml).join("") : `<p class="sub">Noch niemand eingetragen.</p>`}</section><section class="panel"><h2>Ich möchte hier helfen</h2>${f > 0 ? helperForm(id) : `<p>Dieser Bereich ist bereits voll.</p>`}</section>`;
}

function entryHtml(h) {
  return `<div class="entry"><div><strong>${esc(h.name)}</strong><br><small>${esc(h.time || "")} · ${esc(h.note || "Keine Bemerkung")}</small>${isAdmin ? `<br><small>Tel: ${esc(h.phone || "")}</small>` : ""}</div>${isAdmin ? `<button class="btn danger" onclick="deleteHelper('${h.id}')">Löschen</button>` : ""}</div>`;
}

function infoPage() {
  return `<section class="panel"><h2>ℹ️ Infos zum O-Ritt</h2><div class="cards"><div class="info"><h3>📅 Datum</h3><p>Samstag, 25.07.2026</p></div><div class="info"><h3>🏖️ Motto</h3><p>Beach Please – wir reiten! Sommer, Sonne, Sattel.</p></div><div class="info"><h3>🗺️ Strecken</h3><p>Kleine Runde ca. 7 km, große Runde ca. 17 km.</p></div><div class="info"><h3>🏆 Siegerehrung</h3><p>Im Reitverein Neuendettelsau.</p></div><div class="info"><h3>🎭 Kostümwertung</h3><p>Das ausgefallenste Kostüm bekommt einen Sonderpreis.</p></div><div class="info"><h3>🚴 Begleiter</h3><p>Mit geländetauglichem Fahrrad und Grundkondition möglich.</p></div><div class="info"><h3>⛑️ Teilnahme</h3><p>Helmpflicht, Teilnahme auf eigene Gefahr, Minderjährige nur mit Erwachsenen.</p></div><div class="info"><h3>⏰ Anmeldefrist</h3><p>10.07.2026</p></div></div></section>`;
}

function pdfPage() {
  return `<section class="panel"><h2>📄 PDF-Anmeldung 2026</h2><div class="notice">Die Teilnehmeranmeldung für den O-Ritt 2026 läuft weiterhin über die offiziellen PDF-Unterlagen. Eine Online-Anmeldung kann 2027 ergänzt werden.</div></section>`;
}

function newsPage() {
  return `<section class="panel"><h2>📢 Aktuelles</h2>${news.length ? news.map(n => `<div class="entry"><div><strong>${esc(n.title)}</strong><p>${esc(n.text)}</p><small>${n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString("de-DE") : ""}</small></div>${isAdmin ? `<button class="btn danger" onclick="deleteNews('${n.id}')">Löschen</button>` : ""}</div>`).join("") : `<p class="sub">Noch keine aktuellen Hinweise.</p>`}</section>`;
}

function resultsPage() {
  const ranking = rankedParticipants();
  return `<section class="panel"><div class="head"><div><h2>🏆 Ergebnisse</h2><p class="sub">Punkte pro Station und automatische Rangliste.</p></div>${isAdmin ? `<button class="btn alt" onclick="exportResultsCSV()">Ergebnisse CSV</button>` : ""}</div>${isAdmin ? participantForm() : ""}${isAdmin ? scoreEntryPanel() : ""}<h3>Rangliste</h3>${ranking.length ? ranking.map((p, i) => `<div class="entry"><div><strong>${i + 1}. ${esc(p.name)}</strong><br><small>Start-Nr.: ${esc(p.startNumber || "-")} · Pferd: ${esc(p.horse || "-")} · Strecke: ${esc(p.route || "-")}</small></div><strong>${totalFor(p.id)} Punkte</strong></div>`).join("") : `<p class="sub">Noch keine Teilnehmer eingetragen.</p>`}</section>`;
}

function participantForm() {
  return `<div class="notice">Teilnehmer und Punkte sind nur im Adminbereich bearbeitbar.</div><form id="participantForm" class="form"><label>Startnummer<input id="participantStart" placeholder="z. B. 12"></label><label>Name / Reiterpaar<input id="participantName" required placeholder="z. B. Lisa & Anna"></label><label>Pferd<input id="participantHorse" placeholder="Pferdename"></label><label>Strecke<select id="participantRoute"><option>Kleine Runde 7 km</option><option>Große Runde 17 km</option></select></label><button class="btn full" type="submit">Teilnehmer hinzufügen</button></form>`;
}

function scoreEntryPanel() {
  return `<h3>Punkte eintragen</h3>${participants.map(p => `<details class="entry"><summary><strong>${esc(p.startNumber || "")} ${esc(p.name)}</strong> · Gesamt: ${totalFor(p.id)} Punkte</summary><form class="form score-form" data-participant="${p.id}" style="margin-top:12px">${scoringStations().map(st => `<label>${st.icon} ${esc(st.name)}<input name="${st.id}" type="number" min="0" step="0.5" value="${scoreFor(p.id, st.id)?.points ?? ""}" placeholder="Punkte"></label>`).join("")}<button class="btn full" type="submit">Punkte speichern</button></form><button class="btn danger" onclick="deleteParticipant('${p.id}')">Teilnehmer löschen</button></details>`).join("") || `<p class="sub">Noch keine Teilnehmer eingetragen.</p>`}`;
}

function adminLogin() {
  return `<section class="panel"><h2>🔒 Admin-Login</h2><p class="sub">Passwort eingeben, um Export, Löschen, Ergebnisse und Einstellungen zu nutzen.</p><form id="adminLoginForm" class="form"><label class="full">Admin-Passwort<input id="adminLoginPassword" type="password" placeholder="Passwort"></label><button class="btn full" type="submit">Einloggen</button></form></section>`;
}

function adminPage() {
  if (!isAdmin) return adminLogin();
  return `<section class="panel"><div class="head"><div><h2>👑 Admin Dashboard</h2><p class="sub">Du bist als Admin angemeldet.</p></div><button class="btn light" onclick="adminLogout()">Abmelden</button></div><div class="stats"><div class="stat"><strong>${helpers.length}</strong><span>Helfer</span></div><div class="stat"><strong>${totalSlots()}</strong><span>Plätze</span></div><div class="stat"><strong>${missing()}</strong><span>frei</span></div><div class="stat"><strong>${participants.length}</strong><span>Teilnehmer</span></div></div><button class="btn" onclick="exportCSV()">Helfer CSV</button> <button class="btn alt" onclick="go('ergebnisse')">Ergebnisse</button> <button class="btn light" onclick="shareWhatsApp()">WhatsApp-Link teilen</button>${helperOverview(true)}</section>${adminSettings()}`;
}

function adminSettings() {
  return `<section class="panel"><h2>⚙️ Einstellungen</h2><form id="settingsForm" class="form"><label>Event-Titel<input id="setTitle" value="${esc(settings.eventTitle)}"></label><label>Untertitel<input id="setSubtitle" value="${esc(settings.eventSubtitle)}"></label><label class="full">WhatsApp-Text<textarea id="setWhatsapp">${esc(settings.whatsappText)}</textarea></label><label>Neues Admin-Passwort<input id="setPassword" placeholder="Leer lassen = unverändert"></label><button class="btn full" type="submit">Einstellungen speichern</button></form></section><section class="panel"><h2>📢 News schreiben</h2><form id="newsForm" class="form"><label>Titel<input id="newsTitle" placeholder="z. B. Hängerparkplatz öffnet um 7:30 Uhr"></label><label class="full">Text<textarea id="newsText" placeholder="Kurzer Hinweis"></textarea></label><button class="btn full" type="submit">News veröffentlichen</button></form></section><section class="panel"><h2>🧩 Stationen und Bereiche verwalten</h2><div class="notice">Hier kannst du Stationen umbenennen, Beschreibungen ergänzen, Helferzahlen ändern und die chronologische Reihenfolge festlegen. Stationen mit der ID station-1 bis station-9 werden automatisch für die Punktewertung genutzt.</div><form id="roleForm" class="form"><label>Name<input id="roleName" placeholder="z. B. Fototeam"></label><label>Emoji<input id="roleIcon" placeholder="📸"></label><label>Plätze<input id="roleMax" type="number" min="1" value="4"></label><label>Reihenfolge<input id="roleOrder" type="number" step="0.1" value="99"></label><label class="full">Beschreibung<textarea id="roleDescription" placeholder="Kurze Beschreibung der Aufgabe"></textarea></label><button class="btn full" type="submit">Bereich hinzufügen</button></form>${roles.map(r => `<form class="entry role-edit" data-role="${r.id}"><div style="display:grid;gap:8px;width:100%"><strong>${r.icon} ${esc(r.name)}</strong><input name="name" value="${esc(r.name)}"><input name="icon" value="${esc(r.icon)}"><input name="max" type="number" min="1" value="${r.max}"><input name="order" type="number" step="0.1" value="${r.order ?? stationNumber(r.id)}" placeholder="Reihenfolge"><textarea name="description" placeholder="Beschreibung">${esc(r.description || "")}</textarea></div><div style="display:grid;gap:8px"><button class="btn alt" type="submit">Speichern</button><button class="btn danger" type="button" onclick="deleteRole('${r.id}')">Entfernen</button></div></form>`).join("")}</section>`;
}

function render() {
  let content = "";
  if (page === "home") content = homePage();
  else if (page === "oritt") content = orittPage();
  else if (page === "turnier") content = turnierPage();
  else if (page === "helfer") content = helperPage();
  else if (page === "infos") content = infoPage();
  else if (page === "pdf") content = pdfPage();
  else if (page === "news") content = newsPage();
  else if (page === "ergebnisse") content = resultsPage();
  else if (page === "admin") content = adminPage();
  else if (page.startsWith("role:")) content = rolePage(page.split(":")[1]);
  appEl.innerHTML = shell(content);
  attachForms();
}

function attachForms() {
  const helper = document.getElementById("helperForm");
  if (helper) helper.addEventListener("submit", submitHelper);
  const login = document.getElementById("adminLoginForm");
  if (login) login.addEventListener("submit", e => {
    e.preventDefault();
    const pw = document.getElementById("adminLoginPassword").value;
    if (pw === settings.adminPassword) { isAdmin = true; localStorage.setItem(ADMIN_KEY, "yes"); toast("Admin angemeldet."); render(); }
    else toast("Falsches Passwort.");
  });
  const settingsForm = document.getElementById("settingsForm");
  if (settingsForm) settingsForm.addEventListener("submit", saveSettings);
  const newsForm = document.getElementById("newsForm");
  if (newsForm) newsForm.addEventListener("submit", submitNews);
  const roleForm = document.getElementById("roleForm");
  if (roleForm) roleForm.addEventListener("submit", addRole);
  const participantFormEl = document.getElementById("participantForm");
  if (participantFormEl) participantFormEl.addEventListener("submit", addParticipant);
  document.querySelectorAll(".role-edit").forEach(form => form.addEventListener("submit", saveRole));
  document.querySelectorAll(".score-form").forEach(form => form.addEventListener("submit", saveScores));
}

async function submitHelper(e) {
  e.preventDefault();
  const role = document.getElementById("role").value;
  const r = roleById(role);
  const count = peopleFor(role).length;
  if (count >= Number(r.max)) return toast("Dieser Bereich ist bereits voll.");
  const payload = { name: document.getElementById("name").value.trim(), phone: document.getElementById("phone").value.trim(), role, time: document.getElementById("time").value, note: document.getElementById("note").value.trim(), createdAt: serverTimestamp() };
  if (!payload.name || !payload.phone) return toast("Bitte Name und Telefon eintragen.");
  await addDoc(collection(db, "helpers"), payload);
  toast("Danke! Du bist eingetragen.");
  e.target.reset();
}

async function saveSettings(e) {
  e.preventDefault();
  const next = { ...settings, eventTitle: document.getElementById("setTitle").value.trim(), eventSubtitle: document.getElementById("setSubtitle").value.trim(), whatsappText: document.getElementById("setWhatsapp").value.trim() };
  const pw = document.getElementById("setPassword").value.trim();
  if (pw) next.adminPassword = pw;
  await setDoc(doc(db, "settings", "main"), next, { merge: true });
  toast("Einstellungen gespeichert.");
}

async function submitNews(e) {
  e.preventDefault();
  const title = document.getElementById("newsTitle").value.trim();
  const text = document.getElementById("newsText").value.trim();
  if (!title || !text) return toast("Bitte Titel und Text eintragen.");
  await addDoc(collection(db, "news"), { title, text, createdAt: serverTimestamp() });
  e.target.reset();
  toast("News veröffentlicht.");
}

async function addRole(e) {
  e.preventDefault();
  const name = document.getElementById("roleName").value.trim();
  const icon = document.getElementById("roleIcon").value.trim() || "👥";
  const max = Number(document.getElementById("roleMax").value || 1);
  const order = Number(document.getElementById("roleOrder").value || 999);
  const description = document.getElementById("roleDescription").value.trim();
  if (!name) return toast("Bitte Namen eintragen.");
  await setDoc(doc(db, "roles", slug(name)), { name, icon, max, order, description, createdAt: serverTimestamp() });
  e.target.reset();
  toast("Bereich hinzugefügt.");
}

async function saveRole(e) {
  e.preventDefault();
  const id = e.currentTarget.dataset.role;
  const data = { name: e.currentTarget.name.value.trim(), icon: e.currentTarget.icon.value.trim() || "👥", max: Number(e.currentTarget.max.value || 1), description: e.currentTarget.description.value.trim(), createdAt: serverTimestamp() };
  await setDoc(doc(db, "roles", id), data, { merge: true });
  toast("Bereich gespeichert.");
}

async function addParticipant(e) {
  e.preventDefault();
  const payload = { startNumber: document.getElementById("participantStart").value.trim(), name: document.getElementById("participantName").value.trim(), horse: document.getElementById("participantHorse").value.trim(), route: document.getElementById("participantRoute").value, createdAt: serverTimestamp() };
  if (!payload.name) return toast("Bitte Teilnehmernamen eintragen.");
  await addDoc(collection(db, "participants"), payload);
  e.target.reset();
  toast("Teilnehmer hinzugefügt.");
}

async function saveScores(e) {
  e.preventDefault();
  const participantId = e.currentTarget.dataset.participant;
  for (const st of scoringStations()) {
    const raw = e.currentTarget[st.id]?.value;
    if (raw !== undefined && raw !== "") {
      await setDoc(doc(db, "scores", scoreKey(participantId, st.id)), { participantId, stationId: st.id, points: Number(raw), updatedAt: serverTimestamp() }, { merge: true });
    }
  }
  toast("Punkte gespeichert.");
}

window.deleteHelper = async (id) => { if (!isAdmin) return toast("Bitte Admin einloggen."); if (confirm("Eintrag löschen?")) await deleteDoc(doc(db, "helpers", id)); };
window.deleteNews = async (id) => { if (!isAdmin) return; if (confirm("News löschen?")) await deleteDoc(doc(db, "news", id)); };
window.deleteRole = async (id) => { if (!isAdmin) return; if (peopleFor(id).length) return toast("Bereich hat noch Helfer."); if (confirm("Bereich entfernen?")) await deleteDoc(doc(db, "roles", id)); };
window.deleteParticipant = async (id) => { if (!isAdmin) return; if (confirm("Teilnehmer löschen?")) await deleteDoc(doc(db, "participants", id)); };
window.adminLogout = () => { isAdmin = false; localStorage.removeItem(ADMIN_KEY); toast("Admin abgemeldet."); render(); };

window.exportCSV = () => {
  if (!isAdmin) return toast("Bitte Admin einloggen.");
  const rows = [["Bereich", "Name", "Telefon", "Zeitraum", "Bemerkung"]];
  helpers.forEach(h => rows.push([roleById(h.role)?.name || h.role, h.name, h.phone, h.time || "", h.note || ""]));
  downloadCSV(rows, "RVN_Oritt_Helferliste.csv");
};

window.exportResultsCSV = () => {
  if (!isAdmin) return toast("Bitte Admin einloggen.");
  const header = ["Rang", "Startnummer", "Teilnehmer", "Pferd", "Strecke", ...scoringStations().map(s => s.name), "Gesamt"];
  const rows = [header];
  rankedParticipants().forEach((p, i) => rows.push([i + 1, p.startNumber || "", p.name || "", p.horse || "", p.route || "", ...scoringStations().map(st => scoreFor(p.id, st.id)?.points || 0), totalFor(p.id)]));
  downloadCSV(rows, "RVN_Oritt_Ergebnisse.csv");
};

function downloadCSV(rows, filename) {
  const csv = rows.map(row => row.map(v => `"${String(v).replaceAll('"', '""')}"`).join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

window.shareWhatsApp = async () => {
  const text = settings.whatsappText;
  if (navigator.share) await navigator.share({ title: "RVN Event Manager", text, url: location.href });
  else window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + location.href)}`, "_blank");
};

window.toast = (msg) => {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
};

async function ensureDefaults() {
  const s = await getDoc(doc(db, "settings", "main"));
  if (!s.exists()) await setDoc(doc(db, "settings", "main"), defaultSettings);
  const seeded = await getDoc(doc(db, "meta", "rolesSeeded"));
  if (!seeded.exists()) {
    for (const r of defaultRoles) await setDoc(doc(db, "roles", r.id), { ...r, createdAt: serverTimestamp() }, { merge: true });
    await setDoc(doc(db, "meta", "rolesSeeded"), { done: true, createdAt: serverTimestamp() });
  }
}

function init() {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    ensureDefaults();
    onSnapshot(doc(db, "settings", "main"), s => { if (s.exists()) settings = { ...defaultSettings, ...s.data() }; render(); });
    onSnapshot(query(collection(db, "roles"), orderBy("createdAt", "asc")), snap => { const custom = snap.docs.map(d => ({ id: d.id, ...d.data() })); roles = sortRoles(custom.length ? custom : defaultRoles); render(); });
    onSnapshot(query(collection(db, "helpers"), orderBy("createdAt", "asc")), snap => { helpers = snap.docs.map(d => ({ id: d.id, ...d.data() })); render(); });
    onSnapshot(query(collection(db, "news"), orderBy("createdAt", "desc")), snap => { news = snap.docs.map(d => ({ id: d.id, ...d.data() })); render(); });
    onSnapshot(query(collection(db, "participants"), orderBy("createdAt", "asc")), snap => { participants = snap.docs.map(d => ({ id: d.id, ...d.data() })); render(); });
    onSnapshot(collection(db, "scores"), snap => { scores = snap.docs.map(d => ({ id: d.id, ...d.data() })); render(); });
  } catch (e) {
    console.error(e);
    render();
    toast("Firebase-Konfiguration prüfen.");
  }
  setInterval(() => { if (page === "oritt") render(); }, 1000);
}

init();
