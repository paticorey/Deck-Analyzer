import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";

/*
  Commander Deck Analyzer v1.5
  - Mantiene la UI visual del prototipo original.
  - Arranca vacío.
  - Permite pegar decklist.
  - Calcula tipos, curva, roles, overall score y bracket.
  - Soporta tags manuales [Ramp], [Draw], [Blink], [Goad], etc.
  - Puede enriquecer con Scryfall para mana value, type line, color identity e imágenes.
*/

const CARD_TYPE_COLORS = {
  Commander: "#22c55e",
  Criaturas: "#4ade80",
  Sortilegios: "#a78bfa",
  Tierras: "#4b5563",
  Instantáneos: "#60a5fa",
  Artefactos: "#fbbf24",
  Encantamientos: "#f472b6",
  Planeswalker: "#34d399",
  Otros: "#94a3b8",
};

const ROLE_COLORS = {
  Ramp: "#f59e0b",
  Draw: "#06b6d4",
  Removal: "#ef4444",
  "Board Wipe": "#dc2626",
  Counterspell: "#38bdf8",
  Protection: "#22c55e",
  Tutor: "#e879f9",
  Tokens: "#84cc16",
  "Sac Outlet": "#f97316",
  Untap: "#a3e635",
  Evasion: "#facc15",
  Drain: "#a855f7",
  Lifegain: "#ec4899",
  Recursion: "#3b82f6",
  Reanimator: "#2563eb",
  Voltron: "#facc15",
  Equipment: "#eab308",
  Blink: "#93c5fd",
  ETB: "#60a5fa",
  Spellslinger: "#818cf8",
  Artifacts: "#fbbf24",
  Enchantress: "#f472b6",
  Tribal: "#4ade80",
  Counters: "#34d399",
  Proliferate: "#2dd4bf",
  Stax: "#f43f5e",
  Goad: "#fb7185",
  Theft: "#fb923c",
  "Extra Turns": "#c084fc",
  "Mass Land Denial": "#f97316",
  "Game Changer": "#facc15",
  "Fast Mana": "#fde047",
  Combo: "#c084fc",
  Finisher: "#dc2626",
  Land: "#6b7280",
  Other: "#6b7280",
};

const ROLE_DESCRIPTIONS = {
  Ramp: "Acelera maná: rocks, dorks, land ramp, tesoros o formas de jugar más tierras.",
  Draw: "Robo de cartas o ventaja de cartas: draw, investigate, clues o efectos que ponen cartas en mano.",
  Removal: "Respuesta puntual contra amenazas: destruir, exiliar, bounce, fight o daño a objetivo.",
  "Board Wipe": "Limpieza global: destruye/exilia muchas criaturas o permanentes, daño global o -X/-X masivo.",
  Counterspell: "Contrahechizos o respuestas a habilidades en la pila.",
  Protection: "Protege piezas clave: hexproof, indestructible, phase out, boots, ward o efectos similares.",
  Tutor: "Busca cartas en biblioteca que no son solo tierras básicas/land ramp.",
  Tokens: "Crea fichas o tiene una función fuerte con fichas.",
  "Sac Outlet": "Permite sacrificar criaturas/permanentes como coste o motor repetible.",
  Untap: "Endereza permanentes o habilita loops con criaturas/artefactos que se giran.",
  Evasion: "Ayuda a conectar daño: flying, trample, menace, unblockable, etc.",
  Drain: "Hace perder vida a oponentes, normalmente ligado a aristocrats, lifegain o sacrificios.",
  Lifegain: "Gana vida o convierte eventos en ganancia de vida.",
  Recursion: "Recupera cartas del cementerio a mano/biblioteca o permite reutilizarlas.",
  Reanimator: "Devuelve criaturas directamente del cementerio al campo de batalla.",
  Voltron: "Mejora una criatura/comandante con auras, buffs o plan de daño de comandante.",
  Equipment: "Equipo o sinergia explícita con equipos/equipped creature.",
  Blink: "Exilia y devuelve permanentes para repetir ETB/proteger/reutilizar efectos.",
  ETB: "Tiene o premia entradas al campo de batalla.",
  Spellslinger: "Premia lanzar/copiar instantáneos y conjuros o jugar alrededor de ellos.",
  Artifacts: "Sinergia real con artefactos, no simplemente ser un artefacto/ramp rock.",
  Enchantress: "Sinergia con encantamientos, auras o constellation.",
  Tribal: "Se apoya en tipos de criatura, lords o kindred effects.",
  Counters: "Pone, mueve, duplica o se beneficia de contadores, sobre todo +1/+1.",
  Proliferate: "Prolifera contadores en permanentes/jugadores.",
  Stax: "Limita acciones de jugadores: no lanzar, no enderezar, pagar impuestos, etc.",
  Goad: "Fuerza criaturas rivales a atacar a otros jugadores si pueden.",
  Theft: "Roba/controla cartas o permite jugar cartas de oponentes.",
  "Extra Turns": "Da turnos extra.",
  "Mass Land Denial": "Destruye/niega tierras o bloquea recursos de maná de forma masiva.",
  "Game Changer": "Carta de la lista de Game Changers/alto impacto usada para estimar bracket.",
  "Fast Mana": "Aceleración explosiva por encima del ramp normal.",
  Combo: "Pieza que permite ganar o generar bucles decisivos.",
  Finisher: "Carta que ayuda a cerrar la partida: X-spells, overrun, daño masivo, wincons.",
  Land: "Tierra o carta usada principalmente como fuente de maná.",
  Other: "Rol no clasificado todavía.",
};

const GAME_CHANGERS = new Set([
  "drannith magistrate", "enlightened tutor", "serra's sanctum", "smothering tithe", "trouble in pairs",
  "cyclonic rift", "expropriate", "force of will", "fierce guardianship", "rhystic study", "thassa's oracle",
  "urza, lord high artificer", "mystical tutor", "jin-gitaxias, core augur", "bolas's citadel",
  "demonic tutor", "imperial seal", "opposition agent", "tergrid, god of fright", "vampiric tutor", "ad nauseam",
  "jeska's will", "gaea's cradle", "underworld breach", "survival of the fittest", "vorinclex, voice of hunger",
  "the one ring", "trinisphere", "chrome mox", "grim monolith", "lion's eye diamond", "mox diamond", "mana vault",
  "ancient tomb", "glacial chasm", "the tabernacle at pendrell vale", "kinnan, bonder prodigy",
  "yuriko, the tiger's shadow", "winota, joiner of forces", "grand arbiter augustin iv",
]);

const FAST_MANA_PREMIUM = new Set([
  "mana crypt", "mana vault", "chrome mox", "mox diamond", "mox opal", "lion's eye diamond", "grim monolith", "ancient tomb", "jeweled lotus",
]);

const STRONG_TUTORS = new Set([
  "demonic tutor", "vampiric tutor", "imperial seal", "mystical tutor", "enlightened tutor", "worldly tutor", "personal tutor", "gamble", "entomb", "intuition",
]);

const MASS_LAND_DENIAL = new Set([
  "armageddon", "ravages of war", "jokulhaups", "obliterate", "decree of annihilation", "ruination", "winter orb", "static orb", "stasis", "worldslayer",
]);

const EXTRA_TURNS = new Set([
  "time warp", "temporal manipulation", "capture of jingzhou", "nexus of fate", "expropriate", "time stretch", "alrund's epiphany", "walk the aeons",
]);

const COMBOS = [
  {
    name: "Exquisite Blood + Sanguine Bond",
    pieces: ["Exquisite Blood", "Sanguine Bond"],
    type: "Infinite lifedrain",
    effects: ["Infinite lifegain", "Infinite lifedrain", "Win line"],
    power: "Alta",
    desc: "Cuando un oponente pierde vida, ganás vida; Sanguine Bond vuelve a hacerle perder vida y se repite.",
    steps: [
      "Controlá Exquisite Blood y Sanguine Bond.",
      "Hacé que un oponente pierda vida o ganá vida por cualquier fuente.",
      "El trigger de una pieza dispara la otra y el bucle se repite."
    ],
    prerequisites: ["Necesitás iniciar el loop con una pérdida de vida o ganancia de vida."],
  },
  {
    name: "Exquisite Blood + Dina, Soul Steeper",
    pieces: ["Exquisite Blood", "Dina, Soul Steeper"],
    type: "Infinite lifedrain",
    effects: ["Infinite lifegain", "Infinite lifedrain", "Win line"],
    power: "Alta",
    desc: "Dina hace perder vida al ganar vida; Exquisite Blood vuelve a ganar vida y el loop se repite.",
    steps: [
      "Controlá Dina y Exquisite Blood.",
      "Ganá vida por cualquier fuente.",
      "Dina hace perder vida a cada oponente y Exquisite Blood vuelve a darte vida. Repetí."
    ],
    prerequisites: ["Necesitás iniciar el loop ganando vida."],
  },
  {
    name: "Ashaya, Soul of the Wild + Quirion Ranger",
    pieces: ["Ashaya, Soul of the Wild", "Quirion Ranger"],
    type: "Infinite untap / ETB-style loop",
    effects: ["Infinite ETB", "Infinite landfall triggers", "Infinite LTB", "Infinite storm count"],
    power: "Alta",
    desc: "Ashaya convierte criaturas no-token en Bosques; Quirion Ranger puede devolverse a sí misma para enderezar otra criatura.",
    steps: [
      "Controlá Ashaya y Quirion Ranger.",
      "Activá Quirion Ranger devolviéndose a sí misma a la mano para enderezar una criatura objetivo.",
      "Volvé a lanzar Quirion Ranger y repetí el proceso."
    ],
    prerequisites: ["Controlás una criatura no-token que pueda ser enderezada.", "Quirion Ranger no debe estar afectada por mareo si necesitás tapearla para otra línea."],
  },
  {
    name: "Selvala, Heart of the Wilds + Umbral Mantle",
    pieces: ["Selvala, Heart of the Wilds", "Umbral Mantle"],
    type: "Infinite mana / infinite power",
    effects: ["Infinite green mana", "Infinite creature power", "Infinite untap"],
    power: "Alta",
    desc: "Si Selvala genera al menos 4 manás, Umbral Mantle permite enderezarla y darle +2/+2, aumentando la cantidad de maná que produce.",
    steps: [
      "Equipá Umbral Mantle a Selvala.",
      "Activá Selvala para agregar maná igual a la mayor fuerza entre criaturas que controlás.",
      "Pagá 3 para enderezar Selvala con Umbral Mantle y darle +2/+2.",
      "Repetí para generar maná y fuerza infinitos."
    ],
    prerequisites: ["Selvala debe poder tapearse.", "La mayor fuerza entre criaturas que controlás debe ser 4 o más al comenzar."],
  },
  {
    name: "Ivy Lane Denizen + Herd Baloth",
    pieces: ["Ivy Lane Denizen", "Herd Baloth"],
    type: "Infinite tokens / counters",
    effects: ["Infinite creature tokens", "Infinite +1/+1 counters", "Infinite ETB"],
    power: "Media-Alta",
    desc: "Cada contador +1/+1 en Herd Baloth crea una Bestia verde, que dispara Ivy Lane Denizen para poner otro contador.",
    steps: [
      "Controlá Ivy Lane Denizen y Herd Baloth.",
      "Poné un contador +1/+1 sobre Herd Baloth.",
      "Herd Baloth crea una ficha verde 4/4.",
      "La ficha dispara Ivy Lane Denizen, poniendo otro contador sobre Herd Baloth. Repetí."
    ],
    prerequisites: ["Necesitás iniciar el loop poniendo un contador +1/+1 sobre Herd Baloth."],
  },
  {
    name: "Thassa's Oracle + Demonic Consultation",
    pieces: ["Thassa's Oracle", "Demonic Consultation"],
    type: "Win the game",
    effects: ["Win the game", "Library exile"],
    power: "cEDH",
    desc: "Exilia la biblioteca y gana con el trigger de Oracle.",
    steps: ["Lanzá Thassa's Oracle.", "Con el trigger en pila, lanzá Demonic Consultation nombrando una carta que no esté en tu biblioteca.", "Resolvé el trigger de Oracle y ganá."],
    prerequisites: ["Necesitás poder resolver Oracle y Consultation."],
  },
  {
    name: "Thassa's Oracle + Tainted Pact",
    pieces: ["Thassa's Oracle", "Tainted Pact"],
    type: "Win the game",
    effects: ["Win the game", "Library exile"],
    power: "cEDH",
    desc: "Otra línea compacta de Oracle para ganar inmediatamente.",
    steps: ["Lanzá Thassa's Oracle.", "Con el trigger en pila, resolvé Tainted Pact hasta vaciar o casi vaciar la biblioteca.", "Resolvé Oracle y ganá."],
    prerequisites: ["La manabase/lista debe permitir Tainted Pact sin duplicados relevantes."],
  },
  {
    name: "Kiki-Jiki + Zealous Conscripts",
    pieces: ["Kiki-Jiki, Mirror Breaker", "Zealous Conscripts"],
    type: "Infinite tokens",
    effects: ["Infinite hasty tokens", "Combat win"],
    power: "Alta",
    desc: "Crea copias infinitas con prisa para ganar por combate.",
    steps: ["Controlá Kiki-Jiki y Zealous Conscripts.", "Copiá Zealous Conscripts con Kiki-Jiki.", "La copia endereza Kiki-Jiki. Repetí."],
    prerequisites: ["Kiki-Jiki debe poder tapearse."],
  },
  {
    name: "Isochron Scepter + Dramatic Reversal",
    pieces: ["Isochron Scepter", "Dramatic Reversal"],
    type: "Infinite mana",
    effects: ["Infinite mana", "Infinite untap"],
    power: "Alta",
    desc: "Con suficientes rocas que produzcan 3+ maná, genera maná infinito.",
    steps: ["Imprimí Dramatic Reversal en Isochron Scepter.", "Usá rocas para generar al menos 3 manás.", "Activá Scepter para enderezar tus permanentes no-tierra. Repetí."],
    prerequisites: ["Tus permanentes no-tierra deben producir más maná del que cuesta activar Scepter."],
  },
  {
    name: "Underworld Breach + Lion's Eye Diamond + Brain Freeze",
    pieces: ["Underworld Breach", "Lion's Eye Diamond", "Brain Freeze"],
    type: "Storm / Win",
    effects: ["Storm loop", "Self-mill", "Win line"],
    power: "cEDH",
    desc: "Loop de cementerio y storm para deckear o ganar con líneas de Breach.",
    steps: ["Controlá Underworld Breach.", "Usá LED y Brain Freeze repetidamente desde el cementerio.", "Acumulá storm/mill hasta ganar."],
    prerequisites: ["Necesitás suficientes cartas en cementerio para escapar los hechizos."],
  },
  {
    name: "Heliod + Walking Ballista",
    pieces: ["Heliod, Sun-Crowned", "Walking Ballista"],
    type: "Infinite damage/lifegain",
    effects: ["Infinite damage", "Infinite lifegain"],
    power: "Alta",
    desc: "Ballista con lifelink dispara Heliod y vuelve a poner contadores.",
    steps: ["Controlá Heliod y Walking Ballista con al menos dos contadores.", "Dale lifelink a Ballista con Heliod.", "Quitá un contador para hacer daño y ganar vida.", "Heliod pone un contador de vuelta. Repetí."],
    prerequisites: ["Walking Ballista necesita suficientes contadores para iniciar el loop."],
  },
  {
    name: "Mikaeus + Triskelion",
    pieces: ["Mikaeus, the Unhallowed", "Triskelion"],
    type: "Infinite damage",
    effects: ["Infinite damage", "Death loop"],
    power: "Alta",
    desc: "Triskelion muere y vuelve con undying para repetir daño.",
    steps: ["Controlá Mikaeus y Triskelion.", "Quitá contadores para hacer daño, incluyendo a Triskelion.", "Triskelion muere y vuelve con undying. Repetí."],
    prerequisites: ["Triskelion no debe ser Humano y debe poder morir."],
  },
  {
    name: "Scurry Oak + Rosie Cotton",
    pieces: ["Scurry Oak", "Rosie Cotton of South Lane"],
    type: "Infinite tokens/counters",
    effects: ["Infinite tokens", "Infinite counters", "Infinite ETB"],
    power: "Media-Alta",
    desc: "Cada token pone contador, que crea otro token y repite.",
    steps: ["Controlá Scurry Oak y Rosie Cotton.", "Poné un contador +1/+1 sobre Scurry Oak.", "Scurry Oak crea token, Rosie pone otro contador. Repetí."],
    prerequisites: ["Necesitás iniciar el loop poniendo un contador sobre Scurry Oak."],
  },
  {
    name: "Avacyn + Worldslayer",
    pieces: ["Avacyn, Angel of Hope", "Worldslayer"],
    type: "Mass land denial / Lock",
    effects: ["Destroy all permanents opponents control", "Lock", "Mass land denial"],
    power: "Alta",
    desc: "Destruye todos los permanentes de los demás mientras los tuyos son indestructibles.",
    steps: ["Controlá Avacyn y equipá Worldslayer a una criatura.", "Hacé daño de combate a un jugador con esa criatura.", "Worldslayer destruye todos los permanentes no indestructibles."],
    prerequisites: ["La criatura equipada debe conectar daño de combate."],
  },
  {
    name: "Basalt Monolith + Rings of Brighthearth",
    pieces: ["Basalt Monolith", "Rings of Brighthearth"],
    type: "Infinite mana",
    effects: ["Infinite colorless mana"],
    power: "Alta",
    desc: "Copia la habilidad de enderezar Basalt Monolith y genera maná infinito.",
    steps: ["Girás Basalt Monolith para agregar 3.", "Activás su habilidad de enderezar y copiás con Rings.", "Resolviendo correctamente, generás más maná del que gastás. Repetí."],
    prerequisites: ["Necesitás maná inicial para copiar la habilidad."],
  },
];

const GENERIC_UPGRADES = {
  Draw: ["Skullclamp", "Night's Whisper", "Read the Bones", "Phyrexian Arena", "Morbid Opportunist", "Esper Sentinel", "Rhystic Study"],
  Ramp: ["Arcane Signet", "Fellwar Stone", "Nature's Lore", "Three Visits", "Talisman cycle", "Signet cycle"],
  Removal: ["Beast Within", "Generous Gift", "Feed the Swarm", "Swords to Plowshares", "Chaos Warp", "Anguished Unmaking"],
  Protection: ["Swiftfoot Boots", "Lightning Greaves", "Heroic Intervention", "Teferi's Protection", "Malakir Rebirth"],
  Tokens: ["Tendershoot Dryad", "Mycoloth", "Ophiomancer", "Awakening Zone", "Jadar, Ghoulcaller of Nephalia"],
  Aristocrats: ["Blood Artist", "Zulaport Cutthroat", "Bastion of Remembrance", "Viscera Seer", "Pitiless Plunderer"],
};

const STARTING_TEXT = "";
const SAVED_DECKS_KEY = "commanderDeckAnalyzer.savedDecks.v1";

function compactCardForStorage(card) {
  return {
    key: card.key,
    qty: card.qty,
    name: card.name,
    type: card.type,
    tags: card.tags || [],
    manualTags: card.manualTags || [],
    setCode: card.setCode || "",
    collectorNumber: card.collectorNumber || "",
    finish: card.finish || "",
    cmc: card.cmc,
    manaCost: card.manaCost || "",
    colors: card.colors || [],
    colorIdentity: card.colorIdentity || [],
    oracle: card.oracle || "",
    typeLine: card.typeLine || "",
    image: card.image || "",
    smallImage: card.smallImage || "",
    allParts: card.allParts || [],
    relatedTokens: card.relatedTokens || [],
    legalCommander: card.legalCommander !== false,
    price: card.price || null,
    scryfallLoaded: !!card.scryfallLoaded,
    notFound: !!card.notFound,
  };
}

