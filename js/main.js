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

const clockLabel = document.querySelector('[data-clock]');
const dateLabel = document.querySelector('[data-date]');
const workspace = document.querySelector('[data-workspace]');
const taskbar = document.querySelector('[data-taskbar-apps]');
const overflowButton = document.querySelector('[data-taskbar-overflow]');
const overflowMenu = document.querySelector('[data-taskbar-overflow-menu]');
const startButton = document.querySelector('[data-start-button]');
const startPanel = document.querySelector('[data-start-panel]');
const startSearchInput = document.querySelector('[data-start-search]');
const startResults = document.querySelector('[data-start-results]');
const startUserLabel = document.querySelector('[data-start-user]');
const logoutButton = document.querySelector('[data-logout]');

const ICON_GRID_WIDTH = 120;
const ICON_GRID_HEIGHT = 120;

const htmlTargets = new Map(
  Array.from(document.querySelectorAll('[data-html-target]')).map((el) => [el.dataset.htmlTarget, el])
);

const htmlSources = new Map([
  ['about', 'assets/desktop/about-me.html'],
  ['resume', 'assets/desktop/resume.html'],
]);

const CONTACT_SOURCE = 'assets/desktop/contact.html';

const windows = new Map(
  Array.from(document.querySelectorAll('[data-window]')).map((el) => [el.dataset.window, el])
);

const icons = Array.from(document.querySelectorAll('[data-open]'));

const taskbarItems = new Map();

const desktopSearchIndex = icons.map((icon) => ({
  id: icon.dataset.open,
  label: icon.querySelector('.desktop-icon__label')?.textContent.trim() || icon.dataset.open || 'File',
  glyph: icon.querySelector('.desktop-icon__glyph')?.textContent.trim() || '',
}));

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

const htmlCache = new Map();

let activeUser = 'Guest';
let selectedIcon = null;
let zIndexCursor = 20;
let windowSpawnIndex = 0;

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
  if (startUserLabel) {
    startUserLabel.textContent = username.toUpperCase();
  }
  document.title = `Retro OS | ${username.toUpperCase()}`;
}

function updateClock() {
  const now = new Date();
  if (clockLabel) {
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    clockLabel.textContent = `${hours}:${minutes}`;
  }
  if (dateLabel) {
    const formattedDate = now.toLocaleDateString(undefined, {
      month: 'short',
      day: '2-digit',
    });
    dateLabel.textContent = formattedDate;
  }
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
  updateTaskbarOverflow();
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
  updateTaskbarOverflow();
}

function removeTaskbarItem(name) {
  const button = taskbarItems.get(name);
  if (!button) return;
  button.remove();
  taskbarItems.delete(name);
  updateTaskbarOverflow();
}

function closeOverflowMenu() {
  if (!overflowMenu || !overflowButton) return;
  overflowMenu.hidden = true;
  overflowButton.setAttribute('aria-expanded', 'false');
}

function updateOverflowMenuItems(hiddenButtons) {
  if (!overflowMenu) return;
  overflowMenu.innerHTML = '';

  if (!hiddenButtons.length) {
    return;
  }

  const fragment = document.createDocumentFragment();
  hiddenButtons.forEach((btn) => {
    const name = btn.dataset.taskbarItem || '';
    const label = btn.querySelector('.taskbar__label')?.textContent.trim() || name || 'Application';
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'taskbar__overflow-item';
    item.setAttribute('role', 'menuitem');
    item.textContent = label;
    if (btn.classList.contains('is-active')) {
      item.classList.add('is-active');
    }
    item.addEventListener('click', () => {
      if (name) {
        toggleWindowFromTaskbar(name);
      }
      closeOverflowMenu();
    });
    fragment.append(item);
  });

  overflowMenu.append(fragment);
}

