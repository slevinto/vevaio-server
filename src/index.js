import express from 'express'
import axios from 'axios'
import qs from 'qs'
import { initializeApp } from 'firebase/app'
import { getDatabase, ref, child, get, push } from 'firebase/database'
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth"
import admin from 'firebase-admin'
import serviceAccount from '../vevaio-firebase-adminsdk-vv0bl-3be2a90905.json'
import pg from 'pg'
import cookieParser from 'cookie-parser'

const app = express()
const port = process.env.PORT

app.set('view engine', 'pug')
app.set('views', './src/views')
app.use(express.static('./src/public'))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

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

const thryve_config = {
    headers: {
        'Authorization': 'Basic dmV2YWlvLWFwaTpUTng4Yzl3NXNadndYcUpo',
        'Content-Type': 'application/x-www-form-urlencoded',
        'AppAuthorization': 'Basic Z0g4eTlaS1VFMmZrdGtaVzo5ekxZaFAyN3FrZVZSYkY3azk1VHpEQ1pMQXpLTGpSWFQ1TmZnQTlNdUtjUjJ1RllxTnIyRHNBbmY5eGJIVmY5'
    }
}    

const pg_config = {
    host: 'vevaiodwh.postgres.database.azure.com',
    // Do not hard code your username and password.
    // Consider using Node environment variables.
    user: 'dwh',     
    password: 'Dc@334455',
    database: 'postgres',
    port: 5432,
    ssl: true
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://vevaio-default-rtdb.europe-west1.firebasedatabase.app"
  })
const appFirebase = initializeApp(firebaseConfig)
const database = getDatabase(appFirebase)
const dbRef = ref(database)
const auth = getAuth()

// build from webhook response to send to thryve for receiving new data
var data = {
    authenticationToken: '',
    partnerUserID: '',
    startTimestampUnix: '',
    endTimestampUnix: '',
    dataSources: '',
    valueTypes: '',
    detailed: 'true',
    displayTypeName: 'true'
}

// response from thryve with time and value to write in firebase
var data_time_value = {
    createdAtUnix: '',
    value: ''
}

// path to write in firebase
var folder_path = ''

// from firebase to display in dropdown
var allUsers = []

var allFirebaseUsers = []

// to register doctor in firebase
var doctor_info = {
    fullname: '',
    telephone: '',
    email: '',
    password: ''
}

app.get('/register', (req, res) => {  
    res.render('register')
})
  
// Home page route.
app.get('/', (req, res) => {  
    var cookies = 
    {
        email: '',
        password: ''
    }
      
    if (typeof req.cookies.email !== 'undefined')
    {
        cookies = req.cookies
    } 
    res.render("login", {credentials: cookies})
})  

//  register doctor in firebase
app.post('/save_doctor_in_firebase', (req, res)=>{    
    doctor_info.fullname = req.body.fullname
    doctor_info.telephone = req.body.telephone
    doctor_info.email = req.body.email
    doctor_info.password = req.body.password

    createUserWithEmailAndPassword(auth, doctor_info.email, doctor_info.password)
        .then(userData => {  
            push(ref(database, 'doctors/' + doctor_info.fullname), doctor_info)   
            
            const two_years = new Date(Date.now() + 1000*60*60*24*365*2)
            res.cookie(`email`, doctor_info.email, { expires: two_years })
            res.cookie(`password`, doctor_info.password, { expires: two_years })
            
            home_page(res)
        })
        .catch((error) => {
            res.render('login', { credentials: {email: '', password: '' }, err: 'failed to login in firebase: ' + error.message } )
            // ..
        })        
})

// login doctor in firebase
app.post('/login_doctor', (req, res)=>{   
    signInWithEmailAndPassword(auth, req.body.email, req.body.password)
    .then((result) => {
        home_page(res)
    })
    .catch((error) => {
      // Handle Errors here.  
      res.render('login', { credentials: { email: '', password: '' }, err: 'failed to login in firebase: ' + error.message } )
  })
}) 

