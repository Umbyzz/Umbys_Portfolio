// Numbered albums: ModelName1.png through ModelName10.png, in the existing image folder.
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const portfolio = document.getElementById('portfolio');
const commission = document.getElementById('commission');
let currentSector;
let routeVersion = 0;
let animations = [];
async function route() {
    const version = ++routeVersion;
    animations.forEach(animation => animation.cancel());
    animations = [];
    const hash = location.hash.slice(1);
    const next = hash === 'pricing' ? commission : portfolio;
    const changed = currentSector !== next;
    const direction = next === commission ? 1 : -1;
    const animate = changed && currentSector && !motion.matches;
    document.querySelectorAll('[data-sector]').forEach(link => {
        if (link.dataset.sector === (next === portfolio ? 'portfolio' : 'pricing')) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
    });
    if (animate) {
        const outgoing = currentSector.animate([
            {opacity: 1, transform: 'translateX(0) scale(1)'},
            {opacity: 0, transform: 'translateX(' + (-direction * 46) + 'px) scale(.985)'}
        ], {duration: 180, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards'});
        animations.push(outgoing);
        await outgoing.finished.catch(() => {});
        if (version !== routeVersion) return;
    }
    portfolio.hidden = next !== portfolio;
    commission.hidden = next !== commission;
    currentSector = next;
    if (changed) window.scrollTo({top: 0, behavior: 'instant'});
    const target = document.getElementById(hash);
    if (target && next.contains(target)) target.scrollIntoView({behavior: changed || motion.matches ? 'instant' : 'smooth'});
    animations.forEach(animation => animation.cancel());
    animations = [];
    if (animate) {
        // Keep the gentle scale centered on what is visible, even in a long gallery.
        const origin = Math.max(0, innerHeight / 2 - next.getBoundingClientRect().top);
        const incoming = next.animate([
            {opacity: 0, transform: 'translateX(' + (direction * 54) + 'px) scale(.975)', transformOrigin: '50% ' + origin + 'px'},
            {opacity: 1, transform: 'translateX(' + (-direction * 3) + 'px) scale(1.004)', transformOrigin: '50% ' + origin + 'px', offset: .8},
            {opacity: 1, transform: 'translateX(0) scale(1)', transformOrigin: '50% ' + origin + 'px'}
        ], {duration: 440, easing: 'cubic-bezier(.16,1,.3,1)'});
        animations.push(incoming);
        await incoming.finished.catch(() => {});
        if (version === routeVersion) animations = [];
    }
}
// Delay anchor scrolling until the outgoing sector has finished fading.
document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const href = link.getAttribute('href');
    if (!document.getElementById(href.slice(1))) return;
    event.preventDefault();
    if (location.hash !== href) history.pushState(null, '', href);
    route();
});
window.addEventListener('hashchange', route);
motion.addEventListener('change', () => { if (motion.matches) route(); });
route();

