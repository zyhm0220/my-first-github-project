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
    'reviewText', 'clearRatingButton', 'saveReviewButton', 'historySection', 'historyList',
    'toast', 'liveRegion'
  ];

  assert.match(html, /<html lang="zh-CN">/);
  assert.match(html, /<span>影轮 <b>CineSpin<\/b><\/span>/);
  assert.match(html, /<h1 id="heroTitle">今晚看什么？<br><span>让命运替你决定<\/span><\/h1>/);
  requiredIds.forEach((id) => assert.match(html, new RegExp(`id="${id}"`)));

  ['全部', '剧情', '喜剧', '科幻', '动画', '爱情'].forEach((genre) => {
    assert.match(html, new RegExp(`data-genre="${genre}"`));
  });
  assert.match(
    html,
    /id="starRating"[\s\S]*?<\/div>\s*<button[^>]*id="clearRatingButton"[^>]*disabled[^>]*>清除评分<\/button>/
  );
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

test('次要文字和未激活星级使用达到对比度要求的颜色', () => {
  const css = fs.readFileSync(cssPath, 'utf8');

  function luminance(hex) {
    const channels = hex.match(/[a-f\d]{2}/gi).map((value) => parseInt(value, 16) / 255);
    const linear = channels.map((value) => (
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    ));
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  }

  function contrast(foreground, background) {
    const values = [luminance(foreground), luminance(background)].sort((left, right) => right - left);
    return (values[0] + 0.05) / (values[1] + 0.05);
  }

  const muted = css.match(/--muted:\s*(#[a-f\d]{6})/i)[1];
  const inactiveStar = css.match(/--star-inactive:\s*(#[a-f\d]{6})/i)[1];

  assert.ok(contrast(muted, '#111226') >= 4.5);
  assert.ok(contrast(inactiveStar, '#111226') >= 3);
  assert.match(css, /\.search-form input::placeholder,[\s\S]*?\.review-card textarea::placeholder\s*{\s*color:\s*var\(--muted\)/);
  assert.match(css, /\.history-date\s*{[^}]*color:\s*var\(--muted\)/s);
  assert.match(css, /\.site-footer\s*{[^}]*color:\s*var\(--muted\)/s);
  assert.match(css, /\.star-rating button\s*{[^}]*color:\s*var\(--star-inactive\)/s);
  assert.match(css, /\.clear-rating:disabled\s*{[^}]*opacity:\s*1/s);
});
