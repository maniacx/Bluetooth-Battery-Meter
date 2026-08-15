# Разработка и отладка GNOME Shell Extension

## Когда использовать nested GNOME Shell

Расширение загружается в процесс GNOME Shell, а GJS не может выгрузить
изменённые JavaScript-модули. Поэтому Disable/Enable через D-Bus в `install.sh`
подходит для быстрой проверки, но после ошибки импорта или при проверке чистого
состояния не заменяет новый процесс Shell.

Для изолированной проверки UI и Shell-кода в Wayland используйте nested Shell.
Он запускается в отдельной D-Bus-сессии и не перезапускает основной рабочий
сеанс. Nested Shell не является полностью изолированной средой: не используйте
его для рискованных операций с пользовательскими данными или системными
настройками.

## Требования

- Активный Wayland-сеанс.
- GNOME Shell и версия расширения, совместимая с тестируемой версией Shell.
- Development Kit Mutter: пакет обычно называется `mutter-devkit` (Fedora,
  Arch) или `mutter-dev-bin` (Ubuntu). Установку системных пакетов выполняйте
  только после отдельного подтверждения.

Проверка доступности команды:

```sh
command -v gnome-shell
gnome-shell --version
```

## Запуск

GNOME Shell 49 и новее:

```sh
G_MESSAGES_DEBUG=all SHELL_DEBUG=backtrace-warnings \
  dbus-run-session gnome-shell --devkit --wayland
```

GNOME Shell 48 и старее:

```sh
G_MESSAGES_DEBUG=all SHELL_DEBUG=backtrace-warnings \
  dbus-run-session gnome-shell --nested --wayland
```

Команда создаст окно вложенного рабочего стола. Терминал, из которого она
запущена, содержит логи GNOME Shell и JavaScript stack trace для
`console.warn()` и `console.error()`.

## Рабочий цикл

1. Запустите nested Shell из отдельного терминала.
2. Установите или включите тестируемую версию расширения в nested-сеансе.
3. Выполните проверку сценария и проанализируйте вывод исходного терминала.
4. Закройте окно nested Shell или завершите его через `Ctrl+C`.
5. После изменения JavaScript повторно создайте nested Shell, чтобы гарантировать чистое состояние модулей.

Для обычной локальной установки используйте `./install.sh`: он запускает
headless-тесты, повышает `metadata.json.version`, устанавливает расширение,
перезапускает его через GNOME Shell D-Bus и проверяет версию по service log.
После каждого перезапуска проверьте `${TMPDIR:-/tmp}/bluetooth_battery_meter/service.log`:
он должен содержать `Initializing Bluetooth Battery Meter version=<ожидаемая версия>`.
Если остаётся старая версия, выполните logout/login и повторите проверку лога.

## Дополнительная диагностика

- В nested Shell откройте Looking Glass: `Alt+F2`, затем `lg`.
- Используйте `console.debug()` только для временной диагностической информации;
  unexpected errors логируйте через `console.warn()` или `console.error()`.
- Для полной трассировки предупреждений и аварий вместо
  `SHELL_DEBUG=backtrace-warnings` задайте `SHELL_DEBUG=all`.

## Источники

- [GJS Guide: Debugging](https://gjs.guide/extensions/development/debugging.html)
- [GJS Guide: Testing Extensions](https://gjs.guide/extensions/development/creating.html)
