const landingScene = document.querySelector('[data-scene="landing"]');
const logContainer = landingScene.querySelector('.landing__log');
const form = landingScene.querySelector('.landing-form');
const input = form.querySelector('input');
const submitButton = form.querySelector('button[type="submit"]');
const errorField = form.querySelector('.landing-form__error');
const hintField = form.querySelector('.landing-form__hint');
const labelField = form.querySelector('label[for="call-sign"]');

const shellPrompt = 'jh-os@relay:~$';

const bootLogLines = [
  { type: 'command', text: 'boot_sequence --diagnostics' },
  { type: 'output', text: '[OK] core power grid stabilised' },
  { type: 'output', text: '[OK] orbital thrusters in standby' },
  { type: 'output', text: '[OK] telemetry handshake confirmed' },
  { type: 'command', text: 'listen --channel orbital-array' },
  { type: 'output', text: '[OK] receivers locked · 12 signals tracked' },
  { type: 'command', text: 'inspect --planetary-grid' },
  { type: 'output', text: '[READY] orbital viewer primed for transfer' },
  { type: 'status', text: 'Identification required to unlock console' },
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
  for (const line of bootLogLines) {
    appendLogLine(line);
    await new Promise((resolve) => setTimeout(resolve, 320));
  }
}

export function initLandingScene({ onAccessGranted }) {
  let awaitingCallSign = true;
  let busy = false;
  let storedCallSign = '';

  playBootLog();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) {
      return;
    }

    const value = input.value.trim();
    if (!value) {
      errorField.textContent = awaitingCallSign
        ? 'Access denied · provide a call sign to continue'
        : 'Enter a command to continue';
      errorField.hidden = false;
      input.focus();
      return;
    }

    errorField.hidden = true;

    if (awaitingCallSign) {
      busy = true;
      input.disabled = true;
      submitButton.disabled = true;

      appendLogLine({ type: 'command', text: `access --call-sign ${value.toLowerCase()}` });
      appendLogLine({ type: 'output', text: 'Transmitting credentials…' });

      await new Promise((resolve) => setTimeout(resolve, 420));

      storedCallSign = value;
      appendLogLine({
        type: 'status',
        text: `Credentials accepted // welcome ${value.toUpperCase()}`,
      });
      appendLogLine({
        type: 'output',
        text: 'Console unlocked. Type `help` to list available commands.',
      });

      awaitingCallSign = false;
      input.placeholder = 'enter command (help, view projects, view about)';
      hintField.textContent = 'Type a command and press enter to execute.';
      labelField.textContent = 'Command input';
      input.value = '';

      busy = false;
      input.disabled = false;
      submitButton.disabled = false;
      input.focus();
      return;
    }

    const command = value.toLowerCase();
    appendLogLine({ type: 'command', text: value });
    input.value = '';

    if (command === 'help') {
      appendLogLine({ type: 'output', text: 'Available commands:' });
      appendLogLine({ type: 'output', text: '• help · list available commands' });
      appendLogLine({ type: 'output', text: '• view projects · launch the orbital inspector' });
      appendLogLine({ type: 'output', text: '• view about · read the operator dossier' });
      appendLogLine({ type: 'output', text: '• clear · purge the console log' });
      return;
    }

    if (command === 'view about') {
      appendLogLine({ type: 'output', text: 'Operator: Jeremy Hummel · Orbital Software Engineer' });
      appendLogLine({
        type: 'output',
        text: 'Focus: Creative engineering, immersive 3D experiences, realtime data interfaces',
      });
      appendLogLine({ type: 'output', text: 'Status: Seeking high-orbit collaborations and grounded partnerships' });
      return;
    }

    if (command === 'clear') {
      logContainer.innerHTML = '';
      appendLogLine({ type: 'status', text: 'Console cleared' });
      return;
    }

    if (command === 'view projects') {
      if (typeof onAccessGranted !== 'function') {
        appendLogLine({ type: 'error', text: 'Viewer interface unavailable. Please try later.' });
        return;
      }

      busy = true;
      input.disabled = true;
      submitButton.disabled = true;

      appendLogLine({ type: 'output', text: 'Routing transmission to orbital inspector…' });

      try {
        await onAccessGranted({ callSign: storedCallSign || value });
      } catch (error) {
        appendLogLine({ type: 'error', text: 'Transmission failed. Retry the command in a moment.' });
      } finally {
        busy = false;
        input.disabled = false;
        submitButton.disabled = false;
      }

      return;
    }

    appendLogLine({ type: 'error', text: `Command not recognised: ${value}` });
  });

  return {
    focus() {
      input.focus({ preventScroll: true });
    },
  };
}
