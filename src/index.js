import express from 'express'
import { router, database, allUsers } from './route.js'
import axios from 'axios'
import qs from 'qs'
import { ref, push } from 'firebase/database'
import { path } from 'path'

const app = express()
const port = process.env.PORT
const __dirname = process.env.PWD

app.set("views", path.join(__dirname, "/src/views"))
app.set("view engine", "pug");
app.use('/', router)
app.use(express.static(__dirname + '/src/public'))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

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

const config = {
    headers: {
        'Authorization': 'Basic dmV2YWlvLWFwaTpUTng4Yzl3NXNadndYcUpo',
        'Content-Type': 'application/x-www-form-urlencoded',
        'AppAuthorization': 'Basic Z0g4eTlaS1VFMmZrdGtaVzo5ekxZaFAyN3FrZVZSYkY3azk1VHpEQ1pMQXpLTGpSWFQ1TmZnQTlNdUtjUjJ1RllxTnIyRHNBbmY5eGJIVmY5'
    }
}    

// response from thryve with time and value to write in firebase
var data_time_value = {
    createdAtUnix: '',
    value: ''
}

// path to write in firebase
var folder_path = ''

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
        config,
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
                            break;  
                        case 'Speed':
                            folder_path = '/Activity/Speed'                          
                            break;  
                        case 'VO2max':
                            folder_path = '/Activity/Vo2 Max'                          
                            break;  
                        case 'ActivityTypeDetail2':
                            if (data_time_value.value == "361")
                                folder_path = '/Activity/Wheel Chair Push'    
                            else
                                folder_path = '/Other/' + name                         
                            break; 
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
                            break;     
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
                            break;  
                        // Nutrition
                        case 'Hydration':
                            folder_path = '/Nutrition/Hydration'                          
                            break
                        case 'ConsumedCalories':
                            folder_path = '/Nutrition/Nutrition'                          
                            break;   
                        // Sleep
                        case 'SleepDuration':
                            folder_path = '/Sleep/Sleep'                          
                            break;  
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
                })      
            })       
            console.log("received token: ", qs.parse(dataSource.authenticationToken))
        })
    }).catch(function (error) {
        console.log("ERROR RECEIVED: ", error)
    })
}

function writeUserData(token, folder_path, json) {    
    push(ref(database, 'users/' + token + folder_path), json)
}

app.get("*", (req, res) => {
    //res.render("index", { allUsersResult: allUsers });
    console.log("slava: ")
  });

  