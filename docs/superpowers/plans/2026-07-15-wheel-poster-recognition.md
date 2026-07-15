# Wheel Poster Recognition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep every wheel sector visually filled while adding a complete, recognizable 2:3 foreground poster for each candidate.

**Architecture:** Each clipped `.wheel-label` becomes a two-layer composition: the movie poster fills the sector as a darkened CSS background, while the existing single child `<img>` becomes a smaller `contain` foreground card in the outer half of the sector. `computePosterPlacement(index, segmentCount)` remains the pure geometry boundary and now returns rectangular card dimensions instead of a full-sector square.

**Tech Stack:** Static HTML/CSS, UMD-style vanilla JavaScript, Node.js built-in test runner, existing fake DOM integration harness, Playwright browser verification.

## Global Constraints

- Implement the user-approved A design from `docs/superpowers/specs/2026-07-15-wheel-poster-recognition-design.md`.
- Every sector must keep the corresponding poster as a darkened `cover` background and show the same poster completely in one foreground `<img>` using `object-fit: contain`.
- The foreground card must keep a 2:3 ratio, stay in the outer half of the sector, and avoid the wheel rim; for 2–8 candidates it must not overlap the fixed popcorn hub.
- Candidate names must remain absent from wheel DOM text and remain present in `#wheel`'s aggregate `aria-label`.
- Foreground cards stay attached to the rotating wheel and may finish naturally tilted; do not add counter-rotation or upright correction.
- Preserve the existing stop jitter `±min(8°, segmentAngle × 18%)`, winner selection, genre filtering, search, details, reviews, history, and fixed `.wheel-center` ownership.
- A failed foreground poster must be hidden and its label background image cleared so the existing neon wheel gradient remains visible.
- Do not add image assets, inline SVG, dependencies, network APIs, login, payment, databases, or unrelated refactors.
- Preserve root `index.html` byte-for-byte; its required blob hash is `9239b2389eb17401f12320a6a7b51d3809aa69d3`.
- Do not stage `.superpowers/`, `.playwright-cli/`, or `output/`.
- Validate desktop viewports `1280×720`, `1440×900`, and `1647×738` with zero horizontal overflow and no JavaScript console errors.

---

### Task 1: Add recognizable foreground posters to filled wheel sectors

**Files:**
- Modify: `styles/neon-wheel/wheel.js:148-176, 298-321`
- Modify: `styles/neon-wheel/wheel.css:326-363`
- Modify: `tests/neon-wheel-logic.test.js:54-68`
- Modify: `tests/neon-wheel-integration.test.js:259-279`
- Modify: `tests/neon-wheel-structure.test.js:89-103`
- Modify: `docs/superpowers/plans/2026-07-15-neon-wheel-page.md` (append Task 7 note)

**Interfaces:**
- Consumes: `buildSegmentClipPath(index, segmentCount, gapDegrees)` and the existing `renderWheel()` candidate loop.
- Produces: `computePosterPlacement(index, segmentCount) -> { left: number, top: number, width: number, height: number, rotation: number }`.
- Preserves: one child `<img>` per `.wheel-label`, empty poster `alt`, `data-movie`, wheel aggregate `aria-label`, poster error listener, and fixed hub DOM ownership.

- [ ] **Step 1: Confirm the tracked baseline before RED**

Run:

```powershell
git status --short
node --test
git hash-object index.html
```

Expected:

- Only `.playwright-cli/`, `.superpowers/`, and `output/` may be untracked.
- `37` tests pass and `0` fail.
- Root `index.html` hash is `9239b2389eb17401f12320a6a7b51d3809aa69d3`.

- [ ] **Step 2: Write the failing geometry regression**

In `tests/neon-wheel-logic.test.js`, replace the current poster geometry test with these two tests:

```js
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
```

- [ ] **Step 3: Write the failing DOM and CSS regressions**

In `tests/neon-wheel-integration.test.js`, replace the existing final poster-rendering test with:

```js
test('初始化生成铺满背景和完整前景海报并保留加载失败回退', () => {
  const harness = createNeonWheelHarness();
  const labels = harness.elements.wheelLabels.children;

  assert.equal(labels.length, 3);
  labels.forEach((label) => {
    const poster = label.children[0];

    assert.match(label.style.clipPath, /^(polygon|circle)\(/);
    assert.match(label.style.backgroundImage, /^url\(".+"\)$/);
    assert.equal(label.children.length, 1);
    assert.equal(poster.tagName, 'IMG');
    assert.equal(label.querySelector('span'), null);
    assert.ok(poster.style.width.endsWith('%'));
    assert.ok(poster.style.height.endsWith('%'));
    assert.equal(Number.parseFloat(poster.style.height) / Number.parseFloat(poster.style.width), 1.5);
  });

  const firstLabel = labels[0];
  const firstPoster = firstLabel.children[0];
  harness.error(firstPoster);
  assert.equal(firstPoster.hidden, true);
  assert.equal(firstLabel.style.backgroundImage, '');
  assert.equal(harness.elements.wheelCenter.parentNode, harness.elements.wheelStage);
  assert.notEqual(harness.elements.wheelCenter.parentNode, harness.elements.wheel);
});
```

