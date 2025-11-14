const screens = {
  login: document.querySelector('[data-screen="login"]'),
  loading: document.querySelector('[data-screen="loading"]'),
  desktop: document.querySelector('[data-screen="desktop"]'),
};

const loginForm = document.querySelector('.login-form');
const usernameInput = document.getElementById('username-input');
const loginError = document.querySelector('.login-panel__error');
const loginButton = loginForm?.querySelector('button[type="submit"]');

const loadingStatus = document.querySelector('.loading-panel__status');
const loadingLog = document.querySelector('.loading-panel__log');
const loadingBar = document.querySelector('.loading-panel__bar');
const loadingProgress = document.querySelector('.loading-panel__progress');

const welcomeModal = document.querySelector('[data-modal="welcome"]');
const welcomeMessage = document.querySelector('[data-welcome-message]');
const welcomeClose = welcomeModal?.querySelector('[data-modal-close]');

const userLabel = document.querySelector('[data-user-label]');
const clockLabel = document.querySelector('[data-clock]');
const workspace = document.querySelector('[data-workspace]');
const taskbar = document.querySelector('[data-taskbar-apps]');

const markdownTargets = new Map(
  Array.from(document.querySelectorAll('[data-markdown-target]')).map((el) => [el.dataset.markdownTarget, el])
);

const markdownSources = new Map([
  ['about', 'assets/desktop/about-me.md'],
  ['resume', 'assets/desktop/resume.md'],
]);

const windows = new Map(
  Array.from(document.querySelectorAll('[data-window]')).map((el) => [el.dataset.window, el])
);

const taskbarItems = new Map();

const icons = Array.from(document.querySelectorAll('[data-open]'));

const portfolioButtons = Array.from(document.querySelectorAll('[data-file]'));
const portfolioTitle = document.querySelector('[data-portfolio-title]');
const portfolioSummary = document.querySelector('[data-portfolio-summary]');
const portfolioTags = document.querySelector('[data-portfolio-tags]');
const portfolioLink = document.querySelector('[data-portfolio-link]');
const portfolioBody = document.querySelector('[data-portfolio-body]');
const portfolioCache = new Map();
let portfolioRequestToken = 0;

const blogButtons = Array.from(document.querySelectorAll('[data-blog-entry]'));
const blogTitle = document.querySelector('[data-blog-title]');
const blogSummary = document.querySelector('[data-blog-summary]');
const blogTags = document.querySelector('[data-blog-tags]');
const blogBody = document.querySelector('[data-blog-body]');
let blogRequestToken = 0;
let blogInitialized = false;

const contactLaunchButton = document.querySelector('[data-contact-launch]');
const contactModal = document.querySelector('[data-modal="contact"]');
const contactModalMessage = document.querySelector('[data-contact-message]');
const contactEmailLink = document.querySelector('[data-contact-email]');
const contactLinkedInLink = document.querySelector('[data-contact-linkedin]');
const contactCloseButton = document.querySelector('[data-contact-close]');
let contactEntry = null;

const markdownCache = new Map();

let activeUser = 'Guest';
let selectedIcon = null;
let zIndexCursor = 20;

function showScreen(name) {
  Object.entries(screens).forEach(([key, element]) => {
    if (!element) return;
    element.hidden = key !== name;
  });
}

function setLoginError(message) {
  if (!loginError) return;
  if (!message) {
    loginError.hidden = true;
    loginError.textContent = '';
    return;
  }

  loginError.hidden = false;
  loginError.textContent = message;
}

function sleep(duration) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

function appendLoadingLog(message) {
  if (!loadingLog) return;
  const item = document.createElement('li');
  item.textContent = message;
  loadingLog.append(item);
  loadingLog.scrollTop = loadingLog.scrollHeight;
}

