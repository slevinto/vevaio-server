import express from 'express'
import axios from 'axios'
import qs from 'qs'
import { initializeApp } from 'firebase/app'
import { getDatabase, ref, child, get, push } from 'firebase/database'
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth"
import admin from 'firebase-admin'
import path from 'path'
import { readFileSync, writeFileSync } from 'fs'
import pg from 'pg'
import cookieParser from 'cookie-parser'  
import { google } from 'googleapis'
import MailComposer from 'nodemailer/lib/mail-composer'
import { Options } from 'nodemailer/lib/mailer'
import { Response } from 'express-serve-static-core'

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

const fileUrl = path.join(__dirname, '..', 'vevaio-firebase-adminsdk-vv0bl-3be2a90905.json')
const serviceAccount = JSON.parse(readFileSync(fileUrl).toString())
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://vevaio-default-rtdb.europe-west1.firebasedatabase.app"
  })
const appFirebase = initializeApp(firebaseConfig)
const database = getDatabase(appFirebase)
const dbRef = ref(database)
const auth = getAuth()

const credentialsUrl = path.join(__dirname, '..', './credentials.json')
const credentials = JSON.parse(readFileSync(credentialsUrl).toString())
const { client_secret, client_id, redirect_uris } = credentials.web
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])
const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.send']
const url = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: GMAIL_SCOPES,
})

const encodeMessage = (message: Buffer | ArrayBuffer | { valueOf(): ArrayBuffer | SharedArrayBuffer }) => {
    return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const createMail = async (options: Options) => {
    const mailComposer = new MailComposer(options)
    const message = await mailComposer.compile().build()
    return encodeMessage(message)
}
const sendMail = async (options: Options) => {
    console.log('url to get token: ' + url)
    const code = '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' // here get token from url
    const token = oAuth2Client.getToken(code)
    .catch((error) => {
        console.log('error get token: ' + error.message)
    })
    if (options) {
        var request = new XMLHttpRequest()
        var url = 'https://www.googleapis.com/gmail/v1/users/me/messages/send'
        var params = JSON.stringify({'raw': options})
        request.open('POST', url , true)
        request.setRequestHeader("Authorization", "Bearer " + token)
        request.setRequestHeader("Content-type", "application/json")
        request.send(params)
        request.onload = function() {
            if (200 === request.status) {
                alert("Email sent successfully")
            }
        }
   }    
}

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

// to register patient in firebase
var patient_info = {
    name: '',
    email: '',
    password: ''
}

app.get('/welcome', (req, res) => {  
    res.render('welcome')
})

app.get('/register_doctor', (req, res) => {  
    res.render('register_doctor')
})

app.get('/register_patient', (req, res) => {  
    res.render('register_patient')
})
  
// Home page route.
app.get('/', (req, res) => {  
    var cookies = 
    {
        email: '',
        password: '',
        type: ''
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
        res.cookie(`type`, 'doctor', { expires: two_years })

        home_page_doctor(res)
    })
    .catch((error) => {
        if (['auth/email-already-exists', 'auth/email-already-in-use'].includes(error.code)) 
        {
            signInWithEmailAndPassword(auth, doctor_info.email, doctor_info.password)
            .then((result) => {

                push(ref(database, 'doctors/' + doctor_info.fullname), doctor_info)   

                const two_years = new Date(Date.now() + 1000*60*60*24*365*2)
                res.cookie(`email`, doctor_info.email, { expires: two_years })
                res.cookie(`password`, doctor_info.password, { expires: two_years })
                res.cookie(`type`, 'doctor', { expires: two_years })
                home_page_doctor(res)
            })
            .catch((error) => {
                res.render('login', { credentials: {email: '', password: '' }, err: 'failed to register in firebase: ' + error.message } ) 
            })
        }
        else
            res.render('login', { credentials: {email: '', password: '' }, err: 'failed to register in firebase: ' + error.message } )            
    })        
})

