import { readFile } from 'node:fs/promises';

const catalogRoot = new URL('../data/catalog/', import.meta.url);

async function readCatalog(name) {
  const url = new URL(name, catalogRoot);
  return JSON.parse(await readFile(url, 'utf8'));
}

export async function loadDesignCatalog() {
  const [topics, styles, effects, fonts] = await Promise.all([
    readCatalog('topics.json'),
    readCatalog('styles.json'),
    readCatalog('effects.json'),
    readCatalog('fonts.json')
  ]);

  return { topics, styles, effects, fonts };
}

export function styleFamiliesFromCatalog(styleCatalog) {
  return (styleCatalog?.items || [])
    .filter(item => item.id && item.generator)
    .map(item => ({
      id: item.id,
      label: item.labels?.en || item.id,
      weight: item.generator.weight || 5,
      eras: item.generator.eras || ['2026'],
      layouts: item.generator.layouts || ['grid', 'minimal'],
      typography: item.generator.typography || ['clean-sans'],
      colors: item.generator.colors || ['one-accent'],
      effects: item.generator.effects || ['frame-within-frame']
    }));
}

export function profileContractsFromCatalog(styleCatalog) {
  return Object.fromEntries(
    (styleCatalog?.items || [])
      .filter(item => item.id && item.contract)
      .map(item => [item.id, item.contract])
  );
}

export function effectTokenMapFromCatalog(effectCatalog) {
  return Object.fromEntries(
    (effectCatalog?.items || [])
      .filter(item => item.id && item.generatorToken && !item.generatorToken.startsWith('color:'))
      .map(item => [item.id, item.generatorToken])
  );
}

export function findCatalogStyle(styleCatalog, id) {
  return (styleCatalog?.items || []).find(item => item.id === id) || null;
}

export function findTopicByPath(topicCatalog, rawPath) {
  const ids = String(rawPath || '').split('/').filter(Boolean);
  if (!ids.length) return null;

  let collection = topicCatalog?.groups || [];
  const nodes = [];

  for (const id of ids) {
    const node = collection.find(item => item.id === id);
    if (!node) return null;
    nodes.push(node);
    collection = node.children || [];
  }

  const leaf = nodes.at(-1);
  const labels = nodes.map(node => node.labels?.en || node.id);
  return {
    id: leaf.id,
    path: ids.join('/'),
    labels,
    prompt: leaf.prompt || labels.join(' — '),
    recommendedStyleIds: [...nodes]
      .reverse()
      .find(node => Array.isArray(node.recommendedStyleIds))
      ?.recommendedStyleIds || []
  };
}