async function runBootSequence(username) {
  if (!loadingStatus || !loadingBar || !loadingProgress) return;

  showScreen('loading');
  loadingStatus.textContent = 'Verifying BIOS checksum';
  if (loadingLog) {
    loadingLog.innerHTML = '';
  }
  loadingProgress.style.width = '0%';
  loadingBar.setAttribute('aria-valuenow', '0');

  const steps = [
    { message: 'Boot ROM checksum — OK', delay: 450, log: 'ROM integrity verified', progress: 18 },
    { message: 'Mounting SynthWave audio bus', delay: 520, log: 'Audio drivers online', progress: 24 },
    { message: 'Spooling up CRT renderer', delay: 680, log: 'Display pipeline calibrated', progress: 23 },
    {
      message: `Restoring profile for ${username.toUpperCase()}`,
      delay: 560,
      log: `User session ${username.toUpperCase()} decrypted`,
      progress: 20,
    },
    { message: 'Preparing desktop environment', delay: 620, log: 'Retro OS environment ready', progress: 15 },
  ];

  let progress = 0;

  for (const step of steps) {
    loadingStatus.textContent = step.message;
    appendLoadingLog(step.log);
    progress = Math.min(progress + step.progress, 100);
    loadingProgress.style.width = `${progress}%`;
    loadingBar.setAttribute('aria-valuenow', String(progress));
    await sleep(step.delay);
  }

  await sleep(400);
}

function updateUser(username) {
  activeUser = username;
  if (userLabel) {
    userLabel.textContent = `USER: ${username.toUpperCase()}`;
  }
  document.title = `Retro OS | ${username.toUpperCase()}`;
}

function updateClock() {
  if (!clockLabel) return;
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  clockLabel.textContent = `${hours}:${minutes}`;
}

function openWelcome(username) {
  if (!welcomeModal || !welcomeMessage) return;
  welcomeMessage.textContent = `Greetings, ${username.toUpperCase()}! Retro OS is ready.`;
  welcomeModal.hidden = false;
  welcomeClose?.focus();
}

function closeWelcome() {
  if (!welcomeModal) return;
  welcomeModal.hidden = true;
}

function ensureTaskbarItem(name) {
  if (!taskbar) return null;
  if (taskbarItems.has(name)) {
    return taskbarItems.get(name);
  }

  const win = windows.get(name);
  if (!win) {
    return null;
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'taskbar__button';
  button.dataset.taskbarItem = name;
  button.setAttribute('aria-pressed', 'false');

  const iconSpan = document.createElement('span');
  iconSpan.className = 'taskbar__icon';
  iconSpan.setAttribute('aria-hidden', 'true');
  iconSpan.textContent = (win.dataset.windowIcon || 'APP').slice(0, 3).toUpperCase();

  const labelSpan = document.createElement('span');
  labelSpan.className = 'taskbar__label';
  labelSpan.textContent = win.dataset.windowTaskbar || name;

  button.append(iconSpan, labelSpan);
  button.addEventListener('click', () => {
    toggleWindowFromTaskbar(name);
  });

  taskbar.append(button);
  taskbarItems.set(name, button);
  return button;
}

function activateTaskbarItem(name) {
  const button = ensureTaskbarItem(name);
  if (!button) return;
  taskbarItems.forEach((otherButton, key) => {
    if (key !== name) {
      otherButton.classList.remove('is-active');
      otherButton.setAttribute('aria-pressed', 'false');
    }
  });
  button.classList.add('is-active');
  button.setAttribute('aria-pressed', 'true');
}

function deactivateTaskbarItem(name) {
  const button = taskbarItems.get(name);
  if (!button) return;
  button.classList.remove('is-active');
  button.setAttribute('aria-pressed', 'false');
}

function removeTaskbarItem(name) {
  const button = taskbarItems.get(name);
  if (!button) return;
  button.remove();
  taskbarItems.delete(name);
}

function bringWindowToFront(win) {
  windows.forEach((other) => {
    if (other !== win) {
      other.classList.remove('is-active');
      if (!other.hidden) {
        const otherName = other.dataset.window;
        if (otherName) {
          deactivateTaskbarItem(otherName);
        }
      }
    }
  });
  win.classList.add('is-active');
  zIndexCursor += 1;
  win.style.zIndex = String(zIndexCursor);
  const name = win.dataset.window;
  if (name) {
    activateTaskbarItem(name);
  }
}

function openWindow(name) {
  const win = windows.get(name);
  if (!win) return;
  if (win.hidden) {
    win.hidden = false;
  }
  ensureTaskbarItem(name);
  bringWindowToFront(win);
  loadWindowContent(name);
}

function closeWindow(win) {
  win.hidden = true;
  win.classList.remove('is-active');
  const name = win.dataset.window;
  if (name) {
    removeTaskbarItem(name);
  }
}

function toggleWindowFromTaskbar(name) {
  const win = windows.get(name);
  if (!win) return;

  if (win.hidden) {
    win.hidden = false;
    ensureTaskbarItem(name);
    bringWindowToFront(win);
    loadWindowContent(name);
  } else if (win.classList.contains('is-active')) {
    win.hidden = true;
    win.classList.remove('is-active');
    deactivateTaskbarItem(name);
  } else {
    bringWindowToFront(win);
  }
}

function selectIcon(icon) {
  if (selectedIcon) {
    selectedIcon.classList.remove('is-selected');
  }
  selectedIcon = icon;
  selectedIcon?.classList.add('is-selected');
}

function clearIconSelection() {
  if (selectedIcon) {
    selectedIcon.classList.remove('is-selected');
    selectedIcon = null;
  }
}

function initializeIcons() {
  icons.forEach((icon) => {
    icon.addEventListener('click', () => {
      selectIcon(icon);
    });

    icon.addEventListener('focus', () => {
      selectIcon(icon);
    });

    icon.addEventListener('dblclick', () => {
      openWindow(icon.dataset.open);
    });

    icon.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openWindow(icon.dataset.open);
      }
    });
  });
}

