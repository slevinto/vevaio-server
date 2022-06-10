import express from 'express';
import {router} from './route.js';
import axios from 'axios';

const app = express();
const port = process.env.PORT;

app.set('view engine', 'pug');
app.set('views', './src/views');
console.log( 'wait for event...');
app.use('/', router);
app.use(express.json());
app.use(express.urlencoded());
app.post( '/', ( req, res ) => {
    console.log( 'received webhook\n', req.body );

    axios({
        method: 'post',
        url: 'https://api.und-gesund.de/v5/dynamicEpochValues',
        data: {
            authenticationToken: 'ae664cd0264a712251117d5d12bd8281',
            startTimestamp: '2022-06-09T00:00:00+01:00',
            endTimestamp: '2022-06-09T19:00:00+01:00',
            startTimestampUnix: '1654732800000',
            endTimestampUnix: '1654801200000',
            dataSources: '3',
            valueTypes: '1000,1200',
        },
        auth: {
            Authorization: 'Basic dmV2YWlvLWFwaTpUTng4Yzl3NXNadndYcUpo'
        },
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'AppAuthorization': 'Basic eEhiRFQyN1hmc3duNlk0SjpqdGdGd2FjQzlERlhKd0dhQlpuWDNLTmdiWWc1SlNZZlo1dmY3Wnd4RGpER2tnRUdwN1JaN1c0SFgzMlJwNGFm'
        }
      }).then((res) => {
        console.log("RESPONSE RECEIVED: ", res);
      });

    res.sendStatus( 200 );
})

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));