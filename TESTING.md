# Headless Testing / Тестирование без GNOME

`tests/run-tests.sh` проверяет расширение без его установки, активной GNOME Shell
сессии, BlueZ daemon и Bluetooth-устройств. Набор выполняется в GJS, то есть в том
же JavaScript runtime, который использует расширение.

## Запуск / Run

```sh
tests/run-tests.sh
```

Runner сначала компилирует GSettings schema в строгом режиме, затем запускает
`tests/test-suite.js` через `gjs -m`. Проверка не записывает пользовательские
GSettings и не создаёт внешние подключения.

## Обязательный Workflow / Required Workflow

1. После каждого изменения исходного кода, schema, UI или settings запускайте
   `tests/run-tests.sh` для подтверждения отсутствия регрессии.
2. Перед сборкой extension package тесты обязательны. `install.sh` автоматически
   запускает `tests/run-tests.sh` и прерывает упаковку при любой ошибке.
3. Новый production-код должен сопровождаться новыми тестами; изменение
   существующего поведения требует обновления соответствующих тестов.
4. Исправление дефекта сначала получает тест, воспроизводящий ошибку, затем код
   исправления. Это сохраняет проверку от повторной регрессии.
5. После завершения изменений автоматически запускайте `./install.sh`. Скрипт
   запускает headless tests, увеличивает целочисленную версию в `metadata.json`,
   собирает готовый к тестированию package и устанавливает его, поэтому у каждой
   сборки есть собственная версия.
6. `./install.sh` только устанавливает package. После установки выполните
   logout/login, чтобы GNOME Shell гарантированно загрузила новый JavaScript-код.
7. Версия загруженной сборки записывается как `version=<number>` в
   `/tmp/bluetooth_battery_meter/service.log`. Сверяйте её перед разбором логов.
8. После входа в новый GNOME-сеанс обязательно проверяйте
   `/tmp/bluetooth_battery_meter/service.log`: должна появиться строка
   `Initializing Bluetooth Battery Meter version=<новая версия>`. Отсутствие
   строки или старая версия означает, что GNOME Shell не загрузила новый код.

Не обходите тестовый шаг при обычной разработке. Исключение допускается только
для отдельно зафиксированной диагностики окружения, не изменяющей production
файлы.

## Установка новой сборки / Installing a New Build

```sh
./install.sh
```

Команда запускает tests, повышает `metadata.json.version`, собирает ZIP и выполняет
`gnome-extensions install --force`. Скрипт намеренно не пытается перезапустить
расширение через D-Bus: GNOME Shell может удерживать старые GJS-модули после такого
переключения. После успешной установки выйдите из GNOME-сеанса и войдите снова, затем
сверьте запуск новой версии по diagnostic log.

## Покрытие / Coverage

- `tests/test-contracts.js`: metadata, разрешение локальных JavaScript imports и
  соответствие всех используемых GSettings keys XML schema.
- `tests/test-device-list.js`: чтение, запись и history sorting сохранённого
  списка Bluetooth devices.
- `tests/test-quick-settings.js`: ожидание готовности Bluetooth toggle во время
  асинхронной инициализации GNOME Shell.
- `tests/test-opov1.js`: varint, OPOv1 packet/frame codec, streamed input и
  malformed frame handling.
- `tests/test-oneplus.js`: MAC-first confirmed and UUID-gated generic OPOv1
  detection, shared left/right/case battery state, unknown packet safety and the
  OnePlus Buds Pro 3 ANC bitmap codec.

## Adding A Device Profile / Новый профиль устройства

Каждый профиль должен иметь headless tests для detector result (`yes`, `no`,
`pending`, если применимо), сохранения GSettings, и protocol decoder. Protocol
tests должны содержать положительные fixtures и malformed/unknown input, который
не меняет battery state. Добавляйте независимую от Shell логику в чистые ES
modules, чтобы её можно было импортировать из `tests/` без `gi://` и
`resource:///`.

## Границы / Limits

Headless tests не заменяют smoke test внутри настоящей GNOME Shell: они не могут
проверить private Shell APIs, визуальный layout `St` widgets, D-Bus BlueZ или
RFCOMM. Они защищают contracts и доменную логику до ручного GNOME прогона.

Для smoke test временно отключите сторонние расширения, изменяющие Quick Settings.
Они используют те же private Shell APIs и могут удалять или разрушать системные
элементы до запуска Bluetooth Battery Meter.
