# Публикация на GitHub Pages

Программа уже лежит в локальном git-репозитории (сделан `git init` и первый коммит).
Осталось выложить её на GitHub. Выбери любой путь.

## Путь 1 — через браузер, без программ (проще всего)

1. Открой https://github.com/new
2. **Repository name**: `cube-section`, тип — **Public**. Галочки README/.gitignore/license НЕ ставь.
   Нажми **Create repository**.
3. На странице пустого репозитория нажми ссылку **uploading an existing file**.
4. Перетащи туда файлы из этой папки:
   `index.html`, `cube-section-app.js`, `cube-section-core.js`, `cube-section-core.test.cjs`,
   `README.md`, `PUBLISH.md`, `publish.ps1` и (если видно) `.nojekyll`.
   Файл `.nojekyll` скрытый: включи в проводнике «Показать скрытые элементы» или просто пропусти его.
5. Внизу нажми **Commit changes**.
6. **Settings → Pages**: *Source* = **Deploy from a branch**, *Branch* = **main**, папка **/ (root)**,
   нажми **Save**.
7. Через 1–2 минуты страница откроется по адресу
   **https://iliasnovickov-cmd.github.io/cube-section/**

## Путь 2 — через git

В этой папке выполни:

```powershell
git remote add origin https://github.com/iliasnovickov-cmd/cube-section.git
git push -u origin main
```

Логин — имя пользователя GitHub, вместо пароля — **Personal Access Token**
(GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic), scope `repo`).
Дальше включи Pages, как в пунктах 6–7.

## Путь 3 — скрипт

```powershell
powershell -ExecutionPolicy Bypass -File .\publish.ps1
```

Если установлен `gh` (GitHub CLI), скрипт сам создаст репозиторий, запушит файлы и включит Pages.
Если `gh` нет — сделает push и подскажет, что осталось нажать в браузере.
Другой логин или имя репозитория передаются параметрами:

```powershell
powershell -ExecutionPolicy Bypass -File .\publish.ps1 -Login мой-логин -Repo моя-папка
```

## Что важно знать

- Адрес страницы: `https://<логин>.github.io/<репозиторий>/` — главный файл должен называться
  `index.html`, поэтому страница так и названа.
- Программа полностью автономна: без библиотек, без интернета, работает и с диска, и с Pages.
- Все проверки можно запустить локально: `node cube-section-core.test.cjs` (229 проверок).
