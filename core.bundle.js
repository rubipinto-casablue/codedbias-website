/* =========================================================
   CBW APP BUNDLE (Repo)
   - Stable + Core + Page modules + Barba/Wipe
   - Keep Webflow inline code minimal (only patch/debug).
   - Code comments in English ✅
========================================================= */

(() => {
  /* =========================================================
     SECTION A — YOUR ORIGINAL "CBW STABLE BUNDLE (Repo)"
     (Kept as-is, only minor formatting/guards)
  ========================================================= */

  // Prevent double-loading if Webflow injects scripts multiple times
  if (window.__CBW_APP_BUNDLE_LOADED__ === true) return;
  window.__CBW_APP_BUNDLE_LOADED__ = true;

  /* ---------------------------------------------------------
     Small helpers
  --------------------------------------------------------- */
  function qs(sel, root = document) { return root.querySelector(sel); }

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  function safeTry(fn) {
    try { return fn(); } catch (e) { return null; }
  }

  /* =========================================================
     1) TOUR DROPDOWN + CURRENT STOP HIGHLIGHT (Barba-safe)
  ========================================================= */
  function initTourDropdown(root = document) {
    const dd = root.querySelector(".tour_dd");
    if (!dd) return;

    const btn = dd.querySelector(".tour_dd-toggle");
    const panel = dd.querySelector(".tour_dd-panel");
    if (!btn || !panel) return;

    if (dd.dataset.bound === "1") return;
    dd.dataset.bound = "1";

    if (!panel.id) panel.id = "tour-dd-panel-" + Math.random().toString(16).slice(2);
    btn.setAttribute("aria-controls", panel.id);
    btn.setAttribute("aria-expanded", "false");

    const open = () => {
      dd.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
    };

    const close = () => {
      dd.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
    };

    const toggle = () => (dd.classList.contains("is-open") ? close() : open());

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    });

    document.addEventListener("click", (e) => {
      if (!dd.classList.contains("is-open")) return;
      if (dd.contains(e.target)) return;
      close();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    panel.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      close();
    });

    dd.__open = open;
    dd.__close = close;
  }

  function closeAllTourDropdowns() {
    document.querySelectorAll(".tour_dd").forEach(dd => {
      dd.classList.remove("is-open");
      const btn = dd.querySelector(".tour_dd-toggle");
      if (btn) btn.setAttribute("aria-expanded", "false");
    });
  }

  function normalizePath(urlOrPath) {
    try {
      const u = new URL(urlOrPath, window.location.origin);
      let p = u.pathname || "/";
      if (p.length > 1) p = p.replace(/\/+$/, "");
      return p;
    } catch {
      let p = urlOrPath || "/";
      if (p.length > 1) p = p.replace(/\/+$/, "");
      return p;
    }
  }

  function markCurrentTourStop(root = document) {
    const currentPath = normalizePath(window.location.href);

    root.querySelectorAll(".tour-stop-link").forEach(a => {
      const linkPath = normalizePath(a.href);
      const isCurrent = linkPath === currentPath;

      a.classList.toggle("is-current", isCurrent);

      if (isCurrent) {
        a.setAttribute("aria-current", "page");
        a.setAttribute("aria-disabled", "true");
        a.setAttribute("tabindex", "-1");
      } else {
        a.removeAttribute("aria-current");
        a.removeAttribute("aria-disabled");
        a.removeAttribute("tabindex");
      }
    });
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest(".tour-stop-link");
    if (!a) return;

    const currentPath = normalizePath(window.location.href);
    const linkPath = normalizePath(a.href);

    if (linkPath === currentPath) {
      e.preventDefault();
      e.stopPropagation();
      closeAllTourDropdowns();
    }
  }, true);

  /* =========================================================
     2) PERSISTENT AUDIO + LOTTIE SYNC (Barba-safe)
  ========================================================= */
  function initPersistentAudio() {
    const audio = document.getElementById("bg-audio");
    if (!audio) {
      console.warn("[Audio] #bg-audio not found");
      return;
    }

    const STORAGE_KEY = "bg-audio-playing";
    const TARGET_VOL = 0.6;

    function fadeVolume(el, to, ms) {
      const from = el.volume;
      const steps = 30;
      let i = 0;
      const tick = ms / steps;

      const iv = setInterval(() => {
        i++;
        el.volume = from + (to - from) * (i / steps);
        if (i >= steps) clearInterval(iv);
      }, tick);
    }

    function getLottieInstance() {
      return safeTry(() => {
        const wf = window.Webflow?.require?.("lottie");
        if (!wf?.lottie) return null;

        const el = document.getElementById("audioLottie");
        if (!el) return null;

        const regs = wf.lottie.getRegisteredAnimations?.() || [];
        return regs.find(a => a.wrapper === el) || null;
      });
    }

    function setLottieOpacity(on) {
      const el = document.getElementById("audioLottie");
      if (!el) return;

      const to = on ? 1 : 0.35;
      const ms = 250;

      if (window.gsap) {
        window.gsap.to(el, { opacity: to, duration: ms / 1000, overwrite: true, ease: "power2.out" });
      } else {
        el.style.transition = `opacity ${ms}ms ease`;
        el.style.opacity = String(to);
      }
    }

    function lottieOff() {
      const inst = getLottieInstance();
      if (!inst) return;
      inst.loop = false;
      inst.stop();
      inst.goToAndStop(0, true);
      setLottieOpacity(false);
    }

    function lottieOnLoop() {
      const inst = getLottieInstance();
      if (!inst) return;
      inst.loop = true;
      inst.play();
      setLottieOpacity(true);
    }

    function syncLottie() {
      if (audio.paused) lottieOff();
      else lottieOnLoop();
    }

    // Restore state
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "true") {
      audio.volume = 0;
      audio.play().catch(() => {});
      fadeVolume(audio, TARGET_VOL, 900);
    }

    setTimeout(syncLottie, 400);

    function toggleAudio() {
      if (audio.paused) {
        audio.volume = 0;
        audio.play().catch(() => {});
        fadeVolume(audio, TARGET_VOL, 900);
        localStorage.setItem(STORAGE_KEY, "true");
        lottieOnLoop();
      } else {
        fadeVolume(audio, 0, 600);
        setTimeout(() => audio.pause(), 650);
        localStorage.setItem(STORAGE_KEY, "false");
        lottieOff();
      }
    }

    // Delegate click (works across Barba containers)
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".audio-toggle");
      if (!btn) return;
      e.preventDefault();
      toggleAudio();
    });

    if (window.barba?.hooks) {
      window.barba.hooks.after(() => setTimeout(syncLottie, 350));
    }

    console.log("[Audio] init ✅");
  }

  /* =========================================================
     3) GSAP SCROLL ENGINE (ONE SINGLE MOTOR)
  ========================================================= */
  function initGsapEngine() {
    if (!window.gsap || !window.ScrollTrigger) {
      console.warn("[GSAPEngine] GSAP/ScrollTrigger not found");
      return;
    }

    window.gsap.registerPlugin(window.ScrollTrigger);

    const ST_DEFAULTS = { start: "top 65%", end: "top 25%" };
    let timelines = [];

    function killAll() {
      timelines.forEach(tl => {
        safeTry(() => tl.scrollTrigger?.kill?.());
        safeTry(() => tl.kill?.());
      });
      timelines = [];
    }

    function splitIntoWords(el, key = "splitWordsReady") {
      if (el.dataset[key] === "1") return el.querySelectorAll(".gsap-word");

      const text = (el.textContent || "").trim();
      if (!text) return [];

      const words = text.split(/\s+/).filter(Boolean);
      el.innerHTML = words
        .map(w => `<span class="gsap-word" style="display:inline-block;">${w}</span>`)
        .join(" ");

      el.dataset[key] = "1";
      return el.querySelectorAll(".gsap-word");
    }

    function splitIntoLines(el) {
      if (el.dataset.splitLinesReady === "1") return el.querySelectorAll(".gsap-line");

      const originalText = (el.textContent || "").trim();
      if (!originalText) return [];

      const words = originalText.split(/\s+/).filter(Boolean);

      el.innerHTML = "";
      const frag = document.createDocumentFragment();

      words.forEach((w, i) => {
        const s = document.createElement("span");
        s.className = "gsap-word-measure";
        s.style.display = "inline-block";
        s.textContent = w;
        frag.appendChild(s);
        if (i < words.length - 1) frag.appendChild(document.createTextNode(" "));
      });

      el.appendChild(frag);

      const wordSpans = Array.from(el.querySelectorAll(".gsap-word-measure"));
      if (!wordSpans.length) return [];

      const lines = [];
      let currentTop = null;
      let currentLineWords = [];

      wordSpans.forEach(span => {
        const top = span.offsetTop;
        if (currentTop === null) currentTop = top;

        if (top !== currentTop) {
          lines.push(currentLineWords);
          currentLineWords = [];
          currentTop = top;
        }
        currentLineWords.push(span.textContent);
      });
      if (currentLineWords.length) lines.push(currentLineWords);

      el.innerHTML = lines
        .map(wordsArr => `<span class="gsap-line" style="display:block;">${wordsArr.join(" ")}</span>`)
        .join("");

      el.dataset.splitLinesReady = "1";
      return el.querySelectorAll(".gsap-line");
    }

    function makeScrubTL(triggerEl, start, end) {
      return window.gsap.timeline({
        scrollTrigger: {
          trigger: triggerEl,
          start: start || ST_DEFAULTS.start,
          end: end || ST_DEFAULTS.end,
          scrub: true,
          invalidateOnRefresh: true
        }
      });
    }

    // HERO PARALLAX (Barba-safe)
    function initHeroParallax(container = document) {
      if (!window.gsap || !window.ScrollTrigger) return;

      const heroes = Array.from(container.querySelectorAll(".hero-main"));
      if (!heroes.length) return;

      heroes.forEach((hero) => {
        const bg = hero.querySelector(".hero-bg");
        const card = hero.querySelector(".u-hero-card-wrap");
        if (!bg || !card) return;

        // Kill previous instance for this hero (Barba re-entry safe)
        if (hero.__heroParallaxST) {
          try { hero.__heroParallaxST.kill(true); } catch (e) {}
          hero.__heroParallaxST = null;
        }

        // Reset transforms
        window.gsap.set([bg, card], { clearProps: "transform" });
        window.gsap.set([bg, card], { yPercent: 0 });

        const tl = window.gsap.timeline({ defaults: { ease: "none" } })
          .to(bg,   { yPercent: -15 }, 0)
          .to(card, { yPercent: -40 }, 0);

        const st = window.ScrollTrigger.create({
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: true,
          invalidateOnRefresh: true,
          animation: tl,
          onRefreshInit: () => {
            window.gsap.set([bg, card], { yPercent: 0 });
          }
        });

        hero.__heroParallaxST = st;
      });
    }

    function initAboutIntro(container = document) {
      const targets = container.querySelectorAll('[data-gsap="about-intro"]');
      if (!targets.length) return;

      targets.forEach(el => {
        if (el.dataset.aboutIntroInited === "1") return;
        el.dataset.aboutIntroInited = "1";

        const words = splitIntoWords(el, "aboutIntroSplitReady");
        if (!words.length) return;

        window.gsap.set(words, { opacity: 0.2 });

        const tl = window.gsap.timeline({
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            end: "top 15%",
            scrub: true,
            invalidateOnRefresh: true
          }
        });

        tl.to(words, {
          opacity: 1,
          duration: 0.25,
          ease: "none",
          stagger: 0.02
        }, 0);

        timelines.push(tl);
      });
    }

    function initTitleBlocks(container = document) {
      const blocks = container.querySelectorAll('[data-gsap="title-block"]');
      if (!blocks.length) return;

      blocks.forEach(block => {
        if (block.dataset.titleBlockInited === "1") return;
        block.dataset.titleBlockInited = "1";

        const eyebrow = block.querySelector(".text-eyebrow");
        const display = block.querySelector(".text-display-2");
        const dotted  = block.querySelector(".dotted-line");

        const tl = makeScrubTL(block, "top 65%", "top 25%");

        if (eyebrow) {
          const words = splitIntoWords(eyebrow, "titleEyebrowSplitReady");
          if (words.length) {
            window.gsap.set(words, { opacity: 0 });
            tl.to(words, { opacity: 1, ease: "none", stagger: 0.05 }, 0);
          }
        }

        if (display) {
          const words = splitIntoWords(display, "titleDisplaySplitReady");
          if (words.length) {
            window.gsap.set(words, { opacity: 0 });
            tl.to(words, { opacity: 1, ease: "none", stagger: 0.05 }, 0.05);
          }
        }

        if (dotted) {
          window.gsap.set(dotted, { opacity: 0 });
          tl.to(dotted, { opacity: 1, ease: "none" }, 0.10);
        }

        timelines.push(tl);
      });
    }

    function initGridCols(container = document) {
      const grids = container.querySelectorAll('[data-gsap="grid-cols"]');
      if (!grids.length) return;

      grids.forEach(grid => {
        if (grid.dataset.gridInited === "1") return;
        grid.dataset.gridInited = "1";

        let cols = Array.from(grid.children).filter(el => el.classList?.contains("u-grid-col"));
        if (!cols.length) cols = Array.from(grid.querySelectorAll(".u-grid-col"));
        if (!cols.length) return;

        window.gsap.set(cols, { opacity: 0 });

        const tl = makeScrubTL(grid, "top 65%", "top 25%");
        tl.to(cols, { opacity: 1, ease: "none", stagger: 0.15 }, 0);

        timelines.push(tl);
      });
    }

    function initLinesStagger(container = document) {
      const blocks = container.querySelectorAll('[data-gsap="lines-stagger"]');
      if (!blocks.length) return;

      blocks.forEach(el => {
        if (el.dataset.linesInited === "1") return;
        el.dataset.linesInited = "1";

        const lines = splitIntoLines(el);
        if (!lines.length) return;

        window.gsap.set(lines, { opacity: 0 });

        const tl = makeScrubTL(el);
        tl.to(lines, {
          opacity: 1,
          duration: 0.25,
          ease: "none",
          stagger: 0.05
        }, 0);

        timelines.push(tl);
      });
    }

    function initFadeSimple(container = document) {
      const blocks = container.querySelectorAll('[data-gsap="fade-simple"]');
      if (!blocks.length) return;

      blocks.forEach(el => {
        if (el.dataset.fadeInited === "1") return;
        el.dataset.fadeInited = "1";

        window.gsap.set(el, { opacity: 0 });

        const tl = makeScrubTL(el);
        tl.to(el, { opacity: 1, duration: 0.25, ease: "none" }, 0);

        timelines.push(tl);
      });
    }

    function initAll(container = document) {
      initHeroParallax(container);
      initAboutIntro(container);
      initTitleBlocks(container);
      initGridCols(container);
      initLinesStagger(container);
      initFadeSimple(container);
    }

    onReady(() => {
      killAll();
      initAll(document);
      safeTry(() => window.ScrollTrigger.refresh());
      console.log("[GSAPEngine] init (DOMContentLoaded) ✅");
    });

    if (window.barba?.hooks) {
      // Do not kill beforeLeave (prevents visible snapping). Kill afterLeave.
      window.barba.hooks.afterLeave(() => killAll());

      window.barba.hooks.afterEnter(({ next }) => {
        const container = next?.container || document;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            initAll(container);
            safeTry(() => window.ScrollTrigger.refresh());
            console.log("[GSAPEngine] init (afterEnter) ✅");
          });
        });
      });
    }
  }

  /* =========================================================
     4) ABOUT CREDITS CRAWL (NO PIN) — EXACT PADDING RULES
  ========================================================= */
  function initAboutCreditsCrawl() {
    if (!window.gsap || !window.ScrollTrigger) return;
    window.gsap.registerPlugin(window.ScrollTrigger);

    function remToPx(rem) {
      const fs = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      return rem * fs;
    }

    function init(scope = document) {
      const root = scope && scope.querySelector ? scope : document;
      const wraps = Array.from(root.querySelectorAll(".about-credits-wrap"));
      if (!wraps.length) return;

      wraps.forEach((wrap) => {
        const mask = wrap.querySelector(".about-credits-mask");
        const layout = wrap.querySelector(".about-credits-layout");
        if (!mask || !layout) return;

        // Kill previous instance (Barba-safe) — NO revert (prevents snap)
        if (wrap._creditsST) {
          safeTry(() => wrap._creditsST.kill(false));
          wrap._creditsST = null;
        }
        window.gsap.killTweensOf(layout);

        const PAD = remToPx(10);

        function computeStartEndY() {
          const mh = mask.clientHeight;
          const lh = layout.scrollHeight;
          const startY = PAD;
          const endY = mh - PAD - lh;
          return { startY, endY, mh, lh };
        }

        const { startY, endY, mh, lh } = computeStartEndY();
        if (lh <= (mh - PAD * 2) + 1) {
          window.gsap.set(layout, { y: PAD });
          return;
        }

        window.gsap.set(layout, { y: startY });

        const st = window.ScrollTrigger.create({
          trigger: wrap,
          start: "top 90%",
          end: "bottom 10%",
          scrub: true,
          invalidateOnRefresh: true,

          onRefresh: () => {
            const vals = computeStartEndY();
            window.gsap.set(layout, { y: vals.startY });
          },

          onUpdate: (self) => {
            const vals = computeStartEndY();
            const y = vals.startY + (vals.endY - vals.startY) * self.progress;
            window.gsap.set(layout, { y });
          }
        });

        wrap._creditsST = st;
      });

      requestAnimationFrame(() => safeTry(() => window.ScrollTrigger.refresh()));
    }

    onReady(() => {
      init(document);
      console.log("[AboutCredits] init (DOMContentLoaded) ✅");
    });

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => safeTry(() => window.ScrollTrigger.refresh()));
    }

    if (window.barba?.hooks) {
      window.barba.hooks.afterEnter(({ next }) => {
        init(next?.container || document);
        console.log("[AboutCredits] init (afterEnter) ✅");
      });

      window.barba.hooks.after(() => safeTry(() => window.ScrollTrigger.refresh()));
    }
  }

  /* =========================================================
     6) DISABLE CURRENT FOOTER LINKS (Barba-safe)
  ========================================================= */
  function initDisableCurrentFooterLinks() {
    const NAV_SELECTOR = ".footer_link";

    function normalize(url) {
      const u = new URL(url, location.origin);
      let p = u.pathname.replace(/\/+$/, "") || "/";
      // Compare path + search only (ignore hash so anchors are not broken)
      return p + u.search;
    }

    function disableCurrentNavLinks(scope = document) {
      const current = normalize(location.href);

      scope.querySelectorAll(NAV_SELECTOR).forEach(a => {
        // Safety: never touch lightbox links
        if (a.classList.contains("w-lightbox") || a.closest(".w-lightbox")) return;

        const link = normalize(a.href);
        const isCurrent = link === current;

        a.classList.toggle("is-current", isCurrent);

        if (isCurrent) {
          a.setAttribute("aria-current", "page");
          a.setAttribute("aria-disabled", "true");
          a.setAttribute("tabindex", "-1");
          a.style.pointerEvents = "none";
          a.style.cursor = "default";
        } else {
          a.removeAttribute("aria-current");
          a.removeAttribute("aria-disabled");
          a.removeAttribute("tabindex");
          a.style.pointerEvents = "";
          a.style.cursor = "";
        }
      });
    }

    onReady(() => disableCurrentNavLinks(document));

    if (window.barba?.hooks) {
      window.barba.hooks.afterEnter(({ next }) => {
        disableCurrentNavLinks(next?.container || document);
        // Also run on full document in case nav lives outside container
        disableCurrentNavLinks(document);
      });
    }
  }

  /* =========================================================
     BOOT STABLE
  ========================================================= */
  onReady(() => {
    initTourDropdown(document);
    markCurrentTourStop(document);

    initPersistentAudio();
    initGsapEngine();
    initAboutCreditsCrawl();
    initDisableCurrentFooterLinks();

    if (window.barba?.hooks) {
      window.barba.hooks.beforeLeave(() => closeAllTourDropdowns());
      window.barba.hooks.afterEnter(({ next }) => {
        const container = next?.container || document;
        initTourDropdown(container);
        markCurrentTourStop(document);
        markCurrentTourStop(container);
        closeAllTourDropdowns();
      });
    }

    console.log("[CBW Stable] loaded ✅");
  });
})();


