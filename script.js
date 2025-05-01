// Slider de cortes
const slider = document.querySelector('.cortes-slider');
const prevBtn = document.querySelector('.slider-btn.prev');
const nextBtn = document.querySelector('.slider-btn.next');

prevBtn.addEventListener('click', () => {
    slider.scrollBy({ left: -240, behavior: 'smooth' });
});

nextBtn.addEventListener('click', () => {
    slider.scrollBy({ left: 240, behavior: 'smooth' });
});

// Rolagem suave para os links do menu
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = document.querySelector(link.getAttribute('href'));
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// Animação de entrada com fade-in ao rolar
const fadeEls = document.querySelectorAll('.fade-in');
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('show');
        }
    });
}, { threshold: 0.1 });

fadeEls.forEach(el => observer.observe(el));
