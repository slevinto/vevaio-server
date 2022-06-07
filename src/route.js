import express from 'express';
import axios from 'axios';

var router = express.Router();

// Home page route.
router.get('/', (req, res) => {
    const apiUrl = "https://api.covid19api.com/summary";
    const countries = axios.get(apiUrl).then((response) => {
        res.render("home", {
          appName: "My COVID-19 Tracker",
          pageName: "COVID-19 Cases",
          data: response.data.Countries,
        });
      })
      .catch(function (err) {
        return console.error(err);
      });  
})

// About page route.
router.get('/about', function (req, res) {
  res.render("about", { title: "About" });
})

export {router};