function initializeWindowControls() {
  windows.forEach((win) => {
    const closeButton = win.querySelector('[data-window-close]');
    closeButton?.addEventListener('click', () => {
      closeWindow(win);
    });

    win.addEventListener('mousedown', () => {
      bringWindowToFront(win);
    });

    const titlebar = win.querySelector('.window__titlebar');
    if (!titlebar) return;

    let pointerId = null;
    let offsetX = 0;
    let offsetY = 0;

    titlebar.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      pointerId = event.pointerId;
      bringWindowToFront(win);
      win.classList.add('is-dragging');
      const rect = win.getBoundingClientRect();
      offsetX = event.clientX - rect.left;
      offsetY = event.clientY - rect.top;
      titlebar.setPointerCapture(pointerId);
      event.preventDefault();
    });

    titlebar.addEventListener('pointermove', (event) => {
      if (pointerId === null || event.pointerId !== pointerId || !workspace) return;
      const workspaceRect = workspace.getBoundingClientRect();
      const width = win.offsetWidth;
      const height = win.offsetHeight;

      let nextLeft = event.clientX - workspaceRect.left - offsetX;
      let nextTop = event.clientY - workspaceRect.top - offsetY;

      const maxLeft = workspaceRect.width - width;
      const maxTop = workspaceRect.height - height;

      nextLeft = Math.min(Math.max(nextLeft, 0), Math.max(maxLeft, 0));
      nextTop = Math.min(Math.max(nextTop, 0), Math.max(maxTop, 0));

      win.style.left = `${nextLeft}px`;
      win.style.top = `${nextTop}px`;
    });

    function endDrag(event) {
      if (pointerId === null || event.pointerId !== pointerId) return;
      titlebar.releasePointerCapture(pointerId);
      pointerId = null;
      win.classList.remove('is-dragging');
    }

    titlebar.addEventListener('pointerup', endDrag);
    titlebar.addEventListener('pointercancel', endDrag);
  });
}

function initializeWorkspace() {
  if (!workspace) return;

  workspace.addEventListener('pointerdown', (event) => {
    if (!event.target.closest('.desktop-icon') && !event.target.closest('.window')) {
      clearIconSelection();
    }
  });
}

function escapeHTML(value) {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return char;
    }
  });
}

function escapeAttribute(value) {
  return value.replace(/["'<>&\s]/g, (char) => {
    switch (char) {
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case ' ':
        return '%20';
      default:
        return char;
    }
  });
}