/* =========================================================
   SECTION B — NAV + TOURS SWIPER (Your original, kept)
========================================================= */
(() => {
  /**
   * NAV + TOURS SWIPER (Barba-safe)
   * Code comments in English ✅
   */

  if (window.__NAV_PUSH_AND_SWIPER_INIT__) return;
  window.__NAV_PUSH_AND_SWIPER_INIT__ = true;

  const SELECTORS = {
    navBtn: ".main-hb-menu",
    pageWrap: "#page-wrap",
    navPanel: ".nav-panel",
    backdrop: ".nav-backdrop",
    toursSwiperRoot: ".nav-tours-wrapper.swiper",

    iconOpen: ".nav-toggle-icon.is-open",
    iconClose: ".nav-toggle-icon.is-close"
  };

  const navBtn = document.querySelector(SELECTORS.navBtn);
  const pageWrap = document.querySelector(SELECTORS.pageWrap);
  const navPanel = document.querySelector(SELECTORS.navPanel);
  const backdrop = document.querySelector(SELECTORS.backdrop);

  if (!navBtn || !pageWrap || !navPanel || !backdrop) {
    console.warn("[NAV] Missing elements.", SELECTORS);
    return;
  }

  if (!window.gsap) {
    console.warn("[NAV] GSAP is not loaded.");
    return;
  }

  const iconOpen = navBtn.querySelector(SELECTORS.iconOpen);
  const iconClose = navBtn.querySelector(SELECTORS.iconClose);

  if (iconOpen && iconClose) {
    window.gsap.set(iconOpen, { y: "0rem" });
    window.gsap.set(iconClose, { y: "3rem" });
  } else {
    console.warn("[NAV] Toggle icons not found (optional).", { iconOpen, iconClose });
  }

  window.gsap.set(backdrop, { opacity: 0, pointerEvents: "none" });
  window.gsap.set(navPanel, { pointerEvents: "none" });

  let savedScrollY = 0;

  function lockScroll() {
    savedScrollY = window.scrollY || window.pageYOffset || 0;

    document.body.style.position = "fixed";
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  }

  function unlockScroll() {
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";

    window.scrollTo(0, savedScrollY);
  }

  let navToursSwiper = null;

  function getSitePaddingPx() {
    const test = document.createElement("div");
    test.style.position = "absolute";
    test.style.left = "-9999px";
    test.style.top = "-9999px";
    test.style.width = "calc(var(--_site-settings---site-padding))";
    document.body.appendChild(test);
    const px = test.getBoundingClientRect().width;
    test.remove();
    return Number.isFinite(px) ? px : 0;
  }

  function ensureNavToursEndSpacer(sw) {
    if (!sw || !sw.el) return;

    const root = sw.el;
    const wrapper = root.querySelector(".swiper-wrapper");
    if (!wrapper) return;

    const prevSpacer = wrapper.querySelector(".nav-tour-spacer");
    if (prevSpacer) prevSpacer.remove();

    const realSlides = Array.from(wrapper.children).filter(
      (el) =>
        el.classList &&
        el.classList.contains("swiper-slide") &&
        !el.classList.contains("nav-tour-spacer")
    );
    const lastSlide = realSlides[realSlides.length - 1];
    if (!lastSlide) return;

    const offsetBefore = sw.params.slidesOffsetBefore || 0;
    const viewportW = root.getBoundingClientRect().width;
    const lastW = lastSlide.getBoundingClientRect().width;

    const needed = Math.max(viewportW - lastW - offsetBefore, 0);

    const spacer = document.createElement("div");
    spacer.className = "swiper-slide nav-tour-spacer";
    spacer.style.width = `${needed}px`;
    spacer.style.flex = "0 0 auto";
    spacer.style.pointerEvents = "none";
    spacer.style.opacity = "0";

    wrapper.appendChild(spacer);
  }

  function computeLastRealIndex(sw) {
    return Math.max((sw?.slides?.length || 0) - 2, 0);
  }

  function applyEndHardStop(sw) {
    const lastReal = computeLastRealIndex(sw);
    sw.__lastRealIndex = lastReal;
    sw.allowSlideNext = sw.activeIndex < lastReal;
  }

  function initNavToursSwiper(scope = document) {
    if (!window.Swiper) {
      console.warn("[NavToursSwiper] Swiper is not loaded.");
      return;
    }

    const root = scope.querySelector(SELECTORS.toursSwiperRoot);
    if (!root) return;

    if (navToursSwiper && typeof navToursSwiper.destroy === "function") {
      navToursSwiper.destroy(true, true);
      navToursSwiper = null;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    navToursSwiper = new window.Swiper(root, {
      freeMode: false,
      slidesPerView: "auto",
      slidesPerGroup: 1,
      centeredSlides: false,

      slidesOffsetBefore: getSitePaddingPx(),
      slidesOffsetAfter: 0,

      spaceBetween: 18,
      speed: reduceMotion ? 0 : 650,
      grabCursor: true,
      watchOverflow: true,

      observer: true,
      observeParents: true,

      keyboard: { enabled: true, onlyInViewport: true, pageUpDown: false },
      mousewheel: { forceToAxis: true, sensitivity: 1 },

      on: {
        init(sw) {
          ensureNavToursEndSpacer(sw);
          sw.update();
          applyEndHardStop(sw);
        },

        resize(sw) {
          ensureNavToursEndSpacer(sw);
          sw.update();
          applyEndHardStop(sw);
        },

        slideChange(sw) {
          const spacerIndex = sw.slides.length - 1;
          const lastReal = computeLastRealIndex(sw);

          if (sw.activeIndex === spacerIndex) {
            sw.slideTo(lastReal, 0);
          }

          applyEndHardStop(sw);
        }
      }
    });

    window.navToursSwiper = navToursSwiper;
  }

  function updateNavToursSwiper() {
    const sw = window.navToursSwiper;
    if (!sw) return;

    sw.params.slidesOffsetBefore = getSitePaddingPx();
    ensureNavToursEndSpacer(sw);

    sw.update();
    sw.updateSlides();
    sw.updateProgress();
    sw.updateSlidesClasses();

    applyEndHardStop(sw);
  }

  let isOpen = false;

  const navTL = window.gsap.timeline({
    paused: true,
    defaults: { ease: "power3.inOut", duration: 1.2 }
  });

  navTL
    .to(pageWrap, {
      x: () => {
        const navWidth = navPanel.getBoundingClientRect().width;
        return -navWidth;
      }
    }, 0)
    .to(pageWrap, { opacity: 0.6, filter: "blur(6px)" }, 0)
    .to(backdrop, { opacity: 1, duration: 0.35 }, 0)
    .to(navPanel, { x: "0%", opacity: 1 }, 0);

  if (iconOpen && iconClose) {
    navTL.to(iconOpen, { y: "-3rem", duration: 0.6, ease: "power2.inOut" }, 0);
    navTL.to(iconClose, { y: "0rem",  duration: 0.6, ease: "power2.inOut" }, 0);
  }

  navTL.eventCallback("onReverseComplete", () => {
    unlockScroll();

    if (iconOpen && iconClose) {
      window.gsap.set(iconOpen, { y: "0rem" });
      window.gsap.set(iconClose, { y: "3rem" });
    }
  });

  function openNav() {
    if (isOpen) return;
    isOpen = true;

    window.gsap.set(backdrop, { pointerEvents: "auto" });
    window.gsap.set(navPanel, { pointerEvents: "auto" });

    lockScroll();
    navTL.play(0);

    setTimeout(() => {
      updateNavToursSwiper();

      const sw = window.navToursSwiper;
      if (sw && typeof sw.slideTo === "function") {
        sw.slideTo(0, 0);
        sw.update();
      }
    }, 150);
  }

  function closeNav() {
    if (!isOpen && navTL.progress() === 0) return;

    isOpen = false;

    window.gsap.set(backdrop, { pointerEvents: "none" });
    window.gsap.set(navPanel, { pointerEvents: "none" });

    navTL.reverse();

    try { window.ScrollTrigger?.refresh?.(); } catch (e) {}
  }

  function toggleNav() {
    if (isOpen) closeNav();
    else openNav();
  }

  navBtn.addEventListener("click", (e) => {
    e.preventDefault();
    toggleNav();
  });

  backdrop.addEventListener("click", () => closeNav());

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeNav();
  });

  function isHomeRoute() {
    const path = (window.location.pathname || "/").replace(/\/+$/, "") || "/";
    return path === "/";
  }

  document.addEventListener("click", (e) => {
    const homeLink = e.target.closest("a.nav-home-link");
    if (!homeLink) return;
    if (!isHomeRoute()) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    closeNav();

    const isHomeSlider = document.documentElement.classList.contains("is-home-slider");
    if (isHomeSlider && typeof window.homePanelsGoToIntro === "function") {
      window.homePanelsGoToIntro();
    }
  }, true);

  navPanel.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (!link) return;
    closeNav();
  });

  window.addEventListener("resize", () => {
    if (!isOpen) return;

    window.gsap.set(pageWrap, { x: -navPanel.getBoundingClientRect().width });
    updateNavToursSwiper();
  });

  document.addEventListener("DOMContentLoaded", () => {
    initNavToursSwiper(document);
  });

  if (window.barba?.hooks) {
    window.barba.hooks.afterEnter((data) => {
      initNavToursSwiper(data?.next?.container || document);
    });

    window.barba.hooks.beforeLeave(() => {
      closeNav();
    });
  }
})();


