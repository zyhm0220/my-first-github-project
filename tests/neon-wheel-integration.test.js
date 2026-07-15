const test = require('node:test');
const assert = require('node:assert/strict');

const { createNeonWheelHarness, makeReview } = require('./helpers/neon-wheel-harness.js');

function withFixedRandom(run) {
  const originalRandom = Math.random;
  Math.random = () => 0;

  try {
    run();
  } finally {
    Math.random = originalRandom;
  }
}

test('初始化通过真实存储边界忽略非记录项且安全渲染异常字段', () => {
  const harness = createNeonWheelHarness({
    rawReviews: [
      null,
      7,
      '无效记录',
      ['嵌套数组'],
      { movieName: { nested: true }, rating: {}, review: [], date: {} },
      makeReview('电影 A', '有效影评', 5)
    ]
  });

  assert.equal(harness.elements.historyList.children.length, 2);
  assert.equal(harness.elements.historyList.children[0].children[0].children[0].textContent, '未知电影');
  assert.equal(harness.elements.historyList.children[0].children[1].textContent, '只留下了星级评分。');
  assert.equal(harness.elements.historyList.children[1].children[0].children[0].textContent, '电影 A');
});

test('初始化不会调用影评字段中不可信的转换钩子', () => {
  const hostile = { toString: null, valueOf: null };
  const harness = createNeonWheelHarness({
    rawReviews: [{
      movieName: hostile,
      rating: hostile,
      review: hostile,
      date: hostile
    }]
  });
  const card = harness.elements.historyList.children[0];

  assert.deepEqual(harness.store.getReviews(), [
    { movieName: '未知电影', rating: 0, review: '', date: '' }
  ]);
  assert.equal(card.children[0].children[0].textContent, '未知电影');
  assert.equal(card.children[0].children[1].textContent, '☆☆☆☆☆');
  assert.equal(card.children[1].textContent, '只留下了星级评分。');
  assert.equal(card.children[2].textContent, '日期未知');
});

test('选星后可清除为 0 星并仅保存影评', () => {
  const harness = createNeonWheelHarness();

  harness.elements.searchInput.value = '电影 A';
  harness.submitSearch();
  assert.equal(harness.elements.clearRatingButton.disabled, true);

  harness.click(harness.elements.starButtons[3]);
  assert.equal(harness.elements.clearRatingButton.disabled, false);

  harness.click(harness.elements.clearRatingButton);
  assert.equal(harness.elements.clearRatingButton.disabled, true);
  harness.elements.starButtons.forEach((button) => {
    assert.equal(button.getAttribute('aria-checked'), 'false');
  });

  harness.elements.reviewText.value = '只写影评';
  harness.click(harness.elements.saveReviewButton);

  assert.equal(harness.store.getReviews()[0].rating, 0);
  assert.equal(harness.store.getReviews()[0].review, '只写影评');
});

test('编辑已评分记录时可清除为 0 星并持久化', () => {
  const harness = createNeonWheelHarness({
    reviews: [makeReview('电影 A', '保留文字', 4)]
  });

  harness.click(harness.getHistoryAction(0, 'edit'));
  assert.equal(harness.elements.clearRatingButton.disabled, false);

  harness.click(harness.elements.clearRatingButton);
  assert.equal(harness.elements.clearRatingButton.disabled, true);
  harness.click(harness.elements.saveReviewButton);

  assert.equal(harness.store.getReviews()[0].rating, 0);
  assert.equal(harness.store.getReviews()[0].review, '保留文字');
});

test('删除较早影评后保存仍更新原来的编辑目标', () => {
  const harness = createNeonWheelHarness({
    reviews: [
      makeReview('电影 A', 'A 原文'),
      makeReview('电影 B', 'B 原文'),
      makeReview('电影 C', 'C 原文')
    ]
  });

  harness.click(harness.getHistoryAction(1, 'edit'));
  assert.equal(harness.elements.reviewText.value, 'B 原文');

  harness.click(harness.getHistoryAction(0, 'delete'));
  assert.equal(harness.elements.saveReviewButton.textContent, '更新影评');
  harness.elements.reviewText.value = 'B 已更新';
  harness.click(harness.elements.saveReviewButton);

  assert.deepEqual(
    harness.store.getReviews().map((entry) => [entry.movieName, entry.review]),
    [['电影 B', 'B 已更新'], ['电影 C', 'C 原文']]
  );
});

test('删除正在编辑的影评会退出编辑状态', () => {
  const harness = createNeonWheelHarness({
    reviews: [
      makeReview('电影 A', 'A 原文'),
      makeReview('电影 B', 'B 原文'),
      makeReview('电影 C', 'C 原文')
    ]
  });

  harness.click(harness.getHistoryAction(1, 'edit'));
  harness.click(harness.getHistoryAction(1, 'delete'));

  assert.equal(harness.elements.reviewText.value, '');
  assert.equal(harness.elements.saveReviewButton.textContent, '保存影评');

  harness.elements.reviewText.value = 'B 重新记录';
  harness.click(harness.elements.saveReviewButton);

  assert.deepEqual(
    harness.store.getReviews().map((entry) => entry.movieName),
    ['电影 B', '电影 A', '电影 C']
  );
});

