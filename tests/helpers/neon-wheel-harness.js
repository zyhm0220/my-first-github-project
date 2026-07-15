const Page = require('../../styles/neon-wheel/wheel.js');
const Core = require('../../shared/movie-core.js');
const ReviewStore = require('../../shared/review-store.js');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

class FakeClassList {
  constructor(owner) {
    this.owner = owner;
    this.values = new Set();
  }

  replaceFromString(value) {
    this.values = new Set(String(value || '').split(/\s+/).filter(Boolean));
  }

  add(...tokens) {
    tokens.forEach((token) => this.values.add(token));
  }

  remove(...tokens) {
    tokens.forEach((token) => this.values.delete(token));
  }

  contains(token) {
    return this.values.has(token);
  }

  toggle(token, force) {
    const shouldAdd = force === undefined ? !this.contains(token) : Boolean(force);

    if (shouldAdd) this.add(token);
    else this.remove(token);

    return shouldAdd;
  }

  toString() {
    return Array.from(this.values).join(' ');
  }
}

class FakeStyle {
  constructor() {
    this.values = new Map();
  }

  setProperty(name, value) {
    this.values.set(name, String(value));
  }

  getPropertyValue(name) {
    return this.values.get(name) || '';
  }
}

class FakeElement {
  constructor(tagName, ownerDocument) {
    this.tagName = String(tagName || 'div').toUpperCase();
    this.ownerDocument = ownerDocument;
    this.parentNode = null;
    this.children = [];
    this.dataset = {};
    this.attributes = new Map();
    this.listeners = new Map();
    this.classList = new FakeClassList(this);
    this.style = new FakeStyle();
    this.hidden = false;
    this.disabled = false;
    this.value = '';
    this.type = '';
    this.src = '';
    this.alt = '';
    this.id = '';
    this.lastScrollOptions = null;
    this._textContent = '';
    this._innerHTML = '';
  }

  get className() {
    return this.classList.toString();
  }

  set className(value) {
    this.classList.replaceFromString(value);
  }

  get textContent() {
    if (this._textContent) return this._textContent;
    return this.children.map((child) => child.textContent).join('');
  }

