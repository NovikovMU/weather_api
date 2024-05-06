const express = require('express');
const router = express.Router();
const logger = require('../../logger/loggers');
const { error } = require('winston');
require('dotenv').config();


function fetchWeatherData(lat, lon) {
    const apiName = 'locationforecast'
    const url =
        'https://api.met.no/weatherapi/' +
        apiName +
        '/2.0/compact?lat=' +
        lat +
        '&lon=' +
        lon +
        '&altitude=0';
    return fetch(url)
    .then(response => {
        if (!response.ok) {
            logger.error({
                'status': response.status,
                'text': response.statusText,
                'site': apiName
            })
            throw {
                message: response.statusText,
                status: response.status
            }
        }
        return response.json();
    })
}

function fetchCityData(lat, lon) {
    const BIG_DATA_API = process.env.BIG_DATA_API;
    const apiName = 'api-bdc.net';
    const url = 
    'https://' +
    apiName +
    '/data/reverse-geocode-with-timezone?latitude=' +
    lat +
    '&longitude=' +
    lon +
    '&localityLanguage=ru&key=' +
    // BIG_DATA_API;
    ''
    console.error(url)
    return fetch(url)
    .then(response => {
        if (!response.ok) {
            logger.error({
                'status': response.status,
                'text': response.statusText,
                'site': apiName
            })
            return {}
        }
        return response.json();
    })
}

function fetchLatLonData(country, city) {
    const apiName = 'openstreetmap.org'
    if (country) {
        country = 'country=' + country
    } else {country = ''}
    if (city) {
        city = '&city=' + city
    } else {city = ''}
    const url = 
    'https://nominatim.' +
    apiName +
    '/search?' +
    country +
    city +
        '&format=json';
    return fetch(url)
    .then(response => {
        if (!response.ok) {
            logger.error({
                'status': response.status,
                'text': response.statusText,
                'site': apiName
            })
            throw {
                message: response.statusText,
                status: response.status
            }
        }
        return response.json();
    })
}

function maintainData(lat, lon, demand_hour, city = null, point_name = null) {
    if (!lat || !lon) {
        throw Error('Отсутсвует значение широты или долготы.')
    }

    if (24 < demand_hour || demand_hour < 0) {
        throw new Error('Время должно быть в диапазоне [0: 24)')
    }

    if (!Number.isInteger(Number(demand_hour))) {
        throw new Error('Время должно быть целочисленным')
    }

    if (/[a-zA-Z]/g.test(lon)) {
        throw new Error('Значениче долготы должно быть числом')
    }

    if (/[a-zA-Z]/g.test(lat)) {
        throw new Error('Значениче широты должно быть числом')
    }

    if (-90 > lat || lat > 90) {
        throw new Error('Широта должна быть в диапазоне [-90:90]')
    }

    if (-180 > lon || lon > 180) {
        throw new Error('Долгота должна быть в диапазоне [-180:180]')
    }

    let offset = null
    let country = null
    let is_utc_time = true
    return Promise.all(
        [fetchWeatherData(lat, lon), fetchCityData(lat, lon)]
    )
    .then(([data1, data2]) => {
        let units = data1.properties.meta.units
        const timeseries_array = data1.properties.timeseries
        if (Object.keys(data2).length !== 0) {
            is_utc_time = false
            if (data2.city == '') {
                if (!point_name) {
                    point_name = data2.localityInfo.informative[0].name
                }
            } else {
                country = data2.countryName
                if (!city) {
                    city = data2.city
                }
                if (!point_name) {
                    point_name = city
                }
                offset = data2.timeZone.utcOffset
            }
        }
        let result_array = []
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
            if (demand_hour != Number(time_array[0])) {continue}
            let result_dict = {
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
            }
            if (element.data.next_1_hours) {
                result_dict[
                    'next hour'
                ] = element.data.next_1_hours.summary.symbol_code;
            }
            if (element.data.next_6_hours) {
                result_dict[
                    'next 6 hours'
                ] = element.data.next_6_hours.summary.symbol_code;
            }
            if (element.data.next_12_hours) {
                result_dict[
                    'next 12 hours'
                ] = element.data.next_12_hours.summary.symbol_code;
            }
            result_array.push(result_dict)
        }
        if (is_utc_time) {
            return {
                'is_utc_time': is_utc_time,
                'lat': lat,
                'lon': lon,
                'data': result_array
            }
        } else {
            return {
                'is_utc_time': is_utc_time,
                'country': country,
                'city': city,
                'point_name': point_name,
                'lat': lat,
                'lon': lon,
                'data': result_array
            }
        }
    })
}

router.get('/', (req, res, _) => {
    const lat = req.query.lat;
    const lon = req.query.lon;
    const demand_hour = req.query.demand_hour || 12;

    maintainData(lat, lon, demand_hour)
    .then(data => {
        res.status(200).json(data)
    })
    .catch(error => {
        return res.status(error.status).json({
            'error message': `${error.message}`,
        })
    })
})

router.get('/v1/', (req, res, _) => {
    const country = req.query.country;
    const city = req.query.city;
    const demand_hour = req.query.demand_hour || 12;
    if (!city && !country) {
        return res.status(404).json({
            'Error': 'Вы не написали ни город ни страну.'
        })
    }
    fetchLatLonData(country, city)
    .then(data => {
        
        let promisesArray = []
        // place
        for (let element of data) {
            if (element.class != 'place') { continue }
            let lat = element.lat
            let lon = element.lon
            let city_name = element.name
            let display_name = element.display_name
            promisesArray.push(maintainData(
                lat, lon, demand_hour, city_name, display_name
            ))
        }
        if (promisesArray.length === 0) {
            return res.status(404).json({
                'Error': 'По вашему запросу ничего не найдено'
            })
        }
        Promise.all(promisesArray)
        .then(resultArray => {
            return res.status(200).json({resultArray})
        })
    })
    .catch(error => {
        return res.status(error.status).json({
            'error message': `${error.message}`,
        })
    })
})
module.exports = router;
