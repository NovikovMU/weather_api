const logger = require('../logger/loggers');
require('dotenv').config();

/**
* @param {string} lat
* @param {string} lon
* @returns {Promise<object>}
*/
function fetchWeatherData(lat, lon) {
    const apiName = 'locationforecast'
    const endpoint =
        'https://api.met.no/weatherapi/' +
        apiName +
        '/2.0/compact?lat=' +
        lat +
        '&lon=' +
        lon +
        '&altitude=0';
    return fetch(endpoint)
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
* @returns {Promise<object> | Promise<null>}
*/

function fetchCityData(lat, lon) {
    const BIG_DATA_API = process.env.BIG_DATA_API;
    const apiName = 'api-bdc.net';
    const endpoint =
    'https://' +
    apiName +
    '/data/reverse-geocode-with-timezone?latitude=' +
    lat +
    '&longitude=' +
    lon +
    '&localityLanguage=ru&key=' +
    BIG_DATA_API;
    return fetch(endpoint)
        .then(response => {
            if (!response.ok) {
                logger.error({
                    'status': response.status,
                    'text': response.statusText,
                    'site': apiName
                })
                return
            }
            return response.json();
        })
        .catch(error => {
            return
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
    const endpoint =
    'https://nominatim.' +
    apiName +
    '/search?' +
    country +
    '&city=' + city +
    '&format=json';
    return fetch(endpoint)
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
 * @param {Date} dateObject
 * @param {Number} demand_hour
 * @param {Number} offsetHour
 * @param {Number} temperature
 * @param {object} units
 * @returns {object}
 */
function gather_result_to_array(
    dateObject, demand_hour, offsetHour, temperature, units
) {
    dateObject.setUTCHours(demand_hour)
    if (offsetHour) {
        dateObject = new Date(
            dateObject.getTime() + offsetHour * 60 * 60 * 1000
        );
    }
    let year = dateObject.getUTCFullYear();
    let month = String(dateObject.getUTCMonth() + 1).padStart(2, '0');
    let day = String(dateObject.getUTCDate()).padStart(2, '0');
    let date = `${year}-${month}-${day}`;
    let result_dict = {
        'date':
        date,
        'temperature':
        temperature +
        ' ' +
        units.air_temperature,
    }
    return result_dict
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

    let is_utc_time = true
    let offset
    let offsetHour = 0
    return Promise.all(
        [fetchWeatherData(lat, lon), fetchCityData(lat, lon)]
    )
        .then(([data1, data2]) => {
            let units = data1.properties.meta.units
            const timeseries_array = data1.properties.timeseries
            if (data2) {
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
                }
                offset = data2.timeZone.utcOffset
                offset = offset.split(':')
                offsetHour = Number(offset[0])
            }
            let result_array = []
            /*
            Заносим значения ниже и выше требуемого часа если совпадений нет и
            проверку, на запись в этот день или нет.
            */
            let isInsertInArray = false
            let lowerTemperature
            let upperTemperature
            if (!is_utc_time) {
                demand_hour = (24 + demand_hour - offsetHour) % 24
            }
            for (let element of timeseries_array) {
                let dateObject = new Date(element.time)
                let temperature = element.data.instant.details.air_temperature
                let hour = dateObject.getUTCHours()
                /*
                Обрабатываем ситуацию, когда нижнее значение есть, но
                верхнее значение не получили. Также обновляем значения.
                */
                if (hour == 0) {
                    if (!isInsertInArray && !upperTemperature) {
                        dateObject.setUTCDate(dateObject.getUTCDate() - 1)
                        upperTemperature = temperature
                        let middle_temperature = (
                            upperTemperature + lowerTemperature
                        ) / 2
                        middle_temperature = Number(
                            middle_temperature
                        ).toFixed(1)
                        let result_dict = gather_result_to_array(
                            dateObject,
                            demand_hour,
                            offsetHour,
                            middle_temperature,
                            units
                        )
                        result_array.push(result_dict)
                    }
                    isInsertInArray = false
                    upperTemperature = null
                    lowerTemperature = null
                }
                if (demand_hour > hour) {
                    if (isInsertInArray) continue
                    lowerTemperature = temperature
                }
                else if (demand_hour == hour) {
                    let result_dict = gather_result_to_array(
                        dateObject,
                        demand_hour,
                        offsetHour,
                        temperature,
                        units
                    )
                    result_array.push(result_dict)
                    isInsertInArray = true
                    continue
                } else {
                    if (isInsertInArray) continue
                    upperTemperature = temperature
                }
                /*
                Обрабатываем ситуацию, когда совпадений нет, но есть нижнее и
                верхние значения.
                */
                if (
                    !isInsertInArray &&
                    lowerTemperature &&
                    upperTemperature
                ) {
                    let middle_temperature = (
                        upperTemperature + lowerTemperature
                    ) / 2
                    middle_temperature = Number(middle_temperature).toFixed(1)
                    let result_dict = gather_result_to_array(
                        dateObject,
                        demand_hour,
                        offsetHour,
                        middle_temperature,
                        units
                    )
                    result_array.push(result_dict)
                    isInsertInArray = true
                }
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

module.exports = {fetchLatLonData, maintainData }