let savedColumns;
try { savedColumns = localStorage.getItem('umby-columns'); } catch {}
function setColumns(value, save = true) {
    const columns = ['1', '2', '3'].includes(value) ? value : (matchMedia('(max-width: 800px)').matches ? '1' : '2');
    document.documentElement.style.setProperty('--columns', columns);
    document.querySelectorAll('[data-columns]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.columns === columns)));
    if (save) { try { localStorage.setItem('umby-columns', columns); } catch {} }
}
setColumns(savedColumns, false);
document.querySelectorAll('[data-columns]').forEach(button => button.addEventListener('click', () => setColumns(button.dataset.columns)));

const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
function loadImage(img, src, onMissing) {
    const dot = src.lastIndexOf('.');
    const base = dot < 0 ? src : src.slice(0, dot);
    const ext = dot < 0 ? '' : src.slice(dot + 1).toLowerCase();
    const candidates = [src, ...extensions.filter(item => item !== ext).map(item => `${base}.${item}`)];
    let index = 0;
    img.onerror = () => {
        if (++index < candidates.length) img.src = candidates[index];
        else { img.onerror = null; onMissing?.(); }
    };
    img.src = candidates[0];
    // Catch a cached failure that occurred before this script attached its handler.
    if (img.complete && !img.naturalWidth) img.onerror();
}
const album = document.getElementById('album');
const lightbox = document.getElementById('lightbox');
const fullImage = document.getElementById('lightboxImg');
function enlarge(src, alt) {
    fullImage.src = src;
    fullImage.alt = alt;
    document.getElementById('imageCaption').textContent = alt;
    lightbox.showModal();
}
for (const [dialog, closeId] of [[album, 'albumClose'], [lightbox, 'lightboxClose']]) {
    document.getElementById(closeId).addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
        const rect = dialog.getBoundingClientRect();
        if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
    });
}
// Discover numbered albums only as their cards approach the viewport.
// Use Terrablade1.png ... Terrablade10.png in the model's existing folder.
const imageProbeCache = new Map();
function probeImage(src) {
    if (!imageProbeCache.has(src)) imageProbeCache.set(src, new Promise(resolve => {
        const image = new Image();
        const timer = setTimeout(() => finish(null), 8000);
        function finish(value) { clearTimeout(timer); image.onload = image.onerror = null; resolve(value); }
        image.onload = () => finish(src);
        image.onerror = () => finish(null);
        image.src = src;
    }));
    return imageProbeCache.get(src);
}
async function findImage(base, preferred = '') {
    for (const ext of [...new Set([preferred, ...extensions].filter(Boolean))]) {
        const src = await probeImage(`${base}.${ext}`);
        if (src) return src;
    }
    return null;
}
async function discoverNumbered(original, title) {
    const folder = original.slice(0, original.lastIndexOf('/') + 1);
    const stem = original.slice(folder.length).replace(/\.[^.]+$/, '');
    const displayStem = title.replace(/[^a-zA-Z0-9]/g, '');
    const stems = [...new Set([displayStem, stem, displayStem.toLowerCase()])];
    for (const name of stems) {
        const first = await findImage(`${folder}${name}1`);
        if (!first) continue;
        const preferred = first.split('.').pop();
        // Keep numeric order and allow gaps, e.g. 1, 2, 4, 10.
        const rest = [];
        for (let number = 2; number <= 10; number += 3) {
            rest.push(...await Promise.all(Array.from({length: Math.min(3, 11 - number)}, (_, offset) => findImage(`${folder}${name}${number + offset}`, preferred))));
        }
        return [first, ...rest.filter(Boolean)];
    }
    return [];
}
const cardInitializers = new WeakMap();
const albumObserver = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
        albumObserver.unobserve(entry.target);
        cardInitializers.get(entry.target)();
    }
}, {rootMargin: '300px'});
document.querySelectorAll('.model-card').forEach(card => {
    const img = card.querySelector('img');
    const frame = card.querySelector('.model-frame');
    const title = card.querySelector('strong').textContent;
    const original = img.getAttribute('src');
    let extras = [];
    try { extras = JSON.parse(card.dataset.images || '[]'); } catch {}
    extras = Array.isArray(extras) ? extras.filter(src => typeof src === 'string' && src.trim()) : [];
    let sources = [];
    let ready;
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'model-open';
    trigger.setAttribute('aria-label', `Open ${title}`);
    trigger.setAttribute('aria-haspopup', 'dialog');
    frame.before(trigger);
    trigger.append(frame);
    const badge = document.createElement('span');
    badge.className = 'album-count';
    badge.hidden = true;
    trigger.append(badge);
    // Retain normal covers immediately; numbered shots may replace them below.
    loadImage(img, original, () => { img.hidden = true; });
    function initialize() {
        if (ready) return ready;
        ready = (async () => {
            const numbered = await discoverNumbered(original, title);
            const cover = numbered.length ? null : await findImage(original.replace(/\.[^.]+$/, ''), original.split('.').pop());
            sources = [...new Set([...numbered, ...(cover ? [cover] : []), ...extras].map(src => new URL(src, document.baseURI).href))];
            if (!sources.length) {
                frame.classList.add('missing');
                frame.dataset.label = `${title} — image not added yet`;
                img.hidden = true;
                trigger.disabled = true;
                return;
            }
            img.onerror = null;
            img.src = sources[0];
            img.hidden = false;
            trigger.classList.toggle('has-album', sources.length > 1);
            trigger.setAttribute('aria-label', sources.length > 1 ? `Open ${title} album, ${sources.length} images` : `Enlarge ${title}`);
            badge.textContent = `▱ ${sources.length} images`;
            badge.hidden = sources.length < 2;
        })();
        return ready;
    }
    cardInitializers.set(card, initialize);
    albumObserver.observe(card);
    trigger.addEventListener('click', async () => {
        trigger.setAttribute('aria-busy', 'true');
        badge.hidden = false;
        badge.textContent = 'Loading…';
        try { await initialize(); } finally {
            trigger.removeAttribute('aria-busy');
            badge.textContent = `▱ ${sources.length} images`;
            badge.hidden = sources.length < 2;
        }
        // The visitor may have changed sectors while images were being checked.
        if (!sources.length || card.closest('.sector').hidden || album.open || lightbox.open) return;
        if (sources.length === 1) return enlarge(sources[0], img.alt);
        document.getElementById('albumTitle').textContent = title;
        document.getElementById('albumCaption').textContent = card.querySelector('.model-caption > span:last-child').textContent;
        const container = document.getElementById('albumImages');
        container.replaceChildren();
        sources.forEach((src, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.setAttribute('aria-label', `Enlarge ${title}, image ${index + 1}`);
            const shot = document.createElement('img');
            shot.alt = `${title} — image ${index + 1}`;
            button.append(shot);
            container.append(button);
            loadImage(shot, src, () => { button.disabled = true; button.textContent = 'Image not available'; });
            button.addEventListener('click', () => enlarge(shot.currentSrc || shot.src, shot.alt));
        });
        album.showModal();
    });
});


// Optional background, checked in this order. Reduced motion uses still images.
(function background() {
    const target = document.getElementById('bgMedia');
    const files = motion.matches ? ['png', 'jpg', 'jpeg', 'webp'] : ['mp4', 'webm', 'gif', 'png', 'jpg', 'jpeg', 'webp'];
    function attempt(index) {
        if (index >= files.length) return;
        const ext = files[index];
        const src = `images/background.${ext}`;
        if (['mp4', 'webm'].includes(ext)) {
            const video = document.createElement('video');
            video.muted = true;
            video.loop = true;
            video.playsInline = true;
            video.oncanplay = () => {
                if (!video.isConnected) target.append(video);
                target.classList.add('active');
                video.play().catch(() => {});
            };
            video.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover';
            video.onerror = () => { video.remove(); attempt(index + 1); };
            video.src = src;
            motion.addEventListener('change', () => { if (motion.matches) video.pause(); else video.play().catch(() => {}); });
        } else {
            const image = new Image();
            image.onload = () => { target.style.backgroundImage = `url('${src}')`; target.classList.add('active'); };
            image.onerror = () => attempt(index + 1);
            image.src = src;
        }
    }
    attempt(0);
})();
