import booklets from '../data/booklets.json';

export const preferredCategoryOrder = [
  'Birthday', 'Relationships', 'Food', 'Sports', 'Cinema', 'Music', 'Travel',
  'Nature', 'Animals', 'Technology', 'Space', 'Science', 'Architecture', 'Design',
  'Fashion', 'Photography', 'Literature', 'History', 'Countries', 'Profession',
  'Business', 'Public Service', 'Non-profit & Community', 'Engineering', 'Cycling',
  'Dance', 'Ocean', 'Sea', 'Railways', 'Collecting', 'Abstract', 'Custom brief'
];

export const russianCategoryLabels: Record<string, string> = {
  Birthday: 'Дни рождения и подарки', Relationships: 'Любовь и отношения', Food: 'Еда, кафе и меню',
  Sports: 'Спорт и активность', Cinema: 'Кино', Music: 'Музыка', Travel: 'Путешествия',
  Nature: 'Природа', Animals: 'Животные', Technology: 'Технологии', Space: 'Космос', Science: 'Наука',
  Architecture: 'Архитектура', Design: 'Дизайн', Fashion: 'Мода', Photography: 'Фотография',
  Literature: 'Литература', History: 'История', Countries: 'Страны', Profession: 'Профессии',
  Business: 'Бизнес', 'Public Service': 'Город и общество', 'Non-profit & Community': 'Сообщества',
  Engineering: 'Инженерия', Cycling: 'Велоспорт', Dance: 'Танец', Ocean: 'Океан', Sea: 'Море',
  Railways: 'Железные дороги', Collecting: 'Коллекционирование', Abstract: 'Абстрактные темы',
  'Custom brief': 'Авторские темы'
};

export function categorySlug(category: string) {
  return category.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function categoryLabel(category: string, lang: 'en' | 'ru' = 'en') {
  return lang === 'ru' ? russianCategoryLabels[category] || category : category;
}

export function categoryCountText(count: number, lang: 'en' | 'ru' = 'en') {
  if (lang !== 'ru') return `${count} ${count === 1 ? 'booklet' : 'booklets'}`;
  const mod10 = count % 10;
  const mod100 = count % 100;
  const noun = mod10 === 1 && mod100 !== 11 ? 'буклет' : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'буклета' : 'буклетов';
  return `${count} ${noun}`;
}

export function getPublishedCategoryCatalog() {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const counts = booklets
    .filter((item) => new Date(`${item.publishDate}T00:00:00`) <= today)
    .reduce((result, item) => {
      result[item.category] = (result[item.category] || 0) + 1;
      return result;
    }, {} as Record<string, number>);

  return Object.keys(counts)
    .sort((a, b) => {
      const ai = preferredCategoryOrder.indexOf(a);
      const bi = preferredCategoryOrder.indexOf(b);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      return a.localeCompare(b);
    })
    .map((category) => ({ category, slug: categorySlug(category), count: counts[category] }));
}
