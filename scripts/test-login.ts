import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// Your config
const firebaseConfig = {
    apiKey: "AIzaSyCtlFapq7_TData3ywYSfzgPrp1lkzvCIQ",
    authDomain: "habitmasteryhubgit-11922-86159.firebaseapp.com",
    projectId: "habitmasteryhubgit-11922-86159",
    storageBucket: "habitmasteryhubgit-11922-86159.firebasestorage.app",
    messagingSenderId: "227084153432",
    appId: "1:227084153432:web:10bc74a168ed651367102d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const EMAIL = "tuhin.gim@gmail.com";
const PASS = "tuhin280399";

console.log(`Testing login for: ${EMAIL}`);

signInWithEmailAndPassword(auth, EMAIL, PASS)
    .then((userCredential) => {
        console.log("✅ LOGIN SUCCESS!");
        console.log("User UID:", userCredential.user.uid);
        console.log("Email Verified:", userCredential.user.emailVerified);
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ LOGIN FAILED");
        console.error("Code:", error.code);
        console.error("Message:", error.message);
        process.exit(1);
    });
