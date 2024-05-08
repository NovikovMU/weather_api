const express = require('express');
const router = express.Router();
const { fetchLatLonData, maintainData } = require('../../logic/weather')
/**
* @swagger
* tags:
*   name: Weather
*   description: The weather API
*/

/**
 * @swagger
 * /api/v1/coordinates/:
 *   get:
 *     summary: Получение погоды
 *     description: Получение погоды по широте и долготе.
 *     tags: [Weather]
 *     parameters:
 *       - in: query
 *         name: lon
 *         schema:
 *           type: number
 *           format: float
 *           minimum: -180
 *           maximum: 180
 *         required: true
 *         description: Значение широты
 *       - in: query
 *         name: lat
 *         schema:
 *           type: number
 *           format: float
 *           minimum: -90
 *           maximum: 90
 *         required: true
 *         description: Значение долготы
 *       - in: query
 *         name: demand_hour
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 23
 *         required: false
 *         description: На какое время нужна погода. Необязательный параметр,
 *           дефолтное значение = 12 часов.
 *     responses:
 *       200:
 *         description: Запрос для широты 50 и долготы 51, когда сторонний
 *             api не работает
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 city:
 *                   type: string
 *                   nullable: true
 *                   example: null
 *                 country:
 *                   type: string
 *                   nullable: true
 *                   example: null
 *                 point_name:
 *                   type: string
 *                   nullable: true
 *                   example: null
 *                 is_utc_time:
 *                   type: boolean
 *                   example: true
 *                 lat:
 *                   type: number
 *                   example: 50
 *                 lon:
 *                   type: number
 *                   nullable: true
 *                   example: 51
 *                 data:
 *                   type: array
 *                   example: [object]
 *       400:
 *         description: Некорректный запрос
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Error message"
 *       404:
 *         description: Ресурс не найден
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Resource not found"
*/

router.get('/coordinates/', (req, res, next) => {
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

/**
 * @swagger
 * /api/v1/locations/:
 *   get:
 *     summary: Получение погоды
 *     description: Получение погоды по широте и долготе.
 *     tags: [Weather]
 *     parameters:
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *           required: true
 *         description: Город
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         required: false
 *         description: Страна
 *       - in: query
 *         name: demand_hour
 *         required: false
 *         description: На какое время нужна погода. Необязательный параметр
 *              дефолтное значение = 12 часов.
 *         schema:
 *           minimum: 0
 *           maximum: 23
 *           type: number
 *     responses:
 *       200:
 *         description: Запрос для Города Москва и Страна = Россия
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 city:
 *                   type: string
 *                   nullable: true
 *                   example: Москва
 *                 country:
 *                   type: string
 *                   nullable: true
 *                   example: Россия
 *                 point_name:
 *                   type: string
 *                   nullable: true
 *                   example: Москва, Центральный федеральный округ, Россия
 *                 is_utc_time:
 *                   type: boolean
 *                   example: true
 *                 lat:
 *                   type: number
 *                   example: 55.7505412
 *                 lon:
 *                   type: number
 *                   nullable: true
 *                   example: 37.6174782
 *                 data:
 *                   type: array
 *                   example: [object]
 *
 *       400:
 *         description: Некорректный запрос
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Error message"
 *       404:
 *         description: Ресурс не найден
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Resource not found"
 */
router.get('/locations/', (req, res, next) => {
    const country = req.query.country;
    const city = req.query.city;
    const demand_hour = req.query.demand_hour || 12;
    if (!city) {
        return res.status(400).json({
            'error': 'Вы не написали город.'
        })
    }
    fetchLatLonData(country, city)
        .then(data => {
            let promisesArray = []
            for (let element of data) {
                if (element.class != 'place') { continue }
                let lat = element.lat
                let lon = element.lon
                let city_name = element.name
                let display_name = element.display_name
                let country = element.display_name.split(' ').pop()
                promisesArray.push(maintainData(
                    lat, lon, demand_hour, country, city_name, display_name
                ))
            }
            if (promisesArray.length === 0) {
                return res.status(404).json({
                    'error': 'По вашему запросу ничего не найдено.'
                })
            }
            Promise.all(promisesArray)
                .then(resultArray => {
                    return res.status(200).json(resultArray)
                })
        })
        .catch(error => {
            return res.status(error.status).json({
                'error message': `${error.message}`,
            })
        })
})

// const fetch = require('node-fetch');
// router.get('/', (req, res, next) => {
//     fetch('https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=50&lon=55&altitude=0',
//         {
//             'Content-Type': 'application/json'
//         }
//     )
//         .then(response => {
//             if (!response.ok) {
//                 throw {
//                     message: response.statusText,
//                     status: response.status
//                 }
//             }
//             return response.json();
//         })
//         .then(response => {
//             console.error(response)
//             return res.status(200).json({
//                 'error ': `${response.properties.timeseries}`,
//             })
//         })
//         .catch(error => {
//             return res.status(error.status).json({
//                 'error message': `${error.message}`,
//             })
//         })
// })
module.exports = router;
