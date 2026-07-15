const test = require('node:test');
const assert = require('node:assert/strict');

const Store = require('../shared/review-store.js');

function createStorage(initialValue) {
  const values = new Map();
  if (initialValue !== undefined) values.set(Store.REVIEW_KEY, initialValue);

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    }
  };
}

test('读取现有 movie_reviews 数组', () => {
  const storage = createStorage(JSON.stringify([
    { movieName: '星际穿越', rating: 5, review: '很好', date: '2026-07-15' }
  ]));

  assert.deepEqual(Store.loadReviews(storage), [
    { movieName: '星际穿越', rating: 5, review: '很好', date: '2026-07-15' }
  ]);
});

test('非法 JSON、非数组或读取异常均回退为空数组', () => {
  assert.deepEqual(Store.loadReviews(createStorage('{bad json')), []);
  assert.deepEqual(Store.loadReviews(createStorage(JSON.stringify({ value: 1 }))), []);
  assert.deepEqual(Store.loadReviews({ getItem() { throw new Error('blocked'); } }), []);
});

test('读取时忽略非记录数组项并规范化对象记录', () => {
  const valid = { movieName: '星际穿越', rating: 5, review: '很好', date: '2026-07-15' };
  const malformedFields = { movieName: { nested: true }, rating: {}, review: [], date: {} };
  const storage = createStorage(JSON.stringify([
    null,
    42,
    '无效记录',
    ['嵌套数组'],
    valid,
    malformedFields
  ]));

  assert.deepEqual(Store.loadReviews(storage), [
    valid,
    { movieName: '未知电影', rating: 0, review: '', date: '' }
  ]);
});

test('读取时只安全转换原始字段并将评分四舍五入限制到 0–5', () => {
  const storage = createStorage(JSON.stringify([
    { movieName: 2046, rating: '4.6', review: false, date: 20260715 },
    { movieName: true, rating: 9, review: 42, date: false },
    { movieName: '', rating: '-2', review: null, date: [], extra: '不保留' },
    { movieName: '安全电影', rating: 'Infinity', review: '安全影评', date: '2026-07-15' }
  ]));

  assert.deepEqual(Store.loadReviews(storage), [
    { movieName: '2046', rating: 5, review: 'false', date: '20260715' },
    { movieName: 'true', rating: 5, review: '42', date: 'false' },
    { movieName: '未知电影', rating: 0, review: '', date: '' },
    { movieName: '安全电影', rating: 0, review: '安全影评', date: '2026-07-15' }
  ]);
});

test('保存成功时沿用 movie_reviews 键和值格式', () => {
  const storage = createStorage();
  const reviews = [{ movieName: '千与千寻', rating: 4, review: '', date: '2026-07-15' }];

  assert.equal(Store.saveReviews(reviews, storage), true);
  assert.deepEqual(Store.loadReviews(storage), reviews);
});

test('非数组输入和写入异常返回 false', () => {
  assert.equal(Store.saveReviews({}, createStorage()), false);
  assert.equal(Store.saveReviews([], { setItem() { throw new Error('quota'); } }), false);
});
