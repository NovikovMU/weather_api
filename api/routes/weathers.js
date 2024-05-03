const express = require('express');
const router = express.Router();

require('dotenv').config();

function fetchData(lat, lon) {
    const apiName = 'locationforecast'
    const url =
        'https://api.met.no/weatherapi/' + apiName +
        '/2.0/compact?lat=' + lat +
        '&lon=' + lon + '&altitude=0';
    console.error(url)
    return fetch(url)
    .then(response => {
        if (!response.ok) {
            throw {
                error: new Error(`Error while fetch from ${apiName}`),
                foo: response.status,
                mes: response.statusText,
            }
        }
        return response.json();
    })
}

function fetchLatLon(url) {
    return fetch(url)
    .then(response => {
        if (!response.ok) {
            const apiName = url.split('/')[0];
            throw {
                error: new Error(`Error while fetch from ${apiName}`),
                foo: response.status,
                mes: response.statusText,
            }
        }
        return response.json();
    })
}


function fetchCityData(lat, lon) {
    const BIG_DATA_API = process.env.BIG_DATA_API;
    const apiName = 'api-bdc.net';
    const url = 
        'https://' + apiName +
        '/data/reverse-geocode-with-timezone?latitude=' +
        lat + '&longitude=' +
        lon + '&localityLanguage=ru&key=' +
        BIG_DATA_API;
    return fetch(url)
    .then(response => {
        if (!response.ok) {
            throw {
                error: new Error(`Error while fetch from ${apiName}`),
                foo: response.status,
                mes: response.statusText,
            }
        }
        return response.json();
    })
}

router.get('/get_weather/', (req, res, next) => {
    fetchData(50, 50)
    .then(data => {
        // Обработка полученных данных
        res.status(200).json(data);
    })
    
    .catch(error => {
        // Обработка ошибки
        // console.log(error.statuscode)
        res.status(404).json({
            'Errors': `${error.foo}`,
            'Errorsm': `${error.mes}`,
            'Err': `${error.error.message}`,
        });
    });
    // const lat = req.params.lat;
    // res.status(200).json({
    //     'Response': lat
    // });
});


router.get('/', (req, res, next) => {
    let offset
    let city
    let country
    const lat = req.query.lat
    const lon = req.query.lon
    if (!lat || !lon) {
        return res.status(400).json({
            'Error': 'отсутсвует значение широты или долготы.'
        })
    }

    if (/[a-zA-Z]/g.test(lon)) {
        return res.status(400).json({
            'Error': 'Значениче долготы должно быть числом'
        })
    }

    if (/[a-zA-Z]/g.test(lat)) {
        return res.status(400).json({
            'Error': 'Значениче широты должно быть числом'
        })
    }

    if (-90 > lat || lat > 90) {
        return res.status(400).json({
            'Error': 'Широта должна быть в диапазоне [-90:90]'
        })
    }

    if (-180 > lon || lon > 180) {
        return res.status(400).json({
            'Error': 'Долгота должна быть в диапазоне [-180:180]'
        })
    }

    fetchCityData(lat, lon)
    .then(data => {
        city = data.city
        country = data.countryName
        offset = data.utcOffset
        
    })
    .catch(error => {
        res.status(error.foo).json({
            'error': `${error.error.message}`,
            'error message': `${error.mes}`
        })
    })
    res.status(200).json({'data': 'asdads'})
    // fetchData(lat, lon)
    // .then(data => {
    //     res.status(200).json({
    //         'data': data
    //     })
    // })

})

module.exports = router;