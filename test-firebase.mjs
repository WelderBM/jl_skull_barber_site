// Teste Firebase com Node.js (CommonJS via Firebase SDK)
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, query, where } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB8Ax9_9JeVV2D48v6C7JqPmC4XG5gPryw",
  authDomain: "mix-novidades.firebaseapp.com",
  projectId: "mix-novidades",
  storageBucket: "mix-novidades.firebasestorage.app",
  messagingSenderId: "155436196034",
  appId: "1:155436196034:web:504b95331e286516a55b5b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  console.log("=== DIAGNÓSTICO FIREBASE ===\n");

  // 1. Leitura
  console.log("1. Testando LEITURA da coleção 'agendamentos'...");
  try {
    const snap = await getDocs(collection(db, "agendamentos"));
    console.log(`   ✅ OK! Documentos encontrados: ${snap.size}`);
    snap.forEach(d => {
      const data = d.data();
      console.log(`   → ${d.id}: horario=${data.horario}, status=${data.status}, nome=${data.nome}`);
    });
  } catch (e) {
    console.error(`   ❌ ERRO: ${e.code} — ${e.message}`);
  }

  // 2. Escrita
  console.log("\n2. Testando ESCRITA na coleção 'agendamentos'...");
  try {
    const ref = await addDoc(collection(db, "agendamentos"), {
      horario: "2026-03-08T10:00:00",
      nome: "TESTE_DIAGNOSTICO",
      telefone: "95999999999",
      status: "pendente",
      criadoEm: new Date().toISOString(),
      _teste: true
    });
    console.log(`   ✅ OK! Documento criado com ID: ${ref.id}`);
  } catch (e) {
    console.error(`   ❌ ERRO: ${e.code} — ${e.message}`);
  }

  // 3. Opiniões
  console.log("\n3. Testando coleção 'opinioes'...");
  try {
    const snap = await getDocs(collection(db, "opinioes"));
    console.log(`   ✅ OK! Documentos encontrados: ${snap.size}`);
  } catch (e) {
    console.error(`   ❌ ERRO: ${e.code} — ${e.message}`);
  }

  console.log("\n=== FIM DO DIAGNÓSTICO ===");
  process.exit(0);
}

main().catch(e => {
  console.error("Erro fatal:", e);
  process.exit(1);
});
