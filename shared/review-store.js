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
      return Array.isArray(parsed) ? parsed.filter(function keepReviewRecord(entry) {
        return entry !== null && typeof entry === 'object' && !Array.isArray(entry);
      }) : [];
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
