const landing = document.getElementById('blog-landing');
const recentList = document.getElementById('blog-recent-list');
const categoryList = document.getElementById('blog-category-list');
const postView = document.getElementById('blog-post-view');
const postTitle = document.getElementById('blog-post-title');
const postDate = document.getElementById('blog-post-date');
const postCategory = document.getElementById('blog-post-category');
const postBody = document.getElementById('blog-post-body');
const allPostsList = document.getElementById('blog-all-posts-list');
const blogFilter = document.getElementById('blog-filter');

function titleCase(value) {
  return value
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function categoryFromPath(postPath) {
  const categoryFolder = postPath.includes('/') ? postPath.split('/')[0] : 'General';
  const formatted = titleCase(categoryFolder);
  return formatted.endsWith('s') ? formatted : `${formatted}s`;
}

function parseFrontMatter(markdown) {
  const frontMatterMatch = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
  const metadata = {};
  let body = markdown;

  if (frontMatterMatch) {
    body = markdown.slice(frontMatterMatch[0].length);
    frontMatterMatch[1].split('\n').forEach((line) => {
      const [rawKey, ...rawValue] = line.split(':');
      if (!rawKey || rawValue.length === 0) return;
      metadata[rawKey.trim()] = rawValue.join(':').trim();
    });
  }

  return { metadata, body };
}

function excerptFromMarkdown(markdown) {
  const clean = markdown
    .replace(/^#+\s+/gm, '')
    .replace(/!\[[^\]]*\]\([^\)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^\)]*\)/g, '$1')
    .replace(/[>*_`-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.slice(0, 180) + (clean.length > 180 ? '…' : '');
}

function normalizePostPath(path) {
  return path.replace(/^\.\//, '').replace(/\\/g, '/');
}

function resolveMarkdownRelativePath(basePostPath, href) {
  const baseFolder = basePostPath.split('/').slice(0, -1).join('/');
  const normalized = `${baseFolder}/${href}`.split('/');
  const stack = [];

  normalized.forEach((part) => {
    if (!part || part === '.') return;
    if (part === '..') {
      stack.pop();
      return;
    }
    stack.push(part);
  });

  return stack.join('/');
}

function formatDate(dateInput) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return dateInput;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function buildPostCard(post) {
  const card = document.createElement('article');
  card.className = 'blog-post-card';
  card.innerHTML = `
    <p class="eyebrow">${post.category}</p>
    <h3><a href="blog.html?post=${encodeURIComponent(post.path)}">${post.title}</a></h3>
    <p>${post.summary}</p>
    <p class="blog-post-card__date">${formatDate(post.date)}</p>
  `;
  return card;
}

function buildAllPosts(posts) {
  const fragment = document.createDocumentFragment();
  posts.forEach((post) => {
    const item = document.createElement('li');
    item.innerHTML = `<a href="blog.html?post=${encodeURIComponent(post.path)}">${post.title}</a><span>${formatDate(post.date)}</span>`;
    fragment.appendChild(item);
  });
  allPostsList.appendChild(fragment);
}

function buildCategoryNavigation(posts) {
  const byCategory = posts.reduce((acc, post) => {
    if (!acc[post.category]) acc[post.category] = [];
    acc[post.category].push(post);
    return acc;
  }, {});

  const fragment = document.createDocumentFragment();

  Object.entries(byCategory)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([category, categoryPosts]) => {
      const section = document.createElement('section');
      section.className = 'blog-category-group';

      const heading = document.createElement('h3');
      heading.textContent = category;
      section.appendChild(heading);

      const list = document.createElement('ul');
      categoryPosts
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .forEach((post) => {
          const item = document.createElement('li');
          item.innerHTML = `<a href="blog.html?post=${encodeURIComponent(post.path)}">${post.title}</a>`;
          list.appendChild(item);
        });

      section.appendChild(list);
      fragment.appendChild(section);
    });

  categoryList.appendChild(fragment);
}

function isNonMarkdownHref(href) {
  return (
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:') ||
    href.startsWith('#')
  );
}

function rewritePostLinks(container, postPath) {
  const links = container.querySelectorAll('a[href]');
  links.forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || isNonMarkdownHref(href)) return;

    if (href.endsWith('.md')) {
      const resolved = resolveMarkdownRelativePath(postPath, href);
      link.href = `blog.html?post=${encodeURIComponent(resolved)}`;
      return;
    }

    const resolved = resolveMarkdownRelativePath(postPath, href);
    link.href = `blog/posts/${resolved}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  });

  const images = container.querySelectorAll('img[src]');
  images.forEach((image) => {
    const src = image.getAttribute('src');
    if (!src || isNonMarkdownHref(src) || src.startsWith('/')) return;
    image.src = `blog/posts/${resolveMarkdownRelativePath(postPath, src)}`;
    image.loading = 'lazy';
  });
}

function renderPost(post) {
  landing.hidden = true;
  postView.hidden = false;
  postTitle.textContent = post.title;
  postDate.textContent = formatDate(post.date);
  postCategory.textContent = post.category;
  postBody.innerHTML = marked.parse(post.content, { gfm: true, breaks: true });
  rewritePostLinks(postBody, post.path);
}

function filterPosts(posts, value) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return posts;
  return posts.filter((post) =>
    [post.title, post.summary, post.category].join(' ').toLowerCase().includes(normalized)
  );
}

function renderLanding(posts) {
  recentList.innerHTML = '';
  const fragment = document.createDocumentFragment();
  posts.slice(0, 8).forEach((post) => fragment.appendChild(buildPostCard(post)));
  recentList.appendChild(fragment);
}

async function loadPosts() {
  const manifestResponse = await fetch(encodeURI('blog/posts.json'));
  if (!manifestResponse.ok) {
    throw new Error(`Post manifest failed (${manifestResponse.status})`);
  }

  const manifest = await manifestResponse.json();
  const postPaths = manifest.posts || [];

  const posts = await Promise.all(
    postPaths.map(async (manifestPath) => {
      const path = normalizePostPath(manifestPath);
      const response = await fetch(encodeURI(`blog/posts/${path}`));
      if (!response.ok) {
        throw new Error(`Failed to load post: ${path}`);
      }

      const markdown = await response.text();
      const { metadata, body } = parseFrontMatter(markdown);
      const headingMatch = body.match(/^#\s+(.+)$/m);
      const title = metadata.title || headingMatch?.[1] || path.split('/').pop().replace('.md', '');

      return {
        path,
        category: categoryFromPath(path),
        title,
        date: metadata.date || '1970-01-01',
        summary: metadata.summary || excerptFromMarkdown(body),
        content: body,
      };
    })
  );

  return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
}

async function initBlog() {
  try {
    const posts = await loadPosts();

    if (!posts.length) {
      recentList.innerHTML = '<p>No posts found yet.</p>';
      return;
    }

    renderLanding(posts);
    buildAllPosts(posts);
    buildCategoryNavigation(posts);

    blogFilter?.addEventListener('input', () => {
      const filtered = filterPosts(posts, blogFilter.value);
      renderLanding(filtered);
    });

    const query = new URLSearchParams(window.location.search);
    const requestedPostPath = normalizePostPath(query.get('post') || '');

    if (requestedPostPath) {
      const post = posts.find((item) => item.path === requestedPostPath);
      if (post) {
        renderPost(post);
        return;
      }
    }

    renderPost(posts[0]);
  } catch (error) {
    recentList.innerHTML = `<p>Unable to load blog posts: ${error.message}</p>`;
  }
}

initBlog();
