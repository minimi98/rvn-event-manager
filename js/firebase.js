import { firebaseConfig } from "../firebase-config.js?v=10.13.0";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, deleteDoc, doc, setDoc, getDoc, getDocs,
  serverTimestamp, onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export { collection, addDoc, deleteDoc, doc, setDoc, getDoc, getDocs, serverTimestamp, onSnapshot, query, orderBy, ref, uploadBytes, getDownloadURL, deleteObject };
