import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    addDoc
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    // 1) Inicializa Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyB8Ax9_9JeVV2D48v6C7JqPmC4XG5gPryw",
        authDomain: "mix-novidades.firebaseapp.com",
        projectId: "mix-novidades",
        storageBucket: "mix-novidades.appspot.com",
        messagingSenderId: "155436196034",
        appId: "1:155436196034:web:7c412f5e3c8ae075a55b5b",
        measurementId: "G-4V6C9HQXBN"
    };
    initializeApp(firebaseConfig);
    const db = getFirestore();

    // 2) Gera timeslots de 30 em 30 entre 08:00 e 19:30
    const timeslots = [];
    for (let h = 8; h <= 19; h++) {
        const hh = String(h).padStart(2, "0");
        timeslots.push(`${hh}:00`, `${hh}:30`);
    }

    // 3) Referências ao DOM
    const btnAgendar = document.querySelector(".btn-agendar");
    const overlay = document.getElementById("modal-overlay");
    const modal = document.getElementById("modal");
    const btnClose = document.getElementById("modal-close");
    const calEl = document.getElementById("calendar");
    const tsContainer = document.getElementById("horarios-disponiveis");
    const bookingForm = document.getElementById("booking-form");
    const inputNome = document.getElementById("inputNome");
    const inputTel = document.getElementById("inputTelefone");
    const btnConfirm = document.getElementById("btnConfirmar");
    const msgResult = document.getElementById("mensagemResultado");
    const navLinks = document.querySelectorAll(".nav-links a");
    const fadeEls = document.querySelectorAll(".fade-in");
    const logoContainer = document.querySelector(".logo-container");

    // Paginação de opiniões
    const opinioesCont = document.getElementById("avaliacoes-container");
    const prevPageBtn = document.getElementById("prev-page");
    const nextPageBtn = document.getElementById("next-page");
    const pageSpan = document.getElementById("pagina-atual");

    const opinioes = [
        { nome: "André Costa", texto: "Fui muito bem atendido, recomendo demais!", estrelas: 5 },
        { nome: "Lucas Menezes", texto: "Ambiente aconchegante e barbeiro profissional.", estrelas: 4 },
        { nome: "Eduardo Lima", texto: "Volto sempre, satisfeito!", estrelas: 5 },
        { nome: "Fernanda Dias", texto: "Ambiente limpo e decorado!", estrelas: 5 },
        { nome: "Carlos Alberto", texto: "Preço justo e corte perfeito!", estrelas: 4 }
    ];
    const porPagina = 3;
    let paginaAtual = 1;

    function totalPaginas() {
        return Math.ceil(opinioes.length / porPagina);
    }

    function renderOpinioes() {
        opinioesCont.innerHTML = "";
        const inicio = (paginaAtual - 1) * porPagina;
        opinioes.slice(inicio, inicio + porPagina).forEach(av => {
            const div = document.createElement("div");
            div.className = "avaliacao";
            div.innerHTML = `
        <p>"${av.texto}"</p>
        <strong>${av.nome}</strong>
        <div class="stars">${"★".repeat(av.estrelas)}${"☆".repeat(5 - av.estrelas)}</div>
      `;
            opinioesCont.appendChild(div);
        });
        pageSpan.textContent = `${paginaAtual} / ${totalPaginas()}`;
        prevPageBtn.disabled = paginaAtual === 1;
        nextPageBtn.disabled = paginaAtual === totalPaginas();
    }

    prevPageBtn.addEventListener("click", () => {
        if (paginaAtual > 1) {
            paginaAtual--;
            renderOpinioes();
        }
    });

    nextPageBtn.addEventListener("click", () => {
        if (paginaAtual < totalPaginas()) {
            paginaAtual++;
            renderOpinioes();
        }
    });

    renderOpinioes();

    // Estado de seleção no agendamento
    let selectedDate = null;
    let selectedTime = null;

    // 4) Abre modal e carrega calendário
    btnAgendar.addEventListener("click", async () => {
        document.body.classList.add("modal-opened");
        overlay.classList.add("modal-open");
        modal.classList.add("modal-open");

        // Reset visual
        bookingForm.classList.add("hidden");
        calEl.classList.remove("hidden");
        tsContainer.classList.remove("hidden");
        msgResult.textContent = "";
        btnConfirm.disabled = false;
        inputNome.value = "";
        inputTel.value = "";
        selectedDate = null;
        selectedTime = null;

        // Carrega disponíveis a partir de hoje
        const hoje = new Date();
        const bookings = await loadAvailabilities(hoje.getMonth(), hoje.getFullYear());
        generateCalendar(hoje.getMonth(), hoje.getFullYear(), bookings);
    });

    // 5) Fecha modal
    btnClose.addEventListener("click", () => {
        document.body.classList.remove("modal-opened");
        overlay.classList.remove("modal-open");
        modal.classList.remove("modal-open");
    });

    // 6) Busca agendamentos no Firestore
    async function loadAvailabilities(month, year) {
        const agRef = collection(db, "agendamentos");
        const start = new Date(year, month, 1).toISOString();
        const end = new Date(year, month + 1, 1).toISOString();
        const snap = await getDocs(query(
            agRef,
            where("status", "==", "confirmado"),
            where("horario", ">=", start),
            where("horario", "<", end)
        ));
        const byDate = {};
        snap.forEach(doc => {
            const h = doc.data().horario;
            const d = h.slice(0, 10), t = h.slice(11, 16);
            byDate[d] = byDate[d] || [];
            byDate[d].push(t);
        });
        return byDate;
    }

    // 7) Gera calendário no modal
    function generateCalendar(month, year, bookings) {
        calEl.innerHTML = "";

        // Cabeçalho dos dias da semana
        ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"].forEach(d => {
            const wd = document.createElement("div");
            wd.textContent = d;
            wd.style.fontWeight = "bold";
            calEl.appendChild(wd);
        });

        // Espaços antes do dia 1
        const firstDay = new Date(year, month, 1).getDay();
        for (let i = 0; i < firstDay; i++) {
            calEl.appendChild(document.createElement("div"));
        }

        const lastDate = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let d = 1; d <= lastDate; d++) {
            const dateObj = new Date(year, month, d);
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const el = document.createElement("div");
            el.textContent = d;
            el.classList.add("day");

            if (dateObj < today) {
                el.classList.add("disabled");
            } else {
                const booked = bookings[dateStr] || [];
                if (booked.length < timeslots.length) {
                    el.classList.add("highlight");
                    el.addEventListener("click", () => {
                        selectedDate = dateStr;
                        // marca visualmente o dia
                        document.querySelectorAll("#calendar .selected")
                            .forEach(x => x.classList.remove("selected"));
                        el.classList.add("selected");
                        showAvailableTimes(dateStr, booked);
                    });
                } else {
                    el.classList.add("unavailable");
                }
            }
            calEl.appendChild(el);
        }
    }

    // 8) Exibe horários disponíveis
    function showAvailableTimes(dateStr, booked) {
        tsContainer.innerHTML = `<h4>Horários para ${dateStr}</h4>`;
        const ul = document.createElement("ul");
        timeslots.forEach(t => {
            const li = document.createElement("li");
            li.textContent = t;
            if (booked.includes(t)) {
                li.classList.add("unavailable");
            } else {
                li.classList.add("available");
                li.addEventListener("click", () => {
                    selectedTime = t;
                    document.querySelectorAll("#horarios-disponiveis .selected")
                        .forEach(x => x.classList.remove("selected"));
                    li.classList.add("selected");
                    // mostra formulário
                    bookingForm.classList.remove("hidden");
                });
            }
            ul.appendChild(li);
        });
        tsContainer.appendChild(ul);
    }

    // 9) Confirma e salva no Firestore
    btnConfirm.addEventListener("click", async () => {
        if (!selectedDate || !selectedTime) {
            msgResult.textContent = "⛔ Selecione data e horário.";
            return;
        }
        const nome = inputNome.value.trim();
        const tel = inputTel.value.trim();
        if (!nome || !tel) {
            msgResult.textContent = "⛔ Preencha nome e telefone.";
            return;
        }
        const horarioISO = `${selectedDate}T${selectedTime}:00`;
        try {
            await addDoc(collection(db, "agendamentos"), {
                horario: horarioISO,
                nome,
                telefone: tel,
                status: "confirmado",
                criadoEm: new Date().toISOString()
            });
            msgResult.textContent = "✅ Agendamento confirmado!";
            btnConfirm.disabled = true;
        } catch (e) {
            console.error(e);
            msgResult.textContent = "❌ Erro ao agendar. Tente novamente.";
        }
    });

    // 10) Rolagem suave de nav
    navLinks.forEach(link => {
        link.addEventListener("click", e => {
            e.preventDefault();
            document.querySelector(link.getAttribute("href"))
                ?.scrollIntoView({ behavior: "smooth" });
            document.querySelector(".nav-links")?.classList.remove("active");
        });
    });

    // 11) Fade-in on scroll
    fadeEls.forEach(el => {
        new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) el.classList.add("show");
        }, { threshold: 0.1 }).observe(el);
    });

    // 12) Menu hamburger
    const menuBtn = document.createElement("button");
    menuBtn.innerHTML = "☰";
    menuBtn.setAttribute("aria-label", "Abrir menu");
    menuBtn.classList.add("hamburger");
    logoContainer.insertAdjacentElement("afterend", menuBtn);
    menuBtn.addEventListener("click", () => {
        document.querySelector(".nav-links")?.classList.toggle("active");
    });
});

document.querySelectorAll('.wizard-next, .wizard-prev').forEach(btn => {
    btn.addEventListener('click', () => {
        const to = btn.getAttribute('data-to');
        document.querySelector('.booking-step.active').classList.remove('active');
        document.querySelector(`.booking-step[data-step="${to}"]`).classList.add('active');
    });
});
