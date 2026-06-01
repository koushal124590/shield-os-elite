import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA98SYj9aDFwSsjnIONe69yQCx5e_rZmkU",
    authDomain: "noor-cf2f7.firebaseapp.com",
    databaseURL: "https://noor-cf2f7-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "noor-cf2f7",
    storageBucket: "noor-cf2f7.firebasestorage.app",
    messagingSenderId: "428979587963",
    appId: "1:428979587963:web:c9d7ea1bb4be0d4f14cbde"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Explicitly set persistence - CRITICAL for Native (Capacitor/Electron) reliability
setPersistence(auth, browserLocalPersistence)
    .then(() => console.log("SHIELD_AUTH: PERSISTENCE_LOCAL_READY"))
    .catch((err) => console.error("SHIELD_AUTH: PERSISTENCE_ERR", err));

const database = getDatabase(app);
const storage = getStorage(app);

export { auth, database, storage };