//  register patient in firebase
app.post('/save_patient_in_firebase', (req, res)=>{    
    patient_info.name = req.body.name
    patient_info.email = req.body.email
    patient_info.password = req.body.password
    
    const patientData = {
        partnerUserID: patient_info.name,
        language: "en",
    }     

    admin.auth().createUser({
        email: patient_info.email,
        emailVerified: false,
        password: patient_info.password,
        displayName: patient_info.name,
        disabled: false,
    })
    .then(userData => {  
        push(ref(database, 'users/' + patient_info.name + '/info/'), patient_info)   
            
        const two_years = new Date(Date.now() + 1000*60*60*24*365*2)
        res.cookie(`email`, patient_info.email, { expires: two_years })
        res.cookie(`password`, patient_info.password, { expires: two_years })
        res.cookie(`type`, 'patient', { expires: two_years })            

        getThryveDataSources(patientData, function(thryveDataSourcesItem) {
            const thryveDataSources = thryveDataSourcesItem.dataSources
            const thryveDataSourcesUrl = thryveDataSourcesItem.url
            if (thryveDataSources.length === 0)
            {
                res.render('choose_brand', {url: thryveDataSourcesUrl})
            }
            else
            {
                home_page_patient(res, patient_info.email, patient_info.name)
            }
        })
    })
    .catch((error) => {
        // Handle Errors here. 
        if (['auth/email-already-exists', 'auth/email-already-in-use'].includes(error.code)) 
        {
            signInWithEmailAndPassword(auth, patient_info.email, patient_info.password)
            .then((result) => {
                push(ref(database, 'users/' + patient_info.name + '/info/'), patient_info)  

                const two_years = new Date(Date.now() + 1000*60*60*24*365*2)
                res.cookie(`email`, patient_info.email, { expires: two_years })
                res.cookie(`password`, patient_info.password, { expires: two_years })
                res.cookie(`type`, 'patient', { expires: two_years })            
    
                getThryveDataSources(patientData, function(thryveDataSourcesItem) {
                    const thryveDataSources = thryveDataSourcesItem.dataSources
                    const thryveDataSourcesUrl = thryveDataSourcesItem.url
                    if (thryveDataSources.length === 0)
                    {
                        res.render('choose_brand', {url: thryveDataSourcesUrl})
                    }
                    else
                    {
                        home_page_patient(res, patient_info.email, patient_info.name)
                    } 
                })
            })
            .catch((error) => {
                res.render('login', { credentials: {email: '', password: '' }, err: 'failed to login in firebase: ' + error.message } )
            })
        }
        else
            res.render('login', { credentials: {email: '', password: '' }, err: 'failed to login in firebase: ' + error.message } )
    })        
})

// login in firebase
app.post('/login', (req, res)=>{  
    signInWithEmailAndPassword(auth, req.body.email, req.body.password)
    .then((result) => {
        if (req.cookies.type === 'patient')
        {
            home_page_patient(res, req.body.email, result.user.displayName)
        }
        else if (req.cookies.type === 'doctor')
        {
            home_page_doctor(res)
        }
        else if (result.user.displayName.length > 0)
        {
            const two_years = new Date(Date.now() + 1000*60*60*24*365*2)
            res.cookie(`email`, patient_info.email, { expires: two_years })
            res.cookie(`password`, patient_info.password, { expires: two_years })
            res.cookie(`type`, 'patient', { expires: two_years })     
            home_page_patient(res, req.body.email, result.user.displayName)
        }
        else
        {
            const two_years = new Date(Date.now() + 1000*60*60*24*365*2)
            res.cookie(`email`, patient_info.email, { expires: two_years })
            res.cookie(`password`, patient_info.password, { expires: two_years })
            res.cookie(`type`, 'doctor', { expires: two_years })     
            home_page_doctor(res)
        }
    })
    .catch((error) => {        
        res.render('login', { credentials: { email: '', password: '' }, err: 'failed to login in firebase: ' + error.message } )
    })
}) 

// received webhook from thryve that exists new data
app.post( '/', ( req, res ) => {
    const answer = qs.parse(req.body.sourceUpdate)
    console.log("received webhook: ", answer)
    
    const dailyDynamicValues = qs.parse(answer["/v5/dailyDynamicValues"].toString())
    const dynamicEpochValues = qs.parse(answer["/v5/dynamicEpochValues"].toString())
    const dataSources = answer.dataSource
    const authenticationToken = answer.authenticationToken  
    const partnerUserID = answer.partnerUserID  

    var url = ''
    if (dailyDynamicValues.startTimestampUnix)
    {        
        data.startTimestampUnix = dailyDynamicValues.startTimestampUnix.toString()
        data.endTimestampUnix = dailyDynamicValues.endTimestampUnix.toString()
        data.valueTypes = qs.stringify(dailyDynamicValues.dailyDynamicValueTypes).replace('[', '').replace(']', '').replace(/[0-9]+=/g,'').replace(/&/g,',')
        data.authenticationToken = authenticationToken.toString()       
        data.partnerUserID = partnerUserID.toString()   
        data.dataSources = dataSources.toString()
        url = 'https://api.und-gesund.de/v5/dailyDynamicValues' 
        GetDynamicValues(url, partnerUserID)       
    }
    if (dynamicEpochValues.startTimestampUnix)
    {
        data.startTimestampUnix = dynamicEpochValues.startTimestampUnix.toString()
        data.endTimestampUnix = dynamicEpochValues.endTimestampUnix.toString()
        data.valueTypes = qs.stringify(dynamicEpochValues.dynamicValueTypes).replace('[', '').replace(']', '').replace(/[0-9]+=/g,'').replace(/&/g,',')
        data.authenticationToken = authenticationToken.toString()  
        data.partnerUserID = partnerUserID.toString()         
        data.dataSources = dataSources.toString()
        url = 'https://api.und-gesund.de/v5/dynamicEpochValues'  
        GetDynamicValues(url, partnerUserID)      
    }      
    res.sendStatus( 200 )
})

