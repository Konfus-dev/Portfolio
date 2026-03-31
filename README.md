# Jeremy Hummel · Portfolio

A simple and sleek developer portfolio showcasing my skills and work.

## Blog authoring

The blog lives on `blog.html` and is powered by markdown files in `blog/posts/`.

### Add a new post
1. Create a markdown file under a category folder, for example:
   - `blog/posts/Toybox Dev Log/MyNewEntry.md`
2. Add optional front matter at the top of the file:

```md
---
title: My post title
date: 2026-03-25
summary: One-line summary shown on the landing page.
---
```

3. Register the post path in `blog/posts.json` (relative to `blog/posts/`):

```json
{
  "posts": [
    "Toybox Dev Log/MyNewEntry.md"
  ]
}
```

### Categories
- Categories are inferred from folder names.
- Example: `Toybox Dev Log/DevLog1.md` appears under **Toybox Dev Logs**.

### Markdown links and images
- Links to other markdown files (like `[next](OtherPost.md)`) open in the blog reader.
- Relative image paths are supported, e.g. `![alt](../../gifs/example.gif)`.
