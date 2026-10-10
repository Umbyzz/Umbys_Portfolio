// Model cards and albums are generated automatically from the images folders.
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const portfolio = document.getElementById('portfolio');
const commission = document.getElementById('commission');
const contributions = document.getElementById('contributions');
const goofs = document.getElementById('more');
const sectors = [portfolio, commission, contributions, goofs];
let currentSector;
let routeVersion = 0;
let animations = [];
async function route() {
    const version = ++routeVersion;
    animations.forEach(animation => animation.cancel());
    animations = [];
    const hash = location.hash.slice(1);
    const next = hash === 'pricing' ? commission : hash === 'contributions' ? contributions : ['more', 'goofs', 'about'].includes(hash) ? goofs : portfolio;
    const changed = currentSector !== next;
    const direction = sectors.indexOf(next) > sectors.indexOf(currentSector) ? 1 : -1;
    const animate = changed && currentSector && !motion.matches;
    document.querySelectorAll('[data-sector]').forEach(link => {
        if (link.dataset.sector === (next === portfolio ? 'portfolio' : next === commission ? 'pricing' : next === contributions ? 'contributions' : 'more')) link.setAttribute('aria-current', 'page');
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
    sectors.forEach(sector => { sector.hidden = sector !== next; });
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

const album = document.getElementById('album');
const lightbox = document.getElementById('lightbox');
const fullImage = document.getElementById('lightboxImg');
const isVideo = src => /\.mp4(?:[?#]|$)/i.test(src);
const videoStage = document.createElement('div');
videoStage.className = 'video-stage';
videoStage.hidden = true;
const fullVideo = document.createElement('video');
fullVideo.controls = true;
fullVideo.playsInline = true;
fullVideo.preload = 'metadata';
const videoError = document.createElement('p');
videoError.hidden = true;
videoError.textContent = 'Video unavailable. Try an MP4 encoded with H.264.';
videoError.setAttribute('role', 'status');
const soundNotice = document.createElement('p');
soundNotice.className = 'sound-notice';
soundNotice.textContent = 'Has sound!';
soundNotice.hidden = true;
videoStage.append(soundNotice, fullVideo, videoError);
fullImage.after(videoStage);
fullVideo.addEventListener('error', () => { videoError.hidden = false; });
lightbox.addEventListener('close', () => fullVideo.pause());
let previewImages = [];
let previewIndex = 0;
const previewNav = document.createElement('div');
previewNav.className = 'preview-navigation';
previewNav.hidden = true;
const previousImage = document.createElement('button');
const nextImage = document.createElement('button');
const previewPosition = document.createElement('span');
previewPosition.setAttribute('aria-live', 'polite');
for (const [button, label, symbol] of [[previousImage, 'Previous image', '←'], [nextImage, 'Next image', '→']]) {
    button.type = 'button';
    button.className = 'preview-arrow';
    button.setAttribute('aria-label', label);
    button.textContent = symbol;
}
previewNav.append(previousImage, previewPosition, nextImage);
document.getElementById('imageCaption').after(previewNav);
function renderPreview() {
    const image = previewImages[previewIndex];
    fullVideo.pause();
    const video = isVideo(image.src);
    videoStage.hidden = !video;
    soundNotice.hidden = !video || !document.querySelector('.model-card[data-audio]') || !Array.from(document.querySelectorAll('.model-card[data-audio]')).some(card => {
        try { return JSON.parse(card.dataset.audio).includes(image.src); } catch { return false; }
    });
    (fullImage.closest('.image-stage') || fullImage).hidden = video;
    videoError.hidden = true;
    if (video) {
        fullVideo.src = image.src;
        fullVideo.setAttribute('aria-label', image.alt);
        fullVideo.load();
    } else {
        fullVideo.removeAttribute('src');
        fullVideo.load();
        fullImage.src = image.src;
        fullImage.alt = image.alt;
    }
    document.getElementById('imageCaption').textContent = image.alt;
    previewPosition.textContent = (previewIndex + 1) + ' / ' + previewImages.length;
    previewNav.hidden = previewImages.length < 2;
}
function stepPreview(direction) {
    if (!lightbox.open || lightbox.classList.contains('is-closing') || previewImages.length < 2) return;
    previewIndex = (previewIndex + direction + previewImages.length) % previewImages.length;
    renderPreview();
}
previousImage.addEventListener('click', () => stepPreview(-1));
nextImage.addEventListener('click', () => stepPreview(1));
lightbox.addEventListener('keydown', event => {
    if (event.target === fullVideo) return; // Native arrow keys seek the video.
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        stepPreview(event.key === 'ArrowLeft' ? -1 : 1);
    }
});
function enlarge(src, alt, images = [{src, alt}], index = 0) {
    previewImages = images;
    previewIndex = index;
    renderPreview();
    lightbox.showModal();
}
function closePreview(dialog) {
    if (dialog === lightbox) fullVideo.pause();
    if (!dialog.open || dialog.classList.contains('is-closing')) return;
    if (motion.matches) { dialog.close(); return; }
    dialog.classList.add('is-closing');
    let timeout;
    const finish = () => {
        clearTimeout(timeout);
        dialog.removeEventListener('animationend', onEnd);
        dialog.close();
        dialog.classList.remove('is-closing');
    };
    const onEnd = event => {
        if (event.target === dialog && event.animationName === 'preview-bubble-out') finish();
    };
    dialog.addEventListener('animationend', onEnd);
    timeout = setTimeout(finish, 260);
}
for (const [dialog, closeId] of [[album, 'albumClose'], [lightbox, 'lightboxClose'], [document.getElementById('externalLinkDialog'), 'externalClose']]) {
    document.getElementById(closeId).addEventListener('click', () => closePreview(dialog));
    dialog.addEventListener('cancel', event => { event.preventDefault(); closePreview(dialog); });
    dialog.addEventListener('click', event => {
        const rect = dialog.getBoundingClientRect();
        if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) closePreview(dialog);
    });
}
// The folder scanner writes each card and its exact album paths before publication.
document.querySelectorAll('.model-card').forEach(card => {
    const img = card.querySelector('img, video');
    const frame = card.querySelector('.model-frame');
    const title = card.querySelector('strong').textContent;
    let extras = [];
    try { extras = JSON.parse(card.dataset.images || '[]'); } catch {}
    const sources = [...new Set([img.getAttribute('src'), ...(Array.isArray(extras) ? extras : [])])];
    const videoCount = sources.filter(isVideo).length;
    const imageCount = sources.length - videoCount;
    const mediaLabel = [
        imageCount ? imageCount + 'IMG' : '',
        videoCount ? videoCount + 'VID' : ''
    ].filter(Boolean).join('/');
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'model-open' + (sources.length > 1 ? ' has-album' : '');
    trigger.setAttribute('aria-label', sources.length > 1 ? `Open ${title} album, ${mediaLabel}` : `Enlarge ${title}`);
    trigger.setAttribute('aria-haspopup','dialog');
    frame.before(trigger);
    trigger.append(frame);
    if (sources.length > 1) {
        const badge = document.createElement('span');
        badge.className = 'album-count';
        badge.textContent = mediaLabel;
        trigger.append(badge);
    }

    trigger.addEventListener('click', () => {
        if (album.open || lightbox.open) return;
        if (sources.length === 1) return enlarge(sources[0],img.alt || title);
        document.getElementById('albumTitle').textContent = title;
        document.getElementById('albumCaption').replaceChildren(...Array.from(card.querySelector('.model-caption > span:last-child').childNodes, node => node.cloneNode(true)));
        const container = document.getElementById('albumImages');
        container.replaceChildren();
        sources.forEach((src,index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.setAttribute('aria-label',`Enlarge ${title}, ${isVideo(src) ? "video" : "image"} ${index+1}`);
            const shot = document.createElement(isVideo(src) ? 'video' : 'img');
            if (isVideo(src)) { shot.muted = true; shot.playsInline = true; shot.preload = 'metadata'; }
            shot.alt = `${title} — image ${index+1}`;

            shot.src = src;
            button.append(shot);
            if (isVideo(src)) {
                const badge = document.createElement('span');
                badge.className = 'video-badge';
                badge.textContent = '▶ Video';
                button.append(badge);
            }
            button.style.setProperty('--shot-delay', Math.min(index * 85, 680) + 'ms');
            container.append(button);
            button.addEventListener('click',() => {if (!lightbox.open) enlarge(src,shot.alt,sources.map((source, i) => ({src: source, alt: title + (isVideo(source) ? " — video " : " — image ") + (i+1)})),index);});
        });
        album.showModal();
    });
});

// Muted looping background; attach before loading so browsers can buffer it.
(function background() {
    const target = document.getElementById('bgMedia');
    const loading = document.createElement('div');
    loading.className = 'background-loading';
    loading.textContent = 'Loading background…';
    document.body.append(loading);
    const files = ['mp4', 'webm', 'gif', 'png', 'jpg', 'jpeg', 'webp'];
    function attempt(index) {
        if (!target || index >= files.length) { loading.remove(); return; }
        const ext = files[index];
        const src = `images/background.${ext}`;
        if (['mp4', 'webm'].includes(ext)) {
            const video = document.createElement('video');
            video.defaultMuted = true;
            video.muted = true;
            video.volume = 0;
            video.loop = true;
            video.autoplay = !motion.matches;
            video.playsInline = true;
            video.preload = 'auto';
            video.setAttribute('muted', '');
            video.setAttribute('playsinline', '');
            video.setAttribute('aria-hidden', 'true');
            video.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover';
            const removeRetry = () => {
                document.removeEventListener('pointerdown', play);
                document.removeEventListener('keydown', play);
            };
            function play() {
                if (!video.isConnected || motion.matches || document.hidden) return;
                video.muted = true;
                video.volume = 0;
                video.play().then(removeRetry).catch(error => {
                    if (error.name === 'NotAllowedError') {
                        document.addEventListener('pointerdown', play);
                        document.addEventListener('keydown', play);
                    }
                });
            }
            const updateMotion = () => {
                video.autoplay = !motion.matches;
                if (motion.matches) { video.pause(); removeRetry(); }
                else play();
            };
            const visibility = () => { if (document.hidden) video.pause(); else play(); };
            video.onloadeddata = () => { target.classList.add('active'); loading.remove(); };
            video.oncanplay = play;
            video.onerror = () => {
                removeRetry();
                motion.removeEventListener('change', updateMotion);
                document.removeEventListener('visibilitychange', visibility);
                video.remove();
                target.classList.remove('active');
                attempt(index + 1);
            };
            motion.addEventListener('change', updateMotion);
            document.addEventListener('visibilitychange', visibility);
            target.append(video);
            video.src = src;
            video.load();
        } else {
            if (ext === 'gif' && motion.matches) return attempt(index + 1);
            const image = new Image();
            image.onload = () => { loading.remove(); target.style.backgroundImage = `url('${src}')`; target.classList.add('active'); };
            image.onerror = () => attempt(index + 1);
            image.src = src;
        }
    }
    attempt(0);
})();

// Contributions are kept in one small, editable file: contributions.js.
const projectGrid = document.getElementById('contributionGrid');
const exitDialog = document.getElementById('externalLinkDialog');
const exitContinue = document.getElementById('externalContinue');
for (const project of window.CONTRIBUTIONS || []) {
    const card = document.createElement('article');
    card.className = 'contribution-card';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'contribution-open';
    if (project.image) {
        const image = document.createElement('img');
        image.src = project.image;
        image.alt = '';
        image.loading = 'lazy';

        button.append(image);
    }
    const copy = document.createElement('span');
    copy.className = 'contribution-copy';
    for (const [className, text] of [['contribution-tag',project.tag],['contribution-title',project.title],['contribution-description',project.description]]) {
        const span = document.createElement('span');
        span.className = className;
        span.textContent = text || '';
        copy.append(span);
    }
    let destination;
    try { const parsed = new URL(project.url); if (parsed.protocol === 'https:') destination = parsed; } catch {}
    const hint = document.createElement('span');
    hint.className = 'contribution-hint';
    hint.textContent = destination ? 'Visit project ↗' : 'Project link coming soon';
    copy.append(hint);
    button.append(copy);
    button.disabled = !destination;
    button.setAttribute('aria-label', destination ? `Visit ${project.title} — opens an external-link prompt` : `${project.title} — project link coming soon`);
    button.addEventListener('click', () => {
        document.getElementById('externalProject').textContent = project.title;
        document.getElementById('externalDestination').textContent = destination.href;
        exitContinue.href = destination.href;
        exitDialog.showModal();
    });
    card.append(button);
    projectGrid.append(card);
}
document.getElementById('externalCancel').addEventListener('click', () => closePreview(exitDialog));
exitContinue.addEventListener('click', () => closePreview(exitDialog));

// Lightweight loading states for current and newly opened gallery images.
(function mediaLoading() {
    function indicator(host, label) {
        host.classList.add('media-host');
        const status = document.createElement('span');
        status.className = 'media-indicator';
        status.setAttribute('role', 'status');
        const pixels = document.createElement('span');
        pixels.className = 'loading-pixels';
        pixels.setAttribute('aria-hidden', 'true');
        const text = document.createElement('span');
        status.append(pixels, text);
        host.append(status);
        return state => {
            host.dataset.mediaState = state;
            host.setAttribute('aria-busy', String(state === 'loading'));
            status.hidden = state === 'ready';
            pixels.hidden = state === 'error';
            text.textContent = state === 'error' ? 'Image unavailable' : label;
        };
    }
    const tracked = new WeakMap();
    function watch(image) {
        if (tracked.has(image)) { tracked.get(image)(); return; }
        let host = image.parentElement;
        if (image.id === 'lightboxImg') {
            host = document.createElement('div');
            host.className = 'image-stage';
            image.before(host);
            host.append(image);
        }
        if (!host.matches('.model-frame, .album-images button, .contribution-open, .image-stage')) return;
        const set = indicator(host, 'Loading image…');
        const settle = () => set(image.naturalWidth ? 'ready' : 'error');
        const reset = () => {
            set('loading');
            if (image.getAttribute('src') && image.complete) settle();
        };
        tracked.set(image, reset);
        image.addEventListener('load', settle);
        image.addEventListener('error', () => set('error'));
        reset();
    }
    document.querySelectorAll('img').forEach(watch);
    new MutationObserver(records => {
        for (const record of records) {
            if (record.type === 'attributes') watch(record.target);
            else record.addedNodes.forEach(node => {
                if (node.nodeType !== 1) return;
                if (node.matches('img')) watch(node);
                node.querySelectorAll('img').forEach(watch);
            });
        }
    }).observe(document.body, {subtree: true, childList: true, attributes: true, attributeFilter: ['src']});
})();

// Edit the visible comms text in index.html; the dot follows open/closed wording.
const commissionStatus = document.querySelector('.commission-status');
if (commissionStatus) {
    const syncStatus = () => {
        const text = commissionStatus.textContent.toLowerCase();
        commissionStatus.dataset.status = /\bclosed\b/.test(text) ? 'closed' : /\bopen\b/.test(text) ? 'open' : 'unknown';
    };
    syncStatus();
    new MutationObserver(syncStatus).observe(commissionStatus, {childList: true, characterData: true, subtree: true});
}

// Click-to-copy rows (the Discord username). The name stays visible, so a failed copy is harmless.
document.querySelectorAll('[data-copy]').forEach(button => {
    const value = button.dataset.copy;
    const output = button.querySelector('.social-arrow');
    const original = output.textContent;
    let timer;
    async function copy() {
        try { await navigator.clipboard.writeText(value); return true; } catch {}
        const field = document.createElement('textarea');
        field.value = value;
        field.setAttribute('readonly', '');
        field.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
        document.body.append(field);
        field.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch {}
        field.remove();
        return ok;
    }
    button.addEventListener('click', async () => {
        const ok = await copy();
        clearTimeout(timer);
        output.textContent = ok ? 'Copied ✓' : original;
        timer = setTimeout(() => { output.textContent = original; }, 1600);
    });
});
