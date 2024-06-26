# weather_api

### Запуск локально

- Скачайте проект при помощи SSH:

```text
git clone git@github.com:NovikovMU/weather_api.git
```

- Создайте .env файл в папке telegram_bot:

```text
nano telegram_bot.env
```

- Далее надо создать телеграм бота через @BotFather, 
получить API и записать его

```text
BOT_API=<Ваш API ключ>
```

- Создайте .env файл в папке weather_api:

```text
nano weather_api.env
```

- Далее надо зарегестрироваться на сайте https://www.bigdatacloud.com/, 
получить API и записать его

```text
BIG_DATA_API=<Ваш API ключ>
```

- Скачайте docker desktop
- Запустите докер оркестр 

```text
docker compose up -d
```
- План обработки при обращении к action coordinates
![](https://github.com/NovikovMU/weather_api/blob/main/weather_api/photo/coordinates.png)

- План обработки при обращении к action locations
![](https://github.com/NovikovMU/weather_api/blob/main/weather_api/photo/locations.png)

### Endpoints для action

- '/api-docs/' показывает документацию к эндпоинтам
- '/coordinates/' показывает погоду по координатам
- '/locations/' показывает погоду по местоположению
