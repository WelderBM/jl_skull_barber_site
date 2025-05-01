import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    addDoc
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "SEU_AUTH_DOMAIN",
    projectId: "SEU_PROJECT_ID",
    storageBucket: "SEU_BUCKET",
    messagingSenderId: "SEU_SENDER_ID",
    appId: "SEU_APP_ID"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// gerar timeslots de 30 em 30 minutos (08:00–19:30)
const timeslots = [];
for (let h = 8; h <= 19; h++) {
    const hh = String(h).padStart(2, '0');
    timeslots.push(`${hh}:00`, `${hh}:30`);
}

// referências aos modais e botões
const btnOpen = document.getElementById("openAgendar");
const overlay = document.getElementById("modalOverlay");
const calModal = document.getElementById("calendarModal");
const tsModal = document.getElementById("timeslotModal");
const btnCloseCal = document.getElementById("closeCalendar");
const btnCloseTs = document.getElementById("closeTimeslot");

// abrir calendário
btnOpen.addEventListener("click", async () => {
    overlay.classList.remove("hidden");
    calModal.classList.remove("hidden");
    const today = new Date();
    const bookings = await loadAvailabilities(today.getMonth(), today.getFullYear());
    generateCalendar(today.getMonth(), today.getFullYear(), bookings);
});

// fechar modais
btnCloseCal.addEventListener("click", () => {
    calModal.classList.add("hidden");
    overlay.classList.add("hidden");
});
btnCloseTs.addEventListener("click", () => {
    tsModal.classList.add("hidden");
    overlay.classList.add("hidden");
});

// carregar reservas do mês
async function loadAvailabilities(month, year) {
    const ag = collection(db, "agendamentos");
    const start = new Date(year, month, 1).toISOString();
    const end = new Date(year, month + 1, 1).toISOString();
    const snap = await getDocs(
        query(ag,
            where("status", "==", "confirmado"),
            where("horario", ">=", start),
            where("horario", "<", end)
        )
    );
    const byDate = {};
    snap.forEach(doc => {
        const { horario } = doc.data();
        const date = horario.slice(0, 10);
        const time = horario.slice(11, 16);
        byDate[date] ||= [];
        byDate[date].push(time);
    });
    return byDate;
}

// montar calendário no modal
function generateCalendar(month, year, bookingsByDate) {
    const calEl = document.getElementById("calendar");
    calEl.innerHTML = "";
    ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"].forEach(d => {
        const w = document.createElement("div");
        w.textContent = d;
        w.style.fontWeight = "bold";
        calEl.appendChild(w);
    });
    const firstWeekday = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    for (let i = 0; i < firstWeekday; i++) {
        calEl.appendChild(document.createElement("div"));
    }

    for (let d = 1; d <= lastDate; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const curDate = new Date(year, month, d);
        const booked = bookingsByDate[dateStr] || [];
        const dayEl = document.createElement("div");
        dayEl.textContent = d;
        dayEl.classList.add("day");
        if (curDate >= todayStart && booked.length < timeslots.length) {
            dayEl.classList.add("highlight");
            dayEl.addEventListener("click", () => {
                showAvailableTimes(dateStr, booked);
                calModal.classList.add("hidden");
                tsModal.classList.remove("hidden");
            });
        }
        calEl.appendChild(dayEl);
    }
}

// exibir horários disponíveis no modal
function showAvailableTimes(dateStr, booked) {
    const container = document.getElementById("horarios-disponiveis");
    container.innerHTML = `<h4>Horários para ${dateStr}</h4>`;
    const ul = document.createElement("ul");
    timeslots.forEach(t => {
        if (!booked.includes(t)) {
            const li = document.createElement("li");
            li.textContent = t;
            ul.appendChild(li);
        }
    });
    container.appendChild(ul);
}

// resto do script: slider, nav, fade-in, hambúrguer e paginação de avaliações
const slider = document.querySelector('.cortes-slider');
const prevBtn = document.querySelector('.slider-btn.prev');
const nextBtn = document.querySelector('.slider-btn.next');
prevBtn?.addEventListener('click', () => slider?.scrollBy({ left: -240, behavior: 'smooth' }));
nextBtn?.addEventListener('click', () => slider?.scrollBy({ left: 240, behavior: 'smooth' }));

document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        const section = document.querySelector(link.getAttribute('href'));
        if (section) section.scrollIntoView({ behavior: 'smooth' });
        document.querySelector('.nav-links')?.classList.remove('active');
    });
});

const fadeEls = document.querySelectorAll('.fade-in');
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('show');
    });
}, { threshold: 0.1 });
fadeEls.forEach(el => observer.observe(el));

const menuToggle = document.createElement('button');
menuToggle.innerHTML = '☰';
menuToggle.setAttribute('aria-label', 'Abrir menu');
menuToggle.classList.add('hamburger');
document.querySelector('.logo-container')?.insertAdjacentElement('afterend', menuToggle);
menuToggle.addEventListener('click', () => document.querySelector('.nav-links')?.classList.toggle('active'));

const avaliacoes = [
    { nome: "André Costa", texto: "Fui muito bem atendido, recomendo demais!", estrelas: 5 },
    { nome: "Lucas Menezes", texto: "Ambiente aconchegante e barbeiro muito profissional.", estrelas: 4 },
    { nome: "Eduardo Lima", texto: "Voltei várias vezes, sempre saio satisfeito.", estrelas: 5 },
    { nome: "Fernanda Dias", texto: "Ambiente limpo e bem decorado!", estrelas: 5 },
    { nome: "Carlos Alberto", texto: "Preço justo e corte perfeito!", estrelas: 4 }
];

const porPagina = 3;
let paginaAtual = 1;
function getTotalPaginas() { return Math.ceil(avaliacoes.length / porPagina); }

const container = document.getElementById("avaliacoes-container");
const paginaAtualSpan = document.getElementById("pagina-atual");
const btnAnterior = document.getElementById("prev-page");
const btnProxima = document.getElementById("next-page");

function renderAvaliacoes() {
    container.innerHTML = "";
    const total = getTotalPaginas();
    const inicio = (paginaAtual - 1) * porPagina;
    const fim = inicio + porPagina;
    avaliacoes.slice(inicio, fim).forEach(av => {
        const div = document.createElement("div");
        div.classList.add("avaliacao");
        div.innerHTML = `
      <p>"${av.texto}"</p>
      <strong>${av.nome}</strong>
      <div class="stars">${"★".repeat(av.estrelas)}${"☆".repeat(5 - av.estrelas)}</div>
    `;
        container.appendChild(div);
    });
    paginaAtualSpan.textContent = `${paginaAtual} / ${total}`;
    btnAnterior.disabled = paginaAtual === 1;
    btnProxima.disabled = paginaAtual === total;
}

btnAnterior?.addEventListener("click", () => { if (paginaAtual > 1) { paginaAtual--; renderAvaliacoes(); } });
btnProxima?.addEventListener("click", () => { if (paginaAtual < getTotalPaginas()) { paginaAtual++; renderAvaliacoes(); } });
renderAvaliacoes();

