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

  function loadReviews(storage) {
    var target = resolveStorage(storage);
    var parsed;

    if (!target) return [];

    try {
      parsed = JSON.parse(target.getItem(REVIEW_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter(function keepReviewRecord(entry) {
        return entry !== null && typeof entry === 'object' && !Array.isArray(entry);
      }).map(normalizeReview) : [];
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
