import express from 'express'
import {router} from './route.js'
import axios from 'axios'
import qs from 'qs'
import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set } from 'firebase/database'

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

const app = express()
const port = process.env.PORT

app.set('view engine', 'pug')
app.set('views', './src/views')
app.use('/', router)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const data = {
    authenticationToken: '',
    startTimestampUnix: '',
    endTimestampUnix: '',
    dataSources: '3',
    valueTypes: '1200,1000,3000',
    detailed: 'true',
    displayTypeName: 'true'
}

 const config = {
    headers: {
        'Authorization': 'Basic dmV2YWlvLWFwaTpUTng4Yzl3NXNadndYcUpo',
        'Content-Type': 'application/x-www-form-urlencoded',
        'AppAuthorization': 'Basic Z0g4eTlaS1VFMmZrdGtaVzo5ekxZaFAyN3FrZVZSYkY3azk1VHpEQ1pMQXpLTGpSWFQ1TmZnQTlNdUtjUjJ1RllxTnIyRHNBbmY5eGJIVmY5'
    }
}    
    
app.post( '/', ( req, res ) => {
    const answer = qs.parse(req.body.sourceUpdate)
    console.log( 'received webHook\n', answer)
    console.log( 'received types\n', qs.parse(answer["/v5/dailyDynamicValues"]))
    var types_str = ''
    answer["/v5/dailyDynamicValues"].dailyDynamicValueTypes.forEach(type => {
        types_str = types_str + type.value + ","
    })
    console.log( 'received dataTypes\n', types_str)
    
    try {
        const startTimestampUnix = req.body.sourceUpdate.startTimestampUnix
        console.log( 'received startTimestampUnix\n', startTimestampUnix)
        const endTimestampUnix = req.body.sourceUpdate.endTimestampUnix
        console.log( 'received endTimestampUnix\n', endTimestampUnix) 
        const authenticationToken = req.body.sourceUpdate.authenticationToken
        console.log( 'received authenticationToken\n', authenticationToken) 
        
        data.startTimestampUnix = startTimestampUnix
        data.endTimestampUnix = endTimestampUnix
        data.authenticationToken = authenticationToken
    }
    catch {
        data.startTimestampUnix = '1654902000000'
        data.endTimestampUnix = '1654937489489'
        data.authenticationToken = '2a94895e176b0116926cc95d011f1085'
    }
        
    axios.post(
        'https://api.und-gesund.de/v5/dynamicEpochValues',
        qs.stringify(data),
        config,
    ).then((res) => {
        console.log("RESPONSE RECEIVED: ", res.data)
        res.data.forEach(dataSource => {
            console.log("received dataSource: ", dataSource)
                dataSource.dataSources.forEach(dataElem => {
                    console.log("received dataSource data: ", qs.parse(dataElem.data))
                    writeUserData(data.authenticationToken, qs.parse(dataElem.data))
            })             
            console.log("received token: ", qs.parse(dataSource.authenticationToken))
        });
    }).catch(function (error) {
        console.log("ERROR RECEIVED: ", error)
    })

    res.sendStatus( 200 )
})

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))

function writeUserData(token, json) {    
    set(ref(database, 'users/' + token), json)
}
  