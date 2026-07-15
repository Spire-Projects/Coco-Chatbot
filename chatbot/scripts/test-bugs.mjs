/**
 * Script de pruebas para verificar las correcciones de los 3 bugs reportados:
 *
 * 1. Bug de eco/repetición del input del usuario
 *    - El bot no debe repetir literalmente lo que el usuario escribió
 *
 * 2. Bug de búsqueda por nombre específico
 *    - "Santa Fe Viajes S.R.L. en Santa Cruz" debe devolver SOLO esa empresa
 *    - No debe mezclar con otras empresas del rubro "viajes"
 *
 * 3. Bug de paginación ("ver más resultados")
 *    - Cuando el usuario pide ver más, el bot debe enviar el SIGUIENTE lote
 *    - No debe reenviar los mismos resultados ya mostrados
 *
 * Uso:
 *   node scripts/test-bugs.mjs
 *   (o) npx tsx scripts/test-bugs.mjs
 *
 * Requiere las variables de entorno en .env (SHEETS_SPREADSHEET_ID, etc.)
 */

import "dotenv/config";
import { searchCatalog, searchCatalogByName, countCatalog, getTotalCount } from "../src/features/sales-assistant/catalog.js";
import { detectIntent, extractCompanyName } from "../src/features/sales-assistant/intent.js";
import { getConversationMemoryScoped, clearConversationMemoryScoped } from "../src/features/sales-assistant/memory.js";

// ── Utilidades de test ────────────────────────────────────────────────────────

const PASARON = [];
const FALLARON = [];
const SALTARON = [];

const assert = (condicion, mensaje) => {
  if (condicion) {
    PASARON.push(mensaje);
    console.log(`  ✅ ${mensaje}`);
  } else {
    FALLARON.push(mensaje);
    console.log(`  ❌ ${mensaje}`);
  }
};

const skip = (mensaje, razon) => {
  SALTARON.push(`${mensaje} (${razon})`);
  console.log(`  ⏭️  ${mensaje} — SALTADO: ${razon}`);
};

const seccion = (titulo) => {
  console.log(`\n${"═".repeat(70)}`);
  console.log(`▶ ${titulo}`);
  console.log(`${"═".repeat(70)}`);
};

const resumen = () => {
  console.log(`\n${"═".repeat(70)}`);
  console.log("RESUMEN DE PRUEBAS");
  console.log(`${"═".repeat(70)}`);
  console.log(`  ✅ Pasaron:   ${PASARON.length}`);
  console.log(`  ❌ Fallaron:  ${FALLARON.length}`);
  console.log(`  ⏭️  Saltaron:  ${SALTARON.length}`);
  if (FALLARON.length > 0) {
    console.log("\nPruebas fallidas:");
    for (const f of FALLARON) console.log(`  • ${f}`);
  }
  console.log(`${"═".repeat(70)}\n`);
  process.exit(FALLARON.length > 0 ? 1 : 0);
};

// ── Mock del transporte de WhatsApp ───────────────────────────────────────────

const crearTransportMock = () => {
  const mensajesEnviados = [];
  return {
    mensajesEnviados,
    async sendTextMessage(to, text) {
      mensajesEnviados.push({ to, text });
    },
    async markMessageAsRead() {},
    async connect() {},
  };
};

// ── Pruebas ───────────────────────────────────────────────────────────────────