function formatInlineMarkdown(text) {
  let formatted = escapeHTML(text);

  formatted = formatted.replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`);
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    const safeUrl = escapeAttribute(url.trim());
    return `<a href="${safeUrl}" target="_blank" rel="noopener">${label}</a>`;
  });

  return formatted;
}

function markdownToHTML(markdown) {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      closeList();
      return;
    }

    if (/^#{1,6}\s+/.test(line)) {
      closeList();
      const level = Math.min(line.match(/^#+/)[0].length, 3);
      const content = line.replace(/^#{1,6}\s+/, '');
      html.push(`<h${level}>${formatInlineMarkdown(content)}</h${level}>`);
      return;
    }

    if (/^-\s+/.test(line)) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      const item = line.replace(/^-\s+/, '');
      html.push(`<li>${formatInlineMarkdown(item)}</li>`);
      return;
    }

    closeList();
    html.push(`<p>${formatInlineMarkdown(line)}</p>`);
  });

  closeList();
  return html.join('');
}

function parseMarkdownDocument(markdown) {
  const trimmed = markdown.trim();
  const frontMatterMatch = trimmed.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  const metadata = {};
  let body = trimmed;

  if (frontMatterMatch) {
    const lines = frontMatterMatch[1].split(/\r?\n/);
    let currentKey = null;

    lines.forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) return;

      if (line.startsWith('-')) {
        if (currentKey && Array.isArray(metadata[currentKey])) {
          metadata[currentKey].push(line.replace(/^-[\s]*/, '').trim());
        }
        return;
      }

      const [key, ...rest] = line.split(':');
      const keyName = key.trim();
      const value = rest.join(':').trim();

      if (!value) {
        metadata[keyName] = [];
        currentKey = keyName;
      } else {
        metadata[keyName] = value;
        currentKey = Array.isArray(metadata[keyName]) ? keyName : null;
      }
    });

    body = trimmed.slice(frontMatterMatch[0].length).trim();
  }

  const summary = body.split(/\n\s*\n/).find((paragraph) => paragraph.trim().length) || '';
  return { metadata, body, summary };
}

async function loadMarkdownFile(path) {
  if (markdownCache.has(path)) {
    return markdownCache.get(path);
  }

  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Unable to load ${path}: ${response.status}`);
  }

  const rawMarkdown = await response.text();
  const parsed = parseMarkdownDocument(rawMarkdown);
  markdownCache.set(path, parsed);
  return parsed;
}

async function loadPortfolioEntry(fileName) {
  if (portfolioCache.has(fileName)) {
    return portfolioCache.get(fileName);
  }

  const path = `assets/portfolio/${encodeURIComponent(fileName)}`;
  const { metadata, body, summary } = await loadMarkdownFile(path);
  const tags = metadata.tags;
  const normalizedTags = Array.isArray(tags)
    ? tags
    : typeof tags === 'string' && tags.trim().length
    ? [tags.trim()]
    : [];

  const entry = {
    title: metadata.title?.trim() || fileName,
    summary: metadata.summary?.trim() || summary.trim(),
    tags: normalizedTags,
    link: metadata.link?.trim() || '',
    bodyHTML: body ? markdownToHTML(body) : '',
    hasBody: Boolean(body && body.trim().length),
  };

  portfolioCache.set(fileName, entry);
  return entry;
}

function disablePortfolioLink() {
  if (!portfolioLink) return;
  portfolioLink.removeAttribute('href');
  portfolioLink.setAttribute('aria-disabled', 'true');
  portfolioLink.tabIndex = -1;
}

function enablePortfolioLink(href) {
  if (!portfolioLink) return;
  portfolioLink.href = href;
  portfolioLink.removeAttribute('aria-disabled');
  portfolioLink.tabIndex = 0;
}

async function updatePortfolio(fileName) {
  if (
    !fileName ||
    !portfolioTitle ||
    !portfolioSummary ||
    !portfolioTags ||
    !portfolioLink ||
    !portfolioBody
  ) {
    return;
  }

  const requestId = ++portfolioRequestToken;

  portfolioButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.file === fileName);
  });

  portfolioTitle.textContent = fileName;
  portfolioSummary.textContent = 'Loading file…';
  portfolioTags.innerHTML = '';
  portfolioBody.innerHTML = '<p>Loading file…</p>';
  portfolioLink.textContent = 'Loading…';
  disablePortfolioLink();

  try {
    const entry = await loadPortfolioEntry(fileName);
    if (portfolioRequestToken !== requestId) {
      return;
    }

    portfolioTitle.textContent = entry.title;
    portfolioSummary.textContent = entry.summary || 'This project file does not include a summary yet.';
    portfolioTags.innerHTML = '';

    if (entry.tags.length) {
      entry.tags.forEach((tag) => {
        const item = document.createElement('li');
        item.textContent = tag;
        portfolioTags.append(item);
      });
    }

    if (entry.link) {
      portfolioLink.textContent = 'Open project';
      enablePortfolioLink(entry.link);
    } else {
      portfolioLink.textContent = 'Link unavailable';
      disablePortfolioLink();
    }

    portfolioBody.innerHTML = entry.hasBody
      ? entry.bodyHTML
      : '<p>This project file is still being written.</p>';
  } catch (error) {
    if (portfolioRequestToken !== requestId) {
      return;
    }

    console.error(error);
    portfolioTitle.textContent = fileName;
    portfolioSummary.textContent = 'Unable to load portfolio file. Please try again later.';
    portfolioTags.innerHTML = '';
    disablePortfolioLink();
    portfolioLink.textContent = 'Unavailable';
    portfolioBody.innerHTML = '<p>Retro OS could not read this file. Please try again later.</p>';
  }
}

