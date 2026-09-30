// Model cards and albums are generated automatically from the images folders.
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const portfolio = document.getElementById('portfolio');
const commission = document.getElementById('commission');
const contributions = document.getElementById('contributions');
const sectors = [portfolio, commission, contributions];
let currentSector;
let routeVersion = 0;
let animations = [];
async function route() {
    const version = ++routeVersion;
    animations.forEach(animation => animation.cancel());
    animations = [];
    const hash = location.hash.slice(1);
    const next = hash === 'pricing' ? commission : hash === 'contributions' ? contributions : portfolio;
    const changed = currentSector !== next;
    const direction = sectors.indexOf(next) > sectors.indexOf(currentSector) ? 1 : -1;
    const animate = changed && currentSector && !motion.matches;
    document.querySelectorAll('[data-sector]').forEach(link => {
        if (link.dataset.sector === (next === portfolio ? 'portfolio' : next === commission ? 'pricing' : 'contributions')) link.setAttribute('aria-current', 'page');
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
function enlarge(src, alt) {
    fullImage.src = src;
    fullImage.alt = alt;
    document.getElementById('imageCaption').textContent = alt;
    lightbox.showModal();
}
function closePreview(dialog) {
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
    const img = card.querySelector('img');
    const frame = card.querySelector('.model-frame');
    const title = card.querySelector('strong').textContent;
    let extras = [];
    try { extras = JSON.parse(card.dataset.images || '[]'); } catch {}
    const sources = [...new Set([img.getAttribute('src'), ...(Array.isArray(extras) ? extras : [])])];
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'model-open' + (sources.length > 1 ? ' has-album' : '');
    trigger.setAttribute('aria-label', sources.length > 1 ? `Open ${title} album, ${sources.length} images` : `Enlarge ${title}`);
    trigger.setAttribute('aria-haspopup','dialog');
    frame.before(trigger);
    trigger.append(frame);
    if (sources.length > 1) {
        const badge = document.createElement('span');
        badge.className = 'album-count';
        badge.textContent = `▱ ${sources.length} images`;
        trigger.append(badge);
    }
    img.addEventListener('error', () => {
        frame.classList.add('missing');
        frame.dataset.label = `${title} — image unavailable`;
        img.hidden = true;
        if (sources.length === 1) trigger.disabled = true;
    });
    trigger.addEventListener('click', () => {
        if (album.open || lightbox.open) return;
        if (sources.length === 1) return enlarge(sources[0],img.alt);
        document.getElementById('albumTitle').textContent = title;
        document.getElementById('albumCaption').textContent = card.querySelector('.model-caption > span:last-child').textContent;
        const container = document.getElementById('albumImages');
        container.replaceChildren();
        sources.forEach((src,index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.setAttribute('aria-label',`Enlarge ${title}, image ${index+1}`);
            const shot = document.createElement('img');
            shot.alt = `${title} — image ${index+1}`;
            shot.onerror = () => {button.disabled = true;button.textContent = 'Image unavailable';};
            shot.src = src;
            button.append(shot);
            container.append(button);
            button.addEventListener('click',() => {if (!lightbox.open) enlarge(src,shot.alt);});
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
        image.onerror = () => image.remove();
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
