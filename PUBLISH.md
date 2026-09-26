# Публикация на GitHub Pages

Страница уже опубликована:

**https://iliasnovickov-cmd.github.io/cube-section/**

Репозиторий: https://github.com/iliasnovickov-cmd/cube-section
(ветка `main`, папка `/`, Pages включён через API).

## Как обновить страницу

```powershell
git add -A
git commit -m "что изменилось"
git push
```

GitHub пересоберёт страницу за 1–2 минуты. Состояние сборки видно здесь:
https://github.com/iliasnovickov-cmd/cube-section/deployments

## Если нужно опубликовать заново (другой аккаунт или другое имя)

### Путь 1 — браузером, без программ

1. Открой https://github.com/new — имя `cube-section`, тип **Public**, README не создавай.
2. Нажми **uploading an existing file** и перетащи файлы из этой папки:
   `index.html`, `cube-section-app.js`, `cube-section-core.js`, `cube-section-core.test.cjs`,
   `README.md`, `PUBLISH.md`, `publish.ps1` и, если видно, `.nojekyll`.
3. Нажми **Commit changes**.
4. **Settings → Pages**: *Source* = **Deploy from a branch**, *Branch* = **main**,
   папка **/ (root)**, затем **Save**.
5. Через 1–2 минуты страница откроется по адресу
   `https://<логин>.github.io/<репозиторий>/`.

### Путь 2 — скриптом

```powershell
powershell -ExecutionPolicy Bypass -File .\publish.ps1
powershell -ExecutionPolicy Bypass -File .\publish.ps1 -Login мой-логин -Repo моя-папка
```

Если установлен `gh` (GitHub CLI) и выполнен `gh auth login`, скрипт сам создаёт репозиторий,
отправляет файлы и включает Pages. Без `gh` он делает push и подсказывает, что нажать в браузере.
Когда репозиторий уже создан, для обновления достаточно `git push`.

## Что важно знать

- Главный файл должен называться `index.html` — поэтому страница так и названа, короткий адрес
  репозитория работает без дополнительных ссылок.
- Программа полностью автономна: без библиотек и интернета, работает и с диска, и с GitHub Pages.
- Проверки на месте: `node cube-section-core.test.cjs` — 229 проверок.
