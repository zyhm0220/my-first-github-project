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

test('候选扇区支持动态裁切和单电影整圆', () => {
  assert.equal(Page.buildSegmentClipPath(0, 1), 'circle(50% at 50% 50%)');

  const firstOfEight = Page.buildSegmentClipPath(0, 8);
  const secondOfEight = Page.buildSegmentClipPath(1, 8);
  const halfWheel = Page.buildSegmentClipPath(0, 2);

  assert.match(firstOfEight, /^polygon\(50% 50%,/);
  assert.notEqual(firstOfEight, secondOfEight);
  assert.ok((halfWheel.match(/%/g) || []).length >= 20);
});

test('完整前景海报保持 2:3 比例并位于轮盘外半圈', () => {
  const single = Page.computePosterPlacement(0, 1);
  const pair = Page.computePosterPlacement(0, 2);
  const quarter = Page.computePosterPlacement(0, 4);
  const top = Page.computePosterPlacement(0, 8);
  const right = Page.computePosterPlacement(2, 8);

  assert.deepEqual(single, { left: 38, top: 1, width: 24, height: 36, rotation: 0 });
  assert.deepEqual(pair, { left: 38, top: 0, width: 24, height: 36, rotation: 0 });
  assert.deepEqual(quarter, { left: 39, top: 2.5, width: 22, height: 33, rotation: 0 });
  assert.deepEqual(top, { left: 42, top: 4, width: 16, height: 24, rotation: 0 });
  assert.deepEqual(right, { left: 76, top: 38, width: 16, height: 24, rotation: 90 });

  [single, pair, quarter, top, right].forEach((placement) => {
    assert.equal(placement.height / placement.width, 1.5);
  });
});

test('自然停靠偏移保持指针在中奖扇区内部', () => {
  const positiveOffset = Page.computeStopOffset(8, () => 1);
  const negativeOffset = Page.computeStopOffset(8, () => 0);
  const centerTarget = Page.computeTargetRotation(0, 2, 8, 5);
  const offsetTarget = Page.computeTargetRotation(0, 2, 8, 5, positiveOffset);

  assert.equal(positiveOffset, 8);
  assert.equal(negativeOffset, -8);
  assert.equal(modulo(centerTarget, 360), 270);
  assert.equal(modulo(offsetTarget, 360), 278);
  assert.ok(Math.abs(modulo(offsetTarget, 360) - modulo(centerTarget, 360)) < 22.5);
  assert.throws(() => Page.computeStopOffset(0, () => 0.5), /segmentCount/);
});
