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
// instead of a broken image icon. Drop your real photo in at the same
// path (same filename) and this placeholder disappears automatically.
document.querySelectorAll('.model-frame img').forEach(img => {
    img.addEventListener('error', () => {
        const frame = img.closest('.model-frame');
        const label = img.alt || 'Image not added yet';
        frame.classList.add('missing');
        frame.setAttribute('data-label', label);
        img.remove();
    }, { once: true });
});

// Avatar: fall back to a plain "U" if images/avatar.png hasn't been added yet.
const avatarImg = document.getElementById('avatarImg');
const avatarFrame = document.getElementById('avatarFrame');
if (avatarImg && avatarFrame) {
    avatarImg.addEventListener('error', () => {
        avatarFrame.classList.add('missing');
        avatarFrame.textContent = 'U';
        avatarImg.remove();
    }, { once: true });
}

// Background gif/video, fully automatic — no code editing needed.
// Just add ONE of these files to your images/ folder and refresh:
//   images/background.gif
//   images/background.mp4  (rendered as a muted looping video)
//   images/background.webm
(function loadBackgroundMedia() {
    const target = document.getElementById('bgMedia');
    if (!target) return;

    const candidates = [
        { file: 'images/background.mp4', video: true },
        { file: 'images/background.webm', video: true },
        { file: 'images/background.gif', video: false }
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