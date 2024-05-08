const express = require('express');
const app = express();
const morgan = require('morgan')
const swaggerUI = require("swagger-ui-express");
const swaggerJsDoc = require("swagger-jsdoc");
const rateLimit = require('express-rate-limit');

const weatherRouter = require('./api/routes/weathers');

const options = {
	definition: {
		openapi: "3.0.0",
		info: {
			title: "Weather API",
			version: "1.0.0",
			description: "A simple Express Weather API",
		},
		servers: [
			{
				url: "http://localhost:3000",
			},
		],
	},
	apis: ['./api/routes/*js'],
};
const specs = swaggerJsDoc(options);

app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(specs));
app.use(morgan('dev'))

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
        'Access-Control-Allow-Headers',
        'Authorization, Content-Length, X-Requested-With'
    );
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'GET');
        return res.send(200).json({});
    }
    next()
})

const limit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100 // 100 requests/hour
});

app.use('/api/v1', limit);

app.use('/api/v1', weatherRouter);

app.use((req, res, next) => {
    const error = new Error('Not Found');
    error.status = 404;
    next(error);
});

app.use((error, req, res, next) => {
    res.status(error.status || 500);
    res.json({
        error: {
            message: error.message
        }
    });
});

module.exports = app;
