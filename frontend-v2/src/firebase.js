import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyBtqRfiS_FyPQ_4zkRzHPd6v9Ipmlgb72A",
    authDomain: "qurioqr.firebaseapp.com",
    projectId: "qurioqr",
    storageBucket: "qurioqr.firebasestorage.app",
    messagingSenderId: "344073538959",
    appId: "1:344073538959:web:b1c59bec66bb73aaa98ffa"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
