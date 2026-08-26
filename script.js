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

// Show a placeholder for any image that hasn't been added yet,
// instead of a broken image icon. Drop your real photo in at the
// same path (same filename) and this placeholder disappears automatically.
document.querySelectorAll('.model-frame img').forEach(img => {
    img.addEventListener('error', () => {
        const frame = img.closest('.model-frame');
        const label = img.alt || 'Image not added yet';
        frame.classList.add('missing');
        frame.setAttribute('data-label', label);
        img.remove();
    }, { once: true });
});

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