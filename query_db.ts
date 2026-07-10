import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCictaSkKp_xEfgCrfE6lJcWgVFtgkVKQg",
  authDomain: "gen-lang-client-0252965692.firebaseapp.com",
  projectId: "gen-lang-client-0252965692",
  storageBucket: "gen-lang-client-0252965692.firebasestorage.app",
  messagingSenderId: "934408559844",
  appId: "1:934408559844:web:cbe738adfaf202e6dc20f1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-suiterrecorder-f71833a6-d5ba-4c41-97db-8e6362d9541b");

async function run() {
  console.log("=== INICIANDO BUSCA DE DADOS NO FIRESTORE ===");
  try {
    // 1. Listar reuniões
    const meetingsSnap = await getDocs(collection(db, "meetings"));
    console.log(`Total de reuniões encontradas: ${meetingsSnap.size}`);
    meetingsSnap.forEach((d) => {
      const data = d.data();
      console.log(`- ID: ${d.id}, Título: ${data.title}, Data: ${data.date}, Tags: ${JSON.stringify(data.tags)}`);
      if (JSON.stringify(data).toLowerCase().includes("neoclinica")) {
        console.log("!!! ENCONTRADO TEXTO 'neoclinica' na reunião acima !!!");
      }
    });

    // 2. Verificar logs
    console.log("\n=== BUSCANDO LOGS DO SISTEMA ===");
    const logsDoc = await getDoc(doc(db, "config", "suiter_logs"));
    if (logsDoc.exists()) {
      const data = logsDoc.data();
      const logs = data?.logs || [];
      console.log(`Total de logs encontrados: ${logs.length}`);
      logs.forEach((log: any, index: number) => {
        const text = JSON.stringify(log);
        if (text.toLowerCase().includes("neoclinica") || text.toLowerCase().includes("erro") || log.status === "error" || index < 10) {
          console.log(`Log #${index}: Timestamp: ${log.timestamp || log.date}, Título: ${log.title || log.meetingTitle}, Status: ${log.status}, Erro: ${log.error || log.errorMessage || "Nenhum"}`);
        }
      });
    } else {
      console.log("Documento de logs não existe.");
    }
  } catch (err) {
    console.error("Erro ao consultar Firestore:", err);
  }
}

run();