async function ensureMarkdownTargetLoaded(key) {
  const path = markdownSources.get(key);
  const target = markdownTargets.get(key);

  if (!path || !target) {
    return;
  }

  if (target.dataset.loaded === 'true' || target.dataset.loading === 'true') {
    return;
  }

  target.dataset.loading = 'true';
  target.innerHTML = '<p>Loading file…</p>';

  try {
    const { body } = await loadMarkdownFile(path);
    target.innerHTML = body?.trim().length ? markdownToHTML(body) : '<p>This file is currently empty.</p>';
    target.dataset.loaded = 'true';
  } catch (error) {
    console.error(error);
    target.innerHTML = '<p>Retro OS could not read this file. Please try again later.</p>';
  } finally {
    delete target.dataset.loading;
  }
}

async function loadContactWindow() {
  const target = markdownTargets.get('contact');
  if (!target || contactEntry) {
    return;
  }

  if (target.dataset.loading === 'true') {
    return;
  }

  target.dataset.loading = 'true';

  target.innerHTML = '<p>Loading contact.exe…</p>';
  if (contactLaunchButton) {
    contactLaunchButton.disabled = true;
    contactLaunchButton.textContent = 'Loading contact.exe…';
  }

  try {
    const { metadata, body, summary } = await loadMarkdownFile('assets/desktop/contact.md');
    contactEntry = {
      bodyHTML: body?.trim().length ? markdownToHTML(body) : '<p>Contact details are coming soon.</p>',
      metadata,
      summary: metadata.summary?.trim() || summary.trim(),
    };

    target.innerHTML = contactEntry.bodyHTML;
    target.dataset.loaded = 'true';

    if (contactLaunchButton) {
      contactLaunchButton.disabled = false;
      contactLaunchButton.textContent = 'Run contact.exe';
    }

    if (contactModalMessage) {
      contactModalMessage.textContent = contactEntry.summary || 'Choose a channel to transmit.';
    }

    if (contactEmailLink) {
      const email = metadata.email?.trim();
      if (email) {
        contactEmailLink.href = `mailto:${email}`;
        contactEmailLink.hidden = false;
      } else {
        contactEmailLink.hidden = true;
      }
    }

    if (contactLinkedInLink) {
      const profile = metadata.linkedin?.trim();
      if (profile) {
        contactLinkedInLink.href = profile;
        contactLinkedInLink.hidden = false;
      } else {
        contactLinkedInLink.hidden = true;
      }
    }
  } catch (error) {
    console.error(error);
    target.innerHTML = '<p>Retro OS cannot load contact.exe right now.</p>';
    if (contactLaunchButton) {
      contactLaunchButton.disabled = true;
      contactLaunchButton.textContent = 'Unavailable';
    }
    if (contactEmailLink) {
      contactEmailLink.hidden = true;
    }
    if (contactLinkedInLink) {
      contactLinkedInLink.hidden = true;
    }
  } finally {
    delete target.dataset.loading;
  }
}

function openContactModal() {
  if (!contactModal || !contactEntry) return;
  contactModal.hidden = false;
  const focusTarget = !contactEmailLink?.hidden
    ? contactEmailLink
    : !contactLinkedInLink?.hidden
    ? contactLinkedInLink
    : null;
  focusTarget?.focus();
}

function closeContactModal() {
  if (!contactModal) return;
  contactModal.hidden = true;
  contactLaunchButton?.focus();
}

