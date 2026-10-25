/**
 * 页面上散步的大肥鱼（纯装饰）
 *
 * 口径：
 * - 三张精灵图（`assets/pet/walk-*.webp`，产品自带走动动画的帧）在整个视口里**二维漫游**：
 *   朝一个方向慢慢飘，隔一会儿随机转向，撞到视口边缘就拐弯，偶尔原地发呆几秒；
 * - 朝向跟随水平运动方向翻转（`scaleX`），所以左飘右飘看起来都是"面朝前进方向"；
 * - 图层 `position: fixed` 覆盖整个视口、`pointer-events: none`，绝不挡点击；
 *   层级 40 低于吸顶导航（100），所以它们会从导航条下面穿过去，不会盖住菜单；
 * - `prefers-reduced-motion` 生效时不启动（CSS 也把整层隐藏）；
 * - 标签页切后台时停掉 rAF，回来从当前位置继续；
 * - 视口变化时把跑到外面的鱼拉回可视范围。
 *
 * 为什么手写 rAF 而不是 CSS keyframes：需要随机转向 + 拐弯 + 朝向翻转 + 随机停顿，
 * 这些状态 CSS 表达不了。
 */
(function () {
  'use strict';

  var layer = document.getElementById('pet-walkers');
  if (!layer) return;

  var sprites = Array.prototype.slice.call(layer.querySelectorAll('.pet-walker'));
  if (!sprites.length) return;

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;  // CSS 已隐藏，也不跑循环
  }

  var vw = window.innerWidth;
  var vh = window.innerHeight;

  // 初始位置按网格铺开（4 列 × N 行），避免几只挤在同一个角落
  var COLS = 4;

  var walkers = sprites.map(function (el, i) {
    var col = i % COLS;
    var row = Math.floor(i / COLS);
    var rows = Math.max(1, Math.ceil(sprites.length / COLS));
    var jitter = function () { return (Math.random() - 0.5) * 80; };
    var x = vw * (col + 0.5) / COLS + jitter();
    var y = vh * (row + 0.5) / rows + jitter();
    return {
      el: el,
      x: Math.max(0, Math.min(Math.max(0, vw - 90), x)),
      y: Math.max(0, Math.min(Math.max(0, vh - 110), y)),
      angle: Math.random() * Math.PI * 2,
      speed: 12 + Math.random() * 22,      // px/s，个体差异大一点更自然
      turnIn: 1.5 + Math.random() * 4.5,   // 距离下次随机转向的秒数
      pauseLeft: Math.random() * 2.4
    };
  });

  function place(w, now) {
    var bob = Math.sin(now / 620 + w.x / 120) * 2;
    var facing = Math.cos(w.angle) >= 0 ? 1 : -1;
    w.el.style.transform =
      'translate3d(' + (w.x + (facing === 1 ? 0 : w.el.offsetWidth)).toFixed(1) + 'px,' +
      (w.y + bob).toFixed(1) + 'px,0) scaleX(' + facing + ')';
  }

  var last = 0;
  var rafId = null;

  function step(now) {
    if (!last) last = now;
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    walkers.forEach(function (w) {
      var width = w.el.offsetWidth || 60;
      var height = w.el.offsetHeight || 80;

      if (w.pauseLeft > 0) {
        w.pauseLeft -= dt;
        return;
      }

      // 随机转向（不是直线，像在闲逛）
      w.turnIn -= dt;
      if (w.turnIn <= 0) {
        w.angle += (Math.random() - 0.5) * 1.6;
        w.turnIn = 2.5 + Math.random() * 4.5;
        w.speed = 14 + Math.random() * 16;
        if (Math.random() < 0.18) w.pauseLeft = 1.2 + Math.random() * 2.4;
      }

      var dx = Math.cos(w.angle) * w.speed * dt;
      var dy = Math.sin(w.angle) * w.speed * dt;

      w.x += dx;
      w.y += dy;

      // 撞到视口四边就换个方向弹回来
      if (w.x < 0) { w.x = 0; w.angle = Math.PI - w.angle; }
      if (w.x > vw - width) { w.x = vw - width; w.angle = Math.PI - w.angle; }
      if (w.y < 0) { w.y = 0; w.angle = -w.angle; }
      if (w.y > vh - height) { w.y = vh - height; w.angle = -w.angle; }

      // 角度收敛回正常区间，避免长跑后数值越滚越大
      if (w.angle > Math.PI * 2 || w.angle < -Math.PI * 2) {
        w.angle = w.angle % (Math.PI * 2);
      }
    });

    walkers.forEach(function (w) { place(w, now); });
    rafId = window.requestAnimationFrame(step);
  }

  function start() {
    if (rafId === null) {
      last = 0;
      rafId = window.requestAnimationFrame(step);
    }
  }

  function stop() {
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  walkers.forEach(function (w) { place(w, 0); });
  start();

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else start();
  });

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      vw = window.innerWidth;
      vh = window.innerHeight;
      walkers.forEach(function (w) {
        var width = w.el.offsetWidth || 60;
        var height = w.el.offsetHeight || 80;
        w.x = Math.min(Math.max(0, w.x), Math.max(0, vw - width));
        w.y = Math.min(Math.max(0, w.y), Math.max(0, vh - height));
        place(w, 0);
      });
    }, 150);
  });
})();