  set textContent(value) {
    this._textContent = String(value == null ? '' : value);
    this._innerHTML = '';
    this.replaceChildren();
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(value) {
    this._innerHTML = String(value == null ? '' : value);
    this._textContent = '';
    this.replaceChildren();
  }

  append(...children) {
    children.forEach((child) => {
      child.parentNode = this;
      this.children.push(child);
    });
  }

  appendChild(child) {
    this.append(child);
    return child;
  }

  replaceChildren(...children) {
    this.children.forEach((child) => {
      child.parentNode = null;
    });
    this.children = [];
    if (children.length) this.append(...children);
  }

  setAttribute(name, value) {
    const normalized = String(value);
    this.attributes.set(name, normalized);

    if (name === 'class') this.className = normalized;
    if (name === 'type') this.type = normalized;
  }

  getAttribute(name) {
    if (name === 'class') return this.className;
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  addEventListener(type, listener, options) {
    const listeners = this.listeners.get(type) || [];
    listeners.push({ listener, once: Boolean(options && options.once) });
    this.listeners.set(type, listeners);
  }

  dispatchEvent(event) {
    const listeners = (this.listeners.get(event.type) || []).slice();

    event.currentTarget = this;
    listeners.forEach((entry) => {
      entry.listener.call(this, event);

      if (entry.once) {
        const current = this.listeners.get(event.type) || [];
        this.listeners.set(event.type, current.filter((candidate) => candidate !== entry));
      }
    });

    if (event.bubbles && !event.propagationStopped && this.parentNode) {
      this.parentNode.dispatchEvent(event);
    }

    return !event.defaultPrevented;
  }

  matches(selector) {
    const dataSelector = selector.match(/^([a-z]+)?\[data-([a-z-]+)(?:="([^"]*)")?\]$/i);
    const typeSelector = selector.match(/^([a-z]+)\[type="([^"]+)"\]$/i);

    if (dataSelector) {
      const expectedTag = dataSelector[1];
      const key = dataSelector[2].replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      const expectedValue = dataSelector[3];

      if (expectedTag && this.tagName !== expectedTag.toUpperCase()) return false;
      if (!Object.prototype.hasOwnProperty.call(this.dataset, key)) return false;
      return expectedValue === undefined || String(this.dataset[key]) === expectedValue;
    }

    if (typeSelector) {
      return this.tagName === typeSelector[1].toUpperCase() && this.type === typeSelector[2];
    }

    return this.tagName === selector.toUpperCase();
  }

  closest(selector) {
    let current = this;

    while (current) {
      if (current.matches(selector)) return current;
      current = current.parentNode;
    }

    return null;
  }

  querySelectorAll(selector) {
    const matches = [];

    function visit(element) {
      element.children.forEach((child) => {
        if (child.matches(selector)) matches.push(child);
        visit(child);
      });
    }

    visit(this);
    return matches;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  scrollIntoView(options) {
    this.lastScrollOptions = options;
  }
}

class FakeDocument {
  constructor() {
    this.body = new FakeElement('body', this);
    this.elementsById = new Map();
  }

  createElement(tagName) {
    return new FakeElement(tagName, this);
  }

  register(element, id) {
    element.id = id;
    this.elementsById.set(id, element);
    return element;
  }

  getElementById(id) {
    return this.elementsById.get(id) || null;
  }

  querySelectorAll(selector) {
    return this.body.querySelectorAll(selector);
  }
}

function createElement(doc, elements, id, tagName, parent) {
  const element = doc.register(doc.createElement(tagName || 'div'), id);
  (parent || doc.body).append(element);
  elements[id] = element;
  return element;
}

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

function defaultMovies() {
  return [
    { name: '电影 A', genres: ['剧情'], poster: 'a.jpg', doubanRating: 8.1, summary: 'A 摘要' },
    { name: '电影 B', genres: ['喜剧'], poster: 'b.jpg', doubanRating: 8.2, summary: 'B 摘要' },
    { name: '电影 C', genres: ['科幻'], poster: 'c.jpg', doubanRating: 8.3, summary: 'C 摘要' }
  ];
}

function makeReview(movieName, review, rating) {
  return {
    movieName,
    rating: rating == null ? 4 : rating,
    review,
    date: '2026-07-15'
  };
}

function createStore(initialReviews, initialOutcomes) {
  let reviews = clone(initialReviews || []);
  const outcomes = (initialOutcomes || []).slice();
  const saveCalls = [];

  return {
    saveCalls,
    loadReviews() {
      return clone(reviews);
    },
    saveReviews(next) {
      const outcome = outcomes.length ? outcomes.shift() : true;
      saveCalls.push({ reviews: clone(next), outcome });
      if (outcome) reviews = clone(next);
      return outcome;
    },
    getReviews() {
      return clone(reviews);
    }
  };
}

function createBoundaryStore(initialReviews) {
  let value = JSON.stringify(initialReviews);
  const storage = {
    getItem(key) {
      return key === ReviewStore.REVIEW_KEY ? value : null;
    },
    setItem(key, nextValue) {
      if (key === ReviewStore.REVIEW_KEY) value = nextValue;
    }
  };

  return {
    loadReviews() {
      return ReviewStore.loadReviews(storage);
    },
    saveReviews(next) {
      return ReviewStore.saveReviews(next, storage);
    },
    getReviews() {
      return ReviewStore.loadReviews(storage);
    }
  };
}

function createRuntime(options, store) {
  let nextTimerId = 1;
  const timers = [];

  return {
    MoviePickerData: { movies: clone(options.movies || defaultMovies()) },
    MoviePickerCore: Core,
    MoviePickerReviewStore: store,
    confirm: () => options.confirmResult !== false,
    clearTimeout(id) {
      const timer = timers.find((candidate) => candidate.id === id);
      if (timer) timer.cancelled = true;
    },
    setTimeout(callback, delay) {
      const timer = { id: nextTimerId, callback, delay, cancelled: false, fired: false };
      nextTimerId += 1;
      timers.push(timer);
      return timer.id;
    },
    requestAnimationFrame(callback) {
      callback();
      return 1;
    },
    matchMedia() {
      return { matches: Boolean(options.reducedMotion) };
    },
    pendingDelays() {
      return timers
        .filter((timer) => !timer.cancelled && !timer.fired)
        .map((timer) => timer.delay);
    },
    runTimer(delay) {
      const timer = timers.find((candidate) => (
        candidate.delay === delay && !candidate.cancelled && !candidate.fired
      ));

      if (!timer) throw new Error('No pending timer for ' + delay + 'ms');
      timer.fired = true;
      timer.callback();
    }
  };
}

function createEvent(type, target, bubbles) {
  return {
    type,
    target,
    currentTarget: null,
    bubbles: bubbles !== false,
    defaultPrevented: false,
    propagationStopped: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {
      this.propagationStopped = true;
    }
  };
}

function findHistoryAction(historyList, index, action) {
  const card = historyList.children[index];
  if (!card) return null;

  return card.querySelectorAll('button').find((button) => button.dataset.action === action) || null;
}

function createNeonWheelHarness(options) {
  const settings = options || {};
  const { doc, elements } = createDocument();
  const store = Object.prototype.hasOwnProperty.call(settings, 'rawReviews')
    ? createBoundaryStore(settings.rawReviews)
    : createStore(settings.reviews, settings.saveOutcomes);
  const runtime = createRuntime(settings, store);

  Page.init(doc, runtime);

  return {
    doc,
    elements,
    runtime,
    store,
    click(element) {
      if (!element) throw new Error('Cannot click a missing element');
      element.dispatchEvent(createEvent('click', element, true));
    },
    submitSearch() {
      elements.searchForm.dispatchEvent(createEvent('submit', elements.searchForm, false));
    },
    error(element) {
      element.dispatchEvent(createEvent('error', element, false));
    },
    getHistoryAction(index, action) {
      return findHistoryAction(elements.historyList, index, action);
    }
  };
}

module.exports = {
  createNeonWheelHarness,
  makeReview
};
