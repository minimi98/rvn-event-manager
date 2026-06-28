export const EVENT_DATE = new Date("2026-07-25T09:00:00");
export const ADMIN_KEY = "rvn_admin_logged_in";

export const defaultSettings = {
  adminPassword: "RVN2026!",
  whatsappText: "🐴 RVN Event Manager – Helferanmeldung O-Ritt 2026: Trag dich hier ein:",
  eventTitle: "Beach Please – wir reiten!",
  eventSubtitle: "Sommer, Sonne, Sattel"
};

export const defaultRoles = [
  ...Array.from({ length: 9 }, (_, i) => ({ id: `station-${i + 1}`, order: i + 1, name: `Station ${i + 1}`, icon: "🐴", max: 5, maxPoints: 10, description: "" })),
  { id: "meldestelle", order: 0, name: "Meldestelle", icon: "📋", max: 4, description: "Anmeldung, Startunterlagen und Rückfragen." },
  { id: "haengerplatz", order: 10, name: "Hängerplatz", icon: "🚗", max: 4, description: "Einweisung und Ordnung am Hängerparkplatz." },
  { id: "grillen", order: 14, name: "Grillteam", icon: "🔥", max: 6, description: "Unterstützung beim Grillen und Abspülen am Abend." },
  { id: "aufbau", order: -2, name: "Aufbauteam", icon: "🔧", max: 6, description: "Aufbau vor der Veranstaltung." },
  { id: "abbau", order: 15, name: "Abbauteam", icon: "🔨", max: 6, description: "Abbau nach der Veranstaltung." },
  { id: "springer-kfz", order: 13, name: "Springer mit KFZ", icon: "🚙", max: 4, description: "Kontrolle der Stationen mit Fahrzeug." }
];

export const state = {
  settings: { ...defaultSettings },
  roles: [...defaultRoles],
  helpers: [],
  news: [],
  participants: [],
  scores: [],
  page: "home",
  isAdmin: localStorage.getItem(ADMIN_KEY) === "yes",
  currentEventName: "O-Ritt 2026"
};

export const sortRoles = (arr) => [...arr].sort((a, b) => Number(a.order ?? 999) - Number(b.order ?? 999) || String(a.name || "").localeCompare(String(b.name || "")));
export const roleById = (id) => state.roles.find(r => r.id === id);
export const peopleFor = (id) => state.helpers.filter(h => h.role === id);
export const totalSlots = () => state.roles.reduce((a, r) => a + Number(r.max || 0), 0);
export const missing = () => Math.max(0, totalSlots() - state.helpers.length);
export const scoringStations = () => state.roles.filter(r => r.id.startsWith("station-"));
export const scoreKey = (participantId, stationId) => participantId + "__" + stationId;
export const scoreFor = (participantId, stationId) => state.scores.find(s => s.participantId === participantId && s.stationId === stationId);
export const totalFor = (participantId) => scoringStations().reduce((sum, st) => sum + Number(scoreFor(participantId, st.id)?.points || 0), 0);
export const rankedParticipants = () => [...state.participants].sort((a, b) => totalFor(b.id) - totalFor(a.id) || String(a.startNumber || "").localeCompare(String(b.startNumber || "")));