function updateTaskbarOverflow() {
  if (!taskbar || !overflowButton || !overflowMenu) {
    return;
  }

  const buttons = Array.from(taskbar.querySelectorAll('.taskbar__button'));

  buttons.forEach((btn) => {
    btn.hidden = false;
    btn.dataset.taskbarOverflow = 'false';
  });

  closeOverflowMenu();
  overflowButton.hidden = true;
  updateOverflowMenuItems([]);

  if (!buttons.length) {
    return;
  }

  const style = window.getComputedStyle(taskbar);
  const gap = Number.parseFloat(style.columnGap || style.gap || '0');
  const availableWidth = taskbar.clientWidth;
  let usedWidth = 0;
  const overflowed = [];

  buttons.forEach((btn, index) => {
    const buttonWidth = Math.ceil(btn.offsetWidth);
    const nextWidth = index === 0 ? buttonWidth : usedWidth + gap + buttonWidth;
    if (nextWidth <= availableWidth) {
      usedWidth = nextWidth;
      btn.hidden = false;
      btn.dataset.taskbarOverflow = 'false';
    } else {
      btn.hidden = true;
      btn.dataset.taskbarOverflow = 'true';
      overflowed.push(btn);
    }
  });

  if (overflowed.length) {
    overflowButton.hidden = false;
    updateOverflowMenuItems(overflowed);
  }
}

function toggleOverflowMenu() {
  if (!overflowMenu || !overflowButton) return;
  if (overflowMenu.hidden) {
    if (!overflowMenu.childElementCount) {
      return;
    }
    overflowMenu.hidden = false;
    overflowButton.setAttribute('aria-expanded', 'true');
  } else {
    closeOverflowMenu();
  }
}

function renderSearchResults(query = '') {
  if (!startResults) return;
  const normalized = query.trim().toLowerCase();
  const matches = normalized
    ? desktopSearchIndex.filter((entry) => {
        const label = entry.label.toLowerCase();
        const id = entry.id?.toLowerCase() || '';
        return label.includes(normalized) || id.includes(normalized);
      })
    : desktopSearchIndex;

  startResults.innerHTML = '';

  if (!matches.length) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'start-menu__empty';
    emptyItem.textContent = 'No files found';
    startResults.append(emptyItem);
    return;
  }

  const fragment = document.createDocumentFragment();
  matches.forEach((entry) => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'start-menu__result';
    button.dataset.startResult = entry.id || '';
    button.setAttribute('role', 'option');
    button.innerHTML = `
      <span class="start-menu__result-glyph" aria-hidden="true">${entry.glyph}</span>
      <span class="start-menu__result-label">${entry.label}</span>
    `;
    button.addEventListener('click', () => {
      if (entry.id) {
        openWindow(entry.id);
      }
      closeStartPanel();
    });
    item.append(button);
    fragment.append(item);
  });

  startResults.append(fragment);
}

function openStartPanel() {
  if (!startPanel) return;
  startPanel.hidden = false;
  startButton?.setAttribute('aria-expanded', 'true');
  renderSearchResults(startSearchInput?.value || '');
  requestAnimationFrame(() => {
    startSearchInput?.focus();
    startSearchInput?.select();
  });
}

function closeStartPanel() {
  if (!startPanel) return;
  if (startPanel.hidden) {
    return;
  }
  startPanel.hidden = true;
  startButton?.setAttribute('aria-expanded', 'false');
}

function toggleStartPanel() {
  if (!startPanel) return;
  if (startPanel.hidden) {
    openStartPanel();
  } else {
    closeStartPanel();
  }
}

