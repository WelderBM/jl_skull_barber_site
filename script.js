import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.0/firebase-app.js";
import {
    initializeFirestore,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    doc
} from "https://www.gstatic.com/firebasejs/9.17.0/firebase-firestore.js";

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
const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    useFetchStreams: false
});

// mocks para preencher até 5 opiniões
const OPINIOES_MOCK = [
    { nome: "Marcos Silva", texto: "Excelente atendimento!", estrelas: 5 },
    { nome: "Beatriz Souza", texto: "Ambiente agradável e profissional.", estrelas: 4 },
    { nome: "Carlos Pereira", texto: "Pontualidade e custo-benefício ótimos.", estrelas: 5 },
    { nome: "Fernanda Lima", texto: "Corte moderno, adorei!", estrelas: 5 },
    { nome: "Ricardo Oliveira", texto: "Profissionais nota 10, virei cliente fiel.", estrelas: 5 }
];

// formata datas para “Hoje”, “Amanhã” ou “Próxima X”
function formatDateLabel(dateStr) {
    const d = new Date(dateStr);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.round((d - today) / 86400000);
    if (diff === 0) return "Hoje";
    if (diff === 1) return "Amanhã";
    if (diff > 1 && diff < 7) {
        const names = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
        return "Próxima " + names[d.getDay()];
    }
    return d.toLocaleDateString("pt-BR");
}

// formata ISO → “Hoje às hh:mm”, etc.
function formatHorario(iso) {
    const dt = new Date(iso);
    const base = new Date(dt); base.setHours(0, 0, 0, 0);
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const diff = (base - hoje) / 86400000;
    const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(dt);
    if (diff === 0) return `Hoje às ${time}`;
    if (diff === 1) return `Amanhã às ${time}`;
    if (diff > 1 && diff < 7) {
        const wk = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(dt);
        return `Próxima ${wk} às ${time}`;
    }
    const date = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(dt);
    return `${date} às ${time}`;
}

// controle de paginação de opiniões
let opinioesData = [], opinioesPage = 1, opinioesPerPage = 3;

async function carregarOpinioes() {
    const snap = await getDocs(collection(db, "opinioes"));
    opinioesData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (opinioesData.length <= 3) {
        opinioesData = opinioesData.concat(OPINIOES_MOCK.slice(0, 5 - opinioesData.length));
    }
    renderOpinioes();
}

function renderOpinioes() {
    const container = document.getElementById("avaliacoes-container");
    container.innerHTML = "";
    const totalPages = Math.ceil(opinioesData.length / opinioesPerPage);
    const start = (opinioesPage - 1) * opinioesPerPage;
    opinioesData.slice(start, start + opinioesPerPage).forEach(av => {
        const d = document.createElement("div");
        d.className = "avaliacao";
        d.innerHTML = `
      <p>"${av.texto}"</p>
      <strong>${av.nome}</strong>
      <div class="stars">${"★".repeat(av.estrelas)}${"☆".repeat(5 - av.estrelas)}</div>
    `;
        container.appendChild(d);
    });
    document.getElementById("prev-page").disabled = opinioesPage === 1;
    document.getElementById("next-page").disabled = opinioesPage === totalPages;
    document.getElementById("pagina-atual").textContent = `${opinioesPage}/${totalPages}`;
}