/* =========================================================
  MEDIA MODULE (Barba-safe) — FULL (VIDEOS FIXED)
  - Finsweet v2: modules.list.restart() on enter
  - Lightbox: JS modal + Swiper (images + YouTube, autoplay OFF)
  - Calls inline Webflow:
      window.MediaAutoRecoverBoot / window.MediaAutoRecoverDestroy
  Code comments in English ✅
========================================================= */
(() => {
  if (window.__MEDIA_MODULE__) return;
  window.__MEDIA_MODULE__ = true;

  const NS = "media";

  const state = {
    container: null,

    // Lightbox
    onDocClick: null,
    mainSwiper: null,
    thumbsSwiper: null
  };

  /* -----------------------------
     Helpers
  ----------------------------- */
  function getContainer() {
    return state.container || document.querySelector('[data-barba="container"]');
  }

  function isInMedia() {
    const c = getContainer();
    const ns = (c?.getAttribute("data-barba-namespace") || "").trim();
    return ns === NS;
  }

  function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  /* =========================================================
     1) FINSWEET v2 (fs-list) — RESTART
  ========================================================= */
  async function restartFsList(timeoutMs = 6000) {
    const t0 = performance.now();

    while (performance.now() - t0 < timeoutMs) {
      if (window.FinsweetAttributes) break;
      await delay(50);
    }

    const FA = window.FinsweetAttributes;
    if (!FA) {
      console.warn("[FS] window.FinsweetAttributes not found.");
      return false;
    }

    if (FA.modules?.list?.restart) {
      try {
        await FA.modules.list.restart();
        console.log("[FS] list.restart() ✅");
        return true;
      } catch (e) {
        console.warn("[FS] list.restart() failed:", e);
      }
    }

    if (typeof FA.load === "function") {
      try {
        await FA.load("list");
        if (FA.modules?.list?.restart) {
          await FA.modules.list.restart();
          console.log("[FS] load('list') + restart() ✅");
          return true;
        }
      } catch (e) {
        console.warn("[FS] load('list') failed:", e);
      }
    }

    console.warn("[FS] list module not available (modules.list missing).");
    return false;
  }

  async function bootFinsweetList() {
    return restartFsList(6000);
  }

  /* =========================================================
     2) LIGHTBOX (100% JS generated)
     - Triggers: .js-pswp
     - Images: <img> or .js-visual (img/bg)
     - Videos: data-video="youtube" + data-video-id="XXXX"
       (can be on .js-pswp or any child inside)
     - Autoplay: OFF
  ========================================================= */
  const TRIGGER_SELECTOR = ".js-pswp";
  const VISUAL_SELECTOR  = ".js-visual";

  function ensureModalStylesOnce() {
    if (document.getElementById("mglb-styles")) return;

    const style = document.createElement("style");
    style.id = "mglb-styles";
    style.textContent = `
#mglb.mglb{
  position: fixed; inset: 0; z-index: 9999;
  opacity: 0; pointer-events: none; visibility: hidden;
  transition: opacity .18s ease, visibility 0s linear .18s;
}
#mglb.mglb.is-open{
  opacity: 1; pointer-events: auto; visibility: visible;
  transition: opacity .18s ease;
}
#mglb.mglb > .mglb__backdrop{
  position: fixed; inset: 0; background: rgba(0,0,0,.72); z-index: 0;
}
#mglb.mglb > .mglb__panel{
  position: fixed; inset: 0; z-index: 1;
  width: 100%; height: 100%;
  padding: 28px; box-sizing: border-box;
  display: flex; flex-direction: column; gap: 14px;
}
@media (max-width: 767px){
  #mglb.mglb > .mglb__panel{ padding: 16px; }
}
#mglb .mglb__main{ width:100%; flex:1; min-height:0; display:flex; align-items:center; justify-content:center; }
#mglb .mglb__main .swiper-wrapper{ align-items:center; }
#mglb .mglb__main .swiper-slide{ display:flex; align-items:center; justify-content:center; width:100%; height:100%; }

#mglb .mglb__video{
  width: 100%;
  max-width: 1200px;
  aspect-ratio: 16 / 9;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(0,0,0,.35);
}
#mglb .mglb__video iframe{
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
}

#mglb .mglb__thumbs{ width:100%; padding:0 0 4px; }
#mglb .mglb__thumbs .swiper-slide{ width:84px; height:58px; opacity:.45; transition: opacity .18s ease; }
#mglb .mglb__thumbs .swiper-slide-thumb-active{ opacity:1; }

#mglb button[data-mglb-close],
#mglb .mglb__prev,
#mglb .mglb__next{
  width: 44px; height: 44px; border-radius: 999px;
  background: rgba(255,255,255,.18);
  border: 1px solid rgba(255,255,255,.22);
  color: #fff;
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer; user-select: none; -webkit-tap-highlight-color: transparent;
  backdrop-filter: blur(6px);
}
#mglb button[data-mglb-close]{ position:absolute; top:22px; right:22px; z-index:10; }
#mglb .mglb__prev{ position:absolute; left:22px; top:50%; transform:translateY(-50%); z-index:10; }
#mglb .mglb__next{ position:absolute; right:22px; top:50%; transform:translateY(-50%); z-index:10; }
@media (max-width: 767px){
  #mglb button[data-mglb-close]{ top:14px; right:14px; }
  #mglb .mglb__prev{ left:14px; }
  #mglb .mglb__next{ right:14px; }
}
html.mglb-lock, body.mglb-lock { overflow: hidden !important; }
`;
    document.head.appendChild(style);
  }

  function ensureModalExists() {
    ensureModalStylesOnce();

    let modal = document.getElementById("mglb");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "mglb";
    modal.className = "mglb";
    modal.setAttribute("aria-hidden", "true");

    modal.innerHTML = `
      <div class="mglb__backdrop" data-mglb-backdrop></div>
      <div class="mglb__panel">
        <button type="button" data-mglb-close aria-label="Close">✕</button>

        <div class="mglb__main swiper">
          <div class="swiper-wrapper" id="mglbMainWrapper"></div>
        </div>

        <div class="mglb__thumbs swiper">
          <div class="swiper-wrapper" id="mglbThumbsWrapper"></div>
        </div>

        <button type="button" class="mglb__prev" aria-label="Previous">‹</button>
        <button type="button" class="mglb__next" aria-label="Next">›</button>
      </div>
    `;

    document.body.appendChild(modal);

    if (!modal.__mglbBound) {
      modal.__mglbBound = true;

      modal.addEventListener("click", (e) => {
        const closeBtn = e.target?.closest?.("[data-mglb-close]");
        const backdrop = e.target?.closest?.("[data-mglb-backdrop]");
        if (closeBtn || backdrop) closeModal();
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
      });
    }

    return modal;
  }

  function getModalRefs() {
    const modal = ensureModalExists();
    return {
      modal,
      mainRoot: modal.querySelector(".mglb__main.swiper"),
      thumbsRoot: modal.querySelector(".mglb__thumbs.swiper"),
      mainW: modal.querySelector("#mglbMainWrapper"),
      thumbsW: modal.querySelector("#mglbThumbsWrapper"),
      nextEl: modal.querySelector(".mglb__next"),
      prevEl: modal.querySelector(".mglb__prev")
    };
  }

  function destroySwipers() {
    try { state.mainSwiper?.destroy?.(true, true); } catch (e) {}
    try { state.thumbsSwiper?.destroy?.(true, true); } catch (e) {}
    state.mainSwiper = null;
    state.thumbsSwiper = null;
  }

  function clearWrappers() {
    const { mainW, thumbsW } = getModalRefs();
    if (mainW) mainW.innerHTML = "";
    if (thumbsW) thumbsW.innerHTML = "";
  }

  function openModal() {
    const { modal } = getModalRefs();
    modal.style.pointerEvents = "auto";
    modal.style.visibility = "visible";
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("mglb-lock");
    document.body.classList.add("mglb-lock");
  }

  function closeModal() {
    const modal = document.getElementById("mglb");
    if (!modal) return;

    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");

    document.documentElement.classList.remove("mglb-lock");
    document.body.classList.remove("mglb-lock");

    destroySwipers();
    clearWrappers();

    modal.style.pointerEvents = "none";
    window.clearTimeout(modal.__hideT);
    modal.__hideT = window.setTimeout(() => {
      modal.style.visibility = "hidden";
    }, 200);
  }

  function getThumbSrcFromTrigger(trigger) {
    const dataThumb =
      trigger.getAttribute("data-thumb") ||
      trigger.querySelector?.("[data-thumb]")?.getAttribute?.("data-thumb");
    if (dataThumb) return dataThumb;

    const visual = trigger.querySelector(VISUAL_SELECTOR);
    if (visual) {
      if ((visual.tagName || "").toLowerCase() === "img") return visual.currentSrc || visual.src || null;

      const innerImg = visual.querySelector?.("img");
      if (innerImg) return innerImg.currentSrc || innerImg.src || null;

      const bg = getComputedStyle(visual).backgroundImage;
      if (bg && bg !== "none") {
        const match = bg.match(/url\(["']?(.*?)["']?\)/);
        if (match && match[1]) return match[1];
      }
    }

    const img = trigger.querySelector("img");
    return img ? (img.currentSrc || img.src || null) : null;
  }

  function getVideoItemFromTrigger(trigger) {
    // Allow attributes on trigger OR any child inside trigger
    const host = trigger.matches?.("[data-video],[data-video-id]") ? trigger : trigger.querySelector?.("[data-video],[data-video-id]");
    if (!host) return null;

    const kind = (host.getAttribute("data-video") || "").trim().toLowerCase();
    if (kind !== "youtube") return null;

    const vid = (host.getAttribute("data-video-id") || "").trim();
    if (!vid) return null;

    const thumb =
      host.getAttribute("data-thumb") ||
      trigger.getAttribute("data-thumb") ||
      getThumbSrcFromTrigger(trigger) ||
      `https://i.ytimg.com/vi/${encodeURIComponent(vid)}/hqdefault.jpg`;

    return { type: "youtube", id: vid, thumb };
  }

  function getImageItemFromTrigger(trigger) {
    const src = getThumbSrcFromTrigger(trigger);
    if (!src) return null;
    return { type: "image", src, thumb: src };
  }

  function getScopeRoot(clickedTrigger) {
    return (
      clickedTrigger.closest(".w-dyn-list") ||
      clickedTrigger.closest(".w-dyn-items") ||
      getContainer() ||
      document
    );
  }

  function isVisible(el) {
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  }

  function buildScopedGallery(clickedTrigger) {
    const scopeRoot = getScopeRoot(clickedTrigger);
    const triggers = Array.from(scopeRoot.querySelectorAll(TRIGGER_SELECTOR)).filter(isVisible);

    const items = [];
    let startIndex = 0;

    triggers.forEach((t) => {
      const videoItem = getVideoItemFromTrigger(t);
      if (videoItem) {
        if (t === clickedTrigger) startIndex = items.length;
        items.push(videoItem);
        return;
      }

      const imageItem = getImageItemFromTrigger(t);
      if (!imageItem) return;

      if (t === clickedTrigger) startIndex = items.length;
      items.push(imageItem);
    });

    return { items, startIndex };
  }

  function mountSlides(items) {
    const { mainW, thumbsW } = getModalRefs();
    if (!mainW || !thumbsW) return;

    mainW.innerHTML = "";
    thumbsW.innerHTML = "";

    items.forEach((it) => {
      const s = document.createElement("div");
      s.className = "swiper-slide";

      if (it.type === "youtube") {
        const src =
          `https://www.youtube-nocookie.com/embed/${encodeURIComponent(it.id)}` +
          `?autoplay=0&mute=0&controls=1&modestbranding=1&playsinline=1&rel=0`;

        s.innerHTML = `
          <div class="mglb__video">
            <iframe
              src="${src}"
              title="YouTube video"
              allow="encrypted-media; picture-in-picture"
              referrerpolicy="strict-origin-when-cross-origin"
              allowfullscreen></iframe>
          </div>
        `;
      } else {
        s.innerHTML = `<img src="${it.src}" alt="" style="max-width:100%;max-height:100%;object-fit:contain;display:block;">`;
      }

      mainW.appendChild(s);
    });

    items.forEach((it) => {
      const s = document.createElement("div");
      s.className = "swiper-slide";

      const thumbSrc = it.thumb || (it.type === "youtube"
        ? `https://i.ytimg.com/vi/${encodeURIComponent(it.id)}/hqdefault.jpg`
        : it.src);

      s.innerHTML = `
        <div style="position:relative;width:100%;height:100%;">
          <img src="${thumbSrc}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">
        </div>
      `;
      thumbsW.appendChild(s);
    });
  }

  function setActiveThumb(idx) {
    if (!state.thumbsSwiper) return;
    try {
      state.thumbsSwiper.slides.forEach((sl) => sl.classList.remove("swiper-slide-thumb-active"));
      const active = state.thumbsSwiper.slides[idx];
      if (active) active.classList.add("swiper-slide-thumb-active");
      state.thumbsSwiper.slideTo(idx, 0);
      state.thumbsSwiper.update();
    } catch (e) {}
  }

  function initSwipers(startIndex) {
    if (!window.Swiper) {
      console.warn("[MGLB] Swiper is not loaded.");
      return;
    }

    const { mainRoot, thumbsRoot, nextEl, prevEl } = getModalRefs();
    if (!mainRoot || !thumbsRoot) {
      console.warn("[MGLB] Missing modal roots.");
      return;
    }

    destroySwipers();

    state.thumbsSwiper = new Swiper(thumbsRoot, {
      slidesPerView: "auto",
      spaceBetween: 8,
      watchSlidesProgress: true,
      grabCursor: true,
      observer: true,
      observeParents: true
    });

    state.mainSwiper = new Swiper(mainRoot, {
      initialSlide: startIndex,
      navigation: (nextEl && prevEl) ? { nextEl, prevEl } : undefined,
      observer: true,
      observeParents: true
    });

    state.thumbsSwiper.on("click", () => {
      const idx = state.thumbsSwiper.clickedIndex;
      if (typeof idx !== "number" || idx < 0) return;
      state.mainSwiper?.slideTo?.(idx);
    });

    state.mainSwiper.on("slideChange", () => {
      const idx = state.mainSwiper.activeIndex;
      setActiveThumb(idx);
    });

    state.mainSwiper.slideTo(startIndex, 0);
    state.thumbsSwiper.slideTo(startIndex, 0);
    setActiveThumb(startIndex);

    setTimeout(() => {
      try { state.mainSwiper?.update?.(); } catch (e) {}
      try { state.thumbsSwiper?.update?.(); } catch (e) {}
      setActiveThumb(state.mainSwiper?.activeIndex ?? startIndex);
    }, 60);
  }

  /* =========================================================
     Boot / Destroy
  ========================================================= */
  async function MediaBoot(container) {
    state.container = container || getContainer();
    if (!isInMedia()) return;

    await bootFinsweetList();

    // Auto recover inline (filters + clear binding)
    if (typeof window.MediaAutoRecoverBoot === "function") {
      try { window.MediaAutoRecoverBoot(state.container); } catch (e) {}
    }

    if (!state.onDocClick) {
      state.onDocClick = (e) => {
        if (!isInMedia()) return;

        const modal = document.getElementById("mglb");
        if (modal && modal.classList.contains("is-open")) return;

        const trigger = e.target?.closest?.(TRIGGER_SELECTOR);
        if (!trigger) return;

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();

        const { items, startIndex } = buildScopedGallery(trigger);
        if (!items || !items.length) {
          console.warn("[MGLB] No items found. Add image or data-video/youtube id.");
          return;
        }

        openModal();
        mountSlides(items);
        setTimeout(() => initSwipers(startIndex), 50);
      };

      document.addEventListener("click", state.onDocClick, true);
    }

    console.log("[Media] boot ✅");
  }

  function MediaDestroy() {
    if (typeof window.MediaAutoRecoverDestroy === "function") {
      try { window.MediaAutoRecoverDestroy(); } catch (e) {}
    }

    try { closeModal(); } catch (e) {}
    try { destroySwipers(); } catch (e) {}

    if (state.onDocClick) {
      try { document.removeEventListener("click", state.onDocClick, true); } catch (e) {}
      state.onDocClick = null;
    }

    state.container = null;
    console.log("[Media] destroy ✅");
  }

  window.MediaBoot = MediaBoot;
  window.MediaDestroy = MediaDestroy;
})();


/* =========================================================
   SECTION D — REQUEST SCREENING MODULE (Barba-safe)
========================================================= */
(() => {
  if (window.__REQUEST_SCREENING_MODULE__) return;
  window.__REQUEST_SCREENING_MODULE__ = true;

  const NS = "request-screening";
  const state = {
    container: null,
    onSelectChange: null,
    selectEl: null
  };

  function getContainer() {
    return state.container || document.querySelector('[data-barba="container"]');
  }

  function isInRequestScreening() {
    const c = getContainer();
    const ns = (c?.getAttribute("data-barba-namespace") || "").trim();
    return ns === NS;
  }

  function reinitWebflowForms() {
    if (!window.Webflow) return;

    let req = null;
    try { req = window.Webflow.require ? window.Webflow.require.bind(window.Webflow) : null; }
    catch (e) { req = null; }

    // Webflow forms module (best effort)
    try {
      const forms = req ? req("forms") : null;
      forms?.ready?.();
      forms?.init?.();
    } catch (e) {}

    try { window.Webflow?.ready?.(); } catch (e) {}
  }

  function bindConditionalField(scope) {
    if (!scope) return;
    if (scope.__rsBound) return;
    scope.__rsBound = true;

    const select = scope.querySelector(".screening_form .js-show-trigger");
    const field  = scope.querySelector(".screening_form .js-conditional-field");
    if (!select || !field) return;

    // Hide by default
    field.style.display = "none";

    function toggleField() {
      field.style.display = (select.value === "Yes") ? "block" : "none";
    }

    state.selectEl = select;
    state.onSelectChange = toggleField;

    toggleField();
    select.addEventListener("change", toggleField);
  }

  function unbindConditionalField(scope) {
    try {
      if (state.selectEl && state.onSelectChange) {
        state.selectEl.removeEventListener("change", state.onSelectChange);
      }
    } catch (e) {}

    state.selectEl = null;
    state.onSelectChange = null;

    if (scope) scope.__rsBound = false;
  }

  function RequestScreeningBoot(container) {
    state.container = container || getContainer();
    if (!isInRequestScreening()) return;

    reinitWebflowForms();
    bindConditionalField(state.container || document);

    console.log("[RequestScreening] boot ✅");
  }

  function RequestScreeningDestroy() {
    try { unbindConditionalField(state.container || document); } catch (e) {}
    state.container = null;
    console.log("[RequestScreening] destroy ✅");
  }

  window.RequestScreeningBoot = RequestScreeningBoot;
  window.RequestScreeningDestroy = RequestScreeningDestroy;
})();


/* =========================================================
   SECTION E — CLEAN BARBA + WIPE + HUD + HOME PANELS (NO FORMS)
   - This is your SPA router + wipe + Webflow reinit.
========================================================= */
(() => {
  if (window.__CBW_BARBA_CORE__) return;
  window.__CBW_BARBA_CORE__ = true;

  /* -----------------------------
     Safety / reset
  ----------------------------- */
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  try { if (window.barba) window.barba.destroy(); } catch (e) {}

  /* -----------------------------
     Helpers
  ----------------------------- */
  function qs(sel, root = document) { return root.querySelector(sel); }
  function numberWithZero(num) { return num < 10 ? "0" + num : String(num); }

  function gsapTo(target, vars) {
    return new Promise(resolve => window.gsap.to(target, { ...vars, onComplete: resolve }));
  }

  function delay(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }

  function hardScrollTop() {
    try {
      document.documentElement.style.scrollBehavior = "auto";
      document.body.style.scrollBehavior = "auto";
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      window.scrollTo(0, 0);
    } catch (e) {}
  }

  function hardScrollTopAfterPaint() {
    requestAnimationFrame(() => {
      hardScrollTop();
      requestAnimationFrame(() => {
        hardScrollTop();
        setTimeout(hardScrollTop, 60);
      });
    });
  }

  function forceAnchor() {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;

    const jump = () => {
      try { target.scrollIntoView({ behavior: "auto", block: "start" }); } catch (e) {}
    };

    requestAnimationFrame(() => requestAnimationFrame(jump));
    window.addEventListener("load", jump, { once: true });
    setTimeout(jump, 350);
    setTimeout(jump, 900);
  }

  /* -----------------------------
     ScrollTrigger freeze/unfreeze
  ----------------------------- */
  function freezeScrollTriggers() {
    try { window.ScrollTrigger?.getAll?.().forEach(st => st.disable(false)); } catch (e) {}
  }

  function unfreezeScrollTriggers() {
    try { window.ScrollTrigger?.getAll?.().forEach(st => st.enable()); } catch (e) {}
  }

  /* -----------------------------
     Soft lock scroll (transition helper)
  ----------------------------- */
  let _scrollBlockOn = false;
  let _scrollBlockY = 0;
  let _onWheel = null, _onTouchMove = null, _onKeyDown = null;

  function lockScrollSoft() {
    if (_scrollBlockOn) return;
    _scrollBlockOn = true;

    _scrollBlockY = window.scrollY || 0;

    _onWheel = (e) => { e.preventDefault(); window.scrollTo(0, _scrollBlockY); };
    _onTouchMove = (e) => { e.preventDefault(); window.scrollTo(0, _scrollBlockY); };
    _onKeyDown = (e) => {
      const keys = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "];
      if (keys.includes(e.key)) {
        e.preventDefault();
        window.scrollTo(0, _scrollBlockY);
      }
    };

    window.addEventListener("wheel", _onWheel, { passive: false });
    window.addEventListener("touchmove", _onTouchMove, { passive: false });
    window.addEventListener("keydown", _onKeyDown, { passive: false });
  }

  function lockScrollHardNow() {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
  }

  function unlockScrollAll() {
    if (_scrollBlockOn) {
      _scrollBlockOn = false;
      window.removeEventListener("wheel", _onWheel, { passive: false });
      window.removeEventListener("touchmove", _onTouchMove, { passive: false });
      window.removeEventListener("keydown", _onKeyDown, { passive: false });
      _onWheel = _onTouchMove = _onKeyDown = null;
    }

    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    document.body.style.touchAction = "";
  }

  /* -----------------------------
     Swiper init (Barba-safe) — Home gallery comp
  ----------------------------- */
  function initGallerySwipers(scope = document) {
    if (!window.Swiper) {
      console.warn("[Swiper] Swiper not found.");
      return;
    }
    if (!window.jQuery && !window.$) {
      console.warn("[Swiper] jQuery not found.");
      return;
    }

    const $ = window.jQuery || window.$;

    function getInitialIndex($wrap) {
      const $slides = $wrap.find(".swiper.slider-text .swiper-slide");
      if (!$slides.length) return 0;

      const $flag = $wrap.find(".swiper.slider-text .js-swiper-start-flag").first();
      if (!$flag.length) return 0;

      const $slide = $flag.closest(".swiper-slide");
      const idx = $slides.index($slide);

      return idx >= 0 ? idx : 0;
    }

    $(scope).find(".slider-gallery-comp").each(function () {
      const $wrap = $(this);

      if ($wrap.data("swiper-inited") === 1) return;
      $wrap.data("swiper-inited", 1);

      const totalSlides = numberWithZero($wrap.find(".swiper-slide.slider-thumb").length);
      $wrap.find(".swiper-number-total").text(totalSlides);

      const START_INDEX = getInitialIndex($wrap);

      const bgSwiper = new window.Swiper($wrap.find(".swiper.slider-bg")[0], {
        slidesPerView: 1,
        speed: 700,
        effect: "fade",
        allowTouchMove: false,
        initialSlide: START_INDEX
      });

      const thumbsSwiper = new window.Swiper($wrap.find(".swiper.slider-thumb")[0], {
        slidesPerView: 1,
        speed: 700,
        effect: "coverflow",
        coverflowEffect: { rotate: 0, scale: 1, slideShadows: false },
        loop: true,
        loopedSlides: 8,
        slideToClickedSlide: true,
        initialSlide: START_INDEX
      });

      const isDesktop = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

      const textSwiper = new window.Swiper($wrap.find(".swiper.slider-text")[0], {
        slidesPerView: "auto",
        speed: 1000,
        loop: true,
        loopedSlides: 8,
        slideToClickedSlide: true,
        allowTouchMove: !isDesktop,
        simulateTouch: !isDesktop,
        mousewheel: true,
        keyboard: true,
        centeredSlides: true,
        slideActiveClass: "is-active",
        slideDuplicateActiveClass: "is-active",
        thumbs: { swiper: bgSwiper },
        navigation: {
          nextEl: $wrap.find(".swiper-next")[0],
          prevEl: $wrap.find(".swiper-prev")[0]
        },
        initialSlide: START_INDEX
      });

      textSwiper.controller.control = thumbsSwiper;
      thumbsSwiper.controller.control = textSwiper;

      try {
        textSwiper.slideToLoop(START_INDEX, 0, false);
        thumbsSwiper.slideToLoop(START_INDEX, 0, false);
        bgSwiper.slideTo(START_INDEX, 0, false);
      } catch (e) {}

      $wrap.find(".swiper-number-current").text(numberWithZero(START_INDEX + 1));
      textSwiper.on("slideChange", function (e) {
        $wrap.find(".swiper-number-current").text(numberWithZero(e.realIndex + 1));
      });

      $wrap.data("swiper-bg", bgSwiper);
      $wrap.data("swiper-thumbs", thumbsSwiper);
      $wrap.data("swiper-text", textSwiper);
    });
  }

  /* -----------------------------
     Wipe + HUD
  ----------------------------- */
  const wipe = document.querySelector(".page-wipe");
  if (!wipe) {
    console.error("[Barba/Wipe] .page-wipe not found (must be outside Barba container).");
    return;
  }

  const cityEl = document.querySelector(".wipe-city");
  const countryEl = document.querySelector(".wipe-country");
  const coordsEl = document.querySelector(".wipe-coords");

  const MOVE_DURATION = 1.05;
  const HOLD_DURATION = 0.25;

  window.gsap.set(wipe, { y: "100%", autoAlpha: 1, display: "block" });

  const HUD_FIXED_TEXT = "CODED BIAS WORLD TOUR";
  function setHudFixed() {
    if (cityEl) cityEl.textContent = HUD_FIXED_TEXT;
    if (countryEl) { countryEl.textContent = ""; countryEl.style.display = "none"; }
    if (coordsEl) { coordsEl.textContent = ""; coordsEl.style.display = "none"; }
  }

  /* -----------------------------
     Webflow reinit (NO FORMS)
     - Only IX2 + Lightbox
  ----------------------------- */
  function syncWebflowPageIdFromBarba(data) {
    try {
      const nextHtml = data?.next?.html;
      if (!nextHtml) return;
      const doc = new DOMParser().parseFromString(nextHtml, "text/html");
      const nextPageId = doc.documentElement.getAttribute("data-wf-page");
      if (nextPageId) document.documentElement.setAttribute("data-wf-page", nextPageId);
    } catch (e) {}
  }

  function reinitWebflowCore() {
    if (!window.Webflow) return;

    let req = null;
    try { req = window.Webflow.require ? window.Webflow.require.bind(window.Webflow) : null; }
    catch (e) { req = null; }

    try {
      const ix2 = req ? req("ix2") : null;
      ix2?.destroy?.();
      ix2?.init?.();
    } catch (e) {}

    try {
      const lb = req ? req("lightbox") : null;
      lb?.ready?.();
    } catch (e) {}
  }

  /* -----------------------------
     Nav: keep Home link clickable
  ----------------------------- */
  function syncHomeNavState() {
    const homeLink = document.querySelector(".nav-home-link");
    if (!homeLink) return;

    homeLink.classList.remove("is-disabled");
    homeLink.setAttribute("aria-disabled", "false");
    homeLink.style.pointerEvents = "";
    homeLink.removeAttribute("disabled");
  }

  /* -----------------------------
     Home panels (INTRO -> SLIDER)
  ----------------------------- */
  function cleanupHomePanels() {
    document.body.classList.remove("no-scroll");
    document.documentElement.classList.remove("is-home-slider");

    if (window.__homePanelsTL) window.__homePanelsTL = null;
    if (window.homePanelsGoToIntro) window.homePanelsGoToIntro = null;
  }

  function setupHomePanels(container = document) {
    const shell = qs(".page-shell", container);
    if (!shell) return;

    const intro = qs(".panel-panel--intro", container);
    const slider = qs(".panel-panel--slider", container);
    const btn = qs('[data-intro="continue"]', container);
    if (!intro || !slider || !btn) return;

    if (btn.dataset.homeBound === "1") return;
    btn.dataset.homeBound = "1";

    if (btn.tagName === "BUTTON") btn.setAttribute("type", "button");

    document.documentElement.classList.remove("is-home-slider");
    document.body.classList.add("no-scroll");

    const RADIUS = 32;
    const INTRO_ZOOM = 0.68;
    const SLIDER_START = 0.80;

    window.gsap.set(intro, { display: "block", x: 0, scale: 1, borderRadius: 0, willChange: "transform" });
    window.gsap.set(slider, { display: "block", x: "-110vw", scale: SLIDER_START, borderRadius: RADIUS, willChange: "transform" });

    let isAnimating = false;

    const tl = window.gsap.timeline({ paused: true, defaults: { ease: "power3.inOut" } });

    tl
      .to(intro, { duration: 1.15, scale: INTRO_ZOOM, borderRadius: RADIUS, ease: "power2.inOut" })
      .to(intro, { duration: 1.10, x: "120vw" })
      .to(slider, { duration: 1.20, x: "0vw" }, "<")
      .to(slider, { duration: 1.05, scale: 1, borderRadius: 0, ease: "power3.out" }, "-=0.15")
      .set(intro, { display: "none" })
      .add(() => {
        document.body.classList.remove("no-scroll");
        document.documentElement.classList.add("is-home-slider");

        try {
          const $ = window.jQuery || window.$;
          if ($) {
            const $wrap = $(container).find(".slider-gallery-comp").first();
            const textSwiper = $wrap.data("swiper-text");
            textSwiper?.update?.();
          }
        } catch (e) {}
      });

    window.__homePanelsTL = tl;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isAnimating) return;

      isAnimating = true;
      document.documentElement.classList.add("is-home-slider");

      tl.eventCallback("onComplete", () => { isAnimating = false; });
      tl.play(0);
    }, true);

    window.homePanelsGoToIntro = function () {
      if (!window.__homePanelsTL) return;
      if (isAnimating) return;

      isAnimating = true;
      window.gsap.set(intro, { display: "block" });
      document.body.classList.add("no-scroll");

      window.__homePanelsTL.eventCallback("onReverseComplete", () => {
        isAnimating = false;

        document.documentElement.classList.remove("is-home-slider");
        document.body.classList.add("no-scroll");

        window.gsap.set(slider, { x: "-110vw", scale: SLIDER_START, borderRadius: RADIUS });
        window.gsap.set(intro, { x: 0, scale: 1, borderRadius: 0 });
      });

      window.__homePanelsTL.reverse();
    };
  }

  /* -----------------------------
     BARBA
  ----------------------------- */
  if (!window.barba) {
    console.warn("[Barba] Barba not found. SPA disabled.");
    return;
  }

  window.barba.init({
    preventRunning: true,

    // Prevent Barba from hijacking Finsweet list clicks (filters)
    prevent: ({ el }) => {
      if (!el) return false;
      if (el.closest('[fs-list-element], [fs-list-field], [fs-list-value]')) return true;
      return false;
    },

    transitions: [{
      name: "wipe-stable-nojump",

      async leave(data) {
        const current = data.current.container;

        setHudFixed();
        window.gsap.killTweensOf(wipe);

        freezeScrollTriggers();
        lockScrollSoft();

        current.style.visibility = "visible";
        current.style.opacity = "1";

        await gsapTo(wipe, {
          y: "0%",
          duration: MOVE_DURATION,
          ease: "power4.inOut",
          overwrite: true
        });

        lockScrollHardNow();
        await delay(HOLD_DURATION);

        current.style.visibility = "hidden";
      },

      beforeEnter(data) {
        window.gsap.killTweensOf(wipe);
        window.gsap.set(wipe, { y: "0%", autoAlpha: 1, display: "block" });

        data.next.container.style.visibility = "visible";
        data.next.container.style.opacity = "0";
      },

      async enter(data) {
        data.next.container.style.opacity = "1";
      },

      async after(data) {
        try {
          if (!location.hash) hardScrollTop();

          syncWebflowPageIdFromBarba(data);
          reinitWebflowCore();
          syncHomeNavState();

          cleanupHomePanels();
          setupHomePanels(data?.next?.container || document);

          initGallerySwipers(data?.next?.container || document);

          unfreezeScrollTriggers();
          try { window.ScrollTrigger?.refresh?.(); } catch (e) {}

        } catch (err) {
          console.error("[Barba] after() crashed:", err);

        } finally {
          try {
            window.gsap.killTweensOf(wipe);
            await gsapTo(wipe, {
              y: "-100%",
              duration: MOVE_DURATION,
              ease: "power4.inOut",
              overwrite: true
            });
            window.gsap.set(wipe, { y: "100%" });
          } catch (e) {
            console.error("[Barba] Reveal failed:", e);
            try { window.gsap.set(wipe, { y: "100%" }); } catch (_) {}
          }

          try { unlockScrollAll(); } catch (e) {}
          try { if (location.hash) forceAnchor(); } catch (e) {}
        }
      }
    }]
  });

  /* -----------------------------
     BARBA hooks (namespace modules)
     - media
     - request-screening
  ----------------------------- */
  if (window.barba?.hooks) {

    window.barba.hooks.beforeLeave((data) => {
      const ns = data?.current?.namespace;

      if (ns === "media" && typeof window.MediaDestroy === "function") {
        window.MediaDestroy();
      }

      if (ns === "request-screening" && typeof window.RequestScreeningDestroy === "function") {
        window.RequestScreeningDestroy();
      }
    });

    window.barba.hooks.afterEnter((data) => {
      const ns = data?.next?.namespace;

      if (ns === "media" && typeof window.MediaBoot === "function") {
        setTimeout(() => {
          requestAnimationFrame(() => window.MediaBoot(data.next.container));
        }, 0);
      }

      if (ns === "request-screening" && typeof window.RequestScreeningBoot === "function") {
        setTimeout(() => {
          requestAnimationFrame(() => window.RequestScreeningBoot(data.next.container));
        }, 0);
      }
    });
  }

  /* -----------------------------
     First load
  ----------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    setHudFixed();

    if (!location.hash) hardScrollTopAfterPaint();
    else forceAnchor();

    reinitWebflowCore();
    cleanupHomePanels();
    setupHomePanels(document);
    initGallerySwipers(document);
    syncHomeNavState();

    // If landing directly on a namespace page
    const container = document.querySelector('[data-barba="container"]');
    const ns = container?.getAttribute("data-barba-namespace");

    if (ns === "media" && typeof window.MediaBoot === "function") {
      setTimeout(() => requestAnimationFrame(() => window.MediaBoot(container)), 0);
    }

    if (ns === "request-screening" && typeof window.RequestScreeningBoot === "function") {
      setTimeout(() => requestAnimationFrame(() => window.RequestScreeningBoot(container)), 0);
    }

    console.log("[Barba/Wipe] init ✅ (+namespace hooks)");
  });

  /* -----------------------------
     BFCache
  ----------------------------- */
  window.addEventListener("pageshow", (evt) => {
    if (!evt.persisted) return;

    unlockScrollAll();
    unfreezeScrollTriggers();

    if (!location.hash) hardScrollTopAfterPaint();
    else forceAnchor();

    try { window.gsap.set(wipe, { y: "100%", autoAlpha: 1, display: "block" }); } catch (e) {}
    try { setHudFixed(); } catch (e) {}

    reinitWebflowCore();
    cleanupHomePanels();
    setupHomePanels(document);
    syncHomeNavState();

    const container = document.querySelector('[data-barba="container"]');
    const ns = container?.getAttribute("data-barba-namespace");

    if (ns === "media" && typeof window.MediaBoot === "function") {
      setTimeout(() => requestAnimationFrame(() => window.MediaBoot(container)), 0);
    }

    if (ns === "request-screening" && typeof window.RequestScreeningBoot === "function") {
      setTimeout(() => requestAnimationFrame(() => window.RequestScreeningBoot(container)), 0);
    }
  });

  window.__initGallerySwipers = initGallerySwipers;
})();
