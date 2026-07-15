# Wheel Poster Sectors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the neon wheel's small poster/title cards with poster-filled sectors, keep the popcorn hub stationary, and add a safe natural offset to the winning stop position.

**Architecture:** Keep the current DOM/CSS/vanilla-JavaScript stack and stable `#wheelLabels` interface. Each candidate becomes a full-wheel clipping layer whose polygon follows the candidate sector; an oversized poster is positioned at the sector's radial midpoint and clipped to that sector. The rotating `#wheel` owns sectors, while `.wheel-center` becomes a sibling overlay; pure geometry helpers make clipping, poster placement, and safe stop jitter testable in Node.

**Tech Stack:** HTML5, CSS3 `clip-path`, vanilla JavaScript, Node.js 24 `node:test`, existing no-dependency fake DOM harness, Python static server, Playwright CLI desktop verification.

## Global Constraints

- Work only on `codex/style-neon-wheel`; baseline checkpoint is `12749cd966fdb63b9ecea02caa32c1def8684919` and approved design commit is `b4a08e5`.
- Preserve root `index.html` unchanged with blob hash `9239b2389eb17401f12320a6a7b51d3809aa69d3`.
- Keep the 15-film catalog, genre filtering, unique up-to-8 sampling, non-repeating re-spin, search, details, review storage, history, poster fallback, reduced motion, and desktop-only scope unchanged.
- Wheel sectors show poster imagery only; movie names remain in the wheel `aria-label` but must not be rendered as sector text.
- Posters are physically attached to sectors and may stop at a natural angle; do not counter-rotate them to screen-upright.
- Stop jitter must stay within `±min(8°, segmentAngle × 18%)`, keeping the pointer inside the winner sector.
- The popcorn hub must remain visually and structurally outside the rotating `#wheel` layer.
- Do not add packages, frameworks, inline SVG, new external assets, APIs, authentication, database, or backend behavior.
- Verify 1280×720, 1440×900, and 1647×738 without horizontal overflow or JavaScript console errors.

---

## File Map

- Modify: `styles/neon-wheel/index.html` — move the popcorn hub outside the rotating wheel.
- Modify: `styles/neon-wheel/wheel.css` — replace card/title styles with clipped, poster-filled sector styles.
- Modify: `styles/neon-wheel/wheel.js` — add geometry/jitter helpers and render poster-only sectors.
- Modify: `tests/neon-wheel-logic.test.js` — cover sector geometry and safe stop jitter.
- Modify: `tests/neon-wheel-structure.test.js` — protect the stationary hub DOM and sector-only CSS contract.
- Modify: `tests/neon-wheel-integration.test.js` — drive real page initialization and verify poster-only sector DOM/fallback.
- Modify: `tests/helpers/neon-wheel-harness.js` — mirror the production wheel-stage/hub structure for controller integration tests.
- Modify: `docs/superpowers/plans/2026-07-15-neon-wheel-page.md` — append a short authoritative Task 6 note pointing to this approved iteration and final test baseline.
- Preserve unchanged: `shared/`, `styles/neon-wheel` search/detail/review/history markup and root `index.html`.

### Task 1: Render poster-filled sectors and natural wheel stops

**Files:**
- Modify: `styles/neon-wheel/index.html`
- Modify: `styles/neon-wheel/wheel.css`
- Modify: `styles/neon-wheel/wheel.js`
- Modify: `tests/neon-wheel-logic.test.js`
- Modify: `tests/neon-wheel-structure.test.js`
- Modify: `tests/neon-wheel-integration.test.js`
- Modify: `tests/helpers/neon-wheel-harness.js`
- Modify: `docs/superpowers/plans/2026-07-15-neon-wheel-page.md`

**Interfaces:**
- Keeps: `NeonWheelPage.computeTargetRotation(currentRotation, winnerIndex, segmentCount, turns, stopOffsetDegrees = 0): number`.
- Adds: `NeonWheelPage.buildSegmentClipPath(index, segmentCount, gapDegrees = 0.8): string`.
- Adds: `NeonWheelPage.computePosterPlacement(index, segmentCount): { left, top, size, rotation }` using percentage values/degrees.
- Adds: `NeonWheelPage.computeStopOffset(segmentCount, random = Math.random): number`.
- Keeps: `#wheelLabels > .wheel-label[data-movie]` and `.wheel-label.is-winner` so the existing controller/test contracts continue to work.

