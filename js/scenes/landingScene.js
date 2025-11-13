const landingScene = document.querySelector('[data-scene="landing"]');
const logContainer = landingScene.querySelector('.landing__log');
const form = landingScene.querySelector('.landing-form');
const input = form.querySelector('input');
const submitButton = form.querySelector('button[type="submit"]');
const errorField = form.querySelector('.landing-form__error');

const shellPrompt = 'jh-os@relay:~$';

const logLines = [
  { type: 'command', text: 'boot_sequence --diagnostics' },
  { type: 'output', text: '[OK] core power grid stabilised' },
  { type: 'output', text: '[OK] orbital thrusters in standby' },
  { type: 'output', text: '[OK] telemetry handshake confirmed' },
  { type: 'command', text: 'listen --channel orbital-array' },
  { type: 'output', text: '[OK] receivers locked · 12 signals tracked' },
  { type: 'command', text: 'inspect --planetary-grid' },
  { type: 'output', text: '[READY] orbital viewer primed for transfer' },
  { type: 'status', text: 'Awaiting call sign · use `access --call-sign <id>`' },
];

function appendLogLine({ type = 'output', text }) {
  const line = document.createElement('p');
  line.classList.add('landing__log-line', `landing__log-line--${type}`);

  if (type === 'command') {
    const promptSpan = document.createElement('span');
    promptSpan.classList.add('landing__log-prompt');
    promptSpan.textContent = shellPrompt;

    const textSpan = document.createElement('span');
    textSpan.classList.add('landing__log-text');
    textSpan.textContent = text;

    line.append(promptSpan, textSpan);
  } else {
    if (type === 'output') {
      const promptSpan = document.createElement('span');
      promptSpan.classList.add('landing__log-prompt');
      promptSpan.textContent = '↳';
      line.appendChild(promptSpan);
    }

    const textSpan = document.createElement('span');
    textSpan.classList.add('landing__log-text');
    textSpan.textContent = text;
    line.appendChild(textSpan);
  }

  logContainer.appendChild(line);
  logContainer.scrollTop = logContainer.scrollHeight;
}

async function playBootLog() {
  for (const line of logLines) {
    appendLogLine(line);
    await new Promise((resolve) => setTimeout(resolve, 320));
  }
}

export function initLandingScene({ onAccessGranted }) {
  let authenticating = false;

  playBootLog();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (authenticating) {
      return;
    }

    const value = input.value.trim();
    if (!value) {
      errorField.textContent = 'Access denied · provide a call sign to continue';
      errorField.hidden = false;
      input.focus();
      return;
    }

    errorField.hidden = true;
    appendLogLine({ type: 'command', text: `access --call-sign ${value.toLowerCase()}` });
    appendLogLine({ type: 'output', text: 'Transmitting credentials to orbital inspector…' });

    authenticating = true;
    input.disabled = true;
    submitButton.disabled = true;

    try {
      if (typeof onAccessGranted === 'function') {
        await onAccessGranted({ callSign: value });
      }
      appendLogLine({ type: 'status', text: `Credentials accepted · welcome ${value.toUpperCase()}` });
      input.value = '';
    } finally {
      authenticating = false;
      input.disabled = false;
      submitButton.disabled = false;
    }
  });

  return {
    focus() {
      input.focus({ preventScroll: true });
    },
  };
}
