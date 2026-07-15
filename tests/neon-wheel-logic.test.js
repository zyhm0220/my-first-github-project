const test = require('node:test');
const assert = require('node:assert/strict');

const Page = require('../styles/neon-wheel/wheel.js');

function modulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

test('目标角度让命中扇区中心停在顶部指针', () => {
  const target = Page.computeTargetRotation(0, 2, 8, 5);
  assert.equal(modulo(target, 360), 270);

  const nextTarget = Page.computeTargetRotation(target, 0, 8, 5);
  assert.equal(modulo(nextTarget, 360), 0);
  assert.ok(nextTarget > target);
});

test('无效转盘参数明确抛出错误', () => {
  assert.throws(() => Page.computeTargetRotation(0, 0, 0, 5), /segmentCount/);
  assert.throws(() => Page.computeTargetRotation(0, 8, 8, 5), /winnerIndex/);
});

test('日期使用本地 YYYY-MM-DD 格式', () => {
  assert.equal(Page.formatLocalDate(new Date(2026, 6, 15)), '2026-07-15');
});

test('新增和编辑影评返回新数组且不修改输入', () => {
  const original = [{ movieName: '旧电影', rating: 1, review: '', date: '2026-07-14' }];
  const created = { movieName: '新电影', rating: 5, review: '好看', date: '2026-07-15' };
  const edited = { movieName: '旧电影', rating: 3, review: '已修改', date: '2026-07-15' };

  assert.deepEqual(Page.upsertReview(original, created, null), [created, original[0]]);
  assert.deepEqual(Page.upsertReview(original, edited, 0), [edited]);
  assert.deepEqual(original, [{ movieName: '旧电影', rating: 1, review: '', date: '2026-07-14' }]);
});

test('删除影评返回新数组且无效索引不删除内容', () => {
  const original = [{ movieName: 'A' }, { movieName: 'B' }];

  assert.deepEqual(Page.removeReview(original, 0), [{ movieName: 'B' }]);
  assert.deepEqual(Page.removeReview(original, 9), original);
  assert.notStrictEqual(Page.removeReview(original, 9), original);
});

test('删除影评后编辑索引继续指向同一条记录或退出编辑', () => {
  assert.equal(Page.adjustEditingIndexAfterDelete(null, 0), null);
  assert.equal(Page.adjustEditingIndexAfterDelete(1.5, 0), null);
  assert.equal(Page.adjustEditingIndexAfterDelete(2, 2), null);
  assert.equal(Page.adjustEditingIndexAfterDelete(2, 0), 1);
  assert.equal(Page.adjustEditingIndexAfterDelete(2, 3), 2);
});
