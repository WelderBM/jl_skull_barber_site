import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.17.0/firebase-app.js';
import {
    initializeFirestore, collection, query, where,
    getDocs, updateDoc, doc
} from 'https://www.gstatic.com/firebasejs/9.17.0/firebase-firestore.js';
import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.17.0/firebase-auth.js';

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
const db  = initializeFirestore(app, { experimentalForceLongPolling: true, useFetchStreams: false });
const auth = getAuth(app);

// ── Elementos da UI ──────────────────────────────────────
const loginDiv      = document.getElementById('login');
const adminDiv      = document.getElementById('admin');
const btnLogin      = document.getElementById('btnLogin');
const btnLogout     = document.getElementById('btnLogout');
const emailField    = document.getElementById('email');
const pwdField      = document.getElementById('pwd');
const loginMsg      = document.getElementById('loginMsg');
const pendingsTbody = document.getElementById('pendings');
const adminMsg      = document.getElementById('adminMsg');

// ── Observa o estado de autenticação ────────────────────
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginDiv.classList.add('hidden');
        adminDiv.classList.remove('hidden');
        loadPendings();
    } else {
        adminDiv.classList.add('hidden');
        loginDiv.classList.remove('hidden');
    }
});

// ── Login com Firebase Auth ──────────────────────────────
btnLogin.addEventListener('click', async () => {
    const email    = emailField.value.trim();
    const password = pwdField.value;
    loginMsg.textContent = '';

    if (!email || !password) {
        loginMsg.textContent = '⛔ Preencha e-mail e senha.';
        return;
    }

    btnLogin.disabled = true;
    btnLogin.textContent = 'Entrando…';

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged cuida do redirecionamento para o painel
    } catch (err) {
        const msgs = {
            'auth/invalid-email':         '⛔ E-mail inválido.',
            'auth/user-not-found':        '⛔ Usuário não encontrado.',
            'auth/wrong-password':        '⛔ Senha incorreta.',
            'auth/invalid-credential':    '⛔ Credenciais inválidas.',
            'auth/too-many-requests':     '⛔ Muitas tentativas. Tente mais tarde.',
        };
        loginMsg.textContent = msgs[err.code] || `⛔ Erro: ${err.message}`;
    } finally {
        btnLogin.disabled = false;
        btnLogin.textContent = 'Entrar';
    }
});

// ── Logout ───────────────────────────────────────────────
btnLogout.addEventListener('click', async () => {
    await signOut(auth);
});

// ── Carrega agendamentos pendentes ───────────────────────
async function loadPendings() {
    const q = query(
        collection(db, 'agendamentos'),
        where('status', '==', 'pendente')
    );
    const snap = await getDocs(q);
    pendingsTbody.innerHTML = '';

    if (snap.empty) {
        pendingsTbody.innerHTML = '<tr><td colspan="5">Nenhuma solicitação pendente.</td></tr>';
        return;
    }

    snap.forEach(docSnap => {
        const { nome, telefone, horario } = docSnap.data();
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${nome}</td>
            <td>${telefone}</td>
            <td>${horario.slice(0, 10)}</td>
            <td>${horario.slice(11, 16)}</td>
            <td><button data-id="${docSnap.id}">Aprovar</button></td>
        `;
        pendingsTbody.appendChild(tr);
    });

    pendingsTbody.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            await updateDoc(doc(db, 'agendamentos', id), { status: 'confirmado' });
            adminMsg.textContent = '✅ Agendamento aprovado!';
            loadPendings();
        });
    });
}