In `tests/neon-wheel-structure.test.js`, replace the existing final stationary-center test with:

```js
test('爆米花中心固定且轮盘使用铺满背景和完整前景海报', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');

  assert.match(
    html,
    /<div class="wheel" id="wheel"[^>]*>\s*<div class="wheel-labels" id="wheelLabels"><\/div>\s*<\/div>\s*<div class="wheel-center"/
  );
  assert.doesNotMatch(css, /\.wheel-label span/);
  assert.match(css, /\.wheel-label\s*{[^}]*background-size:\s*cover/s);
  assert.match(css, /\.wheel-label\s*{[^}]*background-blend-mode:\s*multiply/s);
  assert.match(css, /\.wheel-label img\s*{[^}]*object-fit:\s*contain/s);
  assert.match(css, /\.wheel-label img\s*{[^}]*aspect-ratio:\s*2\s*\/\s*3/s);
  assert.match(css, /\.wheel-label\.is-winner img/);
  assert.match(css, /\.wheel-label\.is-winner::after/);
});
```

- [ ] **Step 4: Run the focused tests and verify RED**

Run:

```powershell
node --test tests/neon-wheel-logic.test.js tests/neon-wheel-structure.test.js tests/neon-wheel-integration.test.js
```

Expected: `27` focused tests run; exactly `3` tests fail because the old geometry returns `{ size }`, labels have no background image, and foreground posters still use `object-fit: cover`. Existing unrelated tests remain green.

- [ ] **Step 5: Implement rectangular foreground poster geometry**

In `styles/neon-wheel/wheel.js`, replace `computePosterPlacement` with:

```js
function computePosterPlacement(index, segmentCount) {
  var segmentAngle;
  var centerAngle;
  var radialDistance;
  var width;
  var height;
  var center;

  validateSegmentIndex(index, segmentCount);

  if (segmentCount === 1) {
    radialDistance = 31;
    width = 24;
    height = 36;
  } else if (segmentCount === 2) {
    radialDistance = 32;
    width = 24;
    height = 36;
  } else if (segmentCount <= 4) {
    radialDistance = 31;
    width = 22;
    height = 33;
  } else {
    radialDistance = 34;
    width = 16;
    height = 24;
  }

  segmentAngle = 360 / segmentCount;
  centerAngle = -90 + index * segmentAngle;
  center = pointOnWheel(centerAngle, radialDistance);

  return {
    left: roundGeometry(center.x - width / 2),
    top: roundGeometry(center.y - height / 2),
    width: width,
    height: height,
    rotation: roundGeometry(centerAngle + 90)
  };
}
```

In the `renderWheel()` candidate loop, replace the label/poster style and error-handler block with:

```js
label.className = 'wheel-label';
label.dataset.movie = movie.name;
label.style.clipPath = buildSegmentClipPath(index, count, 0.8);
label.style.backgroundImage = 'url("' + movie.poster + '")';

poster.src = movie.poster;
poster.alt = '';
poster.style.left = placement.left + '%';
poster.style.top = placement.top + '%';
poster.style.width = placement.width + '%';
poster.style.height = placement.height + '%';
poster.style.setProperty('--poster-angle', placement.rotation + 'deg');
poster.addEventListener('error', function hideBrokenCandidatePoster() {
  label.style.backgroundImage = '';
  poster.hidden = true;
}, { once: true });
```

Do not change `buildSegmentClipPath`, `computeStopOffset`, `computeTargetRotation`, or the wheel/hub DOM structure.

- [ ] **Step 6: Implement the two-layer sector visual**

In `styles/neon-wheel/wheel.css`, replace the `.wheel-label` through `.wheel-label.is-winner::after` block with:

