import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.17.0/firebase-app.js';
import {
    initializeFirestore, collection, query, where,
    getDocs, updateDoc, doc
} from 'https://www.gstatic.com/firebasejs/9.17.0/firebase-firestore.js';

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
const db = initializeFirestore(app, { experimentalForceLongPolling: true, useFetchStreams: false });

const loginDiv = document.getElementById('login');
const adminDiv = document.getElementById('admin');
const btnLogin = document.getElementById('btnLogin');
const pwdField = document.getElementById('pwd');
const loginMsg = document.getElementById('loginMsg');
const pendingsTbody = document.getElementById('pendings');
const adminMsg = document.getElementById('adminMsg');

// senha hard-coded só COMO EXEMPLO
const MASTER_PWD = 'suaSenhaSecreta';

btnLogin.addEventListener('click', async () => {
    if (pwdField.value !== MASTER_PWD) {
        loginMsg.textContent = 'Senha incorreta';
        return;
    }
    loginDiv.classList.add('hidden');
    adminDiv.classList.remove('hidden');
    await loadPendings();
});

async function loadPendings() {
    const q = query(
        collection(db, 'agendamentos'),
        where('status', '==', 'pendente')
    );
    const snap = await getDocs(q);
    pendingsTbody.innerHTML = '';
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
            adminMsg.textContent = 'Agendamento aprovado!';
            // aqui você pode: 
            // • chamar uma Cloud Function para enviar WhatsApp/Push/Email
            // • ou simplesmente recarregar a lista:
            loadPendings();
        });
    });
}
