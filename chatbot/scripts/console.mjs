/**
 * Consola interactiva para probar el chatbot CoCo en la terminal.
 *
 * Simula conversaciones de WhatsApp sin necesidad de un teléfono ni conexión
 * a Meta/Baileys. Usa el mismo pipeline que el bot real:
 *   detectIntent → handler → catalog → Gemini → respuesta
 *
 * Uso:
 *   npm run console
 *
 * Comandos especiales dentro de la consola:
 *   /reset    — Reinicia la conversación (borra memoria)
 *   /memory   — Muestra el estado actual de la memoria
 *   /intent   — Muestra la intención detectada del último mensaje
 *   /help     — Muestra ayuda
 *   /exit     — Sale de la consola (también Ctrl+C)
 */

import "dotenv/config";
import readline from "node:readline";
import { handleIncomingMessage } from "../src/features/sales-assistant/handler.js";
import { detectIntent } from "../src/features/sales-assistant/intent.js";
import {
  getConversationMemoryScoped,
  clearConversationMemoryScoped
} from "../src/features/sales-assistant/memory.js";

// ── Configuración ─────────────────────────────────────────────────────────────

const PHONE = "console-test";
const FROM = "console@s.whatsapp.net";
const MESSAGE_ID = "console-msg";
const SESSION = "main";

// ── Mock del transporte de WhatsApp ───────────────────────────────────────────
// Captura los mensajes que el bot enviaría y los imprime en la terminal.
// Mantiene un contador de mensajes pendientes para que la consola no se cierre
// antes de que el bot termine de responder (el handler usa debounce de 2.5s).

let mensajesPendientes = 0;

const crearTransportConsola = () => {
  return {
    async sendTextMessage(_to, text) {
      // Simular el "escribiendo..." con un pequeño delay visual
      console.log("\n🥥 CoCo:\n");
      // Dividir en líneas para mejor legibilidad
      const lineas = text.split("\n");
      for (const linea of lineas) {
        console.log(`  ${linea}`);
      }
      console.log("");
      mensajesPendientes--;
    },
    async markMessageAsRead() {
      // No-op en consola
    },
    async connect() {
      // No-op en consola
    }
  };
};

// ── Banner de inicio ──────────────────────────────────────────────────────────

