const yearLabel = document.getElementById('year');

if (yearLabel) {
  yearLabel.textContent = new Date().getFullYear();
}

const landing = document.getElementById('blog-landing');
const recentList = document.getElementById('blog-recent-list');
const categoryList = document.getElementById('blog-category-list');
const postView = document.getElementById('blog-post-view');
const postTitle = document.getElementById('blog-post-title');
const postDate = document.getElementById('blog-post-date');
const postCategory = document.getElementById('blog-post-category');
const postBody = document.getElementById('blog-post-body');

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
    .replace(/\[[^\]]*\]\([^\)]*\)/g, '$1')
    .replace(/[>*_`-]/g, '')
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

function buildCategoryNavigation(posts) {
  const byCategory = posts.reduce((acc, post) => {
    if (!acc[post.category]) {
      acc[post.category] = [];
    }
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

function rewritePostLinks(container, postPath) {
  const links = container.querySelectorAll('a[href]');
  links.forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;
    if (href.endsWith('.md')) {
      const resolved = resolveMarkdownRelativePath(postPath, href);
      link.href = `blog.html?post=${encodeURIComponent(resolved)}`;
    }
  });

  const images = container.querySelectorAll('img[src]');
  images.forEach((image) => {
    const src = image.getAttribute('src');
    if (!src || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/')) return;
    image.src = `blog/posts/${resolveMarkdownRelativePath(postPath, src)}`;
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

async function loadPosts() {
  const manifestResponse = await fetch('blog/posts.json');
  const manifest = await manifestResponse.json();
  const postPaths = manifest.posts || [];

  const posts = await Promise.all(
    postPaths.map(async (manifestPath) => {
      const path = normalizePostPath(manifestPath);
      const response = await fetch(`blog/posts/${path}`);
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

    if (posts.length === 0) {
      recentList.innerHTML = '<p>No posts found yet.</p>';
      return;
    }

    const recentFragment = document.createDocumentFragment();
    posts.slice(0, 6).forEach((post) => recentFragment.appendChild(buildPostCard(post)));
    recentList.appendChild(recentFragment);

    buildCategoryNavigation(posts);

    const query = new URLSearchParams(window.location.search);
    const requestedPostPath = normalizePostPath(query.get('post') || '');

    if (requestedPostPath) {
      const post = posts.find((item) => item.path === requestedPostPath);
      if (post) {
        renderPost(post);
      }
    }
  } catch (error) {
    recentList.innerHTML = `<p>Unable to load blog posts: ${error.message}</p>`;
  }
}

initBlog();
