from utils.responses import api_error
from routes.teacher import _notification_title


def test_api_error_exposes_codes_instead_of_server_language(app):
    with app.test_request_context('/'):
        response, status = api_error(
            'VALIDATION_ERROR',
            'Проверьте заполненные поля',
            422,
            [{'field': 'email', 'message': 'Укажите корректный email'}],
        )

    payload = response.get_json()['error']
    assert status == 422
    assert payload['code'] == 'VALIDATION_ERROR'
    assert payload['message_code'] == 'VALIDATION_ERROR'
    assert payload['message'] == 'VALIDATION_ERROR'
    assert payload['details'] == [{'field': 'email', 'code': 'VALIDATION_ERROR'}]
    assert 'Проверьте' not in response.get_data(as_text=True)


def test_generated_notification_titles_follow_recipient_locale():
    assert _notification_title('ru', 'assignment') == 'Новое назначение'
    assert _notification_title('kk', 'comment') == 'Мұғалімнің жаңа пікірі'
    assert _notification_title('en', 'announcement', '9A') == 'Announcement · 9A'
