# 影轮 CineSpin 桌面转盘页面实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **当前执行说明（以 Task 5 为准）：** Task 1–4 中标注 `with exactly` / `Create ... with exactly` 的代码块是当时的历史 RED→GREEN 基线，用于记录实施过程，不再代表最终源码。若这些旧片段、旧测试数量或旧控制器行为与 **Task 5：最终加固** 冲突，必须以 Task 5 的完整可执行规格和最终测试基线为唯一当前依据。

**Goal:** 新增一个独立的“影轮 CineSpin”桌面电影转盘页面，在不修改现有经典首页的前提下复用 15 部电影数据、搜索逻辑和影评存储。

**Architecture:** 使用无构建流程的原生 HTML、CSS 和 JavaScript。`shared/` 提供可被未来老虎机页面复用的电影目录、筛选/抽取核心和 `localStorage` 兼容层；`styles/neon-wheel/` 只负责转盘页面结构、视觉、动画和 DOM 协调。共享逻辑使用普通浏览器脚本与受控全局命名空间，同时暴露 CommonJS 导出供 Node 内置测试运行器验证。

**Tech Stack:** HTML5、CSS3、原生 JavaScript、Node.js 24 `node:test`、浏览器 `localStorage`、Python 3 静态 HTTP 服务器、Chrome/Edge 桌面浏览器。

## Global Constraints

- 本任务只实现桌面端，验收视口为 1280×720 和 1440×900。
- 页面路径必须是 `styles/neon-wheel/`，品牌必须是“影轮 CineSpin”，主标题必须是“今晚看什么？让命运替你决定”。
- 继续使用现有 15 部电影，不扩充数据，不接入实时电影 API。
- 不修改根目录 `index.html`；其 Git blob 哈希必须保持 `9239b2389eb17401f12320a6a7b51d3809aa69d3`。
- 不引入框架、包管理器、构建流程、在线字体、后端、数据库、登录或支付。
- 所有脚本使用普通 `<script>`，不使用 ES Module；页面必须能通过本地静态服务器运行。
- TMDB 海报地址继续使用；加载失败时必须展示霓虹占位卡。
- 新风格页面共享 `movie_reviews` 存储键和 `{ movieName, rating, review, date }` 数据格式。
- 用户影评必须通过 `textContent` 或等价安全 DOM API 渲染，不能拼接到 `innerHTML`。
- 旋转时长约 4 秒；减少动态效果模式下快速完成并关闭粒子效果。
- 交互元素使用原生表单控件，支持键盘操作和可见焦点状态。
- 第二个老虎机页面、风格选择入口、经典页面共享层迁移和电影数量扩充均不属于本计划。

---

## File Map

- Create: `shared/movie-data.js` — 新风格页面的统一 15 部电影目录。
- Create: `shared/movie-core.js` — 名称搜索、类型过滤、无重复候选生成和避免连续命中的结果选择。
- Create: `shared/review-store.js` — `movie_reviews` 的容错读取与可报告失败的写入。
- Create: `styles/neon-wheel/index.html` — 转盘页面语义结构和脚本装配。
- Create: `styles/neon-wheel/wheel.css` — 桌面布局、视觉系统、转盘几何、状态和动效。
- Create: `styles/neon-wheel/wheel.js` — 页面状态、转盘动画、搜索、详情、评分和观影历史协调。
- Create: `tests/movie-core.test.js` — 电影目录及共享核心单元测试。
- Create: `tests/review-store.test.js` — 存储容错和写入结果单元测试。
- Create: `tests/neon-wheel-structure.test.js` — 页面结构、脚本顺序和视觉约束静态测试。
- Create: `tests/neon-wheel-logic.test.js` — 转盘角度、日期和不可变影评列表操作单元测试。
- Create: `tests/neon-wheel-integration.test.js` — 通过真实页面控制器验证抽取、搜索、海报回退和影评生命周期。
- Create: `tests/helpers/neon-wheel-harness.js` — 无第三方依赖的最小 DOM、事件、存储和计时器测试接缝。
- Modify: `README.md` — 增加新风格页面入口和目录说明。
- Preserve unchanged: `index.html` — 经典页面不得发生任何变更。

### Task 1: 建立共享电影目录和抽取核心

**Files:**
- Create: `shared/movie-data.js`
- Create: `shared/movie-core.js`
- Create: `tests/movie-core.test.js`

**Interfaces:**
- Produces: `MoviePickerData.movies: ReadonlyArray<Movie>`，其中 `Movie = { id, name, genres, doubanRating, summary, poster }`。
- Produces: `MoviePickerCore.searchMovie(movies, query): Movie | null`。
- Produces: `MoviePickerCore.filterMovies(movies, genre): Movie[]`。
- Produces: `MoviePickerCore.sampleCandidates(movies, limit, random): Movie[]`。
- Produces: `MoviePickerCore.pickWinner(candidates, previousName, random): Movie | null`。
- Consumes: 无；本任务不读取 DOM、存储或网络。

- [ ] **Step 1: 编写电影目录与核心逻辑的失败测试**

Create `tests/movie-core.test.js` with exactly:

```js
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
```

- [ ] **Step 2: 运行测试并确认因共享文件不存在而失败**

Run:

```powershell
node --test tests/movie-core.test.js
```

Expected: FAIL，错误包含 `Cannot find module '../shared/movie-data.js'`。

- [ ] **Step 3: 创建完整的共享电影目录**

Create `shared/movie-data.js` with exactly:

```js
(function exposeMovieData(root, factory) {
  var api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.MoviePickerData = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createMovieData() {
  'use strict';

  var POSTER_BASE = 'https://image.tmdb.org/t/p/w500';
  var rawMovies = [
    {
      id: 'shawshank-redemption',
      name: '肖申克的救赎',
      genres: ['剧情', '犯罪'],
      doubanRating: '9.7',
      summary: '银行家安迪被冤入狱，用二十年凿开一堵墙，救赎了自己也唤醒了肖申克监狱里每一个人的希望。',
      poster: POSTER_BASE + '/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg'
    },
    {
      id: 'farewell-my-concubine',
      name: '霸王别姬',
      genres: ['剧情', '历史'],
      doubanRating: '9.6',
      summary: '两个京剧伶人跨越半个世纪的悲欢离合，时代洪流下的爱恨纠葛，不疯魔不成活。',
      poster: POSTER_BASE + '/f54hNIiHNINw3JiUJB2XaQl5wCN.jpg'
    },
    {
      id: 'forrest-gump',
      name: '阿甘正传',
      genres: ['剧情', '喜剧'],
      doubanRating: '9.5',
      summary: '智商只有75的阿甘，凭着奔跑和善良跑过了越战、乒乓外交，跑出了传奇的一生。',
      poster: POSTER_BASE + '/Cw4hIUIAmSYfK9QfaUW5igp9La.jpg'
    },
    {
      id: 'life-is-beautiful',
      name: '美丽人生',
      genres: ['喜剧', '战争'],
      doubanRating: '9.5',
      summary: '父亲在集中营用游戏和谎言保护儿子的童心，用最残酷的底色画出最温暖的父爱。',
      poster: POSTER_BASE + '/74hLDKjD5aGYOotO6esUVaeISa2.jpg'
    },
    {
      id: 'titanic',
      name: '泰坦尼克号',
      genres: ['爱情', '灾难'],
      doubanRating: '9.5',
      summary: '穷画家和贵族少女在泰坦尼克号上相遇相爱，巨轮沉没，爱情却成为永恒。',
      poster: POSTER_BASE + '/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg'
    },
    {
      id: 'interstellar',
      name: '星际穿越',
      genres: ['科幻', '冒险'],
      doubanRating: '9.4',
      summary: '一组宇航员穿越虫洞，为濒死的人类寻找新家园。时间和引力可以弯曲，唯有父女之爱穿越一切维度。',
      poster: POSTER_BASE + '/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg'
    },
    {
      id: 'spirited-away',
      name: '千与千寻',
      genres: ['动画', '奇幻'],
      doubanRating: '9.4',
      summary: '女孩千寻误入神灵世界，为救父母在汤屋打工。宫崎骏创造一个奇幻又温暖的神隐之旅。',
      poster: POSTER_BASE + '/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg'
    },
    {
      id: 'inception',
      name: '盗梦空间',
      genres: ['科幻', '悬疑'],
      doubanRating: '9.4',
      summary: '潜入他人梦境窃取秘密，层层嵌套的梦中梦。一只陀螺旋转不停，现实与梦境究竟谁真谁假？',
      poster: POSTER_BASE + '/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg'
    },
    {
      id: 'leon-the-professional',
      name: '这个杀手不太冷',
      genres: ['动作', '剧情'],
      doubanRating: '9.4',
      summary: '孤独的职业杀手和失去家人的小女孩相依为命。冷酷外表下藏着一颗最温柔的心。',
      poster: POSTER_BASE + '/bxB2q91nKYp8JNzqE7t7TWBVupB.jpg'
    },
    {
      id: 'schindlers-list',
      name: '辛德勒的名单',
      genres: ['历史', '战争'],
      doubanRating: '9.5',
      summary: '德国商人辛德勒倾尽家财，从纳粹魔爪下救出1100名犹太人的生命。拯救一人，即拯救全世界。',
      poster: POSTER_BASE + '/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg'
    },
    {
      id: 'the-truman-show',
      name: '楚门的世界',
      genres: ['剧情', '喜剧'],
      doubanRating: '9.3',
      summary: '从出生起就活在真人秀中的男人，终于发现头顶的蓝天是一面巨大的幕布。他选择走出去。',
      poster: POSTER_BASE + '/vuza0WqY239yBXOadKlGwJsZJFE.jpg'
    },
    {
      id: 'three-idiots',
      name: '三傻大闹宝莱坞',
      genres: ['喜剧', '剧情'],
      doubanRating: '9.2',
      summary: '三个工科大学生的校园故事，用笑声讽刺应试教育，追问什么是真正的学习和成功。',
      poster: POSTER_BASE + '/66A9MqXOyVFCssoloscw79z8Tew.jpg'
    },
    {
      id: 'wall-e',
      name: '机器人总动员',
      genres: ['动画', '科幻'],
      doubanRating: '9.3',
      summary: '被遗弃在地球的小机器人瓦力，默默清扫垃圾700年，直到遇见来寻找生命迹象的伊芙。',
      poster: POSTER_BASE + '/hbhFnRzzg6ZDmm8YAmxBnQpQIPh.jpg'
    },
    {
      id: 'a-chinese-odyssey-part-two',
      name: '大话西游之大圣娶亲',
      genres: ['喜剧', '奇幻'],
      doubanRating: '9.2',
      summary: '至尊宝戴上金箍变成孙悟空的那一天，终于懂了什么是爱。我的意中人是个盖世英雄。',
      poster: POSTER_BASE + '/ksloRonL1kOq4yErf9LOJ5qDhem.jpg'
    },
    {
      id: 'the-silence-of-the-lambs',
      name: '沉默的羔羊',
      genres: ['恐怖', '惊悚'],
      doubanRating: '9.0',
      summary: '年轻FBI探员为追查连环杀手求助食人魔汉尼拔。一场心理博弈，恐惧与智慧的交锋。',
      poster: POSTER_BASE + '/uS9m8OBk1A8eM9I042bx8XXpqAq.jpg'
    }
  ];

  var movies = rawMovies.map(function freezeMovie(movie) {
    return Object.freeze({
      id: movie.id,
      name: movie.name,
      genres: Object.freeze(movie.genres.slice()),
      doubanRating: movie.doubanRating,
      summary: movie.summary,
      poster: movie.poster
    });
  });

  return Object.freeze({
    POSTER_BASE: POSTER_BASE,
    movies: Object.freeze(movies)
  });
});
```