function logoutUser() {
  closeStartPanel();
  closeOverflowMenu();

  windows.forEach((win) => {
    win.hidden = true;
    win.classList.remove('is-active');
    win.style.left = '';
    win.style.top = '';
    win.style.zIndex = '';
    delete win.dataset.positioned;
  });

  clearIconSelection();
  selectedIcon = null;
  windowSpawnIndex = 0;
  zIndexCursor = 20;

  Array.from(taskbarItems.keys()).forEach((name) => {
    removeTaskbarItem(name);
  });
  updateTaskbarOverflow();

  closeWelcome();
  closeContactModal();
  contactEntry = null;

  const contactTarget = htmlTargets.get('contact');
  if (contactTarget) {
    delete contactTarget.dataset.loaded;
    contactTarget.innerHTML = 'Loading contact.exe…';
  }

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
  updateUser('Guest');

  if (startSearchInput) {
    startSearchInput.value = '';
  }
  renderSearchResults('');

  if (startButton) {
    startButton.disabled = true;
  }

  if (loginButton) {
    loginButton.disabled = false;
    loginButton.textContent = 'Boot System';
  }

  usernameInput?.focus();
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

function clampWindowToWorkspace(win) {
  if (!workspace) return;
  const rect = workspace.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const width = win.offsetWidth;
  const height = win.offsetHeight;
  const maxLeft = Math.max(rect.width - width, 0);
  const maxTop = Math.max(rect.height - height, 0);

  const currentLeft = Number.parseFloat(win.style.left || '0') || 0;
  const currentTop = Number.parseFloat(win.style.top || '0') || 0;

  const nextLeft = Math.min(Math.max(currentLeft, 0), maxLeft);
  const nextTop = Math.min(Math.max(currentTop, 0), maxTop);

  win.style.left = `${nextLeft}px`;
  win.style.top = `${nextTop}px`;
}

function clampWindowsToWorkspace() {
  windows.forEach((win) => {
    if (!win.hidden) {
      clampWindowToWorkspace(win);
    }
  });
}

function positionWindowIfNeeded(win) {
  if (!workspace || win.dataset.positioned === 'true') {
    return;
  }

  const rect = workspace.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    requestAnimationFrame(() => positionWindowIfNeeded(win));
    return;
  }

  const width = win.offsetWidth;
  const height = win.offsetHeight;
  const maxLeft = Math.max(rect.width - width, 0);
  const maxTop = Math.max(rect.height - height, 0);
  const baseLeft = Math.max((rect.width - width) / 2, 24);
  const baseTop = Math.max((rect.height - height) / 3, 24);
  const offset = (windowSpawnIndex % 4) * 28;

  const left = Math.min(baseLeft + offset, maxLeft);
  const top = Math.min(baseTop + offset, maxTop);

  win.style.left = `${left}px`;
  win.style.top = `${top}px`;
  win.dataset.positioned = 'true';
  windowSpawnIndex += 1;
}

function openWindow(name) {
  const win = windows.get(name);
  if (!win) return;
  if (win.hidden) {
    win.hidden = false;
    requestAnimationFrame(() => {
      positionWindowIfNeeded(win);
      clampWindowToWorkspace(win);
    });
  } else {
    positionWindowIfNeeded(win);
    clampWindowToWorkspace(win);
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
  updateTaskbarOverflow();
}

function toggleWindowFromTaskbar(name) {
  const win = windows.get(name);
  if (!win) return;

  if (win.hidden) {
    win.hidden = false;
    ensureTaskbarItem(name);
    requestAnimationFrame(() => {
      positionWindowIfNeeded(win);
      clampWindowToWorkspace(win);
    });
    bringWindowToFront(win);
    loadWindowContent(name);
  } else if (win.classList.contains('is-active')) {
    win.hidden = true;
    win.classList.remove('is-active');
    deactivateTaskbarItem(name);
  } else {
    positionWindowIfNeeded(win);
    clampWindowToWorkspace(win);
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

function clampIconGridPosition(icon, col, row) {
  if (!workspace) {
    return { col, row };
  }

  const rect = workspace.getBoundingClientRect();
  const iconWidth = icon.offsetWidth || 0;
  const iconHeight = icon.offsetHeight || 0;

  const maxCol = rect.width ? Math.max(Math.floor((rect.width - iconWidth) / ICON_GRID_WIDTH), 0) : 0;
  const maxRow = rect.height ? Math.max(Math.floor((rect.height - iconHeight) / ICON_GRID_HEIGHT), 0) : 0;

  return {
    col: Math.min(Math.max(col, 0), maxCol),
    row: Math.min(Math.max(row, 0), maxRow),
  };
}

function applyIconPosition(icon, col, row) {
  const { col: nextCol, row: nextRow } = clampIconGridPosition(icon, col, row);
  icon.dataset.gridX = String(nextCol);
  icon.dataset.gridY = String(nextRow);
  icon.style.left = `${nextCol * ICON_GRID_WIDTH}px`;
  icon.style.top = `${nextRow * ICON_GRID_HEIGHT}px`;
}

function layoutIcons() {
  if (!workspace) return;
  const rect = workspace.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  icons.forEach((icon) => {
    const col = Number.parseInt(icon.dataset.gridX ?? '0', 10) || 0;
    const row = Number.parseInt(icon.dataset.gridY ?? '0', 10) || 0;
    applyIconPosition(icon, col, row);
  });
}

function initializeIconDragging(icon) {
  let pointerId = null;
  let offsetX = 0;
  let offsetY = 0;

  icon.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    pointerId = event.pointerId;
    icon.setPointerCapture(pointerId);
    icon.classList.add('is-dragging');
    const rect = icon.getBoundingClientRect();
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;
  });

  icon.addEventListener('pointermove', (event) => {
    if (pointerId === null || event.pointerId !== pointerId || !workspace) return;
    const rect = workspace.getBoundingClientRect();
    const iconWidth = icon.offsetWidth;
    const iconHeight = icon.offsetHeight;
    let left = event.clientX - rect.left - offsetX;
    let top = event.clientY - rect.top - offsetY;

    const maxLeft = Math.max(rect.width - iconWidth, 0);
    const maxTop = Math.max(rect.height - iconHeight, 0);

    left = Math.min(Math.max(left, 0), maxLeft);
    top = Math.min(Math.max(top, 0), maxTop);

    const col = Math.round(left / ICON_GRID_WIDTH);
    const row = Math.round(top / ICON_GRID_HEIGHT);
    applyIconPosition(icon, col, row);
  });

  const endDrag = (event) => {
    if (pointerId === null || event.pointerId !== pointerId) return;
    icon.releasePointerCapture(pointerId);
    pointerId = null;
    icon.classList.remove('is-dragging');

    const col = Number.parseInt(icon.dataset.gridX ?? '0', 10) || 0;
    const row = Number.parseInt(icon.dataset.gridY ?? '0', 10) || 0;
    applyIconPosition(icon, col, row);
  };

  icon.addEventListener('pointerup', endDrag);
  icon.addEventListener('pointercancel', endDrag);
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

    initializeIconDragging(icon);
  });

  layoutIcons();
}

