const overlay = document.querySelector('.loading-overlay');
const progressBar = overlay.querySelector('.loading-overlay__progress');
const labelNode = overlay.querySelector('.loading-overlay__label');
const defaultLabel = labelNode ? labelNode.textContent : '';

function resetBar() {
  progressBar.style.transition = 'none';
  progressBar.style.width = '0%';
  // Force reflow so the next transition will run
  void progressBar.offsetWidth;
}

function hideOverlay() {
  overlay.classList.remove('loading-overlay--visible');
  overlay.setAttribute('aria-hidden', 'true');
  if (labelNode) {
    labelNode.textContent = defaultLabel;
  }
  resetBar();
}

export function showLoadingBar(options = {}) {
  const config = typeof options === 'number' ? { duration: options } : options;
  const durationMs = Math.max(0, config.duration ?? 260);
  const label = config.label ?? defaultLabel;

  resetBar();
  overlay.classList.add('loading-overlay--visible');
  overlay.setAttribute('aria-hidden', 'false');

  if (labelNode) {
    labelNode.textContent = label;
  }

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
