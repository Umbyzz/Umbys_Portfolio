# Adding model images

The site still uses index.html, style.css, script.js and your existing images folder. No build step is needed.

For extra shots, simply put numbered images in that model's existing folder. No HTML edits are needed.

```text
images/weapons/Terrablade1.png
images/weapons/Terrablade2.jpg
images/weapons/Terrablade3.webp
...
images/weapons/Terrablade10.png
```

Start at 1. Image 1 becomes the card cover, and the album follows numeric order through 10. Gaps are fine after 1. Use lowercase extensions: jpg, jpeg, png, gif or webp. You can mix formats.

The name is the model title with spaces and punctuation removed: `SinnromScythe1.png`, `WitheredFoxy1.png`, `PixLucky1.png`. Lowercase title names and the existing filename stem also work, such as `terrablade1.png` or `sinnrom-scythe1.png`. Keep one naming style throughout an album. On GitHub, capitalization must match.

Keep the images in the current model folder: Weapons use images/weapons, character models use images/fullbody, and Scrapped Lantern uses images/misc. Toy Knife still uses images/misc, despite being displayed under Weapons.

When a numbered set exists, it replaces the old unnumbered cover in the album. If there is no numbered image 1, the existing unnumbered picture still works. You can leave that original file in place. The older optional `data-images` list still works, but is not needed for numbered albums.

Models with extra shots get a stacked-card hint and an image count. Click or tap to open the album, then choose a shot to enlarge it. Escape or the close button closes the current view. Models with one image open directly in the enlarged view. Albums work in all three model categories. Images are discovered as cards approach the screen, so the count may take a moment to appear.

The existing 17 models are preserved. Scrapped Lantern is now under Object models. Toy Knife remains under Weapons. No extra shots were supplied, so no albums are populated yet.

Portfolio contains About, Weapons, Objects and Character Models. Pricing & socials contains the price card, terms and contact links. The top buttons switch sectors with a short fade/slide; each sector scrolls normally. Reduced-motion settings disable the transition.

The view buttons select 1, 2 or 3 models per row and remember the choice on that browser. A first visit defaults to one column on phones and two on desktop.

Rename images/backround.mp4 to images/background.mp4 as planned to enable the video background.
