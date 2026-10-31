type Lang = 'en' | 'ru';

export interface GiftPreset {
  id: string;
  label: string;
  band: string;
  kicker: string;
  title: string;
  sub: string;
  meta: string;
  ticker: string;
}

export interface GiftTheme {
  preset: string;
  accent?: string;
  title: string;
  note: string;
  topic: string;
}

// Visual presets for the home-page cover demo and theme shelf. `{name}` is
// replaced with the recipient's name. Styles are inspired by genres, not brands.
const presets: Record<Lang, GiftPreset[]> = {
  en: [
    { id: 'newsroom', label: 'Newsroom', band: 'LIVE', kicker: 'Breaking', title: '{name} named friend of the year', sub: 'Sources close to the group confirm it', meta: 'Updated 2 min ago', ticker: 'EXCLUSIVE · More at eleven · Crowd reacts · EXCLUSIVE · More at eleven · Crowd reacts ·' },
    { id: 'marketplace', label: 'Marketplace', band: 'Best seller', kicker: '#1 in Friends', title: '{name}', sub: '★★★★★ 4.9 · 2,481 reviews', meta: 'Only 1 left in stock', ticker: '' },
    { id: 'vintage', label: 'Vintage cinema', band: 'Technicolor', kicker: 'Un film di', title: '{name}', sub: 'La dolce vita, ma vera', meta: 'Roma · 1962 · 94 min', ticker: '' },
    { id: 'horror', label: 'Horror', band: 'Midnight only', kicker: 'This October', title: '{name}', sub: 'They should have stayed home', meta: 'Rated R · No refunds', ticker: '' },
    { id: 'arena', label: 'Arena', band: 'Round 30', kicker: 'Match MVP', title: '{name}', sub: '27 / 4 / 9 · Clutch 1v4', meta: 'GG · Rematch tomorrow', ticker: '' },
    { id: 'elegant', label: 'Light & elegant', band: 'Volume I', kicker: 'A small book about', title: '{name}', sub: 'with love, from all of us', meta: 'Printed in one copy', ticker: '' },
    { id: 'party', label: 'Party', band: 'Today!', kicker: 'Happy birthday', title: '{name}!', sub: 'Cake first, questions later', meta: 'Bring snacks', ticker: '' }
  ],
  ru: [
    { id: 'newsroom', label: 'Новости', band: 'В эфире', kicker: 'Срочно', title: '{name} — друг года', sub: 'Источники в компании подтверждают', meta: 'Обновлено 2 мин назад', ticker: 'ЭКСКЛЮЗИВ · Подробности в 23:00 · Реакция друзей · ЭКСКЛЮЗИВ · Подробности в 23:00 · Реакция друзей ·' },
    { id: 'marketplace', label: 'Маркетплейс', band: 'Хит продаж', kicker: '№1 в категории «Друзья»', title: '{name}', sub: '★★★★★ 4,9 · 2 481 отзыв', meta: 'Осталась 1 штука', ticker: '' },
    { id: 'vintage', label: 'Старое кино', band: 'Technicolor', kicker: 'Un film di', title: '{name}', sub: 'La dolce vita, ma vera', meta: 'Рим · 1962 · 94 мин', ticker: '' },
    { id: 'horror', label: 'Хоррор', band: 'Только в полночь', kicker: 'Этой осенью', title: '{name}', sub: 'Лучше бы остались дома', meta: '18+ · Возврата нет', ticker: '' },
    { id: 'arena', label: 'Арена', band: 'Раунд 30', kicker: 'MVP матча', title: '{name}', sub: '27 / 4 / 9 · Клатч 1 против 4', meta: 'GG · Реванш завтра', ticker: '' },
    { id: 'elegant', label: 'Светлый, элегантный', band: 'Том I', kicker: 'Маленькая книга о', title: '{name}', sub: 'с любовью, от всех нас', meta: 'Напечатано в одном экземпляре', ticker: '' },
    { id: 'party', label: 'Праздник', band: 'Сегодня!', kicker: 'С днём рождения', title: '{name}!', sub: 'Сначала торт, потом вопросы', meta: 'Приносите вкусное', ticker: '' }
  ]
};

const themes: Record<Lang, GiftTheme[]> = {
  en: [
    { preset: 'horror', title: 'Horror movie night', note: 'For the friend who watches with the lights off', topic: 'Horror movie night: a gift booklet for a scary-film fan' },
    { preset: 'arena', title: 'CS2', note: 'Clutches, smokes and the one perfect round', topic: 'Counter-Strike 2: a gift booklet for a CS2 player' },
    { preset: 'arena', accent: '#f2a900', title: 'PUBG: Mobile', note: 'Drops, squads and the last circle', topic: 'PUBG Mobile: a gift booklet for a battle-royale player' },
    { preset: 'vintage', title: 'Italian & French cinema', note: 'Fellini, Godard, black coffee and long scarves', topic: 'Old Italian and French cinema: a gift booklet for a film lover' },
    { preset: 'newsroom', title: 'Breaking news', note: 'Their life as the evening headline', topic: 'Breaking news about a friend: a funny news-style gift booklet' },
    { preset: 'marketplace', title: 'Five-star friend', note: 'Product page for someone priceless', topic: 'Five-star friend: a gift booklet styled as a product page' },
    { preset: 'party', title: 'Birthday', note: 'Loud, bright and full of inside jokes', topic: 'Birthday gift booklet for a friend' },
    { preset: 'elegant', title: 'Love story', note: 'Quiet pages for two people', topic: 'A love story gift booklet for a partner' }
  ],
  ru: [
    { preset: 'horror', title: 'Вечер ужасов', note: 'Для того, кто смотрит хорроры без света', topic: 'Вечер ужасов: буклет в подарок фанату хорроров' },
    { preset: 'arena', title: 'CS2', note: 'Клатчи, смоки и тот самый раунд', topic: 'Counter-Strike 2: буклет в подарок игроку CS2' },
    { preset: 'arena', accent: '#f2a900', title: 'PUBG: Mobile', note: 'Высадка, сквад и последняя зона', topic: 'PUBG Mobile: буклет в подарок игроку королевской битвы' },
    { preset: 'vintage', title: 'Итальянское и французское кино', note: 'Феллини, Годар, чёрный кофе и длинные шарфы', topic: 'Старое итальянское и французское кино: буклет в подарок киноману' },
    { preset: 'newsroom', title: 'Срочные новости', note: 'Жизнь друга как главная новость вечера', topic: 'Срочные новости о друге: смешной буклет в стиле новостей' },
    { preset: 'marketplace', title: 'Друг на пять звёзд', note: 'Карточка товара для бесценного человека', topic: 'Друг на пять звёзд: буклет-подарок в стиле карточки товара' },
    { preset: 'party', title: 'День рождения', note: 'Ярко, громко и с внутренними шутками', topic: 'Буклет в подарок другу на день рождения' },
    { preset: 'elegant', title: 'История любви', note: 'Тихие страницы для двоих', topic: 'История любви: буклет в подарок любимому человеку' }
  ]
};

export function giftPresets(lang: Lang = 'en') {
  return presets[lang];
}

export function giftThemes(lang: Lang = 'en') {
  return themes[lang];
}
