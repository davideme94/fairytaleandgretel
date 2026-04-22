const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const restartBtn = document.getElementById("restartBtn");
const toggleSoundBtn = document.getElementById("toggleSoundBtn");
const pageIndicator = document.getElementById("pageIndicator");
const root = document.getElementById("flipbook");

const initialMarkup = root.innerHTML;
const mobileQuery = window.matchMedia("(max-width: 768px)");

let pageFlip = null;
let soundEnabled = true;
let lastLayoutMode = getLayoutMode();
let rebuildTimeout = null;
let audioContext = null;

function getLayoutMode() {
  return mobileQuery.matches ? "mobile" : "desktop";
}

function ensureAudioContext() {
  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    audioContext = new AudioCtx();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }

  return audioContext;
}

function playFlipSound() {
  if (!soundEnabled) return;

  const ctx = ensureAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(900, now);
    oscillator.frequency.exponentialRampToValueAtTime(220, now + 0.09);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.035, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.11);
  } catch (error) {
    console.warn("Could not play flip sound.", error);
  }
}

function getPages() {
  return Array.from(root.querySelectorAll(".page"));
}

function buildFlipbook(startPage = 0) {
  if (pageFlip) {
    pageFlip.destroy();
  }

  root.innerHTML = initialMarkup;
  const pages = getPages();

  pageFlip = new St.PageFlip(root, {
    width: 720,
    height: 960,
    size: "stretch",
    minWidth: 280,
    maxWidth: 760,
    minHeight: 420,
    maxHeight: 980,
    drawShadow: true,
    flippingTime: 900,
    usePortrait: true,
    startPage: Math.max(0, Math.min(startPage, pages.length - 1)),
    autoSize: true,
    mobileScrollSupport: true,
    swipeDistance: 24,
    clickEventForward: true,
    showCover: true,
    maxShadowOpacity: 0.35
  });

  pageFlip.loadFromHTML(pages);

  pageFlip.on("flip", () => {
    updateUi();
    playFlipSound();
  });

  pageFlip.on("changeOrientation", updateUi);
  pageFlip.on("init", updateUi);

  updateUi();
}

function getCurrentLabel() {
  if (!pageFlip) return "Loading…";

  const current = pageFlip.getCurrentPageIndex() + 1;
  const total = pageFlip.getPageCount();
  const orientation = pageFlip.getOrientation();

  if (orientation === "portrait") {
    return `${current} / ${total} · Single page`;
  }

  if (current === 1) {
    return `1 / ${total} · Front cover`;
  }

  if (current >= total) {
    return `${total} / ${total} · Back cover`;
  }

  const rightPage = Math.min(current + 1, total);
  return `${current}–${rightPage} / ${total} · Spread`;
}

function updateButtons() {
  if (!pageFlip) return;

  prevBtn.disabled = pageFlip.getCurrentPageIndex() <= 0;
  nextBtn.disabled = pageFlip.getCurrentPageIndex() >= pageFlip.getPageCount() - 1;
}

function updateUi() {
  pageIndicator.textContent = getCurrentLabel();
  updateButtons();
}

function goNext() {
  if (!pageFlip) return;
  pageFlip.flipNext();
}

function goPrev() {
  if (!pageFlip) return;
  pageFlip.flipPrev();
}

function restartBook() {
  if (!pageFlip) return;
  pageFlip.flip(0);
  playFlipSound();
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  toggleSoundBtn.textContent = soundEnabled ? "Sound: On" : "Sound: Off";
  toggleSoundBtn.setAttribute("aria-pressed", String(soundEnabled));
}

function scheduleConditionalRebuild(force = false) {
  clearTimeout(rebuildTimeout);

  rebuildTimeout = setTimeout(() => {
    const nextLayoutMode = getLayoutMode();

    if (!pageFlip) {
      lastLayoutMode = nextLayoutMode;
      buildFlipbook(0);
      return;
    }

    if (force || nextLayoutMode !== lastLayoutMode) {
      const currentPage = pageFlip.getCurrentPageIndex();
      lastLayoutMode = nextLayoutMode;
      buildFlipbook(currentPage);
    } else {
      updateUi();
    }
  }, 160);
}

prevBtn.addEventListener("click", goPrev);
nextBtn.addEventListener("click", goNext);
restartBtn.addEventListener("click", restartBook);
toggleSoundBtn.addEventListener("click", toggleSound);

document.addEventListener("keydown", (event) => {
  const activeTag = document.activeElement?.tagName;
  if (activeTag === "INPUT" || activeTag === "TEXTAREA") return;

  if (event.key === "ArrowRight") {
    goNext();
  }

  if (event.key === "ArrowLeft") {
    goPrev();
  }

  if (event.key.toLowerCase() === "r") {
    restartBook();
  }
});

if (typeof mobileQuery.addEventListener === "function") {
  mobileQuery.addEventListener("change", () => scheduleConditionalRebuild(true));
} else if (typeof mobileQuery.addListener === "function") {
  mobileQuery.addListener(() => scheduleConditionalRebuild(true));
}

window.addEventListener("orientationchange", () => {
  setTimeout(() => {
    scheduleConditionalRebuild(true);
  }, 250);
});

window.addEventListener(
  "resize",
  () => {
    updateUi();
  },
  { passive: true }
);

if (window.visualViewport) {
  window.visualViewport.addEventListener(
    "resize",
    () => {
      updateUi();
    },
    { passive: true }
  );
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    updateUi();
  }
});

buildFlipbook();