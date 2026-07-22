# AI Booklet – Image Fallback System

This package adds a stronger image fallback pipeline for `generate-daily.mjs`.

## What it solves

Instead of searching one long literal query and failing, the pipeline now:

1. tries the exact query;
2. simplifies the query;
3. searches atmospheric / mood-based variants;
4. searches substitute objects and related visuals;
5. falls back to abstract open-source images;
6. if still nothing is found, it returns decorative page-art metadata.

## Included providers

- Unsplash (optional key)
- Pexels (optional key)
- Pixabay (optional key)
- Openverse (no key required)
- Wikimedia Commons (no key required)

## Suggested secrets

Optional GitHub Secrets:

- `UNSPLASH_ACCESS_KEY`
- `PEXELS_API_KEY`
- `PIXABAY_API_KEY`

Openverse and Wikimedia Commons work without secrets.

## How to use in generate-daily.mjs

### 1. Import helpers

```js
import {
  findBestImage,
  findGridImages,
  buildDecorativeFallbackPageArt,
  detectMood
} from './image-fallback-helpers.mjs';
```

### 2. Replace single-image lookup logic

For a normal page:

```js
const mood = detectMood({
  mood: booklet.designDna?.mood,
  styleFamily: booklet.designDna?.styleFamily,
  colorMode: booklet.designDna?.colorMode
});

const imageResult = await findBestImage({
  topic: page.imageQuery || booklet.title,
  category: booklet.category,
  mood,
  styleFamily: booklet.designDna?.styleFamily,
  pageType: page.type,
  providerMode: /archive|history|museum/i.test(booklet.category || '')
    ? 'archive'
    : 'general'
});

if (imageResult.image) {
  page.image = imageResult.image;
} else {
  page.pageArt = buildDecorativeFallbackPageArt({
    mood,
    styleFamily: booklet.designDna?.styleFamily
  });
}
```

### 3. For grids / contact sheets / galleries

```js
const gridResult = await findGridImages({
  topic: page.imageQuery || booklet.title,
  category: booklet.category,
  mood,
  styleFamily: booklet.designDna?.styleFamily,
  desiredCount: page.imageCount || 12
});

page.images = gridResult.images;

if (!page.images.length) {
  page.pageArt = buildDecorativeFallbackPageArt({
    mood,
    styleFamily: booklet.designDna?.styleFamily
  });
}
```

## Notes

- Use `page.images` for grid pages.
- Use `page.image` for single-image pages.
- When the provider returns no literal images, atmospheric or abstract images are still acceptable.
- Decorative page-art is better than a repeated fallback circle.
