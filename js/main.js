const navToggle = document.querySelector('[data-nav-toggle]');
const siteNav = document.getElementById('site-nav');
const header = document.querySelector('[data-site-header]');
const binaryOverlay = document.querySelector('[data-binary-overlay]');
const yearLabel = document.getElementById('year');
const root = document.documentElement;
const projectsSection = document.querySelector('.projects');

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
};

let sentinel = null;
if (projectsSection) {
  sentinel = document.createElement('div');
  sentinel.dataset.projectTheme = 'default';
  sentinel.dataset.projectBg = defaultTheme.bg;
  sentinel.dataset.projectAccent = defaultTheme.accent;
  sentinel.dataset.projectText = defaultTheme.text;
  sentinel.dataset.projectSheen = defaultTheme.sheen;
  sentinel.setAttribute('aria-hidden', 'true');
  sentinel.style.display = 'block';
  sentinel.style.height = '1px';
  sentinel.style.marginTop = '-25vh';
  sentinel.style.width = '1px';
  sentinel.style.pointerEvents = 'none';
  projectsSection.before(sentinel);
}

const projectCards = document.querySelectorAll('.project-card[data-project-theme]');

function randomBinaryBlock(length = 260) {
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += Math.random() > 0.5 ? '1' : '0';
    if (i % 32 === 0) {
      result += ' ';
    }
  }
  return result.trim();
}

function triggerBinary(label, accent) {
  if (!binaryOverlay || !label) return;
  binaryOverlay.textContent = `${randomBinaryBlock(160)} // ${label.toUpperCase()}`;
  binaryOverlay.style.color = accent;
  binaryOverlay.classList.remove('is-active');
  void binaryOverlay.offsetWidth;
  binaryOverlay.classList.add('is-active');
}

function setTheme({ bg, accent, text, sheen }, label) {
  root.style.setProperty('--page-bg', bg || defaultTheme.bg);
  root.style.setProperty('--accent', accent || defaultTheme.accent);
  root.style.setProperty('--page-text', text || defaultTheme.text);
  root.style.setProperty('--page-sheen', sheen || defaultTheme.sheen);
  if (header) {
    header.style.borderColor = `${accent || defaultTheme.accent}33`;
  }
  triggerBinary(label, accent || defaultTheme.accent);
}

function hydrateProjectCard(card) {
  const { projectBg, projectAccent, projectText } = card.dataset;
  if (projectBg) card.style.setProperty('--project-bg', projectBg);
  if (projectAccent) card.style.setProperty('--project-accent', projectAccent);
  if (projectText) card.style.setProperty('--project-text', projectText);
}

projectCards.forEach((card) => hydrateProjectCard(card));

const observedTargets = [];
if (sentinel) observedTargets.push(sentinel);
projectCards.forEach((card) => observedTargets.push(card));

if (observedTargets.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const target = entry.target;
        const { projectBg, projectAccent, projectText, projectSheen } = target.dataset;
        const label = target.querySelector('h3')?.textContent?.trim() || 'System reset';
        setTheme(
          {
            bg: projectBg,
            accent: projectAccent,
            text: projectText,
            sheen: projectSheen,
          },
          label
        );
      });
    },
    { threshold: 0.55 }
  );

  observedTargets.forEach((target) => observer.observe(target));
}
