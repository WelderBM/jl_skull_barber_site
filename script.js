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

// formata datas para "Hoje", "Amanhã" ou "Próxima X"
function formatDateLabel(dateStr) {
    const [year, month, day] = dateStr.split("-").map(Number);
    const d = new Date(year, month - 1, day);
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

// formata ISO → "Hoje às hh:mm", etc.
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
    try {
        const snap = await getDocs(collection(db, "opinioes"));
        opinioesData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (opinioesData.length < 3) {
            opinioesData = opinioesData.concat(OPINIOES_MOCK.slice(0, 5 - opinioesData.length));
        }
    } catch (e) {
        opinioesData = [...OPINIOES_MOCK];
    }
    renderOpinioes();
}

function renderOpinioes() {
    const container = document.getElementById("avaliacoes-container");
    container.innerHTML = "";
    const totalPages = Math.max(1, Math.ceil(opinioesData.length / opinioesPerPage));
    if (opinioesPage > totalPages) opinioesPage = totalPages;
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
        try {
            await addDoc(collection(db, "opinioes"), {
                nome, texto, estrelas, criadoEm: new Date().toISOString()
            });
        } catch (e) { /* offline fallback */ }
        opinioesData.push({ nome, texto, estrelas });
        feedbackForm.reset();
        msgOpinion.textContent = "✅ Opinião enviada!";
        setTimeout(() => { msgOpinion.textContent = ""; }, 4000);
        renderOpinioes();
    });

    // ─── timeslots de 08:00 a 19:30 ────────────────────────────
    const timeslots = [];
    for (let h = 8; h <= 19; h++) {
        const hh = String(h).padStart(2, "0");
        timeslots.push(`${hh}:00`, `${hh}:30`);
    }
    let selectedDate = null, selectedTime = null; // ← apenas 1 horário por agendamento

    // ─── Referências de UI ──────────────────────────────────────
    const overlay = document.getElementById("modal-overlay");
    const modal = document.getElementById("modal");
    const btnClose = document.getElementById("modal-close");
    const calEl = document.getElementById("calendar");
    const tsContainer = document.getElementById("horarios-disponiveis");
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
    const btnViewAppointments = document.getElementById("btn-view-agendamentos");
    const btnSearchAppointments = document.getElementById("btn-search-agendamentos");
    const searchTelefone = document.getElementById("searchTelefone");
    const minhaAgendaSection = document.getElementById("minha-agenda-section");

    // ─── Navegação entre steps ──────────────────────────────────
    function goToStep(n) {
        document.querySelectorAll(".booking-step").forEach(s => s.classList.remove("active"));
        document.querySelector(`.booking-step[data-step="${n}"]`).classList.add("active");
    }

    // ─── Abrir e fechar modal ───────────────────────────────────
    function openModal() {
        overlay.classList.remove("hidden");
        modal.classList.remove("hidden");
        // pequeno delay para a transição CSS funcionar
        requestAnimationFrame(() => {
            overlay.classList.add("modal-open");
            modal.classList.add("modal-open");
        });
        document.body.classList.add("modal-opened");
    }

    function closeModal() {
        overlay.classList.remove("modal-open");
        modal.classList.remove("modal-open");
        document.body.classList.remove("modal-opened");
        setTimeout(() => {
            overlay.classList.add("hidden");
            modal.classList.add("hidden");
        }, 300);
    }

    btnClose.onclick = closeModal;

    // Fecha ao clicar fora (no overlay)
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeModal();
    });

    // ─── carrega reservas já feitas da barbearia ────────────────
    async function loadAvailabilities(m, y) {
        const start = new Date(y, m, 1).toISOString();
        const end = new Date(y, m + 1, 1).toISOString();
        try {
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
        } catch (e) {
            return {};
        }
    }

    // ─── lista reservas do cliente (no passo 3) ─────────────────
    async function loadMyAppointments(tel) {
        if (!tel) { minhaAgenda.innerHTML = ""; return; }
        try {
            const snap = await getDocs(query(
                collection(db, "agendamentos"),
                where("telefone", "==", tel),
                where("status", "in", ["confirmado", "pendente"])
            ));
            minhaAgenda.innerHTML = "";
            if (snap.empty) {
                minhaAgenda.innerHTML = "<p style='color:#888;font-size:.9rem;'>Nenhum agendamento anterior.</p>";
                return;
            }
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
                    b.disabled = true;
                    b.textContent = "…";
                    try {
                        await updateDoc(doc(db, "agendamentos", b.dataset.id), { status: "cancelado" });
                        b.parentElement.innerHTML = "❌ Cancelado";
                    } catch {
                        b.disabled = false;
                        b.textContent = "Cancelar";
                    }
                };
            });
        } catch (e) {
            minhaAgenda.innerHTML = "<p style='color:#888;'>Não foi possível carregar agendamentos.</p>";
        }
    }

    // ─── gera calendário ────────────────────────────────────────
    function generateCalendar(m, y, bks) {
        calEl.innerHTML = "";
        ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"].forEach(d => {
            const w = document.createElement("div");
            w.textContent = d; w.className = "cal-header";
            calEl.appendChild(w);
        });

        // cabeçalho do mês
        const monthNames = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
        const monthHeader = document.getElementById("cal-month-header");
        if (monthHeader) monthHeader.textContent = `${monthNames[m]} ${y}`;

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
                        selectedTime = null;
                        btnStep2Next.disabled = true;
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

    // ─── mostra horários disponíveis ────────────────────────────
    function showAvailableTimes(ds, booked) {
        tsContainer.innerHTML = `<h4>Horários para ${formatDateLabel(ds)}</h4>`;
        const ul = document.createElement("ul");

        function isPast(dStr, tStr) {
            const [h, m] = tStr.split(":").map(Number);
            const now = new Date();
            const [yy, mm, dd] = dStr.split("-").map(Number);
            const day = new Date(yy, mm - 1, dd);
            const today = new Date(); today.setHours(0, 0, 0, 0);
            if (day.getTime() !== today.getTime()) return false;
            return h < now.getHours() || (h === now.getHours() && m <= now.getMinutes());
        }

        timeslots.forEach(t => {
            const li = document.createElement("li");
            li.textContent = t;
            if (booked.includes(t) || isPast(ds, t)) {
                li.classList.add("unavailable");
                li.title = "Horário indisponível";
            } else {
                li.classList.add("available");
                li.onclick = () => {
                    ul.querySelectorAll("li.selected").forEach(x => x.classList.remove("selected"));
                    li.classList.add("selected");
                    selectedTime = t;
                    btnStep2Next.disabled = false;
                    previewDt.textContent = `${formatDateLabel(selectedDate)} às ${t}`;
                    preview.classList.remove("hidden");
                };
            }
            ul.appendChild(li);
        });
        tsContainer.appendChild(ul);
        const first = ul.querySelector("li.available");
        if (first) first.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    // ─── Abre modal para AGENDAR (qualquer botão .btn-agendar) ──
    async function abrirModalAgendamento() {
        selectedDate = null;
        selectedTime = null;
        preview.classList.add("hidden");
        msgResult.textContent = "";
        btnConfirm.disabled = false;
        inputNome.value = "";
        inputTel.value = "";
        btnStep1Next.disabled = true;
        btnStep2Next.disabled = true;
        minhaAgenda.innerHTML = "";
        minhaAgendaSection.classList.add("hidden");
        goToStep(1);
        openModal();

        // skeleton enquanto carrega
        calEl.innerHTML = '<div class="skeleton-calendar-grid">' +
            Array(49).fill('<div class="skeleton-day"></div>').join("") +
            '</div>';
        tsContainer.innerHTML = '<div class="skeleton-timeslots"></div>';

        const hoje = new Date();
        const bks = await loadAvailabilities(hoje.getMonth(), hoje.getFullYear());
        generateCalendar(hoje.getMonth(), hoje.getFullYear(), bks);
        tsContainer.innerHTML = '<p style="color:#888;text-align:center;padding:1rem;">← Selecione uma data no calendário</p>';
    }

    // Todos os botões de agendar
    document.querySelectorAll(".btn-agendar").forEach(btn => {
        btn.addEventListener("click", abrirModalAgendamento);
    });

    // ─── Abre passo 4 "Ver meus agendamentos" ──────────────────
    btnViewAppointments.onclick = () => {
        goToStep(4);
        minhaAgendaList.innerHTML = "";
        searchTelefone.value = "";
        openModal();
    };

    // ─── Busca agendamentos por telefone (passo 4) ──────────────
    btnSearchAppointments.onclick = async () => {
        const tel = searchTelefone.value.trim();
        minhaAgendaList.innerHTML = "";
        if (!tel) {
            minhaAgendaList.innerHTML = "<p style='color:#d4af37;'>⛔ Digite seu telefone!</p>";
            return;
        }
        minhaAgendaList.innerHTML = "<p style='color:#888;'>Buscando…</p>";
        try {
            const snap = await getDocs(query(
                collection(db, "agendamentos"),
                where("telefone", "==", tel),
                where("status", "in", ["confirmado", "pendente"])
            ));
            minhaAgendaList.innerHTML = "";
            if (snap.empty) {
                minhaAgendaList.innerHTML = "<p style='color:#888;'>Nenhum agendamento encontrado.</p>";
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
                    b.disabled = true;
                    b.textContent = "…";
                    try {
                        await updateDoc(doc(db, "agendamentos", b.dataset.id), { status: "cancelado" });
                        b.parentElement.innerHTML = "❌ Cancelado";
                    } catch {
                        b.disabled = false;
                        b.textContent = "Cancelar";
                    }
                };
            });
        } catch (e) {
            minhaAgendaList.innerHTML = "<p style='color:#d9534f;'>Erro ao buscar agendamentos.</p>";
        }
    };

    // ─── Confirma agendamento (passo 3) ─────────────────────────
    btnConfirm.onclick = async () => {
        if (!selectedDate || !selectedTime) {
            msgResult.textContent = "⛔ Selecione data e horário.";
            return;
        }
        const nome = inputNome.value.trim(), tel = inputTel.value.trim();
        if (!nome) { msgResult.textContent = "⛔ Informe seu nome."; return; }
        if (!tel) { msgResult.textContent = "⛔ Informe seu telefone."; return; }

        btnConfirm.disabled = true;
        msgResult.textContent = "⏳ Salvando agendamento…";
        try {
            const ref = await addDoc(collection(db, "agendamentos"), {
                horario: `${selectedDate}T${selectedTime}:00`,
                nome, telefone: tel, status: "pendente", criadoEm: new Date().toISOString()
            });
            msgResult.textContent = "✅ Agendamento solicitado! Aguarde confirmação.";
            msgResult.style.color = "#25D366";

            // mostra o agendamento na lista abaixo do form
            minhaAgenda.innerHTML = `
        <div class="meu-agendamento-item">
          <span>${formatHorario(`${selectedDate}T${selectedTime}:00`)} <em>(pendente)</em></span>
          <button class="cancel-btn" data-id="${ref.id}">Cancelar</button>
        </div>
      `;
            minhaAgendaSection.classList.remove("hidden");
            minhaAgenda.querySelectorAll(".cancel-btn").forEach(b => {
                b.onclick = async () => {
                    b.disabled = true;
                    b.textContent = "…";
                    try {
                        await updateDoc(doc(db, "agendamentos", b.dataset.id), { status: "cancelado" });
                        b.parentElement.innerHTML = "❌ Cancelado";
                    } catch {
                        b.disabled = false;
                        b.textContent = "Cancelar";
                    }
                };
            });
        } catch {
            msgResult.textContent = "❌ Erro ao agendar. Tente novamente.";
            msgResult.style.color = "#d9534f";
            btnConfirm.disabled = false;
        }
    };

    // ─── Botão Finalizar (fecha o modal) ────────────────────────
    document.getElementById("btnFinish").onclick = () => {
        closeModal();
    };

    // ─── Navegação entre steps (wizard-next / wizard-prev) ──────
    document.querySelectorAll(".wizard-next,.wizard-prev").forEach(btn => {
        btn.onclick = () => {
            if (btn.disabled) return;
            const to = parseInt(btn.dataset.to, 10);
            // Ao voltar do passo 3 para 2, limpa a seleção de horário
            if (to === 2) {
                selectedTime = null;
                btnStep2Next.disabled = true;
                if (selectedDate) {
                    tsContainer.querySelectorAll("li.selected").forEach(li => li.classList.remove("selected"));
                    preview.textContent = "";
                    previewDt.textContent = formatDateLabel(selectedDate);
                }
            }
            // Ao avançar para passo 3, atualiza o preview e carrega agendamentos anteriores
            if (to === 3) {
                previewDt.textContent = `${formatDateLabel(selectedDate)} às ${selectedTime}`;
                preview.classList.remove("hidden");
                const tel = inputTel.value.trim();
                if (tel) loadMyAppointments(tel);
            }
            goToStep(to);
        };
    });

    // ─── Scroll suave menu ──────────────────────────────────────
    document.querySelectorAll(".nav-links a").forEach(a => {
        a.onclick = e => {
            e.preventDefault();
            const target = document.querySelector(a.getAttribute("href"));
            if (target) target.scrollIntoView({ behavior: "smooth" });
            const navLinks = document.querySelector(".nav-links");
            navLinks.classList.remove("active");
            document.querySelector(".hamburger").classList.remove("active");
        };
    });

    // ─── Hamburger menu ─────────────────────────────────────────
    const hamburger = document.querySelector(".hamburger");
    hamburger.onclick = () => {
        document.querySelector(".nav-links").classList.toggle("active");
        hamburger.classList.toggle("active");
    };

    // Fecha o menu mobile ao clicar fora
    document.addEventListener("click", (e) => {
        const navLinks = document.querySelector(".nav-links");
        if (navLinks.classList.contains("active") &&
            !navLinks.contains(e.target) &&
            !hamburger.contains(e.target)) {
            navLinks.classList.remove("active");
            hamburger.classList.remove("active");
        }
    });
});
