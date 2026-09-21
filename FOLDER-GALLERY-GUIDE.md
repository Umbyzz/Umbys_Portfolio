# Drop images in, get model cards

## Your normal workflow

1. Drop pictures into `images/weapons`, `images/Object`, or `images/fullbody`.
2. Commit and push/upload the changes to GitHub.
3. The included GitHub workflow scans the folders and publishes the updated website.

For example, `images/Object/ball1.png`, `ball2.jpg`, and `ball10.png` become one **Ball** card with images in numeric order. A lone `ball.png` also creates a card. There is no longer a 10-image limit. JPG, JPEG, PNG, GIF, WebP and AVIF are supported, including uppercase extensions.

Use one model name per group. Spaces, hyphens and underscores in new model names become readable titles. Trailing digits are interpreted as image numbers. A subfolder bundle also works: `images/Object/Ball/1.png`, `2.png`, etc. An empty model folder creates no card.

When numbered shots exist, they replace that model's unnumbered cover in the album. Removing a file removes it from the next generated album; removing every file removes its card. Moving the files to another category folder moves the card.

Existing names, descriptions and credits are preserved in `tools/model-details.json`. New models receive a title automatically and no invented description. That optional metadata file is where custom captions can be added later.

## One-time GitHub setup

Upload the entire update, including `tools` and `.github/workflows/gallery-pages.yml`, alongside your existing images. In the repository, choose **Settings → Pages → Build and deployment → Source → GitHub Actions**. Then push a change to `main` or run **Build gallery and publish portfolio** from the Actions tab.

The workflow generates the gallery and publishes it. No external account or visitor counter is involved. Merely dropping a file on your computer does not update the public site until you commit/push it.

GitHub's setup instructions: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Local drag-and-drop preview

Double-click `START-PREVIEW.cmd` (requires Node.js LTS). Keep its window open. Add images to your folders and refresh the browser: the local preview rescans on every refresh.

The preview is at http://127.0.0.1:8767. Opening index.html directly shows the last generated gallery; use the launcher for live folder discovery. To update the saved HTML manually, run `node tools/generate-gallery.cjs` from the website folder.

Albums and enlarged pictures fade and gently shrink on close, including the × button, Escape, and clicking outside. Reduced-motion preferences skip the animation.

## Contributions
Edit contributions.js to add projects. Each entry has title, description, tag, image (optional), and an HTTPS url. Copy an existing entry to add another. Project cards show a departure prompt before opening their link in a new tab. Include contributions.js when uploading the website.

