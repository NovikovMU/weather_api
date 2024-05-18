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
    let offsetHour
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
            Словарь, в котором мы заносим значения ниже требуемого час и если
            в этот день не вставляли дату, то записывает среднее значение
            между нижним и верхним значениями часов
            */
            let isInsertInArray = false
            let lowerTemperature
            let upperTemperature
            // Делаем поправку на timezone, если есть.
            let reset_hour = 0
            if (!is_utc_time) {
                reset_hour = (24 + reset_hour + Number(offsetHour)) % 24
            }
            /*
            Получаем дату для обработки 23 часа, когда нет совпадений, т.к
            при переходе на новый день дата будет другой.
            */
            let data_for_23_hour = timeseries_array[0]
                .time.slice(0, -1)
                .split('T')[0]
            for (let element of timeseries_array) {
                let dateObject = new Date(element.time)
                if (!is_utc_time) {
                    dateObject = new Date(
                        dateObject.getTime() + offsetHour * 60 * 60 * 1000
                    )
                }
                let year = dateObject.getUTCFullYear();
                let day = String(dateObject.getUTCDate()).padStart(2, '0');
                let month = String(dateObject.getUTCMonth() + 1).padStart(2, '0');
                let date_array = `${year}-${month}-${day}`
                let hour = dateObject.getUTCHours()
                /*
                Обрабатываем ситуацию, когда нижнее значение есть, но
                верхнее значение не получили. Также обновляем значения.
                */
                if (date_array > data_for_23_hour) {
                    if (demand_hour < hour && !lowerTemperature) {
                        lowerTemperature = upperTemperature
                        upperTemperature =
                            element
                                .data
                                .instant
                                .details
                                .air_temperature
                        let temperature = (
                            upperTemperature + lowerTemperature
                        ) / 2
                        temperature = Number(temperature).toFixed(1)
                        let result_dict = {
                            'date':
                            date_array,
                            'temperature':
                            temperature +
                            ' ' +
                            units.air_temperature,
                        }
                        result_array.push(result_dict)
                        isInsertInArray = true
                        continue
                    }
                    if (demand_hour > hour && !upperTemperature && !isInsertInArray) {
                        upperTemperature =
                            element
                                .data
                                .instant
                                .details
                                .air_temperature
                        let temperature = (
                            upperTemperature + lowerTemperature
                        ) / 2
                        temperature = Number(temperature).toFixed(1)
                        let result_dict = {
                            'date':
                            'asdadsas',
                            'date':
                            data_for_23_hour,
                            'temperature':
                            temperature +
                            ' ' +
                            units.air_temperature,
                        }
                        result_array.push(result_dict)
                    }
                    isInsertInArray = false
                    upperTemperature = null
                    lowerTemperature = null
                    data_for_23_hour = date_array
                }
                if (demand_hour > hour) {
                    if (isInsertInArray) continue
                    lowerTemperature =
                        element
                            .data
                            .instant
                            .details
                            .air_temperature
                }
                else if (demand_hour == hour) {
                    let temperature =
                        element
                            .data
                            .instant
                            .details
                            .air_temperature
                    let result_dict = {
                        'date':
                        date_array,
                        'temperature':
                        temperature +
                        ' ' +
                        units.air_temperature,
                    }
                    result_array.push(result_dict)
                    isInsertInArray = true
                } else if (demand_hour < hour) {
                    if (isInsertInArray) continue
                    upperTemperature =
                        element
                            .data
                            .instant
                            .details
                            .air_temperature


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
                    let temperature = (
                        upperTemperature + lowerTemperature
                    ) / 2
                    temperature = Number(temperature).toFixed(1)
                    let result_dict = {
                        'date':
                        date_array,
                        'temperature':
                        temperature +
                        ' ' +
                        units.air_temperature,
                        'l' : lowerTemperature,
                        'u': upperTemperature
                    }
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