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
5. Каждая новая сборка выполняется только через `./install.sh`. Скрипт увеличивает
   целочисленную версию в `metadata.json` перед упаковкой, поэтому у каждого package
   есть собственная версия.
6. Для отладки не выполняйте logout/login: `./install.sh` устанавливает package и
   вызывает `DisableExtension` + `EnableExtension` через session D-Bus. При
   доступной активной GNOME Shell это немедленно перезапускает расширение.
7. Версия активируемой сборки записывается как `version=<number>` в
   `/tmp/bluetooth_battery_meter/service.log`. Сверяйте её перед разбором логов.
8. После каждого горячего restart обязательно проверяйте
   `/tmp/bluetooth_battery_meter/service.log`: должна появиться строка
   `Initializing Bluetooth Battery Meter version=<новая версия>`. Отсутствие
   строки или старая версия означает, что GNOME Shell не загрузила новый код;
   в этом случае требуется logout/login до продолжения отладки.

Не обходите тестовый шаг при обычной разработке. Исключение допускается только
для отдельно зафиксированной диагностики окружения, не изменяющей production
файлы.

## Hot Reload / Горячая переустановка

```sh
./install.sh
```

Команда запускает tests, повышает `metadata.json.version`, собирает ZIP, выполняет
`gnome-extensions install --force`, затем перезапускает extension через
`DisableExtension` + `EnableExtension` в session D-Bus активной GNOME Shell. Это не
требует logout/login. После restart скрипт ожидает в diagnostic log старт новой
версии. При отсутствии записи script сообщает, что необходимо выполнить
logout/login. Если session D-Bus недоступен, package останется установленным, а
причина будет выведена скриптом.

## Покрытие / Coverage

- `tests/test-contracts.js`: metadata, разрешение локальных JavaScript imports и
  соответствие всех используемых GSettings keys XML schema.
- `tests/test-device-list.js`: чтение, запись и history sorting сохранённого
  списка Bluetooth devices.
- `tests/test-quick-settings.js`: ожидание готовности Bluetooth toggle во время
  асинхронной инициализации GNOME Shell.
- `tests/test-opov1.js`: varint, OPOv1 packet/frame codec, streamed input и
  malformed frame handling.
- `tests/test-oneplus.js`: MAC-first confirmed detection, UUID-gated generic
  detection, separate left/right/case battery and presence state, unknown packet
  safety and ANC bitmap codec.

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
