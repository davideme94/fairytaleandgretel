const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const restartBtn = document.getElementById("restartBtn");
const toggleSoundBtn = document.getElementById("toggleSoundBtn");
const pageIndicator = document.getElementById("pageIndicator");
const pageElements = document.querySelectorAll("#flipbook .page");
const flipSound = document.getElementById("flipSound");

let pageFlip = null;
let soundEnabled = true;

function buildFlipbook() {
  const root = document.getElementById("flipbook");

  if (pageFlip) {
    pageFlip.destroy();
    root.innerHTML = "";
    pageElements.forEach((page) => root.appendChild(page));
  }

  pageFlip = new St.PageFlip(root, {
    width: 720,
    height: 960,
    size: "stretch",
    minWidth: 280,
    maxWidth: 760,
    minHeight: 380,
    maxHeight: 980,
    drawShadow: true,
    flippingTime: 900,
    usePortrait: true,
    startPage: 0,
    autoSize: true,
    mobileScrollSupport: false,
    swipeDistance: 30,
    clickEventForward: true,
    showCover: true,
    maxShadowOpacity: 0.35
  });

  pageFlip.loadFromHTML(pageElements);

  pageFlip.on("flip", updateUi);
  pageFlip.on("changeOrientation", updateUi);
  pageFlip.on("init", updateUi);

  updateUi();
}

function safePlayFlipSound() {
  if (!soundEnabled || !flipSound) return;

  try {
    flipSound.currentTime = 0;
    flipSound.play().catch(() => {});
  } catch (error) {
    console.warn("Flip sound could not play.", error);
  }
}

function getCurrentLabel() {
  if (!pageFlip) return "Loading…";

  const current = pageFlip.getCurrentPageIndex() + 1;
  const total = pageFlip.getPageCount();
  const orientation = pageFlip.getOrientation();

  if (orientation === "portrait") {
    return `${current} / ${total} · Single page`;
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
  safePlayFlipSound();
}

function goPrev() {
  if (!pageFlip) return;
  pageFlip.flipPrev();
  safePlayFlipSound();
}

function restartBook() {
  if (!pageFlip) return;
  pageFlip.flip(0);
  safePlayFlipSound();
}

prevBtn.addEventListener("click", goPrev);
nextBtn.addEventListener("click", goNext);
restartBtn.addEventListener("click", restartBook);

toggleSoundBtn.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  toggleSoundBtn.textContent = soundEnabled ? "Sound: On" : "Sound: Off";
  toggleSoundBtn.setAttribute("aria-pressed", String(soundEnabled));
});

document.addEventListener("keydown", (event) => {
  if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;

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

let resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    buildFlipbook();
  }, 180);
});

buildFlipbook();