test('删除持久化失败不会改变当前编辑目标', () => {
  const harness = createNeonWheelHarness({
    reviews: [
      makeReview('电影 A', 'A 原文'),
      makeReview('电影 B', 'B 原文'),
      makeReview('电影 C', 'C 原文')
    ],
    saveOutcomes: [false, true]
  });

  harness.click(harness.getHistoryAction(1, 'edit'));
  harness.click(harness.getHistoryAction(0, 'delete'));

  assert.equal(harness.elements.reviewText.value, 'B 原文');
  assert.equal(harness.elements.saveReviewButton.textContent, '更新影评');

  harness.elements.reviewText.value = 'B 失败后仍更新';
  harness.click(harness.elements.saveReviewButton);

  assert.deepEqual(
    harness.store.getReviews().map((entry) => [entry.movieName, entry.review]),
    [['电影 A', 'A 原文'], ['电影 B', 'B 失败后仍更新'], ['电影 C', 'C 原文']]
  );
});

test('普通旋转期间锁定控件，完成后恢复且再次抽取排除上次结果', () => {
  const harness = createNeonWheelHarness();

  withFixedRandom(() => {
    harness.click(harness.elements.spinButton);

    assert.equal(harness.elements.spinButton.disabled, true);
    assert.equal(harness.elements.searchInput.disabled, true);
    assert.equal(harness.elements.searchSubmit.disabled, true);
    harness.elements.genreButtons.forEach((button) => assert.equal(button.disabled, true));
    assert.ok(harness.runtime.pendingDelays().includes(4080));

    harness.runtime.runTimer(4080);
    const firstWinner = harness.elements.movieTitle.textContent;

    assert.equal(harness.elements.spinButton.disabled, false);
    assert.equal(harness.elements.searchInput.disabled, false);
    assert.equal(harness.elements.searchSubmit.disabled, false);
    harness.elements.genreButtons.forEach((button) => assert.equal(button.disabled, false));

    harness.click(harness.elements.spinButton);
    harness.runtime.runTimer(4080);

    assert.notEqual(harness.elements.movieTitle.textContent, firstWinner);
  });
});

test('减少动态效果时使用短时旋转、自动滚动且不生成粒子', () => {
  const harness = createNeonWheelHarness({ reducedMotion: true });

  withFixedRandom(() => {
    harness.click(harness.elements.spinButton);

    assert.equal(harness.elements.wheel.style.getPropertyValue('--spin-duration'), '120ms');
    assert.ok(harness.runtime.pendingDelays().includes(200));

    harness.runtime.runTimer(200);

    assert.equal(harness.elements.particles.children.length, 0);
    assert.equal(harness.elements.resultSection.lastScrollOptions.behavior, 'auto');
    assert.equal(harness.elements.spinButton.disabled, false);
  });
});

test('搜索成功展示详情，失败搜索保留上一次结果', () => {
  const harness = createNeonWheelHarness();

  harness.elements.searchInput.value = '电影 B';
  harness.submitSearch();

  assert.equal(harness.elements.resultSection.hidden, false);
  assert.equal(harness.elements.movieTitle.textContent, '电影 B');
  assert.equal(harness.elements.searchMessage.textContent, '已找到：电影 B');

  harness.elements.searchInput.value = '不存在的电影';
  harness.submitSearch();

  assert.equal(harness.elements.movieTitle.textContent, '电影 B');
  assert.equal(
    harness.elements.searchMessage.textContent,
    '暂未找到“不存在的电影”，上一次结果已保留。'
  );
});

test('详情海报加载失败时显示回退内容', () => {
  const harness = createNeonWheelHarness();

  harness.elements.searchInput.value = '电影 B';
  harness.submitSearch();
  harness.error(harness.elements.moviePoster);

  assert.equal(harness.elements.moviePoster.hidden, true);
  assert.equal(harness.elements.posterFallback.hidden, false);
});

test('历史记录把不可信内容作为纯文本渲染', () => {
  const movieName = '<img src=x onerror="alert(1)">';
  const reviewText = '<script>alert("review")</script>';
  const harness = createNeonWheelHarness({
    reviews: [makeReview(movieName, reviewText)]
  });
  const card = harness.elements.historyList.children[0];
  const title = card.children[0].children[0];
  const review = card.children[1];

  assert.equal(title.textContent, movieName);
  assert.equal(review.textContent, reviewText);
  assert.equal(title.innerHTML, '');
  assert.equal(review.innerHTML, '');
  assert.equal(harness.elements.historyList.querySelector('img'), null);
  assert.equal(harness.elements.historyList.querySelector('script'), null);
});

test('初始化生成无片名的扇形海报并保留加载失败回退', () => {
  const harness = createNeonWheelHarness();
  const labels = harness.elements.wheelLabels.children;

  assert.equal(labels.length, 3);
  labels.forEach((label) => {
    assert.match(label.style.clipPath, /^(polygon|circle)\(/);
    assert.equal(label.children.length, 1);
    assert.equal(label.children[0].tagName, 'IMG');
    assert.equal(label.querySelector('span'), null);
    assert.ok(label.children[0].style.width.endsWith('%'));
    assert.ok(label.children[0].style.height.endsWith('%'));
  });

  const firstPoster = labels[0].children[0];
  harness.error(firstPoster);
  assert.equal(firstPoster.hidden, true);
  assert.equal(harness.elements.wheelCenter.parentNode, harness.elements.wheelStage);
  assert.notEqual(harness.elements.wheelCenter.parentNode, harness.elements.wheel);
});
