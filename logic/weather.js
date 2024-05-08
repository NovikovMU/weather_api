const logger = require('../logger/loggers');
require('dotenv').config();
const fetch = require('node-fetch');

/**
* @param {string} lat
* @param {string} lon
* @returns {Promise<object>}
*/
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

/**
* @param {string} lat
* @param {string} lon
* @returns {Promise<object>}
*/
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
    BIG_DATA_API;

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

/**
* @param {string} country
* @param {string} city
* @returns {Promise<object>}
*/
function fetchLatLonData(country, city) {
    const apiName = 'openstreetmap.org'
    if (country) {
        country = 'country=' + country
    } else {country = ''}
    const url =
    'https://nominatim.' +
    apiName +
    '/search?' +
    country +
    '&city=' + city +
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

/**
 *
 * @param {string} lat
 * @param {string} lon
 * @param {string} demand_hour
 * @param {string | null} country
 * @param {string | null} city
 * @param {string | null} point_name
 * @returns {object}
 */
function maintainData(
    lat, lon, demand_hour, country=null, city=null, point_name=null
) {
    if (!lon) {
        throw {
            message: 'Отсутсвует значение долготы.',
            status: 400
        }
    }

    if (!lat) {
        throw {
            message: 'Отсутсвует значение широты.',
            status: 400
        }
    }

    if (24 < demand_hour || demand_hour < 0) {
        throw {
            message: 'Время должно быть в диапазоне [0: 24).',
            status: 400
        }
    }

    if (!Number.isInteger(Number(demand_hour))) {
        throw {
            message: 'Время должно быть целочисленным.',
            status: 400
        }
    }

    if (/[a-zA-Z]/g.test(lon)) {
        throw {
            message: 'Значениче долготы должно быть числом.',
            status: 400
        }
    }

    if (/[a-zA-Z]/g.test(lat)) {
        throw {
            message: 'Значениче широты должно быть числом.',
            status: 400
        }
    }

    if (-90 > lat || lat > 90) {
        throw {
            message: 'Широта должна быть в диапазоне [-90:90].',
            status: 400
        }
    }

    if (-180 > lon || lon > 180) {
        throw {
            message: 'Долгота должна быть в диапазоне [-180:180].',
            status: 400
        }
    }

    let offset = null
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
            let result = {};
            result['city'] = city;
            result['country'] = country;
            result['point_name'] = point_name;
            result['is_utc_time'] = is_utc_time;
            result['lat'] = Number(lat);
            result['lon'] = Number(lon);
            result['data'] = result_array;
            return result
        })
}

module.exports = {fetchLatLonData, maintainData}