- [ ] **Step 4: 创建最小且可复用的搜索、过滤和抽取核心**

Create `shared/movie-core.js` with exactly:

```js
(function exposeMovieCore(root, factory) {
  var api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.MoviePickerCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createMovieCore() {
  'use strict';

  function normalizeQuery(query) {
    return String(query == null ? '' : query).trim();
  }

  function searchMovie(movies, query) {
    var normalized = normalizeQuery(query);
    var exact;

    if (!normalized) return null;

    exact = movies.find(function findExact(movie) {
      return movie.name === normalized;
    });

    if (exact) return exact;

    return movies.find(function findPartial(movie) {
      return movie.name.indexOf(normalized) !== -1 || normalized.indexOf(movie.name) !== -1;
    }) || null;
  }

  function filterMovies(movies, genre) {
    if (!genre || genre === '全部') return movies.slice();

    return movies.filter(function hasGenre(movie) {
      return movie.genres.indexOf(genre) !== -1;
    });
  }

  function sampleCandidates(movies, limit, random) {
    var source = movies.slice();
    var max = Math.min(Number(limit) || 8, source.length);
    var rng = typeof random === 'function' ? random : Math.random;
    var index;
    var swapIndex;
    var temp;

    for (index = source.length - 1; index > 0; index -= 1) {
      swapIndex = Math.floor(rng() * (index + 1));
      temp = source[index];
      source[index] = source[swapIndex];
      source[swapIndex] = temp;
    }

    return source.slice(0, max);
  }

  function pickWinner(candidates, previousName, random) {
    var rng = typeof random === 'function' ? random : Math.random;
    var eligible;
    var index;

    if (!candidates.length) return null;

    eligible = candidates.length > 1
      ? candidates.filter(function excludePrevious(movie) {
          return movie.name !== previousName;
        })
      : candidates.slice();

    if (!eligible.length) eligible = candidates.slice();

    index = Math.min(Math.floor(rng() * eligible.length), eligible.length - 1);
    return eligible[index];
  }

  return Object.freeze({
    normalizeQuery: normalizeQuery,
    searchMovie: searchMovie,
    filterMovies: filterMovies,
    sampleCandidates: sampleCandidates,
    pickWinner: pickWinner
  });
});
```

- [ ] **Step 5: 运行核心测试并确认全部通过**

Run:

```powershell
node --test tests/movie-core.test.js
```

Expected: `5` tests，`5` pass，`0` fail。

- [ ] **Step 6: 提交共享电影基础**

Run:

```powershell
git add -- shared/movie-data.js shared/movie-core.js tests/movie-core.test.js
git diff --cached --check
git commit -m "feat: add shared movie selection core"
```

Expected: 提交只包含上述 3 个文件。

### Task 2: 建立兼容现有页面的影评存储层

**Files:**
- Create: `shared/review-store.js`
- Create: `tests/review-store.test.js`

**Interfaces:**
- Produces: `MoviePickerReviewStore.REVIEW_KEY === 'movie_reviews'`。
- Produces: `MoviePickerReviewStore.loadReviews(storage?): Review[]`；读取失败、非法 JSON 或非数组值返回 `[]`。
- Produces: `MoviePickerReviewStore.saveReviews(reviews, storage?): boolean`；成功返回 `true`，验证或写入失败返回 `false`。
- Consumes: 浏览器 `localStorage` 或测试传入的同接口存储对象。

- [ ] **Step 1: 编写存储容错和失败报告测试**

Create `tests/review-store.test.js` with exactly:

```js
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
```

- [ ] **Step 2: 运行测试并确认因存储模块不存在而失败**

Run:

```powershell
node --test tests/review-store.test.js
```

Expected: FAIL，错误包含 `Cannot find module '../shared/review-store.js'`。

- [ ] **Step 3: 实现存储兼容层**

Create `shared/review-store.js` with exactly:

```js
(function exposeReviewStore(root, factory) {
  var api = factory(root);

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.MoviePickerReviewStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createReviewStore(root) {
  'use strict';

  var REVIEW_KEY = 'movie_reviews';

  function resolveStorage(storage) {
    if (storage) return storage;

    try {
      return root.localStorage;
    } catch (error) {
      return null;
    }
  }

  function loadReviews(storage) {
    var target = resolveStorage(storage);
    var parsed;

    if (!target) return [];

    try {
      parsed = JSON.parse(target.getItem(REVIEW_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function saveReviews(reviews, storage) {
    var target = resolveStorage(storage);

    if (!target || !Array.isArray(reviews)) return false;

    try {
      target.setItem(REVIEW_KEY, JSON.stringify(reviews));
      return true;
    } catch (error) {
      return false;
    }
  }

  return Object.freeze({
    REVIEW_KEY: REVIEW_KEY,
    loadReviews: loadReviews,
    saveReviews: saveReviews
  });
});
```

- [ ] **Step 4: 运行存储测试并确认全部通过**

Run:

```powershell
node --test tests/review-store.test.js
```

Expected: `4` tests，`4` pass，`0` fail。

- [ ] **Step 5: 运行当前全部单元测试确认没有回归**

Run:

```powershell
node --test
```

Expected: `9` tests，`9` pass，`0` fail。

- [ ] **Step 6: 提交影评存储层**

Run:

```powershell
git add -- shared/review-store.js tests/review-store.test.js
git diff --cached --check
git commit -m "feat: add shared review storage"
```

Expected: 提交只包含上述 2 个文件。

### Task 3: 构建完整的桌面霓虹转盘页面

**Files:**
- Create: `styles/neon-wheel/index.html`
- Create: `styles/neon-wheel/wheel.css`
- Create: `styles/neon-wheel/wheel.js`
- Create: `tests/neon-wheel-structure.test.js`
- Create: `tests/neon-wheel-logic.test.js`
- Create: `tests/neon-wheel-integration.test.js`
- Create: `tests/helpers/neon-wheel-harness.js`

**Interfaces:**
- Consumes: `MoviePickerData.movies`、`MoviePickerCore` 的 4 个查询/抽取函数、`MoviePickerReviewStore` 的读取和保存函数。
- Produces: `NeonWheelPage.computeTargetRotation(currentRotation, winnerIndex, segmentCount, turns): number`。
- Produces: `NeonWheelPage.formatLocalDate(date): string`。
- Produces: `NeonWheelPage.upsertReview(reviews, entry, editingIndex): Review[]`。
- Produces: `NeonWheelPage.removeReview(reviews, index): Review[]`。
- Produces: `NeonWheelPage.adjustEditingIndexAfterDelete(editingIndex, deletedIndex): number | null`。
- Produces: 可访问的 `styles/neon-wheel/` 页面，包含筛选、转盘、搜索、详情、评分、影评和历史完整流程。

