/* =========================================================
   CBW STABLE BUNDLE (Repo)
   - Put "rarely touched" logic here.
   - Barba-safe (hooks only if Barba exists).
   - Webflow-safe (works with Webflow re-init).
   - Do NOT include Barba init / Wipe / Swiper here.
========================================================= */

(() => {
  // Prevent double-loading if Webflow injects scripts multiple times
  if (window.__CBW_STABLE_LOADED__ === true) return;
  window.__CBW_STABLE_LOADED__ = true;

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
        gsap.to(el, { opacity: to, duration: ms / 1000, overwrite: true, ease: "power2.out" });
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

    if (window.barba) {
      // After full transition cycle, Webflow may re-init lottie
      barba.hooks.after(() => setTimeout(syncLottie, 350));
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

    gsap.registerPlugin(ScrollTrigger);

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
      return gsap.timeline({
        scrollTrigger: {
          trigger: triggerEl,
          start: start || ST_DEFAULTS.start,
          end: end || ST_DEFAULTS.end,
          scrub: true,
          invalidateOnRefresh: true
        }
      });
    }

    function initHeroParallax(container = document) {
      const hero = container.querySelector(".hero-main");
      if (!hero) return;

      const bg = hero.querySelector(".hero-bg");
      const card = hero.querySelector(".u-hero-card-wrap");
      if (!bg || !card) return;

      gsap.set([bg, card], { yPercent: 0 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: true,
          invalidateOnRefresh: true
        }
      });

      tl.to(bg,   { yPercent: -15, ease: "none" }, 0);
      tl.to(card, { yPercent: -40, ease: "none" }, 0);

      timelines.push(tl);
    }

    function initAboutIntro(container = document) {
      const targets = container.querySelectorAll('[data-gsap="about-intro"]');
      if (!targets.length) return;

      targets.forEach(el => {
        if (el.dataset.aboutIntroInited === "1") return;
        el.dataset.aboutIntroInited = "1";

        const words = splitIntoWords(el, "aboutIntroSplitReady");
        if (!words.length) return;

        gsap.set(words, { opacity: 0.2 });

        const tl = gsap.timeline({
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
            gsap.set(words, { opacity: 0 });
            tl.to(words, { opacity: 1, ease: "none", stagger: 0.05 }, 0);
          }
        }

        if (display) {
          const words = splitIntoWords(display, "titleDisplaySplitReady");
          if (words.length) {
            gsap.set(words, { opacity: 0 });
            tl.to(words, { opacity: 1, ease: "none", stagger: 0.05 }, 0.05);
          }
        }

        if (dotted) {
          gsap.set(dotted, { opacity: 0 });
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

        gsap.set(cols, { opacity: 0 });

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

        gsap.set(lines, { opacity: 0 });

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

        gsap.set(el, { opacity: 0 });

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
      safeTry(() => ScrollTrigger.refresh());
      console.log("[GSAPEngine] init (DOMContentLoaded) ✅");
    });

    if (window.barba) {
      // Do not kill beforeLeave (prevents visible snapping). Kill afterLeave.
      barba.hooks.afterLeave(() => killAll());

      barba.hooks.afterEnter(({ next }) => {
        const container = next?.container || document;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            initAll(container);
            safeTry(() => ScrollTrigger.refresh());
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
    gsap.registerPlugin(ScrollTrigger);

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
        gsap.killTweensOf(layout);

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
          gsap.set(layout, { y: PAD });
          return;
        }

        gsap.set(layout, { y: startY });

        const st = ScrollTrigger.create({
          trigger: wrap,
          start: "top 90%",
          end: "bottom 10%",
          scrub: true,
          invalidateOnRefresh: true,

          onRefresh: () => {
            const vals = computeStartEndY();
            gsap.set(layout, { y: vals.startY });
          },

          onUpdate: (self) => {
            const vals = computeStartEndY();
            const y = vals.startY + (vals.endY - vals.startY) * self.progress;
            gsap.set(layout, { y });
          }
        });

        wrap._creditsST = st;
      });

      requestAnimationFrame(() => safeTry(() => ScrollTrigger.refresh()));
    }

    onReady(() => {
      init(document);
      console.log("[AboutCredits] init (DOMContentLoaded) ✅");
    });

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => safeTry(() => ScrollTrigger.refresh()));
    }

    if (window.barba) {
      barba.hooks.afterEnter(({ next }) => {
        init(next?.container || document);
        console.log("[AboutCredits] init (afterEnter) ✅");
      });

      barba.hooks.after(() => safeTry(() => ScrollTrigger.refresh()));
    }
  }

  /* =========================================================
     5) FILM GRAIN OVERLAY (Barba-safe, no deps)
  ========================================================= */
  function initFilmGrain() {
    const overlay = document.querySelector(".grain-overlay");
    if (!overlay) {
      console.warn("[Grain] .grain-overlay not found");
      return;
    }

    // Settings
    const FPS = 18;            // 12–24 looks good
    const SIZE = 220;          // canvas tile size
    const CONTRAST = 38;       // 10–40
    const ALPHA = 110;         // 0–255
    const USE_COLORED = false; // true = RGB grain, false = grayscale

    let rafId = null;
    let last = 0;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    canvas.width = SIZE;
    canvas.height = SIZE;

    function drawNoise() {
      const img = ctx.createImageData(SIZE, SIZE);
      const d = img.data;

      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() * 255) | 0;

        if (USE_COLORED) {
          d[i]     = v;
          d[i + 1] = (Math.random() * 255) | 0;
          d[i + 2] = (Math.random() * 255) | 0;
        } else {
          d[i] = d[i + 1] = d[i + 2] = v;
        }

        const a = Math.max(0, Math.min(255, ALPHA + ((v - 128) * CONTRAST) / 128));
        d[i + 3] = a;
      }

      ctx.putImageData(img, 0, 0);
      overlay.style.backgroundImage = `url(${canvas.toDataURL("image/png")})`;
      overlay.style.backgroundRepeat = "repeat";
    }

    function loop(t) {
      if (t - last >= 1000 / FPS) {
        last = t;
        drawNoise();
      }
      rafId = requestAnimationFrame(loop);
    }

    function start() {
      if (rafId) return;
      rafId = requestAnimationFrame(loop);
    }

    function stop() {
      if (!rafId) return;
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    start();

    if (window.barba) {
      barba.hooks.afterEnter(() => start());
    }

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else start();
    });

    console.log("[Grain] init ✅");
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

    if (window.barba) {
      barba.hooks.afterEnter(({ next }) => {
        disableCurrentNavLinks(next?.container || document);
        // Also run on full document in case nav lives outside container
        disableCurrentNavLinks(document);
      });
    }
  }

  /* =========================================================
     BOOT
  ========================================================= */
  onReady(() => {
    initTourDropdown(document);
    markCurrentTourStop(document);

    initPersistentAudio();
    initGsapEngine();
    initAboutCreditsCrawl();
    initFilmGrain();
    initDisableCurrentFooterLinks();

    // Close dropdown on navigation start (if Barba exists)
    if (window.barba) {
      barba.hooks.beforeLeave(() => closeAllTourDropdowns());
      barba.hooks.afterEnter(({ next }) => {
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
