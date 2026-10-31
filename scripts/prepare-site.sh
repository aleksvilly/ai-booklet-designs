#!/usr/bin/env bash
# Assembles the GitHub Pages artifact in _site/ from the Astro build output
# plus the runtime assets that main.js loads directly. Used by deploy.yml and
# publish.yml.
set -euo pipefail

mkdir -p _site
if [ -d "dist" ]; then
  cp -R dist/* _site/
  cp _site/menu/index.html _site/menu.html 2>/dev/null || true
  cp _site/wedding/index.html _site/wedding.html 2>/dev/null || true
  cp _site/gifts/index.html _site/gifts.html 2>/dev/null || true
  cp _site/events/index.html _site/events.html 2>/dev/null || true
  cp _site/privacy/index.html _site/privacy.html 2>/dev/null || true
  cp _site/ru/menu/index.html _site/ru/menu.html 2>/dev/null || true
  cp _site/ru/wedding/index.html _site/ru/wedding.html 2>/dev/null || true
  cp _site/ru/gifts/index.html _site/ru/gifts.html 2>/dev/null || true
  cp _site/ru/events/index.html _site/ru/events.html 2>/dev/null || true
else
  cp index.html styles.css app.js privacy.html _site/ 2>/dev/null || true
  cp wedding.html menu.html gifts.html events.html _site/ 2>/dev/null || true
fi
touch _site/.nojekyll
cp robots.txt _site/ 2>/dev/null || true
if [ ! -f "_site/sitemap.xml" ]; then
  cp sitemap.xml _site/ 2>/dev/null || true
fi
cp -R data _site/data 2>/dev/null || true
cp -R vendor _site/vendor 2>/dev/null || true
cp -R src _site/src 2>/dev/null || true
cp -R styles _site/styles 2>/dev/null || true