- [ ] **Step 1: Add failing geometry and natural-stop tests**

Append to `tests/neon-wheel-logic.test.js`:

```js
test('候选海报几何覆盖完整扇区并支持单电影整圆', () => {
  assert.equal(Page.buildSegmentClipPath(0, 1), 'circle(50% at 50% 50%)');

  const firstOfEight = Page.buildSegmentClipPath(0, 8);
  const secondOfEight = Page.buildSegmentClipPath(1, 8);
  const halfWheel = Page.buildSegmentClipPath(0, 2);
  const topPoster = Page.computePosterPlacement(0, 8);
  const rightPoster = Page.computePosterPlacement(2, 8);

  assert.match(firstOfEight, /^polygon\(50% 50%,/);
  assert.notEqual(firstOfEight, secondOfEight);
  assert.ok((halfWheel.match(/%/g) || []).length >= 20);
  assert.deepEqual(topPoster, { left: 6, top: -22, size: 88, rotation: 0 });
  assert.deepEqual(rightPoster, { left: 34, top: 6, size: 88, rotation: 90 });
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
```

- [ ] **Step 2: Add failing DOM, CSS, and controller integration tests**

Append to `tests/neon-wheel-structure.test.js`:

```js
test('爆米花中心独立于旋转层且轮盘只保留扇形海报', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');

  assert.match(
    html,
    /<div class="wheel" id="wheel"[^>]*>\s*<div class="wheel-labels" id="wheelLabels"><\/div>\s*<\/div>\s*<div class="wheel-center"/
  );
  assert.doesNotMatch(css, /\.wheel-label span/);
  assert.match(css, /\.wheel-label\s*{[^}]*inset:\s*0/s);
  assert.match(css, /\.wheel-label\s*{[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.wheel-label img\s*{[^}]*object-fit:\s*cover/s);
  assert.match(css, /\.wheel-label\.is-winner::after/);
});
```

Append to `tests/neon-wheel-integration.test.js`:

```js
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
```

Update `tests/helpers/neon-wheel-harness.js#createDocument` so it mirrors the production ownership without changing behavior:

```js
function createDocument() {
  const doc = new FakeDocument();
  const elements = {};
  const wheelStage = createElement(doc, elements, 'wheelStage', 'div');
  const wheel = createElement(doc, elements, 'wheel', 'div', wheelStage);
  const genreFilters = createElement(doc, elements, 'genreFilters', 'div');
  const searchForm = createElement(doc, elements, 'searchForm', 'form');
  const resultSection = createElement(doc, elements, 'resultSection', 'section');
  const starRating = createElement(doc, elements, 'starRating', 'div');

  createElement(doc, elements, 'wheelLabels', 'div', wheel);
  createElement(doc, elements, 'wheelCenter', 'div', wheelStage);
  createElement(doc, elements, 'particles', 'div', wheelStage);
  createElement(doc, elements, 'spinButton', 'button');
  createElement(doc, elements, 'wheelStatus', 'p');
  createElement(doc, elements, 'searchInput', 'input', searchForm);
  elements.searchSubmit = doc.createElement('button');
  elements.searchSubmit.type = 'submit';
  searchForm.append(elements.searchSubmit);
  createElement(doc, elements, 'searchMessage', 'p');
  createElement(doc, elements, 'moviePoster', 'img', resultSection);
  createElement(doc, elements, 'posterFallback', 'div', resultSection);
  createElement(doc, elements, 'movieTitle', 'h3', resultSection);
  createElement(doc, elements, 'movieGenres', 'div', resultSection);
  createElement(doc, elements, 'movieRating', 'p', resultSection);
  createElement(doc, elements, 'movieSummary', 'p', resultSection);
  createElement(doc, elements, 'reviewText', 'textarea', resultSection);
  createElement(doc, elements, 'clearRatingButton', 'button', resultSection);
  createElement(doc, elements, 'saveReviewButton', 'button', resultSection);
  createElement(doc, elements, 'historyList', 'div');
  createElement(doc, elements, 'toast', 'div');
  createElement(doc, elements, 'liveRegion', 'div');

  resultSection.hidden = true;
  elements.posterFallback.hidden = true;
  elements.saveReviewButton.textContent = '保存影评';

  elements.genreButtons = ['全部', '剧情', '喜剧', '科幻', '动画', '爱情'].map((genre) => {
    const button = doc.createElement('button');
    button.dataset.genre = genre;
    genreFilters.append(button);
    return button;
  });

  elements.starButtons = [1, 2, 3, 4, 5].map((rating) => {
    const button = doc.createElement('button');
    button.dataset.rating = String(rating);
    starRating.append(button);
    return button;
  });

  return { doc, elements };
}
```