// received webhook from thryve that exists new data
app.post( '/', ( req, res ) => {
    const answer = qs.parse(req.body.sourceUpdate)
    console.log("received webhook: ", answer)
    
    const dailyDynamicValues = qs.parse(answer["/v5/dailyDynamicValues"])
    const dynamicEpochValues = qs.parse(answer["/v5/dynamicEpochValues"])
    const dataSources = answer.dataSource
    const authenticationToken = answer.authenticationToken  
    const partnerUserID = answer.partnerUserID  

    var url = ''
    if (dailyDynamicValues.startTimestampUnix)
    {        
        data.startTimestampUnix = dailyDynamicValues.startTimestampUnix
        data.endTimestampUnix = dailyDynamicValues.endTimestampUnix
        data.valueTypes = qs.stringify(dailyDynamicValues.dailyDynamicValueTypes).replace('[', '').replace(']', '').replace(/[0-9]+=/g,'').replace(/&/g,',')
        data.authenticationToken = authenticationToken       
        data.partnerUserID = partnerUserID   
        data.dataSources = dataSources
        url = 'https://api.und-gesund.de/v5/dailyDynamicValues' 
        GetDynamicValues(url, partnerUserID)       
    }
    if (dynamicEpochValues.startTimestampUnix)
    {
        data.startTimestampUnix = dynamicEpochValues.startTimestampUnix
        data.endTimestampUnix = dynamicEpochValues.endTimestampUnix
        data.valueTypes = qs.stringify(dynamicEpochValues.dynamicValueTypes).replace('[', '').replace(']', '').replace(/[0-9]+=/g,'').replace(/&/g,',')
        data.authenticationToken = authenticationToken  
        data.partnerUserID = partnerUserID         
        data.dataSources = dataSources
        url = 'https://api.und-gesund.de/v5/dynamicEpochValues'  
        GetDynamicValues(url, partnerUserID)      
    }      
    res.sendStatus( 200 )
})

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))

function GetDynamicValues(url, partnerUserID)
{
    console.log("send post: ", data, "url: ", url)  
    axios.post(
        url,
        qs.stringify(data),
        thryve_config,
    ).then((res) => {
        res.data.forEach(dataSource => {
            dataSource.dataSources.forEach(dataElem => {
                var data_list = qs.parse(dataElem.data)
                console.log("received dataSource data: ", data_list)
                dataElem.data.forEach(data_piece => {
                    data_time_value.createdAtUnix = data_piece.createdAtUnix
                    data_time_value.value = data_piece.value
                   
                    var name = ''
                    if (data_piece.dailyDynamicValueTypeName)
                        name = data_piece.dailyDynamicValueTypeName
                    else 
                        name = data_piece.dynamicValueTypeName    
                    switch (name) {  
                        // Activity                      
                        case 'Steps':
                            folder_path = '/Activity/Steps'                          
                            break
                        case 'CoveredDistance':
                            folder_path = '/Activity/Distance'                          
                            break
                        case 'FloorsClimbed':
                            folder_path = '/Activity/Floors Climbed'                          
                            break
                        case 'ElevationGain':
                            folder_path = '/Activity/Elevation Gain'                          
                            break
                        case 'BurnedCalories':
                            folder_path = '/Activity/Burned Calories'                          
                            break
                        case 'ActiveBurnedCalories':
                            folder_path = '/Activity/Active Burned Calories'                          
                            break
                        case 'BurnedCalories':
                            folder_path = '/Activity/Burned Calories'                          
                            break
                        case 'PowerInWatts':
                            folder_path = '/Activity/Power'                          
                            break
                        case 'ActivityDuration':
                            folder_path = '/Activity/Activity Duration'                          
                            break
                        case 'Speed':
                            folder_path = '/Activity/Speed'                          
                            break  
                        case 'VO2max':
                            folder_path = '/Activity/Vo2 Max'                          
                            break  
                        case 'ActivityTypeDetail2':
                            if (data_time_value.value == "361")
                                folder_path = '/Activity/Wheel Chair Push'    
                            else
                                folder_path = '/Other/' + name                         
                            break 
                        // Body Measurement   
                        case 'MetabolicEquivalent':
                            folder_path = '/Body Measurement/Basal Metabolic Rate'                          
                            break
                        case 'FatMass':
                            folder_path = '/Body Measurement/Body Fat'                          
                            break
                        case 'BoneMass':
                            folder_path = '/Body Measurement/Bone Mass'                          
                            break
                        case 'FatFreeMass':
                            folder_path = '/Body Measurement/Fat Free Mass'                          
                            break
                        case 'Height':
                            folder_path = '/Body Measurement/Height'                          
                            break
                        case 'WaistCircumference':
                            folder_path = '/Body Measurement/Waist Circumference'                          
                            break
                        case 'HipCircumference':
                            folder_path = '/Body Measurement/Hip Circumference'                          
                            break
                        case 'MuscleMass':
                            folder_path = '/Body Measurement/Lean Body Mass'                          
                            break
                        case 'Weight':
                            folder_path = '/Body Measurement/Weight'                          
                            break    
                        // Cycle tracking
                        case 'MenstrualBleeding':
                            folder_path = '/Cycle tracking/Cervical Mucus'                          
                            break
                        case 'CycleLength':
                            folder_path = '/Cycle tracking/Menstruation'                          
                            break
                        case 'PredictedFertility':
                            folder_path = '/Cycle tracking/Ovulation Test'                          
                            break
                        case 'SexualEvent':
                            folder_path = '/Cycle tracking/Sexual Activity'                          
                            break  
                        // Nutrition
                        case 'Hydration':
                            folder_path = '/Nutrition/Hydration'                          
                            break
                        case 'ConsumedCalories':
                            folder_path = '/Nutrition/Nutrition'                          
                            break   
                        // Sleep
                        case 'SleepDuration':
                            folder_path = '/Sleep/Sleep'                          
                            break  
                        // Vitals
                        case 'BloodGlucose':
                            folder_path = '/Vitals/Blood Glucose'                          
                            break
                        case 'BloodPressureDiastolic':
                            folder_path = '/Vitals/Blood Pressure'                          
                            break
                        case 'BodyTemperature':
                            folder_path = '/Vitals/Body Temperature'                          
                            break
                        case 'HeartRate':
                            folder_path = '/Vitals/Heart Rate'                          
                            break
                        case 'Rmssd':
                            folder_path = '/Vitals/Heart Rate Series'                          
                            break
                        case 'BreathingDisturbancesIntensity':
                            folder_path = '/Vitals/Oxygen Saturation'                          
                            break
                        case 'RespirationRate':
                            folder_path = '/Vitals/Respiratory Rate'                          
                            break
                        case 'HeartRateResting':
                            folder_path = '/Vitals/Resting Heart Rate'                          
                            break                  
                        default:
                            folder_path = '/Other/' + name    
                    }
                    writeUserData(partnerUserID, folder_path, data_time_value)
                    queryDatabase(partnerUserID, folder_path.split('/')[1], folder_path.split('/')[2], data_time_value.createdAtUnix, data_time_value.value)
                })      
            })       
            console.log("received token: ", qs.parse(dataSource.authenticationToken))
            
        })
    }).catch(function (error) {
        console.log("ERROR RECEIVED: ", error.message)
    })
}

