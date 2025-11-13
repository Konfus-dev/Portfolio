const popup = document.querySelector('.signal-popup');
const closeTargets = popup.querySelectorAll('[data-popup-close]');
const channelField = popup.querySelector('.signal-popup__channel');
const titleField = popup.querySelector('.signal-popup__title');
const taglineField = popup.querySelector('.signal-popup__tagline');
const summaryField = popup.querySelector('.signal-popup__summary');
const stackList = popup.querySelector('.signal-popup__stack-list');
const logEntries = popup.querySelector('.signal-popup__log-entries');

let lastFocus = null;

function clearContent() {
  stackList.innerHTML = '';
  logEntries.textContent = '';
}

export function openSignalPopup(signal) {
  if (!signal) return;
  clearContent();
  lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  channelField.textContent = signal.id;
  titleField.textContent = signal.name;
  taglineField.textContent = signal.tagline;
  summaryField.textContent = signal.summary;

  signal.stack.forEach((tech) => {
    const li = document.createElement('li');
    li.textContent = tech;
    stackList.appendChild(li);
  });

  logEntries.textContent = signal.log.map((line) => `> ${line}`).join('\n');

  popup.classList.add('signal-popup--visible');
  popup.setAttribute('aria-hidden', 'false');
  const closeButton = popup.querySelector('.signal-popup__close');
  closeButton?.focus({ preventScroll: true });
}

export function closeSignalPopup() {
  popup.classList.remove('signal-popup--visible');
  popup.setAttribute('aria-hidden', 'true');
  clearContent();
  if (lastFocus) {
    lastFocus.focus({ preventScroll: true });
    lastFocus = null;
  }
}

export function isPopupOpen() {
  return popup.classList.contains('signal-popup--visible');
}

closeTargets.forEach((node) => {
  node.addEventListener('click', () => {
    closeSignalPopup();
  });
});

popup.addEventListener('click', (event) => {
  if (event.target === popup) {
    closeSignalPopup();
  }
});
