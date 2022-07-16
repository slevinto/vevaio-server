import express from 'express';
import { initializeApp } from 'firebase/app'
import { getDatabase, ref, child, get } from 'firebase/database'

var router = express.Router()

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
var allUsers = []

// Home page route.
router.get('/', (req, res) => {
  const dbRef = ref(database)
  get(child(dbRef, `users/`)).then((snapshot) => {
    if (snapshot.exists()) {
      allUsers = []
      const allData = snapshot.val()    
      for(var attributename in allData){
        allUsers.push(attributename);
      } 
      console.log("users: " + allUsers) 

      res.render("home", {
          appName: "Vevaio",
          pageName: "Vevaio",
          data: allUsers,
        });
    } else {
    console.log("No data available")    
    }
  }).catch((error) => {
    console.error(error)
    res.json(error)
  })
})

export { router, database, allUsers }