- [ ] **Step 3: Run the focused tests and verify RED**

Run:

```powershell
node --test tests/neon-wheel-logic.test.js tests/neon-wheel-structure.test.js tests/neon-wheel-integration.test.js
```

Expected: `4` new tests fail because the geometry/jitter exports, stationary-center DOM, sector CSS, and poster-only rendering do not exist. Existing tests remain green.

- [ ] **Step 4: Add pure geometry and safe-offset helpers**

Insert before `buildWheelGradient` in `styles/neon-wheel/wheel.js`:

```js
function validateSegmentIndex(index, segmentCount) {
  if (!Number.isInteger(segmentCount) || segmentCount <= 0) {
    throw new Error('segmentCount must be a positive integer');
  }
  if (!Number.isInteger(index) || index < 0 || index >= segmentCount) {
    throw new Error('index must reference an existing segment');
  }
}

function roundGeometry(value) {
  return Number(value.toFixed(3));
}

function pointOnWheel(angleDegrees, radius) {
  var radians = angleDegrees * Math.PI / 180;
  return {
    x: roundGeometry(50 + Math.cos(radians) * radius),
    y: roundGeometry(50 + Math.sin(radians) * radius)
  };
}

function buildSegmentClipPath(index, segmentCount, gapDegrees) {
  var segmentAngle;
  var centerAngle;
  var gap;
  var startAngle;
  var endAngle;
  var arcSteps;
  var points;
  var step;

  validateSegmentIndex(index, segmentCount);
  if (segmentCount === 1) return 'circle(50% at 50% 50%)';

  segmentAngle = 360 / segmentCount;
  centerAngle = -90 + index * segmentAngle;
  gap = Math.min(Math.max(0, Number(gapDegrees) || 0.8), segmentAngle * 0.08);
  startAngle = centerAngle - segmentAngle / 2 + gap;
  endAngle = centerAngle + segmentAngle / 2 - gap;
  arcSteps = Math.max(2, Math.ceil((endAngle - startAngle) / 15));
  points = ['50% 50%'];

  for (step = 0; step <= arcSteps; step += 1) {
    var point = pointOnWheel(startAngle + (endAngle - startAngle) * step / arcSteps, 50);
    points.push(point.x + '% ' + point.y + '%');
  }

  return 'polygon(' + points.join(', ') + ')';
}

function computePosterPlacement(index, segmentCount) {
  var segmentAngle;
  var centerAngle;
  var radialDistance;
  var size;
  var center;

  validateSegmentIndex(index, segmentCount);
  if (segmentCount === 1) return { left: 0, top: 0, size: 100, rotation: 0 };

  segmentAngle = 360 / segmentCount;
  centerAngle = -90 + index * segmentAngle;
  radialDistance = segmentCount === 2 ? 25 : segmentCount <= 4 ? 27 : 28;
  size = segmentCount === 2 ? 120 : segmentCount <= 4 ? 104 : 88;
  center = pointOnWheel(centerAngle, radialDistance);

  return {
    left: roundGeometry(center.x - size / 2),
    top: roundGeometry(center.y - size / 2),
    size: size,
    rotation: roundGeometry(centerAngle + 90)
  };
}

function computeStopOffset(segmentCount, random) {
  var rng;
  var raw;
  var limit;

  validateSegmentIndex(0, segmentCount);
  rng = typeof random === 'function' ? random : Math.random;
  raw = Math.max(0, Math.min(1, Number(rng()) || 0));
  limit = Math.min(8, (360 / segmentCount) * 0.18);
  return roundGeometry((raw * 2 - 1) * limit);
}
```