async function updateBlog(fileName) {
  if (!fileName || !blogTitle || !blogSummary || !blogTags || !blogBody) {
    return;
  }

  const requestId = ++blogRequestToken;

  blogButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.blogEntry === fileName);
  });

  blogTitle.textContent = fileName;
  blogSummary.textContent = 'Loading entry…';
  blogTags.innerHTML = '';
  blogBody.innerHTML = '<p>Loading file…</p>';

  try {
    const path = `assets/blog/${encodeURIComponent(fileName)}`;
    const { metadata, body, summary } = await loadMarkdownFile(path);
    if (blogRequestToken !== requestId) {
      return;
    }

    const normalizedTags = Array.isArray(metadata.tags)
      ? metadata.tags
      : typeof metadata.tags === 'string' && metadata.tags.trim().length
      ? [metadata.tags.trim()]
      : [];

    blogTitle.textContent = metadata.title?.trim() || fileName;
    blogSummary.textContent = metadata.summary?.trim() || summary.trim() || 'This post is still being written.';
    blogTags.innerHTML = '';

    if (normalizedTags.length) {
      normalizedTags.forEach((tag) => {
        const item = document.createElement('li');
        item.textContent = tag;
        blogTags.append(item);
      });
    }

    blogBody.innerHTML = body?.trim().length ? markdownToHTML(body) : '<p>This post is still being written.</p>';
  } catch (error) {
    if (blogRequestToken !== requestId) {
      return;
    }

    console.error(error);
    blogTitle.textContent = fileName;
    blogSummary.textContent = 'Unable to load this blog entry. Please try again later.';
    blogTags.innerHTML = '';
    blogBody.innerHTML = '<p>Retro OS could not read this file. Please try again later.</p>';
  }
}

function initializeBlog() {
  if (blogInitialized) {
    return;
  }

  blogInitialized = true;

  blogButtons.forEach((button) => {
    const entryName = button.dataset.blogEntry;
    if (!entryName) return;

    button.addEventListener('click', () => {
      updateBlog(entryName);
    });

    button.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        updateBlog(entryName);
      }
    });
  });

  if (blogButtons.length) {
    const firstEntry = blogButtons[0].dataset.blogEntry;
    if (firstEntry) {
      updateBlog(firstEntry);
    }
  }
}

function loadWindowContent(name) {
  if (!name) {
    return;
  }

  if (markdownSources.has(name)) {
    ensureMarkdownTargetLoaded(name);
    return;
  }

  if (name === 'contact') {
    loadContactWindow();
    return;
  }

  if (name === 'blog') {
    initializeBlog();
  }
}

function initializePortfolio() {
  portfolioButtons.forEach((button) => {
    const fileName = button.dataset.file;
    if (!fileName) return;

    button.addEventListener('click', () => {
      updatePortfolio(fileName);
    });

    button.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        updatePortfolio(fileName);
      }
    });
  });

  if (portfolioButtons.length) {
    const firstFile = portfolioButtons[0].dataset.file;
    if (firstFile) {
      updatePortfolio(firstFile);
    }
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const value = usernameInput?.value.trim();

  if (!value) {
    setLoginError('Please enter a username to continue.');
    usernameInput?.focus();
    return;
  }

  setLoginError('');
  if (loginButton) {
    loginButton.disabled = true;
    loginButton.textContent = 'Booting...';
  }

  await runBootSequence(value);

  updateUser(value);
  showScreen('desktop');
  openWelcome(value);
  loginForm.reset();
}

function initializeModals() {
  welcomeClose?.addEventListener('click', () => {
    closeWelcome();
  });

  welcomeModal?.addEventListener('click', (event) => {
    if (event.target === welcomeModal) {
      closeWelcome();
    }
  });

  contactLaunchButton?.addEventListener('click', () => {
    if (!contactLaunchButton.disabled) {
      openContactModal();
    }
  });

  contactCloseButton?.addEventListener('click', () => {
    closeContactModal();
  });

  contactModal?.addEventListener('click', (event) => {
    if (event.target === contactModal) {
      closeContactModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (welcomeModal && !welcomeModal.hidden) {
        closeWelcome();
      }
      if (contactModal && !contactModal.hidden) {
        closeContactModal();
      }
    }
  });
}

function initializeApp() {
  if (contactLaunchButton) {
    contactLaunchButton.disabled = true;
    contactLaunchButton.textContent = 'Loading contact.exe…';
  }

  if (contactEmailLink) {
    contactEmailLink.hidden = true;
  }

  if (contactLinkedInLink) {
    contactLinkedInLink.hidden = true;
  }

  showScreen('login');
  loginForm?.addEventListener('submit', handleLogin);
  usernameInput?.focus();
  initializeIcons();
  initializeWindowControls();
  initializeWorkspace();
  initializePortfolio();
  initializeModals();
  updateClock();
  setInterval(updateClock, 60 * 1000);
}

initializeApp();