function initializeStartMenu() {
  renderSearchResults('');

  startButton?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleStartPanel();
  });

  startSearchInput?.addEventListener('input', () => {
    renderSearchResults(startSearchInput.value);
  });

  startSearchInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      const firstResult = startResults?.querySelector('.start-menu__result');
      if (firstResult) {
        event.preventDefault();
        firstResult.click();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeStartPanel();
      startButton?.focus();
    }
  });

  logoutButton?.addEventListener('click', () => {
    logoutUser();
  });

  overflowButton?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleOverflowMenu();
  });

  document.addEventListener('click', (event) => {
    if (startPanel && !startPanel.hidden) {
      const target = event.target;
      if (target instanceof Node && !startPanel.contains(target) && target !== startButton) {
        closeStartPanel();
      }
    }
    if (overflowMenu && !overflowMenu.hidden) {
      const target = event.target;
      if (target instanceof Node && !overflowMenu.contains(target) && target !== overflowButton) {
        closeOverflowMenu();
      }
    }
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

async function loadHTMLDocument(path) {
  if (htmlCache.has(path)) {
    return htmlCache.get(path);
  }

  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Unable to load ${path}: ${response.status}`);
  }

  const rawHTML = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHTML, 'text/html');
  const root = doc.querySelector('[data-document]') || doc.body;
  const dataset = { ...root.dataset };
  const markup = root.outerHTML.trim();
  const result = { markup, dataset };
  htmlCache.set(path, result);
  return result;
}

function parseTagList(value) {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

async function loadPortfolioEntry(fileName) {
  if (portfolioCache.has(fileName)) {
    return portfolioCache.get(fileName);
  }

  const path = `assets/portfolio/${encodeURIComponent(fileName)}`;
  const { markup, dataset } = await loadHTMLDocument(path);
  const entry = {
    title: dataset.title?.trim() || fileName,
    summary: dataset.summary?.trim() || '',
    tags: parseTagList(dataset.tags),
    link: dataset.link?.trim() || '',
    bodyHTML: markup,
    hasBody: Boolean(markup && markup.trim().length),
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

  const activePortfolioButton = portfolioButtons.find((button) => button.dataset.file === fileName);
  portfolioTitle.textContent = activePortfolioButton?.textContent.trim() || fileName;
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
    const fallbackButton = portfolioButtons.find((button) => button.dataset.file === fileName);
    portfolioTitle.textContent = fallbackButton?.textContent.trim() || fileName;
    portfolioSummary.textContent = 'Unable to load portfolio file. Please try again later.';
    portfolioTags.innerHTML = '';
    disablePortfolioLink();
    portfolioLink.textContent = 'Unavailable';
    portfolioBody.innerHTML = '<p>Retro OS could not read this file. Please try again later.</p>';
  }
}

async function ensureHTMLTargetLoaded(key) {
  const path = htmlSources.get(key);
  const target = htmlTargets.get(key);

  if (!path || !target) {
    return;
  }

  if (target.dataset.loaded === 'true' || target.dataset.loading === 'true') {
    return;
  }

  target.dataset.loading = 'true';
  target.innerHTML = '<p>Loading file…</p>';

  try {
    const { markup } = await loadHTMLDocument(path);
    target.innerHTML = markup?.trim().length ? markup : '<p>This file is currently empty.</p>';
    target.dataset.loaded = 'true';
  } catch (error) {
    console.error(error);
    target.innerHTML = '<p>Retro OS could not read this file. Please try again later.</p>';
  } finally {
    delete target.dataset.loading;
  }
}

async function loadContactWindow() {
  const target = htmlTargets.get('contact');
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
    const { markup, dataset } = await loadHTMLDocument(CONTACT_SOURCE);
    contactEntry = {
      bodyHTML: markup?.trim().length ? markup : '<p>Contact details are coming soon.</p>',
      metadata: dataset,
      summary: dataset.summary?.trim() || '',
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
      const email = dataset.email?.trim();
      if (email) {
        contactEmailLink.href = `mailto:${email}`;
        contactEmailLink.hidden = false;
      } else {
        contactEmailLink.hidden = true;
      }
    }

    if (contactLinkedInLink) {
      const profile = dataset.linkedin?.trim();
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

  const activeBlogButton = blogButtons.find((button) => button.dataset.blogEntry === fileName);
  blogTitle.textContent = activeBlogButton?.textContent.trim() || fileName;
  blogSummary.textContent = 'Loading entry…';
  blogTags.innerHTML = '';
  blogBody.innerHTML = '<p>Loading file…</p>';

  try {
    const path = `assets/blog/${encodeURIComponent(fileName)}`;
    const { markup, dataset } = await loadHTMLDocument(path);
    if (blogRequestToken !== requestId) {
      return;
    }

    const normalizedTags = parseTagList(dataset.tags);

    blogTitle.textContent = dataset.title?.trim() || fileName;
    blogSummary.textContent = dataset.summary?.trim() || 'This post is still being written.';
    blogTags.innerHTML = '';

    if (normalizedTags.length) {
      normalizedTags.forEach((tag) => {
        const item = document.createElement('li');
        item.textContent = tag;
        blogTags.append(item);
      });
    }

    blogBody.innerHTML = markup?.trim().length ? markup : '<p>This post is still being written.</p>';
  } catch (error) {
    if (blogRequestToken !== requestId) {
      return;
    }

    console.error(error);
    const fallbackButton = blogButtons.find((button) => button.dataset.blogEntry === fileName);
    blogTitle.textContent = fallbackButton?.textContent.trim() || fileName;
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

  if (htmlSources.has(name)) {
    ensureHTMLTargetLoaded(name);
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
  startButton?.removeAttribute('disabled');
  renderSearchResults(startSearchInput?.value || '');
  requestAnimationFrame(() => {
    layoutIcons();
    clampWindowsToWorkspace();
    updateTaskbarOverflow();
  });
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
      if (startPanel && !startPanel.hidden) {
        closeStartPanel();
        startButton?.focus();
      }
      if (overflowMenu && !overflowMenu.hidden) {
        closeOverflowMenu();
        overflowButton?.focus();
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
  initializeStartMenu();
  initializePortfolio();
  initializeModals();
  updateClock();
  setInterval(updateClock, 60 * 1000);
  updateTaskbarOverflow();
}

window.addEventListener('resize', () => {
  layoutIcons();
  clampWindowsToWorkspace();
  updateTaskbarOverflow();
});

initializeApp();