Extend `computeTargetRotation` with a fifth parameter and clamp it inside the winner sector:

```js
function computeTargetRotation(currentRotation, winnerIndex, segmentCount, turns, stopOffsetDegrees) {
  var segmentAngle;
  var requestedOffset;
  var maximumOffset;
  var safeOffset;
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
  requestedOffset = Number(stopOffsetDegrees) || 0;
  maximumOffset = segmentAngle * 0.45;
  safeOffset = Math.max(-maximumOffset, Math.min(maximumOffset, requestedOffset));
  currentNormalized = modulo(currentRotation, 360);
  targetNormalized = modulo(-winnerIndex * segmentAngle + safeOffset, 360);
  delta = modulo(targetNormalized - currentNormalized, 360);

  return currentRotation + Math.max(0, Number(turns) || 0) * 360 + delta;
}
```

- [ ] **Step 5: Move the popcorn hub outside the rotating wheel**

Replace the wheel-stage fragment in `styles/neon-wheel/index.html` with:

```html
<div class="wheel-stage">
  <div class="wheel-pointer" aria-hidden="true"></div>
  <div class="wheel" id="wheel" role="img" aria-label="电影候选转盘">
    <div class="wheel-labels" id="wheelLabels"></div>
  </div>
  <div class="wheel-center" aria-hidden="true">🍿</div>
  <div class="particles" id="particles" aria-hidden="true"></div>
</div>
```

- [ ] **Step 6: Replace card/title CSS with poster-filled sector CSS**

Replace `.wheel-label` through `.wheel-label.is-winner img` in `styles/neon-wheel/wheel.css` with:

```css
.wheel-label {
  position: absolute;
  inset: 0;
  z-index: 2;
  overflow: hidden;
  pointer-events: none;
}

.wheel-label img {
  position: absolute;
  width: var(--poster-size);
  height: var(--poster-size);
  object-fit: cover;
  transform: rotate(var(--poster-angle));
  transform-origin: center;
  filter: brightness(0.74) saturate(0.88);
  transition: filter 180ms ease;
}

.wheel-label::after {
  position: absolute;
  inset: 0;
  content: "";
  background: rgba(6, 7, 17, 0.08);
  box-shadow: inset 0 0 34px rgba(6, 7, 17, 0.48);
  transition: 180ms ease;
}

.wheel-label.is-winner img {
  filter: brightness(1.12) saturate(1.16);
}

.wheel-label.is-winner::after {
  background: rgba(244, 114, 182, 0.08);
  box-shadow:
    inset 0 0 34px rgba(244, 114, 182, 0.42),
    inset 0 0 0 2px rgba(240, 171, 252, 0.8);
}
```

Add `z-index: 3` to `.wheel::after` so the inner circular line stays above poster imagery. Keep the existing `.wheel-center` geometry unchanged; its containing block becomes `.wheel-stage` automatically.

- [ ] **Step 7: Render poster-only sectors and apply natural stop jitter**

Replace the candidate loop inside `renderWheel` with:

```js
state.candidates.forEach(function renderCandidate(movie, index) {
  var label = doc.createElement('div');
  var poster = doc.createElement('img');
  var placement = computePosterPlacement(index, count);

  label.className = 'wheel-label';
  label.dataset.movie = movie.name;
  label.style.clipPath = buildSegmentClipPath(index, count, 0.8);

  poster.src = movie.poster;
  poster.alt = '';
  poster.style.left = placement.left + '%';
  poster.style.top = placement.top + '%';
  poster.style.width = placement.size + '%';
  poster.style.height = placement.size + '%';
  poster.style.setProperty('--poster-angle', placement.rotation + 'deg');
  poster.addEventListener('error', function hideBrokenCandidatePoster() {
    poster.hidden = true;
  }, { once: true });

  label.append(poster);
  elements.wheelLabels.append(label);
});
```

