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
    if (!Number.isInteger(editingIndex) || editingIndex < 0) {
      return null;
    }

    if (deletedIndex === editingIndex) {
      return null;
    }

    if (deletedIndex < editingIndex) {
      return editingIndex - 1;
    }

    return editingIndex;
  }

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
      clearRatingButton: doc.getElementById('clearRatingButton'),
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
      elements.clearRatingButton.disabled = value === 0;
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
        var label = doc.createElement('div');
        var poster = doc.createElement('img');
        var placement = computePosterPlacement(index, count);

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

        label.append(poster);
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
      var stopOffset;
      var targetRotation;

      if (state.spinning || !state.candidates.length) return;

      if (state.hasSpun) regenerateCandidates();
      if (!state.candidates.length) return;

      movie = Core.pickWinner(state.candidates, state.lastWinnerName);
      winnerIndex = state.candidates.indexOf(movie);
      reducedMotion = runtime.matchMedia('(prefers-reduced-motion: reduce)').matches;
      duration = reducedMotion ? 120 : 4000;
      turns = reducedMotion ? 0 : 5 + Math.floor(Math.random() * 3);
      stopOffset = computeStopOffset(state.candidates.length, Math.random);
      targetRotation = computeTargetRotation(
        state.currentRotation,
        winnerIndex,
        state.candidates.length,
        turns,
        stopOffset
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
        var reviewText = entry.review == null ? '' : String(entry.review);

        card.className = 'history-card';
        head.className = 'history-card__head';
        title.textContent = String(entry.movieName || '未知电影');
        stars.className = 'history-stars';
        stars.textContent = '★'.repeat(rating) + '☆'.repeat(5 - rating);
        head.append(title, stars);

        review.className = 'history-review';
        review.textContent = reviewText || '只留下了星级评分。';
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
    elements.clearRatingButton.addEventListener('click', function clearRating() {
      setRating(0);
    });
    elements.saveReviewButton.addEventListener('click', saveCurrentReview);
    elements.historyList.addEventListener('click', handleHistoryClick);

    setRating(0);
    regenerateCandidates();
    renderHistory();
  }

  return Object.freeze({
    computeTargetRotation: computeTargetRotation,
    buildSegmentClipPath: buildSegmentClipPath,
    computePosterPlacement: computePosterPlacement,
    computeStopOffset: computeStopOffset,
    formatLocalDate: formatLocalDate,
    upsertReview: upsertReview,
    removeReview: removeReview,
    adjustEditingIndexAfterDelete: adjustEditingIndexAfterDelete,
    init: init
  });
});
