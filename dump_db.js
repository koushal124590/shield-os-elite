
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyA98SYj9aDFwSsjnIONe69yQCx5e_rZmkU",
    authDomain: "noor-cf2f7.firebaseapp.com",
    databaseURL: "https://noor-cf2f7-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "noor-cf2f7",
    storageBucket: "noor-cf2f7.firebasestorage.app",
    messagingSenderId: "428979587963",
    appId: "1:428979587963:web:c9d7ea1bb4be0d4f14cbde"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

async function dumpUsers() {
    try {
        const snap = await get(ref(database, 'users'));
        console.log(JSON.stringify(snap.val(), null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

dumpUsers();
