import express from 'express';
import {router} from './route.js';

const app = express();
const port = process.env.PORT;

app.set('view engine', 'pug');
app.set('views', './src/views');
console.log( 'wait for event...');
app.use('/', router);

app.post( '/', ( req, res ) => {
    console.log( 'received webhook', req.body );
    res.sendStatus( 200 );
})

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));