const mostrarBanner = () => {
  console.log("");
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  🥥 CoCo Chatbot — Consola Interactiva de Pruebas            ║");
  console.log("║  Directorio Comercial de Bolivia                             ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log("║  Escribe mensajes como si fueras un usuario de WhatsApp.     ║");
  console.log("║  El bot responderá usando el mismo pipeline real.            ║");
  console.log("║                                                              ║");
  console.log("║  Comandos especiales:                                        ║");
  console.log("║    /reset   — Reinicia la conversación                        ║");
  console.log("║    /memory  — Muestra el estado de la memoria                 ║");
  console.log("║    /intent  — Detecta la intención de un mensaje              ║");
  console.log("║    /help    — Muestra esta ayuda                              ║");
  console.log("║    /exit    — Sale de la consola                              ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");
};

const mostrarAyuda = () => {
  console.log("");
  console.log("📖 Comandos disponibles:");
  console.log("  /reset       Reinicia la conversación (borra memoria)");
  console.log("  /memory      Muestra el estado actual de la memoria");
  console.log("  /intent <m>  Detecta la intención del mensaje <m>");
  console.log("  /help        Muestra esta ayuda");
  console.log("  /exit        Sale de la consola (también Ctrl+C)");
  console.log("");
  console.log("💡 Ejemplos de mensajes para probar:");
  console.log("  hola");
  console.log("  necesito una ferreteria en Tarija");
  console.log("  Santa Fe Viajes S.R.L. en Santa Cruz");
  console.log("  ver mas resultados");
  console.log("  croacia le gano a espana");
  console.log("  como asi eres un buscador simple?");
  console.log("");
};

const mostrarMemoria = () => {
  const mem = getConversationMemoryScoped(SESSION, PHONE);
  console.log("");
  console.log("🧠 Estado de la memoria:");
  console.log(`  lastRubro:           "${mem.lastRubro}"`);
  console.log(`  lastUbicacion:      "${mem.lastUbicacion}"`);
  console.log(`  lastIntent:          ${mem.lastIntent}`);
  console.log(`  lastResultOffset:    ${mem.lastResultOffset}`);
  console.log(`  lastMatchingCount:   ${mem.lastMatchingCount}`);
  console.log(`  lastRubroTerms:      [${mem.lastRubroTerms.join(", ")}]`);
  console.log(`  lastLocationTerms:   [${mem.lastLocationTerms.join(", ")}]`);
  console.log(`  turns:               ${mem.turns.length}`);
  if (mem.turns.length > 0) {
    console.log("  Historial reciente:");
    for (const turn of mem.turns.slice(-6)) {
      const rol = turn.role === "user" ? "👤 Usuario" : "🥥 CoCo";
      const texto = turn.text.length > 80 ? turn.text.slice(0, 80) + "..." : turn.text;
      console.log(`    ${rol}: ${texto}`);
    }
  }
  console.log("");
};

const resetear = () => {
  clearConversationMemoryScoped(SESSION, PHONE);
  console.log("");
  console.log("🔄 Conversación reiniciada. La memoria está vacía.");
  console.log("");
};

// ── Loop principal ────────────────────────────────────────────────────────────

const main = async () => {
  mostrarBanner();

  const transport = crearTransportConsola();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "👤 Tú > ",
  });

  // Inicializar memoria limpia
  clearConversationMemoryScoped(SESSION, PHONE);

  console.log("✅ Listo. Escribe tu primer mensaje:\n");
  rl.prompt();

  rl.on("line", async (line) => {
    const input = line.trim();

    // Ignorar líneas vacías
    if (!input) {
      rl.prompt();
      return;
    }

    // ── Comandos especiales ──
    if (input.startsWith("/")) {
      const [cmd, ...rest] = input.split(" ");
      const arg = rest.join(" ");

      switch (cmd.toLowerCase()) {
        case "/reset":
          resetear();
          break;
        case "/memory":
          mostrarMemoria();
          break;
        case "/intent":
          if (arg) {
            const intent = detectIntent(arg);
            console.log(`\n🔍 Intención detectada para "${arg}": ${intent}\n`);
          } else {
            console.log("\n⚠️  Uso: /intent <mensaje>\n");
          }
          break;
        case "/help":
          mostrarAyuda();
          break;
        case "/exit":
          console.log("\n👋 ¡Hasta luego! 🥥\n");
          rl.close();
          process.exit(0);
          break;
        default:
          console.log(`\n⚠️  Comando desconocido: ${cmd}. Usa /help para ver los comandos.\n`);
      }
      rl.prompt();
      return;
    }

    // ── Procesar mensaje normal ──
    console.log("\n⏳ Procesando...\n");
    mensajesPendientes++;

    try {
      await handleIncomingMessage(
        { from: FROM, text: input, messageId: MESSAGE_ID, phone: PHONE },
        transport
      );
    } catch (err) {
      console.error("\n❌ Error al procesar el mensaje:", err.message || err);
      console.log("");
      mensajesPendientes--;
    }

    rl.prompt();
  });

  rl.on("close", async () => {
    // Esperar a que terminen los mensajes pendientes (debounce + Gemini)
    if (mensajesPendientes > 0) {
      console.log(`\n⏳ Esperando ${mensajesPendientes} respuesta(s) pendiente(s)...`);
      // Esperar hasta 30s máximo
      for (let i = 0; i < 60 && mensajesPendientes > 0; i++) {
        await new Promise((res) => setTimeout(res, 500));
      }
    }
    console.log("\n👋 ¡Hasta luego! 🥥\n");
    process.exit(0);
  });

  // Capturar Ctrl+C
  process.on("SIGINT", () => {
    console.log("\n👋 ¡Hasta luego! 🥥\n");
    process.exit(0);
  });
};

main().catch((err) => {
  console.error("\n💥 Error fatal:", err);
  process.exit(1);
});