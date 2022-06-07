import express from 'express';
import {router} from './route.js';

const app = express();
const port = 3000;

app.set('view engine', 'pug');
app.set('views', './src/views');

app.use('/', router);

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));