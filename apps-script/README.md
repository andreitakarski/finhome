# Finhome Apps Script

Содержимое `Code.gs` нужно скопировать в привязанный к таблице проект Google Apps Script.

В настройках проекта добавьте Script Properties:

- `SPREADSHEET_ID` — ID таблицы;
- `GOOGLE_CLIENT_ID` — OAuth Client ID веб-приложения;
- `ALLOWED_EMAIL` — единственный Google email, которому разрешена синхронизация.

После сохранения запустите функцию `doGet` из редактора один раз и подтвердите доступ к Google Sheets. Затем создайте deployment типа **Web app**.
