// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');

if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
        const isOpen = navMenu.classList.toggle('open');
        navToggle.setAttribute('aria-expanded', isOpen);
    });

    navMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('open');
            navToggle.setAttribute('aria-expanded', 'false');
        });
    });
}

// Show a placeholder for any model image that hasn't been added yet,
// instead of a broken image icon. This also auto-detects file format —
// if a card references "sinnrom-scythe.jpg" but you actually uploaded
// "sinnrom-scythe.png" or ".gif", it'll try those automatically before
// giving up and showing the placeholder.
const IMAGE_EXT_CANDIDATES = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

function showMissingPlaceholder(img) {
    const frame = img.closest('.model-frame');
    const label = img.alt || 'Image not added yet';
    frame.classList.add('missing');
    frame.setAttribute('data-label', label);
    img.remove();
}

document.querySelectorAll('.model-frame img').forEach(img => {
    const originalSrc = img.getAttribute('src');
    const dotIndex = originalSrc.lastIndexOf('.');
    const base = dotIndex !== -1 ? originalSrc.slice(0, dotIndex) : originalSrc;
    const originalExt = dotIndex !== -1 ? originalSrc.slice(dotIndex + 1).toLowerCase() : '';
    const remaining = IMAGE_EXT_CANDIDATES.filter(ext => ext !== originalExt);
    let i = 0;

    img.addEventListener('error', function tryNextExtension() {
        if (i >= remaining.length) {
            img.removeEventListener('error', tryNextExtension);
            showMissingPlaceholder(img);
            return;
        }
        img.src = `${base}.${remaining[i++]}`;
    });
});

// Background gif/image/video, fully automatic — no code editing needed.
// Just add ONE of these files to your images/ folder and refresh:
//   images/background.mp4  or  .webm   (rendered as a muted looping video)
//   images/background.gif, .png, .jpg, or .webp   (rendered as a still/animated image)
(function loadBackgroundMedia() {
    const target = document.getElementById('bgMedia');
    if (!target) return;

    const candidates = [
        { file: 'images/background.mp4', video: true },
        { file: 'images/background.webm', video: true },
        { file: 'images/background.gif', video: false },
        { file: 'images/background.png', video: false },
        { file: 'images/background.jpg', video: false },
        { file: 'images/background.jpeg', video: false },
        { file: 'images/background.webp', video: false }
    ];

    function tryNext(i) {
        if (i >= candidates.length) return;
        const { file, video } = candidates[i];

        if (video) {
            const v = document.createElement('video');
            v.src = file;
            v.muted = true;
            v.loop = true;
            v.playsInline = true;
            v.oncanplay = () => {
                v.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;';
                target.appendChild(v);
                target.classList.add('active');
                v.play().catch(() => {});
            };
            v.onerror = () => tryNext(i + 1);
        } else {
            const img = new Image();
            img.onload = () => {
                target.style.backgroundImage = `url('${file}')`;
                target.classList.add('active');
            };
            img.onerror = () => tryNext(i + 1);
            img.src = file;
        }
    }

    tryNext(0);
})();

// Reveal-on-scroll for sections and model cards
const revealElements = document.querySelectorAll(".section, .model-card");

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add("visible");
        }
    });
}, {
    threshold: 0.1
});

revealElements.forEach((element) => {
    observer.observe(element);
});

// Lightbox — click to see a model image at full size instead of
// cropped inside its small card. Closes via the × button, clicking
// the backdrop, or pressing Esc — no auto-open/close, click only.
(function setupLightbox() {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const closeBtn = document.getElementById('lightboxClose');
    if (!lightbox || !lightboxImg || !closeBtn) return;

    function open(src, alt) {
        lightboxImg.src = src;
        lightboxImg.alt = alt || '';
        lightbox.classList.add('active');
        lightbox.setAttribute('aria-hidden', 'false');
    }

    function close() {
        lightbox.classList.remove('active');
        lightbox.setAttribute('aria-hidden', 'true');
    }

    // Only wire up images that actually loaded (missing/placeholder
    // frames have no <img> left after script.js's fallback logic runs).
    document.querySelectorAll('.model-frame img').forEach(img => {
        img.addEventListener('click', () => open(img.currentSrc || img.src, img.alt));
    });

    closeBtn.addEventListener('click', close);
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) close();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close();
    });
})();