document.addEventListener("DOMContentLoaded", () => {
    carregarOpinioes();
    document.getElementById("prev-page").onclick = () => {
        if (opinioesPage > 1) { opinioesPage--; renderOpinioes(); }
    };
    document.getElementById("next-page").onclick = () => {
        const totalPages = Math.ceil(opinioesData.length / opinioesPerPage);
        if (opinioesPage < totalPages) { opinioesPage++; renderOpinioes(); }
    };

    // envio de nova opinião
    const feedbackForm = document.getElementById("feedback-form");
    const msgOpinion = document.getElementById("opinionMessage");
    feedbackForm.addEventListener("submit", async e => {
        e.preventDefault();
        const nome = document.getElementById("inputOpinionName").value.trim();
        const texto = document.getElementById("inputOpinionText").value.trim();
        const estrelas = parseInt(document.getElementById("inputOpinionStars").value, 10);
        if (!nome || !texto) {
            msgOpinion.textContent = "⛔ Preencha nome e comentário.";
            return;
        }
        await addDoc(collection(db, "opinioes"), {
            nome, texto, estrelas, criadoEm: new Date().toISOString()
        });
        opinioesData.push({ nome, texto, estrelas });
        if (opinioesData.length > 5) opinioesData.shift();
        feedbackForm.reset();
        msgOpinion.textContent = "✅ Opinião enviada!";
        renderOpinioes();
    });

    // configuração inicial do agendamento
    const timeslots = [];
    for (let h = 8; h <= 19; h++) {
        const hh = String(h).padStart(2, "0");
        timeslots.push(`${hh}:00`, `${hh}:30`);
    }
    let selectedDate = null, selectedTimes = [];

    const btnAgendar = document.querySelector(".btn-agendar");
    const btnViewAppointments = document.getElementById("btn-view-agendamentos");
    const btnSearchAppointments = document.getElementById("btn-search-agendamentos");
    const searchTelefone = document.getElementById("searchTelefone");
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
    const btnStep1Next = document.getElementById("btn-step1-next");
    const btnStep2Next = document.getElementById("btn-step2-next");
    const minhaAgenda = document.getElementById("minha-agenda");
    const minhaAgendaList = document.getElementById("minha-agenda-list");

    function goToStep(n) {
        document.querySelectorAll(".booking-step").forEach(s => s.classList.remove("active"));
        document.querySelector(`.booking-step[data-step="${n}"]`).classList.add("active");
    }

    // carrega reservas já feitas
    async function loadAvailabilities(m, y) {
        const start = new Date(y, m, 1).toISOString();
        const end = new Date(y, m + 1, 1).toISOString();
        const snap = await getDocs(query(
            collection(db, "agendamentos"),
            where("status", "in", ["confirmado", "pendente"]),
            where("horario", ">=", start),
            where("horario", "<", end)
        ));
        const byDate = {};
        snap.forEach(d => {
            const h = d.data().horario;
            const dS = h.slice(0, 10), t = h.slice(11, 16);
            byDate[dS] = byDate[dS] || [];
            byDate[dS].push(t);
        });
        return byDate;
    }

    // lista reservas do cliente
    async function loadMyAppointments() {
        const tel = inputTel.value.trim();
        if (!tel) return;
        const snap = await getDocs(query(
            collection(db, "agendamentos"),
            where("telefone", "==", tel),
            where("status", "in", ["confirmado", "pendente"])
        ));
        minhaAgenda.innerHTML = "";
        snap.forEach(docSnap => {
            const { horario, status } = docSnap.data();
            const id = docSnap.id;
            const human = formatHorario(horario);
            const div = document.createElement("div");
            div.className = "meu-agendamento-item";
            div.innerHTML = `
        <span>${human} <em>(${status})</em></span>
        <button class="cancel-btn" data-id="${id}">Cancelar</button>
      `;
            minhaAgenda.appendChild(div);
        });
        minhaAgenda.querySelectorAll(".cancel-btn").forEach(b => {
            b.onclick = async () => {
                await updateDoc(doc(db, "agendamentos", b.dataset.id), { status: "cancelado" });
                loadMyAppointments();
            };
        });
    }

    // gera calendário para agendar
    function generateCalendar(m, y, bks) {
        calEl.innerHTML = "";
        ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"].forEach(d => {
            const w = document.createElement("div");
            w.textContent = d; w.style.fontWeight = "bold";
            calEl.appendChild(w);
        });
        const first = new Date(y, m, 1).getDay();
        for (let i = 0; i < first; i++) calEl.appendChild(document.createElement("div"));
        const last = new Date(y, m + 1, 0).getDate();
        const today0 = new Date(); today0.setHours(0, 0, 0, 0);
        for (let d = 1; d <= last; d++) {
            const dateObj = new Date(y, m, d);
            const ds = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const cell = document.createElement("div");
            cell.textContent = d; cell.className = "day";
            if (dateObj < today0 || dateObj.getDay() === 0) {
                cell.classList.add("disabled");
            } else {
                const booked = bks[ds] || [];
                if (booked.length < timeslots.length) {
                    cell.classList.add("highlight");
                    cell.onclick = () => {
                        selectedDate = ds;
                        calEl.querySelectorAll(".selected").forEach(x => x.classList.remove("selected"));
                        cell.classList.add("selected");
                        btnStep1Next.disabled = false;
                        previewDt.textContent = formatDateLabel(ds);
                        preview.classList.remove("hidden");
                        showAvailableTimes(ds, booked);
                    };
                } else {
                    cell.classList.add("unavailable");
                }
            }
            calEl.appendChild(cell);
        }
    }

    // mostra horários disponíveis
    function showAvailableTimes(ds, booked) {
        tsContainer.innerHTML = `<h4>Horários para ${formatDateLabel(ds)}</h4>`;
        const ul = document.createElement("ul");
        function isPast(dStr, tStr) {
            const [h, m] = tStr.split(":").map(Number);
            const now = new Date(), day = new Date(dStr);
            if (day.toDateString() !== now.toDateString()) return false;
            return h < now.getHours() || (h === now.getHours() && m <= now.getMinutes());
        }
        timeslots.forEach(t => {
            const li = document.createElement("li");
            li.textContent = t;
            if (booked.includes(t) || isPast(ds, t)) {
                li.classList.add("unavailable");
            } else {
                li.classList.add("available");
                li.onclick = () => {
                    const idx = selectedTimes.indexOf(t);
                    if (idx >= 0) { selectedTimes.splice(idx, 1); li.classList.remove("selected"); }
                    else { selectedTimes.push(t); li.classList.add("selected"); }
                    btnStep2Next.disabled = selectedTimes.length === 0;
                    preview.innerHTML = `<strong>${formatDateLabel(selectedDate)}</strong>: ${selectedTimes.join(", ")}`;
                    preview.classList.remove("hidden");
                };
            }
            ul.appendChild(li);
        });
        tsContainer.appendChild(ul);
        const first = ul.querySelector("li.available");
        if (first) first.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    // abre modal no passo 1
    btnAgendar.onclick = async () => {
        selectedDate = null; selectedTimes = [];
        bookingForm.classList.add("hidden");
        calEl.classList.remove("hidden");
        tsContainer.classList.remove("hidden");
        preview.classList.add("hidden");
        msgResult.textContent = "";
        btnConfirm.disabled = false;
        inputNome.value = inputTel.value = "";
        btnStep1Next.disabled = btnStep2Next.disabled = true;
        goToStep(1);
        overlay.classList.remove("hidden");
        overlay.classList.add("modal-open");
        modal.classList.remove("hidden");
        modal.classList.add("modal-open");
        await loadMyAppointments();
        calEl.innerHTML = '<div class="skeleton-calendar-grid">' +
            Array(49).fill('<div class="skeleton-day"></div>').join("") +
            '</div>';
        tsContainer.innerHTML = '<div class="skeleton-timeslots"></div>';
        const hoje = new Date();
        const bks = await loadAvailabilities(hoje.getMonth(), hoje.getFullYear());
        generateCalendar(hoje.getMonth(), hoje.getFullYear(), bks);
    };

    // abre passo 4
    btnViewAppointments.onclick = () => {
        goToStep(4);
        overlay.classList.remove("hidden"); modal.classList.remove("hidden");
        document.body.classList.add("modal-opened");
    };

    // fecha modal
    btnClose.onclick = () => {
        document.body.classList.remove("modal-opened");
        overlay.classList.add("hidden"); modal.classList.add("hidden");
    };

    // busca agendamentos por telefone
    btnSearchAppointments.onclick = async () => {
        const tel = searchTelefone.value.trim();
        msgResult.textContent = ""; minhaAgendaList.innerHTML = "";
        if (!tel) { msgResult.textContent = "⛔ Digite seu telefone!"; return; }
        const snap = await getDocs(query(
            collection(db, "agendamentos"),
            where("telefone", "==", tel),
            where("status", "in", ["confirmado", "pendente"])
        ));
        if (snap.empty) {
            minhaAgendaList.innerHTML = "<p>Nenhum agendamento encontrado.</p>";
            return;
        }
        snap.forEach(docSnap => {
            const { horario, status } = docSnap.data(), id = docSnap.id;
            const human = formatHorario(horario);
            const div = document.createElement("div");
            div.className = "meu-agendamento-item";
            div.innerHTML = `
        <span>${human} <em>(${status})</em></span>
        <button class="cancel-btn" data-id="${id}">Cancelar</button>
      `;
            minhaAgendaList.appendChild(div);
        });
        minhaAgendaList.querySelectorAll(".cancel-btn").forEach(b => {
            b.onclick = async () => {
                await updateDoc(doc(db, "agendamentos", b.dataset.id), { status: "cancelado" });
                b.parentElement.innerHTML = "❌ Cancelado";
                const hoje = new Date();
                const bks = await loadAvailabilities(hoje.getMonth(), hoje.getFullYear());
                generateCalendar(hoje.getMonth(), hoje.getFullYear(), bks);
            };
        });
    };

    // confirma múltiplos horários
    btnConfirm.onclick = async () => {
        if (!selectedDate || selectedTimes.length === 0) {
            msgResult.textContent = "⛔ Selecione data e pelo menos um horário."; return;
        }
        const nome = inputNome.value.trim(), tel = inputTel.value.trim();
        if (!nome || !tel) {
            msgResult.textContent = "⛔ Preencha nome e telefone."; return;
        }
        btnConfirm.disabled = true; msgResult.textContent = "⏳ Salvando agendamentos…";
        try {
            const refs = await Promise.all(selectedTimes.map(t =>
                addDoc(collection(db, "agendamentos"), {
                    horario: `${selectedDate}T${t}:00`,
                    nome, telefone: tel, status: "pendente", criadoEm: new Date().toISOString()
                })
            ));
            msgResult.textContent = `✅ ${refs.length} agendamento(s) pendente(s)!`;
            minhaAgenda.innerHTML = refs.map((r, i) => `
        <div class="meu-agendamento-item">
          <span>${formatHorario(`${selectedDate}T${selectedTimes[i]}:00`)}</span>
          <button class="cancel-btn" data-id="${r.id}">Cancelar</button>
        </div>
      `).join("");
            minhaAgenda.querySelectorAll(".cancel-btn").forEach(b => {
                b.onclick = async () => {
                    await updateDoc(doc(db, "agendamentos", b.dataset.id), { status: "cancelado" });
                    b.parentElement.innerHTML = "❌ Cancelado";
                    const hoje = new Date();
                    const bks = await loadAvailabilities(hoje.getMonth(), hoje.getFullYear());
                    generateCalendar(hoje.getMonth(), hoje.getFullYear(), bks);
                };
            });
        } catch {
            msgResult.textContent = "❌ Erro ao agendar. Tente novamente.";
            btnConfirm.disabled = false;
        }
    };

    // navegação entre steps
    document.querySelectorAll(".wizard-next,.wizard-prev").forEach(btn => {
        btn.onclick = () => {
            const cur = document.querySelector(".booking-step.active").dataset.step;
            const to = btn.dataset.to;
            if (cur === "3" && to === "2") {
                selectedTimes = []; tsContainer.querySelectorAll("li.selected").forEach(li => li.classList.remove("selected"));
                preview.classList.add("hidden"); btnStep2Next.disabled = true;
            }
            document.querySelector(".booking-step.active").classList.remove("active");
            document.querySelector(`.booking-step[data-step="${to}"]`).classList.add("active");
        };
    });

    // scroll suave menu
    document.querySelectorAll(".nav-links a").forEach(a => {
        a.onclick = e => {
            e.preventDefault();
            document.querySelector(a.getAttribute("href"))?.scrollIntoView({ behavior: "smooth" });
            document.querySelector(".nav-links").classList.remove("active");
        };
    });
    document.querySelector(".hamburger").onclick = () => {
        document.querySelector(".nav-links").classList.toggle("active");
    };
});