```css
.wheel-label {
  position: absolute;
  inset: 0;
  z-index: 2;
  overflow: hidden;
  pointer-events: none;
  background-color: rgba(17, 18, 38, 0.72);
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  background-blend-mode: multiply;
}

.wheel-label img {
  position: absolute;
  z-index: 2;
  display: block;
  box-sizing: border-box;
  object-fit: contain;
  aspect-ratio: 2 / 3;
  background: #080914;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 5px;
  box-shadow: 0 5px 14px rgba(0, 0, 0, 0.62);
  transform: rotate(var(--poster-angle));
  transform-origin: center;
  filter: brightness(0.98) saturate(1.02);
  transition: filter 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}

.wheel-label::after {
  position: absolute;
  inset: 0;
  z-index: 1;
  content: "";
  background: rgba(6, 7, 17, 0.12);
  box-shadow: inset 0 0 34px rgba(6, 7, 17, 0.52);
  transition: background 180ms ease, box-shadow 180ms ease;
}

.wheel-label.is-winner img {
  border-color: #f0abfc;
  box-shadow:
    0 0 0 2px rgba(240, 171, 252, 0.72),
    0 0 20px rgba(244, 114, 182, 0.96),
    0 6px 16px rgba(0, 0, 0, 0.66);
  filter: brightness(1.12) saturate(1.16);
}

.wheel-label.is-winner::after {
  background: rgba(244, 114, 182, 0.06);
  box-shadow:
    inset 0 0 34px rgba(244, 114, 182, 0.32),
    inset 0 0 0 2px rgba(240, 171, 252, 0.8);
}
```

- [ ] **Step 7: Run focused and full automated verification**

Run:

```powershell
node --test tests/neon-wheel-logic.test.js tests/neon-wheel-structure.test.js tests/neon-wheel-integration.test.js
node --test
node --check shared/movie-data.js
node --check shared/movie-core.js
node --check shared/review-store.js
node --check styles/neon-wheel/wheel.js
```

Expected:

- Focused suite: `27` tests, `27` pass, `0` fail.
- Full suite: `38` tests, `38` pass, `0` fail.
- All four syntax checks exit `0` without output.

- [ ] **Step 8: Append the authoritative iteration note to the main plan**

Append this exact block to `docs/superpowers/plans/2026-07-15-neon-wheel-page.md`:

```markdown

### Task 7: 完整海报辨识度迭代

本任务由 `docs/superpowers/specs/2026-07-15-wheel-poster-recognition-design.md` 和 `docs/superpowers/plans/2026-07-15-wheel-poster-recognition.md` 定义。每个动态扇区使用同一海报作为压暗铺满背景，并在外半圈展示完整 2:3 前景海报；加载失败时同时清除背景图并隐藏前景图。旋转、自然停靠、固定爆米花中心和其他页面功能保持不变。最终自动化基线为 `38` tests，`38` pass，`0` fail。
```

- [ ] **Step 9: Verify the real desktop page**

Reuse or start the local static server:

```powershell
python -m http.server 8000
```

Open `http://127.0.0.1:8000/styles/neon-wheel/` and verify at `1280×720`, `1440×900`, and `1647×738`:

1. The initial `全部` wheel shows eight unique clipped sectors.
2. Every sector background is filled by the corresponding movie poster and visibly darkened.
3. Every sector contains one complete 2:3 foreground poster; no foreground card is clipped by its sector, rim, or the popcorn hub.
4. No movie title text appears inside the wheel, while the wheel accessible name lists all candidates.
5. A normal spin ends with a slightly off-center winner, all cards remain physically attached and naturally tilted, and the winning card gains the pink-purple glow.
6. The popcorn hub does not change position during or after spinning.
7. Selecting `爱情` produces one full-circle background plus one complete foreground poster above the hub.
8. Forcing one candidate poster to fail hides the foreground image, clears that sector background image, and exposes the neon fallback without a broken-image icon.
9. `document.documentElement.scrollWidth - document.documentElement.clientWidth` is `0` at each viewport.
10. There are no JavaScript page errors or console errors; a standalone `favicon.ico` 404 is not a JavaScript failure.

Save screenshots under `output/playwright/` and inspect the initial, winner, single-movie, and fallback states at each viewport.

- [ ] **Step 10: Run preservation checks and commit the task**

Run:

```powershell
git diff --check
git hash-object index.html
git status --short
```

Expected:

- `git diff --check` exits `0`.
- Root `index.html` hash remains `9239b2389eb17401f12320a6a7b51d3809aa69d3`.
- Only the six tracked Task 1 files are modified; `.playwright-cli/`, `.superpowers/`, and `output/` remain untracked.

Commit only the Task 1 files:

```powershell
git add -- styles/neon-wheel/wheel.js styles/neon-wheel/wheel.css tests/neon-wheel-logic.test.js tests/neon-wheel-integration.test.js tests/neon-wheel-structure.test.js docs/superpowers/plans/2026-07-15-neon-wheel-page.md
git diff --cached --check
git commit -m "fix: show complete posters in wheel sectors"
```

Expected commit scope: exactly the six paths listed above; do not stage the iteration plan, specs, screenshots, or scratch directories.
