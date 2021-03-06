(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = {
  observe: require('callbag-observe'),
  iterate: require('callbag-iterate'),
  fromObs: require('callbag-from-obs'),
  fromIter: require('callbag-from-iter'),
  fromEvent: require('callbag-from-event'),
  fromPromise: require('callbag-from-promise'),
  interval: require('callbag-interval'),
  map: require('callbag-map'),
  scan: require('callbag-scan'),
  take: require('callbag-take'),
  skip: require('callbag-skip'),
  filter: require('callbag-filter'),
  merge: require('callbag-merge'),
  concat: require('callbag-concat'),
  combine: require('callbag-combine'),
  share: require('callbag-share'),
  pipe: require('callbag-pipe')
};


},{"callbag-combine":2,"callbag-concat":3,"callbag-filter":4,"callbag-from-event":5,"callbag-from-iter":6,"callbag-from-obs":7,"callbag-from-promise":8,"callbag-interval":9,"callbag-iterate":10,"callbag-map":11,"callbag-merge":12,"callbag-observe":13,"callbag-pipe":14,"callbag-scan":15,"callbag-share":16,"callbag-skip":17,"callbag-take":18}],2:[function(require,module,exports){
const EMPTY = {};

const combine = (...sources) => (start, sink) => {
  if (start !== 0) return;
  const n = sources.length;
  if (n === 0) {
    sink(0, () => {});
    sink(1, []);
    sink(2);
    return;
  }
  let Ns = n; // start counter
  let Nd = n; // data counter
  let Ne = n; // end counter
  const vals = Array(n);
  const sourceTalkbacks = Array(n);
  const talkback = (t, d) => {
    if (t !== 2) return;
    for (let i = 0; i < n; i++) sourceTalkbacks[i](2);
  };
  sources.forEach((source, i) => {
    vals[i] = EMPTY;
    source(0, (t, d) => {
      if (t === 0) {
        sourceTalkbacks[i] = d;
        if (--Ns === 0) sink(0, talkback);
      } else if (t === 1) {
        const _Nd = !Nd ? 0 : vals[i] === EMPTY ? --Nd : Nd;
        vals[i] = d;
        if (_Nd === 0) {
          const arr = Array(n);
          for (let j = 0; j < n; ++j) arr[j] = vals[j];
          sink(1, arr);
        }
      } else if (t === 2) {
        if (--Ne === 0) sink(2);
      } else {
        sink(t, d);
      }
    });
  });
};

module.exports = combine;

},{}],3:[function(require,module,exports){
const concat = (...sources) => (start, sink) => {
  if (start !== 0) return;
  const n = sources.length;
  if (n === 0) {
    sink(0, () => {});
    sink(2);
    return;
  }
  let i = 0;
  let sourceTalkback;
  const talkback = (t, d) => {
    if (t === 1 || t === 2) {
      sourceTalkback(t, d);
    }
  };
  (function next() {
    if (i === n) {
      sink(2);
      return;
    }
    sources[i](0, (t, d) => {
      if (t === 0) {
        sourceTalkback = d;
        if (i === 0) sink(0, talkback);
        else sourceTalkback(1);
      } else if (t === 1) {
        sink(1, d);
      } else if (t === 2) {
        i++;
        next();
      }
    });
  })();
};

module.exports = concat;

},{}],4:[function(require,module,exports){
const filter = condition => source => (start, sink) => {
  if (start !== 0) return;
  let talkback;
  source(0, (t, d) => {
    if (t === 0) {
      talkback = d;
      sink(t, d);
    } else if (t === 1) {
      if (condition(d)) sink(t, d);
      else talkback(1);
    }
    else sink(t, d);
  });
};

module.exports = filter;

},{}],5:[function(require,module,exports){
const fromEvent = (node, name) => (start, sink) => {
  if (start !== 0) return;
  const handler = ev => sink(1, ev);
  sink(0, t => {
    if (t === 2) node.removeEventListener(name, handler);
  });
  node.addEventListener(name, handler);
};

module.exports = fromEvent;

},{}],6:[function(require,module,exports){
const fromIter = iter => (start, sink) => {
  if (start !== 0) return;
  const iterator =
    typeof Symbol !== 'undefined' && iter[Symbol.iterator]
      ? iter[Symbol.iterator]()
      : iter;
  let inloop = false;
  let got1 = false;
  let res;
  function loop() {
    inloop = true;
    while (got1) {
      got1 = false;
      res = iterator.next();
      if (res.done) sink(2);
      else sink(1, res.value);
    }
    inloop = false;
  }
  sink(0, t => {
    if (t === 1) {
      got1 = true;
      if (!inloop && !(res && res.done)) loop();
    }
  });
};

module.exports = fromIter;

},{}],7:[function(require,module,exports){
const fromObs = observable => (start, sink) => {
  if (start !== 0) return;
  let dispose;
  sink(0, t => {
    if (t === 2 && dispose) {
      dispose();
    }
  });
  dispose = observable.subscribe({
    next: x => sink(1, x),
    error: e => sink(2, e),
    complete: () => sink(2)
  });
};

module.exports = fromObs;

},{}],8:[function(require,module,exports){
const fromPromise = promise => (start, sink) => {
  if (start !== 0) return;
  let ended = false;
  const onfulfilled = val => {
    if (ended) return;
    sink(1, val);
    sink(2);
  };
  const onrejected = err => {
    if (ended) return;
    sink(2, err);
  };
  promise.then(onfulfilled, onrejected);
  sink(0, t => {
    if (t === 2) ended = true;
  });
};

module.exports = fromPromise;

},{}],9:[function(require,module,exports){
const interval = period => (start, sink) => {
  if (start !== 0) return;
  let i = 0;
  const id = setInterval(() => {
    sink(1, i++);
  }, period);
  sink(0, t => {
    if (t === 2) clearInterval(id);
  });
};

module.exports = interval;

},{}],10:[function(require,module,exports){
const iterate = operation => source => {
  let talkback;
  source(0, (t, d) => {
    if (t === 0) talkback = d;
    if (t === 1) operation(d);
    if (t === 1 || t === 0) talkback(1);
  });
};

module.exports = iterate;

},{}],11:[function(require,module,exports){
const map = transform => source => (start, sink) => {
  if (start !== 0) return;
  source(0, (t, d) => {
    if (t === 1) sink(t, transform(d));
    else sink(t, d);
  });
};

module.exports = map;

},{}],12:[function(require,module,exports){
function merge(...sources) {
  return (start, sink) => {
    if (start !== 0) return;
    const n = sources.length;
    const sourceTalkbacks = Array(n);
    let startCount = 0;
    let endCount = 0;
    const talkback = t => {
      if (t !== 2) return;
      for (let i = 0; i < n; i++) sourceTalkbacks[i](2);
    };
    for (let i = 0; i < n; i++) {
      sources[i](0, (t, d) => {
        if (t === 0) {
          sourceTalkbacks[i] = d;
          if (++startCount === n) sink(0, talkback);
        } else if (t === 2) {
          if (++endCount === n) sink(2);
        } else sink(t, d);
      });
    }
  };
}

module.exports = merge;

},{}],13:[function(require,module,exports){
const observe = operation => source => {
  source(0, (t, d) => {
    if (t === 1) operation(d);
  });
}

module.exports = observe;

},{}],14:[function(require,module,exports){
function pipe(...cbs) {
  let cb,
    res = false,
    i = 0,
    n = cbs.length;
  for (; i < n; i++) {
    cb = cbs[i];
    if (res) res = cb(res);
    else res = cb;
  }
  return res;
}

module.exports = pipe;

},{}],15:[function(require,module,exports){
function scan(reducer, seed) {
  let hasAcc = arguments.length === 2;
  return source => (start, sink) => {
    if (start !== 0) return;
    let acc = seed;
    source(0, (t, d) => {
      if (t === 1) {
        acc = hasAcc ? reducer(acc, d) : ((hasAcc = true), d);
        sink(1, acc);
      } else sink(t, d);
    });
  };
}

module.exports = scan;

},{}],16:[function(require,module,exports){
const share = source => {
  let sinks = [];
  let sourceTalkback;
  return function shared(start, sink) {
    if (start !== 0) return;
    sinks.push(sink);
    if (sinks.length === 1) {
      source(0, (t, d) => {
        if (t === 0) sourceTalkback = d;
        else for (let s of sinks.slice(0)) s(t, d);
        if (t === 2) sinks = [];
      });
    }
    sink(0, (t, d) => {
      if (t === 0) return;
      if (t === 2) {
        const i = sinks.indexOf(sink);
        if (i > -1) sinks.splice(i, 1);
        if (!sinks.length) sourceTalkback(2);
      } else {
        sourceTalkback(t, d);
      }
    });
  }
}

module.exports = share;

},{}],17:[function(require,module,exports){
const skip = max => source => (start, sink) => {
  if (start !== 0) return;
  let skipped = 0;
  let talkback;
  source(0, (t, d) => {
    if (t === 0) {
      talkback = d;
      sink(t, d);
    } else if (t === 1) {
      if (skipped < max) {
        skipped++;
        talkback(1);
      } else sink(t, d);
    } else {
      sink(t, d);
    }
  });
};

module.exports = skip;

},{}],18:[function(require,module,exports){
const take = max => source => (start, sink) => {
  if (start !== 0) return;
  let taken = 0;
  let sourceTalkback;
  function talkback(t, d) {
    if (taken < max) sourceTalkback(t, d);
  }
  source(0, (t, d) => {
    if (t === 0) {
      sourceTalkback = d;
      sink(0, talkback);
    } else if (t === 1) {
      if (taken < max) {
        taken++;
        sink(t, d);
        if (taken === max) {
          sink(2);
          sourceTalkback(2);
        }
      }
    } else {
      sink(t, d);
    }
  });
};

module.exports = take;

},{}]},{},[1]);