function safeLoadSavedDecks() {
  try {
    const raw = window.localStorage.getItem(SAVED_DECKS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeSaveSavedDecks(decks) {
  try {
    window.localStorage.setItem(SAVED_DECKS_KEY, JSON.stringify(decks));
    return true;
  } catch {
    return false;
  }
}

function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isDigits(text) {
  return String(text || "").split("").every(ch => ch >= "0" && ch <= "9");
}

function removeBracketSections(text) {
  let out = "";
  let depth = 0;
  for (const ch of String(text || "")) {
    if (ch === "[") { depth++; continue; }
    if (ch === "]") { depth = Math.max(0, depth - 1); continue; }
    if (depth === 0) out += ch;
  }
  return out;
}

function extractTagsFromLine(line) {
  const tags = [];
  let current = "";
  let inside = false;
  for (const ch of String(line || "")) {
    if (ch === "[") { inside = true; current = ""; continue; }
    if (ch === "]" && inside) {
      inside = false;
      current
        .split(";")
        .flatMap(x => x.split(","))
        .flatMap(x => x.split("/"))
        .map(x => x.replaceAll("{top}", "").replaceAll("{bottom}", "").trim())
        .filter(Boolean)
        .forEach(x => tags.push(x));
      continue;
    }
    if (inside) current += ch;
  }
  return tags;
}

function isLikelySetCode(text) {
  const s = String(text || "").trim();
  if (s.length < 2 || s.length > 8) return false;
  return s.split("").every(ch => /[a-zA-Z0-9]/.test(ch));
}

function extractPrintingMeta(rawName) {
  const source = removeBracketSections(rawName).trim();
  const open = source.lastIndexOf("(");
  const close = source.indexOf(")", open + 1);
  if (open < 0 || close < 0) return { name: source, setCode: "", collectorNumber: "" };
  const maybeSet = source.slice(open + 1, close).trim();
  if (!isLikelySetCode(maybeSet)) return { name: source, setCode: "", collectorNumber: "" };
  const after = source.slice(close + 1).trim();
  const collectorNumber = after.split(" ")[0]?.replace("#", "") || "";
  const name = source.slice(0, open).trim();
  return { name, setCode: maybeSet.toLowerCase(), collectorNumber };
}

function cleanCardName(name) {
  let s = String(name || "").trim();
  if (s.toLowerCase().startsWith("sb:")) s = s.slice(3).trim();
  const parts = s.split(" ").filter(Boolean);
  if (parts.length) {
    const first = parts[0].toLowerCase();
    const qtyToken = first.endsWith("x") ? first.slice(0, -1) : first;
    if (isDigits(qtyToken)) s = parts.slice(1).join(" ");
  }
  s = removeBracketSections(s).trim();
  const meta = extractPrintingMeta(s);
  return meta.name.replaceAll("  ", " ").trim();
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let quote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; continue; }
    if (ch === '"') { quote = !quote; continue; }
    if (ch === "," && !quote) { out.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function pickColumn(headers, candidates) {
  const normalized = headers.map(h => normalizeName(h));
  for (const c of candidates) {
    const idx = normalized.indexOf(normalizeName(c));
    if (idx >= 0) return idx;
  }
  return -1;
}

function inferTypeFromSection(section, fallback = "Otros") {
  const lower = normalizeName(section || "");
  if (!lower) return fallback;
  if (lower.includes("commander")) return "Commander";
  if (lower.includes("creature") || lower.includes("criatura")) return "Criaturas";
  if (lower.includes("artifact") || lower.includes("artefact")) return "Artefactos";
  if (lower.includes("enchantment") || lower.includes("encant")) return "Encantamientos";
  if (lower.includes("instant")) return "Instantáneos";
  if (lower.includes("sorcery") || lower.includes("conjuro") || lower.includes("sortilegio")) return "Sortilegios";
  if (lower.includes("planeswalker")) return "Planeswalker";
  if (lower.includes("land") || lower.includes("tierra")) return "Tierras";
  return fallback;
}

function normalizeParsedRows(rows) {
  const byName = new Map();
  for (const row of rows) {
    const name = cleanCardName(row.name);
    if (!name) continue;
    const key = normalizeName(name);
    const existing = byName.get(key);
    const type = inferTypeFromSection(row.category, "Otros");
    if (existing) {
      existing.qty += row.qty || 1;
      existing.tags = [...new Set([...existing.tags, ...(row.tags || [])])];
      existing.manualTags = existing.tags;
      if (!existing.setCode && row.setCode) existing.setCode = row.setCode;
      if (!existing.collectorNumber && row.collectorNumber) existing.collectorNumber = row.collectorNumber;
      if (existing.type === "Otros" && type !== "Otros") existing.type = type;
    } else {
      byName.set(key, {
        key,
        qty: row.qty || 1,
        name,
        type,
        tags: row.tags || [],
        manualTags: row.tags || [],
        setCode: row.setCode || "",
        collectorNumber: row.collectorNumber || "",
        finish: row.finish || "",
        cmc: null,
        manaCost: "",
        colors: [],
        colorIdentity: [],
        oracle: "",
        typeLine: "",
        image: "",
        smallImage: "",
        legalCommander: true,
        price: null,
        scryfallLoaded: false,
        notFound: false,
      });
    }
  }
  return [...byName.values()];
}

function parseDeckCsv(text) {
  const lines = text.replaceAll(String.fromCharCode(13), "").split(String.fromCharCode(10)).map(x => x.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const nameIdx = pickColumn(headers, ["name", "card name", "card", "nombre", "Card Name"]);
  if (nameIdx < 0) return [];
  const qtyIdx = pickColumn(headers, ["quantity", "qty", "count", "cantidad", "Quantity"]);
  const setIdx = pickColumn(headers, ["set", "set code", "edition", "edition code", "edicion", "Set Code"]);
  const collectorIdx = pickColumn(headers, ["collector number", "collector", "number", "collector_number", "numero", "Collector Number"]);
  const categoryIdx = pickColumn(headers, ["category", "categories", "section", "folder", "categoria", "Categories"]);
  const finishIdx = pickColumn(headers, ["finish", "foil", "Foil"]);
  const rows = lines.slice(1).map(line => {
    const row = parseCsvLine(line);
    return {
      qty: qtyIdx >= 0 ? Number(row[qtyIdx] || 1) || 1 : 1,
      name: row[nameIdx] || "",
      setCode: setIdx >= 0 ? String(row[setIdx] || "").toLowerCase().trim() : "",
      collectorNumber: collectorIdx >= 0 ? String(row[collectorIdx] || "").trim() : "",
      category: categoryIdx >= 0 ? String(row[categoryIdx] || "").trim() : "",
      finish: finishIdx >= 0 ? String(row[finishIdx] || "").trim() : "",
      tags: [],
    };
  });
  return normalizeParsedRows(rows);
}

function parseDeckJson(text) {
  try {
    const data = JSON.parse(text);
    const rawCards = Array.isArray(data) ? data : Array.isArray(data.cards) ? data.cards : Array.isArray(data.entries) ? data.entries : Array.isArray(data.decklist) ? data.decklist : [];
    const rows = rawCards.map(x => {
      const card = x.card || x;
      return {
        qty: Number(x.quantity || x.qty || x.count || 1) || 1,
        name: card.name || x.name || x.cardName || x.card_name || "",
        setCode: String(card.set || card.setCode || x.set || x.setCode || "").toLowerCase().trim(),
        collectorNumber: String(card.collector_number || card.collectorNumber || x.collector_number || x.collectorNumber || "").trim(),
        category: String(x.category || x.categories || x.section || "").trim(),
        finish: String(x.finish || x.foil || "").trim(),
        tags: [],
      };
    });
    return normalizeParsedRows(rows);
  } catch {
    return [];
  }
}

function parseDecklist(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const jsonRows = parseDeckJson(trimmed);
    if (jsonRows.length) return jsonRows;
  }

  const firstLine = trimmed.replaceAll(String.fromCharCode(13), "").split(String.fromCharCode(10)).find(Boolean) || "";
  if (firstLine.includes(",") && normalizeName(firstLine).includes("name")) {
    const csvRows = parseDeckCsv(trimmed);
    if (csvRows.length) return csvRows;
  }

  const lines = trimmed.replaceAll(String.fromCharCode(13), "").split(String.fromCharCode(10)).map(l => l.trim()).filter(Boolean);
  const headings = new Map([
    ["commander", "Commander"], ["commanders", "Commander"],
    ["creature", "Criaturas"], ["creatures", "Criaturas"], ["criaturas", "Criaturas"],
    ["artifact", "Artefactos"], ["artifacts", "Artefactos"], ["artefactos", "Artefactos"],
    ["enchantment", "Encantamientos"], ["enchantments", "Encantamientos"], ["encantamientos", "Encantamientos"],
    ["instant", "Instantáneos"], ["instants", "Instantáneos"], ["instantaneos", "Instantáneos"], ["instantáneos", "Instantáneos"],
    ["sorcery", "Sortilegios"], ["sorceries", "Sortilegios"], ["conjuros", "Sortilegios"], ["sortilegios", "Sortilegios"],
    ["planeswalker", "Planeswalker"], ["planeswalkers", "Planeswalker"],
    ["land", "Tierras"], ["lands", "Tierras"], ["tierras", "Tierras"],
    ["mainboard", "Otros"], ["sideboard", "Otros"], ["maybeboard", "Otros"],
  ]);

  let currentType = "Otros";
  const rows = [];

  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (!line || line.startsWith("//")) continue;
    if (line.startsWith("#")) {
      currentType = inferTypeFromSection(line.slice(1).trim(), currentType);
      continue;
    }
    const headingKey = normalizeName(line.replaceAll(":", ""));
    if (headings.has(headingKey)) {
      currentType = headings.get(headingKey);
      continue;
    }

    if (line.toLowerCase().startsWith("sb:")) line = line.slice(3).trim();
    const tags = extractTagsFromLine(line);
    const noTags = removeBracketSections(line).trim();
    const parts = noTags.split(" ").filter(Boolean);
    let qty = 1;
    let rest = noTags;
    if (parts.length) {
      const first = parts[0].toLowerCase();
      const qtyToken = first.endsWith("x") ? first.slice(0, -1) : first;
      if (isDigits(qtyToken)) {
        qty = Number(qtyToken) || 1;
        rest = parts.slice(1).join(" ");
      }
    }
    const meta = extractPrintingMeta(rest);
    const name = cleanCardName(meta.name);
    if (!name || headings.has(normalizeName(name))) continue;
    rows.push({ qty, name, setCode: meta.setCode, collectorNumber: meta.collectorNumber, category: currentType, tags });
  }

  return normalizeParsedRows(rows);
}

function inferTypeFromScryfall(card) {
  const t = card.typeLine?.toLowerCase() || "";
  if (t.includes("land")) return "Tierras";
  if (t.includes("creature")) return "Criaturas";
  if (t.includes("artifact")) return "Artefactos";
  if (t.includes("enchantment")) return "Encantamientos";
  if (t.includes("instant")) return "Instantáneos";
  if (t.includes("sorcery")) return "Sortilegios";
  if (t.includes("planeswalker")) return "Planeswalker";
  return card.type;
}

function detectRoles(card) {
  const roles = new Set(card.manualTags || []);
  const name = card.name || "";
  const key = normalizeName(name);
  const oracle = (card.oracle || "").toLowerCase();
  const type = (card.typeLine || "").toLowerCase();
  const isLandCard = card.type === "Tierras" || type.includes("land");
  const text = `${key} ${oracle} ${type}`;

  const includesAny = (haystack, needles) => needles.some(n => haystack.includes(n));
  const hasName = (...xs) => xs.some(x => key === normalizeName(x));
  const hasText = (...xs) => includesAny(text, xs);
  const hasOracle = (...xs) => includesAny(oracle, xs);

  // 1) Ramp / mana production. Evita confundir "add a counter" con agregar maná.
  const manaRockNames = [
    "sol ring", "arcane signet", "fellwar stone", "mind stone", "thought vessel", "thran dynamo", "gilded lotus", "chromatic lantern", "commander's sphere", "wayfarer's bauble", "liquimetal torque", "everflowing chalice"
  ];
  const rampByName = key.includes("signet") || key.includes("talisman") || manaRockNames.includes(key);
  const manaText = hasOracle("add {", "add one mana", "add two mana", "add three mana", "add x mana", "add an amount of", "treasure token", "create a treasure") ||
    (hasOracle("search your library") && hasOracle("land card")) ||
    hasOracle("put a land card", "put up to one land", "additional land", "play an additional land");
  if (!isLandCard && (rampByName || manaText)) roles.add("Ramp");

  // 2) Draw / card advantage. No cuenta loot puro como draw si solo descarta sin ventaja, pero sí lo etiqueta como Draw si roba.
  if (hasOracle("draw a card", "draw two cards", "draw three cards", "draw x cards", "draw cards", "draw that many cards", "investigate", "clue token")) roles.add("Draw");
  if (hasOracle("look at the top") && hasOracle("put") && hasOracle("into your hand")) roles.add("Draw");

  // 3) Removal puntual. Más preciso que cualquier "deals damage".
  const targetedRemoval = hasOracle(
    "destroy target", "exile target", "target creature gets -", "target player sacrifices", "target opponent sacrifices",
    "fight target creature", "fights target", "deals damage to target creature", "deals damage to any target",
    "return target creature", "return target nonland permanent", "return target permanent", "put target creature on", "put target nonland permanent"
  );
  if (targetedRemoval) roles.add("Removal");

  // 4) Board wipe. Solo efectos globales reales de limpieza o pseudo-limpieza.
  if (
    hasOracle(
      "destroy all creatures", "destroy all artifacts", "destroy all enchantments", "destroy all permanents", "destroy all nonland permanents",
      "exile all creatures", "exile all artifacts", "exile all enchantments", "exile all permanents", "exile all nonland permanents",
      "each creature gets -", "all creatures get -", "damage to each creature", "deals damage to each creature",
      "sacrifice all creatures", "each player sacrifices all creatures", "return all creatures", "return all nonland permanents"
    )
  ) roles.add("Board Wipe");

  // 5) Counterspell.
  if (hasOracle("counter target spell", "counter target activated", "counter target triggered", "counter target artifact", "counter target creature spell", "counter target noncreature spell")) roles.add("Counterspell");

  // 6) Protección. Ward por sí solo cuenta como protección ligera, pero no debería dominar el arquetipo.
  if (hasOracle("gains hexproof", "gain hexproof", "gains indestructible", "gain indestructible", "protection from", "phase out", "phases out", "prevent all damage", "regenerate target", "ward")) roles.add("Protection");
  if (hasName("swiftfoot boots", "lightning greaves", "heroic intervention", "teferi's protection", "malakir rebirth", "tamiyo's safekeeping")) roles.add("Protection");

  // 7) Tutor. Los tutores de tierras ya cuentan como ramp; acá filtramos tutores no-tierra.
  if (hasOracle("search your library") && !hasOracle("basic land", "land card", "forest card", "plains card", "island card", "swamp card", "mountain card")) roles.add("Tutor");
  if (STRONG_TUTORS.has(key)) roles.add("Tutor");

  // 8) Tokens. Distingue producción de tokens de cartas que solo mencionan tokens.
  if (hasOracle("create a", "create one", "create two", "create three", "create x", "creates a") && hasOracle("token")) roles.add("Tokens");
  if (hasName("ophiomancer", "tendershoot dryad", "mycoloth", "awakening zone", "jadar, ghoulcaller of nephalia")) roles.add("Tokens");

  // 9) Sac outlet. No todo lo que dice "sacrifice" es outlet repetible, pero sí marca sinergia de sacrificio.
  if (hasOracle("sacrifice another creature", "sacrifice a creature:", "sacrifice a permanent:", "sacrifice an artifact:", "sacrifice a token", "as an additional cost to cast this spell, sacrifice")) roles.add("Sac Outlet");
  if (hasName("carrion feeder", "viscera seer", "bloodflow connoisseur", "woe strider", "ashnod's altar", "phyrexian altar", "altar of dementia", "high market")) roles.add("Sac Outlet");

  // 10) Drain / lifegain.
  if (hasOracle("each opponent loses", "target opponent loses", "loses that much life", "loses 1 life", "lose life")) roles.add("Drain");
  if (hasName("blood artist", "zulaport cutthroat", "bastion of remembrance", "marauding blight-priest", "vito, thorn of the dusk rose", "sanguine bond")) roles.add("Drain");
  if (hasOracle("you gain", "gain life", "gains life", "lifelink")) roles.add("Lifegain");
  if (hasName("soul warden", "essence warden", "aetherflux reservoir", "authority of the consuls")) roles.add("Lifegain");

  // 11) Recursion / Reanimator. Separar recuperar a mano de poner al campo.
  if (hasOracle("return target card from your graveyard", "return target creature card from your graveyard", "return a card from your graveyard", "from your graveyard to your hand", "from your graveyard to your library", "escape")) roles.add("Recursion");
  if (hasOracle("from your graveyard to the battlefield", "put target creature card from a graveyard onto the battlefield", "return target creature card from your graveyard to the battlefield")) roles.add("Reanimator");
  if (hasName("animate dead", "reanimate", "victimize", "living death", "dance of the dead", "necromancy")) {
    roles.add("Recursion");
    roles.add("Reanimator");
  }

  // 12) Untap / Evasion / Voltron / Equipment / Auras.
  if (hasOracle("untap target", "untap another", "untap up to", "untap it", "untap that", "untap this", "doesn't untap during")) roles.add("Untap");
  if (hasOracle("can't be blocked", "unblockable", "flying", "trample", "menace", "shadow", "horsemanship")) roles.add("Evasion");
  if (type.includes("equipment") || hasOracle("equip ", "equipped creature")) roles.add("Equipment");
  if (type.includes("aura") || hasOracle("enchanted creature")) roles.add("Voltron");
  if (hasOracle("gets +", "double strike", "trample", "commander you control") && (type.includes("equipment") || type.includes("aura"))) roles.add("Voltron");

  // 13) Blink / ETB. Blink requiere exiliar y devolver; ETB requiere entrada al campo.
  if (hasOracle("exile", "return it to the battlefield") || hasOracle("exile another target", "then return")) roles.add("Blink");
  if (hasOracle("enters the battlefield", "when this enters", "whenever a creature enters", "whenever another creature enters")) roles.add("ETB");

  // 14) Spellslinger. Solo payoffs/referencias reales a instant/sorcery, no todo instant/sorcery.
  if (hasOracle("whenever you cast an instant or sorcery", "copy target instant", "copy target sorcery", "instant and sorcery card", "magecraft", "storm", "spells you cast from exile")) roles.add("Spellslinger");

  // 15) Artifacts / Enchantress. Solo sinergias, no cualquier artefacto/encantamiento.
  if (hasOracle("artifact you control", "artifacts you control", "whenever an artifact", "sacrifice an artifact", "artifact card", "affinity for artifacts", "improvise", "historic spell")) roles.add("Artifacts");
  if (hasOracle("enchantment you control", "whenever you cast an enchantment", "constellation", "enchantment card", "aura you control")) roles.add("Enchantress");

  // 16) Tribal. Requiere referencias claras a tipo de criatura o lord effects.
  if (hasOracle("choose a creature type", "kindred", "creatures you control of the chosen type", "other creatures you control get", "creature type you control", "share a creature type")) roles.add("Tribal");

  // 17) Counters / Proliferate.
  if (hasOracle("+1/+1 counter", "-1/-1 counter", "counter on", "counters on", "double the number of counters", "move a counter")) roles.add("Counters");
  if (hasOracle("proliferate")) roles.add("Proliferate");

  // 18) Stax / Goad / Theft.
  if (hasOracle("can't cast", "can't attack", "can't untap", "players can't", "opponents can't", "unless they pay", "spells cost", "activated abilities can't", "triggered abilities can't")) roles.add("Stax");
  if (hasOracle("goad")) roles.add("Goad");
  if (hasOracle("gain control", "you may cast", "you may play", "exile the top card of target opponent", "from an opponent's graveyard")) roles.add("Theft");

  // 19) Extra turns / MLD / Combo flags.
  if (hasOracle("take an extra turn", "extra turn after this one")) roles.add("Extra Turns");
  if (MASS_LAND_DENIAL.has(key)) roles.add("Mass Land Denial");
  if (hasOracle("win the game", "you win the game") || GAME_CHANGERS.has(key)) roles.add("Combo");
  if (GAME_CHANGERS.has(key)) roles.add("Game Changer");
  if (FAST_MANA_PREMIUM.has(key)) roles.add("Fast Mana");

  // 20) Finisher: amenazas/cierres evidentes, sin inflar criaturas normales.
  if (hasOracle("you win the game", "each opponent loses", "double", "extra combat") || hasName("exsanguinate", "torment of hailfire", "craterhoof behemoth", "finale of devastation", "aetherflux reservoir")) roles.add("Finisher");

  // Las tierras no deben inflar Ramp aunque su texto produzca maná.
  if (isLandCard) {
    roles.delete("Ramp");
    roles.add("Land");
  }

  return [...roles].filter(Boolean);
}

function estimateCmcFallback(card) {
  if (card.type === "Tierras" || card.type === "Commander") return 0;
  return null;
}

async function fetchScryfallCard(cardOrName) {
  const card = typeof cardOrName === "string" ? { name: cardOrName } : cardOrName;
  if (card?.setCode && card?.collectorNumber) {
    const exactUrl = `https://api.scryfall.com/cards/${encodeURIComponent(card.setCode)}/${encodeURIComponent(card.collectorNumber)}`;
    const exactRes = await fetch(exactUrl);
    if (exactRes.ok) return exactRes.json();
  }
  const url = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(card?.name || "")}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("not found");
  return res.json();
}

async function fetchScryfallAutocomplete(query) {
  if (!query || query.trim().length < 2) return [];
  const url = `https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(query.trim())}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("autocomplete failed");
  const data = await res.json();
  return data.data || [];
}

function parseWantedList(text) {
  return text
    .split(String.fromCharCode(10))
    .map(x => x.replace(String.fromCharCode(13), "").trim())
    .filter(Boolean);
}

function scryToCardData(data) {
  const face = data.card_faces?.[0];
  const image = data.image_uris?.normal || face?.image_uris?.normal || "";
  const smallImage = data.image_uris?.small || face?.image_uris?.small || image;
  const allParts = (data.all_parts || []).map(part => ({
    id: part.id || "",
    component: part.component || "",
    name: part.name || "",
    typeLine: part.type_line || "",
    uri: part.uri || "",
  }));
  return {
    name: data.name,
    setCode: data.set || "",
    collectorNumber: data.collector_number || "",
    cmc: data.cmc ?? 0,
    manaCost: data.mana_cost || face?.mana_cost || "",
    colors: data.colors || face?.colors || [],
    colorIdentity: data.color_identity || [],
    oracle: data.oracle_text || face?.oracle_text || "",
    typeLine: data.type_line || face?.type_line || "",
    image,
    smallImage,
    allParts,
    relatedTokens: [],
    legalCommander: data.legalities?.commander === "legal",
    price: data.prices?.eur || data.prices?.usd || null,
    scryfallLoaded: true,
    notFound: false,
  };
}

function isScryfallTokenPart(part) {
  const component = String(part?.component || "").toLowerCase();
  const typeLine = String(part?.type_line || part?.typeLine || "").toLowerCase();
  const name = String(part?.name || "").toLowerCase();
  return component.includes("token") || typeLine.includes("token") || name.includes(" token");
}

function imageFromScryfallData(data) {
  const face = data?.card_faces?.[0];
  return {
    image: data?.image_uris?.normal || face?.image_uris?.normal || "",
    smallImage: data?.image_uris?.small || face?.image_uris?.small || data?.image_uris?.normal || face?.image_uris?.normal || "",
  };
}

function normalizeTokenName(name, typeLine = "") {
  const rawName = String(name || "").replace(/ Token/i, "").trim();
  if (rawName) return rawName;
  const cleanType = String(typeLine || "").replace(/^Token +/i, "").replace(/^Artifact +/i, "").replace(/^Creature +/i, "").replace(/^Enchantment +/i, "").replace(/—/g, "-").trim();
  return cleanType || "Token";
}

async function fetchRelatedTokenDetails(data) {
  const tokenParts = (data.all_parts || []).filter(isScryfallTokenPart);
  const details = [];
  for (const part of tokenParts.slice(0, 20)) {
    try {
      if (part.uri) {
        const res = await fetch(part.uri);
        if (res.ok) {
          const tokenData = await res.json();
          const imgs = imageFromScryfallData(tokenData);
          details.push({
            id: tokenData.id || part.id || part.name,
            name: normalizeTokenName(tokenData.name || part.name, tokenData.type_line || part.type_line),
            typeLine: tokenData.type_line || part.type_line || "Token",
            oracle: tokenData.oracle_text || "",
            image: imgs.image,
            smallImage: imgs.smallImage,
            sourceComponent: part.component || "token",
          });
          await sleep(35);
          continue;
        }
      }
    } catch {
      // fallback below
    }
    details.push({
      id: part.id || part.name,
      name: normalizeTokenName(part.name, part.type_line || part.typeLine),
      typeLine: part.type_line || part.typeLine || "Token",
      oracle: "",
      image: "",
      smallImage: "",
      sourceComponent: part.component || "token",
    });
  }
  return details;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function countBy(cards, fn) {
  const m = new Map();
  for (const c of cards) {
    const key = fn(c);
    m.set(key, (m.get(key) || 0) + c.qty);
  }
  return [...m.entries()].map(([name, value]) => ({ name, value }));
}

function getCommander(cards) {
  return cards.find(c => c.type === "Commander" || c.tags.some(t => t.toLowerCase().includes("commander"))) || null;
}

function getCommanderColorIdentity(cards) {
  const commander = getCommander(cards);
  if (commander && Array.isArray(commander.colorIdentity)) return commander.colorIdentity;
  return null;
}

function colorIdentityFitsCommander(cardColorIdentity, commanderColorIdentity) {
  // null = todavía no sabemos los colores del comandante; no bloqueamos.
  if (commanderColorIdentity === null) return true;
  const ci = Array.isArray(cardColorIdentity) ? cardColorIdentity : [];
  return ci.every(color => commanderColorIdentity.includes(color));
}

function suggestionNameFitsCommander(name, commanderColorIdentity, suggestionCardData = {}) {
  const data = suggestionCardData[normalizeName(name)];
  if (!data || !Array.isArray(data.colorIdentity)) return true;
  return colorIdentityFitsCommander(data.colorIdentity, commanderColorIdentity);
}


function getEffectiveRoles(card) {
  const roles = detectRoles(card);
  // Las tierras pueden producir maná, pero no queremos que inflen el conteo de Ramp.
  // Ramp cuenta spells/artefactos/criaturas que aceleran, no la manabase normal.
  if (card?.type === "Tierras") return roles.filter(role => role !== "Ramp");
  return roles;
}

function getDeckAllowedColors(cards) {
  const commander = getCommander(cards);
  if (commander) return commander.colorIdentity || [];
  const colors = new Set();
  for (const card of cards) {
    if (card.type === "Tierras") continue;
    for (const color of card.colorIdentity || []) colors.add(color);
  }
  return [...colors];
}

function isColorIdentityAllowed(colorIdentity, allowedColors) {
  const ci = Array.isArray(colorIdentity) ? colorIdentity : [];
  const allowed = new Set(Array.isArray(allowedColors) ? allowedColors : []);
  return ci.every(color => allowed.has(color));
}

function isSuggestionAllowedForCommander(name, suggestionCardData, allowedColors, hasCommander = true) {
  if (!hasCommander) return true;
  const data = suggestionCardData?.[normalizeName(name)];
  // Mientras Scryfall todavía no cargó esa sugerencia, la dejamos visible de forma provisional.
  // Cuando llega colorIdentity, se filtra automáticamente si es off-color.
  if (!data || !Array.isArray(data.colorIdentity)) return true;
  return isColorIdentityAllowed(data.colorIdentity, allowedColors);
}

function getDeckTotalPrice(cards) {
  return cards.reduce((total, card) => total + (Number(card.price) || 0) * (card.qty || 1), 0);
}

function formatMoney(value) {
  if (!value || Number.isNaN(value)) return "-";
  return `${value.toFixed(2)}€`;
}

function aggregateRoles(cards) {
  const roleMap = new Map();
  for (const c of cards) {
    const roles = getEffectiveRoles(c);
    for (const r of roles) {
      roleMap.set(r, (roleMap.get(r) || 0) + c.qty);
    }
  }
  return [...roleMap.entries()]
    .map(([role, count]) => ({ role, count, color: ROLE_COLORS[role] || ROLE_COLORS.Other }))
    .sort((a, b) => b.count - a.count);
}

function calculateManaCurve(cards) {
  const buckets = new Map([["0", 0], ["1", 0], ["2", 0], ["3", 0], ["4", 0], ["5", 0], ["6", 0], ["7+", 0]]);
  for (const c of cards) {
    if (c.type === "Tierras" || c.type === "Commander") continue;
    const cmc = c.cmc ?? estimateCmcFallback(c);
    // Si todavía no cargó Scryfall y no sabemos el CMC, NO lo ponemos como barra gigante "?".
    // Eso distorsionaba toda la curva. Lo contamos aparte en unknownCmcCount().
    if (cmc === null || Number.isNaN(cmc)) continue;
    if (cmc >= 7) buckets.set("7+", buckets.get("7+") + c.qty);
    else buckets.set(String(cmc), buckets.get(String(cmc)) + c.qty);
  }
  return [...buckets.entries()].map(([cmc, count]) => ({ cmc, count })).filter(d => d.count > 0);
}

function unknownCmcCount(cards) {
  return cards
    .filter(c => c.type !== "Tierras" && c.type !== "Commander")
    .reduce((acc, c) => {
      const cmc = c.cmc ?? estimateCmcFallback(c);
      return acc + (cmc === null || Number.isNaN(cmc) ? c.qty : 0);
    }, 0);
}

function averageCmc(cards) {
  const nonLands = cards.filter(c => c.type !== "Tierras" && c.type !== "Commander" && typeof c.cmc === "number");
  const qty = nonLands.reduce((a, c) => a + c.qty, 0);
  if (!qty) return "?";
  const total = nonLands.reduce((a, c) => a + c.cmc * c.qty, 0);
  return (total / qty).toFixed(2);
}

function detectArchetypes(cards) {
  const roles = aggregateRoles(cards);
  const count = role => roles.find(r => r.role === role)?.count || 0;
  const types = countBy(cards, c => c.type);
  const creatures = types.find(t => t.name === "Criaturas")?.value || 0;
  const instants = types.find(t => t.name === "Instantáneos")?.value || 0;
  const sorceries = types.find(t => t.name === "Sortilegios")?.value || 0;
  const artifacts = types.find(t => t.name === "Artefactos")?.value || 0;
  const enchantments = types.find(t => t.name === "Encantamientos")?.value || 0;
  const commander = getCommander(cards);
  const commanderName = normalizeName(commander?.name || "");
  const commanderText = `${commander?.name || ""} ${commander?.oracle || ""}`.toLowerCase();
  const avg = Number(averageCmc(cards)) || 0;
  const completedCombos = detectCombos(cards).filter(c => c.complete);
  const compactCombos = completedCombos.filter(c => c.pieces.length <= 2);
  const ramp = count("Ramp");
  const draw = count("Draw");
  const tokens = count("Tokens");
  const counters = count("Counters");
  const recursion = count("Recursion") + count("Reanimator");
  const sac = count("Sac Outlet");
  const drain = count("Drain");
  const lifegain = count("Lifegain");
  const untap = count("Untap");
  const finishers = count("Finisher");

  const scores = [];
  const push = (name, score, evidence = []) => {
    if (score >= 35) scores.push({ name, score: Math.min(98, Math.round(score)), evidence });
  };

  const commanderFlags = {
    selvala: commanderName.includes("selvala, heart of the wilds"),
    dina: commanderName.includes("dina, soul steeper"),
    yuriko: commanderName.includes("yuriko"),
    giada: commanderName.includes("giada, font of hope"),
    muldrotha: commanderName.includes("muldrotha"),
    kenrith: commanderName.includes("kenrith"),
  };

  // Base: el comandante define intención, pero no tapa completamente las cartas del mazo.
  push("Big Mana / Stompy", ramp * 6 + untap * 7 + finishers * 5 + (avg >= 3.6 ? 14 : 0) + (creatures >= 24 ? 8 : 0) + (commanderFlags.selvala ? 36 : 0), ["ramp", "untap", "finishers", commander?.name].filter(Boolean));
  push("Creature Combo", compactCombos.length * 30 + untap * 10 + (ramp >= 8 ? 8 : 0) + (commanderFlags.selvala ? 26 : 0), [compactCombos.length ? `${compactCombos.length} combo(s) compactos` : null, "untap", commander?.name].filter(Boolean));
  push("Aristocrats", sac * 15 + drain * 13 + tokens * 4 + recursion * 4 + (commanderFlags.dina ? 24 : 0), ["sac outlets", "drain", "tokens/cementerio"].filter(Boolean));
  push("Lifegain / Drain", lifegain * 9 + drain * 10 + (commanderFlags.dina ? 22 : 0), ["lifegain", "drain", commander?.name].filter(Boolean));
  push("Tokens", tokens * 7 + (sac >= 2 ? 8 : 0) + (finishers >= 2 ? 5 : 0) - (commanderFlags.selvala ? 22 : 0), ["tokens", sac >= 2 ? "sac outlets" : null].filter(Boolean));
  push("Counters", counters * 8 + count("Proliferate") * 11 + (creatures >= 24 ? 4 : 0), ["contadores", count("Proliferate") ? "proliferate" : null].filter(Boolean));
  push("Graveyard / Reanimator", recursion * 10 + count("Reanimator") * 8 + (commanderFlags.muldrotha ? 35 : 0), ["recursión", "reanimación", commander?.name].filter(Boolean));
  push("Spellslinger", count("Spellslinger") * 20 + (instants + sorceries >= 24 ? 22 : 0), ["payoffs de hechizos", `${instants + sorceries} instant/sorcery`]);
  push("Artifacts", count("Artifacts") * 16 + (Math.max(0, artifacts - ramp) >= 12 ? 22 : 0), ["sinergias de artefactos", "artefactos no-ramp"]);
  push("Enchantress", count("Enchantress") * 16 + (enchantments >= 18 ? 22 : 0), ["encantamientos", "constellation/auras"]);
  push("Voltron", count("Equipment") * 10 + count("Voltron") * 13 + count("Evasion") * 3, ["equipos/auras", "evasión"]);
  push("Blink / ETB", count("Blink") * 15 + count("ETB") * 6, ["blink", "ETB"]);
  push("Tribal Creature", count("Tribal") * 16 + (creatures >= 32 ? 12 : 0) + (commanderFlags.giada ? 25 : 0) + (commanderFlags.yuriko ? 25 : 0), ["tribal", "alta densidad de criaturas", commander?.name].filter(Boolean));

  const sorted = scores.sort((a, b) => b.score - a.score);
  if (!sorted.length) return [{ name: creatures >= 28 ? "Creature Midrange" : "Value / Goodstuff", score: 55, evidence: ["sin arquetipo dominante claro"] }];

  const top = sorted[0];
  const second = sorted[1];
  if (second && second.score >= top.score * 0.82) {
    return [
      { name: `${top.name} + ${second.name}`, score: top.score, evidence: [...new Set([...(top.evidence || []), ...(second.evidence || [])])].slice(0, 5) },
      ...sorted.slice(0, 4),
    ].slice(0, 4);
  }
  return sorted.slice(0, 4);
}

function scoreRange(value, minGood, ideal, tooHigh = Infinity) {
  if (value < minGood) return Math.max(20, (value / minGood) * 65);
  if (value <= ideal) return 85;
  if (value <= tooHigh) return 75;
  return 55;
}

function scoreAgainstTarget(value, target, tolerance = 1, maxScore = 92) {
  const diff = Math.abs(value - target);
  if (diff <= tolerance) return maxScore;
  return Math.max(25, maxScore - diff * 12);
}

function scoreMinimum(value, target, maxScore = 90) {
  if (value >= target) return maxScore;
  return Math.max(25, (value / target) * maxScore);
}

function isCommanderCentric(cards) {
  const commander = getCommander(cards);
  const text = `${commander?.name || ""} ${commander?.oracle || ""}`.toLowerCase();
  if (!commander) return false;
  return text.includes("whenever") || text.includes("tap:") || text.includes("{t}") || text.includes("commander") || normalizeName(commander.name).includes("selvala") || normalizeName(commander.name).includes("giada") || normalizeName(commander.name).includes("yuriko") || normalizeName(commander.name).includes("dina");
}

function calculateScores(cards) {
  const lands = cards.filter(c => c.type === "Tierras").reduce((a, c) => a + c.qty, 0);
  const roles = aggregateRoles(cards);
  const count = role => roles.find(r => r.role === role)?.count || 0;
  const cmcNum = Number(averageCmc(cards)) || 0;
  const archetypes = detectArchetypes(cards);
  const primary = archetypes[0]?.name || "Value";
  const combos = detectCombos(cards).filter(c => c.complete);
  const compactCombos = combos.filter(c => c.pieces.length <= 2);
  const commanderCentric = isCommanderCentric(cards);

  const rampCount = count("Ramp");
  const drawCount = count("Draw");
  const interactionCount = count("Removal") + count("Counterspell") + count("Board Wipe");
  const protectionCount = count("Protection");
  const recursionCount = count("Recursion") + count("Reanimator");
  const finisherCount = count("Finisher") + count("Drain") + compactCombos.length * 2;

  // Targets adaptados al tipo de mazo. No todos los decks necesitan lo mismo.
  const landTarget = cmcNum >= 4.0 ? 37 : cmcNum <= 2.6 ? 34 : 36;
  const rampTarget = primary.includes("Big Mana") ? 11 : cmcNum >= 3.6 ? 10 : 8;
  const drawTarget = primary.includes("Spellslinger") ? 11 : 8;
  const interactionTarget = 8;
  const protectionTarget = commanderCentric ? 4 : 3;

  const manabase = scoreAgainstTarget(lands, landTarget, 1, 92);
  const ramp = scoreMinimum(rampCount, rampTarget, 90);
  const draw = scoreMinimum(drawCount, drawTarget, 90);
  const interaction = scoreMinimum(interactionCount, interactionTarget, 88);
  const wincons = Math.min(94, scoreMinimum(finisherCount, primary.includes("Big Mana") ? 5 : 4, 86) + compactCombos.length * 4);
  const synergyBase = archetypes[0]?.score || 55;
  const synergy = Math.min(95, 35 + synergyBase * 0.55 + Math.min(12, detectSynergyLines(cards).length * 4) + Math.min(8, compactCombos.length * 4));
  const curveScore = primary.includes("Big Mana")
    ? (cmcNum <= 4.8 ? 82 : 65)
    : (cmcNum <= 3.3 ? 88 : cmcNum <= 3.8 ? 75 : 58);
  const consistency = Math.min(94, 30 + Math.min(24, rampCount * 2.4) + Math.min(24, drawCount * 2.4) + curveScore * 0.18 + (compactCombos.length ? 6 : 0));
  const protection = Math.min(90, scoreMinimum(protectionCount + Math.min(2, recursionCount), protectionTarget, 84));

  const overall = (
    manabase * 0.14 + ramp * 0.13 + draw * 0.15 + interaction * 0.12 +
    wincons * 0.13 + synergy * 0.18 + consistency * 0.10 + protection * 0.05
  ) / 10;

  return {
    overall: Math.max(1, Math.min(10, overall)).toFixed(1),
    radar: [
      { subject: "Manabase", value: Math.round(manabase) },
      { subject: "Ramp", value: Math.round(ramp) },
      { subject: "Card Draw", value: Math.round(draw) },
      { subject: "Interacción", value: Math.round(interaction) },
      { subject: "Win Cons", value: Math.round(wincons) },
      { subject: "Sinergia", value: Math.round(synergy) },
      { subject: "Consistencia", value: Math.round(consistency) },
      { subject: "Resiliencia", value: Math.round(protection) },
    ],
    components: { manabase, ramp, draw, interaction, wincons, synergy, consistency, protection, landTarget, rampTarget, drawTarget, interactionTarget, protectionTarget },
  };
}

function calculateBracket(cards) {
  const names = new Set(cards.map(c => c.key));
  const roles = aggregateRoles(cards);
  const count = role => roles.find(r => r.role === role)?.count || 0;
  const gameChangers = cards.filter(c => GAME_CHANGERS.has(c.key));
  const fastMana = cards.filter(c => FAST_MANA_PREMIUM.has(c.key));
  const tutors = cards.filter(c => STRONG_TUTORS.has(c.key));
  const mld = cards.filter(c => MASS_LAND_DENIAL.has(c.key));
  const extraTurns = cards.filter(c => EXTRA_TURNS.has(c.key));
  const completedCombos = detectCombos(cards).filter(c => c.complete);
  const compactCombos = completedCombos.filter(c => c.pieces.length <= 2);
  const compactComboPieces = [...new Set(compactCombos.flatMap(c => c.pieces))];
  const cedhSignals = ["thassa's oracle", "demonic consultation", "tainted pact", "underworld breach", "lion's eye diamond", "ad nauseam"].filter(n => names.has(n));

  let bracket = 2;
  const up = [];
  const down = [];
  const reasoningCards = [];

  if (gameChangers.length > 0) {
    bracket = Math.max(bracket, 3);
    up.push(`${gameChangers.length} Game Changer(s): ${gameChangers.map(c => c.name).join(", ")}`);
    reasoningCards.push({ title: "Game Changers", cards: gameChangers.map(c => c.name), note: "Las cartas decisivas empujan el mazo hacia brackets más altos." });
  }
  if (gameChangers.length >= 4) {
    bracket = Math.max(bracket, 4);
    up.push("4+ Game Changers empujan el mazo hacia Bracket 4.");
  }
  if (compactCombos.length > 0) {
    bracket = Math.max(bracket, 4);
    up.push(`Combo(s) compacto(s) de 2 cartas detectados: ${compactCombos.map(c => c.name).join(", ")}`);
    reasoningCards.push({ title: `${compactComboPieces.length} piezas de combos infinitos de dos cartas`, cards: compactComboPieces, note: "Si estas líneas son late-game o difíciles de montar, el mazo puede sentirse más como Bracket 3; si son rápidas o tutoreables, empujan a Bracket 4." });
  }
  if (fastMana.length >= 2) {
    bracket = Math.max(bracket, 4);
    up.push(`Fast mana premium: ${fastMana.map(c => c.name).join(", ")}`);
    reasoningCards.push({ title: "Fast mana premium", cards: fastMana.map(c => c.name), note: "Acelera el mazo por encima del ritmo casual normal." });
  }
  if (tutors.length >= 2) {
    bracket = Math.max(bracket, 4);
    up.push(`Varios tutores eficientes: ${tutors.map(c => c.name).join(", ")}`);
    reasoningCards.push({ title: "Tutores eficientes", cards: tutors.map(c => c.name), note: "Aumentan mucho la consistencia para encontrar combos o piezas clave." });
  }
  if (mld.length > 0) {
    bracket = Math.max(bracket, 4);
    up.push(`Mass land denial / lock: ${mld.map(c => c.name).join(", ")}`);
    reasoningCards.push({ title: "Mass land denial / lock", cards: mld.map(c => c.name), note: "Este tipo de efecto suele comunicarse antes de la partida." });
  }
  if (extraTurns.length >= 2) {
    bracket = Math.max(bracket, 4);
    up.push(`Paquete de turnos extra: ${extraTurns.map(c => c.name).join(", ")}`);
    reasoningCards.push({ title: "Turnos extra", cards: extraTurns.map(c => c.name), note: "Encadenar turnos extra empuja la experiencia hacia alto poder." });
  }
  if (cedhSignals.length >= 3 && (tutors.length >= 2 || fastMana.length >= 2)) {
    bracket = 5;
    up.push("Señales claras de cEDH: wincons compactas + tutores/fast mana.");
  }

  if (bracket < 4) {
    const draw = count("Draw");
    const ramp = count("Ramp");
    const interaction = count("Removal") + count("Counterspell") + count("Board Wipe");
    if (draw >= 7 && ramp >= 7 && interaction >= 7) {
      bracket = Math.max(bracket, 3);
      up.push("Estructura sólida de ramp/draw/interacción: mazo mejorado por encima de precon básico.");
    }
  }

  if (gameChangers.length === 0) down.push("Sin Game Changers detectados.");
  if (compactCombos.length === 0) down.push("Sin combos compactos de 2 cartas detectados.");
  if (tutors.length === 0) down.push("Sin tutores premium detectados.");
  if (fastMana.length === 0) down.push("Sin fast mana premium más allá de ramp normal.");
  if (count("Draw") < 7) down.push("Card draw por debajo de lo ideal para una lista optimizada.");
  if (count("Protection") < 3) down.push("Protección baja para piezas clave.");

  const labels = {
    1: "Bracket 1 — Exhibición / Muy casual",
    2: "Bracket 2 — Básico / Precon-level",
    3: "Bracket 3 — Mejorado",
    4: "Bracket 4 — Optimizado",
    5: "Bracket 5 — cEDH",
  };

  const shortLabels = {
    1: "Exhibición",
    2: "Básico",
    3: "Mejorado",
    4: "Optimizado",
    5: "cEDH",
  };

  const descriptions = {
    1: "Mazo muy casual o de exhibición, prioriza tema/flavor por encima de eficiencia.",
    2: "Commander casual básico o nivel precon, con plan jugable pero pocas piezas de alto poder.",
    3: "Mazo mejorado, con estructura sólida y mejores cartas, pero sin empujar a alto poder de forma clara.",
    4: "High power Commander. Pueden aparecer combos compactos, Game Changers, tutores, locks o aceleración fuerte.",
    5: "cEDH. Construido para ganar con máxima eficiencia, combos compactos, tutores, fast mana y muy poco espacio de flavor."
  };

  return { bracket, label: labels[bracket], shortLabel: shortLabels[bracket], description: descriptions[bracket], up, down, gameChangers, fastMana, tutors, compactCombos, compactComboPieces, reasoningCards, mld, extraTurns };
}

function detectCombos(cards) {
  const names = new Set(cards.map(c => normalizeName(c.name)));
  return COMBOS.map(combo => {
    const present = combo.pieces.filter(p => names.has(normalizeName(p)));
    const missing = combo.pieces.filter(p => !names.has(normalizeName(p)));
    return { ...combo, present, missing, complete: missing.length === 0, source: "Local" };
  });
}

function firstArrayByKeys(obj, keys) {
  if (!obj || typeof obj !== "object") return [];
  for (const key of keys) {
    const value = obj[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
      const nested = firstArrayByKeys(value, keys);
      if (nested.length) return nested;
    }
  }
  return [];
}

function extractCsbCards(raw) {
  const buckets = [raw?.cards, raw?.uses, raw?.cardInvariants, raw?.card_invariants, raw?.template, raw?.templates, raw?.included, raw?.required].filter(Boolean);
  const flat = buckets.flatMap(x => Array.isArray(x) ? x : [x]);
  return flat
    .map(x => x?.name || x?.card?.name || x?.oracle_card?.name || x?.cardOracle?.name || x?.card_name || x?.name_invariant || x?.label || x?.title)
    .filter(Boolean)
    .map(String);
}

function extractCsbEffects(raw) {
  const sources = [raw?.produces, raw?.results, raw?.features, raw?.effects].filter(Boolean).flatMap(x => Array.isArray(x) ? x : [x]);
  const effects = sources
    .map(x => x?.name || x?.feature?.name || x?.result || x?.description || x?.label || x)
    .filter(Boolean)
    .map(String);
  return [...new Set(effects)].slice(0, 8);
}

function extractCsbSteps(raw) {
  const sources = [raw?.steps, raw?.method, raw?.description_steps].filter(Boolean).flatMap(x => Array.isArray(x) ? x : [x]);
  const steps = sources
    .map(x => x?.text || x?.description || x?.instruction || x)
    .filter(Boolean)
    .map(String);
  return steps.length ? steps : [raw?.description || raw?.notes || "Ver detalle completo en Commander Spellbook."];
}

function extractCsbPrerequisites(raw) {
  const sources = [raw?.requires, raw?.prerequisites, raw?.requirements].filter(Boolean).flatMap(x => Array.isArray(x) ? x : [x]);
  const reqs = sources
    .map(x => x?.name || x?.description || x?.template || x?.text || x)
    .filter(Boolean)
    .map(String);
  return reqs.length ? reqs : ["Revisar requisitos exactos en Commander Spellbook."];
}

function normalizeSpellbookCombo(raw, cards) {
  const deckNames = new Set(cards.map(c => normalizeName(c.name)));
  const pieces = [...new Set(extractCsbCards(raw))];
  const present = pieces.filter(p => deckNames.has(normalizeName(p)));
  const explicitMissing = [raw?.missing, raw?.missing_cards, raw?.needed, raw?.needed_cards]
    .filter(Boolean)
    .flatMap(x => Array.isArray(x) ? x : [x])
    .map(x => x?.name || x?.card?.name || x?.card_name || x)
    .filter(Boolean)
    .map(String);
  const missing = explicitMissing.length ? [...new Set(explicitMissing)] : pieces.filter(p => !deckNames.has(normalizeName(p)));
  const effects = extractCsbEffects(raw);
  const name = raw?.name || raw?.title || (pieces.length ? pieces.join(" + ") : `Combo ${raw?.id || raw?.variant || "Spellbook"}`);
  const id = raw?.id || raw?.variant_id || raw?.slug || raw?.identity || name;
  const url = raw?.url || raw?.spellbook_uri || raw?.frontend_url || raw?.permalink || (raw?.id ? `https://commanderspellbook.com/combo/${raw.id}` : "https://commanderspellbook.com/find-my-combos/");
  const complete = missing.length === 0;
  return {
    name,
    pieces,
    present,
    missing,
    complete,
    type: effects[0] || raw?.type || "Commander Spellbook combo",
    effects: effects.length ? effects : ["Combo detectado por Commander Spellbook"],
    power: raw?.bracket_tag || raw?.status || raw?.popularity || "Spellbook",
    desc: raw?.description || raw?.notes || raw?.summary || "Combo detectado usando la base de datos de Commander Spellbook.",
    steps: extractCsbSteps(raw),
    prerequisites: extractCsbPrerequisites(raw),
    source: "Commander Spellbook",
    url,
    id,
  };
}

function normalizeSpellbookResponse(data, cards) {
  const includedKeys = ["included", "included_combos", "complete", "complete_combos", "combos", "results"];
  const almostKeys = ["almost", "almostIncluded", "almost_included", "almost_combos", "near_misses", "nearMisses", "add_one", "addOne", "potential", "incomplete"];
  const includedRaw = firstArrayByKeys(data, includedKeys);
  const almostRaw = firstArrayByKeys(data, almostKeys);
  const allIncluded = includedRaw.map(x => normalizeSpellbookCombo(x, cards)).filter(c => c.pieces.length >= 2 && c.complete);
  const allAlmost = almostRaw.map(x => normalizeSpellbookCombo(x, cards)).filter(c => c.pieces.length >= 2 && !c.complete);

  // Si el endpoint devuelve todo mezclado en results, clasificamos por piezas presentes/faltantes.
  if (!allAlmost.length && includedRaw.length) {
    const mixed = includedRaw.map(x => normalizeSpellbookCombo(x, cards));
    return {
      included: mixed.filter(c => c.complete && c.pieces.length >= 2),
      almost: mixed.filter(c => !c.complete && c.pieces.length >= 2 && c.missing.length <= 2),
    };
  }
  return { included: allIncluded, almost: allAlmost };
}

function getSpellbookVariantArray(data) {
  if (Array.isArray(data)) return data;
  return firstArrayByKeys(data, ["variants", "results", "data", "objects", "items"]);
}

function dedupeCombos(list) {
  const seen = new Set();
  const out = [];
  for (const combo of list) {
    const key = combo.pieces.map(x => normalizeName(x)).sort().join("|") + "::" + normalizeName(combo.effects?.[0] || combo.type || combo.name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(combo);
  }
  return out;
}

function computeSpellbookCombosFromVariants(variants, cards) {
  const normalized = variants
    .map(raw => normalizeSpellbookCombo(raw, cards))
    .filter(c => c.pieces.length >= 2 && c.pieces.length <= 3);

  const included = dedupeCombos(normalized
    .filter(c => c.missing.length === 0)
    .map(c => ({ ...c, complete: true, source: "Commander Spellbook Bulk" })))
    .sort((a, b) => a.pieces.length - b.pieces.length || a.name.localeCompare(b.name));

  const almost = dedupeCombos(normalized
    .filter(c => c.missing.length === 1 && c.present.length === c.pieces.length - 1)
    .map(c => ({ ...c, complete: false, source: "Commander Spellbook Bulk" })))
    .sort((a, b) => b.present.length - a.present.length || a.name.localeCompare(b.name))
    .slice(0, 120);

  return { included, almost, source: "Commander Spellbook bulk database" };
}

async function fetchSpellbookBulkCombos(cards) {
  const urls = [
    "https://json.commanderspellbook.com/variants.json",
    "https://backend.commanderspellbook.com/variants/?limit=50000&format=json",
  ];
  let lastError = null;
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`variants ${res.status}`);
      const data = await res.json();
      const variants = getSpellbookVariantArray(data);
      if (!variants.length) throw new Error("variants vacío");
      return computeSpellbookCombosFromVariants(variants, cards);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("No se pudo cargar variants.json");
}

async function fetchCommanderSpellbookApiCombos(cards) {
  const base = "https://backend.commanderspellbook.com";
  const text = cards.map(c => `${c.qty || 1} ${c.name}`).join(String.fromCharCode(10));
  const payloads = [
    { cards: cards.map(c => c.name), limit: 1000, offset: 0 },
    { card_names: cards.map(c => c.name), limit: 1000, offset: 0 },
    { decklist: text, limit: 1000, offset: 0 },
  ];
  let lastError = null;
  for (const payload of payloads) {
    try {
      const res = await fetch(`${base}/find-my-combos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`find-my-combos ${res.status}`);
      const data = await res.json();
      const result = normalizeSpellbookResponse(data?.results || data, cards);
      return { ...result, source: "Commander Spellbook API" };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("No se pudo consultar find-my-combos");
}

async function fetchCommanderSpellbookCombosForCards(cards) {
  // Primero usamos el bulk JSON oficial de Commander Spellbook. Es más estable para navegador
  // y permite calcular tanto combos incluidos como combos a una carta sin depender de Archidekt.
  try {
    return await fetchSpellbookBulkCombos(cards);
  } catch (bulkError) {
    try {
      return await fetchCommanderSpellbookApiCombos(cards);
    } catch (apiError) {
      throw new Error(`Spellbook no disponible: ${bulkError?.message || "bulk"}; ${apiError?.message || "api"}`);
    }
  }
}

function findCard(cards, name) {
  const key = normalizeName(name);
  return cards.find(c => c.key === key || normalizeName(c.name) === key);
}

function getCommanderStrategyHint(commander) {
  const key = normalizeName(commander?.name || "");
  const text = `${commander?.name || ""} ${commander?.oracle || ""}`.toLowerCase();
  if (key.includes("selvala, heart of the wilds")) return {
    plan: "acelerar con criaturas de mucha fuerza, usar a Selvala como motor de maná/cartas y cerrar con criaturas enormes o combos de enderezar/maná infinito",
    early: "priorizar mano con 2-3 tierras, acelerador temprano y una criatura de fuerza alta o pieza que active bien a Selvala",
    mid: "resolver a Selvala protegida, generar maná explosivo y convertir ese maná en amenazas, tutores o piezas de combo",
    late: "cerrar con combate masivo, Finale/Craterhoof-style effects, o líneas de maná infinito como Selvala + Umbral Mantle",
  };
  if (key.includes("dina, soul steeper")) return {
    plan: "convertir ganancia de vida y sacrificios en drenaje constante, usando tokens o criaturas pequeñas como combustible",
    early: "bajar Dina o motores de lifegain baratos y empezar a preparar cuerpos sacrificables",
    mid: "juntar payoffs de drain con sac outlets o generación de tokens",
    late: "cerrar con drenaje acumulado, Exsanguinate/Aetherflux, o loops de lifegain/drain",
  };
  if (key.includes("yuriko")) return {
    plan: "conectar criaturas evasivas, activar ninjutsu y manipular el topdeck para convertir cartas de coste alto en daño masivo",
    early: "buscar evasivos de coste 1 y manos con interacción/topdeck manipulation",
    mid: "mantener presión con Yuriko y proteger los ataques clave",
    late: "cerrar con triggers grandes, turnos de tempo y topdecks de alto valor de maná",
  };
  if (key.includes("giada")) return {
    plan: "curvar ángeles cada vez más grandes usando a Giada como acelerador y fuente de contadores",
    early: "bajar Giada pronto y protegerla si la mano depende de ella",
    mid: "encadenar ángeles eficientes y motores de robo tribal/lifegain",
    late: "cerrar por evasión aérea, anthem effects y amenazas difíciles de remover",
  };
  if (text.includes("whenever") && text.includes("token")) return null;
  return null;
}

function buildPlanText(cards) {
  if (!cards.length) return "Pegá una decklist para generar el análisis.";
  const commander = getCommander(cards);
  const hint = getCommanderStrategyHint(commander);
  const archetypes = detectArchetypes(cards);
  const primary = archetypes[0]?.name || "Value / Goodstuff";
  const roles = aggregateRoles(cards);
  const count = role => roles.find(r => r.role === role)?.count || 0;
  const compactCombos = detectCombos(cards).filter(c => c.complete && c.pieces.length <= 2);

  if (hint && normalizeName(commander?.name || "").includes("dina, soul steeper")) {
    return "Tu plan con Dina es jugar una partida de desgaste: bajar a Dina cuando puedas empezar a ganar vida o sacrificar criaturas, convertir cada ganancia de vida en daño a toda la mesa y usar tokens/criaturas pequeñas como combustible. Al principio querés manos con tierras, una fuente de lifegain o bodies baratos y alguna forma de robar o responder. En mid game buscás juntar un motor: Dina más Blood Artist/Zulaport/Bastion/Sanguine Bond, algún sac outlet y generación de criaturas. No hace falta atacar fuerte: tu mesa tiene que hacer que cada muerte, cada Pest y cada vida ganada drene. Guardá removals para piezas que frenen tu motor o amenazas que cierren antes que vos. En late game cerrás por acumulación de drenaje, Exsanguinate, Aetherflux Reservoir, Sanguine Bond o loops de lifegain si aparecen. La clave es no sobreextender todos los payoffs a la vez contra wipes: jugá uno o dos motores, forzá respuestas y reconstruí con recursión.";
  }

  if (hint) {
    return `El plan con ${commander?.name} es ${hint.plan}. En los primeros turnos buscás una mano que avance ese plan, no solo cartas buenas sueltas. En mid game intentás resolver el comandante o el motor principal con protección/interacción disponible, y convertir el maná o value generado en una amenaza real. En late game tenés que elegir si cerrar por combate, por value acumulado o por combo; no conviene gastar piezas clave antes de que puedan ganar o dejarte muy por delante.`;
  }

  if (primary.includes("Aristocrats") || primary.includes("Lifegain")) {
    return "El mazo se juega como un motor de desgaste: primero desarrollás criaturas pequeñas, lifegain y piezas de drain; después sumás sac outlets o generadores de tokens para que cada muerte se convierta en daño y value. No necesitás ganar de golpe: necesitás que cada turno deje a la mesa más baja de vida y a vos con más recursos. La prioridad es proteger los payoffs de drain y no sacrificar recursos sin recompensa. Si tenés un finisher tipo Exsanguinate/Aetherflux/Sanguine Bond, jugalo cuando ya puedas cerrar o dejar la partida casi terminada.";
  }

  if (primary.includes("Big Mana")) {
    return "El mazo busca acelerar más rápido que la mesa, resolver una fuente grande de maná y convertirla en amenazas o combos. Tus mejores manos tienen ramp temprano, una pieza que escale y alguna forma de proteger el turno explosivo. No gastes los finishers solo por valor: esperá a que el maná grande te permita cerrar con una amenaza enorme, un overrun o una línea de combo.";
  }

  if (primary.includes("Tokens")) {
    return "El plan es llenar mesa y convertir cantidad en ventaja. Los tokens tienen que servir para algo más que atacar: robar, sacrificar, drenar, convoke o cerrar con anthem/overrun. La parte importante es no comerte un wipe con toda la mano invertida; desarrollá motores y guardá una forma de reconstruir o rematar.";
  }

  if (primary.includes("Spellslinger")) {
    return "El mazo quiere jugar a tempo y value: preparar payoffs, encadenar instantáneos/conjuros y mantener recursos en mano. No conviene tirar cantrips sin payoff si no estás buscando algo concreto. La partida se gana cuando tus hechizos empiezan a contar doble: roban, remueven, copian o disparan daño/value.";
  }

  if (compactCombos.length) {
    return `El mazo tiene una línea de combo real (${compactCombos.map(c => c.name).join("; ")}). La forma óptima de jugarlo es sobrevivir y desarrollar recursos hasta poder montar la línea con protección o con la mesa girada. Mientras tanto, usá las piezas como value solo si no compromete el cierre.`;
  }

  return "El mazo parece orientado a value/midrange: desarrollar mesa, intercambiar recursos y ganar por acumulación de ventaja. En early game priorizá manos con tierras, ramp y una jugada de impacto. En mid game intentá que cada carta haga más de una cosa: robar, remover, generar mesa o recuperar recursos. En late game necesitás identificar tu cierre real; si la partida se alarga y solo estás respondiendo, probablemente falten finishers o motores más decisivos.";
}

function buildGamePhases(cards) {
  const commander = getCommander(cards);
  const hint = getCommanderStrategyHint(commander);
  if (hint) return { early: hint.early, mid: hint.mid, late: hint.late };
  const primary = detectArchetypes(cards)[0]?.name || "Value";
  if (primary.includes("Aristocrats")) return {
    early: "bajar cuerpos baratos, primeras piezas de lifegain/drain y preparar un sac outlet",
    mid: "juntar generadores de criaturas con payoffs de muerte para empezar a drenar la mesa",
    late: "cerrar con drenaje acumulado, recursion o una X-spell/finisher",
  };
  if (primary.includes("Spellslinger")) return {
    early: "mantener manos con tierras, cantrips/ramp y alguna interacción barata",
    mid: "resolver payoffs y encadenar hechizos sin quedarte sin mano",
    late: "cerrar con storm, copias, burn grande o ventaja acumulada",
  };
  if (primary.includes("Tokens")) return {
    early: "establecer generadores de tokens o ramp para empezar a poblar mesa",
    mid: "convertir tokens en daño, cartas o recursos con payoffs",
    late: "cerrar con anthem, overrun, sacrificios o drenaje",
  };
  return {
    early: "priorizar tierras, ramp barato y primeras piezas de motor; una mano sin jugada temprana suele ser mulligan",
    mid: "bajar payoffs, sostener interacción y no gastar piezas clave antes de generar valor",
    late: "cerrar con wincons, acumulación de value o combo; revisar si el mazo tiene formas reales de terminar la partida",
  };
}

function suggestRecommendations(cards) {
  const roles = aggregateRoles(cards);
  const count = role => roles.find(r => r.role === role)?.count || 0;
  const scores = calculateScores(cards);
  const primary = detectArchetypes(cards)[0]?.name || "";
  const recs = [];

  const add = (area, card, reason, priority, options = [], cost = "variable") => {
    recs.push({ area, card, reason, priority, cost, options });
  };

  if (count("Draw") < scores.components.drawTarget) {
    add(
      "Card draw",
      "Más card draw / ventaja",
      `Se detectaron ${count("Draw")} fuentes de draw y el objetivo para este mazo es aprox. ${scores.components.drawTarget}. Sin robo suficiente, el mazo depende demasiado de la mano inicial.`,
      "Alta",
      primary.includes("Big Mana") ? ["Guardian Project", "Beast Whisperer", "Garruk's Uprising", "The Great Henge", "Return of the Wildspeaker"] : GENERIC_UPGRADES.Draw
    );
  }

  if (count("Ramp") < scores.components.rampTarget) {
    add(
      "Ramp",
      "Más aceleración",
      `Se detectaron ${count("Ramp")} piezas de ramp y el objetivo para esta curva/arquetipo es aprox. ${scores.components.rampTarget}.`,
      "Alta",
      primary.includes("Big Mana") ? ["Nature's Lore", "Three Visits", "Wild Growth", "Utopia Sprawl", "Fanatic of Rhonas"] : GENERIC_UPGRADES.Ramp,
      "0.5-8€"
    );
  }

  if (count("Removal") + count("Counterspell") + count("Board Wipe") < scores.components.interactionTarget) {
    add(
      "Interacción",
      "Más respuestas flexibles",
      `Hay ${count("Removal") + count("Counterspell") + count("Board Wipe")} respuestas detectadas. Para Commander conviene rondar ${scores.components.interactionTarget} o más, según mesa.`,
      "Media",
      GENERIC_UPGRADES.Removal,
      "0.5-5€"
    );
  }

  if (isCommanderCentric(cards) && count("Protection") < scores.components.protectionTarget) {
    add(
      "Protección",
      "Proteger comandante/motor",
      `El comandante parece importante para el plan y solo hay ${count("Protection")} piezas de protección.`,
      "Alta",
      primary.includes("Big Mana") ? ["Heroic Intervention", "Tamiyo's Safekeeping", "Tyvar's Stand", "Lightning Greaves", "Swiftfoot Boots"] : GENERIC_UPGRADES.Protection,
      "1-10€"
    );
  }

  if (primary.includes("Big Mana") && count("Untap") < 2) {
    add(
      "Combo / explosividad",
      "Más efectos de untap",
      "El mazo parece Big Mana/Creature Combo. Los efectos que enderezan al comandante o criaturas de maná aumentan mucho el techo del deck.",
      "Media",
      ["Umbral Mantle", "Quirion Ranger", "Scryb Ranger", "Instill Energy", "Patriar's Seal"],
      "variable"
    );
  }

  if ((primary.includes("Tokens") || primary.includes("Aristocrats")) && count("Tokens") >= 3 && count("Draw") < scores.components.drawTarget + 1) {
    add(
      "Tokens + draw",
      "Convertir tokens en cartas",
      "Como los tokens forman parte del plan, conviene que también funcionen como combustible de robo o sacrificio.",
      "Media",
      ["Skullclamp", "Deadly Dispute", "Village Rites", "Moldervine Reclamation"]
    );
  }

  if (primary.includes("Aristocrats") && count("Sac Outlet") < 3) {
    add(
      "Aristocrats",
      "Más sac outlets",
      "El plan de Aristocrats necesita outlets repetibles para que los payoffs de muerte funcionen cuando vos querés, no cuando la mesa te deja.",
      "Alta",
      ["Viscera Seer", "Carrion Feeder", "Woe Strider", "Yawgmoth, Thran Physician", "Altar of Dementia"]
    );
  }

  if (recs.length === 0) {
    add(
      "Ajustes finos",
      "Testear cartas muertas",
      "La estructura general no muestra agujeros grandes. El siguiente paso es marcar en partidas reales qué cartas se quedan en mano y cuáles ganan partidas.",
      "Baja",
      []
    );
  }

  return recs.slice(0, 8);
}

function getCmcBucket(card) {
  if (card.type === "Tierras" || card.type === "Commander") return null;
  const cmc = card.cmc ?? estimateCmcFallback(card);
  if (cmc === null || Number.isNaN(cmc)) return null;
  return cmc >= 7 ? "7+" : String(cmc);
}

function filterCards(cards, filter) {
  if (!filter) return cards;
  if (filter.kind === "cmc") return cards.filter(c => getCmcBucket(c) === filter.value);
  if (filter.kind === "type") return cards.filter(c => c.type === filter.value);
  if (filter.kind === "role") return cards.filter(c => getEffectiveRoles(c).includes(filter.value));
  return cards;
}

function filterTitle(filter) {
  if (!filter) return "Todas las cartas";
  if (filter.kind === "cmc") return `Cartas de valor de maná ${filter.value}`;
  if (filter.kind === "type") return `Cartas de tipo: ${filter.value}`;
  if (filter.kind === "role") return `Cartas con rol/tag: ${filter.value}`;
  return "Cartas filtradas";
}

function getRoleCount(cards, role) {
  return aggregateRoles(cards).find(r => r.role === role)?.count || 0;
}

function getRoleCards(cards, role, limit = 6) {
  return cards.filter(c => getEffectiveRoles(c).includes(role)).slice(0, limit).map(c => c.name);
}

function generateStrengths(cards) {
  const strengths = [];
  const archetypes = detectArchetypes(cards);
  const lands = cards.filter(c => c.type === "Tierras").reduce((a, c) => a + c.qty, 0);
  const interaction = getRoleCount(cards, "Removal") + getRoleCount(cards, "Counterspell") + getRoleCount(cards, "Board Wipe");
  const ramp = getRoleCount(cards, "Ramp");
  const draw = getRoleCount(cards, "Draw");
  const recursion = getRoleCount(cards, "Recursion") + getRoleCount(cards, "Reanimator");
  const synergyRoles = ["Tokens", "Sac Outlet", "Drain", "Lifegain", "ETB", "Blink", "Spellslinger", "Artifacts", "Counters"].filter(r => getRoleCount(cards, r) >= 3);

  if (archetypes[0]) strengths.push({ title: "Identidad clara", text: `El mazo parece tener una dirección reconocible: ${archetypes[0].name}. Eso ayuda a que las cartas tiren hacia el mismo plan.` });
  if (interaction >= 8) strengths.push({ title: "Buena interacción", text: `Hay ${interaction} piezas entre removal/counters/wipes. Eso es una base sólida para mesas casuales y medias.` });
  if (ramp >= 8) strengths.push({ title: "Ramp suficiente", text: `Hay ${ramp} piezas de ramp detectadas, suficiente para desplegar el plan con buena consistencia.` });
  if (draw >= 8) strengths.push({ title: "Card advantage sano", text: `Hay ${draw} fuentes de robo/ventaja. El mazo debería recuperar recursos razonablemente bien.` });
  if (recursion >= 4) strengths.push({ title: "Resiliencia", text: `La recursión detectada (${recursion}) ayuda a recuperarte de removals y wipes.` });
  if (lands >= 35 && lands <= 38) strengths.push({ title: "Cantidad de tierras razonable", text: `${lands} tierras está dentro del rango habitual para Commander.` });
  if (synergyRoles.length) strengths.push({ title: "Paquetes de sinergia detectados", text: `Hay densidad en: ${synergyRoles.join(", ")}. Eso sugiere motores internos más allá de cartas sueltas.` });

  if (!strengths.length) strengths.push({ title: "Base inicial detectada", text: "La app detectó la estructura del mazo, pero necesita datos de Scryfall y más tags para evaluar mejor sus puntos fuertes." });
  return strengths;
}

function generateWeaknesses(cards) {
  const weaknesses = [];
  const lands = cards.filter(c => c.type === "Tierras").reduce((a, c) => a + c.qty, 0);
  const ramp = getRoleCount(cards, "Ramp");
  const draw = getRoleCount(cards, "Draw");
  const interaction = getRoleCount(cards, "Removal") + getRoleCount(cards, "Counterspell") + getRoleCount(cards, "Board Wipe");
  const protection = getRoleCount(cards, "Protection");
  const unknown = unknownCmcCount(cards);
  const avg = Number(averageCmc(cards));

  if (unknown > 0) weaknesses.push({ title: "Datos incompletos", text: `${unknown} cartas todavía no tienen coste/tipo real. Cargá Scryfall para que curva, roles y score sean más fiables.` });
  if (draw < 7) weaknesses.push({ title: "Poco robo", text: `Solo se detectaron ${draw} piezas de draw. En Commander normalmente querés 7-12 según el mazo.` });
  if (ramp < 7) weaknesses.push({ title: "Ramp bajo", text: `Solo se detectaron ${ramp} piezas de ramp. Si la curva es media/alta, el mazo puede arrancar lento.` });
  if (interaction < 7) weaknesses.push({ title: "Interacción baja", text: `Hay ${interaction} respuestas detectadas. Podrías sufrir contra amenazas clave o combos rivales.` });
  if (protection < 3) weaknesses.push({ title: "Poca protección", text: `Solo se detectaron ${protection} piezas de protección. Si el comandante es central, esto importa mucho.` });
  if (lands < 34) weaknesses.push({ title: "Pocas tierras", text: `${lands} tierras puede ser bajo salvo que el mazo tenga mucha curva baja y mucho ramp barato.` });
  if (lands > 39) weaknesses.push({ title: "Muchas tierras", text: `${lands} tierras puede ser alto; quizás estás perdiendo slots de acción.` });
  if (avg && avg > 3.6) weaknesses.push({ title: "Curva alta", text: `CMC promedio ${avg.toFixed(2)}. Conviene revisar si hay suficientes ramp/draw para sostenerla.` });

  if (!weaknesses.length) weaknesses.push({ title: "Sin problemas críticos", text: "No se detectan agujeros estructurales grandes. El siguiente paso sería testear manos y marcar cartas muertas/MVP." });
  return weaknesses;
}

function detectSynergyLines(cards) {
  const lines = [];
  const addLine = (name, roles, desc) => {
    const pieces = roles.flatMap(r => getRoleCards(cards, r, 4));
    const uniquePieces = [...new Set(pieces)].slice(0, 8);
    if (uniquePieces.length) lines.push({ name, roles, desc, pieces: uniquePieces });
  };

  if (getRoleCount(cards, "Sac Outlet") >= 1 && getRoleCount(cards, "Drain") >= 1) {
    addLine("Motor Aristocrats", ["Sac Outlet", "Drain", "Tokens", "Recursion"], "Sacrificar criaturas o hacerlas morir se convierte en pérdida de vida, value y presión constante.");
  }
  if (getRoleCount(cards, "Tokens") >= 3 && (getRoleCount(cards, "Draw") >= 1 || getRoleCount(cards, "Sac Outlet") >= 1)) {
    addLine("Tokens como combustible", ["Tokens", "Draw", "Sac Outlet", "Drain"], "Los tokens no solo atacan: también alimentan sacrificios, robo, drenaje o convoke/recursos.");
  }
  if (getRoleCount(cards, "Lifegain") >= 2 && getRoleCount(cards, "Drain") >= 2) {
    addLine("Lifegain convertido en daño", ["Lifegain", "Drain"], "Las vidas ganadas pasan a ser presión real sobre la mesa mediante drenadores o efectos tipo Sanguine Bond.");
  }
  if (getRoleCount(cards, "Blink") >= 2 && getRoleCount(cards, "ETB") >= 4) {
    addLine("Blink / ETB value", ["Blink", "ETB", "Draw", "Removal"], "El mazo puede repetir entradas al campo para robar, remover, generar tokens o acumular ventaja.");
  }
  if (getRoleCount(cards, "Spellslinger") >= 2 || countBy(cards, c => c.type).filter(t => ["Instantáneos", "Sortilegios"].includes(t.name)).reduce((a, t) => a + t.value, 0) >= 24) {
    addLine("Spellslinger", ["Spellslinger", "Draw", "Removal", "Counterspell"], "La densidad de instantáneos/conjuros o payoffs sugiere un plan de encadenar hechizos y generar valor.");
  }
  if (getRoleCount(cards, "Artifacts") >= 3) {
    addLine("Artifacts value", ["Artifacts", "Ramp", "Draw", "Combo"], "Hay suficientes señales de artefactos para buscar líneas de value, ramp o combo.");
  }
  if (getRoleCount(cards, "Counters") >= 4) {
    addLine("Counters engine", ["Counters", "Proliferate", "Draw"], "El mazo parece acumular contadores y puede escalar muy bien con proliferar o dobladores.");
  }
  if (getRoleCount(cards, "Recursion") + getRoleCount(cards, "Reanimator") >= 4) {
    addLine("Cementerio como recurso", ["Recursion", "Reanimator", "Sac Outlet", "Removal"], "El mazo puede recuperar piezas o convertir el cementerio en una segunda mano.");
  }

  return lines;
}

function isComboPiece(card, cards) {
  const key = normalizeName(card.name);
  return detectCombos(cards).some(combo => combo.complete && combo.pieces.some(p => normalizeName(p) === key));
}

function getCoreRolesForDeck(cards) {
  const primary = detectArchetypes(cards)[0]?.name || "";
  const core = new Set(["Draw", "Ramp", "Removal", "Protection"]);
  if (primary.includes("Big Mana")) ["Ramp", "Untap", "Finisher", "Counters", "Evasion"].forEach(r => core.add(r));
  if (primary.includes("Creature Combo")) ["Ramp", "Untap", "Tutor", "Protection", "Draw"].forEach(r => core.add(r));
  if (primary.includes("Aristocrats")) ["Sac Outlet", "Drain", "Tokens", "Recursion", "Draw"].forEach(r => core.add(r));
  if (primary.includes("Lifegain")) ["Lifegain", "Drain", "Draw"].forEach(r => core.add(r));
  if (primary.includes("Tokens")) ["Tokens", "Draw", "Finisher", "Sac Outlet"].forEach(r => core.add(r));
  if (primary.includes("Counters")) ["Counters", "Proliferate", "Draw", "Protection"].forEach(r => core.add(r));
  if (primary.includes("Graveyard")) ["Recursion", "Reanimator", "Sac Outlet", "Mill", "Draw"].forEach(r => core.add(r));
  if (primary.includes("Spellslinger")) ["Spellslinger", "Draw", "Counterspell", "Removal"].forEach(r => core.add(r));
  if (primary.includes("Voltron")) ["Voltron", "Equipment", "Protection", "Evasion"].forEach(r => core.add(r));
  return core;
}

function getCutCandidates(cards, limit = 8) {
  const scores = calculateScores(cards);
  const coreRoles = getCoreRolesForDeck(cards);
  const rampCount = getRoleCount(cards, "Ramp");
  const drawCount = getRoleCount(cards, "Draw");
  const interactionCount = getRoleCount(cards, "Removal") + getRoleCount(cards, "Counterspell") + getRoleCount(cards, "Board Wipe");
  const primary = detectArchetypes(cards)[0]?.name || "";
  const protectedKeys = new Set(["sol ring", "arcane signet", "command tower"]);

  return cards
    .filter(c => c.type !== "Commander" && c.type !== "Tierras" && !protectedKeys.has(c.key))
    .map(c => {
      const roles = getEffectiveRoles(c);
      const isCore = roles.some(r => coreRoles.has(r));
      let score = 10;
      const reasons = [];

      if (isComboPiece(c, cards)) {
        score -= 80;
        reasons.push("pieza de combo detectado");
      }
      if (roles.includes("Game Changer") || roles.includes("Fast Mana")) {
        score -= 35;
        reasons.push("carta de alto impacto");
      }
      if (isCore) {
        score -= 18;
        reasons.push("cumple rol central del arquetipo");
      }
      if (roles.length === 0) {
        score += 32;
        reasons.push("sin rol claro detectado");
      }
      if (roles.length === 1 && ["Evasion", "ETB", "Lifegain"].includes(roles[0])) {
        score += 10;
        reasons.push("rol aislado de bajo impacto relativo");
      }

      // El coste alto solo es problema si el mazo no es big mana/stompy.
      if ((c.cmc || 0) >= 6 && !primary.includes("Big Mana")) {
        score += 14;
        reasons.push("coste alto para el plan detectado");
      } else if ((c.cmc || 0) >= 7 && primary.includes("Big Mana") && !roles.includes("Finisher") && !roles.includes("Draw")) {
        score += 6;
        reasons.push("coste alto incluso para big mana, revisar impacto");
      }

      if (roles.includes("Ramp") && rampCount <= Math.ceil(scores.components.rampTarget)) {
        score -= 28;
        reasons.push("no conviene cortar ramp: está cerca/debajo del objetivo");
      }
      if (roles.includes("Draw") && drawCount <= Math.ceil(scores.components.drawTarget)) {
        score -= 28;
        reasons.push("no conviene cortar draw: está cerca/debajo del objetivo");
      }
      if ((roles.includes("Removal") || roles.includes("Counterspell") || roles.includes("Board Wipe")) && interactionCount <= Math.ceil(scores.components.interactionTarget)) {
        score -= 22;
        reasons.push("no conviene cortar interacción: está cerca/debajo del objetivo");
      }
      if (roles.includes("Protection") && isCommanderCentric(cards)) {
        score -= 18;
        reasons.push("protege piezas clave/comandante");
      }
      if (c.notFound) {
        score += 8;
        reasons.push("datos incompletos de Scryfall");
      }

      return { card: c, score, roles, reasons };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function inferWantedCardRole(name) {
  const key = normalizeName(name);
  if (["skullclamp", "phyrexian arena", "rhystic study", "night's whisper", "read the bones", "guardian project", "beast whisperer", "garruk's uprising"].includes(key)) return "Draw";
  if (["sol ring", "arcane signet", "fellwar stone", "nature's lore", "three visits", "wild growth", "utopia sprawl"].includes(key) || key.includes("signet") || key.includes("talisman")) return "Ramp";
  if (["swords to plowshares", "path to exile", "beast within", "generous gift", "feed the swarm", "chaos warp"].includes(key)) return "Removal";
  if (["swiftfoot boots", "lightning greaves", "heroic intervention", "teferi's protection", "tamiyo's safekeeping", "tyvar's stand"].includes(key)) return "Protection";
  if (["tendershoot dryad", "mycoloth", "ophiomancer", "awakening zone"].includes(key)) return "Tokens";
  if (["umbral mantle", "quirion ranger", "scryb ranger", "patriar's seal", "instill energy"].includes(key)) return "Untap";
  if (["craterhoof behemoth", "finale of devastation", "overwhelming stampede", "triumph of the hordes", "exsanguinate", "torment of hailfire"].includes(key)) return "Finisher";
  return "Upgrade";
}

function getTargetForRole(cards, role) {
  const scores = calculateScores(cards);
  if (role === "Ramp") return scores.components.rampTarget;
  if (role === "Draw") return scores.components.drawTarget;
  if (["Removal", "Counterspell", "Board Wipe"].includes(role)) return scores.components.interactionTarget;
  if (role === "Protection") return scores.components.protectionTarget;
  return null;
}

function getCutCandidatesForWanted(cards, wantedName, limit = 5) {
  const wantedRole = inferWantedCardRole(wantedName);
  const base = getCutCandidates(cards, 30);
  const currentRoleCount = getRoleCount(cards, wantedRole);
  const target = getTargetForRole(cards, wantedRole);

  return base
    .map(item => {
      let score = item.score;
      const roles = item.roles || [];
      const reasons = [...(item.reasons || [])];

      // Si estoy metiendo una carta de un rol que falta, no me recomiendes cortar ese mismo rol.
      if (roles.includes(wantedRole) && target !== null && currentRoleCount <= target) {
        score -= 35;
        reasons.unshift(`no cortar ${wantedRole}: todavía está cerca/debajo del objetivo`);
      }

      // Si estoy metiendo una carta del mismo rol y ese rol está sobrado, sí puede ser reemplazo natural.
      if (roles.includes(wantedRole) && target !== null && currentRoleCount > target + 2) {
        score += 12;
        reasons.unshift(`posible reemplazo dentro del mismo rol: ${wantedRole}`);
      }

      // Si meto una wincon/combo, suelen sobrar cartas de value sin rol claro antes que ramp/draw/protección.
      if (["Finisher", "Untap", "Upgrade"].includes(wantedRole) && roles.length === 0) {
        score += 8;
        reasons.unshift("la carta nueva parece subir techo; este slot tiene poco rol detectado");
      }

      return { ...item, score, reasons };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const role = payload[0]?.payload?.role;
    const desc = role ? ROLE_DESCRIPTIONS[role] : "";
    return (
      <div style={{ background: "#0d1f0d", border: "1px solid #22c55e", padding: "8px 14px", borderRadius: 8, fontSize: 13, maxWidth: 280 }}>
        <p style={{ color: "#86efac", margin: 0, fontWeight: 700 }}>{label || payload[0].name || role}</p>
        <p style={{ color: "#fff", margin: "2px 0 0" }}>{payload[0].value}</p>
        {desc && <p style={{ color: "#94a3b8", margin: "6px 0 0", lineHeight: 1.4 }}>{desc}</p>}
      </div>
    );
  }
  return null;
}

const ScoreBar = ({ value, max = 100, color = "#22c55e" }) => (
  <div style={{ height: 6, background: "#1a2e1a", borderRadius: 3, overflow: "hidden", flex: 1 }}>
    <div style={{ width: `${Math.min(100, (value / max) * 100)}%`, height: "100%", background: `linear-gradient(90deg, ${color}88, ${color})`, borderRadius: 3, transition: "width 1s ease" }} />
  </div>
);

const Tag = ({ label, color = "#86efac" }) => {
  const description = ROLE_DESCRIPTIONS[label] || label;
  return (
    <span title={description} style={{ background: "#1a3a1a", color, fontSize: 10, padding: "2px 8px", borderRadius: 99, border: "1px solid #14532d", fontWeight: 600, letterSpacing: 0.5, cursor: "help" }}>{label}</span>
  );
};

const priorityColor = { Alta: "#ef4444", Media: "#f59e0b", Baja: "#6b7280" };

export default function DeckAnalysis() {
  const [tab, setTab] = useState("home");
  const [theme, setTheme] = useState(() => {
    try { return window.localStorage.getItem("commanderDeckAnalyzer.theme.v1") || "dark"; } catch { return "dark"; }
  });
  const [deckText, setDeckText] = useState(STARTING_TEXT);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadStatus, setLoadStatus] = useState("");
  const [wantedCards, setWantedCards] = useState("");
  const [wantedSearch, setWantedSearch] = useState("");
  const [wantedSuggestions, setWantedSuggestions] = useState([]);
  const [selectedWantedCards, setSelectedWantedCards] = useState([]);
  const [wantedSearchStatus, setWantedSearchStatus] = useState("");
  const [activeFilter, setActiveFilter] = useState(null);
  const [cardSearch, setCardSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Todos");
  const [roleFilter, setRoleFilter] = useState("Todos");
  const [deckName, setDeckName] = useState("");
  const [savedDecks, setSavedDecks] = useState([]);
  const [saveStatus, setSaveStatus] = useState("");
  const [reportStatus, setReportStatus] = useState("");
  const [comboView, setComboView] = useState("included");
  const [deckViewGroupBy, setDeckViewGroupBy] = useState("role");
  const [deckViewSortBy, setDeckViewSortBy] = useState("name");
  const [deckViewSearch, setDeckViewSearch] = useState("");
  const [deckViewLayout, setDeckViewLayout] = useState("scroll");
  const [statsCurveBy, setStatsCurveBy] = useState("color");
  const [spellbookIncludedCombos, setSpellbookIncludedCombos] = useState([]);
  const [spellbookAlmostCombos, setSpellbookAlmostCombos] = useState([]);
  const [spellbookStatus, setSpellbookStatus] = useState("Sin consultar Commander Spellbook");
  const [spellbookLoading, setSpellbookLoading] = useState(false);
  const [spellbookHasFetched, setSpellbookHasFetched] = useState(false);
  const [previewCard, setPreviewCard] = useState(null);
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 });
  const [selectedDiagnostic, setSelectedDiagnostic] = useState(null);
  const [comboSizeFilter, setComboSizeFilter] = useState("all");
  const [suggestionCardData, setSuggestionCardData] = useState({});

  const commander = useMemo(() => getCommander(cards), [cards]);
  const deckAllowedColors = useMemo(() => getDeckAllowedColors(cards), [cards]);
  const totalDeckPrice = useMemo(() => getDeckTotalPrice(cards), [cards]);
  const totalCards = useMemo(() => cards.reduce((a, c) => a + c.qty, 0), [cards]);
  const pricedCardsCount = useMemo(() => cards.filter(c => Number(c.price) > 0).reduce((a, c) => a + c.qty, 0), [cards]);
  const landsCount = useMemo(() => cards.filter(c => c.type === "Tierras").reduce((a, c) => a + c.qty, 0), [cards]);
  const manaCurve = useMemo(() => calculateManaCurve(cards), [cards]);
  const cardTypes = useMemo(() => countBy(cards, c => c.type).map(d => ({ ...d, color: CARD_TYPE_COLORS[d.name] || CARD_TYPE_COLORS.Otros })), [cards]);
  const roles = useMemo(() => aggregateRoles(cards), [cards]);
  const scores = useMemo(() => calculateScores(cards), [cards]);
  const bracket = useMemo(() => calculateBracket(cards), [cards]);
  const archetypes = useMemo(() => detectArchetypes(cards), [cards]);
  const combos = useMemo(() => detectCombos(cards), [cards]);
  const recommendations = useMemo(() => suggestRecommendations(cards), [cards]);
  const avgCMC = useMemo(() => averageCmc(cards), [cards]);
  const planText = useMemo(() => buildPlanText(cards), [cards]);
  const gamePhases = useMemo(() => buildGamePhases(cards), [cards]);
  const unknownCmc = useMemo(() => unknownCmcCount(cards), [cards]);
  const relevantCombos = useMemo(() => combos
    .filter(c => c.present.length > 0 || c.complete)
    .sort((a, b) => Number(b.complete) - Number(a.complete) || b.present.length - a.present.length), [combos]);
  const includedCombos = useMemo(() => {
    const source = spellbookHasFetched ? spellbookIncludedCombos : combos;
    return source
      .filter(c => c.complete && c.pieces.length >= 2 && c.pieces.length <= 3)
      .sort((a, b) => a.pieces.length - b.pieces.length || a.name.localeCompare(b.name));
  }, [combos, spellbookIncludedCombos, spellbookHasFetched]);
  const almostCombos = useMemo(() => {
    const source = spellbookHasFetched ? spellbookAlmostCombos : combos;
    const hasCommander = !!commander;
    return source
      .filter(c => !c.complete && c.pieces.length >= 2 && c.pieces.length <= 3 && c.missing.length === 1 && c.present.length >= c.pieces.length - 1)
      .filter(c => (c.missing || []).every(name => isSuggestionAllowedForCommander(name, suggestionCardData, deckAllowedColors, hasCommander)))
      .sort((a, b) => a.missing.length - b.missing.length || b.present.length - a.present.length || a.name.localeCompare(b.name));
  }, [combos, spellbookAlmostCombos, spellbookHasFetched, suggestionCardData, deckAllowedColors, commander]);
  const comboSource = comboView === "included" ? includedCombos : almostCombos;
  const twoCardComboCount = comboSource.filter(c => c.pieces.length === 2).length;
  const threeCardComboCount = comboSource.filter(c => c.pieces.length === 3).length;
  const displayedCombos = comboSource.filter(c => comboSizeFilter === "all" || c.pieces.length === Number(comboSizeFilter));
  const autoAddRecommendations = useMemo(() => {
    const owned = new Set(cards.map(c => normalizeName(c.name)));
    const out = [];
    const push = (name, area, reason) => {
      const clean = String(name || "").trim();
      if (!clean || owned.has(normalizeName(clean))) return;
      if (out.some(x => normalizeName(x.name) === normalizeName(clean))) return;
      out.push({ name: clean, area, reason });
    };

    for (const rec of recommendations) {
      for (const option of rec.options || []) {
        if (String(option).toLowerCase().includes("cycle")) continue;
        push(option, rec.area, rec.reason);
      }
    }

    for (const combo of almostCombos.slice(0, 30)) {
      for (const missing of combo.missing || []) {
        push(missing, "Completar combo", `Completa la línea: ${combo.name}`);
      }
    }

    return out.slice(0, 18);
  }, [cards, recommendations, almostCombos]);
  const visibleAutoAddRecommendations = useMemo(() => {
    const hasCommander = !!commander;
    return autoAddRecommendations.filter(suggestion => isSuggestionAllowedForCommander(suggestion.name, suggestionCardData, deckAllowedColors, hasCommander));
  }, [autoAddRecommendations, suggestionCardData, deckAllowedColors, commander]);
  const synergyLines = useMemo(() => detectSynergyLines(cards), [cards]);
  const strengths = useMemo(() => generateStrengths(cards), [cards]);
  const weaknesses = useMemo(() => generateWeaknesses(cards), [cards]);
  const cutCandidates = useMemo(() => getCutCandidates(cards, 10), [cards]);
  const manaStats = useMemo(() => getManaStats(), [cards]);
  const colorCurveGroups = useMemo(() => getColorCurveGroups(), [cards]);
  const tokensAndExtras = useMemo(() => detectTokensAndExtras(), [cards]);
  const allTypes = useMemo(() => ["Todos", ...new Set(cards.map(c => c.type).filter(Boolean))], [cards]);
  const allRoles = useMemo(() => ["Todos", ...new Set(cards.flatMap(c => getEffectiveRoles(c)).filter(Boolean))].sort((a, b) => a === "Todos" ? -1 : b === "Todos" ? 1 : a.localeCompare(b)), [cards]);
  const filteredCards = useMemo(() => {
    let base = filterCards(cards, activeFilter);
    if (typeFilter !== "Todos") base = base.filter(c => c.type === typeFilter);
    if (roleFilter !== "Todos") base = base.filter(c => getEffectiveRoles(c).includes(roleFilter));
    if (cardSearch.trim()) {
      const q = normalizeName(cardSearch);
      base = base.filter(c => normalizeName(c.name).includes(q));
    }
    return base;
  }, [cards, activeFilter, cardSearch, typeFilter, roleFilter]);

  const tabs = [
    { id: "home", label: "🏠 Inicio" },
    { id: "decks", label: "📚 Decks" },
    { id: "input", label: "🧾 Input" },
    { id: "overview", label: "📊 Overview" },
    { id: "deckview", label: "🗂️ Deck" },
    { id: "stats", label: "📈 Stats" },
    { id: "extras", label: "🧪 Extras" },
    { id: "bracket", label: "🏷️ Bracket" },
    { id: "combos", label: "🧩 Combos" },
    { id: "analysis", label: "🔬 Análisis" },
    { id: "recommendations", label: "🔧 Mejoras" },
    { id: "swap", label: "🔁 Meter cartas" },
    { id: "cards", label: "🖼️ Cartas" },
  ];

  const isLightTheme = theme === "light";
  const bg = isLightTheme ? {
    page: "linear-gradient(160deg, #eef8ef 0%, #f8fafc 45%, #ecfeff 100%)",
    card: "rgba(255,255,255,0.86)",
    cardBorder: "rgba(20,83,45,0.18)",
    text: "#102016",
    muted: "#64748b",
    header: "linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(236,253,245,0.92) 55%, rgba(219,234,254,0.88) 100%)",
    nav: "rgba(255,255,255,0.78)",
    navText: "#0f172a",
    panel: "rgba(255,255,255,0.72)",
    input: "#ffffff",
    heroText: "#0f172a",
    shadow: "0 18px 60px rgba(15,23,42,0.10)",
  } : {
    page: "radial-gradient(circle at 20% 0%, rgba(34,197,94,0.16) 0%, transparent 28%), radial-gradient(circle at 80% 15%, rgba(59,130,246,0.12) 0%, transparent 25%), linear-gradient(160deg, #030806 0%, #071407 52%, #05070c 100%)",
    card: "rgba(12,24,12,0.86)",
    cardBorder: "rgba(34,197,94,0.18)",
    text: "#e2f0e2",
    muted: "#94a3b8",
    header: "linear-gradient(135deg, rgba(13,43,20,0.92) 0%, rgba(13,26,43,0.92) 100%)",
    nav: "rgba(3,10,6,0.72)",
    navText: "#e2f0e2",
    panel: "rgba(5,13,5,0.72)",
    input: "#050d05",
    heroText: "#ffffff",
    shadow: "0 18px 70px rgba(0,0,0,0.35)",
  };

  useEffect(() => {
    setSavedDecks(safeLoadSavedDecks());
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem("commanderDeckAnalyzer.theme.v1", theme); } catch {}
  }, [theme]);

  useEffect(() => {
    if (!deckName && commander?.name) setDeckName(commander.name);
  }, [commander, deckName]);

  useEffect(() => {
    let cancelled = false;
    async function loadSuggestionImages() {
      const wanted = [...autoAddRecommendations.map(x => x.name), ...selectedWantedCards].slice(0, 36);
      for (const name of wanted) {
        const key = normalizeName(name);
        if (!key || suggestionCardData[key]) continue;
        try {
          const data = await fetchScryfallCard(name);
          const scry = scryToCardData(data);
          if (!cancelled) {
            setSuggestionCardData(prev => ({ ...prev, [key]: { name: scry.name || name, image: scry.image, smallImage: scry.smallImage, typeLine: scry.typeLine, manaCost: scry.manaCost, colorIdentity: scry.colorIdentity || [], price: scry.price } }));
          }
          await sleep(35);
        } catch {
          if (!cancelled) setSuggestionCardData(prev => ({ ...prev, [key]: { name, image: "", smallImage: "", typeLine: "", colorIdentity: null, notFound: true } }));
        }
      }
    }
    if (autoAddRecommendations.length || selectedWantedCards.length) loadSuggestionImages();
    return () => { cancelled = true; };
  }, [autoAddRecommendations, selectedWantedCards]);

  async function enrichCardsList(inputCards) {
    if (!inputCards.length) return inputCards;
    setLoading(true);
    const next = [...inputCards];
    let failedLoads = 0;
    setCards([...next]);
    for (let i = 0; i < next.length; i++) {
      setLoadStatus(`Cargando Scryfall ${i + 1}/${next.length}: ${next[i].name}`);
      try {
        const data = await fetchScryfallCard(next[i]);
        const scry = scryToCardData(data);
        const relatedTokens = await fetchRelatedTokenDetails(data);
        const enriched = { ...next[i], ...scry, relatedTokens };
        enriched.type = inferTypeFromScryfall(enriched);
        enriched.roles = detectRoles(enriched);
        next[i] = enriched;
      } catch {
        failedLoads += 1;
        next[i] = { ...next[i], notFound: true };
      }
      setCards([...next]);
      await sleep(90);
    }
    setLoadStatus(failedLoads ? `Datos Scryfall cargados con ${failedLoads} carta(s) sin encontrar. Revisá nombres, edición o collector number.` : "Datos Scryfall cargados correctamente.");
    setLoading(false);
    return next;
  }

  async function analyzeDeck() {
    const parsed = parseDecklist(deckText).map(c => ({ ...c, roles: detectRoles(c) }));
    const detectedCommander = getCommander(parsed);
    setActiveFilter(null);
    setCardSearch("");
    setTypeFilter("Todos");
    setRoleFilter("Todos");
    setSpellbookIncludedCombos([]);
    setSpellbookAlmostCombos([]);
    setSpellbookHasFetched(false);
    setSpellbookStatus("Pendiente de consultar Commander Spellbook");
    if (!deckName.trim()) setDeckName(detectedCommander?.name || "Mazo sin nombre");
    setCards(parsed);
    setTab("overview");
    const enriched = await enrichCardsList(parsed);
    await refreshSpellbookCombos(enriched);
  }

  function saveCurrentDeck() {
    if (!cards.length) {
      setSaveStatus("Primero analizá una decklist.");
      return;
    }
    const now = new Date().toISOString();
    const name = deckName.trim() || commander?.name || "Mazo sin nombre";
    const record = {
      id: `${Date.now()}`,
      name,
      commanderName: commander?.name || "Comandante no detectado",
      deckText,
      cards: cards.map(compactCardForStorage),
      savedAt: now,
      updatedAt: now,
      summary: {
        totalCards,
        landsCount,
        avgCMC,
        overall: scores.overall,
        price: totalDeckPrice,
        bracket: bracket.bracket,
        bracketLabel: bracket.shortLabel,
        archetypes: archetypes.map(a => a.name),
        commanderImage: commander?.image || commander?.smallImage || "",
        combos: relevantCombos.filter(c => c.complete).length,
        totalPrice: totalDeckPrice,
        pricedCardsCount,
      },
    };

    const existing = safeLoadSavedDecks();
    const sameNameIndex = existing.findIndex(d => normalizeName(d.name) === normalizeName(name));
    let next;
    if (sameNameIndex >= 0) {
      next = [...existing];
      next[sameNameIndex] = { ...record, id: next[sameNameIndex].id, savedAt: next[sameNameIndex].savedAt, updatedAt: now };
      setSaveStatus(`Actualizado: ${name}`);
    } else {
      next = [record, ...existing];
      setSaveStatus(`Guardado: ${name}`);
    }

    const ok = safeSaveSavedDecks(next);
    if (ok) setSavedDecks(next);
    else setSaveStatus("No se pudo guardar. LocalStorage lleno o bloqueado.");
  }

  function loadSavedDeck(deck) {
    setDeckName(deck.name || "");
    setDeckText(deck.deckText || "");
    setCards((deck.cards || []).map(c => ({ ...c, roles: detectRoles(c) })));
    setActiveFilter(null);
    setCardSearch("");
    setTypeFilter("Todos");
    setRoleFilter("Todos");
    setSaveStatus(`Cargado: ${deck.name}`);
    setTab("overview");
  }

  function deleteSavedDeck(id) {
    const next = savedDecks.filter(d => d.id !== id);
    if (safeSaveSavedDecks(next)) {
      setSavedDecks(next);
      setSaveStatus("Deck eliminado.");
    }
  }

  function exportSavedDeck(deck) {
    const payload = JSON.stringify(deck, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(deck.name || "deck").replace(/[^a-z0-9]+/gi, "_")}_analysis.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function resetAnalyzer() {
    setDeckText(STARTING_TEXT);
    setCards([]);
    setLoading(false);
    setLoadStatus("Nuevo análisis listo. Pegá una decklist para empezar.");
    setWantedCards("");
    setWantedSearch("");
    setWantedSuggestions([]);
    setSelectedWantedCards([]);
    setWantedSearchStatus("");
    setActiveFilter(null);
    setCardSearch("");
    setTypeFilter("Todos");
    setRoleFilter("Todos");
    setDeckName("");
    setSaveStatus("");
    setReportStatus("");
    setSpellbookIncludedCombos([]);
    setSpellbookAlmostCombos([]);
    setSpellbookHasFetched(false);
    setSpellbookStatus("Sin consultar Commander Spellbook");
    setSelectedDiagnostic(null);
    setComboSizeFilter("all");
    setSuggestionCardData({});
    setPreviewCard(null);
    setTab("input");
  }

  function generateReportText() {
    if (!cards.length) return "Pegá y analizá una decklist para generar un reporte.";
    const topStrengths = strengths.slice(0, 4).map(x => `- ${x.title}: ${x.text}`).join(String.fromCharCode(10));
    const topWeaknesses = weaknesses.slice(0, 4).map(x => `- ${x.title}: ${x.text}`).join(String.fromCharCode(10));
    const topRecs = recommendations.slice(0, 5).map(x => `- ${x.area}: ${x.card} (${x.priority})`).join(String.fromCharCode(10));
    const completeCombos = includedCombos.slice(0, 6).map(x => `- ${x.name}`).join(String.fromCharCode(10)) || "- No se detectaron combos completos de 2/3 cartas.";
    return [
      `Commander Deck Analyzer — Reporte`,
      `Comandante: ${commander?.name || "No detectado"}`,
      `Cartas: ${totalCards} · Tierras: ${landsCount} · CMC prom.: ${avgCMC}`,
      `Arquetipo: ${archetypes[0]?.name || "No detectado"}`,
      `Overall: ${scores.overall}/10`,
      `Bracket estimado: ${bracket.bracket} (${bracket.shortLabel})`,
      "",
      "Plan de juego:",
      planText,
      "",
      "Fortalezas:",
      topStrengths || "- Sin fortalezas claras detectadas.",
      "",
      "Debilidades:",
      topWeaknesses || "- Sin debilidades críticas detectadas.",
      "",
      "Combos incluidos:",
      completeCombos,
      "",
      "Recomendaciones:",
      topRecs || "- Sin recomendaciones críticas.",
      "",
      "Nota: bracket y score son estimaciones automáticas; conviene confirmar expectativas con la mesa antes de jugar."
    ].join(String.fromCharCode(10));
  }

  async function copyReportToClipboard() {
    const text = generateReportText();
    try {
      await navigator.clipboard.writeText(text);
      setReportStatus("Reporte copiado al portapapeles.");
    } catch {
      setReportStatus("No se pudo copiar automáticamente. Seleccioná y copiá manualmente desde el navegador.");
    }
  }

  function getDeckViewPrimaryRole(card) {
    if (card.type === "Commander") return "Commander";
    if (card.type === "Tierras") return "Land";
    const roles = getEffectiveRoles(card);
    const priority = ["Ramp", "Draw", "Removal", "Board Wipe", "Counterspell", "Protection", "Tutor", "Combo", "Finisher", "Tokens", "Sac Outlet", "Drain", "Lifegain", "Recursion", "Reanimator", "Untap", "Evasion", "Counters", "Blink", "ETB", "Artifacts", "Enchantress", "Voltron", "Equipment", "Tribal", "Stax", "Goad"];
    return priority.find(r => roles.includes(r)) || roles[0] || card.type || "Other";
  }

  function getDeckViewGroup(card) {
    if (deckViewGroupBy === "type") return card.type || "Otros";
    if (deckViewGroupBy === "role") return getDeckViewPrimaryRole(card);
    if (deckViewGroupBy === "cmc") {
      const bucket = getCmcBucket(card);
      return card.type === "Tierras" ? "Land" : bucket ? `MV ${bucket}` : "MV ?";
    }
    if (deckViewGroupBy === "color") {
      const ci = card.colorIdentity || [];
      if (card.type === "Tierras") return "Land";
      if (!ci.length) return "Colorless";
      return ci.join("");
    }
    return "Other";
  }

  function sortDeckViewCards(list) {
    return [...list].sort((a, b) => {
      if (deckViewSortBy === "name") return a.name.localeCompare(b.name);
      if (deckViewSortBy === "cmc") return (a.cmc ?? 99) - (b.cmc ?? 99) || a.name.localeCompare(b.name);
      if (deckViewSortBy === "price") return (Number(b.price) || 0) - (Number(a.price) || 0) || a.name.localeCompare(b.name);
      if (deckViewSortBy === "qty") return b.qty - a.qty || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
  }

  function getDeckViewGroups() {
    const q = normalizeName(deckViewSearch);
    const filtered = cards.filter(c => !q || normalizeName(c.name).includes(q));
    const groups = new Map();
    for (const card of filtered) {
      const group = getDeckViewGroup(card);
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(card);
    }
    const preferredOrder = ["Commander", "Ramp", "Draw", "Removal", "Board Wipe", "Counterspell", "Protection", "Tutor", "Combo", "Finisher", "Creature Combo", "Tokens", "Sac Outlet", "Drain", "Lifegain", "Recursion", "Reanimator", "Untap", "Evasion", "Counters", "Blink", "ETB", "Artifacts", "Enchantress", "Voltron", "Equipment", "Tribal", "Criaturas", "Artefactos", "Encantamientos", "Instantáneos", "Sortilegios", "Planeswalker", "Land", "Tierras", "Colorless", "W", "U", "B", "R", "G", "WU", "UB", "BR", "RG", "GW", "WB", "UR", "BG", "RW", "GU", "WUBRG", "Other", "Otros"];
    return [...groups.entries()]
      .map(([name, groupCards]) => {
        const sortedCards = sortDeckViewCards(groupCards);
        const qty = groupCards.reduce((a, c) => a + c.qty, 0);
        const price = groupCards.reduce((a, c) => a + (Number(c.price) || 0) * c.qty, 0);
        return { name, cards: sortedCards, qty, price };
      })
      .sort((a, b) => {
        const ai = preferredOrder.indexOf(a.name);
        const bi = preferredOrder.indexOf(b.name);
        if (ai >= 0 || bi >= 0) return (ai >= 0 ? ai : 999) - (bi >= 0 ? bi : 999);
        return a.name.localeCompare(b.name);
      });
  }

  function countManaSymbolsInText(text) {
    const out = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
    const source = String(text || "").toUpperCase();
    for (const k of Object.keys(out)) {
      const direct = source.match(new RegExp("\\{" + k + "\\}", "g")) || [];
      const hybrid = source.match(new RegExp("\\{[^}]*" + k + "[^}]*\\}", "g")) || [];
      out[k] += direct.length + Math.max(0, hybrid.length - direct.length);
    }
    return out;
  }

  function getManaStats() {
    const colors = ["W", "U", "B", "R", "G", "C"];
    const cost = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
    const production = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
    let totalManaValue = 0;
    let countedSpells = 0;

    for (const card of cards) {
      if (card.type !== "Tierras" && card.type !== "Commander") {
        const pips = countManaSymbolsInText(card.manaCost);
        colors.forEach(c => cost[c] += pips[c] * card.qty);
        if (typeof card.cmc === "number") {
          totalManaValue += card.cmc * card.qty;
          countedSpells += card.qty;
        }
      }

      const oracle = `${card.oracle || ""} ${card.typeLine || ""}`;
      const prod = countManaSymbolsInText(oracle);
      colors.forEach(c => production[c] += prod[c] * card.qty);
      if (card.type === "Tierras") {
        const ci = card.colorIdentity || [];
        if (ci.length) ci.forEach(c => { if (production[c] !== undefined) production[c] += card.qty; });
        else production.C += card.qty;
      }
    }

    const totalCost = colors.reduce((a, c) => a + cost[c], 0) || 1;
    const totalProduction = colors.reduce((a, c) => a + production[c], 0) || 1;
    return {
      colors,
      cost,
      production,
      totalCost,
      totalProduction,
      totalManaValue,
      avgManaValue: countedSpells ? (totalManaValue / countedSpells).toFixed(2) : "?",
    };
  }

  function getColorCurveGroups() {
    const colors = [
      { key: "W", label: "White Spells" },
      { key: "U", label: "Blue Spells" },
      { key: "B", label: "Black Spells" },
      { key: "R", label: "Red Spells" },
      { key: "G", label: "Green Spells" },
      { key: "C", label: "Colorless Spells" },
    ];
    return colors.map(color => {
      const buckets = new Map([["0", 0], ["1", 0], ["2", 0], ["3", 0], ["4", 0], ["5", 0], ["6", 0], ["7", 0], ["8+", 0]]);
      for (const card of cards) {
        if (card.type === "Tierras" || card.type === "Commander") continue;
        const ci = card.colorIdentity || [];
        const isColorless = !ci.length;
        const matches = color.key === "C" ? isColorless : ci.includes(color.key);
        if (!matches) continue;
        const cmc = typeof card.cmc === "number" ? card.cmc : null;
        if (cmc === null) continue;
        const bucket = cmc >= 8 ? "8+" : String(cmc);
        buckets.set(bucket, buckets.get(bucket) + card.qty);
      }
      return { ...color, data: [...buckets.entries()].map(([cmc, count]) => ({ cmc, count })) };
    });
  }

  function detectTokensAndExtras() {
    const found = new Map();
    const extras = [];

    const titleCase = value => String(value || "")
      .split(" ")
      .filter(Boolean)
      .map(x => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase())
      .join(" ");

    const badTokenNames = new Set(["of", "s", "number", "number of", "number of treasure", "s treasure", "token", "tokens", "a", "an", "the", "x"]);

    const cleanTokenDisplayName = (rawName, typeLine = "") => {
      let name = normalizeTokenName(rawName, typeLine);
      name = String(name || "").replace(/\s+/g, " ").trim();
      const low = normalizeName(name);
      if (!name || name.length < 2 || name.length > 60) return "";
      if (badTokenNames.has(low)) return "";
      if (/^[a-z]$/i.test(name)) return "";
      if (low.startsWith("number of ")) return "Treasure";
      return titleCase(name);
    };

    const addToken = (rawName, sourceCard, tokenData = {}) => {
      const name = cleanTokenDisplayName(rawName, tokenData.typeLine || "");
      if (!name) return;
      if (!found.has(name)) {
        found.set(name, {
          name,
          sources: new Set(),
          sourceDetails: [],
          image: tokenData.image || "",
          smallImage: tokenData.smallImage || tokenData.image || "",
          typeLine: tokenData.typeLine || "Token",
          oracle: tokenData.oracle || "",
        });
      }
      const entry = found.get(name);
      entry.sources.add(sourceCard.name);
      if (!entry.image && tokenData.image) entry.image = tokenData.image;
      if (!entry.smallImage && (tokenData.smallImage || tokenData.image)) entry.smallImage = tokenData.smallImage || tokenData.image;
      if ((!entry.typeLine || entry.typeLine === "Token") && tokenData.typeLine) entry.typeLine = tokenData.typeLine;
      if (!entry.oracle && tokenData.oracle) entry.oracle = tokenData.oracle;
      entry.sourceDetails.push({ name: sourceCard.name, image: sourceCard.smallImage || sourceCard.image || "" });
    };

    const knownTokens = [
      "Treasure", "Food", "Clue", "Blood", "Powerstone", "Map", "Junk", "Gold", "Shard",
      "Pest", "Snake", "Zombie", "Saproling", "Soldier", "Human Soldier", "Beast", "Spirit",
      "Elf", "Goblin", "Insect", "Servo", "Thopter", "Myr", "Eldrazi Spawn", "Eldrazi Scion",
      "Plant", "Wolf", "Cat", "Dog", "Rat", "Vampire", "Skeleton", "Phyrexian Germ",
      "Incubator", "Role", "Cursed Role", "Monster Role", "Royal Role", "Sorcerer Role", "Wicked Role", "Young Hero Role",
      "Dragon Illusion", "Phyrexian Goblin"
    ];

    const oracleMentionsKnownToken = (oracle, label) => {
      const low = normalizeName(label);
      const variants = [
        `${low} token`, `${low} tokens`,
        `${low} artifact token`, `${low} artifact tokens`,
        `${low} creature token`, `${low} creature tokens`,
        `${low} enchantment token`, `${low} enchantment tokens`,
      ];
      return variants.some(v => oracle.includes(v));
    };

    for (const card of cards) {
      // Fuente principal: Scryfall all_parts / related token. Esto evita inventar tokens raros.
      for (const token of card.relatedTokens || []) {
        addToken(token.name, card, token);
      }

      const oracle = normalizeName(card.oracle || "");
      if (oracle.includes("token")) {
        for (const label of knownTokens) {
          if (oracleMentionsKnownToken(oracle, label)) addToken(label, card);
        }
        if (oracle.includes("token that's a copy") || oracle.includes("token thats a copy") || oracle.includes("token copy") || oracle.includes("copy token") || oracle.includes("copy of target")) {
          addToken("Copy", card);
        }
      }

      if (oracle.includes("emblem") || oracle.includes("venture into the dungeon") || oracle.includes("initiative") || oracle.includes("monarch") || oracle.includes("the ring tempts you")) {
        extras.push(card.name);
      }
    }

    const tokens = [...found.values()].map(t => ({
      ...t,
      sources: [...t.sources],
      sourceDetails: t.sourceDetails.filter((x, i, arr) => arr.findIndex(y => y.name === x.name) === i),
    })).sort((a, b) => a.name.localeCompare(b.name));

    return { tokens, extras: [...new Set(extras)].sort() };
  }

  function openCardFilter(filter) {
    setActiveFilter(filter);
    setCardSearch("");
    setTypeFilter("Todos");
    setRoleFilter("Todos");
    setTab("cards");
  }

  function clearAllCardFilters() {
    setActiveFilter(null);
    setCardSearch("");
    setTypeFilter("Todos");
    setRoleFilter("Todos");
  }

  async function enrichScryfall() {
    if (!cards.length) return;
    const enriched = await enrichCardsList(cards);
    await refreshSpellbookCombos(enriched);
  }

  async function refreshSpellbookCombos(inputCards = cards) {
    if (!inputCards.length) return;
    setSpellbookLoading(true);
    setSpellbookStatus("Consultando Commander Spellbook...");
    try {
      const result = await fetchCommanderSpellbookCombosForCards(inputCards);
      setSpellbookIncludedCombos(result.included || []);
      setSpellbookAlmostCombos(result.almost || []);
      setSpellbookHasFetched(true);
      setSpellbookStatus(`${result.source || "Commander Spellbook"}: ${result.included?.length || 0} incluidos, ${result.almost?.length || 0} a 1 carta.`);
    } catch (err) {
      setSpellbookHasFetched(false);
      setSpellbookStatus(`No se pudo conectar con Commander Spellbook. Se está usando la base local reducida. ${err?.message || ""}`);
    } finally {
      setSpellbookLoading(false);
    }
  }

  async function searchWantedCard() {
    if (!wantedSearch.trim()) return;
    setWantedSearchStatus("Buscando en Scryfall...");
    try {
      const results = await fetchScryfallAutocomplete(wantedSearch);
      setWantedSuggestions(results.slice(0, 8));
      setWantedSearchStatus(results.length ? `${results.length} resultado(s)` : "Sin resultados");
    } catch {
      setWantedSearchStatus("No se pudo buscar. Escribila manualmente abajo.");
      setWantedSuggestions([]);
    }
  }

  function addWantedCard(name) {
    const clean = name.trim();
    if (!clean) return;
    setSelectedWantedCards(prev => prev.some(x => normalizeName(x) === normalizeName(clean)) ? prev : [...prev, clean]);
    setWantedSearch("");
    setWantedSuggestions([]);
    setWantedSearchStatus("");
  }

  function removeWantedCard(name) {
    setSelectedWantedCards(prev => prev.filter(x => normalizeName(x) !== normalizeName(name)));
  }

  function getDiagnosticDetail(subject) {
    const components = scores.components || {};
    const roleCount = role => getRoleCount(cards, role);
    const cardNamesForRoles = (roleList, limit = 10) => {
      const found = [];
      for (const card of cards) {
        const cardRoles = getEffectiveRoles(card);
        if (roleList.some(role => cardRoles.includes(role))) found.push(`${card.qty}x ${card.name}`);
      }
      return found.slice(0, limit);
    };
    const compact = detectCombos(cards).filter(c => c.complete && c.pieces.length <= 2);
    const archetype = detectArchetypes(cards)[0]?.name || "Value / Goodstuff";
    const details = {
      "Manabase": {
        title: "Manabase",
        goal: `Objetivo estimado: ${components.landTarget || "?"} tierras según curva/arquetipo`,
        why: `Tenés ${landsCount} tierras y CMC promedio ${avgCMC}. La app compara si la cantidad de tierras acompaña la curva del mazo.`,
        formula: "Puntúa mejor cuando la cantidad de tierras está cerca del objetivo. Penaliza si está demasiado baja o demasiado alta.",
        cards: cards.filter(c => c.type === "Tierras").slice(0, 12).map(c => `${c.qty}x ${c.name}`),
      },
      "Ramp": {
        title: "Ramp",
        goal: `Objetivo estimado: ${components.rampTarget || "?"} piezas de ramp`,
        why: `Se detectaron ${roleCount("Ramp")} piezas de ramp. El objetivo sube si el mazo es Big Mana o tiene curva alta.`,
        formula: "Ramp bajo baja consistencia; ramp suficiente permite ejecutar el plan antes y sostener costes altos.",
        cards: cardNamesForRoles(["Ramp"], 14),
      },
      "Card Draw": {
        title: "Card Draw",
        goal: `Objetivo estimado: ${components.drawTarget || "?"} fuentes de robo/ventaja`,
        why: `Se detectaron ${roleCount("Draw")} fuentes de draw. La app cuenta robo directo, clues/investigate y motores de ventaja.`,
        formula: "El score sube con fuentes repetibles o suficientes fuentes puntuales para no quedarte sin mano.",
        cards: cardNamesForRoles(["Draw"], 14),
      },
      "Interacción": {
        title: "Interacción",
        goal: `Objetivo estimado: ${components.interactionTarget || "?"} respuestas`,
        why: `Se detectaron ${roleCount("Removal") + roleCount("Counterspell") + roleCount("Board Wipe")} respuestas entre removal, counters y wipes.`,
        formula: "Mezcla removal puntual + algún wipe + respuestas flexibles. Penaliza si el mazo no puede frenar amenazas rivales.",
        cards: cardNamesForRoles(["Removal", "Counterspell", "Board Wipe"], 16),
      },
      "Win Cons": {
        title: "Win Cons",
        goal: "Objetivo estimado: 4-6 formas reales de cerrar partida, según arquetipo",
        why: `Se detectaron ${roleCount("Finisher")} finishers, ${roleCount("Drain")} piezas de drain y ${compact.length} combo(s) compacto(s).`,
        formula: "Cuenta finishers, drain real, combos compactos y cartas que convierten ventaja en victoria. No todo value cuenta como wincon.",
        cards: [...cardNamesForRoles(["Finisher", "Drain", "Combo"], 14), ...compact.map(c => `Combo: ${c.name}`)].slice(0, 16),
      },
      "Sinergia": {
        title: "Sinergia",
        goal: `Arquetipo principal detectado: ${archetype}`,
        why: `La app mira si los roles principales se refuerzan entre sí. Motores detectados: ${synergyLines.length}.`,
        formula: "Sube cuando hay densidad de piezas que trabajan juntas: tokens + sac outlet + drain, spellslinger + cantrips, counters + proliferate, etc.",
        cards: synergyLines.flatMap(line => [line.name, ...(line.pieces || [])]).slice(0, 16),
      },
      "Consistencia": {
        title: "Consistencia",
        goal: "Que el mazo repita su plan en varias partidas",
        why: `Se calcula con ramp (${roleCount("Ramp")}), draw (${roleCount("Draw")}), curva (${avgCMC}) y combos compactos (${compact.length}).`,
        formula: "Sube con ramp, draw, curva razonable, tutores o redundancia de piezas. Baja si depende demasiado de robar una sola carta.",
        cards: cardNamesForRoles(["Ramp", "Draw", "Tutor"], 16),
      },
      "Resiliencia": {
        title: "Resiliencia",
        goal: `Objetivo estimado: ${components.protectionTarget || "?"} protecciones si el comandante/motor es central`,
        why: `Se detectaron ${roleCount("Protection")} protecciones y ${roleCount("Recursion") + roleCount("Reanimator")} piezas de recursión/reanimación.`,
        formula: "Sube si puede proteger comandante, reconstruir tras wipe o recuperar piezas clave del cementerio.",
        cards: cardNamesForRoles(["Protection", "Recursion", "Reanimator"], 16),
      },
    };
    return details[subject] || details["Consistencia"];
  }

  function handleDeckFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setDeckText(String(reader.result || ""));
      setLoadStatus(`Archivo cargado: ${file.name}`);
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  const dashboardDecks = useMemo(() => savedDecks.slice(0, 8), [savedDecks]);
  const dashboardStats = useMemo(() => {
    const count = savedDecks.length;
    const avgOverall = count ? (savedDecks.reduce((a, d) => a + (Number(d.summary?.overall) || 0), 0) / count).toFixed(1) : "-";
    const maxBracket = count ? Math.max(...savedDecks.map(d => Number(d.summary?.bracket) || 0)) : "-";
    const latest = savedDecks[0]?.name || "Sin análisis guardados";
    return { count, avgOverall, maxBracket, latest };
  }, [savedDecks]);

  const heroImage = commander?.image || commander?.smallImage || savedDecks[0]?.summary?.commanderImage || "";

  const statCards = [
    { label: "Cartas", value: cards.length ? String(totalCards) : "-", icon: "🃏", color: "#4ade80", sub: totalCards === 100 ? "Commander legal" : totalCards ? `${totalCards > 100 ? "Sobran" : "Faltan"} ${Math.abs(totalCards - 100)}` : "Sin mazo" },
    { label: "CMC Prom.", value: avgCMC, icon: "⚡", color: "#fbbf24", sub: "calculado del mazo" },
    { label: "Tierras", value: cards.length ? String(landsCount) : "-", icon: "🌍", color: "#94a3b8", sub: landsCount < 34 ? "bajo" : landsCount <= 38 ? "correcto" : "alto" },
    { label: "Precio", value: cards.length ? formatMoney(totalDeckPrice) : "-", icon: "💶", color: "#facc15", sub: pricedCardsCount ? `${pricedCardsCount} cartas con precio` : "cargar Scryfall" },
    { label: "Arquetipo", value: archetypes[0]?.name?.split(" ")[0] || "-", icon: "🎭", color: "#a855f7", sub: archetypes[0]?.name || "no detectado" },
    { label: "Bracket", value: cards.length ? String(bracket.bracket) : "-", icon: "🏷️", color: "#ef4444", sub: bracket.label?.replace(/Bracket \d — /, "") || "-" },
    { label: "Overall", value: cards.length ? scores.overall : "-", icon: "⭐", color: "#f59e0b", sub: "/ 10 salud del mazo" },
  ];

  function handleStatCardClick(label) {
    if (!cards.length) {
      setTab("input");
      return;
    }
    if (label === "Cartas") {
      clearAllCardFilters();
      setTab("cards");
      return;
    }
    if (label === "CMC Prom.") {
      setTab("stats");
      return;
    }
    if (label === "Tierras") {
      openCardFilter({ kind: "type", value: "Tierras" });
      return;
    }
    if (label === "Precio") {
      setTab("stats");
      return;
    }
    if (label === "Precio") {
      setTab("stats");
      return;
    }
    if (label === "Arquetipo") {
      setTab("analysis");
      return;
    }
    if (label === "Bracket") {
      setTab("bracket");
      return;
    }
    if (label === "Overall") {
      setTab("analysis");
      return;
    }
  }

  function getStatCardHint(label) {
    const hints = {
      Cartas: "Ver galería completa de cartas",
      "CMC Prom.": "Ver estadísticas detalladas de curva y colores",
      Tierras: "Ver solo las tierras del mazo",
      Precio: "Ver precio total estimado y estadísticas",
      Arquetipo: "Ver análisis estratégico del arquetipo",
      Bracket: "Ver explicación completa del bracket",
      Overall: "Ver diagnóstico de salud del mazo",
    };
    return hints[label] || "Ver detalle";
  }

  return (
    <div style={{ background: bg.page, color: bg.text, fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", minHeight: "100vh", padding: "18px 16px", transition: "background 0.25s ease, color 0.25s ease" }}>
      <style>{`
        .da-shell { max-width: 1540px; margin: 0 auto; }
        .da-topbar { position: sticky; top: 10px; z-index: 80; backdrop-filter: blur(18px); }
        .da-card-hover { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
        .da-card-hover:hover { transform: translateY(-4px); box-shadow: 0 18px 42px rgba(34,197,94,.16); border-color: rgba(34,197,94,.55) !important; }
        .da-soft-button { transition: transform .15s ease, opacity .15s ease, border-color .15s ease; }
        .da-soft-button:hover { transform: translateY(-1px); opacity: .94; }
        @media (max-width: 900px) {
          .da-hero-grid { grid-template-columns: 1fr !important; }
          .da-dashboard-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .da-deck-grid { grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)) !important; }
        }
        @media (max-width: 620px) {
          .da-dashboard-grid { grid-template-columns: 1fr !important; }
          .da-topbar-inner { justify-content: center !important; }
        }
      `}</style>
      <div className="da-shell">
        <div className="da-topbar" style={{ background: bg.nav, border: `1px solid ${bg.cardBorder}`, borderRadius: 18, boxShadow: bg.shadow, padding: 10, marginBottom: 16 }}>
          <div className="da-topbar-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => setTab("home")} className="da-soft-button" style={{ background: "transparent", color: bg.navText, border: "none", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontWeight: 900, fontSize: 18 }}>
              <span style={{ width: 34, height: 34, borderRadius: 12, background: "linear-gradient(135deg,#22c55e,#38bdf8)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#061006", boxShadow: "0 0 22px rgba(34,197,94,.28)" }}>✦</span>
              DeckForge Analyzer
            </button>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              {[
                ["home", "Inicio"],
                ["decks", "Mis decks"],
                ["input", "Deck Analyzer"],
                ["combos", "Combos"],
                ["recommendations", "Mejoras"],
              ].map(([id, label]) => (
                <button key={id} onClick={() => setTab(id)} className="da-soft-button" style={{ background: tab === id ? "linear-gradient(135deg,#16a34a,#0ea5e9)" : bg.panel, color: tab === id ? "#fff" : bg.navText, border: `1px solid ${tab === id ? "rgba(255,255,255,.22)" : bg.cardBorder}`, borderRadius: 999, padding: "8px 12px", cursor: "pointer", fontWeight: 800, fontSize: 13 }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={resetAnalyzer} className="da-soft-button" style={{ background: "#16a34a", color: "#fff", border: "1px solid rgba(255,255,255,.2)", borderRadius: 999, padding: "8px 13px", cursor: "pointer", fontWeight: 900 }}>+ Nuevo análisis</button>
              <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="da-soft-button" style={{ background: bg.panel, color: bg.navText, border: `1px solid ${bg.cardBorder}`, borderRadius: 999, padding: "8px 12px", cursor: "pointer", fontWeight: 900 }}>
                {theme === "dark" ? "☀️ Día" : "🌙 Noche"}
              </button>
            </div>
          </div>
        </div>
      <style>{`
        .stat-card-clickable { transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease, background .18s ease; }
        .stat-card-clickable:hover { transform: translateY(-2px); border-color: rgba(34,197,94,.85) !important; box-shadow: 0 0 30px rgba(34,197,94,.16) !important; background: #0f1f0f !important; }
        .deck-stack-card { transition: transform .18s ease, filter .18s ease; }
        .deck-stack-card:hover { transform: translateY(-12px) scale(1.035); z-index: 999 !important; filter: drop-shadow(0 0 18px rgba(34,197,94,.34)); }
        .card-preview-flyout { animation: previewIn .12s ease-out; }
        @keyframes previewIn { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
        .deck-column-scroll::-webkit-scrollbar { height: 10px; width: 10px; }
        .deck-column-scroll::-webkit-scrollbar-thumb { background: #14532d; border-radius: 999px; }
        .deck-column-scroll::-webkit-scrollbar-track { background: #020802; border-radius: 999px; }
        @media (max-width: 900px) {
          .main-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .input-grid { grid-template-columns: 1fr !important; }
          .header-score-box { min-width: 92px !important; padding: 12px 14px !important; }
          .header-score-box div:first-child { font-size: 32px !important; }
        }
      `}</style>
      <div style={{ display: tab === "home" ? "none" : "flex", background: bg.header, borderRadius: 16, padding: "24px 28px", marginBottom: 20, border: "1px solid #22c55e44", boxShadow: "0 0 60px rgba(34,197,94,0.12), 0 0 0 1px #0a3a0a inset", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", minWidth: 0 }}>
          {commander?.smallImage || commander?.image ? (
            <div style={{ width: 82, height: 114, borderRadius: 10, overflow: "hidden", border: "1px solid #22c55e66", boxShadow: "0 0 28px rgba(34,197,94,0.22)", flex: "0 0 auto", background: "#020802" }}>
              <img src={commander.smallImage || commander.image} alt={commander.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ) : null}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10, color: "#4ade80", letterSpacing: 4, textTransform: "uppercase", marginBottom: 6, fontFamily: "monospace" }}>
              Commander · Universal Deck Analyzer · EDH
            </div>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, color: "#fff", fontFamily: "'Georgia', serif", letterSpacing: -0.5 }}>
              {commander ? `🌿 ${commander.name}` : "⚔️ Commander Deck Analyzer"}
            </h1>
            <div style={{ color: "#86efac", marginTop: 6, fontSize: 13, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(archetypes.length ? archetypes : [{ name: "Pega una decklist", score: 0 }]).map(a => <Tag key={a.name} label={`${a.name}${a.score ? ` · ${a.score}` : ""}`} />)}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "stretch" }}>
          {cards.length > 0 && (
            <div style={{ background: "rgba(0,0,0,0.45)", borderRadius: 14, padding: "12px 14px", border: "1px solid #14532d", minWidth: 220 }}>
              <div style={{ color: "#86efac", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Guardar análisis</div>
              <input
                value={deckName}
                onChange={e => setDeckName(e.target.value)}
                placeholder="Nombre del deck"
                style={{ width: "100%", boxSizing: "border-box", background: "#050d05", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 8, padding: "7px 9px", outline: "none", marginBottom: 8 }}
              />
              <button onClick={saveCurrentDeck} style={{ width: "100%", background: "#14532d", color: "#86efac", border: "1px solid #22c55e", borderRadius: 8, padding: "7px 10px", cursor: "pointer", fontWeight: 800 }}>
                Guardar deck
              </button>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 7 }}>
                <button onClick={copyReportToClipboard} style={{ background: "#0d2b14", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 8, padding: "7px 8px", cursor: "pointer", fontSize: 11, fontWeight: 800 }}>Copiar reporte</button>
                <button onClick={resetAnalyzer} style={{ background: "#2a160a", color: "#fed7aa", border: "1px solid #7c2d12", borderRadius: 8, padding: "7px 8px", cursor: "pointer", fontSize: 11, fontWeight: 800 }}>Nuevo análisis</button>
              </div>
              {saveStatus && <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 6 }}>{saveStatus}</div>}
              {reportStatus && <div style={{ color: "#86efac", fontSize: 11, marginTop: 4 }}>{reportStatus}</div>}
            </div>
          )}
          <div className="stat-card-clickable header-score-box" onClick={() => handleStatCardClick("Overall")} title="Ver diagnóstico completo del overall" style={{ background: "rgba(0,0,0,0.5)", borderRadius: 14, padding: "14px 24px", textAlign: "center", border: "2px solid #f59e0b55", cursor: "pointer" }}>
            <div style={{ fontSize: 42, fontWeight: 900, color: "#f59e0b", lineHeight: 1, fontFamily: "monospace" }}>{cards.length ? scores.overall : "-"}</div>
            <div style={{ fontSize: 10, color: "#fbbf24", marginTop: 4, letterSpacing: 2, textTransform: "uppercase" }}>Overall /10</div>
          </div>
          <div className="stat-card-clickable header-score-box" onClick={() => handleStatCardClick("Bracket")} title="Ver explicación completa del bracket" style={{ background: "rgba(0,0,0,0.5)", borderRadius: 14, padding: "14px 24px", textAlign: "center", border: "2px solid #22c55e55", cursor: "pointer" }}>
            <div style={{ fontSize: 42, fontWeight: 900, color: "#4ade80", lineHeight: 1, fontFamily: "monospace" }}>{cards.length ? bracket.bracket : "-"}</div>
            <div style={{ fontSize: 10, color: "#86efac", marginTop: 4, letterSpacing: 2, textTransform: "uppercase" }}>Bracket</div>
          </div>
        </div>
      </div>

      <div className="main-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 20 }}>
        {statCards.map(s => (
          <div key={s.label} className="stat-card-clickable" onClick={() => handleStatCardClick(s.label)} title={getStatCardHint(s.label)} style={{ background: bg.card, border: `1px solid ${s.color}22`, borderRadius: 12, padding: "14px 10px", textAlign: "center", boxShadow: `0 0 20px ${s.color}08`, cursor: "pointer", userSelect: "none" }}>
            <div style={{ fontSize: 22 }}>{s.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: s.color, lineHeight: 1.2, fontFamily: "monospace" }}>{s.value}</div>
            <div style={{ fontSize: 10, color: bg.muted, marginTop: 3, letterSpacing: 0.5, textTransform: "uppercase" }}>{s.label}</div>
            <div style={{ fontSize: 9, color: "#374151", marginTop: 2 }}>{s.sub}</div>
            <div style={{ fontSize: 9, color: "#14532d", marginTop: 5, fontWeight: 900 }}>Ver detalle →</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ background: tab === t.id ? "#14532d" : "#0c180c", color: tab === t.id ? "#4ade80" : "#6b7280", border: `1px solid ${tab === t.id ? "#22c55e" : "#1a2e1a"}`, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: tab === t.id ? 700 : 400, transition: "all 0.2s", fontFamily: "inherit" }}>{t.label}</button>
        ))}
      </div>

      {tab === "home" && (
        <div style={{ display: "grid", gap: 18 }}>
          <section className="da-hero-grid" style={{ position: "relative", overflow: "hidden", display: "grid", gridTemplateColumns: "1.25fr .75fr", gap: 18, background: bg.header, border: `1px solid ${bg.cardBorder}`, borderRadius: 28, padding: 28, boxShadow: bg.shadow }}>
            {heroImage && <img src={heroImage} alt="Commander art" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: isLightTheme ? 0.10 : 0.16, filter: "blur(2px) saturate(1.15)", pointerEvents: "none" }} />}
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "inline-flex", gap: 8, alignItems: "center", background: isLightTheme ? "rgba(22,163,74,.10)" : "rgba(34,197,94,.12)", border: "1px solid rgba(34,197,94,.32)", color: "#22c55e", borderRadius: 999, padding: "7px 12px", fontWeight: 900, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase" }}>Commander · EDH · Deck Intelligence</div>
              <h1 style={{ color: bg.heroText, fontSize: "clamp(36px, 6vw, 76px)", lineHeight: .95, letterSpacing: -2.2, margin: "18px 0 12px", fontWeight: 950 }}>
                Analizá tu mazo como si fuera una review premium.
              </h1>
              <p style={{ color: bg.muted, maxWidth: 760, fontSize: 18, lineHeight: 1.65, margin: 0 }}>
                Pegá una decklist de Archidekt, Moxfield o Manabox y obtené bracket, overall, combos, tokens, cartas a meter, cortes sugeridos, precio estimado y un reporte compartible.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
                <button onClick={() => setTab("input")} className="da-soft-button" style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)", color: "#fff", border: "none", borderRadius: 14, padding: "13px 18px", fontWeight: 950, cursor: "pointer", boxShadow: "0 12px 34px rgba(34,197,94,.22)" }}>Ir al Deck Analyzer</button>
                <button onClick={() => setTab("decks")} className="da-soft-button" style={{ background: bg.panel, color: bg.navText, border: `1px solid ${bg.cardBorder}`, borderRadius: 14, padding: "13px 18px", fontWeight: 950, cursor: "pointer" }}>Ver mis análisis</button>
                <button onClick={resetAnalyzer} className="da-soft-button" style={{ background: "transparent", color: "#22c55e", border: "1px solid rgba(34,197,94,.42)", borderRadius: 14, padding: "13px 18px", fontWeight: 950, cursor: "pointer" }}>Nuevo análisis limpio</button>
              </div>
            </div>
            <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 12, alignContent: "center" }}>
              {[
                ["Análisis guardados", dashboardStats.count, "📚"],
                ["Overall promedio", dashboardStats.avgOverall, "⭐"],
                ["Bracket máximo", dashboardStats.maxBracket, "🏷️"],
                ["Último deck", dashboardStats.latest, "🕘"],
              ].map(([label, value, icon]) => (
                <div key={label} className="da-card-hover" style={{ background: bg.panel, border: `1px solid ${bg.cardBorder}`, borderRadius: 18, padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 24 }}>{icon}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: bg.muted, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: .8 }}>{label}</div>
                    <div style={{ color: bg.heroText, fontSize: String(value).length > 18 ? 16 : 26, fontWeight: 950, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0, color: bg.heroText, fontSize: 28 }}>Mis análisis recientes</h2>
                <p style={{ margin: "6px 0 0", color: bg.muted }}>Tus decks guardados aparecen como biblioteca visual. Después podemos llevar esto a usuarios reales con Supabase.</p>
              </div>
              <button onClick={() => setTab("decks")} className="da-soft-button" style={{ background: bg.panel, color: bg.navText, border: `1px solid ${bg.cardBorder}`, borderRadius: 12, padding: "10px 14px", cursor: "pointer", fontWeight: 900 }}>Ver todos →</button>
            </div>
            {dashboardDecks.length === 0 ? (
              <div style={{ background: bg.card, border: `1px solid ${bg.cardBorder}`, borderRadius: 22, padding: 28, color: bg.muted, textAlign: "center" }}>
                Todavía no guardaste análisis. Entrá al Deck Analyzer, pegá una decklist y tocá Guardar deck.
              </div>
            ) : (
              <div className="da-deck-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
                {dashboardDecks.map(deck => (
                  <button key={deck.id} onClick={() => loadSavedDeck(deck)} className="da-card-hover" style={{ textAlign: "left", overflow: "hidden", background: bg.card, border: `1px solid ${bg.cardBorder}`, borderRadius: 20, padding: 0, cursor: "pointer", boxShadow: bg.shadow }}>
                    <div style={{ height: 138, position: "relative", background: "linear-gradient(135deg,#14532d,#0f172a)" }}>
                      {deck.summary?.commanderImage && <img src={deck.summary.commanderImage} alt={deck.commanderName} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: .82 }} />}
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 10%, rgba(0,0,0,.78) 100%)" }} />
                      <div style={{ position: "absolute", left: 12, right: 12, bottom: 10, display: "flex", justifyContent: "space-between", alignItems: "end", gap: 10 }}>
                        <div style={{ color: "#fff", fontWeight: 950, fontSize: 17, lineHeight: 1.15, textShadow: "0 2px 10px rgba(0,0,0,.55)" }}>{deck.name}</div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <span style={{ background: "rgba(245,158,11,.94)", color: "#111827", borderRadius: 9, padding: "4px 7px", fontWeight: 950, fontSize: 12 }}>{deck.summary?.overall || "-"}</span>
                          <span style={{ background: "rgba(34,197,94,.94)", color: "#052e16", borderRadius: 9, padding: "4px 7px", fontWeight: 950, fontSize: 12 }}>B{deck.summary?.bracket || "-"}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: 14 }}>
                      <div style={{ color: bg.muted, fontSize: 12, marginBottom: 8 }}>{deck.commanderName}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {(deck.summary?.archetypes || []).slice(0, 3).map(a => <Tag key={a} label={a} />)}
                      </div>
                      <div style={{ color: bg.muted, fontSize: 11, marginTop: 10 }}>Actualizado: {deck.updatedAt ? new Date(deck.updatedAt).toLocaleDateString() : "-"}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="da-dashboard-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 }}>
            {[
              ["Bracket explicado", "Detecta Game Changers, combos compactos, tutores, fast mana y locks para estimar experiencia de mesa.", "🏷️"],
              ["Mejoras accionables", "Te sugiere cartas a meter y cortes según los roles flojos del deck y su identidad de color.", "🔧"],
              ["Reporte compartible", "Copiá un resumen del análisis para Discord, WhatsApp o hablarlo antes de sentarte a jugar.", "📋"],
            ].map(([title, text, icon]) => (
              <div key={title} className="da-card-hover" style={{ background: bg.card, border: `1px solid ${bg.cardBorder}`, borderRadius: 20, padding: 20, boxShadow: bg.shadow }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
                <h3 style={{ margin: 0, color: bg.heroText, fontSize: 20 }}>{title}</h3>
                <p style={{ margin: "8px 0 0", color: bg.muted, lineHeight: 1.55 }}>{text}</p>
              </div>
            ))}
          </section>
        </div>
      )}

      {tab === "decks" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
          <div style={{ background: bg.card, borderRadius: 16, padding: 22, border: `1px solid ${bg.cardBorder}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ color: "#fff", margin: 0 }}>📚 Decks guardados</h2>
                <p style={{ color: "#94a3b8", margin: "6px 0 0", lineHeight: 1.5 }}>
                  Guardá los análisis que vayas haciendo y volvé a cargarlos sin tener que pegar la decklist otra vez.
                </p>
              </div>
              <button onClick={() => setTab("input")} style={{ background: "#14532d", color: "#86efac", border: "1px solid #22c55e", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontWeight: 800 }}>
                + Analizar nuevo deck
              </button>
            </div>
            {saveStatus && <div style={{ color: "#fbbf24", marginTop: 12, fontSize: 13 }}>{saveStatus}</div>}
          </div>

          {savedDecks.length === 0 && (
            <div style={{ background: bg.card, borderRadius: 16, padding: 24, border: `1px solid ${bg.cardBorder}`, color: "#94a3b8", textAlign: "center" }}>
              Todavía no hay decks guardados. Analizá un mazo, poné nombre y tocá <b style={{ color: "#86efac" }}>Guardar deck</b>.
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
            {savedDecks.map(deck => (
              <div key={deck.id} style={{ background: "linear-gradient(135deg, #081308 0%, #0d1a0d 100%)", borderRadius: 16, padding: 18, border: "1px solid #14532d", boxShadow: "0 0 28px rgba(34,197,94,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                    {deck.summary?.commanderImage && (
                      <img src={deck.summary.commanderImage} alt={deck.commanderName} style={{ width: 54, height: 76, objectFit: "cover", borderRadius: 7, border: "1px solid #22c55e66", boxShadow: "0 0 18px rgba(34,197,94,0.16)", flex: "0 0 auto" }} />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ color: "#fff", margin: 0, fontSize: 20 }}>{deck.name}</h3>
                      <div style={{ color: "#86efac", fontSize: 12, marginTop: 4 }}>{deck.commanderName}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span style={{ background: "#0a150a", color: "#fbbf24", border: "1px solid #3a2a0a", borderRadius: 10, padding: "5px 8px", fontFamily: "monospace", fontWeight: 900 }}>{deck.summary?.overall || "-"}/10</span>
                    <span style={{ background: "#0a150a", color: "#4ade80", border: "1px solid #14532d", borderRadius: 10, padding: "5px 8px", fontFamily: "monospace", fontWeight: 900 }}>B{deck.summary?.bracket || "-"}</span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 14 }}>
                  <div style={{ background: "#061006", borderRadius: 10, padding: 10, textAlign: "center" }}>
                    <div style={{ color: "#4ade80", fontWeight: 900, fontFamily: "monospace" }}>{deck.summary?.totalCards || "-"}</div>
                    <div style={{ color: "#6b7280", fontSize: 10, textTransform: "uppercase" }}>Cartas</div>
                  </div>
                  <div style={{ background: "#061006", borderRadius: 10, padding: 10, textAlign: "center" }}>
                    <div style={{ color: "#94a3b8", fontWeight: 900, fontFamily: "monospace" }}>{deck.summary?.landsCount || "-"}</div>
                    <div style={{ color: "#6b7280", fontSize: 10, textTransform: "uppercase" }}>Tierras</div>
                  </div>
                  <div style={{ background: "#061006", borderRadius: 10, padding: 10, textAlign: "center" }}>
                    <div style={{ color: "#a78bfa", fontWeight: 900, fontFamily: "monospace" }}>{deck.summary?.combos || 0}</div>
                    <div style={{ color: "#6b7280", fontSize: 10, textTransform: "uppercase" }}>Combos</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                  {(deck.summary?.archetypes || []).slice(0, 4).map(a => <Tag key={a} label={a} />)}
                </div>

                <div style={{ color: "#6b7280", fontSize: 11, marginTop: 12 }}>
                  Guardado: {deck.updatedAt ? new Date(deck.updatedAt).toLocaleString() : "-"}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                  <button onClick={() => loadSavedDeck(deck)} style={{ flex: 1, minWidth: 90, background: "#14532d", color: "#86efac", border: "1px solid #22c55e", borderRadius: 9, padding: "8px 10px", cursor: "pointer", fontWeight: 800 }}>
                    Abrir
                  </button>
                  <button onClick={() => exportSavedDeck(deck)} style={{ background: "#0d2b14", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 9, padding: "8px 10px", cursor: "pointer", fontWeight: 800 }}>
                    Exportar
                  </button>
                  <button onClick={() => deleteSavedDeck(deck.id)} style={{ background: "#2a0d0d", color: "#fca5a5", border: "1px solid #7f1d1d", borderRadius: 9, padding: "8px 10px", cursor: "pointer", fontWeight: 800 }}>
                    Borrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "input" && (
        <div className="input-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 14 }}>
          <div style={{ background: bg.card, borderRadius: 12, padding: 20, border: `1px solid ${bg.cardBorder}` }}>
            <h3 style={{ color: "#86efac", margin: "0 0 12px", fontSize: 14 }}>Cómo usar</h3>
            <p style={{ color: "#94a3b8", lineHeight: 1.6, fontSize: 13 }}>Pegá una decklist de Archidekt, Moxfield, Manabox, Arena o similar. Acepta encabezados, CSV/JSON exportado, cantidades, tags manuales y edición con collector number.</p>
            <div style={{ background: "#071207", border: "1px solid #14532d", borderRadius: 10, padding: 12, color: "#94a3b8", fontSize: 12, lineHeight: 1.65 }}>
              <b style={{ color: "#86efac" }}>Flujo recomendado:</b><br />
              1. Exportá tu mazo desde Archidekt/Moxfield/Manabox.<br />
              2. Pegalo a la derecha o subí el archivo.<br />
              3. Tocá <b style={{ color: "#d1fae5" }}>Analizar decklist</b> y esperá que cargue Scryfall.<br />
              4. Revisá Overview, Bracket, Combos, Mejoras y Meter cartas.<br /><br />
              <b style={{ color: "#86efac" }}>Formatos válidos:</b><br />
              1 Sol Ring<br />
              1x Sol Ring (CMM) 703 [Ramp]<br />
              # Commander / # Lands / # Sideboard<br />
              CSV con columnas Name, Quantity, Set Code, Collector Number
            </div>
            <label style={{ display: "block", marginTop: 12, background: "#0d2b14", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 10, padding: 10, cursor: "pointer", textAlign: "center", fontWeight: 800 }}>
              Subir archivo exportado (.txt/.csv/.json)
              <input type="file" accept=".txt,.csv,.json,.dek" onChange={handleDeckFileUpload} style={{ display: "none" }} />
            </label>
            <button onClick={analyzeDeck} disabled={loading || !deckText.trim()} style={{ width: "100%", marginTop: 12, background: loading ? "#1f2937" : "#14532d", color: "#86efac", border: "1px solid #22c55e", borderRadius: 10, padding: 12, cursor: loading ? "not-allowed" : "pointer", fontWeight: 800 }}>{loading ? "Analizando decklist..." : "Analizar decklist"}</button>
            <button onClick={enrichScryfall} disabled={!cards.length || loading} style={{ width: "100%", marginTop: 10, background: loading ? "#1f2937" : "#0d2b14", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 10, padding: 12, cursor: loading ? "not-allowed" : "pointer", fontWeight: 800 }}>Recargar datos Scryfall</button>
            <button onClick={resetAnalyzer} style={{ width: "100%", marginTop: 10, background: "#2a160a", color: "#fed7aa", border: "1px solid #7c2d12", borderRadius: 10, padding: 12, cursor: "pointer", fontWeight: 800 }}>Nuevo análisis / limpiar</button>
            <div style={{ color: loading ? "#fbbf24" : "#6b7280", fontSize: 12, marginTop: 10 }}>{loadStatus}</div>
          </div>
          <div style={{ background: bg.card, borderRadius: 12, padding: 20, border: `1px solid ${bg.cardBorder}` }}>
            <textarea value={deckText} onChange={e => setDeckText(e.target.value)} placeholder="Pegá tu decklist acá..." style={{ width: "100%", height: 430, background: "#050d05", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 12, padding: 14, fontFamily: "monospace", fontSize: 12, outline: "none" }} />
          </div>
        </div>
      )}

      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ background: bg.card, borderRadius: 12, padding: 20, border: `1px solid ${bg.cardBorder}` }}>
            <h3 style={{ color: "#86efac", margin: "0 0 14px", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace" }}>📊 Curva de Maná</h3>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={manaCurve} barCategoryGap="20%">
                <XAxis dataKey="cmc" tick={{ fill: "#86efac", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#4b5563", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={false} />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                  fill="#22c55e"
                  activeBar={{ fill: "#4ade80", stroke: "#bbf7d0", strokeWidth: 1 }}
                  cursor="pointer"
                  onClick={(data) => data?.payload && openCardFilter({ kind: "cmc", value: data.payload.cmc })}
                />
              </BarChart>
            </ResponsiveContainer>
            {unknownCmc > 0 && (
              <div style={{ marginTop: 8, color: "#fbbf24", fontSize: 12 }}>
                {unknownCmc} cartas todavía no tienen coste calculado. Tocá “Cargar datos Scryfall” para completar la curva real.
              </div>
            )}
          </div>

          <div style={{ background: bg.card, borderRadius: 12, padding: 20, border: `1px solid ${bg.cardBorder}` }}>
            <h3 style={{ color: "#86efac", margin: "0 0 14px", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace" }}>🥧 Tipos de Carta</h3>
            <div style={{ display: "flex", alignItems: "center" }}>
              <ResponsiveContainer width="55%" height={190}>
                <PieChart>
                  <Pie
                    data={cardTypes}
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={78}
                    dataKey="value"
                    labelLine={false}
                    cursor="pointer"
                    onClick={(data) => data?.name && openCardFilter({ kind: "type", value: data.name })}
                  >
                    {cardTypes.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} cursor={false} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1 }}>{cardTypes.map(t => <div key={t.name} onClick={() => openCardFilter({ kind: "type", value: t.name })} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6, cursor: "pointer" }}><div style={{ width: 10, height: 10, borderRadius: 2, background: t.color }} /><span style={{ fontSize: 12, color: "#cbd5e1", flex: 1 }}>{t.name}</span><span style={{ fontSize: 12, color: bg.muted, fontFamily: "monospace" }}>{t.value}</span></div>)}</div>
            </div>
          </div>

          <div style={{ background: bg.card, borderRadius: 12, padding: 20, border: `1px solid ${bg.cardBorder}` }}>
            <h3 style={{ color: "#86efac", margin: "0 0 14px", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace" }}>🎯 Perfil del Mazo</h3>
            <ResponsiveContainer width="100%" height={230}>
              <RadarChart data={scores.radar}>
                <PolarGrid stroke="#1a3a1a" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "#86efac", fontSize: 11 }} />
                <Radar dataKey="value" stroke="#22c55e" fill="#22c55e" fillOpacity={0.25} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: bg.card, borderRadius: 12, padding: 20, border: `1px solid ${bg.cardBorder}` }}>
            <h3 style={{ color: "#86efac", margin: "0 0 14px", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace" }}>🎭 Roles Detectados</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={roles.slice(0, 12)} layout="vertical" barCategoryGap="15%">
                <XAxis type="number" tick={{ fill: "#4b5563", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="role" type="category" tick={{ fill: "#cbd5e1", fontSize: 10 }} width={135} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={false} />
                <Bar
                  dataKey="count"
                  radius={[0, 4, 4, 0]}
                  activeBar={{ fill: "#4ade80", stroke: "#bbf7d0", strokeWidth: 1 }}
                  cursor="pointer"
                  onClick={(data) => data?.payload && openCardFilter({ kind: "role", value: data.payload.role })}
                >{roles.slice(0, 12).map((e, i) => <Cell key={i} fill={e.color} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: bg.card, borderRadius: 12, padding: 20, border: `1px solid ${bg.cardBorder}`, gridColumn: "1 / -1" }}>
            <h3 style={{ color: "#86efac", margin: "0 0 12px", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace" }}>🧠 Plan de juego detectado</h3>
            <p style={{ color: "#cbd5e1", lineHeight: 1.7, margin: 0 }}>{cards.length ? planText : "Pegá una decklist para generar el análisis."}</p>
          </div>
        </div>
      )}

      {tab === "deckview" && (
        <div style={{ background: bg.card, borderRadius: 16, padding: 18, border: `1px solid ${bg.cardBorder}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <div>
              <h2 style={{ color: "#fff", margin: 0 }}>🗂️ Vista del deck</h2>
              <p style={{ color: "#94a3b8", margin: "6px 0 0", fontSize: 13 }}>Vista tipo Archidekt: columnas por rol/tipo/coste/color, cartas apiladas y filtros rápidos.</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input
                value={deckViewSearch}
                onChange={e => setDeckViewSearch(e.target.value)}
                placeholder="Filtrar carta..."
                style={{ background: "#050d05", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 8, padding: "9px 10px", outline: "none", minWidth: 180 }}
              />
              <select value={deckViewGroupBy} onChange={e => setDeckViewGroupBy(e.target.value)} style={{ background: "#050d05", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 8, padding: "9px 10px", outline: "none" }}>
                <option value="role">Agrupar por rol</option>
                <option value="type">Agrupar por tipo</option>
                <option value="cmc">Agrupar por coste</option>
                <option value="color">Agrupar por color</option>
              </select>
              <select value={deckViewSortBy} onChange={e => setDeckViewSortBy(e.target.value)} style={{ background: "#050d05", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 8, padding: "9px 10px", outline: "none" }}>
                <option value="name">Orden: alfabético</option>
                <option value="cmc">Orden: coste</option>
                <option value="price">Orden: precio</option>
                <option value="qty">Orden: cantidad</option>
              </select>
              <select value={deckViewLayout} onChange={e => setDeckViewLayout(e.target.value)} style={{ background: "#050d05", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 8, padding: "9px 10px", outline: "none" }}>
                <option value="scroll">Vista horizontal</option>
                <option value="wrap">Ajustar a pantalla</option>
              </select>
            </div>
          </div>

          <div className="deck-column-scroll" style={{ display: "flex", gap: 12, overflowX: deckViewLayout === "scroll" ? "auto" : "visible", overflowY: "visible", padding: "4px 4px 18px", alignItems: "flex-start", flexWrap: deckViewLayout === "wrap" ? "wrap" : "nowrap", maxWidth: "100%", WebkitOverflowScrolling: "touch" }}>
            {getDeckViewGroups().map(group => (
              <div key={group.name} style={{ minWidth: 178, maxWidth: deckViewLayout === "wrap" ? 190 : 178, background: "#071207", border: "1px solid #14532d", borderRadius: 12, padding: 9, flex: deckViewLayout === "wrap" ? "1 1 178px" : "0 0 178px", boxShadow: "0 0 18px rgba(34,197,94,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 7, minHeight: 38 }}>
                  <div style={{ minWidth: 0 }}>
                    <div title={ROLE_DESCRIPTIONS[group.name] || group.name} style={{ color: ROLE_COLORS[group.name] || "#86efac", fontWeight: 900, fontSize: 14, cursor: ROLE_DESCRIPTIONS[group.name] ? "help" : "default", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 115 }}>{group.name}</div>
                    <div style={{ color: "#6b7280", fontSize: 10 }}>Qty: {group.qty}</div>
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 10, textAlign: "right", whiteSpace: "nowrap" }}>€{group.price.toFixed(2)}</div>
                </div>

                <div style={{ position: "relative", minHeight: group.cards.length ? 232 + Math.max(0, group.cards.length - 1) * 42 : 40, paddingBottom: 10 }}>
                  {group.cards.map((card, idx) => (
                    <div
                      className="deck-stack-card"
                      key={card.key}
                      title={`${card.qty}x ${card.name} · ${card.manaCost || (card.type === "Tierras" ? "Land" : `MV ${card.cmc ?? "?"}`)}`}
                      onMouseEnter={(e) => { setPreviewCard(card); setPreviewPos({ x: e.clientX, y: e.clientY }); }}
                      onMouseMove={(e) => setPreviewPos({ x: e.clientX, y: e.clientY })}
                      onMouseLeave={() => setPreviewCard(null)}
                      onClick={() => { setCardSearch(card.name); setTab("cards"); }}
                      style={{ position: "relative", marginTop: idx === 0 ? 0 : -188, zIndex: idx + 1, width: 158, marginLeft: "auto", marginRight: "auto", cursor: "zoom-in" }}
                    >
                      <div style={{ width: 158, height: 220, borderRadius: 10, overflow: "hidden", background: "#020802", border: "1px solid #14532d", boxShadow: "0 8px 20px rgba(0,0,0,0.45)", position: "relative" }}>
                        {card.smallImage || card.image ? (
                          <img src={card.image || card.smallImage} alt={card.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        ) : (
                          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", fontSize: 12, textAlign: "center", padding: 12 }}>Sin imagen<br />{card.name}</div>
                        )}
                        <div style={{ position: "absolute", top: 5, left: 5, background: "rgba(0,0,0,0.72)", color: "#fff", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 6, padding: "2px 6px", fontSize: 11, fontWeight: 900 }}>{card.qty}</div>
                        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "18px 7px 6px", background: "linear-gradient(0deg, rgba(0,0,0,0.92), rgba(0,0,0,0.62) 55%, transparent)", color: "#fff" }}>
                          <div style={{ fontSize: 11, fontWeight: 900, lineHeight: 1.15, textShadow: "0 1px 2px #000" }}>{card.name}</div>
                          <div style={{ color: "#cbd5e1", fontSize: 9, marginTop: 2 }}>{card.manaCost || (card.type === "Tierras" ? "Land" : `MV ${card.cmc ?? "?"}`)}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 5, justifyContent: "center" }}>
                        {getEffectiveRoles(card).slice(0, 2).map(r => <Tag key={r} label={r} color={ROLE_COLORS[r] || "#86efac"} />)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "stats" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
          <div style={{ background: bg.card, borderRadius: 16, padding: 22, border: `1px solid ${bg.cardBorder}` }}>
            <h2 style={{ color: "#fff", margin: 0 }}>📈 Deck stats</h2>
            <p style={{ color: "#94a3b8", margin: "6px 0 18px", lineHeight: 1.5 }}>
              Lectura visual de curva, colores y producción de maná. Sirve para ver si el mazo pide más negro/verde/blanco/etc. de lo que realmente produce.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, marginBottom: 18 }}>
              <div style={{ background: "#071207", border: "1px solid #14532d", borderRadius: 12, padding: 14 }}>
                <div style={{ color: "#86efac", fontWeight: 900 }}>Avg Mana Value</div>
                <div style={{ color: "#fff", fontSize: 28, fontFamily: "monospace", fontWeight: 900 }}>{manaStats.avgManaValue}</div>
              </div>
              <div style={{ background: "#071207", border: "1px solid #14532d", borderRadius: 12, padding: 14 }}>
                <div style={{ color: "#86efac", fontWeight: 900 }}>Precio total estimado</div>
                <div style={{ color: "#facc15", fontSize: 28, fontFamily: "monospace", fontWeight: 900 }}>{formatMoney(totalDeckPrice)}</div>
                <div style={{ color: "#6b7280", fontSize: 11, marginTop: 4 }}>{pricedCardsCount ? `${pricedCardsCount} cartas con precio Scryfall` : "Cargá Scryfall para calcularlo"}</div>
              </div>
              <div style={{ background: "#071207", border: "1px solid #14532d", borderRadius: 12, padding: 14 }}>
                <div style={{ color: "#86efac", fontWeight: 900 }}>Tierras</div>
                <div style={{ color: landsCount >= 34 && landsCount <= 38 ? "#4ade80" : "#fbbf24", fontSize: 28, fontFamily: "monospace", fontWeight: 900 }}>{landsCount}</div>
              </div>
              <div style={{ background: "#071207", border: "1px solid #14532d", borderRadius: 12, padding: 14 }}>
                <div style={{ color: "#86efac", fontWeight: 900 }}>Cartas sin datos</div>
                <div style={{ color: unknownCmc ? "#fbbf24" : "#4ade80", fontSize: 28, fontFamily: "monospace", fontWeight: 900 }}>{unknownCmc}</div>
              </div>
            </div>

            {[
              { title: "Cost", data: manaStats.cost, total: manaStats.totalCost },
              { title: "Production", data: manaStats.production, total: manaStats.totalProduction },
            ].map(section => (
              <div key={section.title} style={{ marginBottom: 18 }}>
                <div style={{ color: "#cbd5e1", fontWeight: 900, marginBottom: 8 }}>{section.title}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
                  {manaStats.colors.map(color => {
                    const pct = Math.round(((section.data[color] || 0) / section.total) * 100);
                    const label = { W: "☼ White", U: "💧 Blue", B: "💀 Black", R: "🔥 Red", G: "🌳 Green", C: "◇ Colorless" }[color];
                    return (
                      <div key={`${section.title}-${color}`} style={{ background: "#071207", border: "1px solid #14532d", borderRadius: 10, padding: 10, minWidth: 0 }}>
                        <div style={{ color: "#cbd5e1", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
                        <div style={{ height: 24, background: "#101a10", borderRadius: 6, overflow: "hidden", marginTop: 8 }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: color === "B" ? "#9ca3af" : color === "G" ? "#86efac" : color === "U" ? "#93c5fd" : color === "R" ? "#fb923c" : color === "W" ? "#fde68a" : "#d1d5db" }} />
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 5 }}>{pct}% · {section.data[color] || 0} pips</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: bg.card, borderRadius: 16, padding: 22, border: `1px solid ${bg.cardBorder}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              <h3 style={{ color: "#86efac", margin: 0 }}>Mana curve by</h3>
              <select value={statsCurveBy} onChange={e => setStatsCurveBy(e.target.value)} style={{ background: "#050d05", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 8, padding: "9px 10px", outline: "none" }}>
                <option value="color">Color</option>
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 }}>
              {colorCurveGroups.map(group => (
                <div key={group.key} style={{ background: "#071207", border: "1px solid #14532d", borderRadius: 12, padding: 12 }}>
                  <div style={{ color: "#cbd5e1", fontWeight: 900, marginBottom: 8 }}>{group.label}</div>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={group.data} barCategoryGap="25%">
                      <XAxis dataKey="cmc" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip content={<CustomTooltip />} cursor={false} />
                      <Bar dataKey="count" fill={group.key === "B" ? "#9ca3af" : group.key === "G" ? "#86efac" : group.key === "U" ? "#93c5fd" : group.key === "R" ? "#fb923c" : group.key === "W" ? "#fde68a" : "#d1d5db"} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "extras" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
          <div style={{ background: bg.card, borderRadius: 16, padding: 22, border: `1px solid ${bg.cardBorder}` }}>
            <h2 style={{ color: "#fff", margin: 0 }}>🧪 Deck Tokens & Extras</h2>
            <p style={{ color: "#94a3b8", margin: "6px 0 18px", lineHeight: 1.5 }}>
              Detección basada primero en los related tokens/all_parts de Scryfall y, si no existen, en el texto Oracle. También muestra qué cartas generan cada ficha.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              <span style={{ background: "#14532d", color: "#86efac", border: "1px solid #22c55e", borderRadius: 8, padding: "8px 12px", fontWeight: 900 }}>Tokens ({tokensAndExtras.tokens.length})</span>
              <span style={{ background: "#071207", color: "#cbd5e1", border: "1px solid #14532d", borderRadius: 8, padding: "8px 12px", fontWeight: 900 }}>Extras ({tokensAndExtras.extras.length})</span>
            </div>

            {tokensAndExtras.tokens.length === 0 && tokensAndExtras.extras.length === 0 && (
              <div style={{ color: "#94a3b8", background: "#0a150a", borderRadius: 10, padding: 14 }}>No se detectaron tokens o extras claros. Cargar Scryfall es necesario para detectar tokens oficiales con imagen y fuente exacta.</div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
              {tokensAndExtras.tokens.map(token => (
                <div
                  key={token.name}
                  onMouseEnter={(e) => { if (token.image || token.smallImage) { setPreviewCard({ name: token.name, image: token.image || token.smallImage, qty: 1, typeLine: token.typeLine || "Token" }); setPreviewPos({ x: e.clientX, y: e.clientY }); } }}
                  onMouseMove={(e) => { if (token.image || token.smallImage) setPreviewPos({ x: e.clientX, y: e.clientY }); }}
                  onMouseLeave={() => setPreviewCard(null)}
                  style={{ background: "#071207", border: "1px solid #14532d", borderRadius: 12, padding: 14, cursor: token.image || token.smallImage ? "zoom-in" : "default" }}
                >
                  <div style={{ height: 230, borderRadius: 10, background: "radial-gradient(circle at 50% 25%, #14532d 0%, #020802 70%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#86efac", fontSize: 22, fontWeight: 900, textAlign: "center", padding: 8, overflow: "hidden" }}>
                    {token.image || token.smallImage ? (
                      <img src={token.image || token.smallImage} alt={token.name} style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 8 }} />
                    ) : token.name}
                  </div>
                  <div style={{ color: "#fff", fontWeight: 900, marginTop: 10 }}>{token.name}</div>
                  <div style={{ color: "#6b7280", fontSize: 11, marginTop: 2 }}>{token.typeLine}</div>
                  <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 8 }}>Lo crean:</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                    {token.sourceDetails.slice(0, 6).map(src => (
                      <div key={`${token.name}-${src.name}`} style={{ display: "flex", gap: 7, alignItems: "center", background: "#020802", border: "1px solid #1a2e1a", borderRadius: 8, padding: 6 }}>
                        {src.image && <img src={src.image} alt={src.name} style={{ width: 28, height: 39, objectFit: "cover", borderRadius: 4 }} />}
                        <span style={{ color: "#cbd5e1", fontSize: 11, lineHeight: 1.25 }}>{src.name}</span>
                      </div>
                    ))}
                    {token.sources.length > 6 && <div style={{ color: "#6b7280", fontSize: 11 }}>+{token.sources.length - 6} fuente(s) más</div>}
                  </div>
                </div>
              ))}
              {tokensAndExtras.extras.map(extra => (
                <div key={extra} style={{ background: "#071207", border: "1px solid #3a2a0a", borderRadius: 12, padding: 14 }}>
                  <div style={{ color: "#fbbf24", fontWeight: 900 }}>Extra detectado</div>
                  <div style={{ color: "#fff", marginTop: 8 }}>{extra}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: bg.card, borderRadius: 16, padding: 22, border: `1px solid ${bg.cardBorder}` }}>
            <h3 style={{ color: "#86efac", marginTop: 0 }}>Descripción del deck</h3>
            <p style={{ color: "#cbd5e1", lineHeight: 1.7 }}>{cards.length ? planText : "Cuando analices un mazo, acá aparece una descripción jugable del plan."}</p>
          </div>
        </div>
      )}

      {tab === "bracket" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 14 }}>
          <div style={{ background: bg.card, borderRadius: 16, padding: 24, border: "1px solid #22c55e44", boxShadow: "0 0 35px rgba(34,197,94,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div>
                <div style={{ color: "#4ade80", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", fontFamily: "monospace", marginBottom: 8 }}>Commander Bracket</div>
                <h2 style={{ margin: 0, color: "#fff", fontSize: 28 }}>{bracket.label}</h2>
                <p style={{ color: "#94a3b8", lineHeight: 1.6, maxWidth: 720 }}>{bracket.description}</p>
                <div style={{ color: "#fbbf24", background: "#1a1406", border: "1px solid #3a2a0a", borderRadius: 10, padding: 10, fontSize: 12, lineHeight: 1.45, maxWidth: 760 }}>
                  Estimación automática: el bracket se basa en cartas detectadas, combos, fast mana, tutores, locks y estructura. No reemplaza la conversación previa con la mesa.
                </div>
              </div>
              <div style={{ minWidth: 120, minHeight: 120, borderRadius: 18, border: "2px solid #22c55e66", background: "radial-gradient(circle at 50% 30%, #14532d 0%, #061106 75%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 0 30px rgba(34,197,94,0.15)" }}>
                <div style={{ fontSize: 54, lineHeight: 1, color: "#4ade80", fontWeight: 900, fontFamily: "monospace" }}>{bracket.bracket}</div>
                <div style={{ color: "#86efac", fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}>{bracket.shortLabel}</div>
              </div>
            </div>
            <div style={{ marginTop: 16, background: "#071207", border: "1px solid #14532d", borderRadius: 12, padding: 14, color: "#cbd5e1", lineHeight: 1.6 }}>
              El bracket no es una nota de poder pura. Sirve para comunicar qué contiene el mazo: Game Changers, combos compactos, tutores, fast mana, turnos extra, locks o mass land denial. El <b style={{ color: "#fbbf24" }}>Overall {scores.overall}/10</b> mide salud estructural; el <b style={{ color: "#4ade80" }}>Bracket {bracket.bracket}</b> mide experiencia de mesa.
            </div>
          </div>

          <div style={{ background: bg.card, borderRadius: 16, padding: 24, border: "1px solid #f59e0b44" }}>
            <div style={{ color: "#fbbf24", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", fontFamily: "monospace", marginBottom: 10 }}>Resumen rápido</div>
            {[
              { label: "Game Changers", value: bracket.gameChangers.length },
              { label: "Combos 2 cartas", value: bracket.compactCombos.length },
              { label: "Tutores premium", value: bracket.tutors.length },
              { label: "Fast mana premium", value: bracket.fastMana.length },
              { label: "MLD / Locks", value: bracket.mld.length },
              { label: "Turnos extra", value: bracket.extraTurns.length },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid #1a2e1a" }}>
                <span style={{ color: "#cbd5e1" }}>{row.label}</span>
                <span style={{ color: row.value ? "#fbbf24" : "#6b7280", fontFamily: "monospace", fontWeight: 900 }}>{row.value}</span>
              </div>
            ))}
          </div>

          <div style={{ background: bg.card, borderRadius: 16, padding: 22, border: "1px solid #22c55e33" }}>
            <h3 style={{ color: "#86efac", marginTop: 0 }}>Qué lo empuja hacia arriba</h3>
            {(bracket.up.length ? bracket.up : ["No hay factores fuertes que empujen mucho el bracket."]).map((x, i) => (
              <div key={i} style={{ background: "#071207", border: "1px solid #14532d", borderRadius: 10, color: "#cbd5e1", padding: 10, marginBottom: 8 }}>+ {x}</div>
            ))}
          </div>

          <div style={{ background: bg.card, borderRadius: 16, padding: 22, border: "1px solid #ef444433" }}>
            <h3 style={{ color: "#f87171", marginTop: 0 }}>Qué lo frena</h3>
            {bracket.down.map((x, i) => (
              <div key={i} style={{ background: "#150a0a", border: "1px solid #3f1515", borderRadius: 10, color: "#cbd5e1", padding: 10, marginBottom: 8 }}>- {x}</div>
            ))}
          </div>

          {bracket.reasoningCards.length > 0 && (
            <div style={{ background: bg.card, borderRadius: 16, padding: 22, border: "1px solid #f59e0b33", gridColumn: "1 / -1" }}>
              <h3 style={{ color: "#fbbf24", marginTop: 0 }}>Cartas relevantes para el bracket</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                {bracket.reasoningCards.map((box, i) => (
                  <div key={i} style={{ background: "#0a150a", border: "1px solid #2b3a12", borderRadius: 12, padding: 14 }}>
                    <div style={{ color: "#fbbf24", fontWeight: 900, marginBottom: 8 }}>{box.title}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{box.cards.map(card => <Tag key={card} label={card} color="#fbbf24" />)}</div>
                    <div style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>{box.note}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "combos" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
          <div style={{ background: bg.card, borderRadius: 12, padding: 20, border: `1px solid ${bg.cardBorder}` }}>
            <h3 style={{ color: "#86efac", marginTop: 0 }}>🧩 Combos y sinergias detectadas</h3>
            <p style={{ color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>
              Esta pestaña usa Commander Spellbook cuando se puede consultar online. Si la API falla por CORS/red, usa una base local mínima como respaldo, pero la fuente buena es Commander Spellbook.
            </p>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 14 }}>
              <button onClick={() => refreshSpellbookCombos(cards)} disabled={!cards.length || spellbookLoading} style={{ background: spellbookLoading ? "#1f2937" : "#14532d", color: "#86efac", border: "1px solid #22c55e", borderRadius: 10, padding: "9px 13px", cursor: spellbookLoading ? "not-allowed" : "pointer", fontWeight: 900 }}>
                {spellbookLoading ? "Consultando combos..." : "Actualizar combos desde Commander Spellbook"}
              </button>
              <span style={{ color: spellbookHasFetched ? "#86efac" : "#fbbf24", fontSize: 12 }}>{spellbookStatus}</span>
            </div>
          </div>

          <div style={{ background: bg.card, borderRadius: 12, padding: 20, border: `1px solid ${bg.cardBorder}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
              <h3 style={{ color: "#fbbf24", margin: 0 }}>Combos conocidos</h3>
              <div style={{ display: "flex", gap: 8, background: "#071207", border: "1px solid #14532d", borderRadius: 999, padding: 4 }}>
                <button onClick={() => setComboView("included")} style={{ background: comboView === "included" ? "#14532d" : "transparent", color: comboView === "included" ? "#86efac" : "#94a3b8", border: "none", borderRadius: 999, padding: "7px 12px", cursor: "pointer", fontWeight: 800 }}>
                  Incluidos ({includedCombos.length})
                </button>
                <button onClick={() => setComboView("almost")} style={{ background: comboView === "almost" ? "#3a2a0a" : "transparent", color: comboView === "almost" ? "#fbbf24" : "#94a3b8", border: "none", borderRadius: 999, padding: "7px 12px", cursor: "pointer", fontWeight: 800 }}>
                  Casi incluidos ({almostCombos.length})
                </button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              <button onClick={() => setComboSizeFilter("all")} style={{ background: comboSizeFilter === "all" ? "#14532d" : "#071207", color: comboSizeFilter === "all" ? "#86efac" : "#94a3b8", border: "1px solid #14532d", borderRadius: 999, padding: "7px 12px", cursor: "pointer", fontWeight: 800 }}>
                Todos ({comboSource.length})
              </button>
              <button onClick={() => setComboSizeFilter("2")} style={{ background: comboSizeFilter === "2" ? "#14532d" : "#071207", color: comboSizeFilter === "2" ? "#86efac" : "#94a3b8", border: "1px solid #14532d", borderRadius: 999, padding: "7px 12px", cursor: "pointer", fontWeight: 800 }}>
                2 cartas ({twoCardComboCount})
              </button>
              <button onClick={() => setComboSizeFilter("3")} style={{ background: comboSizeFilter === "3" ? "#14532d" : "#071207", color: comboSizeFilter === "3" ? "#86efac" : "#94a3b8", border: "1px solid #14532d", borderRadius: 999, padding: "7px 12px", cursor: "pointer", fontWeight: 800 }}>
                3 cartas ({threeCardComboCount})
              </button>
            </div>
            {displayedCombos.length === 0 && (
              <div style={{ color: "#94a3b8", background: "#0a150a", borderRadius: 8, padding: 12 }}>
                {comboView === "included" ? "No hay combos completos de 2 o 3 cartas detectados." : "No hay combos casi completos. Se muestran cuando te falta exactamente una pieza de un combo de 2 o 3 cartas."}
              </div>
            )}
            {displayedCombos.map(combo => (
              <div key={combo.name} style={{ background: "linear-gradient(135deg, #081308 0%, #0d1a0d 100%)", color: "#e2f0e2", borderRadius: 16, padding: 18, border: `1px solid ${combo.complete ? "#22c55e66" : "#f59e0b66"}`, marginBottom: 14, boxShadow: combo.complete ? "0 0 28px rgba(34,197,94,0.12)" : "0 0 24px rgba(245,158,11,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 280 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                      <span style={{ background: combo.complete ? "#14532d" : "#3a2a0a", color: combo.complete ? "#86efac" : "#fbbf24", border: `1px solid ${combo.complete ? "#22c55e" : "#f59e0b"}`, borderRadius: 999, padding: "3px 9px", fontSize: 11, fontWeight: 900 }}>
                        {combo.complete ? "✓ COMBO INCLUIDO" : `CASI INCLUIDO · FALTA ${combo.missing.length}`}
                      </span>
                      <span style={{ background: combo.power === "cEDH" ? "#7f1d1d" : "#3a2a0a", color: combo.power === "cEDH" ? "#fca5a5" : "#fbbf24", borderRadius: 999, padding: "3px 9px", fontSize: 11, fontWeight: 900 }}>{combo.power}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <h3 style={{ color: "#fff", fontWeight: 900, fontSize: 20, margin: "0 0 6px" }}>{combo.name}</h3>
                      {combo.url && (
                        <a href={combo.url} target="_blank" rel="noreferrer" style={{ background: "#1d4ed8", color: "#dbeafe", textDecoration: "none", borderRadius: 8, padding: "6px 10px", fontSize: 11, fontWeight: 900 }}>
                          Ver en Commander Spellbook
                        </a>
                      )}
                    </div>
                    <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.5, margin: "0 0 10px" }}>{combo.desc}</p>
                    {!combo.complete && <div style={{ color: "#fbbf24", fontSize: 13, marginBottom: 10 }}>Te falta: <b>{combo.missing.join(", ")}</b></div>}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {(combo.effects || [combo.type]).map(effect => <span key={effect} style={{ background: effect.toLowerCase().includes("infinite") ? "#123d68" : effect.toLowerCase().includes("lock") || effect.toLowerCase().includes("land") ? "#5f2412" : "#3b1f66", color: "#dbeafe", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 999, padding: "4px 9px", fontSize: 11, fontWeight: 800 }}>{effect}</span>)}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
                  {combo.pieces.map(piece => {
                    const card = findCard(cards, piece);
                    const isPresent = combo.present.includes(piece);
                    return (
                      <div key={piece} style={{ width: 126, background: "#061006", border: `1px solid ${isPresent ? "#22c55e66" : "#f59e0b66"}`, borderRadius: 12, padding: 8 }}>
                        <div style={{ height: 176, borderRadius: 9, background: "#020802", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                          {card?.image ? <img src={card.image} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ color: isPresent ? "#86efac" : "#fbbf24", textAlign: "center", padding: 8, fontSize: 12 }}>{piece}<br />{isPresent ? "En mazo" : "Falta"}</div>}
                        </div>
                        <div style={{ marginTop: 7, fontWeight: 800, fontSize: 12, color: "#fff", lineHeight: 1.25 }}>{piece}</div>
                        <div style={{ color: isPresent ? "#86efac" : "#fbbf24", fontSize: 10, marginTop: 4 }}>{isPresent ? "Detectada" : "Carta faltante"}</div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginTop: 16 }}>
                  <div style={{ background: "#071207", border: "1px solid #14532d", borderRadius: 12, padding: 13 }}>
                    <h4 style={{ margin: "0 0 8px", color: "#86efac" }}>Cómo funciona</h4>
                    <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6, color: "#cbd5e1" }}>
                      {(combo.steps || [combo.desc]).map((s, i) => <li key={i}>{s}</li>)}
                    </ol>
                  </div>
                  <div style={{ background: "#071207", border: "1px solid #14532d", borderRadius: 12, padding: 13 }}>
                    <h4 style={{ margin: "0 0 8px", color: "#60a5fa" }}>Efectos</h4>
                    <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6, color: "#cbd5e1" }}>
                      {(combo.effects || [combo.type]).map(e => <li key={e}>{e}</li>)}
                    </ul>
                  </div>
                  <div style={{ background: "#071207", border: "1px solid #14532d", borderRadius: 12, padding: 13 }}>
                    <h4 style={{ margin: "0 0 8px", color: "#fbbf24" }}>Requisitos</h4>
                    <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6, color: "#cbd5e1" }}>
                      {(combo.prerequisites || ["Sin requisitos registrados."]).map(p => <li key={p}>{p}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: bg.card, borderRadius: 12, padding: 20, border: `1px solid ${bg.cardBorder}` }}>
            <h3 style={{ color: "#86efac", marginTop: 0 }}>Motores de sinergia</h3>
            {synergyLines.length === 0 && (
              <div style={{ color: "#94a3b8", background: "#0a150a", borderRadius: 8, padding: 12 }}>
                Todavía no hay suficiente densidad de roles para detectar motores claros. Cargar datos de Scryfall suele mejorar esta sección.
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
              {synergyLines.map(line => (
                <div key={line.name} style={{ background: "#0a150a", borderRadius: 10, padding: 14, border: "1px solid #14532d" }}>
                  <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>{line.name}</div>
                  <div style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.5, marginTop: 6 }}>{line.desc}</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 10 }}>
                    {line.roles.map(r => <Tag key={r} label={r} color={ROLE_COLORS[r] || "#86efac"} />)}
                  </div>
                  <div style={{ color: "#6b7280", fontSize: 12, marginTop: 10 }}>
                    Piezas detectadas: {line.pieces.join(", ")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "analysis" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ background: bg.card, borderRadius: 12, padding: 16, border: `1px solid ${bg.cardBorder}`, gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h3 style={{ color: "#86efac", margin: 0 }}>📄 Reporte rápido</h3>
              <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>Copiá un resumen para compartir por WhatsApp, Discord o con tu mesa.</div>
            </div>
            <button onClick={copyReportToClipboard} disabled={!cards.length} style={{ background: cards.length ? "#14532d" : "#1f2937", color: "#86efac", border: "1px solid #22c55e", borderRadius: 10, padding: "10px 14px", cursor: cards.length ? "pointer" : "not-allowed", fontWeight: 900 }}>Copiar reporte</button>
            {reportStatus && <div style={{ color: "#86efac", fontSize: 12, width: "100%" }}>{reportStatus}</div>}
          </div>
          <div style={{ background: bg.card, borderRadius: 12, padding: 20, border: "1px solid #14532d" }}>
            <h3 style={{ color: "#4ade80", marginTop: 0 }}>✅ Fortalezas</h3>
            {strengths.map((s, i) => (
              <div key={i} style={{ color: "#cbd5e1", background: "#0a1f0a", padding: 12, borderRadius: 8, marginBottom: 10, border: "1px solid #0d2b0d" }}>
                <div style={{ color: "#86efac", fontWeight: 800, marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>{s.text}</div>
              </div>
            ))}
          </div>

          <div style={{ background: bg.card, borderRadius: 12, padding: 20, border: "1px solid #7f1d1d44" }}>
            <h3 style={{ color: "#f87171", marginTop: 0 }}>⚠️ Debilidades</h3>
            {weaknesses.map((w, i) => (
              <div key={i} style={{ color: "#cbd5e1", background: "#150a0a", padding: 12, borderRadius: 8, marginBottom: 10, border: "1px solid #2b0d0d" }}>
                <div style={{ color: "#fca5a5", fontWeight: 800, marginBottom: 4 }}>{w.title}</div>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>{w.text}</div>
              </div>
            ))}
          </div>

          <div style={{ background: bg.card, borderRadius: 12, padding: 20, border: `1px solid ${bg.cardBorder}`, gridColumn: "1 / -1" }}>
            <h3 style={{ color: "#86efac", marginTop: 0 }}>📋 Diagnóstico por rol</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              {scores.radar.map(r => (
                <button
                  key={r.subject}
                  onClick={() => setSelectedDiagnostic(selectedDiagnostic === r.subject ? null : r.subject)}
                  title={`Ver desglose de ${r.subject}`}
                  style={{ textAlign: "left", background: selectedDiagnostic === r.subject ? "#102510" : "#0a150a", borderRadius: 10, padding: 12, border: selectedDiagnostic === r.subject ? "1px solid #22c55e" : "1px solid #1a2e1a", cursor: "pointer", fontFamily: "inherit" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 8 }}>
                    <span style={{ color: "#cbd5e1", fontWeight: 700 }}>{r.subject}</span>
                    <span style={{ color: r.value >= 75 ? "#4ade80" : r.value >= 55 ? "#fbbf24" : "#ef4444", fontFamily: "monospace", fontWeight: 900 }}>{r.value}</span>
                  </div>
                  <ScoreBar value={r.value} color={r.value >= 75 ? "#4ade80" : r.value >= 55 ? "#fbbf24" : "#ef4444"} />
                  <div style={{ color: "#6b7280", fontSize: 10, marginTop: 7 }}>Click para desglose</div>
                </button>
              ))}
            </div>
            {selectedDiagnostic && (() => {
              const detail = getDiagnosticDetail(selectedDiagnostic);
              const radarValue = scores.radar.find(x => x.subject === selectedDiagnostic)?.value;
              return (
                <div style={{ marginTop: 14, background: "#071207", border: "1px solid #22c55e55", borderRadius: 12, padding: 15 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div>
                      <h4 style={{ color: "#86efac", margin: "0 0 6px", fontSize: 18 }}>{detail.title}</h4>
                      <div style={{ color: "#fbbf24", fontFamily: "monospace", fontWeight: 900 }}>Score: {radarValue}/100</div>
                    </div>
                    <button onClick={() => setSelectedDiagnostic(null)} style={{ background: "#0d2b14", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>Cerrar</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginTop: 12 }}>
                    <div style={{ color: "#cbd5e1", lineHeight: 1.6 }}><b style={{ color: "#fff" }}>Objetivo:</b><br />{detail.goal}</div>
                    <div style={{ color: "#cbd5e1", lineHeight: 1.6 }}><b style={{ color: "#fff" }}>Por qué da ese puntaje:</b><br />{detail.why}</div>
                    <div style={{ color: "#cbd5e1", lineHeight: 1.6 }}><b style={{ color: "#fff" }}>Cómo lo calcula:</b><br />{detail.formula}</div>
                  </div>
                  {detail.cards?.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ color: "#86efac", fontWeight: 900, marginBottom: 8 }}>Cartas/piezas que influyen:</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {detail.cards.map(x => <span key={x} style={{ background: "#0a150a", border: "1px solid #14532d", color: "#cbd5e1", borderRadius: 999, padding: "5px 9px", fontSize: 12 }}>{x}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <div style={{ background: bg.card, borderRadius: 12, padding: 20, border: `1px solid ${bg.cardBorder}`, gridColumn: "1 / -1" }}>
            <h3 style={{ color: "#86efac", marginTop: 0 }}>🕹️ Plan de partida sugerido</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
              <div style={{ background: "#0a150a", borderRadius: 10, padding: 14 }}>
                <div style={{ color: "#4ade80", fontWeight: 800 }}>Early game</div>
                <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.5 }}>{gamePhases.early}</p>
              </div>
              <div style={{ background: "#0a150a", borderRadius: 10, padding: 14 }}>
                <div style={{ color: "#60a5fa", fontWeight: 800 }}>Mid game</div>
                <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.5 }}>{gamePhases.mid}</p>
              </div>
              <div style={{ background: "#0a150a", borderRadius: 10, padding: 14 }}>
                <div style={{ color: "#fbbf24", fontWeight: 800 }}>Late game</div>
                <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.5 }}>{gamePhases.late}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "recommendations" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "#0d1f0d", borderRadius: 12, padding: "16px 20px", border: "1px solid #14532d", fontSize: 13, color: "#86efac", lineHeight: 1.6 }}>
              💡 Las mejoras salen de los agujeros estructurales detectados. No son una lista fija: cambian según roles, curva y arquetipo del mazo.
            </div>
            {recommendations.map((r, i) => (
              <div key={i} style={{ background: bg.card, borderRadius: 12, padding: "18px 20px", border: `1px solid ${bg.cardBorder}`, display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 16, alignItems: "center" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#0d2b14", display: "flex", alignItems: "center", justifyContent: "center", color: "#4ade80", fontWeight: 900, fontFamily: "monospace", fontSize: 14, border: "1px solid #14532d" }}>{String(i + 1).padStart(2, "0")}</div>
                <div>
                  <div style={{ fontWeight: 700, color: "#f8fafc", fontSize: 15, marginBottom: 4 }}>{r.card}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>{r.reason}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>{r.options?.map(o => <Tag key={o} label={o} />)}</div>
                </div>
                <div style={{ padding: "4px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: `${priorityColor[r.priority]}22`, color: priorityColor[r.priority], border: `1px solid ${priorityColor[r.priority]}44`, textAlign: "center" }}>{r.priority}</div>
              </div>
            ))}
          </div>

          <div style={{ background: bg.card, borderRadius: 12, padding: 20, border: `1px solid ${bg.cardBorder}` }}>
            <h3 style={{ color: "#fbbf24", marginTop: 0 }}>✂️ Primeros slots revisables</h3>
            <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.5 }}>No son cortes obligatorios. Son cartas que el algoritmo considera más revisables por bajo rol, coste alto o menor importancia estructural.</p>
            {cutCandidates.slice(0, 8).map(({ card, score, roles, reasons }, i) => (
              <div key={card.key} style={{ display: "flex", gap: 10, alignItems: "center", background: "#0a150a", borderRadius: 8, padding: 10, marginBottom: 8, border: "1px solid #1a2e1a" }}>
                {card.smallImage && <img src={card.smallImage} style={{ width: 44, borderRadius: 5 }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#fff", fontWeight: 700 }}>{i + 1}. {card.name}</div>
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>{roles.join(", ") || "Sin rol claro"}</div>
                  <div style={{ color: "#6b7280", fontSize: 11, marginTop: 2 }}>{reasons?.slice(0, 2).join(" · ") || "revisar impacto real en mesa"}</div>
                </div>
                <div style={{ color: score >= 35 ? "#ef4444" : score >= 15 ? "#fbbf24" : "#6b7280", fontFamily: "monospace", fontWeight: 800 }}>{score}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "swap" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 14 }}>
          <div style={{ background: bg.card, borderRadius: 12, padding: 20, border: `1px solid ${bg.cardBorder}` }}>
            <h3 style={{ color: "#86efac", marginTop: 0 }}>Cartas que querés meter</h3>

            {visibleAutoAddRecommendations.length > 0 && (
              <div style={{ background: "#071207", border: "1px solid #14532d", borderRadius: 12, padding: 12, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 10 }}>
                  <div>
                    <div style={{ color: "#86efac", fontWeight: 900 }}>Sugerencias automáticas para este mazo</div>
                    <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>Cartas que no tenés y que la app detecta como posibles inclusiones por roles faltantes, arquetipo o combos casi completos. Filtradas por identidad de color del comandante cuando Scryfall carga el dato.</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
                  {visibleAutoAddRecommendations.slice(0, 12).map(suggestion => {
                    const data = suggestionCardData[normalizeName(suggestion.name)];
                    return (
                      <button
                        key={`${suggestion.area}-${suggestion.name}`}
                        onClick={() => addWantedCard(suggestion.name)}
                        onMouseEnter={(e) => { if (data?.image) { setPreviewCard({ ...data, qty: 1 }); setPreviewPos({ x: e.clientX, y: e.clientY }); } }}
                        onMouseMove={(e) => { if (data?.image) setPreviewPos({ x: e.clientX, y: e.clientY }); }}
                        onMouseLeave={() => setPreviewCard(null)}
                        title={suggestion.reason}
                        style={{ textAlign: "left", background: "#0a150a", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 10, padding: 8, cursor: "pointer", display: "flex", gap: 9, alignItems: "center", minHeight: 84, fontFamily: "inherit" }}
                      >
                        <div style={{ width: 48, height: 67, borderRadius: 6, overflow: "hidden", background: "#020802", border: "1px solid #14532d", flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", fontSize: 9 }}>
                          {data?.smallImage || data?.image ? <img src={data.smallImage || data.image} alt={suggestion.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "Img"}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: "#fff", fontWeight: 900, fontSize: 13, lineHeight: 1.25 }}>+ {suggestion.name}</div>
                          <div style={{ color: "#86efac", fontSize: 11, marginTop: 3 }}>{suggestion.area}</div>
                          <div style={{ color: "#6b7280", fontSize: 10, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{data?.manaCost || data?.typeLine || "Scryfall"}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ background: "#0a150a", border: "1px solid #14532d", borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <div style={{ color: "#cbd5e1", fontSize: 13, marginBottom: 8 }}>Buscar y seleccionar carta</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  value={wantedSearch}
                  onChange={e => setWantedSearch(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      searchWantedCard();
                    }
                  }}
                  placeholder="Escribí una carta, ej: Skullclamp"
                  style={{ flex: 1, minWidth: 220, background: "#050d05", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 8, padding: "10px 12px", outline: "none" }}
                />
                <button onClick={searchWantedCard} style={{ background: "#14532d", color: "#86efac", border: "1px solid #22c55e", borderRadius: 8, padding: "10px 14px", cursor: "pointer", fontWeight: 800 }}>
                  Buscar
                </button>
                <button onClick={() => addWantedCard(wantedSearch)} style={{ background: "#0d2b14", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 8, padding: "10px 14px", cursor: "pointer", fontWeight: 800 }}>
                  Añadir texto
                </button>
              </div>
              <div style={{ color: "#6b7280", fontSize: 12, marginTop: 8 }}>{wantedSearchStatus}</div>
              {wantedSuggestions.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                  {wantedSuggestions.map(s => (
                    <button key={s} onClick={() => addWantedCard(s)} style={{ background: "#102510", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 999, padding: "6px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                      + {s}
                    </button>
                  ))}
                </div>
              )}
              {selectedWantedCards.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ color: "#86efac", fontSize: 12, marginBottom: 6 }}>Seleccionadas:</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
                    {selectedWantedCards.map(card => {
                      const data = suggestionCardData[normalizeName(card)];
                      return (
                        <button
                          key={card}
                          onClick={() => removeWantedCard(card)}
                          onMouseEnter={(e) => { if (data?.image) { setPreviewCard({ ...data, qty: 1 }); setPreviewPos({ x: e.clientX, y: e.clientY }); } }}
                          onMouseMove={(e) => { if (data?.image) setPreviewPos({ x: e.clientX, y: e.clientY }); }}
                          onMouseLeave={() => setPreviewCard(null)}
                          title="Click para quitar"
                          style={{ background: "#1a3a1a", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 10, padding: 7, cursor: "pointer", fontSize: 12, display: "flex", gap: 8, alignItems: "center", textAlign: "left", fontFamily: "inherit" }}
                        >
                          <div style={{ width: 38, height: 53, borderRadius: 5, overflow: "hidden", background: "#020802", border: "1px solid #14532d", flex: "0 0 auto" }}>
                            {data?.smallImage || data?.image ? <img src={data.smallImage || data.image} alt={card} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ color: "#fff", fontWeight: 800, lineHeight: 1.2 }}>{card}</div>
                            <div style={{ color: "#fca5a5", fontSize: 10, marginTop: 2 }}>Quitar ✕</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div style={{ color: "#cbd5e1", fontSize: 13, margin: "12px 0 8px" }}>O pegá varias manualmente</div>
            <textarea
              value={wantedCards}
              onChange={e => setWantedCards(e.target.value)}
              placeholder={`Skullclamp
Tendershoot Dryad
Mycoloth`}
              style={{ width: "100%", height: 160, background: "#050d05", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 12, padding: 14, fontFamily: "monospace", fontSize: 12, outline: "none" }}
            />
            <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.5 }}>
              La app intenta inferir el rol de cada carta nueva y evita cortar commander, tierras, Sol Ring, Arcane Signet y piezas estructurales salvo que sobren de verdad.
            </p>
          </div>
          <div style={{ background: bg.card, borderRadius: 12, padding: 20, border: `1px solid ${bg.cardBorder}` }}>
            <h3 style={{ color: "#86efac", marginTop: 0 }}>Cortes sugeridos por carta</h3>
            {[...selectedWantedCards, ...parseWantedList(wantedCards)].length === 0 && <div style={{ color: "#94a3b8" }}>Seleccioná o escribí cartas a meter para ver sugerencias.</div>}
            {[...new Set([...selectedWantedCards, ...parseWantedList(wantedCards)])].map(wanted => {
              const wantedRole = inferWantedCardRole(wanted);
              const candidates = getCutCandidatesForWanted(cards, wanted, 5);
              return (
                <div key={wanted} style={{ background: "#0a150a", borderRadius: 10, padding: 14, marginBottom: 12, border: "1px solid #14532d" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 10 }}>
                    <div style={{ color: "#fff", fontWeight: 800 }}>Para meter: {wanted}</div>
                    <Tag label={wantedRole} color={ROLE_COLORS[wantedRole] || "#86efac"} />
                  </div>
                  {candidates.map(({ card, score, roles, reasons }, i) => (
                    <div key={`${wanted}-${card.key}`} style={{ display: "flex", gap: 10, alignItems: "center", background: "#071007", borderRadius: 8, padding: 10, marginBottom: 8 }}>
                      {card.smallImage && <img src={card.smallImage} style={{ width: 44, borderRadius: 5 }} />}
                      <div style={{ flex: 1 }}>
                        <div style={{ color: "#fff", fontWeight: 700 }}>{i + 1}. {card.name}</div>
                        <div style={{ color: "#94a3b8", fontSize: 12 }}>{roles.join(", ") || "Sin rol claro"}</div>
                        <div style={{ color: "#6b7280", fontSize: 11 }}>Motivo: {reasons?.slice(0, 2).join(" · ") || `slot revisable por score ${score}`}. Confirmar manualmente antes de cortar.</div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "cards" && (
        <div>
          <div style={{ background: bg.card, borderRadius: 12, padding: 16, border: `1px solid ${bg.cardBorder}`, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h3 style={{ color: "#86efac", margin: 0 }}>{filterTitle(activeFilter)}</h3>
              <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>{filteredCards.reduce((a, c) => a + c.qty, 0)} cartas mostradas</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                value={cardSearch}
                onChange={e => setCardSearch(e.target.value)}
                placeholder="Buscar carta..."
                style={{ background: "#050d05", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 8, padding: "8px 10px", outline: "none", minWidth: 180 }}
              />
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                style={{ background: "#050d05", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 8, padding: "8px 10px", outline: "none" }}
              >
                {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                style={{ background: "#050d05", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 8, padding: "8px 10px", outline: "none" }}
              >
                {allRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              {(activeFilter || cardSearch || typeFilter !== "Todos" || roleFilter !== "Todos") && (
                <button onClick={clearAllCardFilters} style={{ background: "#0d2b14", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontWeight: 700 }}>
                  Limpiar filtro
                </button>
              )}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14 }}>
            {filteredCards.map(c => <div key={c.key} style={{ background: bg.card, borderRadius: 12, padding: 10, border: `1px solid ${bg.cardBorder}` }}>
              {c.image ? <img src={c.image} style={{ width: "100%", borderRadius: 10, display: "block" }} /> : <div style={{ height: 230, borderRadius: 10, background: "#050d05", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", textAlign: "center" }}>Sin imagen<br />Cargá Scryfall</div>}
              <div style={{ marginTop: 8, color: "#fff", fontWeight: 800, fontSize: 13 }}>{c.qty}x {c.name}</div>
              <div style={{ color: "#94a3b8", fontSize: 11 }}>{c.typeLine || c.type}</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>{getEffectiveRoles(c).slice(0, 4).map(r => <Tag key={r} label={r} />)}</div>
            </div>)}
          </div>
        </div>
      )}

      {previewCard?.image && (
        <div
          className="card-preview-flyout"
          style={{
            position: "fixed",
            left: Math.min((typeof window !== "undefined" ? window.innerWidth : 1400) - 340, previewPos.x + 22),
            top: Math.min((typeof window !== "undefined" ? window.innerHeight : 900) - 470, previewPos.y + 18),
            zIndex: 99999,
            pointerEvents: "none",
            width: 318,
            borderRadius: 18,
            padding: 10,
            background: "rgba(2,8,2,0.94)",
            border: "1px solid #22c55e88",
            boxShadow: "0 0 45px rgba(34,197,94,0.32), 0 16px 60px rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
          }}
        >
          <img src={previewCard.image} alt={previewCard.name} style={{ width: "100%", borderRadius: 14, display: "block" }} />
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 14, marginTop: 8 }}>{previewCard.qty}x {previewCard.name}</div>
          <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 3 }}>{previewCard.typeLine || previewCard.type}</div>
        </div>
      )}

      <div style={{ textAlign: "center", color: "#31503a", fontSize: 11, marginTop: 20, fontFamily: "monospace", lineHeight: 1.6 }}>
        DECKFORGE ANALYZER · DASHBOARD · UNIVERSAL · v1.6<br />
        Unofficial fan project. Not affiliated with Wizards of the Coast, Scryfall, EDHREC, Archidekt or Commander Spellbook.
      </div>
      </div>
    </div>
  );
}