//send Email to invite user
app.post('/sendEmail', (req, res) => {  
    console.log(req.body.userEmail.toString())
    const options = {
        to: req.body.userEmail.toString(),
        subject: 'Hello Amit 🚀',
        text: 'This email is sent from the command line',
        html: `<p>🙋🏻‍♀️  &mdash; This is a <b>test email</b> from <a href="https://digitalinspiration.com">Digital Inspiration</a>.</p>`,
        headers: [
          { key: 'X-Application-Developer', value: 'Amit Agarwal' },
          { key: 'X-Application-Version', value: 'v1.0.0.2' },
        ],
    }
    sendMail(options)
})

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))

function GetDynamicValues(url: string, partnerUserID: string | string[] | qs.ParsedQs | qs.ParsedQs[])
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
                    writeUserData(partnerUserID.toString(), folder_path, data_time_value)
                    queryDatabase(partnerUserID.toString(), folder_path.split('/')[1], folder_path.split('/')[2], data_time_value.createdAtUnix, data_time_value.value)
                })      
            })       
            console.log("received token: ", qs.parse(dataSource.authenticationToken))
            
        })
    }).catch(function (error) {
        console.log("ERROR RECEIVED: ", error.message)
    })
}

function writeUserData(token: string, folder_path: string, json: unknown) {    
    push(ref(database, 'users/' + token + folder_path), json)    
}

// write to postgresql
function queryDatabase(name: string, main_folder: string, secondary_folder: string, createdAtUnix: string, value: string) {
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

// go to home doctor page
function home_page_doctor(res: Response<any, Record<string, any>, number>)
{
    get(child(dbRef, `users/`)).then((snapshot) => {
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
            res.render('home_doctor', { appName: "Vevaio", pageName: "Vevaio", data: allUsers, users: firebaseUsers } )                   
        })
        .catch((error) => {
            console.log('Error listing users:', error)
        })       
    })     
}

function home_page_patient(res: Response<any, Record<string, any>, number>, userEmail: string, userName: string)
{
    admin.auth().getUserByEmail(userEmail)
    .then((userRecord) => {
        var dataItems = []
       
        get(child(dbRef, `users/` + userName)).then((snapshot) => {
            const allData = snapshot.val()
            for (var section in allData) {
                for(var subsection in snapshot.child(section).val()) {
                    for(var dirsubsection in snapshot.child(section).child(subsection).val()) {
                        dataItems.push([section, 
                                        subsection, 
                                        snapshot.child(section).child(subsection).child(dirsubsection).child('createdAtUnix').val(),
                                        snapshot.child(section).child(subsection).child(dirsubsection).child('value').val()]) 
                    }           
                } 
            }     
            res.render('home_patient', { username: userName, data:dataItems } )              
        })     
    })   
}

function getThryveDataSources(patientData, callback)
{
    axios.post(
        'https://api.und-gesund.de/v5/accessToken',
        qs.stringify(patientData),
        thryve_config,
    )
    .then((restoken) => {
        const formData = {
            authenticationToken: restoken.data
        }
        axios.post(
            'https://api.und-gesund.de/v5/userInformation',
            qs.stringify(formData),
            thryve_config,
        )
        .then((resUserInfo) => {
            const thryveDataSources = resUserInfo.data[0].connectedSources  
            axios.post(
                'https://api.und-gesund.de/v5/dataSourceURL',
                 qs.stringify(formData),
                 thryve_config,
            )
            .then((ressources) => {
                return callback({ dataSources: thryveDataSources, url: ressources.data })
            })
            .catch((error) => {
                // Handle Errors here.  
                console.log(error)
            }) 
        })
        .catch((error) => {
            // Handle Errors here.  
            console.log(error)
        }) 
    })
    .catch((error) => {
        // Handle Errors here.  
        console.log(error)
    })    
}