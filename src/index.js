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
    res.sendStatus( 200 );
})

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));