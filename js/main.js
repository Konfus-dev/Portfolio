const navToggle = document.querySelector('[data-nav-toggle]');
const siteNav = document.getElementById('site-nav');
const header = document.querySelector('[data-site-header]');
const yearLabel = document.getElementById('year');
const root = document.documentElement;
const body = document.body;
const isNativeDialogSupported =
  typeof window !== 'undefined' &&
  'HTMLDialogElement' in window &&
  typeof window.HTMLDialogElement?.prototype?.showModal === 'function';

if (yearLabel) {
  yearLabel.textContent = new Date().getFullYear();
}

if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  siteNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      siteNav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

const computed = getComputedStyle(root);
const defaultTheme = {
  bg: computed.getPropertyValue('--page-bg').trim(),
  accent: computed.getPropertyValue('--accent').trim(),
  text: computed.getPropertyValue('--page-text').trim(),
  sheen: computed.getPropertyValue('--page-sheen').trim(),
  bgImage: computed.getPropertyValue('--page-bg-image').trim(),
};

const defaultCursor = { x: 10, y: 10 };

function setCursorGlowPosition(xPercent, yPercent) {
  if (!root) return;
  root.style.setProperty('--cursor-x', `${xPercent}%`);
  root.style.setProperty('--cursor-y', `${yPercent}%`);
}

function handlePointerMove(event) {
  const x = Math.max(0, Math.min(100, (event.clientX / window.innerWidth) * 100));
  const y = Math.max(0, Math.min(100, (event.clientY / window.innerHeight) * 100));
  setCursorGlowPosition(x, y);
}

window.addEventListener('pointermove', handlePointerMove);
window.addEventListener('pointerleave', () => setCursorGlowPosition(defaultCursor.x, defaultCursor.y));
setCursorGlowPosition(defaultCursor.x, defaultCursor.y);

const projectCards = document.querySelectorAll('.project-card[data-project-theme]');

function resolveAssetUrl(assetPath) {
  if (!assetPath) return null;
  try {
    return new URL(assetPath, document.baseURI).href;
  } catch (error) {
    return assetPath;
  }
}

function formatBackgroundImage(value) {
  if (!value) {
    return defaultTheme.bgImage || 'none';
  }
  const trimmed = value.trim();
  if (trimmed === 'none' || trimmed.startsWith('url(')) {
    return trimmed;
  }
  return `url(${resolveAssetUrl(trimmed)})`;
}

function setTheme({ bg, accent, text, sheen, bgImage }) {
  const resolvedBg = bg || defaultTheme.bg;
  const resolvedAccent = accent || defaultTheme.accent;
  const resolvedText = text || defaultTheme.text;
  const resolvedSheen = sheen || defaultTheme.sheen;
  const resolvedBgImage = formatBackgroundImage(bgImage);

  root.style.setProperty('--page-bg', resolvedBg);
  root.style.setProperty('--accent', resolvedAccent);
  root.style.setProperty('--page-text', resolvedText);
  root.style.setProperty('--page-sheen', resolvedSheen);
  root.style.setProperty('--accent-strong', resolvedAccent);
  root.style.setProperty('--page-bg-image', resolvedBgImage);

  if (header) {
    header.style.borderColor = `${resolvedAccent}33`;
  }
}

function hydrateProjectCard(card) {
  const { projectBg, projectAccent, projectText } = card.dataset;
  if (projectBg) card.style.setProperty('--project-bg', projectBg);
  if (projectAccent) card.style.setProperty('--project-accent', projectAccent);
  if (projectText) card.style.setProperty('--project-text', projectText);
}

projectCards.forEach((card) => hydrateProjectCard(card));

let activeCard = null;

function activateCard(card) {
  if (activeCard === card) return;
  if (activeCard) {
    activeCard.classList.remove('is-active');
  }
  activeCard = card;
  if (!card) {
    setTheme(defaultTheme);
    return;
  }
  card.classList.add('is-active');
  const { projectBg, projectAccent, projectText, projectSheen, projectGif } = card.dataset;
  setTheme({
    bg: projectBg,
    accent: projectAccent,
    text: projectText,
    sheen: projectSheen,
    bgImage: projectGif,
  });
}

function deactivateCard(card) {
  if (!card) return;
  card.classList.remove('is-active');
  if (activeCard === card) {
    activeCard = null;
    setTheme(defaultTheme);
  }
}

projectCards.forEach((card) => {
  card.addEventListener('mouseenter', () => activateCard(card));
  card.addEventListener('focus', () => activateCard(card));
  card.addEventListener('mouseleave', () => deactivateCard(card));
  card.addEventListener('blur', () => deactivateCard(card));
});

const dialogBackdrop = (() => {
  if (isNativeDialogSupported) return null;
  if (!body || !document.querySelector('.project-dialog')) return null;
  const backdrop = document.createElement('div');
  backdrop.className = 'project-dialog-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  body.appendChild(backdrop);
  return backdrop;
})();

let openDialogEl = null;

function syncDialogState() {
  const hasOpenDialog = Boolean(document.querySelector('.project-dialog[open]'));
  if (hasOpenDialog) {
    body?.classList.add('dialog-open');
    dialogBackdrop?.classList.add('is-visible');
  } else {
    body?.classList.remove('dialog-open');
    dialogBackdrop?.classList.remove('is-visible');
  }
}

function openDialog(dialog) {
  if (!dialog || dialog.hasAttribute('open')) {
    openDialogEl = dialog;
    syncDialogState();
    return;
  }
  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }
  openDialogEl = dialog;
  syncDialogState();
}

function closeDialog(dialog) {
  if (!dialog || !dialog.hasAttribute('open')) {
    if (openDialogEl === dialog) {
      openDialogEl = null;
      syncDialogState();
    }
    return;
  }
  if (typeof dialog.close === 'function' && dialog.open) {
    dialog.close();
  } else {
    dialog.removeAttribute('open');
  }
  if (openDialogEl === dialog) {
    openDialogEl = null;
  }
  syncDialogState();
}

const dialogButtons = document.querySelectorAll('[data-dialog-target]');

dialogButtons.forEach((button) => {
  const target = button.getAttribute('data-dialog-target');
  const dialog = document.querySelector(`[data-project-dialog="${target}"]`);
  if (!dialog) return;
  button.addEventListener('click', () => openDialog(dialog));
});

const projectDialogs = document.querySelectorAll('.project-dialog');

projectDialogs.forEach((dialog) => {
  dialog.addEventListener('click', (event) => {
    const rect = dialog.getBoundingClientRect();
    const clickOutside =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom;
    if (clickOutside) {
      closeDialog(dialog);
    }
  });

  dialog.addEventListener('close', () => {
    if (openDialogEl === dialog) {
      openDialogEl = null;
    }
    syncDialogState();
  });
});

const dialogCloseButtons = document.querySelectorAll('[data-dialog-close]');

dialogCloseButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const dialog = button.closest('.project-dialog');
    closeDialog(dialog);
  });
});

if (dialogBackdrop) {
  dialogBackdrop.addEventListener('click', () => {
    if (openDialogEl) {
      closeDialog(openDialogEl);
    }
  });
}
