/* ============================================================
   锦鲤输入法 · 官网脚本
   无依赖：导航 / 按住演示 / 帧轮播 / 复制校验值 / 入场
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. 顶栏滚动态 ---------- */
  var hdr = document.getElementById('hdr');
  var dock = document.getElementById('dock');
  var ft = document.querySelector('.ft');

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    hdr.classList.toggle('is-stuck', y > 8);
    if (dock) {
      var nearFoot = false;
      if (ft) {
        var r = ft.getBoundingClientRect();
        nearFoot = r.top < window.innerHeight - 40;
      }
      dock.classList.toggle('is-on', y > 520 && !nearFoot);
    }
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- 2. 移动端菜单 ---------- */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');

  function closeNav() {
    nav.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', '打开导航菜单');
  }
  if (burger) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? '关闭导航菜单' : '打开导航菜单');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') closeNav();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });
    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target) && !burger.contains(e.target)) closeNav();
    });
  }

  /* ---------- 3. 导航高亮 ---------- */
  var links = Array.prototype.slice.call(nav ? nav.querySelectorAll('a[href^="#"]') : []);
  var targets = links
    .map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && targets.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle('is-here', a.getAttribute('href') === '#' + en.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    targets.forEach(function (t) { spy.observe(t); });
  }

  /* ---------- 4. 按住演示语音输入 ---------- */
  var pet = document.getElementById('petbtn');
  var vpanel = document.getElementById('vpanel');
  var vlabel = document.getElementById('vlabel');
  var vtimer = document.getElementById('vtimer');
  var vbar = document.getElementById('vbar');
  var typed = document.getElementById('typed');

  var SENTENCE = '周报写好了，重点讲讲语音输入。';
  var state = 'idle';
  var t0 = 0;
  var timerId = null;
  var workId = null;

  function setState(s) {
    state = s;
    vpanel.setAttribute('data-state', s);
  }
  function fmt(ms) {
    var s = Math.floor(ms / 1000);
    return '0:' + String(s).padStart(2, '0');
  }
  function clearWork() {
    clearInterval(timerId); timerId = null;
    clearTimeout(workId); workId = null;
  }

  function start() {
    if (state === 'recording') return;
    clearWork();
    setState('recording');
    pet.classList.add('is-live');
    typed.textContent = '';
    typed.classList.remove('is-done');
    t0 = Date.now();
    vlabel.textContent = '正在聆听';
    vtimer.textContent = '0:00';
    vbar.style.width = '6%';
    timerId = setInterval(function () {
      var ms = Date.now() - t0;
      vtimer.textContent = fmt(ms);
      vbar.style.width = Math.min(6 + (ms / 60), 100) + '%';
    }, 100);
  }

  function stop() {
    if (state !== 'recording') return;
    clearInterval(timerId); timerId = null;
    var ms = Date.now() - t0;
    pet.classList.remove('is-live');

    if (ms < 320) {
      setState('idle');
      vlabel.textContent = '再按久一点';
      vtimer.textContent = '0:00';
      vbar.style.width = '0%';
      workId = setTimeout(function () {
        if (state === 'idle') vlabel.textContent = '长按开始';
      }, 1600);
      return;
    }

    setState('working');
    vlabel.textContent = '转写中';
    vbar.style.width = '100%';

    workId = setTimeout(function () {
      setState('typed');
      vlabel.textContent = '已键入输入框';
      var i = 0;
      if (reduce) {
        typed.textContent = SENTENCE;
        typed.classList.add('is-done');
        resetLater(2600);
        return;
      }
      (function tick() {
        typed.textContent = SENTENCE.slice(0, ++i);
        if (i < SENTENCE.length) {
          workId = setTimeout(tick, 32);
        } else {
          typed.classList.add('is-done');
          vlabel.textContent = '已键入 · 再按一次';
          resetLater(3200);
        }
      })();
    }, 640);
  }

  function resetLater(ms) {
    workId = setTimeout(function () {
      typed.textContent = '';
      typed.classList.remove('is-done');
      vbar.style.width = '0%';
      vtimer.textContent = '0:00';
      vlabel.textContent = '长按开始';
      setState('idle');
    }, ms);
  }

  if (pet) {
    pet.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      try { pet.setPointerCapture(e.pointerId); } catch (err) {}
      start();
    });
    pet.addEventListener('pointerup', stop);
    pet.addEventListener('pointercancel', stop);
    pet.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    pet.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!e.repeat) start();
      }
    });
    pet.addEventListener('keyup', function (e) {
      if (e.key === ' ' || e.key === 'Enter') stop();
    });
  }

  /* ---------- 5. 动画帧轮播 ---------- */
  var stage = document.getElementById('stage');
  if (stage) {
    var imgs = Array.prototype.slice.call(stage.querySelectorAll('.stage__img'));
    var cap = document.getElementById('stagecap');
    var idx = document.getElementById('stageidx');
    var cur = 0, cyc = null;

    var CAPS = ['抛接三球', '写代码', '收到爱心', '偷吃被抓', '打盹中', '凭空生花'];
    function show2(n) {
      imgs[cur].classList.remove('is-on');
      cur = (n + imgs.length) % imgs.length;
      imgs[cur].classList.add('is-on');
      if (cap) cap.textContent = CAPS[cur];
      if (idx) idx.textContent = (cur + 1) + ' / ' + imgs.length;
    }

    var playing = false;
    function play() {
      if (playing || reduce) return;
      playing = true;
      cyc = setInterval(function () { show2(cur + 1); }, 3400);
    }
    function pause() {
      playing = false;
      clearInterval(cyc); cyc = null;
    }

    if (!reduce && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { e.isIntersecting ? play() : pause(); });
      }, { threshold: 0.25 }).observe(stage);
    }
  }

  /* ---------- 6. 复制校验值 ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('.copy'), function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy') || '';
      var done = function () {
        var old = btn.textContent;
        btn.textContent = '已复制';
        btn.classList.add('is-done');
        setTimeout(function () {
          btn.textContent = old;
          btn.classList.remove('is-done');
        }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else {
        fallback();
      }
      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); } catch (e) {}
        document.body.removeChild(ta);
      }
    });
  });

  /* ---------- 7. 入场 ---------- */
  if (!reduce) {
    var groups = Array.prototype.slice.call(document.querySelectorAll(
      '.sec__head, .bento__item, .split__aside, .row, .step, .play__i, .specs__group, .dlc, .install, .qa, .credits article, .credits__cta'
    ));

    groups.forEach(function (el) {
      var sibs = el.parentNode ? Array.prototype.indexOf.call(el.parentNode.children, el) : 0;
      el.style.transitionDelay = Math.min(sibs, 5) * 55 + 'ms';
      el.classList.add('rv');
    });

    var pending = groups.slice();
    var raf = window.requestAnimationFrame || function (fn) { return setTimeout(fn, 16); };
    var ticking = false;

    function sweep() {
      ticking = false;
      var vh = window.innerHeight || 800;
      var left = [];
      pending.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < vh - 16 && r.bottom > -60) {
          el.classList.add('is-in');
        } else {
          left.push(el);
        }
      });
      pending = left;
      if (!pending.length) {
        window.removeEventListener('scroll', onMove);
        window.removeEventListener('resize', onMove);
      }
    }
    function onMove() {
      if (ticking) return;
      ticking = true;
      raf(sweep);
    }

    raf(sweep);
    window.addEventListener('load', sweep);
    window.addEventListener('scroll', onMove, { passive: true });
    window.addEventListener('resize', onMove);
    setTimeout(sweep, 700);
  }
})();
