const test = require('node:test');
const assert = require('node:assert/strict');

const Data = require('../shared/movie-data.js');
const Core = require('../shared/movie-core.js');

test('电影目录保留现有 15 部电影和 TMDB 海报', () => {
  assert.equal(Data.movies.length, 15);
  assert.equal(new Set(Data.movies.map((movie) => movie.name)).size, 15);

  const shawshank = Data.movies.find((movie) => movie.name === '肖申克的救赎');
  assert.deepEqual(shawshank.genres, ['剧情', '犯罪']);
  assert.equal(shawshank.doubanRating, '9.7');
  assert.match(shawshank.poster, /^https:\/\/image\.tmdb\.org\/t\/p\/w500\//);
});

test('搜索优先精确匹配并保留简单包含式模糊匹配', () => {
  assert.equal(Core.searchMovie(Data.movies, '星际穿越').name, '星际穿越');
  assert.equal(Core.searchMovie(Data.movies, '星际').name, '星际穿越');
  assert.equal(Core.searchMovie(Data.movies, '  星际  ').name, '星际穿越');
  assert.equal(Core.searchMovie(Data.movies, ''), null);
  assert.equal(Core.searchMovie(Data.movies, '不存在的电影'), null);
});

test('类型过滤支持全部和具体类型', () => {
  const all = Core.filterMovies(Data.movies, '全部');
  const animation = Core.filterMovies(Data.movies, '动画');

  assert.equal(all.length, 15);
  assert.notStrictEqual(all, Data.movies);
  assert.deepEqual(animation.map((movie) => movie.name), ['千与千寻', '机器人总动员']);
});

test('候选抽样不重复、最多 8 部且不会补齐小候选池', () => {
  const candidates = Core.sampleCandidates(Data.movies, 8, () => 0);
  const animation = Core.filterMovies(Data.movies, '动画');
  const smallPool = Core.sampleCandidates(animation, 8, () => 0);

  assert.equal(candidates.length, 8);
  assert.equal(new Set(candidates.map((movie) => movie.name)).size, 8);
  assert.equal(smallPool.length, 2);
  assert.equal(new Set(smallPool.map((movie) => movie.name)).size, 2);
});

test('候选池有多部电影时不会连续命中上一部', () => {
  const candidates = Data.movies.slice(0, 3);
  const winner = Core.pickWinner(candidates, candidates[0].name, () => 0);

  assert.equal(winner.name, candidates[1].name);
  assert.equal(Core.pickWinner([candidates[0]], candidates[0].name, () => 0), candidates[0]);
  assert.equal(Core.pickWinner([], null, () => 0), null);
});
