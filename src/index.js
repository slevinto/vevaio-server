import express from 'express';
import {router} from './route.js';

const app = express();
const port = 9000;

app.set('view engine', 'pug');
app.set('views', './src/views');

app.use('/', router);

app.post( '/', ( req, res ) => {
    console.log( 'received webhook', req.body );
    res.sendStatus( 200 );
})

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));