- [ ] **Step 1: 编写页面结构和脚本装配的失败测试**

Create `tests/neon-wheel-structure.test.js` with exactly:

```js
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
```

- [ ] **Step 2: 编写转盘角度和影评列表操作的失败测试**

Create `tests/neon-wheel-logic.test.js` with exactly:

```js
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

test('删除影评后同步调整正在编辑的索引', () => {
  assert.equal(Page.adjustEditingIndexAfterDelete(2, 0), 1);
  assert.equal(Page.adjustEditingIndexAfterDelete(2, 2), null);
  assert.equal(Page.adjustEditingIndexAfterDelete(1, 2), 1);
  assert.equal(Page.adjustEditingIndexAfterDelete(null, 0), null);
});
```

- [ ] **Step 3: 运行页面测试并确认因页面文件尚不存在而失败**

Run:

```powershell
node --test tests/neon-wheel-structure.test.js tests/neon-wheel-logic.test.js
```

Expected: FAIL，错误分别包含 `ENOENT` 和 `Cannot find module '../styles/neon-wheel/wheel.js'`。

- [ ] **Step 4: 创建转盘页面完整语义结构**

Create `styles/neon-wheel/index.html` with exactly:

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="影轮 CineSpin——用霓虹电影转盘决定今晚看什么。">
  <title>影轮 CineSpin｜今晚看什么？</title>
  <link rel="stylesheet" href="./wheel.css">
</head>
<body>
  <a class="skip-link" href="#wheelSection">跳到命运转盘</a>

  <header class="site-header">
    <a class="brand" href="#wheelSection" aria-label="影轮 CineSpin 首页">
      <span class="brand__mark" aria-hidden="true">◉</span>
      <span>影轮 <b>CineSpin</b></span>
    </a>
    <nav class="site-nav" aria-label="页面导航">
      <a class="is-active" href="#wheelSection">命运转盘</a>
      <a href="#searchSection">搜索电影</a>
      <a href="#historySection">观影记录</a>
    </nav>
  </header>

  <main>
    <section class="hero" id="wheelSection" aria-labelledby="heroTitle">
      <div class="hero__copy">
        <p class="eyebrow">YOUR MOVIE · YOUR MOMENT</p>
        <h1 id="heroTitle">今晚看什么？<br><span>让命运替你决定</span></h1>
        <p class="hero__description">从八部候选电影中转动光影轮盘，告别选择困难，邂逅今晚的故事。</p>
        <button class="button button--primary" id="spinButton" type="button">
          <span aria-hidden="true">✦</span> 转动命运转盘
        </button>
        <p class="wheel-status" id="wheelStatus" role="status">正在准备今晚的候选电影…</p>
      </div>

      <div class="wheel-panel" aria-label="电影候选转盘">
        <div class="wheel-stage">
          <div class="wheel-pointer" aria-hidden="true"></div>
          <div class="wheel" id="wheel" role="img" aria-label="电影候选转盘">
            <div class="wheel-labels" id="wheelLabels"></div>
            <div class="wheel-center" aria-hidden="true">🍿</div>
          </div>
          <div class="particles" id="particles" aria-hidden="true"></div>
        </div>

        <div class="genre-filters" id="genreFilters" aria-label="按电影类型筛选">
          <button class="genre-chip is-active" type="button" data-genre="全部" aria-pressed="true">全部</button>
          <button class="genre-chip" type="button" data-genre="剧情" aria-pressed="false">剧情</button>
          <button class="genre-chip" type="button" data-genre="喜剧" aria-pressed="false">喜剧</button>
          <button class="genre-chip" type="button" data-genre="科幻" aria-pressed="false">科幻</button>
          <button class="genre-chip" type="button" data-genre="动画" aria-pressed="false">动画</button>
          <button class="genre-chip" type="button" data-genre="爱情" aria-pressed="false">爱情</button>
        </div>
      </div>
    </section>

    <section class="search-section" id="searchSection" aria-labelledby="searchTitle">
      <div>
        <p class="section-kicker">ALREADY HAVE AN ANSWER?</p>
        <h2 id="searchTitle">心里已经有答案？</h2>
      </div>
      <form class="search-form" id="searchForm" novalidate>
        <label class="sr-only" for="searchInput">输入电影名称</label>
        <input id="searchInput" name="movie" type="search" placeholder="输入电影名称进行搜索…" autocomplete="off">
        <button class="button button--secondary" type="submit">搜索电影</button>
      </form>
      <p class="search-message" id="searchMessage" role="status"></p>
    </section>

    <section class="result-section" id="resultSection" aria-labelledby="resultTitle" hidden>
      <div class="section-heading">
        <p class="section-kicker">TONIGHT'S PICK</p>
        <h2 id="resultTitle">命运为你选中了</h2>
      </div>

      <div class="result-grid">
        <article class="movie-card">
          <div class="poster-frame">
            <img id="moviePoster" alt="" loading="lazy">
            <div class="poster-fallback" id="posterFallback" hidden aria-hidden="true">🎬</div>
          </div>
          <div class="movie-copy">
            <p class="movie-rating" id="movieRating"></p>
            <h3 id="movieTitle"></h3>
            <div class="movie-genres" id="movieGenres"></div>
            <p class="movie-summary" id="movieSummary"></p>
          </div>
        </article>

        <aside class="review-card" aria-labelledby="reviewTitle">
          <p class="section-kicker">MY REVIEW</p>
          <h3 id="reviewTitle">记录这次相遇</h3>
          <div class="star-rating" id="starRating" role="radiogroup" aria-label="五星评分">
            <button type="button" data-rating="1" role="radio" aria-checked="false" aria-label="1 星">★</button>
            <button type="button" data-rating="2" role="radio" aria-checked="false" aria-label="2 星">★</button>
            <button type="button" data-rating="3" role="radio" aria-checked="false" aria-label="3 星">★</button>
            <button type="button" data-rating="4" role="radio" aria-checked="false" aria-label="4 星">★</button>
            <button type="button" data-rating="5" role="radio" aria-checked="false" aria-label="5 星">★</button>
          </div>
          <button class="clear-rating" id="clearRatingButton" type="button" disabled>清除评分</button>
          <label class="sr-only" for="reviewText">写下观影感受</label>
          <textarea id="reviewText" rows="5" placeholder="写下你的观影感受…"></textarea>
          <button class="button button--primary button--full" id="saveReviewButton" type="button">保存影评</button>
        </aside>
      </div>
    </section>

    <section class="history-section" id="historySection" aria-labelledby="historyTitle">
      <div class="section-heading">
        <p class="section-kicker">MY MOVIE JOURNAL</p>
        <h2 id="historyTitle">我的观影历史</h2>
      </div>
      <div class="history-grid" id="historyList"></div>
    </section>
  </main>

  <footer class="site-footer">
    <span>影轮 CineSpin</span>
    <span>让每一次选择，都成为一场电影。</span>
  </footer>

  <div class="toast" id="toast" role="status" aria-live="polite"></div>
  <div class="sr-only" id="liveRegion" aria-live="polite"></div>

  <script src="../../shared/movie-data.js"></script>
  <script src="../../shared/movie-core.js"></script>
  <script src="../../shared/review-store.js"></script>
  <script src="./wheel.js"></script>
</body>
</html>
```

- [ ] **Step 5: 实现确认过的深色霓虹桌面视觉系统**

Create `styles/neon-wheel/wheel.css` with exactly:

```css
:root {
  color-scheme: dark;
  --page: #060711;
  --surface: #111226;
  --surface-soft: #0c0d1e;
  --violet: #7c3aed;
  --indigo: #4f46e5;
  --cyan: #38bdf8;
  --pink: #f472b6;
  --yellow: #facc15;
  --text: #f8fafc;
  --muted: #94a3b8;
  --border: rgba(148, 163, 184, 0.16);
  --spin-duration: 4000ms;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  min-width: 1180px;
  min-height: 100vh;
  margin: 0;
  color: var(--text);
  background:
    radial-gradient(circle at 78% 15%, rgba(76, 29, 149, 0.3), transparent 28%),
    radial-gradient(circle at 18% 70%, rgba(30, 64, 175, 0.12), transparent 30%),
    var(--page);
}

body::before {
  position: fixed;
  inset: 0;
  z-index: -1;
  content: "";
  pointer-events: none;
  opacity: 0.4;
  background-image:
    radial-gradient(circle at 12% 18%, rgba(255, 255, 255, 0.5) 0 1px, transparent 1.5px),
    radial-gradient(circle at 62% 12%, rgba(129, 140, 248, 0.5) 0 1px, transparent 1.5px),
    radial-gradient(circle at 84% 76%, rgba(244, 114, 182, 0.45) 0 1px, transparent 1.5px);
  background-size: 260px 220px, 340px 300px, 420px 360px;
}

