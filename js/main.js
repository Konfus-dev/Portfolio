const navToggle = document.querySelector('[data-nav-toggle]');
const siteNav = document.getElementById('site-nav');
const header = document.querySelector('[data-site-header]');
const yearLabel = document.getElementById('year');
const root = document.documentElement;

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
  bg: computed.getPropertyValue('--page-bg'),
  accent: computed.getPropertyValue('--accent'),
  text: computed.getPropertyValue('--page-text'),
  sheen: computed.getPropertyValue('--page-sheen'),
  bgImage: computed.getPropertyValue('--page-bg-image'),
};

const projectCards = document.querySelectorAll('.project-card[data-project-theme]');

function setTheme({ bg, accent, text, sheen, bgImage }) {
  root.style.setProperty('--page-bg', bg || defaultTheme.bg);
  root.style.setProperty('--accent', accent || defaultTheme.accent);
  root.style.setProperty('--page-text', text || defaultTheme.text);
  root.style.setProperty('--page-sheen', sheen || defaultTheme.sheen);
  root.style.setProperty('--accent-strong', accent || defaultTheme.accent);
  root.style.setProperty('--page-bg-image', bgImage || defaultTheme.bgImage || 'none');
  if (header) {
    header.style.borderColor = `${accent || defaultTheme.accent}33`;
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
    bgImage: projectGif ? `url(${projectGif})` : undefined,
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

function openDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }
}

function closeDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.close === 'function') {
    dialog.close();
  } else {
    dialog.removeAttribute('open');
  }
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
});

const dialogCloseButtons = document.querySelectorAll('[data-dialog-close]');

dialogCloseButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const dialog = button.closest('.project-dialog');
    closeDialog(dialog);
  });
});