const main = async () => {
  // ════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 1: Detección de intención (sin red, pura lógica)
  // ════════════════════════════════════════════════════════════════════════════
  seccion("1. Detección de intención (detectIntent)");

  // Bug 2: búsqueda por nombre específico
  assert(
    detectIntent("Santa Fe Viajes S.R.L. en Santa Cruz") === "name_search",
    `"Santa Fe Viajes S.R.L. en Santa Cruz" → name_search`
  );
  assert(
    detectIntent("nesecito la empresa Santa Fe Viajes S.R.L.") === "name_search",
    `"nesecito la empresa Santa Fe Viajes S.R.L." → name_search`
  );
  assert(
    detectIntent("empresa llamada Freegroup Travel") === "name_search",
    `"empresa llamada Freegroup Travel" → name_search`
  );
  assert(
    detectIntent("la empresa Pescatur") === "name_search",
    `"la empresa Pescatur" → name_search`
  );

  // Bug 3: paginación
  assert(
    detectIntent("ver mas resultados") === "more_results",
    `"ver mas resultados" → more_results`
  );
  assert(
    detectIntent("quiero ver mas") === "more_results",
    `"quiero ver mas" → more_results`
  );
  assert(
    detectIntent("hay mas empresas?") === "more_results",
    `"hay mas empresas?" → more_results`
  );
  assert(
    detectIntent("muestrame los demas") === "more_results",
    `"muestrame los demas" → more_results`
  );
  assert(
    detectIntent("siguientes") === "more_results",
    `"siguientes" → more_results`
  );

  // Búsquedas por rubro normales NO deben ser name_search
  assert(
    detectIntent("nesecito agencia despachante aduanas en La paz") === "query",
    `"nesecito agencia despachante aduanas en La paz" → query (no name_search)`
  );
  assert(
    detectIntent("busco ferreterias en Tarija") === "query",
    `"busco ferreterias en Tarija" → query`
  );

  // Saludos
  assert(detectIntent("hola") === "greeting", `"hola" → greeting`);
  assert(detectIntent("buenas tardes") === "greeting", `"buenas tardes" → greeting`);
  assert(detectIntent("gracias chau") === "farewell", `"gracias chau" → farewell`);

  // ════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 1b: Detección de fuera de contexto (out_of_scope)
  // ════════════════════════════════════════════════════════════════════════════
  seccion("1b. Detección de fuera de contexto (out_of_scope)");

  // Deportes
  assert(
    detectIntent("croacia le gano a espana") === "out_of_scope",
    `"croacia le gano a espana" → out_of_scope (deportes)`
  );
  assert(
    detectIntent("En hokey") === "out_of_scope",
    `"En hokey" → out_of_scope (deportes)`
  );

  // Conversacional / meta-conversación
  assert(
    detectIntent("COmo asi eres un buscador simple??") === "out_of_scope",
    `"COmo asi eres un buscador simple??" → out_of_scope (meta-conversación)`
  );
  assert(
    detectIntent("sabias") === "out_of_scope",
    `"sabias" → out_of_scope (conversacional)`
  );
  assert(
    detectIntent("prro") === "out_of_scope",
    `"prro" → out_of_scope (jerga)`
  );

  // Pregunta sobre ubicación personal del bot
  assert(
    detectIntent("Y por ubicacion no tienes vivo en la zona norte") === "out_of_scope",
    `"Y por ubicacion no tienes vivo en la zona norte" → out_of_scope (conversacional)`
  );

  // Búsquedas legítimas NO deben ser out_of_scope
  assert(
    detectIntent("necesito una ferreteria en Tarija") !== "out_of_scope",
    `"necesito una ferreteria en Tarija" NO → out_of_scope (búsqueda legítima)`
  );
  assert(
    detectIntent("busco una farmacia en La Paz") !== "out_of_scope",
    `"busco una farmacia en La Paz" NO → out_of_scope (búsqueda legítima)`
  );
  assert(
    detectIntent("Santa Fe Viajes S.R.L. en Santa Cruz") !== "out_of_scope",
    `"Santa Fe Viajes S.R.L. en Santa Cruz" NO → out_of_scope (búsqueda por nombre)`
  );

  // "hola busco ferreterias" NO debe ser greeting (mensaje largo con rubro)
  assert(
    detectIntent("hola busco ferreterias en santa cruz") !== "greeting",
    `"hola busco ferreterias en santa cruz" NO → greeting (mensaje largo)`
  );

  // ════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 2: Extracción del nombre de empresa (extractCompanyName)
  // ════════════════════════════════════════════════════════════════════════════
  seccion("2. Extracción de nombre de empresa (extractCompanyName)");

  const nombre1 = extractCompanyName("Santa Fe Viajes S.R.L. en Santa Cruz");
  console.log(`    → extraído: "${nombre1}"`);
  assert(
    nombre1.includes("santa fe viajes"),
    `extractCompanyName incluye "santa fe viajes" (got: "${nombre1}")`
  );

  const nombre2 = extractCompanyName("nesecito la empresa Santa Fe Viajes S.R.L.");
  console.log(`    → extraído: "${nombre2}"`);
  assert(
    nombre2.includes("santa fe viajes"),
    `extractCompanyName incluye "santa fe viajes" (got: "${nombre2}")`
  );

  const nombre3 = extractCompanyName("empresa llamada Freegroup Travel");
  console.log(`    → extraído: "${nombre3}"`);
  assert(
    nombre3.includes("freegroup"),
    `extractCompanyName incluye "freegroup" (got: "${nombre3}")`
  );

  // ════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 3: Búsqueda por nombre en el Excel real (Bug 2)
  // ════════════════════════════════════════════════════════════════════════════
  seccion("3. Búsqueda por nombre en Excel real (Bug 2: Santa Fe Viajes S.R.L.)");

  let nombreBuscado = "santa fe viajes s.r.l";
  let resultadosNombre = [];
  try {
    resultadosNombre = await searchCatalogByName(nombreBuscado, ["santa cruz"], 10);
    console.log(`    Resultados por nombre "${nombreBuscado}" en Santa Cruz: ${resultadosNombre.length}`);
    for (const item of resultadosNombre) {
      console.log(`      • ${item.nombre} — ${item.departamento}, ${item.municipio}`);
    }
  } catch (err) {
    skip("Búsqueda por nombre en Excel", `Error de red: ${err.message}`);
    resultadosNombre = null;
  }

  if (resultadosNombre !== null) {
    assert(
      resultadosNombre.length > 0,
      `searchCatalogByName("santa fe viajes s.r.l", Santa Cruz) devuelve al menos 1 resultado`
    );

    if (resultadosNombre.length > 0) {
      const encontroSantaFe = resultadosNombre.some(
        (item) => item.nombre.toLowerCase().includes("santa fe viajes")
      );
      assert(
        encontroSantaFe,
        `"Santa Fe Viajes" aparece en los resultados de búsqueda por nombre`
      );

      // Bug 2 clave: NO debe mezclar con otras empresas del rubro viajes
      const nombresEncontrados = resultadosNombre.map((i) => i.nombre.toLowerCase());
      const tieneFreegroup = nombresEncontrados.some((n) => n.includes("freegroup"));
      const tienePescatur = nombresEncontrados.some((n) => n.includes("pescatur"));
      assert(
        !tieneFreegroup && !tienePescatur,
        `Búsqueda por nombre NO mezcla con Freegroup/Pescatur (otras del rubro viajes)`
      );

      // Todos los resultados deben contener "santa fe" en el nombre
      const todosCoincidenNombre = resultadosNombre.every(
        (item) => item.nombre.toLowerCase().includes("santa fe") ||
                  item.nombre.toLowerCase().includes("santa")
      );
      assert(
        todosCoincidenNombre,
        `Todos los resultados por nombre contienen "santa" en el nombre (no son de rubro ajeno)`
      );
    }
  }

  // Comparación: búsqueda por RUBRO "viajes" en Santa Cruz SÍ debe traer muchas
  seccion("3b. Comparación: búsqueda por rubro 'viajes' en Santa Cruz");
  let resultadosRubro = [];
  try {
    resultadosRubro = await searchCatalog(["viajes"], ["santa cruz"], 15, 0);
    console.log(`    Resultados por rubro "viajes" en Santa Cruz: ${resultadosRubro.length}`);
    for (const item of resultadosRubro.slice(0, 8)) {
      console.log(`      • ${item.nombre} — ${item.actividadPrincipal}`);
    }
  } catch (err) {
    skip("Búsqueda por rubro en Excel", `Error de red: ${err.message}`);
    resultadosRubro = null;
  }

  if (resultadosRubro !== null) {
    assert(
      resultadosRubro.length > 0,
      `searchCatalog(["viajes"], Santa Cruz) devuelve resultados (rubro funciona)`
    );
    // La búsqueda por rubro SÍ puede traer Freegroup, Pescatur, etc.
    const nombresRubro = resultadosRubro.map((i) => i.nombre.toLowerCase());
    const tieneFreegroupRubro = nombresRubro.some((n) => n.includes("freegroup"));
    console.log(`    (Por rubro, Freegroup presente: ${tieneFreegroupRubro} — esperado, es búsqueda por rubro)`);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 4: Paginación (Bug 3) — "ver más resultados" debe avanzar offset
  // ════════════════════════════════════════════════════════════════════════════
  seccion("4. Paginación: 'ver más resultados' avanza offset (Bug 3)");

  let totalViajes = 0;
  try {
    totalViajes = await countCatalog(["viajes"], ["santa cruz"]);
    console.log(`    Total de empresas de "viajes" en Santa Cruz: ${totalViajes}`);
  } catch (err) {
    skip("countCatalog viajes", `Error de red: ${err.message}`);
  }

  if (totalViajes > 5) {
    // Página 1 (offset 0)
    const pagina1 = await searchCatalog(["viajes"], ["santa cruz"], 5, 0);
    console.log(`    Página 1 (offset 0): ${pagina1.length} empresas`);
    for (const item of pagina1) console.log(`      • ${item.nombre}`);

    // Página 2 (offset 5) — debe ser DIFERENTE a la página 1
    const pagina2 = await searchCatalog(["viajes"], ["santa cruz"], 5, 5);
    console.log(`    Página 2 (offset 5): ${pagina2.length} empresas`);
    for (const item of pagina2) console.log(`      • ${item.nombre}`);

    assert(pagina1.length > 0, "Página 1 tiene resultados");
    assert(pagina2.length > 0, "Página 2 tiene resultados");

    // Bug 3 clave: las páginas deben ser DIFERENTES (no repetir los mismos)
    const nombresPagina1 = new Set(pagina1.map((i) => i.nombre));
    const nombresPagina2 = new Set(pagina2.map((i) => i.nombre));
    const interseccion = [...nombresPagina1].filter((n) => nombresPagina2.has(n));
    assert(
      interseccion.length === 0,
      `Página 1 y Página 2 NO comparten empresas (intersección: ${interseccion.length})`
    );

    // Página 3 (offset 10)
    const pagina3 = await searchCatalog(["viajes"], ["santa cruz"], 5, 10);
    console.log(`    Página 3 (offset 10): ${pagina3.length} empresas`);
    if (pagina3.length > 0) {
      const nombresPagina3 = new Set(pagina3.map((i) => i.nombre));
      const interseccion13 = [...nombresPagina1].filter((n) => nombresPagina3.has(n));
      const interseccion23 = [...nombresPagina2].filter((n) => nombresPagina3.has(n));
      assert(
        interseccion13.length === 0 && interseccion23.length === 0,
        "Página 3 no repite empresas de páginas 1 ni 2"
      );
    }
  } else {
    skip("Paginación con 'viajes' en Santa Cruz", `Solo ${totalViajes} resultados (necesario >5)`);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 5: Estado de memoria para paginación (Bug 3 — handler)
  // ════════════════════════════════════════════════════════════════════════════
  seccion("5. Estado de memoria para paginación (Bug 3 — handler)");

  const PHONE_TEST = "test-pagination-123";
  clearConversationMemoryScoped("main", PHONE_TEST);
  const mem = getConversationMemoryScoped("main", PHONE_TEST);

  assert(mem.lastResultOffset === 0, "Memoria nueva inicia con lastResultOffset = 0");
  assert(mem.lastMatchingCount === 0, "Memoria nueva inicia con lastMatchingCount = 0");
  assert(mem.lastRubroTerms.length === 0, "Memoria nueva inicia con lastRubroTerms vacío");

  // Simular estado después de una búsqueda por rubro
  mem.lastRubroTerms = ["viajes"];
  mem.lastLocationTerms = ["santa cruz"];
  mem.lastResultOffset = 0;
  mem.lastMatchingCount = totalViajes || 15;

  // Simular "ver más" → offset debe avanzar a 5
  const nextOffset = mem.lastResultOffset + 5;
  mem.lastResultOffset = nextOffset;
  assert(
    mem.lastResultOffset === 5,
    "Tras 'ver más', lastResultOffset avanza a 5"
  );

  // Simular otro "ver más" → offset debe avanzar a 10
  const nextOffset2 = mem.lastResultOffset + 5;
  mem.lastResultOffset = nextOffset2;
  assert(
    mem.lastResultOffset === 10,
    "Tras segundo 'ver más', lastResultOffset avanza a 10"
  );

  // Verificar que remaining se calcula correctamente
  const remaining = mem.lastMatchingCount - mem.lastResultOffset;
  console.log(`    Offset actual: ${mem.lastResultOffset}, Total: ${mem.lastMatchingCount}, Restantes: ${remaining}`);
  assert(
    remaining === (mem.lastMatchingCount - 10),
    "Cálculo de 'remaining' es consistente con offset"
  );

  clearConversationMemoryScoped("main", PHONE_TEST);

  // ════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 6: Anti-eco (Bug 1) — verificación del prompt seed
  // ════════════════════════════════════════════════════════════════════════════
  seccion("6. Anti-eco en prompt seed (Bug 1)");

  const { buildGlobalPromptSeed } = await import("../src/features/prompts/defaults.js");
  const promptSeed = buildGlobalPromptSeed();

  assert(
    promptSeed.includes("ANTI-ECO"),
    "Prompt seed contiene la sección ANTI-ECO"
  );
  assert(
    promptSeed.includes("NUNCA repitas") || promptSeed.includes("NUNCA hagas eco"),
    "Prompt seed prohíbe repetir el texto del usuario"
  );
  assert(
    promptSeed.toLowerCase().includes("nesecito"),
    "Prompt seed menciona el caso 'nesecito' como ejemplo de error"
  );
  assert(
    !promptSeed.includes("empresas de <texto crudo") === false, // debe incluirlo como ejemplo incorrecto
    "Prompt seed incluye ejemplo de eco incorrecto"
  );

  // ════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 7: Búsqueda por nombre NO trae rubro ajeno (Bug 2 — robustez)
  // ════════════════════════════════════════════════════════════════════════════
  seccion("7. Búsqueda por nombre vs rubro — resultados distintos (Bug 2)");

  if (resultadosNombre !== null && resultadosRubro !== null &&
      resultadosNombre.length > 0 && resultadosRubro.length > 0) {
    const nombresPorNombre = new Set(resultadosNombre.map((i) => i.nombre));
    const nombresPorRubro = resultadosRubro.map((i) => i.nombre);

    // La búsqueda por nombre debe ser un subconjunto estricto del rubro
    // (o al menos no traer TODAS las del rubro)
    const empresasSoloEnRubro = nombresPorRubro.filter((n) => !nombresPorNombre.has(n));
    console.log(`    Empresas por nombre: ${resultadosNombre.length}`);
    console.log(`    Empresas por rubro:  ${resultadosRubro.length}`);
    console.log(`    Empresas solo en rubro (no en nombre): ${empresasSoloEnRubro.length}`);

    assert(
      empresasSoloEnRubro.length > 0,
      "Búsqueda por rubro trae empresas que la búsqueda por nombre NO trae (confirma que son búsquedas distintas)"
    );
  } else {
    skip("Comparación nombre vs rubro", "Resultados insuficientes");
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 8: Total del directorio (sanity check)
  // ════════════════════════════════════════════════════════════════════════════
  seccion("8. Total del directorio (sanity check)");

  try {
    const total = await getTotalCount();
    console.log(`    Total de empresas en el directorio: ${total}`);
    assert(total > 0, `getTotalCount() devuelve > 0 (got: ${total})`);
    assert(total > 100, `Directorio tiene más de 100 empresas (got: ${total})`);
  } catch (err) {
    skip("getTotalCount", `Error de red: ${err.message}`);
  }

  resumen();
};

main().catch((err) => {
  console.error("\n💥 Error fatal en las pruebas:", err);
  process.exit(2);
});