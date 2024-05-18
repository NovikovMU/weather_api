import os
import json
from dotenv import load_dotenv
import requests
import telebot
from telebot import types

load_dotenv()
bot_token = os.getenv('BOT_API')
bot = telebot.TeleBot(bot_token)


def maintenance_respone_json(result_json: dict) -> str:
    data = result_json['data']
    response = ''
    city = result_json["city"]
    country = result_json["country"]
    is_utc_time = result_json['is_utc_time']
    if not is_utc_time:
        first_part = 'Время местное.'
    else:
        first_part = 'Время UTC.'
    if not city:
        point_name = result_json["point_name"]
        second_part = f'Погода в {point_name}'
    else:
        second_part = (
            f'Погода в стране {country} городе {city}'
        )
    for element in data:
        response += (
            f'на дату {element["date"]} \n температура - ' +
            f'{element["temperature"]}. \n'
        )
    response_text = (
        f'{first_part} {second_part} \n {response}'
    )
    return response_text


@bot.message_handler(commands=['start'])
def start(message: types.Message):
    text = (
        'Привет этот бот умеет показывать погоду по координатам (введите '
        'команду "/coordinates") и по названию городов (введите команду '
        '"/locations")'
    )
    bot.send_message(message.chat.id, text)


@bot.message_handler(commands=['coordinates'])
def coordinates(message: types.Message):
    text = (
        'Введите через пробел ширину (lat) и долготу (lon) числом. \n'
        'Если хотите получить погоду в определённое время, введите во '
        'сколько часов вы хотите получить прогноз погоды (целым числом, если '
        'число не ввели прогноз погоды будет показывать на 12 часов дня). \n'
        'Пример: 60 50 19 \n'
        'Покажет погоду в точке с координатами lat=60, lon=50 19 часов.'
    )
    bot.send_message(message.chat.id, text)
    bot.register_next_step_handler(message, get_weather_by_coordinates)


def get_weather_by_coordinates(message: types.Message):
    text = message.text.split()
    # check if user call base function
    next_function = command_function.get(text[0])
    if next_function:
        next_function(message)
        return
    if 2 > len(text) or len(text) > 3:
        response_text = (
            'введите данные корректно (максимум 3 значения, минимум 2)'
        )
        bot.send_message(message.chat.id, response_text)
        bot.register_next_step_handler(message, get_weather_by_coordinates)
        return
    if len(text) == 3:
        demand_hour = text[2]
        try:
            num = int(demand_hour)
            if num != float(demand_hour):
                bot.send_message(
                    message.chat.id, 'Время должно быть целочисленным'
                )
                bot.register_next_step_handler(
                    message, get_weather_by_coordinates
                )
                return
            if 0 > num or num > 23:
                bot.send_message(
                    message.chat.id, 'Время должно быть в диапазоне [0: 24).'
                )
                bot.register_next_step_handler(
                    message, get_weather_by_coordinates
                )
                return
        except ValueError:
            bot.send_message(
                    message.chat.id, 'Время должно быть целочисленным'
                )
            bot.register_next_step_handler(
                message, get_weather_by_coordinates
            )
            return
    else:
        demand_hour = ''
    try:
        lat = float(text[0])
        lon = float(text[1])
    except ValueError:
        bot.send_message(
            message.chat.id, 'И ширина и долгота должны быть числами'
        )
        bot.register_next_step_handler(message, get_weather_by_coordinates)
        return
    if -90 > lat or lat > 90:
        bot.send_message(
            message.chat.id, 'Широта должна быть в диапазоне [-90:90].'
        )
        bot.register_next_step_handler(message, get_weather_by_coordinates)
        return
    if -180 > lon or lon > 180:
        bot.send_message(
            message.chat.id, 'Долгота должна быть в диапазоне [-180:180].'
        )
        bot.register_next_step_handler(message, get_weather_by_coordinates)
        return
    url = (
        f'http://weather_api:3000/api/v1/coordinates/?lat={lat}&lon={lon}' +
        f'&demand_hour={demand_hour}'
    )
    response = requests.get(url)
    if response.status_code != 200:
        bot.send_message(message.chat.id, response.text)
        return
    result_json = json.loads(response.text)
    response_text = maintenance_respone_json(result_json)
    bot.send_message(message.chat.id, response_text)


@bot.message_handler(commands=['locations'])
def locations(message: types.Message):
    text = (
        'Введите через пробел город (city) и страну (country, '
        'необязательно) Программа может выдать больше одного города без '
        'конкретной страны. \n'
        'Если хотите получить погоду в определённое время, введите во '
        'сколько часов вы хотите получить прогноз погоды (целым числом, если '
        'число не ввели прогноз погоды будет показывать на 12 часов дня). \n'
        'Пример: Москва Россия \n'
        'Покажет погоду в городе Москве в стране, Россия в 12 часов.'
    )
    bot.send_message(message.chat.id, text)
    bot.register_next_step_handler(message, get_weather_by_location)


def get_weather_by_location(message: types.Message):
    text = message.text.split()
    # check if user call base function
    next_function = command_function.get(text[0])
    if next_function:
        next_function(message)
        return
    if 1 > len(text) or len(text) > 3:
        response_text = (
            'Введите данные корректно (максимум 3 значения, минимум 1)'
        )
        bot.send_message(message.chat.id, response_text)
        bot.register_next_step_handler(message, get_weather_by_location)
        return
    if len(text) == 3:
        demand_hour = text[2]
        try:
            num = int(demand_hour)
            if num != float(demand_hour):
                bot.send_message(
                    message.chat.id, 'Время должно быть целочисленным'
                )
                bot.register_next_step_handler(
                    message, get_weather_by_coordinates
                )
                return
            if 0 > num or num > 23:
                bot.send_message(
                    message.chat.id, 'Время должно быть в диапазоне [0: 24).'
                )
                bot.register_next_step_handler(
                    message, get_weather_by_coordinates
                )
                return
        except ValueError:
            bot.send_message(
                    message.chat.id, 'Время должно быть целочисленным'
                )
            bot.register_next_step_handler(
                message, get_weather_by_coordinates
            )
            return
    else:
        demand_hour = ''
    city = text[0]
    try:
        country = text[1]
    except IndexError:
        country = ''
    url = (
        f'http://weather_api:3000/api/v1/locations/?&city={city}&' +
        f'country={country}&demand_hour={demand_hour}'
    )
    response = requests.get(url)
    if response.status_code != 200:
        bot.send_message(message.chat.id, response.text)
        return
    result_json = json.loads(response.text)
    for element in result_json:
        result = maintenance_respone_json(element)
        bot.send_message(message.chat.id, result)


command_function = {
    '/coordinates': coordinates,
    '/locations': locations,
}

bot.polling(non_stop=True)
