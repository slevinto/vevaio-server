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
            authenticationToken: 'ae664cd0264a712251117d5d12bd8281',
            startTimestampUnix: '1654732800000',
            endTimestampUnix: '1654801200000',
            dataSources: '3',
            valueTypes: '1000,1200',
            detailed: 'true',
            displayTypeName: 'true'
        };

    const config = {
            headers: {
                'Authorization': 'Basic dmV2YWlvLWFwaTpUTng4Yzl3NXNadndYcUpo',
                'Content-Type': 'application/x-www-form-urlencoded',
                'AppAuthorization': 'Basic eEhiRFQyN1hmc3duNlk0SjpqdGdGd2FjQzlERlhKd0dhQlpuWDNLTmdiWWc1SlNZZlo1dmY3Wnd4RGpER2tnRUdwN1JaN1c0SFgzMlJwNGFm'
            }
        };    
    
    app.post( '/', ( req, res ) => {
        console.log( 'received webhook\n', req.body );
        
        try {
            const startTimestampUnix = req.body.sourceUpdate.startTimestampUnix
            console.log( 'received startTimestampUnix\n', startTimestampUnix);
            const endTimestampUnix = req.body.sourceUpdate.endTimestampUnix
            console.log( 'received endTimestampUnix\n', endTimestampUnix); 
            const authenticationToken = req.body.sourceUpdate.authenticationToken
            console.log( 'received authenticationToken\n', authenticationToken); 
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
                dataSource.data.forEach(element => {
                    console.log("received dynamicValueType: ", element);
                });
            });
        }).catch(function (error) {
            console.log("ERROR RECEIVED: ", error);
        });

    res.sendStatus( 200 );
})

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));