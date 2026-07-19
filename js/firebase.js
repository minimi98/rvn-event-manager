import { firebaseConfig } from "../firebase-config.js?v=10.2";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.22.5/firebase-app.js";
import {
  getFirestore, collection, addDoc, deleteDoc, doc, setDoc, getDoc,
  serverTimestamp, onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.22.5/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export { collection, addDoc, deleteDoc, doc, setDoc, getDoc, serverTimestamp, onSnapshot, query, orderBy };
