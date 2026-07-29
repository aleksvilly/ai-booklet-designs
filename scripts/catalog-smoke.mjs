import { loadDesignCatalog } from './catalog-registry.mjs';

const catalog = await loadDesignCatalog();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function uniqueIds(items, label) {
  const ids = items.map(item => item.id);
  assert(ids.every(Boolean), `${label} contains an empty ID.`);
  assert(new Set(ids).size === ids.length, `${label} contains duplicate IDs.`);
}

function walkTopics(nodes, parentPath = '') {
  uniqueIds(nodes, `Topic siblings under ${parentPath || 'root'}`);
  for (const node of nodes) {
    assert(node.labels?.en, `Topic ${node.id} has no English label.`);
    const path = [parentPath, node.id].filter(Boolean).join('/');
    if (node.children) walkTopics(node.children, path);
  }
}

uniqueIds(catalog.topics.groups, 'Topic groups');
walkTopics(catalog.topics.groups);
uniqueIds(catalog.styles.groups, 'Style groups');
uniqueIds(catalog.styles.items, 'Styles');
uniqueIds(catalog.effects.groups, 'Effect groups');
uniqueIds(catalog.effects.items, 'Effects');
assert(Array.isArray(catalog.fonts.items) && catalog.fonts.items.length, 'Font catalog is empty.');
assert(
  new Set(catalog.fonts.items.map(font => font.family)).size === catalog.fonts.items.length,
  'Font catalog contains duplicate families.'
);

const styleGroups = new Set(catalog.styles.groups.map(group => group.id));
for (const style of catalog.styles.items) {
  assert(styleGroups.has(style.groupId), `Style ${style.id} references missing group ${style.groupId}.`);
  assert(style.labels?.en, `Style ${style.id} has no English label.`);
  assert(Number.isInteger(style.lockUntilChaos), `Style ${style.id} has no integer lockUntilChaos.`);
  assert(style.lockUntilChaos >= 0 && style.lockUntilChaos <= 5, `Style ${style.id} has invalid lockUntilChaos.`);
}

const effectGroups = new Set(catalog.effects.groups.map(group => group.id));
for (const effect of catalog.effects.items) {
  assert(effectGroups.has(effect.groupId), `Effect ${effect.id} references missing group ${effect.groupId}.`);
  assert(effect.labels?.en, `Effect ${effect.id} has no English label.`);
  assert(effect.generatorToken, `Effect ${effect.id} has no generatorToken.`);
}

for (const font of catalog.fonts.items) {
  assert(font.family, 'Font catalog contains an empty family.');
  assert(font.category, `Font ${font.family} has no category.`);
  assert(['free', 'licensed'].includes(font.availability), `Font ${font.family} has invalid availability.`);
  assert(font.provider, `Font ${font.family} has no provider.`);
}

console.log(
  `Catalog OK: ${catalog.topics.groups.length} topic groups, ` +
  `${catalog.styles.items.length} styles, ${catalog.effects.items.length} effects, ` +
  `${catalog.fonts.items.length} fonts.`
);
