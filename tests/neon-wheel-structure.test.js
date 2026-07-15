const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const htmlPath = path.join(projectRoot, 'styles', 'neon-wheel', 'index.html');
const cssPath = path.join(projectRoot, 'styles', 'neon-wheel', 'wheel.css');

test('转盘页面包含全部语义区块和稳定 DOM 接口', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const requiredIds = [
    'wheelSection', 'wheel', 'wheelLabels', 'spinButton', 'wheelStatus',
    'genreFilters', 'searchForm', 'searchInput', 'searchMessage',
    'resultSection', 'moviePoster', 'posterFallback', 'movieTitle',
    'movieGenres', 'movieRating', 'movieSummary', 'starRating',
    'reviewText', 'saveReviewButton', 'historySection', 'historyList',
    'toast', 'liveRegion'
  ];

  assert.match(html, /<html lang="zh-CN">/);
  assert.match(html, /影轮 CineSpin/);
  assert.match(html, /今晚看什么？/);
  requiredIds.forEach((id) => assert.match(html, new RegExp(`id="${id}"`)));

  ['全部', '剧情', '喜剧', '科幻', '动画', '爱情'].forEach((genre) => {
    assert.match(html, new RegExp(`data-genre="${genre}"`));
  });
});

test('共享脚本和页面脚本按依赖顺序加载且不使用 ES Module', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const scripts = [
    '../../shared/movie-data.js',
    '../../shared/movie-core.js',
    '../../shared/review-store.js',
    './wheel.js'
  ];
  const positions = scripts.map((script) => html.indexOf(`src="${script}"`));

  positions.forEach((position) => assert.ok(position >= 0));
  assert.deepEqual(positions, positions.slice().sort((left, right) => left - right));
  assert.equal(html.includes('type="module"'), false);
});

test('视觉样式包含确认的颜色、桌面网格和减少动态效果规则', () => {
  const css = fs.readFileSync(cssPath, 'utf8');

  ['#060711', '#111226', '#7c3aed', '#4f46e5', '#38bdf8', '#f472b6'].forEach((color) => {
    assert.ok(css.toLowerCase().includes(color));
  });
  assert.match(css, /grid-template-columns:\s*0\.92fr\s+1\.08fr/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /:focus-visible/);
});
