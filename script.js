// script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.0/firebase-app.js";
import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    addDoc
} from "https://www.gstatic.com/firebasejs/9.17.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    // 1) Inicializa Firebase + Firestore em long-polling
    const firebaseConfig = {
        apiKey: "AIzaSyB8Ax9_9JeVV2D48v6C7JqPmC4XG5gPryw",
        authDomain: "mix-novidades.firebaseapp.com",
        projectId: "mix-novidades",
        storageBucket: "mix-novidades.firebasestorage.app",
        messagingSenderId: "155436196034",
        appId: "1:155436196034:web:504b95331e286516a55b5b",
        measurementId: "G-VWCKS2D1DF"
    };
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // 2) Gera timeslots de 30 em 30 entre 08:00 e 19:30
    const timeslots = [];
    for (let h = 8; h <= 19; h++) {
        const hh = String(h).padStart(2, "0");
        timeslots.push(`${hh}:00`, `${hh}:30`);
    }

    // 3) Referências do DOM
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
    const preview = document.getElementById("booking-preview");
    const previewDt = document.getElementById("preview-date");
    const previewTm = document.getElementById("preview-time");
    const btnStep1Next = document.getElementById("btn-step1-next");
    const btnStep2Next = document.getElementById("btn-step2-next");
    const navLinks = document.querySelectorAll(".nav-links a");
    const fadeEls = document.querySelectorAll(".fade-in");
    const menuBtn = document.querySelector(".hamburger");
    const navLinksPanel = document.querySelector(".nav-links");
    const opinioesCont = document.getElementById("avaliacoes-container");
    const prevPageBtn = document.getElementById("prev-page");
    const nextPageBtn = document.getElementById("next-page");
    const pageSpan = document.getElementById("pagina-atual");

    // 4) Paginação de opiniões
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
        <div class="stars">
          ${"★".repeat(av.estrelas)}${"☆".repeat(5 - av.estrelas)}
        </div>
      `;
            opinioesCont.appendChild(div);
        });
        pageSpan.textContent = `${paginaAtual} / ${totalPaginas()}`;
        prevPageBtn.disabled = paginaAtual === 1;
        nextPageBtn.disabled = paginaAtual === totalPaginas();
    }
    prevPageBtn.addEventListener("click", () => {
        if (paginaAtual > 1) { paginaAtual--; renderOpinioes(); }
    });
    nextPageBtn.addEventListener("click", () => {
        if (paginaAtual < totalPaginas()) { paginaAtual++; renderOpinioes(); }
    });
    renderOpinioes();

    let selectedDate = null;
    let selectedTime = null;

    // 5) Abrir modal e inicializar calendário
    btnAgendar.addEventListener("click", async () => {
        console.log("btnAgendar →", btnAgendar);

        document.body.classList.add("modal-opened");
        overlay.classList.add("modal-open");
        modal.classList.add("modal-open");

        // reset visual + estados
        bookingForm.classList.add("hidden");
        calEl.classList.remove("hidden");
        tsContainer.classList.remove("hidden");
        preview.classList.add("hidden");
        msgResult.textContent = "";
        btnConfirm.disabled = false;
        inputNome.value = inputTel.value = "";
        selectedDate = selectedTime = null;
        btnStep1Next.disabled = btnStep2Next.disabled = true;

        const hoje = new Date();
        const bookings = await loadAvailabilities(hoje.getMonth(), hoje.getFullYear());
        generateCalendar(hoje.getMonth(), hoje.getFullYear(), bookings);
    });

    // 6) Fechar modal
    btnClose.addEventListener("click", () => {
        document.body.classList.remove("modal-opened");
        overlay.classList.remove("modal-open");
        modal.classList.remove("modal-open");
    });

    // 7) Carregar agendamentos do Firestore
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

    // 8) Monta calendário
    function generateCalendar(month, year, bookings) {
        calEl.innerHTML = "";
        ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"].forEach(d => {
            const wd = document.createElement("div");
            wd.textContent = d;
            wd.style.fontWeight = "bold";
            calEl.appendChild(wd);
        });

        const firstDay = new Date(year, month, 1).getDay();
        for (let i = 0; i < firstDay; i++) {
            calEl.appendChild(document.createElement("div"));
        }

        const lastDate = new Date(year, month + 1, 0).getDate();
        const hoje0 = new Date(); hoje0.setHours(0, 0, 0, 0);

        for (let d = 1; d <= lastDate; d++) {
            const dateObj = new Date(year, month, d);
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const el = document.createElement("div");
            el.textContent = d;
            el.classList.add("day");

            if (dateObj < hoje0) {
                el.classList.add("disabled");
            } else {
                const booked = bookings[dateStr] || [];
                if (booked.length < timeslots.length) {
                    el.classList.add("highlight");
                    el.addEventListener("click", () => {
                        selectedDate = dateStr;
                        calEl.querySelectorAll(".selected").forEach(x => x.classList.remove("selected"));
                        el.classList.add("selected");
                        btnStep1Next.disabled = false;
                        previewDt.textContent = selectedDate;
                        previewTm.textContent = "";
                        preview.classList.remove("hidden");
                        showAvailableTimes(dateStr, booked);
                    });
                } else {
                    el.classList.add("unavailable");
                }
            }
            calEl.appendChild(el);
        }
    }

    // 9) Lista horários
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
                    tsContainer.querySelectorAll(".selected").forEach(x => x.classList.remove("selected"));
                    li.classList.add("selected");
                    btnStep2Next.disabled = false;
                    bookingForm.classList.remove("hidden");
                    previewTm.textContent = selectedTime;
                    preview.classList.remove("hidden");
                });
            }
            ul.appendChild(li);
        });
        tsContainer.appendChild(ul);
    }

    // 10) Salva no Firestore
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
        const iso = `${selectedDate}T${selectedTime}:00`;
        try {
            await addDoc(collection(db, "agendamentos"), {
                horario: iso,
                nome,
                telefone: tel,
                status: "confirmado",
                criadoEm: new Date().toISOString()
            });
            msgResult.textContent = "✅ Agendamento confirmado!";
            btnConfirm.disabled = true;
        } catch {
            msgResult.textContent = "❌ Erro ao agendar. Tente novamente.";
        }
    });

    // 11) Scroll suave + hambúrguer
    navLinks.forEach(a => a.addEventListener("click", e => {
        e.preventDefault();
        document.querySelector(a.getAttribute("href"))?.scrollIntoView({ behavior: "smooth" });
        navLinksPanel.classList.remove("active");
    }));
    menuBtn.addEventListener("click", () => {
        navLinksPanel.classList.toggle("active");
    });

    // 12) Fade-in
    fadeEls.forEach(el => new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) el.classList.add("show");
    }, { threshold: 0.1 }).observe(el));

    // 13) Wizard interno
    document.querySelectorAll(".wizard-next, .wizard-prev")
        .forEach(btn => btn.addEventListener("click", () => {
            const to = btn.dataset.to;
            document.querySelector(".booking-step.active").classList.remove("active");
            document.querySelector(`.booking-step[data-step="${to}"]`).classList.add("active");
        }));
});
