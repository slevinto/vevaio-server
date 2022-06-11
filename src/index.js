import express from 'express';
import {router} from './route.js';
import axios from 'axios';
import qs from 'qs';

const app = express();
const port = process.env.PORT;

app.set('view engine', 'pug');
app.set('views', './src/views');
console.log( 'wait for event...');
app.use('/', router);
app.use(express.json());
app.use(express.urlencoded());
const data = {
            authenticationToken: '2a94895e176b0116926cc95d011f1085',
            startTimestampUnix: '',
            endTimestampUnix: '',
            dataSources: '3',
            valueTypes: '1000,1200,3000',
            detailed: 'true',
            displayTypeName: 'true'
        };

    const config = {
            headers: {
                'Authorization': 'Basic dmV2YWlvLWFwaTpUTng4Yzl3NXNadndYcUpo',
                'Content-Type': 'application/x-www-form-urlencoded',
                'AppAuthorization': 'Basic Z0g4eTlaS1VFMmZrdGtaVzo5ekxZaFAyN3FrZVZSYkY3azk1VHpEQ1pMQXpLTGpSWFQ1TmZnQTlNdUtjUjJ1RllxTnIyRHNBbmY5eGJIVmY5'
            }
        };    
    
    app.post( '/', ( req, res ) => {
        console.log( 'received webhook\n', qs.parse(req.body));
        
        try {
            const startTimestampUnix = req.body.sourceUpdate.startTimestampUnix
            console.log( 'received startTimestampUnix\n', startTimestampUnix)
            const endTimestampUnix = req.body.sourceUpdate.endTimestampUnix
            console.log( 'received endTimestampUnix\n', endTimestampUnix) 
            const authenticationToken = req.body.sourceUpdate.authenticationToken
            console.log( 'received authenticationToken\n', authenticationToken) 
            data.startTimestampUnix = startTimestampUnix
            data.endTimestampUnix = endTimestampUnix
        }
        catch {}
        
        axios.post(
            'https://api.und-gesund.de/v5/dynamicEpochValues',
            qs.stringify(data),
            config,
        ).then((res) => {
            console.log("RESPONSE RECEIVED: ", res.data);
            res.data.forEach(dataSource => {
                console.log("received dataSource: ", dataSource); 
                dataSource.dataSources.forEach(dataElem => {
                    console.log("received dataSource data: ", qs.parse(dataElem.data)); 
                });             
                console.log("received token: ", qs.parse(dataSource.authenticationToken));                
            });
        }).catch(function (error) {
            console.log("ERROR RECEIVED: ", error);
        });

    res.sendStatus( 200 );
})

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));