button,
input,
textarea {
  font: inherit;
}

button,
a {
  -webkit-tap-highlight-color: transparent;
}

button:not(:disabled),
a {
  cursor: pointer;
}

button:disabled {
  cursor: wait;
  opacity: 0.55;
}

[hidden] {
  display: none !important;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.skip-link {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 100;
  padding: 10px 14px;
  color: var(--text);
  background: var(--violet);
  border-radius: 8px;
  transform: translateY(-160%);
}

.skip-link:focus {
  transform: translateY(0);
}

:focus-visible {
  outline: 3px solid var(--cyan);
  outline-offset: 4px;
}

.site-header,
.hero,
.search-section,
.result-section,
.history-section,
.site-footer {
  width: min(1180px, calc(100% - 80px));
  margin-inline: auto;
}

.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 76px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.brand {
  display: inline-flex;
  gap: 10px;
  align-items: center;
  color: var(--text);
  font-size: 18px;
  font-weight: 760;
  text-decoration: none;
}

.brand__mark {
  color: #a855f7;
  font-size: 25px;
  filter: drop-shadow(0 0 9px rgba(168, 85, 247, 0.8));
}

.brand b {
  font-weight: 820;
}

.site-nav {
  display: flex;
  gap: 34px;
}

.site-nav a {
  position: relative;
  padding: 10px 0;
  color: var(--muted);
  font-size: 14px;
  text-decoration: none;
}

.site-nav a:hover,
.site-nav a.is-active {
  color: var(--text);
}

.site-nav a.is-active::after {
  position: absolute;
  right: 0;
  bottom: 2px;
  left: 0;
  height: 2px;
  content: "";
  background: linear-gradient(90deg, var(--violet), var(--cyan));
  border-radius: 99px;
}

.hero {
  display: grid;
  grid-template-columns: 0.92fr 1.08fr;
  gap: 42px;
  align-items: center;
  min-height: 650px;
  padding: 54px 0 64px;
}

.eyebrow,
.section-kicker {
  margin: 0 0 14px;
  color: #818cf8;
  font-size: 12px;
  font-weight: 760;
  letter-spacing: 0.18em;
}

.hero h1 {
  max-width: 520px;
  margin: 0;
  font-size: clamp(50px, 4.5vw, 70px);
  line-height: 1.08;
  letter-spacing: -0.04em;
}

.hero h1 span {
  color: transparent;
  background: linear-gradient(90deg, #60a5fa 0%, #a78bfa 52%, #e879f9 100%);
  background-clip: text;
  -webkit-background-clip: text;
}

.hero__description {
  max-width: 430px;
  margin: 24px 0 28px;
  color: var(--muted);
  font-size: 17px;
  line-height: 1.8;
}

.button {
  min-height: 48px;
  padding: 0 22px;
  color: var(--text);
  font-weight: 760;
  border: 0;
  border-radius: 999px;
}

.button--primary {
  background: linear-gradient(100deg, #6d28d9, var(--indigo), #2563eb);
  box-shadow: 0 0 26px rgba(99, 102, 241, 0.48);
}

.button--primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 0 34px rgba(99, 102, 241, 0.66);
}

.button--secondary {
  flex: 0 0 auto;
  color: #ddd6fe;
  background: rgba(49, 46, 129, 0.54);
  border: 1px solid rgba(139, 92, 246, 0.5);
}

.button--full {
  width: 100%;
  margin-top: 16px;
}

.wheel-status,
.search-message {
  min-height: 22px;
  margin: 18px 0 0;
  color: #a5b4fc;
  font-size: 14px;
}

.wheel-panel {
  display: grid;
  justify-items: center;
  gap: 28px;
}

.wheel-stage {
  position: relative;
  display: grid;
  place-items: center;
  width: 520px;
  height: 520px;
}

.wheel-stage::before {
  position: absolute;
  width: 430px;
  height: 430px;
  content: "";
  background: rgba(76, 29, 149, 0.35);
  border-radius: 50%;
  filter: blur(70px);
}

.wheel-pointer {
  position: absolute;
  top: 3px;
  left: 50%;
  z-index: 5;
  width: 0;
  height: 0;
  border-right: 15px solid transparent;
  border-left: 15px solid transparent;
  border-top: 30px solid var(--pink);
  filter: drop-shadow(0 0 9px rgba(244, 114, 182, 0.95));
  transform: translateX(-50%);
}

.wheel {
  position: relative;
  width: 470px;
  height: 470px;
  overflow: hidden;
  background: conic-gradient(#2e1065, #111c44);
  border: 5px solid var(--violet);
  border-radius: 50%;
  box-shadow:
    0 0 28px rgba(79, 70, 229, 0.86),
    0 0 70px rgba(76, 29, 149, 0.34),
    inset 0 0 50px rgba(6, 7, 17, 0.85);
  transition: transform var(--spin-duration) cubic-bezier(0.12, 0.72, 0.08, 1);
  will-change: transform;
}

.wheel::after {
  position: absolute;
  inset: 18px;
  content: "";
  pointer-events: none;
  border: 1px solid rgba(196, 181, 253, 0.28);
  border-radius: 50%;
}

.wheel-labels {
  position: absolute;
  inset: 0;
}

.wheel-label {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 2;
  display: grid;
  justify-items: center;
  width: 94px;
  color: #e0e7ff;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
  transform-origin: center;
}

.wheel-label img {
  width: 46px;
  height: 65px;
  margin-bottom: 7px;
  object-fit: cover;
  background: #16172e;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 6px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
}

.wheel-label span {
  display: -webkit-box;
  max-width: 94px;
  overflow: hidden;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.wheel-label.is-winner img {
  border-color: #f0abfc;
  box-shadow: 0 0 22px rgba(244, 114, 182, 0.95);
}

.wheel-center {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 4;
  display: grid;
  place-items: center;
  width: 112px;
  height: 112px;
  font-size: 38px;
  background: radial-gradient(circle at 35% 30%, #6d28d9, #2e1065 72%);
  border: 3px solid #a78bfa;
  border-radius: 50%;
  box-shadow: 0 0 26px rgba(124, 58, 237, 0.86);
  transform: translate(-50%, -50%);
}

.particles {
  position: absolute;
  inset: 0;
  z-index: 8;
  overflow: hidden;
  pointer-events: none;
}

.particle {
  position: absolute;
  width: 7px;
  height: 7px;
  background: var(--pink);
  border-radius: 2px;
  animation: particle-burst 850ms ease-out forwards;
}

@keyframes particle-burst {
  from { opacity: 1; transform: translate(0, 0) rotate(0); }
  to { opacity: 0; transform: translate(var(--x), var(--y)) rotate(180deg); }
}

.genre-filters {
  display: flex;
  gap: 9px;
  justify-content: center;
}

.genre-chip {
  min-width: 66px;
  padding: 9px 15px;
  color: #a5b4fc;
  background: rgba(15, 23, 42, 0.68);
  border: 1px solid rgba(67, 56, 202, 0.52);
  border-radius: 999px;
}

.genre-chip:hover:not(:disabled),
.genre-chip.is-active {
  color: var(--text);
  background: #4c1d95;
  border-color: #8b5cf6;
}

.search-section {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 16px 42px;
  align-items: center;
  padding: 28px 34px;
  background: rgba(17, 18, 38, 0.76);
  border: 1px solid var(--border);
  border-radius: 18px;
  box-shadow: 0 22px 50px rgba(0, 0, 0, 0.18);
}

.search-section h2,
.section-heading h2 {
  margin: 0;
  font-size: 30px;
}

.search-section .section-kicker {
  margin-bottom: 7px;
  font-size: 10px;
}

.search-form {
  display: flex;
  gap: 12px;
}

.search-form input,
.review-card textarea {
  width: 100%;
  color: var(--text);
  background: rgba(6, 7, 17, 0.78);
  border: 1px solid rgba(99, 102, 241, 0.36);
  border-radius: 12px;
}

.search-form input {
  min-height: 50px;
  padding: 0 16px;
}

.search-form input::placeholder,
.review-card textarea::placeholder {
  color: #64748b;
}

.search-message {
  grid-column: 2;
  margin: 0;
}

.result-section,
.history-section {
  padding: 100px 0 24px;
}

.section-heading {
  margin-bottom: 26px;
}

.result-grid {
  display: grid;
  grid-template-columns: 1.45fr 0.75fr;
  gap: 22px;
}

.movie-card,
.review-card,
.history-card {
  background: rgba(17, 18, 38, 0.82);
  border: 1px solid var(--border);
  border-radius: 20px;
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.24);
}

.movie-card {
  display: grid;
  grid-template-columns: 210px 1fr;
  gap: 28px;
  padding: 24px;
}

.poster-frame {
  position: relative;
  height: 310px;
  overflow: hidden;
  background: linear-gradient(145deg, #312e81, #111827);
  border-radius: 14px;
}

.poster-frame img,
.poster-fallback {
  width: 100%;
  height: 100%;
}

.poster-frame img {
  display: block;
  object-fit: cover;
}

.poster-fallback {
  display: grid;
  place-items: center;
  font-size: 50px;
  background:
    radial-gradient(circle at 50% 40%, rgba(124, 58, 237, 0.5), transparent 45%),
    #0f1022;
}

.movie-copy {
  align-self: center;
}

.movie-rating {
  margin: 0;
  color: var(--yellow);
  font-size: 15px;
  font-weight: 750;
}

.movie-copy h3,
.review-card h3 {
  margin: 12px 0;
  font-size: 28px;
}

.movie-genres {
  display: flex;
  gap: 8px;
  margin: 18px 0;
}

.movie-genres span {
  padding: 6px 11px;
  color: #ddd6fe;
  font-size: 12px;
  background: rgba(76, 29, 149, 0.6);
  border-radius: 999px;
}

.movie-summary {
  margin: 0;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.85;
}

.review-card {
  padding: 26px;
}

.review-card .section-kicker {
  font-size: 10px;
}

.star-rating {
  display: flex;
  gap: 4px;
  margin: 18px 0;
}

.star-rating button {
  padding: 2px;
  color: #3f425d;
  font-size: 30px;
  background: none;
  border: 0;
}

.star-rating button.is-active {
  color: var(--yellow);
  filter: drop-shadow(0 0 6px rgba(250, 204, 21, 0.42));
}

.review-card textarea {
  min-height: 128px;
  padding: 14px;
  resize: vertical;
}

.history-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.history-card {
  min-height: 176px;
  padding: 20px;
}

.history-card__head {
  display: flex;
  gap: 16px;
  justify-content: space-between;
}

.history-card h3 {
  margin: 0;
  font-size: 17px;
}

.history-stars {
  color: var(--yellow);
  white-space: nowrap;
}

.history-review {
  min-height: 44px;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
}

.history-date {
  color: #64748b;
  font-size: 12px;
}

.history-actions {
  display: flex;
  gap: 14px;
  margin-top: 14px;
}

.history-actions button {
  padding: 0;
  color: #a78bfa;
  background: none;
  border: 0;
}

.history-actions button[data-action="delete"] {
  color: #fb7185;
}

.history-empty {
  grid-column: 1 / -1;
  padding: 44px;
  color: var(--muted);
  text-align: center;
  background: rgba(17, 18, 38, 0.5);
  border: 1px dashed rgba(139, 92, 246, 0.34);
  border-radius: 18px;
}

.site-footer {
  display: flex;
  justify-content: space-between;
  padding: 70px 0 28px;
  color: #64748b;
  font-size: 13px;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
}

.toast {
  position: fixed;
  top: 92px;
  left: 50%;
  z-index: 50;
  min-width: 240px;
  padding: 13px 18px;
  color: #ede9fe;
  text-align: center;
  pointer-events: none;
  visibility: hidden;
  background: #17132f;
  border: 1px solid rgba(168, 85, 247, 0.5);
  border-radius: 12px;
  box-shadow: 0 16px 38px rgba(0, 0, 0, 0.34);
  opacity: 0;
  transform: translate(-50%, -12px);
  transition: 180ms ease;
}

.toast.is-visible {
  visibility: visible;
  opacity: 1;
  transform: translate(-50%, 0);
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }

  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  .particles {
    display: none;
  }
}
```

- [ ] **Step 6: 实现转盘、搜索、详情、评分和历史完整交互**

Create `styles/neon-wheel/wheel.js` with exactly:

```js
(function exposeNeonWheelPage(root, factory) {
  var api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.NeonWheelPage = api;

  if (root.document) {
    if (root.document.readyState === 'loading') {
      root.document.addEventListener('DOMContentLoaded', function bootWhenReady() {
        api.init(root.document, root);
      });
    } else {
      api.init(root.document, root);
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createNeonWheelPage() {
  'use strict';

  function modulo(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
  }

  function computeTargetRotation(currentRotation, winnerIndex, segmentCount, turns) {
    var segmentAngle;
    var currentNormalized;
    var targetNormalized;
    var delta;

    if (!Number.isInteger(segmentCount) || segmentCount <= 0) {
      throw new Error('segmentCount must be a positive integer');
    }

    if (!Number.isInteger(winnerIndex) || winnerIndex < 0 || winnerIndex >= segmentCount) {
      throw new Error('winnerIndex must reference an existing segment');
    }

    segmentAngle = 360 / segmentCount;
    currentNormalized = modulo(currentRotation, 360);
    targetNormalized = modulo(-winnerIndex * segmentAngle, 360);
    delta = modulo(targetNormalized - currentNormalized, 360);

    return currentRotation + Math.max(0, Number(turns) || 0) * 360 + delta;
  }

  function formatLocalDate(date) {
    return date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
  }

  function upsertReview(reviews, entry, editingIndex) {
    var next = reviews.slice();

    if (Number.isInteger(editingIndex) && editingIndex >= 0 && editingIndex < next.length) {
      next[editingIndex] = entry;
      return next;
    }

    next.unshift(entry);
    return next;
  }

  function removeReview(reviews, index) {
    var next = reviews.slice();

    if (Number.isInteger(index) && index >= 0 && index < next.length) {
      next.splice(index, 1);
    }

    return next;
  }

  function adjustEditingIndexAfterDelete(editingIndex, deletedIndex) {
    if (!Number.isInteger(editingIndex)) return null;
    if (editingIndex === deletedIndex) return null;
    if (deletedIndex < editingIndex) return editingIndex - 1;
    return editingIndex;
  }

  function buildWheelGradient(segmentCount) {
    var colors = ['#2e1065', '#111c44', '#3b176f', '#13213f', '#27115c', '#151936', '#421b72', '#101d3b'];
    var segmentAngle = 360 / segmentCount;
    var stops = [];
    var index;

    for (index = 0; index < segmentCount; index += 1) {
      stops.push(
        colors[index % colors.length] + ' ' + (index * segmentAngle) + 'deg ' + ((index + 1) * segmentAngle) + 'deg'
      );
    }

    return 'conic-gradient(from ' + (-segmentAngle / 2) + 'deg, ' + stops.join(', ') + ')';
  }

  function init(doc, runtime) {
    var Data = runtime.MoviePickerData;
    var Core = runtime.MoviePickerCore;
    var Store = runtime.MoviePickerReviewStore;
    var filterButtons = Array.from(doc.querySelectorAll('[data-genre]'));
    var starButtons = Array.from(doc.querySelectorAll('[data-rating]'));
    var toastTimer = null;
    var state = {
      activeGenre: '全部',
      candidates: [],
      currentMovie: null,
      lastWinnerName: null,
      currentRotation: 0,
      spinning: false,
      hasSpun: false,
      rating: 0,
      editingIndex: null,
      spinTimer: null
    };
    var elements = {
      wheel: doc.getElementById('wheel'),
      wheelLabels: doc.getElementById('wheelLabels'),
      wheelStatus: doc.getElementById('wheelStatus'),
      spinButton: doc.getElementById('spinButton'),
      particles: doc.getElementById('particles'),
      searchForm: doc.getElementById('searchForm'),
      searchInput: doc.getElementById('searchInput'),
      searchMessage: doc.getElementById('searchMessage'),
      resultSection: doc.getElementById('resultSection'),
      moviePoster: doc.getElementById('moviePoster'),
      posterFallback: doc.getElementById('posterFallback'),
      movieTitle: doc.getElementById('movieTitle'),
      movieGenres: doc.getElementById('movieGenres'),
      movieRating: doc.getElementById('movieRating'),
      movieSummary: doc.getElementById('movieSummary'),
      starRating: doc.getElementById('starRating'),
      reviewText: doc.getElementById('reviewText'),
      saveReviewButton: doc.getElementById('saveReviewButton'),
      historyList: doc.getElementById('historyList'),
      toast: doc.getElementById('toast'),
      liveRegion: doc.getElementById('liveRegion')
    };

    function showToast(message) {
      runtime.clearTimeout(toastTimer);
      elements.toast.textContent = message;
      elements.toast.classList.add('is-visible');
      toastTimer = runtime.setTimeout(function hideToast() {
        elements.toast.classList.remove('is-visible');
      }, 2200);
    }

    function setRating(value) {
      state.rating = value;
      starButtons.forEach(function updateStar(button) {
        var rating = Number(button.dataset.rating);
        button.classList.toggle('is-active', rating <= value);
        button.setAttribute('aria-checked', String(rating === value));
      });
    }

    function resetReviewEditor() {
      state.editingIndex = null;
      setRating(0);
      elements.reviewText.value = '';
      elements.saveReviewButton.textContent = '保存影评';
    }

    function setLocked(locked) {
      state.spinning = locked;
      elements.spinButton.disabled = locked || state.candidates.length === 0;
      elements.searchInput.disabled = locked;
      elements.searchForm.querySelector('button[type="submit"]').disabled = locked;
      filterButtons.forEach(function lockFilter(button) {
        button.disabled = locked;
      });
    }

    function renderWheel() {
      var count = state.candidates.length;
      var radius = count <= 2 ? 150 : count <= 4 ? 158 : 172;

      elements.wheelLabels.replaceChildren();

      if (!count) {
        elements.wheel.style.background = '#111226';
        elements.wheel.setAttribute('aria-label', '当前类型暂无候选电影');
        elements.wheelStatus.textContent = '该类型暂无电影。';
        elements.spinButton.disabled = true;
        return;
      }

      elements.wheel.style.background = buildWheelGradient(count);
      elements.wheel.setAttribute(
        'aria-label',
        '候选电影：' + state.candidates.map(function getName(movie) { return movie.name; }).join('、')
      );

      state.candidates.forEach(function renderCandidate(movie, index) {
        var angle = index * (360 / count);
        var label = doc.createElement('div');
        var poster = doc.createElement('img');
        var title = doc.createElement('span');

        label.className = 'wheel-label';
        label.dataset.movie = movie.name;
        label.style.transform =
          'translate(-50%, -50%) rotate(' + angle + 'deg) ' +
          'translateY(-' + radius + 'px) rotate(' + (-angle) + 'deg)';

        poster.src = movie.poster;
        poster.alt = '';
        poster.addEventListener('error', function hideBrokenCandidatePoster() {
          poster.hidden = true;
        }, { once: true });

        title.textContent = movie.name;
        label.append(poster, title);
        elements.wheelLabels.append(label);
      });

      elements.spinButton.disabled = false;
      elements.wheelStatus.textContent = '已准备 ' + count + ' 部候选电影。';
    }

    function regenerateCandidates() {
      var pool = Core.filterMovies(Data.movies, state.activeGenre);
      state.candidates = Core.sampleCandidates(pool, 8);
      renderWheel();
    }

    function clearWinnerHighlight() {
      Array.from(elements.wheelLabels.children).forEach(function clearLabel(label) {
        label.classList.remove('is-winner');
      });
    }

    function createParticles() {
      var colors = ['#f472b6', '#38bdf8', '#facc15', '#a78bfa'];
      var index;

      elements.particles.replaceChildren();

      for (index = 0; index < 14; index += 1) {
        var particle = doc.createElement('span');
        var angle = (Math.PI * 2 * index) / 14;
        var distance = 90 + Math.random() * 90;

        particle.className = 'particle';
        particle.style.left = '50%';
        particle.style.top = '50%';
        particle.style.background = colors[index % colors.length];
        particle.style.setProperty('--x', Math.cos(angle) * distance + 'px');
        particle.style.setProperty('--y', Math.sin(angle) * distance + 'px');
        elements.particles.append(particle);
      }

      runtime.setTimeout(function clearParticles() {
        elements.particles.replaceChildren();
      }, 900);
    }

    function renderMovie(movie, shouldScroll, preserveEditor) {
      state.currentMovie = movie;
      elements.resultSection.hidden = false;
      elements.posterFallback.hidden = true;
      elements.moviePoster.hidden = false;
      elements.moviePoster.alt = movie.name + ' 海报';
      elements.moviePoster.src = movie.poster;
      elements.movieRating.textContent = '★ 豆瓣评分 ' + movie.doubanRating;
      elements.movieTitle.textContent = movie.name;
      elements.movieSummary.textContent = movie.summary;
      elements.movieGenres.replaceChildren();

      movie.genres.forEach(function renderGenre(genre) {
        var tag = doc.createElement('span');
        tag.textContent = genre;
        elements.movieGenres.append(tag);
      });

      if (!preserveEditor) resetReviewEditor();

      if (shouldScroll) {
        runtime.requestAnimationFrame(function scrollToResult() {
          elements.resultSection.scrollIntoView({
            behavior: runtime.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
            block: 'start'
          });
        });
      }
    }

    function finishSpin(movie, targetRotation, reducedMotion) {
      var winnerLabel;

      state.currentRotation = targetRotation;
      state.lastWinnerName = movie.name;
      state.hasSpun = true;
      setLocked(false);
      elements.spinButton.innerHTML = '<span aria-hidden="true">↻</span> 再转一次';
      elements.wheelStatus.textContent = '命运选中：' + movie.name;
      elements.liveRegion.textContent = '转盘结果：' + movie.name;

      winnerLabel = Array.from(elements.wheelLabels.children).find(function findWinner(label) {
        return label.dataset.movie === movie.name;
      });
      if (winnerLabel) winnerLabel.classList.add('is-winner');
      if (!reducedMotion) createParticles();
      renderMovie(movie, true, false);
    }

    function spinWheel() {
      var movie;
      var winnerIndex;
      var reducedMotion;
      var duration;
      var turns;
      var targetRotation;

      if (state.spinning || !state.candidates.length) return;

      if (state.hasSpun) regenerateCandidates();
      if (!state.candidates.length) return;

      movie = Core.pickWinner(state.candidates, state.lastWinnerName);
      winnerIndex = state.candidates.indexOf(movie);
      reducedMotion = runtime.matchMedia('(prefers-reduced-motion: reduce)').matches;
      duration = reducedMotion ? 120 : 4000;
      turns = reducedMotion ? 0 : 5 + Math.floor(Math.random() * 3);
      targetRotation = computeTargetRotation(
        state.currentRotation,
        winnerIndex,
        state.candidates.length,
        turns
      );

      clearWinnerHighlight();
      setLocked(true);
      elements.spinButton.textContent = '命运转动中…';
      elements.wheelStatus.textContent = '命运正在为你挑选电影…';
      elements.wheel.style.setProperty('--spin-duration', duration + 'ms');

      runtime.requestAnimationFrame(function startSpin() {
        elements.wheel.style.transform = 'rotate(' + targetRotation + 'deg)';
      });

      state.spinTimer = runtime.setTimeout(function completeSpin() {
        finishSpin(movie, targetRotation, reducedMotion);
      }, duration + 80);
    }

    function handleGenreClick(event) {
      var button = event.target.closest('[data-genre]');

      if (!button || state.spinning) return;

      state.activeGenre = button.dataset.genre;
      state.hasSpun = false;
      clearWinnerHighlight();
      filterButtons.forEach(function updateFilter(candidate) {
        var active = candidate === button;
        candidate.classList.toggle('is-active', active);
        candidate.setAttribute('aria-pressed', String(active));
      });
      elements.spinButton.innerHTML = '<span aria-hidden="true">✦</span> 转动命运转盘';
      regenerateCandidates();
    }

    function handleSearch(event) {
      var query;
      var movie;

      event.preventDefault();
      if (state.spinning) return;

      query = elements.searchInput.value.trim();
      if (!query) {
        elements.searchMessage.textContent = '请先输入电影名称。';
        return;
      }

      movie = Core.searchMovie(Data.movies, query);
      if (!movie) {
        elements.searchMessage.textContent = '暂未找到“' + query + '”，上一次结果已保留。';
        return;
      }

      elements.searchMessage.textContent = '已找到：' + movie.name;
      renderMovie(movie, true, false);
    }

    function renderHistory() {
      var reviews = Store.loadReviews();

      elements.historyList.replaceChildren();

      if (!reviews.length) {
        var empty = doc.createElement('p');
        empty.className = 'history-empty';
        empty.textContent = '还没有观影记录。转动一次命运轮盘，写下第一条影评吧。';
        elements.historyList.append(empty);
        return;
      }

      reviews.forEach(function renderReview(entry, index) {
        var card = doc.createElement('article');
        var head = doc.createElement('div');
        var title = doc.createElement('h3');
        var stars = doc.createElement('span');
        var review = doc.createElement('p');
        var date = doc.createElement('time');
        var actions = doc.createElement('div');
        var edit = doc.createElement('button');
        var remove = doc.createElement('button');
        var rating = Math.max(0, Math.min(5, Number(entry.rating) || 0));

        card.className = 'history-card';
        head.className = 'history-card__head';
        title.textContent = String(entry.movieName || '未知电影');
        stars.className = 'history-stars';
        stars.textContent = '★'.repeat(rating) + '☆'.repeat(5 - rating);
        head.append(title, stars);

        review.className = 'history-review';
        review.textContent = entry.review ? String(entry.review) : '只留下了星级评分。';
        date.className = 'history-date';
        date.dateTime = String(entry.date || '');
        date.textContent = String(entry.date || '日期未知');

        actions.className = 'history-actions';
        edit.type = 'button';
        edit.dataset.action = 'edit';
        edit.dataset.index = String(index);
        edit.textContent = '编辑';
        remove.type = 'button';
        remove.dataset.action = 'delete';
        remove.dataset.index = String(index);
        remove.textContent = '删除';
        actions.append(edit, remove);

        card.append(head, review, date, actions);
        elements.historyList.append(card);
      });
    }

    function saveCurrentReview() {
      var reviewText;
      var entry;
      var reviews;
      var next;

      if (!state.currentMovie) {
        showToast('请先抽取或搜索一部电影。');
        return;
      }

      reviewText = elements.reviewText.value.trim();
      if (state.rating === 0 && !reviewText) {
        showToast('请先打分或写点影评。');
        return;
      }

      entry = {
        movieName: state.currentMovie.name,
        rating: state.rating,
        review: reviewText,
        date: formatLocalDate(new Date())
      };
      reviews = Store.loadReviews();
      next = upsertReview(reviews, entry, state.editingIndex);

      if (!Store.saveReviews(next)) {
        showToast('保存失败，请检查浏览器存储权限。');
        return;
      }

      resetReviewEditor();
      renderHistory();
      showToast('影评已经保存。');
    }

    function editReview(index) {
      var reviews = Store.loadReviews();
      var entry = reviews[index];
      var movie;

      if (!entry) {
        resetReviewEditor();
        showToast('这条记录已经不存在。');
        renderHistory();
        return;
      }

      movie = Data.movies.find(function findMovie(candidate) {
        return candidate.name === entry.movieName;
      });

      if (!movie) {
        showToast('电影目录中已找不到这部电影。');
        return;
      }

      state.editingIndex = index;
      renderMovie(movie, true, true);
      setRating(Math.max(0, Math.min(5, Number(entry.rating) || 0)));
      elements.reviewText.value = String(entry.review || '');
      elements.saveReviewButton.textContent = '更新影评';
    }

    function deleteReview(index) {
      var reviews;
      var next;
      var nextEditingIndex;

      if (!runtime.confirm('确定删除这条影评吗？')) return;

      reviews = Store.loadReviews();
      next = removeReview(reviews, index);

      if (!Store.saveReviews(next)) {
        showToast('删除失败，请检查浏览器存储权限。');
        return;
      }

      nextEditingIndex = adjustEditingIndexAfterDelete(state.editingIndex, index);
      if (Number.isInteger(state.editingIndex) && state.editingIndex >= 0 && nextEditingIndex === null) {
        resetReviewEditor();
      } else {
        state.editingIndex = nextEditingIndex;
      }
      renderHistory();
      showToast('影评已经删除。');
    }

    function handleHistoryClick(event) {
      var button = event.target.closest('button[data-action]');
      var index;

      if (!button) return;
      index = Number(button.dataset.index);

      if (button.dataset.action === 'edit') editReview(index);
      if (button.dataset.action === 'delete') deleteReview(index);
    }

    if (!Data || !Core || !Store) {
      elements.spinButton.disabled = true;
      elements.wheelStatus.textContent = '页面资源加载失败，请刷新后重试。';
      return;
    }

    elements.moviePoster.addEventListener('error', function showPosterFallback() {
      elements.moviePoster.hidden = true;
      elements.posterFallback.hidden = false;
    });
    elements.spinButton.addEventListener('click', spinWheel);
    doc.getElementById('genreFilters').addEventListener('click', handleGenreClick);
    elements.searchForm.addEventListener('submit', handleSearch);
    elements.starRating.addEventListener('click', function handleRating(event) {
      var button = event.target.closest('[data-rating]');
      if (button) setRating(Number(button.dataset.rating));
    });
    elements.saveReviewButton.addEventListener('click', saveCurrentReview);
    elements.historyList.addEventListener('click', handleHistoryClick);

    setRating(0);
    regenerateCandidates();
    renderHistory();
  }

  return Object.freeze({
    computeTargetRotation: computeTargetRotation,
    formatLocalDate: formatLocalDate,
    upsertReview: upsertReview,
    removeReview: removeReview,
    adjustEditingIndexAfterDelete: adjustEditingIndexAfterDelete,
    init: init
  });
});
```

- [ ] **Step 7: 运行全部 Node 测试并确认通过**

Run:

```powershell
node --test
```

Expected: `31` tests，`31` pass，`0` fail。

- [ ] **Step 8: 通过静态服务器验证新页面资源可加载**

Run in one terminal and keep it active:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Run in another terminal:

```powershell
$response = Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:8000/styles/neon-wheel/'
$utf8Content = [Text.Encoding]::UTF8.GetString($response.RawContentStream.ToArray())
$response.StatusCode
$utf8Content -match '<title>影轮 CineSpin'
```

Expected: 输出 `200` 和 `True`。随后停止静态服务器。

- [ ] **Step 9: 确认经典页面未修改并提交完整转盘页面**

Run:

```powershell
git hash-object index.html
git diff --check
git add -- styles/neon-wheel tests/neon-wheel-structure.test.js tests/neon-wheel-logic.test.js tests/neon-wheel-integration.test.js tests/helpers/neon-wheel-harness.js
git diff --cached --check
git commit -m "feat: add neon wheel movie picker"
```

Expected:

- `git hash-object index.html` 输出 `9239b2389eb17401f12320a6a7b51d3809aa69d3`。
- 提交只包含 `styles/neon-wheel/`、三个转盘测试文件和测试 harness。

### Task 4: 完成文档、桌面浏览器验收和最终回归检查

**Files:**
- Modify: `README.md`
- Verify unchanged: `index.html`
- No new production files.

**Interfaces:**
- Consumes: Task 1–3 的共享脚本、转盘页面和测试。
- Produces: README 中可访问的新风格入口，以及经过两种桌面视口和完整影评生命周期验证的交付状态。

- [ ] **Step 1: 在 README 中增加新风格入口**

Insert the following section immediately after the existing “在线体验” link:

```markdown
## 页面风格

- [经典电影随机选择器](./index.html)
- [影轮 CineSpin 桌面转盘版](styles/neon-wheel/)
```

Replace the existing “项目结构” code block with exactly:

```text
movie-picker/
├─ index.html                    # 经典页面、样式、电影数据和交互逻辑
├─ shared/                       # 新风格页面共享的电影和影评逻辑
├─ styles/
│  └─ neon-wheel/               # 影轮 CineSpin 桌面转盘页面
├─ tests/                        # Node 内置测试运行器测试
├─ docs/superpowers/            # 设计规格和实施计划
├─ README.md                     # 项目说明
├─ .gitignore                    # 本地工具临时文件忽略规则
└─ 视觉风格素材/                 # 设计探索参考图
```

- [ ] **Step 2: 运行全部自动化测试和静态检查**

Run:

```powershell
node --test
git diff --check
git hash-object index.html
```

Expected:

- `31` tests，`31` pass，`0` fail。
- `git diff --check` 无输出。
- `git hash-object index.html` 输出 `9239b2389eb17401f12320a6a7b51d3809aa69d3`。

- [ ] **Step 3: 启动静态服务器并验证两个页面入口**

Run and keep active:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Run in another terminal:

```powershell
$classic = Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:8000/'
$wheel = Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:8000/styles/neon-wheel/'
$wheelUtf8 = [Text.Encoding]::UTF8.GetString($wheel.RawContentStream.ToArray())
$classic.StatusCode
$wheel.StatusCode
$wheelUtf8 -match '影轮 CineSpin'
```

Expected: 依次输出 `200`、`200` 和 `True`。

- [ ] **Step 4: 在 1440×900 桌面视口验证转盘和搜索流程**

Open `http://127.0.0.1:8000/styles/neon-wheel/` in a fresh browser context, clear `localStorage.movie_reviews`, then verify in order:

1. 首屏左侧显示“今晚看什么？让命运替你决定”，右侧显示转盘，没有横向滚动条。
2. `#wheelLabels .wheel-label` 数量为 `8`，其 `data-movie` 值无重复。
3. 点击“爱情”，转盘只显示《泰坦尼克号》，按钮仍可使用。
4. 点击“全部”，候选恢复为 8 部不重复电影。
5. 点击“转动命运转盘”后，主按钮、搜索框和全部类型按钮立即禁用，按钮显示“命运转动中…”。
6. 约 4 秒后按钮恢复，`#movieTitle` 显示抽中电影，带 `.is-winner` 的扇区 `data-movie` 与标题完全相同。
7. 点击“再转一次”，等待结束后标题不得与上一次相同。
8. 搜索 `星际` 后标题变为《星际穿越》，页面滚动到详情区。
9. 搜索 `不存在的电影` 后，`#searchMessage` 显示未找到提示，标题仍为《星际穿越》。

Expected: 九项全部通过，浏览器控制台没有 JavaScript 错误。

- [ ] **Step 5: 验证海报回退和完整影评生命周期**

Continue in the same browser context:

1. 将当前 `#moviePoster.src` 临时改为无效地址，确认图片隐藏并显示 `#posterFallback`。
2. 搜索《肖申克的救赎》，不选择星级，只输入 `转盘页面验收`，保存成功。
3. 确认观影历史第一条为《肖申克的救赎》，星级显示 0 星状态，文本以普通文字显示。
4. 点击“编辑”，确认电影详情打开且影评回填；选择 3 星并把文字改为 `转盘页面验收已编辑`。
5. 保存后刷新页面，确认 3 星和更新后的影评仍存在。
6. 点击“删除”并确认，确认记录消失。
7. 在控制台执行 `localStorage.setItem('movie_reviews', '{bad json')` 后刷新，确认页面正常加载且历史为空。
8. 测试结束时执行 `localStorage.removeItem('movie_reviews')`，不留下验收记录。

Expected: 海报回退、只写影评、编辑、刷新持久化、删除和非法存储容错全部通过；用户文字未被解释为 HTML。

- [ ] **Step 6: 验证 1280×720、键盘操作和减少动态效果**

In the browser:

1. 将视口切换为 1280×720，确认页面无横向滚动条，左文案和右转盘仍保持分栏。
2. 只使用 `Tab`、`Shift+Tab`、`Enter` 和空格键完成类型切换、转盘启动、搜索、星级选择和保存按钮聚焦。
3. 确认每个聚焦元素都有青色可见焦点环。
4. 模拟 `prefers-reduced-motion: reduce`，点击转盘后确认快速完成、页面不平滑滚动且不生成 `.particle`。

Expected: 四项全部通过，没有键盘陷阱，浏览器控制台没有错误。

- [ ] **Step 7: 停止服务器并执行最终 Git 检查**

Stop the server with `Ctrl+C`, then run:

```powershell
node --test
git diff --exit-code -- index.html
git diff --check
git status --short --untracked-files=no
```

Expected:

- `31` tests，`31` pass，`0` fail。
- `git diff --exit-code -- index.html` 无输出并返回成功。
- `git diff --check` 无输出。
- 已跟踪文件中只剩 README 尚未提交；本地 `.superpowers/` 草图目录不得被暂存。

- [ ] **Step 8: 提交 README 并确认分支交付状态**

Run:

```powershell
git add -- README.md
git diff --cached --check
git diff --cached --stat
git commit -m "docs: add neon wheel page guide"
git status --short --branch
git log --oneline --decorate -6
```

Expected:

- README 提交只包含页面风格入口和项目结构更新。
- 当前分支为 `codex/style-neon-wheel`。
- `.superpowers/` 仍是本地未跟踪设计草图，不在任何提交中。
- 实施提交按顺序包含共享电影核心、影评存储、转盘页面和 README。

### Task 5: 最终加固（覆盖旧存储、CSS、控制器和测试片段）

Task 5 是当前 HEAD 的可执行源规格，完整取代 Task 2–4 中与以下文件有关的旧 `with exactly` 代码块和 `26` / `31` 项历史测试基线。

**Exact files:**

- Modify: `shared/review-store.js`
- Modify: `styles/neon-wheel/index.html`
- Modify: `styles/neon-wheel/wheel.css`
- Modify: `styles/neon-wheel/wheel.js`
- Modify: `tests/review-store.test.js`
- Modify: `tests/neon-wheel-integration.test.js`
- Modify: `tests/neon-wheel-structure.test.js`
- Modify: `tests/helpers/neon-wheel-harness.js`
- Modify: `docs/superpowers/plans/2026-07-15-neon-wheel-page.md`
- Preserve unchanged: `index.html`

**Final production contracts:**

- `loadReviews(storage?)` 先丢弃数组中的 `null`、原始值和嵌套数组，再把每个保留对象规范为仅含 `{ movieName, rating, review, date }` 的新对象。
- `movieName` / `review` / `date` 仅保留字符串，或安全字符串化有限数字和布尔原始值；绝不对对象、数组或 `null` 调用转换钩子。`movieName` 的缺失/不安全/空值回退为 `未知电影`，`review` 和 `date` 回退为空字符串。
- `rating` 仅接受有限数值或非空有限数值字符串，四舍五入后限制为 `0–5` 整数；其他值均为 `0`。
- `saveReviews` 继续使用 `movie_reviews` 键并保持原有写入 schema，不改动经典页面兼容性。
- 星级区保留 `1–5` 的 `radiogroup`，并在组外提供独立“清除评分”按钮；评分 `0` 时禁用，评分 `1–5` 时启用，点击统一走 `setRating(0)`。
- 占位符、历史日期和页脚使用 `--muted: #94a3b8`；未激活星级和禁用清除按钮使用 `--star-inactive: #7b7f9e`，禁用清除按钮不再降低 opacity。

- [ ] **Step 1: 实现存储边界规范化**

In `shared/review-store.js`, place these helpers after `resolveStorage` and map retained records through `normalizeReview`:

```js
function normalizeText(value, fallback) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return String(value);
  return fallback;
}

function normalizeRating(value) {
  var numeric;

  if (typeof value === 'number') {
    numeric = value;
  } else if (typeof value === 'string' && value.trim()) {
    numeric = Number(value);
  } else {
    return 0;
  }

  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(5, Math.round(numeric)));
}

function normalizeReview(entry) {
  var movieName = normalizeText(entry.movieName, '');

  return {
    movieName: movieName || '未知电影',
    rating: normalizeRating(entry.rating),
    review: normalizeText(entry.review, ''),
    date: normalizeText(entry.date, '')
  };
}

parsed = JSON.parse(target.getItem(REVIEW_KEY) || '[]');
return Array.isArray(parsed) ? parsed.filter(function keepReviewRecord(entry) {
  return entry !== null && typeof entry === 'object' && !Array.isArray(entry);
}).map(normalizeReview) : [];
```

- [ ] **Step 2: 实现可清零评分和最终对比度**

The HTML immediately after `#starRating` must contain:

```html
<button class="clear-rating" id="clearRatingButton" type="button" disabled>清除评分</button>
```

The effective CSS rules must be:

```css
:root {
  --muted: #94a3b8;
  --star-inactive: #7b7f9e;
}

.search-form input::placeholder,
.review-card textarea::placeholder,
.history-date,
.site-footer {
  color: var(--muted);
}

.star-rating button,
.clear-rating:disabled {
  color: var(--star-inactive);
}

.clear-rating:disabled {
  cursor: not-allowed;
  opacity: 1;
}
```

The controller must include these effective snippets:

```js
clearRatingButton: doc.getElementById('clearRatingButton'),

function setRating(value) {
  state.rating = value;
  starButtons.forEach(function updateStar(button) {
    var rating = Number(button.dataset.rating);
    button.classList.toggle('is-active', rating <= value);
    button.setAttribute('aria-checked', String(rating === value));
  });
  elements.clearRatingButton.disabled = value === 0;
}

elements.clearRatingButton.addEventListener('click', function clearRating() {
  setRating(0);
});
```

- [ ] **Step 3: 建立最终回归门禁**

Regression files and required coverage:

- `tests/review-store.test.js`: 顶层非记录项过滤；四字段规范化；原始值文本转换；评分解析、四舍五入和 `0–5` 限制；正常经典记录语义不变；保存 schema 不变。
- `tests/neon-wheel-integration.test.js`: 使用真实 `MoviePickerReviewStore` + `Page.init`，覆盖混合数组、异常字段以及 `movieName` / `rating` / `review` / `date` 都为 `{ toString: null, valueOf: null }` 时不抛错；覆盖新建和编辑评分清零后的真实持久化。
- `tests/helpers/neon-wheel-harness.js`: `rawReviews` 路径必须通过真实 `ReviewStore.loadReviews(storage)` / `saveReviews(storage)`，不复制生产规范化逻辑。
- `tests/neon-wheel-structure.test.js`: 清除按钮在 `radiogroup` 之外且初始禁用；对比度 token 达标并被指定 selector 使用；禁用清除按钮 `opacity: 1`。

Run focused regressions:

```powershell
node --test tests/review-store.test.js tests/neon-wheel-integration.test.js tests/neon-wheel-structure.test.js
```

Expected: `22` tests，`22` pass，`0` fail。

- [ ] **Step 4: 执行最终全量验证**

```powershell
node --test
node --check shared/movie-data.js
node --check shared/movie-core.js
node --check shared/review-store.js
node --check styles/neon-wheel/wheel.js
git diff --check
git diff --exit-code -- index.html
git hash-object index.html
```

Expected:

- `33` tests，`33` pass，`0` fail。
- 4 个生产 JavaScript 文件语法检查通过。
- `git diff --check` 无输出。
- `git diff --exit-code -- index.html` 成功，且哈希仍为 `9239b2389eb17401f12320a6a7b51d3809aa69d3`。
- 本次仅修改存储规范化、回归和计划文档；第一轮已完成的 1280×720 / 1440×900 浏览器证据继续有效，无需重复运行。

- [ ] **Step 5: 提交第二轮规范化修复**

```powershell
git add -- shared/review-store.js tests/review-store.test.js tests/neon-wheel-integration.test.js docs/superpowers/plans/2026-07-15-neon-wheel-page.md
git diff --cached --check
git commit -m "fix: normalize persisted review fields"
```

Expected: 本提交仅包含上述 4 个跟踪文件；`.superpowers/`、`.playwright-cli/` 和 `output/` 不得被暂存。

### Task 6: 扇形海报与自然停靠迭代

本任务由 `docs/superpowers/specs/2026-07-15-wheel-poster-sectors-design.md` 和 `docs/superpowers/plans/2026-07-15-wheel-poster-sectors.md` 定义，覆盖此前轮盘小卡片、片名和中心随动实现。最终页面使用海报填满动态扇区、爆米花中心独立于旋转层，并在 `±min(8°, segmentAngle × 18%)` 内自然停靠。最终自动化基线为 `37` tests，`37` pass，`0` fail。
