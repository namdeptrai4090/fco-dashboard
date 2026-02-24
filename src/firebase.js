import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, remove, set, get } from 'firebase/database';  // THÊM get

const firebaseConfig = {
  apiKey: "AIzaSyBdGcbgEYZ2avctxNtMQ98pVJhp1Z1wHVc",
  authDomain: "mb-bp-81172.firebaseapp.com",
  databaseURL: "https://mb-bp-81172-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "mb-bp-81172",
  storageBucket: "mb-bp-81172.firebasestorage.app",
  messagingSenderId: "655410554858",
  appId: "1:655410554858:web:5b1202cc41e321bde0f493"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export { ref, onValue, push, remove, set, get };  // THÊM get