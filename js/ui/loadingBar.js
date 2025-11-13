const overlay = document.querySelector('.loading-overlay');
const progressBar = overlay.querySelector('.loading-overlay__progress');

function resetBar() {
  progressBar.style.transition = 'none';
  progressBar.style.width = '0%';
  // Force reflow so the next transition will run
  void progressBar.offsetWidth;
}

function hideOverlay() {
  overlay.classList.remove('loading-overlay--visible');
  overlay.setAttribute('aria-hidden', 'true');
  resetBar();
}

export function showLoadingBar(durationMs) {
  resetBar();
  overlay.classList.add('loading-overlay--visible');
  overlay.setAttribute('aria-hidden', 'false');

  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      progressBar.style.transition = `width ${durationMs}ms linear`;
      progressBar.style.width = '100%';
    });

    setTimeout(() => {
      hideOverlay();
      resolve();
    }, durationMs);
  });
}

export function abortLoadingBar() {
  hideOverlay();
}
