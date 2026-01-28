import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyCtlFapq7_TData3ywYSfzgPrp1lkzvCIQ",
    authDomain: "habitmasteryhubgit-11922-86159.firebaseapp.com",
    projectId: "habitmasteryhubgit-11922-86159",
    storageBucket: "habitmasteryhubgit-11922-86159.firebasestorage.app",
    messagingSenderId: "227084153432",
    appId: "1:227084153432:web:10bc74a168ed651367102d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Demo Habits
const DEMO_HABITS = [
    { name: "Morning Meditation", goal: 100, sort_order: 1 },
    { name: "Read 30 Minutes", goal: 100, sort_order: 2 },
    { name: "Workout", goal: 100, sort_order: 3 },
    { name: "Drink 2L Water", goal: 100, sort_order: 4 },
    { name: "Journaling", goal: 100, sort_order: 5 }
];

async function addDemoHabits() {
    // We need a UID. Since this script runs in node, we can't "login" as the user easily without password.
    // INSTEAD, I will create a function you can paste into the BROWSER CONSOLE to run this.

    console.log(`
  ❌ Cannot run this from terminal without logging in.
  
  ✅ DO THIS INSTEAD:
  
  1. Open http://localhost:8081
  2. Open Console (F12 -> Console)
  3. Paste this code:

  (async () => {
    const { db } = await import('/src/integrations/firebase/firebase.ts');
    const { collection, addDoc, getAuth } = await import('firebase/firestore'); 
    // Note: importing firebase SDK in console might be tricky due to bundling.
    
    // EASIER WAY:
    // I will modify the APP to have a "Add Demo Data" button for you!
  })();
  `);
}

addDemoHabits();
