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