In `spinWheel`, add `var stopOffset;`, compute it after `turns`, and pass it to the target rotation:

```js
stopOffset = computeStopOffset(state.candidates.length, Math.random);
targetRotation = computeTargetRotation(
  state.currentRotation,
  winnerIndex,
  state.candidates.length,
  turns,
  stopOffset
);
```

Expose the three new pure helpers in the frozen public API:

```js
buildSegmentClipPath: buildSegmentClipPath,
computePosterPlacement: computePosterPlacement,
computeStopOffset: computeStopOffset,
```

- [ ] **Step 8: Run focused tests and verify GREEN**

Run:

```powershell
node --test tests/neon-wheel-logic.test.js tests/neon-wheel-structure.test.js tests/neon-wheel-integration.test.js
```

Expected: `26` focused tests, `26` pass, `0` fail. The repository-wide baseline becomes `37` tests.

- [ ] **Step 9: Append the authoritative iteration note to the main plan**

Append to `docs/superpowers/plans/2026-07-15-neon-wheel-page.md`:

```markdown
### Task 6: 扇形海报与自然停靠迭代

本任务由 `docs/superpowers/specs/2026-07-15-wheel-poster-sectors-design.md` 和 `docs/superpowers/plans/2026-07-15-wheel-poster-sectors.md` 定义，覆盖此前轮盘小卡片、片名和中心随动实现。最终页面使用海报填满动态扇区、爆米花中心独立于旋转层，并在 `±min(8°, segmentAngle × 18%)` 内自然停靠。最终自动化基线为 `37` tests，`37` pass，`0` fail。
```

- [ ] **Step 10: Verify the real page at three desktop viewports**

Keep the existing static server on `http://127.0.0.1:8000/` or start it with:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Using the bundled Playwright CLI, verify at 1280×720, 1440×900, and 1647×738:

1. Initial “全部” pool renders 8 unique `.wheel-label` elements; every label has exactly one `<img>`, no `<span>`, and a non-empty computed `clip-path`.
2. Poster pixels fill each visible sector with no rectangular card border, rounded card, title, or uncovered empty wedge.
3. The `.wheel-center` is not contained by `#wheel`; its position and own transform remain unchanged before, during, and after a spin.
4. After a normal spin, the highlighted label matches `#movieTitle`; the pointer visibly remains inside the highlighted sector while the stop is allowed to be off-center.
5. “再转一次” still avoids the prior winner; poster sectors remain bound to the rotating wheel without detached cards.
6. Selecting “爱情” renders one full-circle poster and the spin still completes.
7. Forcing one candidate poster to fail hides that image and exposes the underlying neon sector.
8. No horizontal overflow and no JavaScript console errors. A deliberate invalid-poster 404 is expected only during fallback verification.

Capture screenshots under `output/playwright/` and keep them untracked.

- [ ] **Step 11: Run full verification and commit**

Run:

```powershell
node --test
node --check styles/neon-wheel/wheel.js
git diff --check
git diff main...HEAD --exit-code -- index.html
git hash-object index.html
```

Expected:

- `37` tests, `37` pass, `0` fail.
- JavaScript syntax check and both diff checks pass.
- Root `index.html` hash remains `9239b2389eb17401f12320a6a7b51d3809aa69d3`.

Commit only the eight tracked files listed in this task:

```powershell
git add -- styles/neon-wheel/index.html styles/neon-wheel/wheel.css styles/neon-wheel/wheel.js tests/neon-wheel-logic.test.js tests/neon-wheel-structure.test.js tests/neon-wheel-integration.test.js tests/helpers/neon-wheel-harness.js docs/superpowers/plans/2026-07-15-neon-wheel-page.md
git diff --cached --check
git commit -m "feat: fill wheel sectors with movie posters"
```

Do not stage `.superpowers/`, `.playwright-cli/`, or `output/`.
