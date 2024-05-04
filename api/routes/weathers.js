const express = require('express');
const router = express.Router();

require('dotenv').config();


function fetchData(lat, lon) {
    const apiName = 'locationforecast'
    const url =
        'https://api.met.no/weatherapi/' + apiName +
        '/2.0/compact?lat=' + lat +
        '&lon=' + lon + '&altitude=0';
    return fetch(url)
    .then(response => {
        if (!response.ok) {
            throw {
                error: new Error(`Error while fetch from ${apiName}`),
                status: response.status,
                message: response.statusText,
            }
        }
        return response.json();
    })
}

// function fetchLatLon(url) {
//     return fetch(url)
//     .then(response => {
//         if (!response.ok) {
//             const apiName = url.split('/')[0];
//             throw {
//                 error: new Error(`Error while fetch from ${apiName}`),
//                 status: response.status,
//                 message: response.statusText,
//             }
//         }
//         return response.json();
//     })
// }


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
                status: response.status,
                message: response.statusText,
            }
        }
        return response.json();
    })
    .catch(error => {
        return {}
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
        res.status(404).json({
            'Errors': `${error.status}`,
            'Errorsm': `${error.message}`,
            'Err': `${error.error.message}`,
        });
    });
    // const lat = req.params.lat;
    // res.status(200).json({
    //     'Response': lat
    // });
});


router.get('/', (req, res, next) => {
    let offset = null
    let city = null
    let country = null

    const lat = req.query.lat;
    const lon = req.query.lon;
    const demand_hour = req.query.demand_hour || 12;
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

    Promise.all([fetchData(lat, lon), fetchCityData(5000, lon)])
    .then(([data1, data2]) => {
        let units = data1.properties.meta.units
        console.error(units)
        const timeseries_array = data1.properties.timeseries
        if (Object.keys(data2).length !== 0) {
            city = data2.city
            country = data2.countryName
            offset = data2.timeZone.utcOffset
        }
        var result_array = []
        for (let element of timeseries_array) {
            let element_time = element.time.slice(0, -1)
            let date_time = element_time.split('T')
            let date = date_time[0]
            let time_array = date_time[1].split(':')
            if (offset) {
                time_array[0] = (
                    24 + Number(time_array[0]) + Number(offset)
                ) % 24
            }
            if (demand_hour == Number(time_array[0])) {
                result_array.push({
                    'date': date,
                    'time': time_array.join(':'),
                    'temerature':
                        element.data.instant.details.air_temperature +
                        ' ' +
                        units.air_temperature,
                    'wind speed': 
                        element.data.instant.details.wind_speed +
                        ' ' +
                        units.wind_speed,
                    // 'next hour' :
                    //     element.data.next_1_hours.summary.symbol_code,
                    // 'next 6 hours' :
                    //     element.data.next_6_hours.summary.symbol_code,
                    // 'next 12 hours' :
                    //     element.data.next_12_hours.summary.symbol_code
                })
            }
        }
        res.status(200).json(result_array)

        
    })
    .catch(error => {
        if (error.error) {
            res.status(error.status).json({
                'error': `${error.error.message}`,
                'error message': `${error.message}`,
            })
        }
        else {
            res.status(400).json({
                'error name': `${error.name}`,
                'error message': `${error.message}`,
            })
        }
    })
})

module.exports = router;