function writeUserData(token, folder_path, json) {    
    push(ref(database, 'users/' + token + folder_path), json)    
}

// write to postgresql
function queryDatabase(name, main_folder, secondary_folder, createdAtUnix, value) {
    const client = new pg.Client(pg_config)
    client.connect()  // creates connection
    const query = `    
            INSERT INTO users (name, main_folder, secondary_folder, createdAtUnix, value) VALUES($1, $2, $3, $4, $5)           
    `
    client.query(query, [name, main_folder, secondary_folder, createdAtUnix, value], (err, res) => {
        if (err)
            console.log(err.stack) 
        client.end()
      })
}

// go to home page
function home_page(res)
{
    get(child(dbRef, `users/`)).then((snapshot) => {
        if (snapshot.exists()) {
          allUsers = []
           
          const allData = snapshot.val()
          for(var patientname in allData)
          {
            for (var section in snapshot.child(patientname).val()){
                for(var subsection in snapshot.child(patientname).child(section).val()){
                    for(var dirsubsection in snapshot.child(patientname).child(section).child(subsection).val()){
                        allUsers.push([patientname, 
                                     section, 
                                     subsection, 
                                     snapshot.child(patientname).child(section).child(subsection).child(dirsubsection).child('createdAtUnix').val(),
                                     snapshot.child(patientname).child(section).child(subsection).child(dirsubsection).child('value').val()]) 
                    }           
                } 
            }     
          }

          allFirebaseUsers = []
          admin.auth().listUsers(1000)
              .then((listUsersResult) => {
                listUsersResult.users.forEach((userRecord) => {
                  allFirebaseUsers.push(userRecord.toJSON())
                }) 
                const firebaseUsers = allFirebaseUsers.map(a => a.email)
                res.render('home', { appName: "Vevaio", pageName: "Vevaio", data: allUsers, users: firebaseUsers } )                   
              })
              .catch((error) => {
                console.log('Error listing users:', error)
              })             
        }
        else
        {
            console.log('no data')
        }
    })     
}

  