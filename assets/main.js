/**
 * 鱼语输入法 · 官网交互脚本
 *
 * 设计原则：
 * 1. 渐进增强——页面在禁用 JS 时依然完整可读（.reveal 类由脚本添加）。
 * 2. 零依赖、零网络请求，可在 file:// 协议下正常运行。
 * 3. 尊重 prefers-reduced-motion，不做强制动画。
 */
(function () {
  'use strict';

  /** 是否偏好减少动效。 */
  var prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------
   * 1. 移动端导航抽屉
   * ---------------------------------------------------------- */
  function initNav() {
    var toggle = document.getElementById('nav-toggle');
    var nav = document.getElementById('site-nav');
    var header = document.getElementById('site-header');

    if (!toggle || !nav) {
      return;
    }

    /** 设置抽屉开合状态，同时同步 ARIA 属性。 */
    function setOpen(open) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? '关闭导航菜单' : '打开导航菜单');
    }

    /** 当前抽屉是否展开。 */
    function isOpen() {
      return toggle.getAttribute('aria-expanded') === 'true';
    }

    toggle.addEventListener('click', function () {
      setOpen(!isOpen());
    });

    // 点击导航内任意链接后收起（锚点跳转场景）
    nav.addEventListener('click', function (event) {
      var target = event.target;
      if (target && target.closest && target.closest('a')) {
        setOpen(false);
      }
    });

    // Esc 收起并把焦点还给按钮
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && isOpen()) {
        setOpen(false);
        toggle.focus();
      }
    });

    // 点击抽屉外部收起
    document.addEventListener('click', function (event) {
      if (!isOpen()) {
        return;
      }
      var node = event.target;
      if (!node || !node.closest) {
        return;
      }
      if (!node.closest('#site-nav') && !node.closest('#nav-toggle')) {
        setOpen(false);
      }
    });

    // 视口变宽回到桌面布局时，强制复位抽屉状态
    if (window.matchMedia) {
      var wide = window.matchMedia('(min-width: 768px)');
      var onChange = function (event) {
        if (event.matches) {
          setOpen(false);
        }
      };
      if (typeof wide.addEventListener === 'function') {
        wide.addEventListener('change', onChange);
      } else if (typeof wide.addListener === 'function') {
        wide.addListener(onChange);
      }
    }

    // 顶栏滚动态
    if (header) {
      var ticking = false;
      var updateHeader = function () {
        var scrolled = window.scrollY > 8;
        header.classList.toggle('is-scrolled', scrolled);
        ticking = false;
      };
      var onScroll = function () {
        if (ticking) {
          return;
        }
        ticking = true;
        window.requestAnimationFrame(updateHeader);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      updateHeader();
    }
  }

  /* ------------------------------------------------------------
   * 2. 滚动进入动画（渐进增强）
   * ---------------------------------------------------------- */
  function initReveal() {
    if (prefersReducedMotion) {
      return;
    }

    var targets = document.querySelectorAll(
      '.section-head, .card, .step, .dl-card, .table-wrap, .install, .faq-item'
    );

    if (!targets.length) {
      return;
    }

    // 环境不支持 IntersectionObserver 时保持内容可见，直接返回。
    if (!('IntersectionObserver' in window)) {
      return;
    }

    // 是否至少触发过一次观察器回调。用来判断 IO 本身是否正常工作。
    var observerFired = false;

    var observer = new IntersectionObserver(
      function (entries) {
        observerFired = true;
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            return;
          }
          var el = entry.target;
          var delay = Number(el.getAttribute('data-reveal-delay') || '0');
          window.setTimeout(function () {
            el.classList.add('is-visible');
          }, delay);
          observer.unobserve(el);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );

    Array.prototype.forEach.call(targets, function (el, index) {
      el.classList.add('reveal');
      // 同一组卡片错开一点，形成节奏感
      el.setAttribute('data-reveal-delay', String((index % 3) * 70));
      observer.observe(el);
    });

    // 600ms 兜底：仅在「观察器到 600ms 一次回调都没发生」时批量加就绪类，
    // 用来应对内嵌浏览器 / 特殊渲染环境下 IO 静默失效的情况。
    //
    // 为什么加这个条件：.reveal 只做 translateY、不碰 opacity，内容本来
    // 就已经可读，所以这里不需要为"显示内容"兜底；真正的风险只是位移
    // 永久停不下来。而无条件批量加就绪类会把滚动动画全体提前吃掉
    // （所有元素在 600ms 就位，用户往下滚时不再有 18px 入场位移）。
    // 因此只在 IO 完全没动静时才兜底，IO 正常时保留滚动动画。
    window.setTimeout(function () {
      if (observerFired) {
        return;
      }
      Array.prototype.forEach.call(targets, function (el) {
        el.classList.add('is-visible');
      });
    }, 600);
  }

  /* ------------------------------------------------------------
   * 3. FAQ 手风琴：同一时间只展开一条
   * ---------------------------------------------------------- */
  function initFaq() {
    var items = document.querySelectorAll('.faq-item');
    if (!items.length) {
      return;
    }

    Array.prototype.forEach.call(items, function (item) {
      item.addEventListener('toggle', function () {
        if (!item.open) {
          return;
        }
        Array.prototype.forEach.call(items, function (other) {
          if (other !== item && other.open) {
            other.open = false;
          }
        });
      });
    });
  }

  /* ------------------------------------------------------------
   * 4. 下载链接反馈
   *    纯本地提示：点击后短暂把按钮文案改成「已开始下载」，
   *    避免用户在大文件下载时反复点击。
   * ---------------------------------------------------------- */
  function initDownloadFeedback() {
    var links = document.querySelectorAll('a[download][href$=".exe"], a[download][href$=".zip"]');
    if (!links.length) {
      return;
    }

    Array.prototype.forEach.call(links, function (link) {
      var original = link.innerHTML;
      var originalLabel = link.getAttribute('aria-label') || '';

      link.addEventListener('click', function () {
        if (link.dataset.busy === '1') {
          return;
        }
        link.dataset.busy = '1';
        link.setAttribute('aria-label', '文件已开始下载');

        var label = link.querySelector('[data-dl-label]');
        if (label) {
          label.textContent = '已开始下载';
        } else {
          link.textContent = '已开始下载';
        }

        window.setTimeout(function () {
          link.innerHTML = original;
          if (originalLabel) {
            link.setAttribute('aria-label', originalLabel);
          } else {
            link.removeAttribute('aria-label');
          }
          link.dataset.busy = '0';
        }, 4000);
      });
    });
  }

  /* ------------------------------------------------------------
   * 5. 平滑滚动（对不支持 scroll-behavior 的旧浏览器兜底）
   * ---------------------------------------------------------- */
  function initAnchorScroll() {
    if (prefersReducedMotion) {
      return;
    }

    var supportsSmooth =
      'scrollBehavior' in document.documentElement.style;
    if (supportsSmooth) {
      return;
    }

    document.addEventListener('click', function (event) {
      var node = event.target;
      if (!node || !node.closest) {
        return;
      }
      var anchor = node.closest('a[href^="#"]');
      if (!anchor) {
        return;
      }
      var id = anchor.getAttribute('href');
      if (!id || id === '#') {
        return;
      }
      var target = document.querySelector(id);
      if (!target) {
        return;
      }
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /* ------------------------------------------------------------
   * 启动
   * ---------------------------------------------------------- */
  function boot() {
    initNav();
    initFaq();
    initDownloadFeedback();
    initAnchorScroll();
    initReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
