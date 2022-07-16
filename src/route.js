import express from 'express';
import { initializeApp } from 'firebase/app'
import { getDatabase, ref } from 'firebase/database'

var router = express.Router();

const firebaseConfig = {
  apiKey: "AIzaSyC_nEOSyUepPuf8mKNa0oT7CB8Mz6Qi0wM",
  authDomain: "vevaio.firebaseapp.com",
  databaseURL: "https://vevaio-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "vevaio",
  storageBucket: "vevaio.appspot.com",
  messagingSenderId: "1053328596166",
  appId: "1:1053328596166:web:ba066b9f2fa3bc3e49cbc7",
  measurementId: "G-CCSQ6252KD"
}

const appFirebase = initializeApp(firebaseConfig)
const database = getDatabase(appFirebase)

// Home page route.
router.get('/', (req, res) => {
  database.ref('users/').once('value')
.then(function(snapshot) {
    console.log( snapshot.val() )
})
});

export { router, database };

