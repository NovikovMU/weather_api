const { createLogger, transports, format } = require('winston');

const customFormat = format.combine(
    format.timestamp(), format.printf((info) => {
        return (
            `${info.timestamp} - [${info.level.toUpperCase().padEnd(7)}] - ` +
            `Сайт ${info.message.site} не работает. ` +
            `Статус код - ${info.message.status}, ` +
            `Текст сообщения - ${info.message.text}`
        )
    }
));

const logger = createLogger({
    format: customFormat,
    transports : [
        new transports.File({
            filename: './logger/logfile.log',
            maxsize: 1000,
            maxFiles: 10,
            tailable: true
        })
    ]
});

module.exports = logger;
