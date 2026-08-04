# AI Booklet Designs — Editorial Booklet Generator & Live Editor

[![Production Site](https://img.shields.io/badge/site-live%20demo-0172f0?style=for-the-badge)](https://aleksvilly.github.io/ai-booklet-designs/)
[![GitHub Actions](https://img.shields.io/badge/automation-GitHub%20Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)](https://github.com/aleksvilly/ai-booklet-designs/actions)
[![Astro Build](https://img.shields.io/badge/framework-Astro%20SSG-ff5d01?style=for-the-badge&logo=astro&logoColor=white)](https://astro.build/)

Публичный веб-сервис и открытый эксперимент по автоматической генерации печатных editorial-буклетов для любых персон и событий: подарков на день рождения, меню для кафе, свадебных программ, фестивалей и художественных монографий.

**Сайт проекта**: [aleksvilly.github.io/ai-booklet-designs](https://aleksvilly.github.io/ai-booklet-designs/)

---

## 🌟 Ключевые возможности

- **Живая коллекция буклетов**: Просмотр уникальных автоматически сгенерированных editorial-буклетов с поддержкой фильтрации по категориям (`Wedding`, `Menu`, `Gifts`, `Events`) и мгновенным поиском.
- **Публичная очередь генерации**: Форма заказа буклетов на сайте. Заявка отправляется через ntfy, встаёт в публичную очередь GitHub Issues и автоматически исполняется GitHub Actions.
- **Интерактивный онлайн-редактор (`src/editor.js`)**: Прямо в модальном окне буклета можно менять стили, раскладки фото (до 20 снимков на страницу), типографику (шрифты, трекинг, интерлиньяж, начертания) и видимость элементов с немедленным сохранением в `localStorage`.
- **Экспорт в PDF**: Генерация вектроного PDF-файла непосредственно из браузера с полным сохранением используемых шрифтов и геометрии макета.
- **Мультиязычная архитектура**: Поддержка английского, русского, испанского, немецкого, французского и китайского языков на статических роутах Astro.
- **Расширяемая система каталогов (`data/catalog/`)**:
  - `topics.json` — Иерархический энциклопедический дерево-каталог тем.
  - `styles.json` — 21 семейство стилей с правилами и цветовыми контрактами.
  - `effects.json` — 20 дизайн-эффектов (micro-3D, polaroid, paper-cut, tape-strips, xerox и др.).
  - `fonts.json` — 89 типографических шрифтовых гарнитур.

---

## 🏗 Архитектура проекта

```text
Браузер (Astro SSG + Vanilla JS/CSS)
  ├─ Статическая коллекция (data/booklets.json)
  ├─ Форма обратной связи → Formspree
  └─ Форма публичной генерации → ntfy.sh
                                  │
                                  ▼
                 poll-public-queue.yml (Cron / Dispatch)
                                  │
                                  ▼
                    Создание GitHub Issue с меткой очереди
                                  │
                                  ▼
                         publish.yml (Генератор Node.js)
                                  │
                 Добавление в data/booklets.json & Деплой Pages
                                  │
                                  ▼
               Закрытие Issue с отправкой ссылки result_url
```

---

## 🛠 Команды для локальной разработки

### 1. Запуск локального сервера
```bash
npm run serve
```
Открывает локальный сервер для просмотра сайта на `http://localhost:3000`.

### 2. Сборка Astro
```bash
npm run build
```
Собирает мультиязычный статический сайт в папку `dist/`.

### 3. Генерация буклетов
```bash
# Локальный тестовый запуск без API-ключей
BOOKLET_COUNT=1 FORCE_GENERATE=true USE_AI=false SKIP_ENRICHMENT=true npm run generate
```

### 4. Проверка валидности каталогов
```bash
npm run test:catalog
```
Проверяет схемы и связи тем, стилей и эффектов в `data/catalog/`.

---

## 🔐 Безопасность и правила сохранения данных

1. `data/booklets.json` содержит ценную историю сгенерированных буклетов и **никогда не очищается/не перезаписывается целиком**.
2. Все публичные запросы проходят через валидацию и лимитирование (не более 3 принятых запросов в час).
3. API-ключи OpenAI, Gemini, Unsplash, Pexels и Pixabay хранятся исключительно в GitHub Secrets и никогда не попадают в клиентский код.
