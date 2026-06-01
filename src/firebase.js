// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Cole aqui a config do seu Firebase (a do Console -> Configuração do SDK -> Config)
const firebaseConfig = {
  apiKey: "AIzaSyAII2JjundOYNC9ZNRi8Z3EMgO5-1L-SGs",
  authDomain: "festa-junina-estalo.firebaseapp.com",
  projectId: "festa-junina-estalo",
  storageBucket: "festa-junina-estalo.firebasestorage.app",
  messagingSenderId: "463929425317",
  appId: "1:463929425317:web:8569c20910c584458f7c4c"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);