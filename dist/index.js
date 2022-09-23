"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const qs_1 = __importDefault(require("qs"));
const app_1 = require("firebase/app");
const database_1 = require("firebase/database");
const auth_1 = require("firebase/auth");
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const pg_1 = __importDefault(require("pg"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const nodemailer_1 = require("nodemailer");
const app = (0, express_1.default)();
const port = process.env.PORT;
app.set('view engine', 'pug');
app.set('views', './src/views');
app.use(express_1.default.static('./src/public'));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
const firebaseConfig = {
    apiKey: "AIzaSyC_nEOSyUepPuf8mKNa0oT7CB8Mz6Qi0wM",
    authDomain: "vevaio.firebaseapp.com",
    databaseURL: "https://vevaio-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "vevaio",
    storageBucket: "vevaio.appspot.com",
    messagingSenderId: "1053328596166",
    appId: "1:1053328596166:web:ba066b9f2fa3bc3e49cbc7",
    measurementId: "G-CCSQ6252KD"
};
const thryve_config = {
    headers: {
        'Authorization': 'Basic dmV2YWlvLWFwaTpUTng4Yzl3NXNadndYcUpo',
        'Content-Type': 'application/x-www-form-urlencoded',
        'AppAuthorization': 'Basic Z0g4eTlaS1VFMmZrdGtaVzo5ekxZaFAyN3FrZVZSYkY3azk1VHpEQ1pMQXpLTGpSWFQ1TmZnQTlNdUtjUjJ1RllxTnIyRHNBbmY5eGJIVmY5'
    }
};
const pg_config = {
    host: 'vevaiodwh.postgres.database.azure.com',
    // Do not hard code your username and password.
    // Consider using Node environment variables.
    user: 'dwh',
    password: 'Dc@334455',
    database: 'postgres',
    port: 5432,
    ssl: true
};
const fileUrl = path_1.default.join(__dirname, '..', 'vevaio-firebase-adminsdk-vv0bl-3be2a90905.json');
const serviceAccount = JSON.parse((0, fs_1.readFileSync)(fileUrl).toString());
firebase_admin_1.default.initializeApp({
    credential: firebase_admin_1.default.credential.cert(serviceAccount),
    databaseURL: "https://vevaio-default-rtdb.europe-west1.firebasedatabase.app"
});
const appFirebase = (0, app_1.initializeApp)(firebaseConfig);
const database = (0, database_1.getDatabase)(appFirebase);
const dbRef = (0, database_1.ref)(database);
const auth = (0, auth_1.getAuth)();
// send email SMTP gmail
// create transporter object with smtp server details
const transporter = (0, nodemailer_1.createTransport)({
    host: 'smtp.gmail.com',
    port: 587,
    auth: {
        user: 'slevinto',
        pass: 'eerzqsjcfghrzkkn'
    }
});
const sendMail = async (options) => {
    if (options) {
        transporter.sendMail({
            from: 'slevinto@gmail.com',
            to: options.to,
            subject: 'Test Email Subject',
            html: options.html
        });
    }
};
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
};
// response from thryve with time and value to write in firebase
var data_time_value = {
    createdAtUnix: '',
    value: ''
};
// path to write in firebase
var folder_path = '';
// from firebase to display in dropdown
var allUsers = [];
// to register doctor in firebase
var doctor_info = {
    fullname: '',
    telephone: '',
    email: '',
    password: ''
};
// to register patient in firebase
var patient_info = {
    firstname: '',
    email: '',
    password: '',
};
app.get('/welcome', (req, res) => {
    res.render('welcome');
});
app.get('/register_doctor', (req, res) => {
    res.render('register_doctor');
});
app.get('/register_patient', (req, res) => {
    res.render('register_patient');
});
// Home page route.
app.get('/', (req, res) => {
    var cookies = {
        email: '',
        password: ''
    };
    if (typeof req.cookies.email !== 'undefined') {
        cookies = req.cookies;
    }
    res.render("login", { credentials: cookies });
});
// register doctor in firebase
app.post('/save_doctor_in_firebase', (req, res) => {
    doctor_info.fullname = req.body.fullname;
    doctor_info.telephone = req.body.telephone;
    doctor_info.email = req.body.email;
    doctor_info.password = req.body.password;
    (0, auth_1.createUserWithEmailAndPassword)(auth, doctor_info.email, doctor_info.password)
        .then(userData => {
        (0, database_1.update)((0, database_1.ref)(database, 'doctors/' + doctor_info.fullname + '/info/'), doctor_info);
        write_registered_in_postgresql('doctor', doctor_info.fullname, doctor_info.email, doctor_info.telephone);
        const two_years = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 2);
        res.cookie(`email`, doctor_info.email, { expires: two_years });
        res.cookie(`password`, doctor_info.password, { expires: two_years });
        home_page_doctor(res, doctor_info.fullname);
    })
        .catch((error) => {
        if (['auth/email-already-exists', 'auth/email-already-in-use'].includes(error.code)) {
            (0, auth_1.signInWithEmailAndPassword)(auth, doctor_info.email, doctor_info.password)
                .then((result) => {
                (0, database_1.update)((0, database_1.ref)(database, 'doctors/' + doctor_info.fullname + '/info/'), doctor_info);
                write_registered_in_postgresql('doctor', doctor_info.fullname, doctor_info.email, doctor_info.telephone);
                const two_years = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 2);
                res.cookie(`email`, doctor_info.email, { expires: two_years });
                res.cookie(`password`, doctor_info.password, { expires: two_years });
                home_page_doctor(res, doctor_info.fullname);
            })
                .catch((error) => {
                res.render('login', { credentials: { email: '', password: '' }, err: 'failed to register in firebase: ' + error.message });
            });
        }
        else
            res.render('login', { credentials: { email: '', password: '' }, err: 'failed to register in firebase: ' + error.message });
    });
});
//  register patient in firebase
app.post('/save_patient_in_firebase', (req, res) => {
    patient_info.email = req.body.email;
    patient_info.password = req.body.password;
    patient_info.firstname = req.body.name;
    const patientData = {
        partnerUserID: patient_info.email.replace(/[^a-z0-9]/gi, ''),
        language: "en",
    };
    firebase_admin_1.default.auth().createUser({
        email: patient_info.email,
        emailVerified: false,
        password: patient_info.password,
        disabled: false,
    })
        .then(userData => {
        (0, database_1.update)((0, database_1.ref)(database, 'users/' + patient_info.email.replace(/[^a-z0-9]/gi, '') + '/info/'), patient_info);
        write_registered_in_postgresql('patient', patient_info.email.replace(/[^a-z0-9]/gi, ''), patient_info.email, '');
        const two_years = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 2);
        res.cookie(`email`, patient_info.email, { expires: two_years });
        res.cookie(`password`, patient_info.password, { expires: two_years });
        getThryveDataSources(patientData, function (thryveDataSourcesItem) {
            const thryveDataSources = thryveDataSourcesItem.dataSources;
            const thryveDataSourcesUrl = thryveDataSourcesItem.url;
            if (thryveDataSources.length === 0) {
                res.render('choose_brand', { url: thryveDataSourcesUrl });
            }
            else {
                home_page_patient(res, patient_info.email, patient_info.firstname);
            }
        });
    })
        .catch((error) => {
        // Handle Errors here. 
        if (['auth/email-already-exists', 'auth/email-already-in-use'].includes(error.code)) {
            (0, auth_1.signInWithEmailAndPassword)(auth, patient_info.email, patient_info.password)
                .then((result) => {
                (0, database_1.update)((0, database_1.ref)(database, 'users/' + patient_info.email.replace(/[^a-z0-9]/gi, '') + '/info/'), patient_info);
                write_registered_in_postgresql('patient', patient_info.email.replace(/[^a-z0-9]/gi, ''), patient_info.email, '');
                const two_years = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 2);
                res.cookie(`email`, patient_info.email, { expires: two_years });
                res.cookie(`password`, patient_info.password, { expires: two_years });
                getThryveDataSources(patientData, function (thryveDataSourcesItem) {
                    const thryveDataSources = thryveDataSourcesItem.dataSources;
                    const thryveDataSourcesUrl = thryveDataSourcesItem.url;
                    if (thryveDataSources.length === 0) {
                        res.render('choose_brand', { url: thryveDataSourcesUrl });
                    }
                    else {
                        home_page_patient(res, patient_info.email, patient_info.firstname);
                    }
                });
            })
                .catch((error) => {
                res.render('login', { credentials: { email: '', password: '' }, err: 'failed to login in firebase: ' + error.message });
            });
        }
        else
            res.render('login', { credentials: { email: '', password: '' }, err: 'failed to login in firebase: ' + error.message });
    });
});
// login in firebase
app.post('/login', (req, res) => {
    (0, auth_1.signInWithEmailAndPassword)(auth, req.body.email, req.body.password)
        .then((result) => {
        (0, database_1.get)((0, database_1.child)(dbRef, `users/`)).then((snapshotUsers) => {
            const allDataUsers = snapshotUsers.val();
            for (var patientname in allDataUsers) {
                if (patientname == req.body.email.replace(/[^a-z0-9]/gi, '')) {
                    const two_years = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 2);
                    res.cookie(`email`, req.body.email, { expires: two_years });
                    res.cookie(`password`, req.body.password, { expires: two_years });
                    home_page_patient(res, req.body.email, snapshotUsers.child(patientname).child('info').child('firstname').val());
                }
            }
        });
        (0, database_1.get)((0, database_1.child)(dbRef, `doctors/`)).then((snapshotUsers) => {
            const allDataUsers = snapshotUsers.val();
            for (var doctorname in allDataUsers) {
                if (snapshotUsers.child(doctorname).child('info').child('email').val() == req.body.email) {
                    const two_years = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 2);
                    res.cookie(`email`, req.body.email, { expires: two_years });
                    res.cookie(`password`, req.body.password, { expires: two_years });
                    home_page_doctor(res, doctorname);
                }
            }
        });
    })
        .catch((error) => {
        res.render('login', { credentials: { email: '', password: '' }, err: 'failed to login in firebase: ' + error.message });
    });
});
// received webhook from thryve that exists new data
app.post('/', (req, res) => {
    const answer = qs_1.default.parse(req.body.sourceUpdate);
    console.log("received webhook: ", answer);
    const dataSources = answer.dataSource;
    const authenticationToken = answer.authenticationToken;
    const partnerUserID = answer.partnerUserID.toString();
    const dailyInfoArrived = (answer["/v5/dailyDynamicValues"] != null);
    const dynamicInfoArrived = (answer["/v5/dynamicEpochValues"] != null);
    var url = '';
    if (dailyInfoArrived) {
        const dailyDynamicValues = qs_1.default.parse(JSON.stringify(answer["/v5/dailyDynamicValues"]));
        console.log(dailyDynamicValues);
        console.log(dailyDynamicValues['startTimestampUnix']);
        console.log(JSON.parse(JSON.stringify(answer["/v5/dailyDynamicValues"]))['startTimestampUnix']);
        data.startTimestampUnix = dailyDynamicValues.startTimestampUnix.toString();
        data.endTimestampUnix = dailyDynamicValues.endTimestampUnix.toString();
        data.valueTypes = qs_1.default.stringify(dailyDynamicValues.dailyDynamicValueTypes).replace('[', '').replace(']', '').replace(/[0-9]+=/g, '').replace(/&/g, ',');
        data.authenticationToken = authenticationToken.toString();
        data.partnerUserID = partnerUserID.toString();
        data.dataSources = dataSources.toString();
        url = 'https://api.und-gesund.de/v5/dailyDynamicValues';
        GetDynamicValues(url, partnerUserID);
    }
    if (dynamicInfoArrived) {
        const dynamicEpochValues = qs_1.default.parse(answer["/v5/dynamicEpochValues"].toString());
        data.startTimestampUnix = dynamicEpochValues.startTimestampUnix.toString();
        data.endTimestampUnix = dynamicEpochValues.endTimestampUnix.toString();
        data.valueTypes = qs_1.default.stringify(dynamicEpochValues.dynamicValueTypes).replace('[', '').replace(']', '').replace(/[0-9]+=/g, '').replace(/&/g, ',');
        data.authenticationToken = authenticationToken.toString();
        data.partnerUserID = partnerUserID.toString();
        data.dataSources = dataSources.toString();
        url = 'https://api.und-gesund.de/v5/dynamicEpochValues';
        GetDynamicValues(url, partnerUserID);
    }
    res.sendStatus(200);
});
//send Email to invite user
app.post('/sendEmail', (req, res) => {
    var doctorName = req.body.doctorName;
    const options = {
        to: req.body.userEmail.toString(),
        html: '<h1>Dr. ' + doctorName + ' is asking permission to view your medical and fitness data.</h1>' +
            '<h1 style="padding-bottom: 50px">Do you approve?</h1>' +
            '<div><a style="background-color: green; text-decoration: none; vertical-align: middle; text-align: center; color: white; font-size: 20px; font-weight: bold; line-height: 100px; padding: 30px" href=' +
            req.protocol + '://' + req.get('host') + '/addUserToDoctor/' + req.body.userEmail.toString() + '/' + doctorName.replace(' ', '%20') +
            '>Yes</a><span style="margin-left: 20px"/>' +
            '<a style="background-color:grey; text-decoration: none; vertical-align: middle; text-align:center; color:black; font-size:20px; font-weight: bold; line-height: 100px; padding: 30px" href=' +
            req.protocol + '://' + req.get('host') + '/addUserToDoctor/No>No</a></div>'
    };
    sendMail(options);
});
app.get('/addUserToDoctor/:userID/:doctorName', (req, res) => {
    if (req.params.userID == "No") // User answer No to invite email
     {
        res.send('Dr. ' + req.params.doctorName.replace('%20', ' ') + ' not received permission to view your medical and fitness data.');
    }
    else {
        //console.log(req.params.userID)
        (0, database_1.push)((0, database_1.ref)(database, 'doctors/' + req.params.doctorName.replace('%20', ' ') + '/patients/'), req.params.userID);
        res.send('Dr. ' + req.params.doctorName.replace('%20', ' ') + ' succeeded to receive permission to view your medical and fitness data.');
    }
});
app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));
function GetDynamicValues(url, partnerUserID) {
    console.log("send post: ", data, "url: ", url);
    axios_1.default.post(url, qs_1.default.stringify(data), thryve_config).then((res) => {
        res.data.forEach(dataSource => {
            dataSource.dataSources.forEach(dataElem => {
                var data_list = qs_1.default.parse(dataElem.data);
                console.log("received dataSource data: ", data_list);
                dataElem.data.forEach(data_piece => {
                    data_time_value.createdAtUnix = data_piece.createdAtUnix;
                    data_time_value.value = data_piece.value;
                    var name = '';
                    if (data_piece.dailyDynamicValueTypeName)
                        name = data_piece.dailyDynamicValueTypeName;
                    else
                        name = data_piece.dynamicValueTypeName;
                    switch (name) {
                        // Activity                      
                        case 'Steps':
                            folder_path = '/Activity/Steps';
                            break;
                        case 'CoveredDistance':
                            folder_path = '/Activity/Distance';
                            break;
                        case 'FloorsClimbed':
                            folder_path = '/Activity/Floors Climbed';
                            break;
                        case 'ElevationGain':
                            folder_path = '/Activity/Elevation Gain';
                            break;
                        case 'BurnedCalories':
                            folder_path = '/Activity/Burned Calories';
                            break;
                        case 'ActiveBurnedCalories':
                            folder_path = '/Activity/Active Burned Calories';
                            break;
                        case 'BurnedCalories':
                            folder_path = '/Activity/Burned Calories';
                            break;
                        case 'PowerInWatts':
                            folder_path = '/Activity/Power';
                            break;
                        case 'ActivityDuration':
                            folder_path = '/Activity/Activity Duration';
                            break;
                        case 'Speed':
                            folder_path = '/Activity/Speed';
                            break;
                        case 'VO2max':
                            folder_path = '/Activity/Vo2 Max';
                            break;
                        case 'ActivityTypeDetail2':
                            if (data_time_value.value == "361")
                                folder_path = '/Activity/Wheel Chair Push';
                            else
                                folder_path = '/Other/' + name;
                            break;
                        // Body Measurement   
                        case 'MetabolicEquivalent':
                            folder_path = '/Body Measurement/Basal Metabolic Rate';
                            break;
                        case 'FatMass':
                            folder_path = '/Body Measurement/Body Fat';
                            break;
                        case 'BoneMass':
                            folder_path = '/Body Measurement/Bone Mass';
                            break;
                        case 'FatFreeMass':
                            folder_path = '/Body Measurement/Fat Free Mass';
                            break;
                        case 'Height':
                            folder_path = '/Body Measurement/Height';
                            break;
                        case 'WaistCircumference':
                            folder_path = '/Body Measurement/Waist Circumference';
                            break;
                        case 'HipCircumference':
                            folder_path = '/Body Measurement/Hip Circumference';
                            break;
                        case 'MuscleMass':
                            folder_path = '/Body Measurement/Lean Body Mass';
                            break;
                        case 'Weight':
                            folder_path = '/Body Measurement/Weight';
                            break;
                        // Cycle tracking
                        case 'MenstrualBleeding':
                            folder_path = '/Cycle tracking/Cervical Mucus';
                            break;
                        case 'CycleLength':
                            folder_path = '/Cycle tracking/Menstruation';
                            break;
                        case 'PredictedFertility':
                            folder_path = '/Cycle tracking/Ovulation Test';
                            break;
                        case 'SexualEvent':
                            folder_path = '/Cycle tracking/Sexual Activity';
                            break;
                        // Nutrition
                        case 'Hydration':
                            folder_path = '/Nutrition/Hydration';
                            break;
                        case 'ConsumedCalories':
                            folder_path = '/Nutrition/Nutrition';
                            break;
                        // Sleep
                        case 'SleepDuration':
                            folder_path = '/Sleep/Sleep';
                            break;
                        // Vitals
                        case 'BloodGlucose':
                            folder_path = '/Vitals/Blood Glucose';
                            break;
                        case 'BloodPressureDiastolic':
                            folder_path = '/Vitals/Blood Pressure';
                            break;
                        case 'BodyTemperature':
                            folder_path = '/Vitals/Body Temperature';
                            break;
                        case 'HeartRate':
                            folder_path = '/Vitals/Heart Rate';
                            break;
                        case 'Rmssd':
                            folder_path = '/Vitals/Heart Rate Series';
                            break;
                        case 'BreathingDisturbancesIntensity':
                            folder_path = '/Vitals/Oxygen Saturation';
                            break;
                        case 'RespirationRate':
                            folder_path = '/Vitals/Respiratory Rate';
                            break;
                        case 'HeartRateResting':
                            folder_path = '/Vitals/Resting Heart Rate';
                            break;
                        default:
                            folder_path = '/Other/' + name;
                    }
                    writeUserData(partnerUserID.toString(), folder_path, data_time_value);
                    queryDatabase(partnerUserID.toString(), folder_path.split('/')[1], folder_path.split('/')[2], data_time_value.createdAtUnix, data_time_value.value);
                });
            });
            console.log("received token: ", qs_1.default.parse(dataSource.authenticationToken));
        });
    }).catch(function (error) {
        console.log("ERROR RECEIVED: ", error.message);
    });
}
function writeUserData(token, folder_path, json) {
    (0, database_1.push)((0, database_1.ref)(database, 'users/' + token + folder_path), json);
}
// write to postgresql user data for graphs
function queryDatabase(name, main_folder, secondary_folder, createdAtUnix, value) {
    const client = new pg_1.default.Client(pg_config);
    client.connect(); // creates connection
    const query = `    
            INSERT INTO users (name, main_folder, secondary_folder, createdAtUnix, value) VALUES($1, $2, $3, $4, $5)           
    `;
    client.query(query, [name, main_folder, secondary_folder, createdAtUnix, value], (err, res) => {
        if (err)
            console.log(err.stack);
        client.end();
    });
}
// write to postgresql doctor register info
function write_registered_in_postgresql(type, fullname, email, telephone) {
    const client = new pg_1.default.Client(pg_config);
    client.connect(); // creates connection
    const query = `    
            INSERT INTO registered (type, fullname, email, telephone) VALUES($1, $2, $3, $4)           
    `;
    client.query(query, [type, fullname, email, telephone], (err, res) => {
        if (err)
            console.log(err.stack);
        client.end();
    });
}
// go to home doctor page
function home_page_doctor(res, doctor_name) {
    allUsers = [];
    (0, database_1.get)((0, database_1.child)(dbRef, `doctors/` + doctor_name + '/patients/')).then((snapshot) => {
        var allDataPatients = null;
        if (snapshot.val() != null)
            allDataPatients = Object.values(snapshot.val());
        for (var patientname in allDataPatients) {
            (0, database_1.get)((0, database_1.child)(dbRef, `users/` + patientname.replace(/[^a-z0-9]/gi, '') + `/`)).then((snapshotUsers) => {
                for (var section in snapshotUsers.val()) {
                    if (section != 'info')
                        for (var subsection in snapshotUsers.child(section).val()) {
                            for (var dirsubsection in snapshotUsers.child(section).child(subsection).val()) {
                                allUsers.push([patientname,
                                    section,
                                    subsection,
                                    snapshotUsers.child(patientname.replace(/[^a-z0-9]/gi, '')).child(section).child(subsection).child(dirsubsection).child('createdAtUnix').val(),
                                    snapshotUsers.child(patientname.replace(/[^a-z0-9]/gi, '')).child(section).child(subsection).child(dirsubsection).child('value').val()]);
                            }
                        }
                }
            });
        }
        (0, database_1.get)((0, database_1.child)(dbRef, `users/`)).then((snapshotUsers) => {
            var firebaseUsers = [];
            for (var el in snapshotUsers.val()) {
                firebaseUsers.push(snapshotUsers.child(el).child('info').child('email').val());
            }
            if (allDataPatients != null)
                firebaseUsers = firebaseUsers.filter(n => !allDataPatients.includes(n));
            res.render('home_doctor', { appName: "Vevaio", pageName: "Vevaio", data: allUsers, users: firebaseUsers, doctor_name: doctor_name });
        });
    });
}
function home_page_patient(res, userEmail, firstname) {
    firebase_admin_1.default.auth().getUserByEmail(userEmail)
        .then((userRecord) => {
        var dataItems = [];
        (0, database_1.get)((0, database_1.child)(dbRef, `users/` + userEmail.replace(/[^a-z0-9]/gi, ''))).then((snapshot) => {
            const allData = snapshot.val();
            for (var section in allData) {
                for (var subsection in snapshot.child(section).val()) {
                    for (var dirsubsection in snapshot.child(section).child(subsection).val()) {
                        dataItems.push([section,
                            subsection,
                            snapshot.child(section).child(subsection).child(dirsubsection).child('createdAtUnix').val(),
                            snapshot.child(section).child(subsection).child(dirsubsection).child('value').val()]);
                    }
                }
            }
            res.render('home_patient', { username: firstname, data: dataItems });
        });
    });
}
function getThryveDataSources(patientData, callback) {
    axios_1.default.post('https://api.und-gesund.de/v5/accessToken', qs_1.default.stringify(patientData), thryve_config)
        .then((restoken) => {
        const formData = {
            authenticationToken: restoken.data
        };
        axios_1.default.post('https://api.und-gesund.de/v5/userInformation', qs_1.default.stringify(formData), thryve_config)
            .then((resUserInfo) => {
            const thryveDataSources = resUserInfo.data[0].connectedSources;
            axios_1.default.post('https://api.und-gesund.de/v5/dataSourceURL', qs_1.default.stringify(formData), thryve_config)
                .then((ressources) => {
                return callback({ dataSources: thryveDataSources, url: ressources.data });
            })
                .catch((error) => {
                // Handle Errors here.  
                console.log(error.message);
            });
        })
            .catch((error) => {
            // Handle Errors here.  
            console.log(error.message);
        });
    })
        .catch((error) => {
        // Handle Errors here.  
        console.log(error.message);
    });
}
