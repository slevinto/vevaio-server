import express from 'express'
import {router} from './route.js'
import axios from 'axios'
import qs from 'qs'
import { initializeApp } from 'firebase/app'
import { getDatabase, ref, push } from 'firebase/database'

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
    dataSources: '',
    valueTypes: '',
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
    console.log("received webhook: ", answer)
    
    const dailyDynamicValues = qs.parse(answer["/v5/dailyDynamicValues"])
    const dynamicEpochValues = qs.parse(answer["/v5/dynamicEpochValues"])
    const dataSources = answer.dataSource
    const authenticationToken = answer.authenticationToken  

    var url = ''
    if (dailyDynamicValues.startTimestampUnix)
    {        
        data.startTimestampUnix = dailyDynamicValues.startTimestampUnix
        data.endTimestampUnix = dailyDynamicValues.endTimestampUnix
        data.valueTypes = qs.stringify(dailyDynamicValues.dailyDynamicValueTypes).replace('[', '').replace(']', '').replace(/d+=/g,'').replace(/&/g,',')
        data.authenticationToken = authenticationToken        
        data.dataSources = dataSources
        url = 'https://api.und-gesund.de/v5/dailyDynamicValues' 
        GetDynamicValues(url)       
    }
    if (dynamicEpochValues.startTimestampUnix)
    {
        data.startTimestampUnix = dynamicEpochValues.startTimestampUnix
        data.endTimestampUnix = dynamicEpochValues.endTimestampUnix
        data.valueTypes = qs.stringify(dynamicEpochValues.dynamicValueTypes).replace('[', '').replace(']', '').replace(/d+=/g,'').replace(/&/g,',')
        data.authenticationToken = authenticationToken        
        data.dataSources = dataSources
        url = 'https://api.und-gesund.de/v5/dynamicEpochValues'  
        GetDynamicValues(url)      
    }    
   
    res.sendStatus( 200 )
})

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))

function GetDynamicValues(url)
{
    console.log("send post: ", data, "url: ", url)  
    axios.post(
        url,
        qs.stringify(data),
        config,
    ).then((res) => {
        res.data.forEach(dataSource => {
                dataSource.dataSources.forEach(dataElem => {
                    console.log("received dataSource data: ", qs.parse(dataElem.data))
                    writeUserData(data.authenticationToken, qs.parse(dataElem.data))
            })             
        console.log("received token: ", qs.parse(dataSource.authenticationToken))
    })
    }).catch(function (error) {
        console.log("ERROR RECEIVED: ", error)
    })
}

function writeUserData(token, json) {    
    push(ref(database, 'users/' + token), json)
}
  