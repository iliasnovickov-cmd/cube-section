<#
  Публикация «Сечения куба» на GitHub Pages.

  Запуск:
    powershell -ExecutionPolicy Bypass -File .\publish.ps1
    powershell -ExecutionPolicy Bypass -File .\publish.ps1 -Login мой-логин -Repo моя-папка

  Если установлен GitHub CLI (gh) и выполнен gh auth login - всё делается автоматически:
  создание репозитория, push и включение Pages.
#>
param(
  [string]$Login = 'iliasnovickov-cmd',
  [string]$Repo  = 'cube-section',
  [switch]$Private
)

$ErrorActionPreference = 'Continue'
Set-Location (Split-Path -Parent $MyInvocation.MyCommand.Path)

function Say($text, $color = 'Gray') { Write-Host $text -ForegroundColor $color }

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Say 'Не найден git. Установи Git for Windows: https://git-scm.com/download/win' 'Red'
  Say 'Либо выложи файлы через браузер - см. PUBLISH.md, «Путь 1».' 'Yellow'
  exit 1
}

if (-not (Test-Path '.git')) { git init -b main | Out-Null; Say 'Создан локальный репозиторий.' }

git add -A
git commit -m 'Сечение куба: интерактивная программа' 2>&1 | Out-Null

$remote = "https://github.com/$Login/$Repo.git"
$existing = git remote 2>$null
if ($existing -contains 'origin') { git remote set-url origin $remote } else { git remote add origin $remote }
git branch -M main | Out-Null
Say "Репозиторий: $remote"

$pages = "https://$Login.github.io/$Repo/"

# Есть ли GitHub CLI с выполненным входом?
$gh = Get-Command gh -ErrorAction SilentlyContinue
$ghReady = $false
if ($gh) { gh auth status 2>&1 | Out-Null; $ghReady = ($LASTEXITCODE -eq 0) }

if ($ghReady) {
  Say 'GitHub CLI найден и авторизован.' 'Green'
  gh repo view "$Login/$Repo" 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) {
    $vis = if ($Private) { '--private' } else { '--public' }
    Say 'Создаю репозиторий и отправляю файлы...'
    gh repo create "$Login/$Repo" $vis --source . --push
  } else {
    Say 'Репозиторий уже есть, отправляю файлы...'
    git push -u origin main
  }
  if ($LASTEXITCODE -eq 0) {
    Say 'Включаю GitHub Pages...'
    gh api -X POST "repos/$Login/$Repo/pages" -f 'source[branch]=main' -f 'source[path]=/' 2>&1 | Out-Null
    Say "Готово! Через 1-2 минуты страница будет здесь: $pages" 'Green'
    exit 0
  }
  Say 'Не удалось отправить файлы. Смотри сообщение git выше.' 'Red'
  exit 1
}

Say 'GitHub CLI (gh) не найден - отправляю файлы обычным git.' 'Yellow'
Say 'Если репозитория ещё нет, сначала создай пустой репозиторий в браузере:' 'Yellow'
Say "  https://github.com/new   имя: $Repo, тип Public, без README" 'Yellow'
git push -u origin main
if ($LASTEXITCODE -ne 0) {
  Say '' 
  Say 'Push не прошёл. Проверь, что пустой репозиторий создан и что логин/токен верны.' 'Red'
  Say 'Самый простой путь без git - браузером: PUBLISH.md, «Путь 1».' 'Yellow'
  exit 1
}
Say ''
Say 'Файлы отправлены. Осталось включить страницы:' 'Green'
Say "  https://github.com/$Login/$Repo/settings/pages" 'Green'
Say '  Source = Deploy from a branch, Branch = main, папка = / (root), Save.' 'Green'
Say "Через 1-2 минуты страница откроется: $pages" 'Green'
