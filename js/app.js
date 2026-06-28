import { db, collection, doc, setDoc, getDoc, serverTimestamp, onSnapshot, query, orderBy } from "./firebase.js";
import { state, defaultSettings, defaultRoles, sortRoles } from "./state.js";
import { shell, pageView, attachForms } from "./views.js";

const appEl = document.getElementById("app");

function renderApp() {
  appEl.innerHTML = shell(pageView());
  attachForms(renderApp);
}
window.renderApp = renderApp;
window.go = (id) => {
  state.page = id;
  renderApp();
  scrollTo({ top: 0, behavior: "smooth" });
};

async function ensureDefaults() {
  const settings = await getDoc(doc(db, "settings", "main"));
  if (!settings.exists()) await setDoc(doc(db, "settings", "main"), defaultSettings);

  const seeded = await getDoc(doc(db, "meta", "rolesSeeded"));
  if (!seeded.exists()) {
    for (const r of defaultRoles) await setDoc(doc(db, "roles", r.id), { ...r, createdAt: serverTimestamp() }, { merge: true });
    await setDoc(doc(db, "meta", "rolesSeeded"), { done: true, createdAt: serverTimestamp() });
  }
}

function init() {
  ensureDefaults();

  onSnapshot(doc(db, "settings", "main"), snap => {
    if (snap.exists()) state.settings = { ...defaultSettings, ...snap.data() };
    renderApp();
  });

  onSnapshot(query(collection(db, "roles"), orderBy("createdAt", "asc")), snap => {
    const custom = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    state.roles = sortRoles(custom.length ? custom : defaultRoles);
    renderApp();
  });

  onSnapshot(query(collection(db, "helpers"), orderBy("createdAt", "asc")), snap => {
    state.helpers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderApp();
  });

  onSnapshot(query(collection(db, "news"), orderBy("createdAt", "desc")), snap => {
    state.news = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderApp();
  });

  onSnapshot(query(collection(db, "participants"), orderBy("createdAt", "asc")), snap => {
    state.participants = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderApp();
  });

  onSnapshot(collection(db, "scores"), snap => {
    state.scores = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderApp();
  });

  setInterval(() => { if (state.page === "oritt") renderApp(); }, 1000);
}

init();
