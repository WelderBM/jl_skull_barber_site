// Slider de cortes
const slider = document.querySelector('.cortes-slider');
const prevBtn = document.querySelector('.slider-btn.prev');
const nextBtn = document.querySelector('.slider-btn.next');

prevBtn?.addEventListener('click', () => {
    slider?.scrollBy({ left: -240, behavior: 'smooth' });
});

nextBtn?.addEventListener('click', () => {
    slider?.scrollBy({ left: 240, behavior: 'smooth' });
});

// Rolagem suave para links do menu
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = document.querySelector(link.getAttribute('href'));
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
        document.querySelector('.nav-links')?.classList.remove('active');
    });
});

// Animação de fade-in nas seções ao rolar
const fadeEls = document.querySelectorAll('.fade-in');
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('show');
        }
    });
}, { threshold: 0.1 });

fadeEls.forEach(el => observer.observe(el));

// Menu hamburguer para mobile
const menuToggle = document.createElement('button');
menuToggle.innerHTML = '☰';
menuToggle.setAttribute('aria-label', 'Abrir menu');
menuToggle.classList.add('hamburger');

const logoContainer = document.querySelector('.logo-container');
logoContainer?.insertAdjacentElement('afterend', menuToggle);

menuToggle.addEventListener('click', () => {
    document.querySelector('.nav-links')?.classList.toggle('active');
});

const avaliacoes = [
    { nome: "André Costa", texto: "Fui muito bem atendido, recomendo demais!", estrelas: 5 },
    { nome: "Lucas Menezes", texto: "Ambiente aconchegante e barbeiro muito profissional.", estrelas: 4 },
    { nome: "Eduardo Lima", texto: "Voltei várias vezes, sempre saio satisfeito.", estrelas: 5 },
    { nome: "Fernanda Dias", texto: "Ambiente limpo e bem decorado!", estrelas: 5 },
    { nome: "Carlos Alberto", texto: "Preço justo e corte perfeito!", estrelas: 4 }
];

const porPagina = 3;
let paginaAtual = 1;

function getTotalPaginas() {
    return Math.ceil(avaliacoes.length / porPagina);
}

const container = document.getElementById("avaliacoes-container");
const paginaAtualSpan = document.getElementById("pagina-atual");
const btnAnterior = document.getElementById("prev-page");
const btnProxima = document.getElementById("next-page");

function renderAvaliacoes() {
    container.innerHTML = "";
    const totalPaginas = getTotalPaginas();
    const inicio = (paginaAtual - 1) * porPagina;
    const fim = inicio + porPagina;
    const pagina = avaliacoes.slice(inicio, fim);

    pagina.forEach(av => {
        const div = document.createElement("div");
        div.classList.add("avaliacao");
        div.innerHTML = `
      <p>"${av.texto}"</p>
      <strong>${av.nome}</strong>
      <div class="stars">${"★".repeat(av.estrelas)}${"☆".repeat(5 - av.estrelas)}</div>
    `;
        container.appendChild(div);
    });

    paginaAtualSpan.textContent = `${paginaAtual} / ${totalPaginas}`;
    btnAnterior.disabled = paginaAtual === 1;
    btnProxima.disabled = paginaAtual === totalPaginas;
}

btnAnterior.addEventListener("click", () => {
    if (paginaAtual > 1) {
        paginaAtual--;
        renderAvaliacoes();
    }
});

btnProxima.addEventListener("click", () => {
    if (paginaAtual < getTotalPaginas()) {
        paginaAtual++;
        renderAvaliacoes();
    }
});

renderAvaliacoes();
