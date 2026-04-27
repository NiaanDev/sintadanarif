const weddingConfig = {
  date: "2026-12-12T09:00:00+07:00",
  defaultGuest: "Bapak/Ibu/Saudara/i",
};

const state = {
  audioContext: null,
  musicTimer: null,
  musicPlaying: false,
  toastTimer: null,
};

const qs = (selector, parent = document) => parent.querySelector(selector);
const qsa = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

function normalizeGuestName(value) {
  if (!value) return weddingConfig.defaultGuest;
  return value.replace(/\+/g, " ").trim().slice(0, 80) || weddingConfig.defaultGuest;
}

function setGuestName() {
  const params = new URLSearchParams(window.location.search);
  const guest = normalizeGuestName(params.get("to") || params.get("untuk"));
  const target = qs("#guestName");
  if (target) target.textContent = guest;
}

function hideLoadingScreen() {
  window.setTimeout(() => {
    qs("#loadingScreen")?.classList.add("is-hidden");
  }, 450);
}

function openInvitation() {
  qs("#cover")?.classList.add("is-opened");
  qs("#siteShell")?.classList.add("is-visible");
  qs("#siteShell")?.removeAttribute("aria-hidden");
  document.body.classList.remove("is-locked");
  startMusic();
  window.setTimeout(() => qs("#home")?.scrollIntoView({ behavior: "smooth" }), 180);
}

function updateCountdown() {
  const now = Date.now();
  const target = new Date(weddingConfig.date).getTime();
  const distance = Math.max(target - now, 0);
  const days = Math.floor(distance / 86400000);
  const hours = Math.floor((distance % 86400000) / 3600000);
  const minutes = Math.floor((distance % 3600000) / 60000);
  const seconds = Math.floor((distance % 60000) / 1000);
  const values = {
    countDays: days,
    countHours: hours,
    countMinutes: minutes,
    countSeconds: seconds,
  };

  Object.entries(values).forEach(([id, value]) => {
    const node = qs(`#${id}`);
    if (node) node.textContent = String(value).padStart(2, "0");
  });
}

function setupRevealAnimation() {
  const items = qsa(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const delay = Number(entry.target.dataset.revealDelay || 0);
        window.setTimeout(() => entry.target.classList.add("is-visible"), delay);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.18 }
  );

  items.forEach((item) => observer.observe(item));
}

function setupNavigation() {
  const toggle = qs("#navToggle");
  const links = qs("#navLinks");
  if (!toggle || !links) return;

  toggle.addEventListener("click", () => {
    const isOpen = links.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  qsa('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = qs(link.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      links.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function playTone(frequency, startTime, duration) {
  const context = state.audioContext;
  if (!context) return;

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.055, startTime + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.05);
}

function scheduleMusicPhrase() {
  if (!state.musicPlaying || !state.audioContext) return;
  const notes = [392, 440, 523.25, 493.88, 440, 392, 329.63, 349.23];
  const now = state.audioContext.currentTime;
  notes.forEach((note, index) => playTone(note, now + index * 0.72, 0.62));
  state.musicTimer = window.setTimeout(scheduleMusicPhrase, notes.length * 720);
}

function startMusic() {
  if (state.musicPlaying) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  state.audioContext = state.audioContext || new AudioContext();
  state.audioContext.resume();
  state.musicPlaying = true;
  qs("#musicToggle")?.classList.add("is-active");
  qs("#musicToggle")?.setAttribute("aria-pressed", "true");
  scheduleMusicPhrase();
}

function stopMusic() {
  state.musicPlaying = false;
  window.clearTimeout(state.musicTimer);
  qs("#musicToggle")?.classList.remove("is-active");
  qs("#musicToggle")?.setAttribute("aria-pressed", "false");
}

function setupMusicToggle() {
  qs("#musicToggle")?.addEventListener("click", () => {
    if (state.musicPlaying) {
      stopMusic();
      return;
    }
    startMusic();
  });
}

function showToast(message) {
  const toast = qs("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  document.execCommand("copy");
  field.remove();
}

function setupCopyButtons() {
  qsa("[data-copy-target]").forEach((button) => {
    button.addEventListener("click", async () => {
      const target = qs(`#${button.dataset.copyTarget}`);
      if (!target) return;
      try {
        await copyText(target.textContent.trim());
        showToast("Nomor rekening disalin");
      } catch (error) {
        showToast("Nomor belum dapat disalin");
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("is-locked");
  setGuestName();
  hideLoadingScreen();
  updateCountdown();
  window.setInterval(updateCountdown, 1000);
  setupRevealAnimation();
  setupNavigation();
  setupMusicToggle();
  setupCopyButtons();
  qs("#openInvitation")?.addEventListener("click", openInvitation);
});
