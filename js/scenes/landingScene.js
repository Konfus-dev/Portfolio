const landingScene = document.querySelector('[data-scene="landing"]');
const logContainer = landingScene.querySelector('.landing__log');
const form = landingScene.querySelector('.landing-form');
const input = form.querySelector('input');
const errorField = form.querySelector('.landing-form__error');

const logLines = [
  { text: ':: JH-OS v4.2 // INTERSTELLAR OPS ::', className: 'landing__log-line--heading' },
  { text: 'Diagnostics ................. OK' },
  { text: 'Signal array ................ ONLINE' },
  { text: 'Atmospheric noise ........... FILTERED' },
  { text: 'Telemetry link .............. GREEN' },
  { text: 'Operator presence ........... DETECTED' },
  { text: 'Awaiting call sign input. Enter credentials to proceed.' },
];

function appendLogLine({ text, className }) {
  const line = document.createElement('p');
  line.textContent = text;
  if (className) {
    line.classList.add(className);
  }
  logContainer.appendChild(line);
  logContainer.scrollTop = logContainer.scrollHeight;
}

async function playBootLog() {
  for (const line of logLines) {
    appendLogLine(line);
    await new Promise((resolve) => setTimeout(resolve, 360));
  }
}

export function initLandingScene({ onAccessGranted }) {
  playBootLog();

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = input.value.trim();
    if (!value) {
      errorField.textContent = 'Call sign required. Please provide access credentials.';
      errorField.hidden = false;
      input.focus();
      return;
    }

    errorField.hidden = true;
    appendLogLine({ text: `> ACCESS KEY RECEIVED :: ${value.toUpperCase()}` });
    appendLogLine({ text: 'Routing to orbital inspector...' });
    if (typeof onAccessGranted === 'function') {
      onAccessGranted({ callSign: value });
    }
  });

  return {
    focus() {
      input.focus({ preventScroll: true });
    },
  };
}
