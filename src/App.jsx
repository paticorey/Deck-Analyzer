import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";

/*
  DeckForge Analyzer v3.1
  - Keeps the visual UI of the original prototype.
  - Starts empty.
  - Allows pasting a decklist.
  - Calculates types, curve, roles, overall score and bracket.
  - Supports manual tags [Ramp], [Draw], [Blink], [Goad], etc.
  - Can enrich with Scryfall for mana value, type line, color identity and images.
*/

const APP_VERSION = "v3.1";


const LANGUAGE_OPTIONS = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "zh-CN", label: "中文" },
  { code: "ar", label: "العربية" },
];

function setTranslateCookie(targetLanguage) {
  if (typeof document === "undefined") return;
  const hostname = window.location.hostname;
  const cookieValue = targetLanguage && targetLanguage !== "en" ? `/en/${targetLanguage}` : "";
  const expires = targetLanguage === "en" ? "Thu, 01 Jan 1970 00:00:00 GMT" : "Fri, 31 Dec 9999 23:59:59 GMT";
  const domains = ["", hostname, hostname.split(".").slice(-2).join(".")].filter(Boolean);
  for (const domain of domains) {
    document.cookie = `googtrans=${cookieValue}; expires=${expires}; path=/;${domain ? ` domain=${domain};` : ""}`;
  }
}

function applyGoogleTranslateLanguage(targetLanguage) {
  if (typeof window === "undefined") return false;
  const combo = document.querySelector(".goog-te-combo");
  if (!combo) return false;
  combo.value = targetLanguage === "en" ? "" : targetLanguage;
  combo.dispatchEvent(new Event("change"));
  return true;
}

const CARD_TYPE_COLORS = {
  Commander: "#22c55e",
  Creatures: "#4ade80",
  Sorceries: "#a78bfa",
  Lands: "#4b5563",
  Instants: "#60a5fa",
  Artifacts: "#fbbf24",
  Enchantments: "#f472b6",
  Planeswalker: "#34d399",
  Other: "#94a3b8",
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
  "-1/-1 Counters": "#a3e635",
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
  Ramp: "Accelerates mana: rocks, dorks, land ramp, Treasures, or extra land drops.",
  Draw: "Card draw or card advantage: draw, investigate, Clues, or effects that put cards in hand.",
  Removal: "Single-target interaction against threats: destroy, exile, bounce, fight, or targeted damage.",
  "Board Wipe": "Global wipe: destroys/exiles many creatures or permanents, global damage, or mass -X/-X.",
  Counterspell: "Counterspells or answers to abilities on the stack.",
  Protection: "Protects key pieces: hexproof, indestructible, phase out, boots, ward, or similar effects.",
  Tutor: "Searches your library for cards other than basic lands/land ramp.",
  Tokens: "Creates tokens or has a strong token function.",
  "Sac Outlet": "Lets you sacrifice creatures/permanents as a cost or repeatable engine.",
  Untap: "Untaps permanents or enables loops with creatures/artifacts that tap.",
  Evasion: "Helps damage connect: flying, trample, menace, unblockable, etc.",
  Drain: "Makes opponents lose life, often tied to aristocrats, lifegain, or sacrifice.",
  Lifegain: "Gains life or converts events into life gain.",
  Recursion: "Returns cards from graveyard to hand/library or lets you reuse them.",
  Reanimator: "Returns creatures directly from graveyard to battlefield.",
  Voltron: "Improves a creature/commander with Auras, buffs, or a commander-damage plan.",
  Equipment: "Equipment or explicit synergy with Equipment/equipped creatures.",
  Blink: "Exiles and returns permanents to repeat ETBs, protect, or reuse effects.",
  ETB: "Has or rewards enters-the-battlefield effects.",
  Spellslinger: "Rewards casting/copying instants and sorceries or building around them.",
  Artifacts: "Real artifact synergy, not merely being an artifact/ramp rock.",
  Enchantress: "Synergy with enchantments, Auras, or constellation.",
  Tribal: "Relies on creature types, lords, or kindred effects.",
  Counters: "Places, moves, doubles, or benefits from counters, mostly +1/+1.",
  "-1/-1 Counters": "Places or exploits -1/-1 counters, blight, wither, infect, persist, or proliferating those counters.",
  Proliferate: "Proliferates counters on permanents/players.",
  Stax: "Limits player actions: cannot cast, cannot untap, taxes, etc.",
  Goad: "Forces opposing creatures to attack other players if able.",
  Theft: "Steals/controls cards or lets you play opponents' cards.",
  "Extra Turns": "Gives extra turns.",
  "Mass Land Denial": "Destroys/denies lands or massively locks mana resources.",
  "Game Changer": "High-impact Game Changer card used to estimate bracket.",
  "Fast Mana": "Explosive acceleration beyond normal ramp.",
  Combo: "Piece that enables wins or decisive loops.",
  Finisher: "Card that helps close the game: X-spells, overrun effects, mass damage, wincons.",
  Land: "Land or card used mainly as a mana source.",
  Other: "Role not classified yet.",
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
    power: "High",
    desc: "When an opponent loses life, you gain life; Sanguine Bond makes them lose life again and the loop repeats.",
    steps: [
      "Control Exquisite Blood and Sanguine Bond.",
      "Make an opponent lose life or gain life from any source.",
      "El trigger de una pieza dispara la otra y el bucle se repite."
    ],
    prerequisites: ["You need to start the loop with a life-loss or life-gain event."],
  },
  {
    name: "Exquisite Blood + Dina, Soul Steeper",
    pieces: ["Exquisite Blood", "Dina, Soul Steeper"],
    type: "Infinite lifedrain",
    effects: ["Infinite lifegain", "Infinite lifedrain", "Win line"],
    power: "High",
    desc: "Dina hace perder vida al ganar vida; Exquisite Blood vuelve a ganar vida y el loop se repite.",
    steps: [
      "Control Dina and Exquisite Blood.",
      "Gain life from any source.",
      "Dina makes each opponent lose life and Exquisite Blood makes you gain life again. Repeat."
    ],
    prerequisites: ["You need to start the loop by gaining life."],
  },
  {
    name: "Ashaya, Soul of the Wild + Quirion Ranger",
    pieces: ["Ashaya, Soul of the Wild", "Quirion Ranger"],
    type: "Infinite untap / ETB-style loop",
    effects: ["Infinite ETB", "Infinite landfall triggers", "Infinite LTB", "Infinite storm count"],
    power: "High",
    desc: "Ashaya makes non-token creatures Forests; Quirion Ranger can return itself to untap another creature.",
    steps: [
      "Control Ashaya and Quirion Ranger.",
      "Activate Quirion Ranger by returning itself to your hand to untap target creature.",
      "Cast Quirion Ranger again and repeat the process."
    ],
    prerequisites: ["You control a non-token creature that can be untapped.", "Quirion Ranger must not have summoning sickness if you need to tap it for another line."],
  },
  {
    name: "Selvala, Heart of the Wilds + Umbral Mantle",
    pieces: ["Selvala, Heart of the Wilds", "Umbral Mantle"],
    type: "Infinite mana / infinite power",
    effects: ["Infinite green mana", "Infinite creature power", "Infinite untap"],
    power: "High",
    desc: "If Selvala generates at least 4 mana, Umbral Mantle lets you untap her and give her +2/+2, increasing the mana she produces.",
    steps: [
      "Equip Umbral Mantle to Selvala.",
      "Activate Selvala to add mana equal to the greatest power among creatures you control.",
      "Pay 3 to untap Selvala with Umbral Mantle and give her +2/+2.",
      "Repeat to generate infinite mana and infinite power."
    ],
    prerequisites: ["Selvala must be able to tap.", "The greatest power among creatures you control must be 4 or more when you start."],
  },
  {
    name: "Ivy Lane Denizen + Herd Baloth",
    pieces: ["Ivy Lane Denizen", "Herd Baloth"],
    type: "Infinite tokens / counters",
    effects: ["Infinite creature tokens", "Infinite +1/+1 counters", "Infinite ETB"],
    power: "Medium-High",
    desc: "Cada contador +1/+1 en Herd Baloth crea una Bestia verde, que dispara Ivy Lane Denizen para poner otro contador.",
    steps: [
      "Control Ivy Lane Denizen and Herd Baloth.",
      "Put a +1/+1 counter on Herd Baloth.",
      "Herd Baloth crea una ficha verde 4/4.",
      "The token triggers Ivy Lane Denizen, putting another counter on Herd Baloth. Repeat."
    ],
    prerequisites: ["You need to start the loop by putting a +1/+1 counter on Herd Baloth."],
  },
  {
    name: "Thassa's Oracle + Demonic Consultation",
    pieces: ["Thassa's Oracle", "Demonic Consultation"],
    type: "Win the game",
    effects: ["Win the game", "Library exile"],
    power: "cEDH",
    desc: "Exilia la biblioteca y gana con el trigger de Oracle.",
    steps: ["Cast Thassa's Oracle.", "With the trigger on the stack, cast Demonic Consultation naming a card not in your library.", "Resolve Oracle's trigger and win."],
    prerequisites: ["You need Oracle and Consultation to resolve."],
  },
  {
    name: "Thassa's Oracle + Tainted Pact",
    pieces: ["Thassa's Oracle", "Tainted Pact"],
    type: "Win the game",
    effects: ["Win the game", "Library exile"],
    power: "cEDH",
    desc: "Another compact Oracle line to win immediately.",
    steps: ["Cast Thassa's Oracle.", "With the trigger on the stack, resolve Tainted Pact until your library is empty or nearly empty.", "Resolve Oracle and win."],
    prerequisites: ["The manabase/list must support Tainted Pact with no relevant duplicates."],
  },
  {
    name: "Kiki-Jiki + Zealous Conscripts",
    pieces: ["Kiki-Jiki, Mirror Breaker", "Zealous Conscripts"],
    type: "Infinite tokens",
    effects: ["Infinite hasty tokens", "Combat win"],
    power: "High",
    desc: "Creates infinite hasty copies to win through combat.",
    steps: ["Control Kiki-Jiki and Zealous Conscripts.", "Copy Zealous Conscripts with Kiki-Jiki.", "The copy untaps Kiki-Jiki. Repeat."],
    prerequisites: ["Kiki-Jiki must be able to tap."],
  },
  {
    name: "Isochron Scepter + Dramatic Reversal",
    pieces: ["Isochron Scepter", "Dramatic Reversal"],
    type: "Infinite mana",
    effects: ["Infinite mana", "Infinite untap"],
    power: "High",
    desc: "With enough rocks producing 3+ mana, this generates infinite mana.",
    steps: ["Imprint Dramatic Reversal on Isochron Scepter.", "Use mana rocks to generate at least 3 mana.", "Activate Scepter to untap your nonland permanents. Repeat."],
    prerequisites: ["Your nonland permanents must produce more mana than Scepter costs to activate."],
  },
  {
    name: "Underworld Breach + Lion's Eye Diamond + Brain Freeze",
    pieces: ["Underworld Breach", "Lion's Eye Diamond", "Brain Freeze"],
    type: "Storm / Win",
    effects: ["Storm loop", "Self-mill", "Win line"],
    power: "cEDH",
    desc: "Graveyard and storm loop to mill out or win with Breach lines.",
    steps: ["Control Underworld Breach.", "Use LED and Brain Freeze repeatedly from the graveyard.", "Build storm/mill until you win."],
    prerequisites: ["You need enough cards in your graveyard to escape the spells."],
  },
  {
    name: "Heliod + Walking Ballista",
    pieces: ["Heliod, Sun-Crowned", "Walking Ballista"],
    type: "Infinite damage/lifegain",
    effects: ["Infinite damage", "Infinite lifegain"],
    power: "High",
    desc: "Ballista con lifelink dispara Heliod y vuelve a poner contadores.",
    steps: ["Control Heliod and Walking Ballista with at least two counters.", "Give Ballista lifelink with Heliod.", "Remove a counter to deal damage and gain life.", "Heliod puts a counter back. Repeat."],
    prerequisites: ["Walking Ballista necesita suficientes contadores para iniciar el loop."],
  },
  {
    name: "Mikaeus + Triskelion",
    pieces: ["Mikaeus, the Unhallowed", "Triskelion"],
    type: "Infinite damage",
    effects: ["Infinite damage", "Death loop"],
    power: "High",
    desc: "Triskelion dies and comes back with undying to repeat damage.",
    steps: ["Control Mikaeus and Triskelion.", "Remove counters to deal damage, including to Triskelion.", "Triskelion dies and returns with undying. Repeat."],
    prerequisites: ["Triskelion must not be Human and must be able to die."],
  },
  {
    name: "Scurry Oak + Rosie Cotton",
    pieces: ["Scurry Oak", "Rosie Cotton of South Lane"],
    type: "Infinite tokens/counters",
    effects: ["Infinite tokens", "Infinite counters", "Infinite ETB"],
    power: "Medium-High",
    desc: "Cada token pone contador, que crea otro token y repite.",
    steps: ["Control Scurry Oak and Rosie Cotton.", "Put a +1/+1 counter on Scurry Oak.", "Scurry Oak creates a token, Rosie puts another counter. Repeat."],
    prerequisites: ["You need to start the loop by putting a counter on Scurry Oak."],
  },
  {
    name: "Avacyn + Worldslayer",
    pieces: ["Avacyn, Angel of Hope", "Worldslayer"],
    type: "Mass land denial / Lock",
    effects: ["Destroy all permanents opponents control", "Lock", "Mass land denial"],
    power: "High",
    desc: "Destroys everyone else's permanents while yours are indestructible.",
    steps: ["Control Avacyn and equip Worldslayer to a creature.", "Deal combat damage to a player with that creature.", "Worldslayer destroys all non-indestructible permanents."],
    prerequisites: ["The equipped creature must connect with combat damage."],
  },
  {
    name: "Basalt Monolith + Rings of Brighthearth",
    pieces: ["Basalt Monolith", "Rings of Brighthearth"],
    type: "Infinite mana",
    effects: ["Infinite colorless mana"],
    power: "High",
    desc: "Copies Basalt Monolith's untap ability and generates infinite mana.",
    steps: ["Tap Basalt Monolith to add 3.", "Activate its untap ability and copy it with Rings.", "With the right resolution order, you generate more mana than you spend. Repeat."],
    prerequisites: ["You need initial mana to copy the ability."],
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


const OFFICIAL_ARCHETYPE_REFERENCE = {
  macroSource: "Macro basis: Wizards explicitly uses the macro-archetypes Aggro, Midrange, Control and Combo to read metagames and format health.",
  themeSource: "Theme basis: themes are detected from mechanical deck signals: Oracle text, types, functional roles, piece density and commander ability.",
  commanderSource: "Commander: the commander ability is weighted as build direction, but the decklist wins if it contradicts the plan.",
  edhrecSource: "EDHREC: prepared as a future comparison. For now it is not scraped and no data is invented.",
  macroArchetypes: ["Aggro", "Midrange", "Control", "Combo"],
};

const COMMANDER_THEME_HINTS = {
  "high perfect morcant": {
    mainTheme: "-1/-1 Counters",
    macroBias: "Midrange / Combo",
    weight: 38,
    evidence: ["High Perfect Morcant"],
    reason: "The commander blights and proliferates; that makes -1/-1 counters the real deck axis, not just support."
  },
  "hapatra, vizier of poisons": {
    mainTheme: "-1/-1 Counters",
    macroBias: "Midrange / Combo",
    weight: 42,
    evidence: ["Hapatra, Vizier of Poisons"],
    reason: "Hapatra directly rewards placing -1/-1 counters by creating tokens; tokens/drain are usually subplans."
  },
  "dina, soul steeper": {
    mainTheme: "Lifegain / Drain",
    macroBias: "Midrange / Combo",
    weight: 30,
    evidence: ["Dina, Soul Steeper"],
    reason: "Dina turns lifegain into drain; sacrifice can appear, but it is not always the main plan."
  },
  "giada, font of hope": {
    mainTheme: "Tribal / Typal",
    macroBias: "Midrange",
    weight: 36,
    evidence: ["Giada, Font of Hope"],
    reason: "Giada scales Angels and pushes a typal big-creature counter plan."
  },
  "selvala, heart of the wilds": {
    mainTheme: "Big Mana",
    macroBias: "Midrange / Combo",
    weight: 34,
    evidence: ["Selvala, Heart of the Wilds"],
    reason: "Selvala converts big creatures into mana and cards, typical of Big Mana with a combo ceiling."
  },
  "yuriko, the tiger's shadow": {
    mainTheme: "Tribal / Typal",
    macroBias: "Aggro / Combo",
    weight: 34,
    evidence: ["Yuriko, the Tiger's Shadow"],
    reason: "Yuriko pushes Ninjas/evasion and top manipulation as the central plan."
  },
  "muldrotha, the gravetide": {
    mainTheme: "Graveyard Value",
    macroBias: "Midrange",
    weight: 34,
    evidence: ["Muldrotha, the Gravetide"],
    reason: "Muldrotha uses the graveyard as a second hand, above incidental recursion."
  }
};

function getCommanderThemeHint(commanderName) {
  const key = normalizeName(commanderName || "");
  if (!key) return null;
  return COMMANDER_THEME_HINTS[key] || Object.entries(COMMANDER_THEME_HINTS).find(([name]) => key.includes(name) || name.includes(key))?.[1] || null;
}

function cleanDisplayCardName(label) {
  return String(label || "")
    .replace(/^\s*\d+x\s+/i, "")
    .replace(/^Combo:\s*/i, "")
    .replace(/\s*·.*$/i, "")
    .trim();
}

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

function inferTypeFromSection(section, fallback = "Other") {
  const lower = normalizeName(section || "");
  if (!lower) return fallback;
  if (lower.includes("commander")) return "Commander";
  if (lower.includes("creature") || lower.includes("criatura")) return "Creatures";
  if (lower.includes("artifact") || lower.includes("artefact")) return "Artifacts";
  if (lower.includes("enchantment") || lower.includes("encant")) return "Enchantments";
  if (lower.includes("instant")) return "Instants";
  if (lower.includes("sorcery") || lower.includes("conjuro") || lower.includes("sortilegio")) return "Sorceries";
  if (lower.includes("planeswalker")) return "Planeswalker";
  if (lower.includes("land") || lower.includes("tierra")) return "Lands";
  return fallback;
}

function normalizeParsedRows(rows) {
  const byName = new Map();
  for (const row of rows) {
    const name = cleanCardName(row.name);
    if (!name) continue;
    const key = normalizeName(name);
    const existing = byName.get(key);
    const type = inferTypeFromSection(row.category, "Other");
    if (existing) {
      existing.qty += row.qty || 1;
      existing.tags = [...new Set([...existing.tags, ...(row.tags || [])])];
      existing.manualTags = existing.tags;
      if (!existing.setCode && row.setCode) existing.setCode = row.setCode;
      if (!existing.collectorNumber && row.collectorNumber) existing.collectorNumber = row.collectorNumber;
      if (existing.type === "Other" && type !== "Other") existing.type = type;
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
    ["creature", "Creatures"], ["creatures", "Creatures"], ["criaturas", "Creatures"],
    ["artifact", "Artifacts"], ["artifacts", "Artifacts"], ["artefactos", "Artifacts"],
    ["enchantment", "Enchantments"], ["enchantments", "Enchantments"], ["encantamientos", "Enchantments"],
    ["instant", "Instants"], ["instants", "Instants"], ["instantaneos", "Instants"], ["instantáneos", "Instants"],
    ["sorcery", "Sorceries"], ["sorceries", "Sorceries"], ["conjuros", "Sorceries"], ["sortilegios", "Sorceries"],
    ["planeswalker", "Planeswalker"], ["planeswalkers", "Planeswalker"],
    ["land", "Lands"], ["lands", "Lands"], ["lands", "Lands"],
    ["mainboard", "Other"], ["sideboard", "Other"], ["maybeboard", "Other"],
  ]);

  let currentType = "Other";
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
  if (t.includes("land")) return "Lands";
  if (t.includes("creature")) return "Creatures";
  if (t.includes("artifact")) return "Artifacts";
  if (t.includes("enchantment")) return "Enchantments";
  if (t.includes("instant")) return "Instants";
  if (t.includes("sorcery")) return "Sorceries";
  if (t.includes("planeswalker")) return "Planeswalker";
  return card.type;
}

function detectRoles(card) {
  const roles = new Set(card.manualTags || []);
  const name = card.name || "";
  const key = normalizeName(name);
  const oracle = (card.oracle || "").toLowerCase();
  const type = (card.typeLine || "").toLowerCase();
  const isLandCard = card.type === "Lands" || type.includes("land");
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

  // 2) Draw / card advantage. No cuenta loot puro como draw si solo descard sin advantage, pero sí lo etiqueta como Draw si roba.
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

  // 6) Protection. Ward por sí solo cuenta como protection ligera, pero no debería dominar el archetype.
  if (hasOracle("gains hexproof", "gain hexproof", "gains indestructible", "gain indestructible", "protection from", "phase out", "phases out", "prevent all damage", "regenerate target", "ward")) roles.add("Protection");
  if (hasName("swiftfoot boots", "lightning greaves", "heroic intervention", "teferi's protection", "malakir rebirth", "tamiyo's safekeeping")) roles.add("Protection");

  // 7) Tutor. Los tutores de lands ya cuentan como ramp; acá filtramos tutores no-tierra.
  if (hasOracle("search your library") && !hasOracle("basic land", "land card", "forest card", "plains card", "island card", "swamp card", "mountain card")) roles.add("Tutor");
  if (STRONG_TUTORS.has(key)) roles.add("Tutor");

  // 8) Tokens. Distingue producción de tokens de cards que solo mencionan tokens.
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

  // 16) Tribal. Requiere referencias claras a type de criatura o lord effects.
  if (hasOracle("choose a creature type", "kindred", "creatures you control of the chosen type", "other creatures you control get", "creature type you control", "share a creature type")) roles.add("Tribal");

  // 17) Counters / Proliferate.
  if (hasOracle("+1/+1 counter", "+1/+1 counters", "-1/-1 counter", "-1/-1 counters", "counter on", "counters on", "double the number of counters", "move a counter", "blight", "blights", "wither", "persist", "infect")) roles.add("Counters");
  if (hasOracle("proliferate")) roles.add("Proliferate");
  if (hasOracle("-1/-1 counter", "-1/-1 counters", "put a -1/-1", "blight", "blights", "wither", "persist", "infect")) roles.add("-1/-1 Counters");

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

  // Las lands no deben inflar Ramp aunque su texto produzca maná.
  if (isLandCard) {
    roles.delete("Ramp");
    roles.add("Land");
  }

  return [...roles].filter(Boolean);
}

function estimateCmcFallback(card) {
  if (card.type === "Lands" || card.type === "Commander") return 0;
  return null;
}

async function fetchScryfallCard(cardOrName) {
  const card = typeof cardOrName === "string" ? { name: cardOrName } : cardOrName;
  const rawName = cleanDisplayCardName(card?.name || "").replace(/\s*\/\/.+$/g, "").trim();
  if (card?.setCode && card?.collectorNumber) {
    const exactUrl = `https://api.scryfall.com/cards/${encodeURIComponent(card.setCode)}/${encodeURIComponent(card.collectorNumber)}`;
    const exactRes = await fetch(exactUrl);
    if (exactRes.ok) return exactRes.json();
  }
  if (!rawName) throw new Error("not found");
  const exactNamedUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(rawName)}`;
  const exactNamedRes = await fetch(exactNamedUrl);
  if (exactNamedRes.ok) return exactNamedRes.json();
  const url = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(rawName)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("not found");
  return res.json();
}


const SCRYFALL_CARD_CACHE_PREFIX = "deckForgeAnalyzer.scryfallCard.v3.";
const SCRYFALL_CARD_CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 30;

function getScryfallCacheKey(cardOrName) {
  const card = typeof cardOrName === "string" ? { name: cardOrName } : cardOrName || {};
  if (card.setCode && card.collectorNumber) return `${String(card.setCode).toLowerCase()}|${String(card.collectorNumber).toLowerCase()}`;
  const clean = cleanDisplayCardName(card.name || "").replace(/\s*\/\/.+$/g, "").trim();
  return normalizeName(clean);
}

function readScryfallCardCache(cacheKey) {
  if (typeof window === "undefined" || !cacheKey) return null;
  try {
    const raw = window.localStorage.getItem(`${SCRYFALL_CARD_CACHE_PREFIX}${cacheKey}`);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (!payload?.data || Date.now() - Number(payload.savedAt || 0) > SCRYFALL_CARD_CACHE_MAX_AGE) return null;
    return payload.data;
  } catch {
    return null;
  }
}

function writeScryfallCardCache(cacheKey, data) {
  if (typeof window === "undefined" || !cacheKey || !data) return;
  try {
    window.localStorage.setItem(`${SCRYFALL_CARD_CACHE_PREFIX}${cacheKey}`, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // LocalStorage can fill up; failing cache writes should never break the analyzer.
  }
}

async function fetchScryfallCardCached(cardOrName) {
  const key = getScryfallCacheKey(cardOrName);
  const cached = readScryfallCardCache(key);
  if (cached) return cached;
  const data = await fetchScryfallCard(cardOrName);
  writeScryfallCardCache(key, data);
  return data;
}

function lightweightRelatedTokensFromScryfall(data) {
  return (data?.all_parts || []).filter(isScryfallTokenPart).slice(0, 20).map(part => ({
    id: part.id || part.name,
    name: normalizeTokenName(part.name, part.type_line || part.typeLine),
    typeLine: part.type_line || part.typeLine || "Token",
    oracle: "",
    image: "",
    smallImage: "",
    sourceComponent: part.component || "token",
  }));
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

async function fetchScryfallPrints(cardOrName) {
  const rawName = cleanDisplayCardName(typeof cardOrName === "string" ? cardOrName : cardOrName?.name || "").replace(/\s*\/\/.+$/g, "").trim();
  if (!rawName) return [];
  const query = `!"${rawName.replace(/"/g, '\\"')}"`;
  const url = `https://api.scryfall.com/cards/search?unique=prints&order=released&q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const fallback = await fetchScryfallCard(rawName);
    return fallback ? [fallback] : [];
  }
  const data = await res.json();
  return (data.data || [])
    .filter(card => card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal)
    .slice(0, 80);
}

function sanitizeFilename(value) {
  return String(value || "deck-analysis")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 70) || "deck-analysis";
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
  // Las lands pueden producir maná, pero no queremos que inflen el conteo de Ramp.
  // Ramp cuenta spells/artefactos/criaturas que aceleran, no la manabase normal.
  if (card?.type === "Lands") return roles.filter(role => role !== "Ramp");
  return roles;
}

function getDeckAllowedColors(cards) {
  const commander = getCommander(cards);
  if (commander) return commander.colorIdentity || [];
  const colors = new Set();
  for (const card of cards) {
    if (card.type === "Lands") continue;
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
    if (c.type === "Lands" || c.type === "Commander") continue;
    const cmc = c.cmc ?? estimateCmcFallback(c);
    // Si todavía no cargó Scryfall y no sabemos el CMC, NO lo ponemos como barra gigante "?".
    // Eso distorsionaba toda la curve. Lo contamos aparte en unknownCmcCount().
    if (cmc === null || Number.isNaN(cmc)) continue;
    if (cmc >= 7) buckets.set("7+", buckets.get("7+") + c.qty);
    else buckets.set(String(cmc), buckets.get(String(cmc)) + c.qty);
  }
  return [...buckets.entries()].map(([cmc, count]) => ({ cmc, count })).filter(d => d.count > 0);
}

function unknownCmcCount(cards) {
  return cards
    .filter(c => c.type !== "Lands" && c.type !== "Commander")
    .reduce((acc, c) => {
      const cmc = c.cmc ?? estimateCmcFallback(c);
      return acc + (cmc === null || Number.isNaN(cmc) ? c.qty : 0);
    }, 0);
}

function averageCmc(cards) {
  const nonLands = cards.filter(c => c.type !== "Lands" && c.type !== "Commander" && typeof c.cmc === "number");
  const qty = nonLands.reduce((a, c) => a + c.qty, 0);
  if (!qty) return "?";
  const total = nonLands.reduce((a, c) => a + c.cmc * c.qty, 0);
  return (total / qty).toFixed(2);
}

function detectArchetypes(cards) {
  const roles = aggregateRoles(cards);
  const count = role => roles.find(r => r.role === role)?.count || 0;
  const types = countBy(cards, c => c.type);
  const typeCount = type => types.find(t => t.name === type)?.value || 0;
  const creatures = typeCount("Creatures");
  const instants = typeCount("Instants");
  const sorceries = typeCount("Sorceries");
  const artifacts = typeCount("Artifacts");
  const enchantments = typeCount("Enchantments");
  const commander = getCommander(cards);
  const commanderName = normalizeName(commander?.name || "");
  const commanderText = normalizeName(`${commander?.name || ""} ${commander?.oracle || ""} ${commander?.typeLine || ""}`);
  const avg = Number(averageCmc(cards)) || 0;
  const completedCombos = detectCombos(cards).filter(c => c.complete);
  const compactCombos = completedCombos.filter(c => c.pieces.length <= 2);
  const totalNonLands = cards.filter(c => c.type !== "Lands" && c.type !== "Commander").reduce((a, c) => a + c.qty, 0) || 1;
  const spells = instants + sorceries;

  const roleCount = {
    ramp: count("Ramp"),
    draw: count("Draw"),
    removal: count("Removal"),
    boardWipe: count("Board Wipe"),
    counterspell: count("Counterspell"),
    tokens: count("Tokens"),
    counters: count("Counters"),
    negativeCounters: count("-1/-1 Counters"),
    proliferate: count("Proliferate"),
    recursion: count("Recursion") + count("Reanimator"),
    reanimator: count("Reanimator"),
    sac: count("Sac Outlet"),
    drain: count("Drain"),
    lifegain: count("Lifegain"),
    untap: count("Untap"),
    finisher: count("Finisher"),
    voltron: count("Voltron"),
    equipment: count("Equipment"),
    blink: count("Blink"),
    etb: count("ETB"),
    spellslinger: count("Spellslinger"),
    artifactRole: count("Artifacts"),
    enchantress: count("Enchantress"),
    tribal: count("Tribal"),
    stax: count("Stax"),
    mill: 0,
    tutor: count("Tutor"),
  };

  const lowText = card => normalizeName(`${card.name || ""} ${card.oracle || ""} ${card.typeLine || ""}`);
  const hasAny = (card, needles) => needles.some(n => lowText(card).includes(normalizeName(n)));
  const qtyWhere = predicate => cards.reduce((acc, card) => acc + (predicate(card) ? card.qty : 0), 0);
  const evidenceFor = (predicate, limit = 5) => cards.filter(predicate).map(c => c.name).filter(Boolean).slice(0, limit);
  const textCount = needles => qtyWhere(card => hasAny(card, needles));
  const roleEvidence = roleList => cards
    .filter(card => roleList.some(role => getEffectiveRoles(card).includes(role)))
    .map(card => card.name)
    .slice(0, 5);

  const commanderFlags = {
    selvala: commanderName.includes("selvala, heart of the wilds"),
    dina: commanderName.includes("dina, soul steeper"),
    yuriko: commanderName.includes("yuriko"),
    giada: commanderName.includes("giada, font of hope"),
    muldrotha: commanderName.includes("muldrotha"),
    kenrith: commanderName.includes("kenrith"),
    hapatra: commanderName.includes("hapatra"),
    morcant: commanderName.includes("high perfect morcant") || commanderName.includes("morcant"),
    prosper: commanderName.includes("prosper"),
    brago: commanderName.includes("brago"),
  };
  const commanderHint = getCommanderThemeHint(commander?.name);

  const negativeCounterQty = textCount([
    "-1/-1 counter", "-1/-1 counters", "minus one minus one counter", "wither", "persist", "infect",
    "put a -1/-1", "for each -1/-1", "remove a -1/-1", "creature with a -1/-1", "blight", "blights", "blighted"
  ]) + (commanderFlags.hapatra ? 6 : 0) + (commanderFlags.morcant ? 8 : 0) + (commanderHint?.mainTheme === "-1/-1 Counters" ? Math.round((commanderHint.weight || 0) / 5) : 0);
  const plusCounterQty = Math.max(0, roleCount.counters + roleCount.proliferate - negativeCounterQty);
  const deathMatterQty = textCount(["whenever a creature dies", "whenever another creature dies", "dies,", "dies.", "sacrifice a creature", "sacrifice another creature"]);
  const landfallQty = textCount(["landfall", "whenever a land enters", "put a land", "play an additional land", "from your graveyard"]);
  const millQty = textCount(["mill", "mills", "each opponent mills", "target player mills"]);
  const groupHugQty = textCount(["each player draws", "each player may", "each opponent may", "players can't attack you", "for each opponent"]);
  const bigManaQty = roleCount.ramp + roleCount.untap + (avg >= 3.7 ? 4 : 0) + (commanderFlags.selvala ? 8 : 0);
  roleCount.mill = millQty;

  const themeScores = [];
  const pushTheme = (name, score, evidence = [], notes = []) => {
    if (score < 12) return;
    themeScores.push({
      name,
      score: Math.max(0, Math.min(100, Math.round(score))),
      evidence: [...new Set(evidence.filter(Boolean))].slice(0, 7),
      notes: notes.filter(Boolean).slice(0, 4),
    });
  };

  pushTheme("-1/-1 Counters", negativeCounterQty * 12 + roleCount.negativeCounters * 8 + roleCount.proliferate * 5 + (commanderFlags.hapatra ? 34 : 0) + (commanderFlags.morcant ? 42 : 0) + (commanderHint?.mainTheme === "-1/-1 Counters" ? commanderHint.weight || 0 : 0), evidenceFor(card => hasAny(card, ["-1/-1 counter", "blight", "blights", "wither", "persist", "infect", "proliferate"]) || (commanderName && normalizeName(card.name) === commanderName)), ["Detects cards that place or exploit -1/-1 counters, including blight/wither/infect/persist and proliferate."]);
  pushTheme("+1/+1 Counters", plusCounterQty * 8 + roleCount.proliferate * 7, roleEvidence(["Counters", "Proliferate"]), ["Counts positive-counter payoffs and proliferate."]);
  pushTheme("Aristocrats", roleCount.sac * 13 + roleCount.drain * 10 + deathMatterQty * 5 + roleCount.tokens * 2 + roleCount.recursion * 2 - negativeCounterQty * 10 - (commanderHint?.mainTheme === "-1/-1 Counters" ? 18 : 0), roleEvidence(["Sac Outlet", "Drain", "Tokens", "Recursion"]), [negativeCounterQty >= 4 ? "Penalized because the -1/-1 counters/blight package appears more dominant than pure sacrifice." : "Looks for sac outlets + drain + death triggers."]);
  pushTheme("Lifegain / Drain", roleCount.lifegain * 9 + roleCount.drain * 10 + (commanderFlags.dina ? 22 : 0), roleEvidence(["Lifegain", "Drain"]), ["Separates lifegain/drain from Aristocrats when it does not depend on sacrificing creatures."]);
  pushTheme("Tokens", roleCount.tokens * 8 + (roleCount.finisher >= 2 ? 6 : 0) + (roleCount.sac >= 2 ? 4 : 0), roleEvidence(["Tokens", "Finisher", "Sac Outlet"]), ["Detects token production and cards that convert them into pressure or resources."]);
  pushTheme("Spellslinger", roleCount.spellslinger * 18 + (spells >= 24 ? 24 : spells >= 18 ? 12 : 0), roleEvidence(["Spellslinger", "Draw", "Counterspell"]), [`${spells} instants/sorceries detected.`]);
  pushTheme("Voltron", roleCount.voltron * 14 + roleCount.equipment * 9 + count("Evasion") * 4, roleEvidence(["Voltron", "Equipment", "Evasion", "Protection"]), ["Looks for a protected, evasive commander/big-creature plan."]);
  pushTheme("Reanimator", roleCount.reanimator * 13 + roleCount.recursion * 6 + textCount(["return target creature card from your graveyard to the battlefield", "reanimate", "from your graveyard to the battlefield"]) * 8, roleEvidence(["Reanimator", "Recursion"]), ["Direct reanimation weighs more than simple recursion to hand."]);
  pushTheme("Blink / ETB", roleCount.blink * 15 + roleCount.etb * 6 + (commanderFlags.brago ? 22 : 0), roleEvidence(["Blink", "ETB"]), ["Looks for repeating ETBs or exiling/returning permanents."]);
  pushTheme("Landfall", landfallQty * 8 + (roleCount.ramp >= 9 ? 8 : 0), evidenceFor(card => hasAny(card, ["landfall", "whenever a land enters", "play an additional land", "from your graveyard"])), ["Counts land triggers, land recursion, and extra land plays."]);
  pushTheme("Artifacts", roleCount.artifactRole * 15 + Math.max(0, artifacts - roleCount.ramp) * 2, roleEvidence(["Artifacts", "Combo", "Ramp"]), ["Does not automatically count all mana rocks as an artifact theme."]);
  pushTheme("Enchantress", roleCount.enchantress * 16 + enchantments * 2, roleEvidence(["Enchantress"]), ["Looks for enchantments, Auras, constellation, or enchantress-type payoffs."]);
  pushTheme("Tribal / Typal", roleCount.tribal * 16 + (creatures >= 32 ? 11 : 0) + (commanderFlags.giada || commanderFlags.yuriko ? 22 : 0), roleEvidence(["Tribal"]), ["Looks at lord effects, creature types, and tribal density."]);
  pushTheme("Stax", roleCount.stax * 17 + textCount(["players can't", "opponents can't", "doesn't untap", "skip", "tax", "unless they pay"]) * 4, roleEvidence(["Stax"]), ["Identifies taxes, locks, and action restrictions."]);
  pushTheme("Group Hug", groupHugQty * 7, evidenceFor(card => hasAny(card, ["each player draws", "each player may", "each opponent may"])), ["Detects symmetrical or political effects that help the table."]);
  pushTheme("Mill", millQty * 9, evidenceFor(card => hasAny(card, ["mill", "mills"])), ["Detects mill as a real plan, not just incidental self-mill."]);
  pushTheme("Graveyard Value", roleCount.recursion * 10 + (commanderFlags.muldrotha ? 35 : 0) + textCount(["you may play", "from your graveyard", "escape", "flashback"]) * 3, roleEvidence(["Recursion", "Reanimator", "Sac Outlet"]), ["Graveyard as a second hand or value engine."]);
  pushTheme("Big Mana", bigManaQty * 5 + roleCount.finisher * 5, roleEvidence(["Ramp", "Untap", "Finisher"]), ["High ramp, untap effects, and big costs push toward Big Mana."]);
  pushTheme("Creature Combo", compactCombos.length * 30 + roleCount.untap * 9 + roleCount.tutor * 5 + (commanderFlags.selvala ? 26 : 0), [...new Set([...compactCombos.flatMap(c => c.pieces), ...roleEvidence(["Untap", "Tutor", "Combo"])])], [compactCombos.length ? `${compactCombos.length} compact combo(s) detected.` : "Looks for compact loops and untap/tutor pieces."]);
  pushTheme("Sacrifice", roleCount.sac * 13 + deathMatterQty * 5, roleEvidence(["Sac Outlet", "Recursion", "Tokens"]), ["Sacrifice as an engine, though not necessarily Aristocrats."]);

  if (commanderHint?.mainTheme) {
    const existingHintTheme = themeScores.find(t => t.name === commanderHint.mainTheme);
    if (existingHintTheme) {
      existingHintTheme.score = Math.min(100, Math.round(existingHintTheme.score + (commanderHint.weight || 0) * 0.35));
      existingHintTheme.evidence = [...new Set([...(commanderHint.evidence || []), ...(existingHintTheme.evidence || [])])].slice(0, 7);
      existingHintTheme.notes = [...new Set([commanderHint.reason, ...(existingHintTheme.notes || [])].filter(Boolean))].slice(0, 4);
    } else {
      pushTheme(commanderHint.mainTheme, commanderHint.weight || 30, commanderHint.evidence || [commander?.name].filter(Boolean), [commanderHint.reason]);
    }
  }

  themeScores.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  let mainTheme = themeScores[0]?.name || (creatures >= 28 ? "Creature Value" : "Value / Goodstuff");
  let confidence = themeScores[0]?.score || 55;
  const negativeTheme = themeScores.find(t => t.name === "-1/-1 Counters");
  const aristocratsTheme = themeScores.find(t => t.name === "Aristocrats");
  if (negativeTheme && (commanderHint?.mainTheme === "-1/-1 Counters" || commanderFlags.morcant || commanderFlags.hapatra || negativeTheme.score >= Math.max(55, (aristocratsTheme?.score || 0) * 0.78))) {
    mainTheme = "-1/-1 Counters";
    confidence = Math.max(negativeTheme.score, commanderFlags.morcant ? 92 : commanderFlags.hapatra ? 90 : commanderHint?.mainTheme === "-1/-1 Counters" ? 86 : negativeTheme.score);
  }
  let subThemes = themeScores.filter(t => t.name !== mainTheme).slice(0, 5).filter(t => t.score >= Math.max(28, confidence * 0.40)).map(t => t.name);
  if (mainTheme === "-1/-1 Counters") {
    subThemes = subThemes.filter(t => t !== "Aristocrats" && t !== "Sacrifice");
    if (roleCount.tokens >= 2 && !subThemes.includes("Tokens")) subThemes.unshift("Tokens");
    if ((roleCount.drain >= 1 || roleCount.lifegain >= 1) && !subThemes.includes("Lifegain / Drain")) subThemes.push("Lifegain / Drain");
    subThemes = [...new Set(subThemes)].slice(0, 5);
  }

  const macroScores = [
    { name: "Aggro", score: Math.max(0, creatures * 1.9 + count("Evasion") * 5 + roleCount.voltron * 6 + roleCount.tokens * 2 + (avg > 0 && avg <= 3.0 ? 12 : 0) - roleCount.boardWipe * 4) },
    { name: "Midrange", score: Math.max(0, creatures * 1.3 + roleCount.draw * 4 + roleCount.removal * 4 + roleCount.recursion * 4 + roleCount.ramp * 2 + roleCount.finisher * 3 + (avg >= 2.8 && avg <= 4.2 ? 14 : 0)) },
    { name: "Control", score: Math.max(0, roleCount.counterspell * 10 + roleCount.removal * 5 + roleCount.boardWipe * 10 + roleCount.stax * 7 + roleCount.draw * 3 + (spells >= 22 ? 8 : 0)) },
    { name: "Combo", score: Math.max(0, compactCombos.length * 32 + completedCombos.length * 12 + roleCount.untap * 7 + roleCount.tutor * 8 + roleCount.spellslinger * 5 + (mainTheme === "Creature Combo" ? 30 : 0)) },
  ].sort((a, b) => b.score - a.score);

  const topMacro = macroScores[0] || { name: "Midrange", score: 50 };
  const secondMacro = macroScores[1];
  let macroArchetype = topMacro.name;
  if (secondMacro && secondMacro.score >= Math.max(35, topMacro.score * 0.72)) macroArchetype = `${topMacro.name} / ${secondMacro.name}`;
  if (topMacro.name === "Aggro" && mainTheme === "Tokens") macroArchetype = "Aggro / Tokens";
  if (topMacro.name === "Midrange" && mainTheme === "Creature Combo" && !macroArchetype.includes("Combo")) macroArchetype = "Midrange / Combo";
  if (topMacro.name === "Control" && macroScores.find(x => x.name === "Combo")?.score >= 45 && !macroArchetype.includes("Combo")) macroArchetype = "Control / Combo";
  if (commanderHint?.macroBias && commanderHint.mainTheme === mainTheme) macroArchetype = commanderHint.macroBias;

  const explanation = [];
  const topTheme = themeScores.find(t => t.name === mainTheme);
  explanation.push(OFFICIAL_ARCHETYPE_REFERENCE.macroSource);
  explanation.push(OFFICIAL_ARCHETYPE_REFERENCE.themeSource);
  if (commanderHint?.reason && commanderHint.mainTheme === mainTheme) explanation.push(commanderHint.reason);
  if (topTheme?.notes?.[0]) explanation.push(topTheme.notes[0]);
  if (mainTheme === "-1/-1 Counters") {
    explanation.push("Token/drain payoffs are treated as subplans if they depend on counters, not as Aristocrats by default.");
    explanation.push("The deck wins by accumulating engines, triggers and possible loops; not through pure aggro pressure unless the rest of the cards indicate it.");
  } else if (roleCount.tokens >= 3 && roleCount.drain >= 2 && mainTheme !== "Aristocrats") {
    explanation.push("Tokens and drain appear as support plans, but they do not outweigh the detected main theme.");
  } else if (completedCombos.length) {
    explanation.push(`There are ${completedCombos.length} complete combo(s), so Combo can appear as a macro plan or subplan.`);
  } else if (topMacro.name === "Midrange") {
    explanation.push("The structure seems oriented toward incremental value, interaction and board engines.");
  }
  explanation.push(`Confidence comes from the gap between ${mainTheme} (${confidence}) and the next detected themes.`);

  const whyNot = themeScores.slice(1, 6).map(t => {
    if (t.name === "Aristocrats" && mainTheme === "-1/-1 Counters") return `Aristocrats is not chosen because ${mainTheme} has higher specific density; sacrifice/drain remain support plans.`;
    return `Not choosing ${t.name} as the main theme because its score (${t.score}) is below ${mainTheme} (${confidence}).`;
  });

  const mainName = `${macroArchetype} · ${mainTheme}`;
  const mainResult = {
    name: mainName,
    score: confidence,
    macroArchetype,
    mainTheme,
    subThemes,
    confidence,
    explanation,
    evidenceCards: topTheme?.evidence?.length ? topTheme.evidence : roleEvidence(["Combo", "Draw", "Ramp", "Removal"]).slice(0, 5),
    evidence: topTheme?.evidence?.length ? topTheme.evidence : roleEvidence(["Combo", "Draw", "Ramp", "Removal"]).slice(0, 5),
    themeScores,
    macroScores,
    whyNot,
    edhrecStatus: "EDHREC comparison: pending integration. No data is invented; once real integration exists it will be used as a comparison, not as the only source.",
  };

  const secondaryResults = themeScores.slice(0, 4).map(t => ({
    name: t.name,
    score: t.score,
    evidence: t.evidence,
    mainTheme: t.name,
    confidence: t.score,
  }));

  return [mainResult, ...secondaryResults].slice(0, 5);
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
  const lands = cards.filter(c => c.type === "Lands").reduce((a, c) => a + c.qty, 0);
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

  // Targets adaptados al type de deck. No todos los decks necesitan lo mismo.
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
      { subject: "Interaction", value: Math.round(interaction) },
      { subject: "Win Cons", value: Math.round(wincons) },
      { subject: "Synergy", value: Math.round(synergy) },
      { subject: "Consistency", value: Math.round(consistency) },
      { subject: "Resilience", value: Math.round(protection) },
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
    reasoningCards.push({ title: "Game Changers", cards: gameChangers.map(c => c.name), note: "Decisive cards push the deck toward higher brackets." });
  }
  if (gameChangers.length >= 4) {
    bracket = Math.max(bracket, 4);
    up.push("4+ Game Changers push the deck toward Bracket 4.");
  }
  if (compactCombos.length > 0) {
    bracket = Math.max(bracket, 4);
    up.push(`Compact 2-card combo(s) detected: ${compactCombos.map(c => c.name).join(", ")}`);
    reasoningCards.push({ title: `${compactComboPieces.length} pieces from infinite two-card combos`, cards: compactComboPieces, note: "If these lines are late-game or difficult to assemble, the deck may feel more like Bracket 3; if they are fast or tutor-friendly, they push toward Bracket 4." });
  }
  if (fastMana.length >= 2) {
    bracket = Math.max(bracket, 4);
    up.push(`Fast mana premium: ${fastMana.map(c => c.name).join(", ")}`);
    reasoningCards.push({ title: "Fast mana premium", cards: fastMana.map(c => c.name), note: "Accelerates the deck beyond normal casual pace." });
  }
  if (tutors.length >= 2) {
    bracket = Math.max(bracket, 4);
    up.push(`Varios tutores eficientes: ${tutors.map(c => c.name).join(", ")}`);
    reasoningCards.push({ title: "Tutores eficientes", cards: tutors.map(c => c.name), note: "They greatly increase consistency for finding combos or key pieces." });
  }
  if (mld.length > 0) {
    bracket = Math.max(bracket, 4);
    up.push(`Mass land denial / lock: ${mld.map(c => c.name).join(", ")}`);
    reasoningCards.push({ title: "Mass land denial / lock", cards: mld.map(c => c.name), note: "Este type de efecto suele comunicarse antes de la game." });
  }
  if (extraTurns.length >= 2) {
    bracket = Math.max(bracket, 4);
    up.push(`Extra turns package: ${extraTurns.map(c => c.name).join(", ")}`);
    reasoningCards.push({ title: "Extra turns", cards: extraTurns.map(c => c.name), note: "Chaining extra turns pushes the experience toward high power." });
  }
  if (cedhSignals.length >= 3 && (tutors.length >= 2 || fastMana.length >= 2)) {
    bracket = 5;
    up.push("Clear cEDH signals: compact wincons + tutors/fast mana.");
  }

  if (bracket < 4) {
    const draw = count("Draw");
    const ramp = count("Ramp");
    const interaction = count("Removal") + count("Counterspell") + count("Board Wipe");
    if (draw >= 7 && ramp >= 7 && interaction >= 7) {
      bracket = Math.max(bracket, 3);
      up.push("Solid ramp/draw/interaction structure: upgraded deck above basic precon level.");
    }
  }

  if (gameChangers.length === 0) down.push("No Game Changers detected.");
  if (compactCombos.length === 0) down.push("No compact 2-card combos detected.");
  if (tutors.length === 0) down.push("No premium tutors detected.");
  if (fastMana.length === 0) down.push("No premium fast mana beyond normal ramp.");
  if (count("Draw") < 7) down.push("Card draw below de lo ideal para una lista optimizada.");
  if (count("Protection") < 3) down.push("Low protection for key pieces.");

  const labels = {
    1: "Bracket 1 — Exhibition / Very casual",
    2: "Bracket 2 — Basic / Precon-level",
    3: "Bracket 3 — Improved",
    4: "Bracket 4 — Optimized",
    5: "Bracket 5 — cEDH",
  };

  const shortLabels = {
    1: "Exhibition",
    2: "Basic",
    3: "Improved",
    4: "Optimized",
    5: "cEDH",
  };

  const descriptions = {
    1: "Very casual or exhibition deck, prioritizing theme/flavor over efficiency.",
    2: "Basic casual Commander or precon-level deck, with a playable plan but few high-power pieces.",
    3: "Upgraded deck with solid structure and better cards, but not clearly pushing into high power.",
    4: "High power Commander. Compact combos, Game Changers, tutors, locks, or strong acceleration may appear.",
    5: "cEDH. Built to win with maximum efficiency, compact combos, tutors, fast mana and very little flavor space."
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
  return steps.length ? steps : [raw?.description || raw?.notes || "View details completo en Commander Spellbook."];
}

function cleanPrerequisiteText(value) {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/^[-•]\s*/, "")
    .replace(/^prerequisites?:\s*/i, "")
    .replace(/^requirements?:\s*/i, "")
    .trim();
  if (!text || text === "[object Object]" || text.toLowerCase() === "null" || text.toLowerCase() === "undefined") return "";
  if (/^https?:\/\//i.test(text)) return "";
  return text;
}

function prerequisiteIsGeneric(text) {
  return /revisar requisitos exactos|sin requisitos registrados|ver detalle completo|commander spellbook/i.test(String(text || ""));
}

function uniquePrerequisites(list) {
  const seen = new Set();
  const cleaned = [];
  for (const item of list || []) {
    const text = cleanPrerequisiteText(item);
    if (!text) continue;
    const key = normalizeName(text);
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(text);
  }
  const hasRealPrereq = cleaned.some(x => !prerequisiteIsGeneric(x));
  return hasRealPrereq ? cleaned.filter(x => !prerequisiteIsGeneric(x)) : cleaned;
}

function humanizeSpellbookPrerequisite(text) {
  const t = cleanPrerequisiteText(text);
  if (!t) return "";
  return t;
}

function extractNamedTextFromKeys(raw, keys) {
  if (!raw || typeof raw !== "object") return [];
  const wanted = new Set(keys.map(k => String(k).toLowerCase().replace(/[\s_-]/g, "")));
  const out = [];
  const walk = (obj, depth = 0) => {
    if (!obj || typeof obj !== "object" || depth > 5) return;
    if (Array.isArray(obj)) {
      obj.forEach(x => walk(x, depth + 1));
      return;
    }
    for (const [key, value] of Object.entries(obj)) {
      const k = String(key).toLowerCase().replace(/[\s_-]/g, "");
      if (wanted.has(k) || [...wanted].some(w => k.includes(w))) {
        out.push(...extractTextCandidates(value));
      } else if (value && typeof value === "object") {
        walk(value, depth + 1);
      }
    }
  };
  walk(raw);
  return uniquePrerequisites(out.map(humanizeSpellbookPrerequisite));
}

function extractTextCandidates(value, depth = 0) {
  if (value == null || depth > 4) return [];
  if (typeof value === "string" || typeof value === "number") return [String(value)];
  if (Array.isArray(value)) return value.flatMap(x => extractTextCandidates(x, depth + 1));
  if (typeof value !== "object") return [];

  const out = [];
  const directKeys = [
    "name", "description", "template", "text", "label", "title", "detail", "details",
    "value", "requirement", "condition", "note", "notes", "mana", "mana_cost", "manaCost",
    "prerequisite", "prerequisites", "initialCardState", "initial_card_state", "cardState", "card_state",
    "notablePrerequisites", "notable_prerequisites", "otherPrerequisites", "other_prerequisites"
  ];
  for (const key of directKeys) {
    if (value[key] != null && typeof value[key] !== "object") out.push(String(value[key]));
  }

  if (!out.length) {
    for (const nested of Object.values(value)) {
      if (nested && typeof nested === "object") out.push(...extractTextCandidates(nested, depth + 1));
    }
  }

  return out;
}

function collectDeepPrerequisiteValues(obj, depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 5) return [];
  if (Array.isArray(obj)) return obj.flatMap(x => collectDeepPrerequisiteValues(x, depth + 1));

  const out = [];
  for (const [key, value] of Object.entries(obj)) {
    const k = String(key).toLowerCase().replace(/[\s_-]/g, "");
    const isPrereqKey =
      k.includes("prerequisite") ||
      k.includes("requirement") ||
      k === "requires" ||
      k === "require" ||
      k.includes("condition") ||
      k.includes("setup") ||
      k.includes("constraint") ||
      k.includes("mananeeded") ||
      k.includes("manarequired") ||
      k.includes("manarequirement") ||
      k.includes("initialcardstate") ||
      k.includes("initialstate") ||
      k.includes("cardstate") ||
      k.includes("battlefieldstate") ||
      k.includes("startstate") ||
      k.includes("notableprerequisite") ||
      k.includes("otherprerequisite");

    if (isPrereqKey) out.push(...extractTextCandidates(value));
    else if (value && typeof value === "object") out.push(...collectDeepPrerequisiteValues(value, depth + 1));
  }
  return out;
}

function inferComboPrerequisites(comboOrRaw = {}) {
  const pieces = (comboOrRaw.pieces || extractCsbCards(comboOrRaw) || []).map(String);
  const haystack = [
    comboOrRaw.name,
    comboOrRaw.desc,
    comboOrRaw.description,
    comboOrRaw.notes,
    ...(comboOrRaw.steps || []),
    ...pieces
  ].filter(Boolean).join(" ").toLowerCase();
  const names = new Set(pieces.map(normalizeName));
  const has = (name) => names.has(normalizeName(name)) || haystack.includes(normalizeName(name));

  const reqs = [];

  if (pieces.length) {
    const battlefieldPieces = pieces.filter(Boolean);
    if (battlefieldPieces.length <= 4) {
      reqs.push(`Initial state: ${battlefieldPieces.join(" and ")} ${battlefieldPieces.length === 1 ? "must be" : "must be"} on the battlefield.`);
    }
  }

  if (has("Avacyn, Angel of Hope") && has("Nevinyrral's Disk")) {
    reqs.push("Nevinyrral's Disk must be untapped. Remember it enters tapped, so you normally need to wait a turn or untap it another way.");
    reqs.push("You need to pay {1} and tap Nevinyrral's Disk to activate its ability.");
    reqs.push("Avacyn must still be on the battlefield when the ability resolves so your permanents have indestructible.");
  }

  if (has("Avacyn, Angel of Hope") && has("Worldslayer")) {
    reqs.push("Worldslayer must be attached to a creature that can deal combat damage to a player.");
    reqs.push("Avacyn must be on the battlefield when the Worldslayer trigger resolves to protect your permanents.");
  }

  if (has("Magus of the Disk")) {
    reqs.push("Magus of the Disk must be untapped and able to tap; if it entered this turn, it needs haste or to have started the turn under your control.");
  }

  if (has("Nevinyrral's Disk") && !has("Avacyn, Angel of Hope")) {
    reqs.push("Nevinyrral's Disk must be untapped and you need to pay {1} to activate its ability.");
  }

  if (has("Devoted Druid")) {
    reqs.push("Devoted Druid must be able to tap for {G}; if it entered this turn, it needs haste or to have started the turn under your control.");
    reqs.push("Devoted Druid puts the -1/-1 counter on itself as the cost of its own untap ability.");
  }

  if (has("Devoted Druid") && has("Flourishing Defenses")) {
    reqs.push("Each time Devoted Druid receives the -1/-1 counter, Flourishing Defenses must see that event to create the token.");
  }

  if (has("Devoted Druid") && has("Ivy Lane Denizen")) {
    reqs.push("Ivy Lane Denizen must put the +1/+1 counter on Devoted Druid to offset the -1/-1 counter and repeat the loop.");
  }

  if (has("Kiki-Jiki, Mirror Breaker")) {
    reqs.push("Kiki-Jiki must be able to tap; if it entered this turn, it needs haste.");
  }

  if (has("Selvala, Heart of the Wilds")) {
    reqs.push("Selvala must be able to tap and produce enough mana for the loop to be positive.");
  }

  if (has("Bloom Tender") || has("Faeburrow Elder") || has("Kinnan, Bonder Prodigy")) {
    reqs.push("The creature tapping for mana must be able to tap; if it entered this turn, it needs haste.");
  }

  if (has("Herd Baloth") && has("Ivy Lane Denizen")) {
    reqs.push("You need to start the loop by putting a +1/+1 counter on Herd Baloth.");
  }

  if (has("Scurry Oak") && has("Ivy Lane Denizen")) {
    reqs.push("You need to start the loop by putting a +1/+1 counter on Scurry Oak.");
  }

  if (has("Walking Ballista") && has("Heliod, Sun-Crowned")) {
    reqs.push("Walking Ballista necesita al menos dos contadores +1/+1 y lifelink de Heliod para iniciar el loop.");
  }

  if (has("Thassa's Oracle") && (has("Demonic Consultation") || has("Tainted Pact"))) {
    reqs.push("Thassa's Oracle trigger must resolve with your library empty enough to win.");
  }

  if (/\btap(ping)?\b|\bgirar(se)?\b|\{t\}/i.test(haystack)) {
    reqs.push("Las habilidades con {T}/tap requieren que la criatura o permanente pueda girarse legalmente.");
  }

  return uniquePrerequisites(reqs);
}

function extractCsbPrerequisites(raw, pieces = [], steps = [], desc = "") {
  const directSources = [
    raw?.requires,
    raw?.require,
    raw?.prerequisites,
    raw?.prerequisite,
    raw?.requirements,
    raw?.requirement,
    raw?.conditions,
    raw?.condition,
    raw?.setup,
    raw?.initial_card_state,
    raw?.initialCardState,
    raw?.initial_state,
    raw?.initialState,
    raw?.card_state,
    raw?.cardState,
    raw?.battlefield_state,
    raw?.battlefieldState,
    raw?.notable_prerequisites,
    raw?.notablePrerequisites,
    raw?.other_prerequisites,
    raw?.otherPrerequisites,
    raw?.mana_needed,
    raw?.manaNeeded,
    raw?.mana_required,
    raw?.manaRequired,
    raw?.mana_requirements,
    raw?.manaRequirements,
    raw?.needed_mana,
    raw?.neededMana,
    raw?.variant?.requires,
    raw?.variant?.prerequisites,
    raw?.variant?.requirements,
    raw?.variant?.initial_card_state,
    raw?.variant?.initialCardState,
    raw?.variant?.notable_prerequisites,
    raw?.variant?.notablePrerequisites,
    raw?.combo?.requires,
    raw?.combo?.prerequisites,
    raw?.combo?.requirements,
    raw?.combo?.initial_card_state,
    raw?.combo?.initialCardState,
    raw?.combo?.notable_prerequisites,
    raw?.combo?.notablePrerequisites,
  ].filter(Boolean);

  const extracted = [
    ...directSources.flatMap(x => extractTextCandidates(x)),
    ...collectDeepPrerequisiteValues(raw),
    ...extractNamedTextFromKeys(raw, [
      "initialCardState", "initial_card_state", "initialState", "initial_state", "cardState", "card_state",
      "notablePrerequisites", "notable_prerequisites", "otherPrerequisites", "other_prerequisites"
    ]),
  ].map(humanizeSpellbookPrerequisite);

  const inferred = inferComboPrerequisites({
    ...(raw || {}),
    pieces,
    steps,
    desc,
  });

  const reqs = uniquePrerequisites([...extracted, ...inferred]);
  return reqs.length ? reqs : ["No registered prerequisites; check the Commander Spellbook details."];
}

function getComboPrerequisites(combo) {
  const supplied = Array.isArray(combo?.prerequisites) ? combo.prerequisites.map(humanizeSpellbookPrerequisite) : [];
  const inferred = inferComboPrerequisites(combo || {});
  const reqs = uniquePrerequisites([...supplied, ...inferred]);
  return reqs.length ? reqs : ["No registered prerequisites; check the Commander Spellbook details."];
}

function formatComboPowerLabel(value) {
  const text = String(value || "").trim();
  if (!text) return "Spellbook";
  if (/^ok$/i.test(text)) return "Color OK";
  if (/^legal$/i.test(text)) return "Legal";
  return text;
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
  const desc = raw?.description || raw?.notes || raw?.summary || "Combo detected using the Commander Spellbook database.";
  const steps = extractCsbSteps(raw);
  return {
    name,
    pieces,
    present,
    missing,
    complete,
    type: effects[0] || raw?.type || "Commander Spellbook combo",
    effects: effects.length ? effects : ["Combo detected by Commander Spellbook"],
    power: formatComboPowerLabel(raw?.bracket_tag || raw?.status || raw?.popularity || "Spellbook"),
    desc,
    steps,
    prerequisites: extractCsbPrerequisites(raw, pieces, steps, desc),
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
      if (!variants.length) throw new Error("empty variants");
      return computeSpellbookCombosFromVariants(variants, cards);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Could not load variants.json");
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
  // y permite calcular tanto combos incluidos como combos a una card sin depender de Archidekt.
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
    plan: "accelerate with high-power creatures, use Selvala as a mana/card engine, and close with huge creatures or untap/infinite-mana combos",
    early: "prioritize hands with 2-3 lands, early acceleration, and a high-power creature or piece that enables Selvala well",
    mid: "resolve and protect Selvala, generate explosive mana, and turn that mana into threats, tutors, or combo pieces",
    late: "close with massive combat, Finale/Craterhoof-style effects, or infinite-mana lines like Selvala + Umbral Mantle",
  };
  if (key.includes("dina, soul steeper")) return {
    plan: "turn lifegain and sacrifice into constant drain, using tokens or small creatures as fuel",
    early: "play Dina or cheap lifegain engines and start preparing sacrificeable bodies",
    mid: "assemble drain payoffs with sac outlets or token generation",
    late: "cerrar con drenaje acumulado, Exsanguinate/Aetherflux, o loops de lifegain/drain",
  };
  if (key.includes("yuriko")) return {
    plan: "connect evasive creatures, enable ninjutsu, and manipulate the topdeck to turn high mana-value cards into massive damage",
    early: "look for 1-mana evasive creatures and hands with interaction/topdeck manipulation",
    mid: "mantener pressure con Yuriko y proteger los ataques clave",
    late: "close with big triggers, tempo turns and high mana-value topdecks",
  };
  if (key.includes("giada")) return {
    plan: "curve increasingly large Angels using Giada as both acceleration and a counter source",
    early: "play Giada early and protect her if the hand depends on her",
    mid: "chain efficient Angels and tribal/lifegain draw engines",
    late: "close through flying pressure, anthem effects, and hard-to-remove threats",
  };
  if (text.includes("whenever") && text.includes("token")) return null;
  return null;
}

function buildPlanText(cards) {
  if (!cards.length) return "Paste a decklist to generate the analysis.";
  const commander = getCommander(cards);
  const hint = getCommanderStrategyHint(commander);
  const archetypes = detectArchetypes(cards);
  const primary = archetypes[0]?.name || "Value / Goodstuff";
  const roles = aggregateRoles(cards);
  const count = role => roles.find(r => r.role === role)?.count || 0;
  const compactCombos = detectCombos(cards).filter(c => c.complete && c.pieces.length <= 2);

  if (hint && normalizeName(commander?.name || "").includes("dina, soul steeper")) {
    return "Your Dina plan is an attrition game: play Dina when you can start gaining life or sacrificing creatures, turn every life-gain event into table-wide damage, and use tokens/small creatures as fuel. Early on, keep hands with lands, a lifegain source or cheap bodies, and some way to draw or interact. In the mid game, assemble an engine: Dina plus Blood Artist/Zulaport/Bastion/Sanguine Bond, a sac outlet, and creature generation. You do not need to attack hard: your table pressure comes from every death, every Pest, and every life-gain event draining opponents. Save removal for pieces that stop your engine or threats that can close before you. In the late game, close through accumulated drain, Exsanguinate, Aetherflux Reservoir, Sanguine Bond, or lifegain loops if they appear. The key is not overextending every payoff into wipes: play one or two engines, force answers, and rebuild with recursion.";
  }

  if (hint) {
    return `The plan with ${commander?.name} is to ${hint.plan}. In the early turns, look for a hand that advances that plan, not just individually good cards. In the mid game, try to resolve the commander or main engine with protection/interaction available, then turn the generated mana or value into a real threat. In the late game, choose whether to close through combat, accumulated value, or combo; avoid spending key pieces before they can win or put you far ahead.`;
  }

  if (primary.includes("Aristocrats") || primary.includes("Lifegain")) {
    return "The deck plays like an attrition engine: first develop small creatures, lifegain, and drain pieces; then add sac outlets or token generators so each death becomes damage and value. You do not need to win all at once: each turn should leave the table lower on life and you higher on resources. Prioritize protecting drain payoffs and avoid sacrificing resources without reward. If you have a finisher like Exsanguinate, Aetherflux Reservoir, or Sanguine Bond, cast it when it can close or nearly close the game.";
  }

  if (primary.includes("Big Mana")) {
    return "The deck wants to accelerate faster than the table, resolve a large mana source, and turn it into threats or combos. Your best hands have early ramp, a scaling piece, and a way to protect the explosive turn. Do not spend finishers merely for value: wait until big mana lets you close with a huge threat, an overrun, or a combo line.";
  }

  if (primary.includes("Tokens")) {
    return "The plan is to fill the board and turn quantity into advantage. Tokens should do more than attack: draw, sacrifice, drain, convoke, or close with anthem/overrun effects. The important part is not walking your whole hand into a wipe; develop engines and keep a way to rebuild or finish.";
  }

  if (primary.includes("Spellslinger")) {
    return "The deck wants to play a tempo/value game: set up payoffs, chain instants/sorceries, and keep resources in hand. Do not fire off cantrips without a payoff unless you are digging for something specific. The game is won when your spells start counting twice: drawing, removing, copying, or triggering damage/value.";
  }

  if (compactCombos.length) {
    return `The deck has a real combo line (${compactCombos.map(c => c.name).join("; ")}). The optimal way to play it is to survive and develop resources until you can assemble the line with protection or while the table is tapped out. Until then, use the pieces as value only if it does not compromise the finish.`;
  }

  return "The deck looks like value/midrange: develop the board, trade resources, and win through accumulated advantage. In the early game, prioritize hands with lands, ramp, and an impactful play. In the mid game, try to make each card do more than one thing: draw, remove, generate board presence, or recover resources. In the late game, identify your real finisher; if the game drags on and you are only answering threats, the deck probably needs stronger finishers or engines.";
}

function buildGamePhases(cards) {
  const commander = getCommander(cards);
  const hint = getCommanderStrategyHint(commander);
  if (hint) return { early: hint.early, mid: hint.mid, late: hint.late };
  const primary = detectArchetypes(cards)[0]?.name || "Value";
  if (primary.includes("Aristocrats")) return {
    early: "play cheap bodies, early lifegain/drain pieces, and prepare a sac outlet",
    mid: "assemble creature generators with death payoffs to start draining the table",
    late: "close with accumulated drain, recursion, or an X-spell/finisher",
  };
  if (primary.includes("Spellslinger")) return {
    early: "keep hands with lands, cantrips/ramp, and cheap interaction",
    mid: "resolve payoffs and chain spells without running out of cards",
    late: "close with storm, copies, big burn, or accumulated advantage",
  };
  if (primary.includes("Tokens")) return {
    early: "establish token generators or ramp to start building the board",
    mid: "turn tokens into damage, cards, or resources with payoffs",
    late: "close with anthem, overrun, sacrifice, or drain",
  };
  return {
    early: "prioritize lands, cheap ramp, and early engine pieces; a hand without an early play is often a mulligan",
    mid: "deploy payoffs, hold up interaction, and avoid spending key pieces before generating value",
    late: "close with wincons, accumulated value, or combo; check whether the deck has real ways to end the game",
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
      "More card draw / advantage",
      `Detected ${count("Draw")} draw sources and the target for this deck is approx. ${scores.components.drawTarget}. Without enough draw, the deck depends too much on the opening hand.`,
      "High",
      primary.includes("Big Mana") ? ["Guardian Project", "Beast Whisperer", "Garruk's Uprising", "The Great Henge", "Return of the Wildspeaker"] : GENERIC_UPGRADES.Draw
    );
  }

  if (count("Ramp") < scores.components.rampTarget) {
    add(
      "Ramp",
      "More acceleration",
      `Detected ${count("Ramp")} ramp pieces and the target for this curve/archetype is approx. ${scores.components.rampTarget}.`,
      "High",
      primary.includes("Big Mana") ? ["Nature's Lore", "Three Visits", "Wild Growth", "Utopia Sprawl", "Fanatic of Rhonas"] : GENERIC_UPGRADES.Ramp,
      "0.5-8€"
    );
  }

  if (count("Removal") + count("Counterspell") + count("Board Wipe") < scores.components.interactionTarget) {
    add(
      "Interaction",
      "More flexible answers",
      `Detected ${count("Removal") + count("Counterspell") + count("Board Wipe")} answers. For Commander, around ${scores.components.interactionTarget} or more is usually safer, depending on the table.`,
      "Medium",
      GENERIC_UPGRADES.Removal,
      "0.5-5€"
    );
  }

  if (isCommanderCentric(cards) && count("Protection") < scores.components.protectionTarget) {
    add(
      "Protection",
      "Protect commander/engine",
      `The commander appears important to the plan and there are only ${count("Protection")} protection pieces.`,
      "High",
      primary.includes("Big Mana") ? ["Heroic Intervention", "Tamiyo's Safekeeping", "Tyvar's Stand", "Lightning Greaves", "Swiftfoot Boots"] : GENERIC_UPGRADES.Protection,
      "1-10€"
    );
  }

  if (primary.includes("Big Mana") && count("Untap") < 2) {
    add(
      "Combo / explosiveness",
      "More untap effects",
      "The deck looks like Big Mana/Creature Combo. Effects that untap the commander or mana creatures greatly increase the deck ceiling.",
      "Medium",
      ["Umbral Mantle", "Quirion Ranger", "Scryb Ranger", "Instill Energy", "Patriar's Seal"],
      "variable"
    );
  }

  if ((primary.includes("Tokens") || primary.includes("Aristocrats")) && count("Tokens") >= 3 && count("Draw") < scores.components.drawTarget + 1) {
    add(
      "Tokens + draw",
      "Turn tokens into cards",
      "Since tokens are part of the plan, they should also function as draw or sacrifice fuel.",
      "Medium",
      ["Skullclamp", "Deadly Dispute", "Village Rites", "Moldervine Reclamation"]
    );
  }

  if (primary.includes("Aristocrats") && count("Sac Outlet") < 3) {
    add(
      "Aristocrats",
      "More sac outlets",
      "The Aristocrats plan needs repeatable outlets so death payoffs work when you want, not only when the table allows it.",
      "High",
      ["Viscera Seer", "Carrion Feeder", "Woe Strider", "Yawgmoth, Thran Physician", "Highr of Dementia"]
    );
  }

  if (recs.length === 0) {
    add(
      "Fine tuning",
      "Test dead cards",
      "The overall structure does not show major holes. The next step is to track real games: which cards stay dead in hand and which cards actually win games.",
      "Low",
      []
    );
  }

  return recs.slice(0, 8);
}

function getCmcBucket(card) {
  if (card.type === "Lands" || card.type === "Commander") return null;
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
  if (!filter) return "All cards";
  if (filter.kind === "cmc") return `Cards with mana value ${filter.value}`;
  if (filter.kind === "type") return `Cards de type: ${filter.value}`;
  if (filter.kind === "role") return `Cards con rol/tag: ${filter.value}`;
  return "Cards filtradas";
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
  const lands = cards.filter(c => c.type === "Lands").reduce((a, c) => a + c.qty, 0);
  const interaction = getRoleCount(cards, "Removal") + getRoleCount(cards, "Counterspell") + getRoleCount(cards, "Board Wipe");
  const ramp = getRoleCount(cards, "Ramp");
  const draw = getRoleCount(cards, "Draw");
  const recursion = getRoleCount(cards, "Recursion") + getRoleCount(cards, "Reanimator");
  const synergyRoles = ["Tokens", "Sac Outlet", "Drain", "Lifegain", "ETB", "Blink", "Spellslinger", "Artifacts", "Counters"].filter(r => getRoleCount(cards, r) >= 3);

  if (archetypes[0]) strengths.push({ title: "Clear identity", text: `The deck appears to have a recognizable direction: ${archetypes[0].name}. That helps the cards pull toward the same plan.` });
  if (interaction >= 8) strengths.push({ title: "Good interaction", text: `There are ${interaction} pieces across removal/counters/wipes. That is a solid base for casual and mid-power tables.` });
  if (ramp >= 8) strengths.push({ title: "Enough ramp", text: `There are ${ramp} detected ramp pieces, enough to deploy the plan with good consistency.` });
  if (draw >= 8) strengths.push({ title: "Healthy card advantage", text: `There are ${draw} draw/advantage sources. The deck should recover resources reasonably well.` });
  if (recursion >= 4) strengths.push({ title: "Resilience", text: `Detected recursion (${recursion}) helps you recover from removal and wipes.` });
  if (lands >= 35 && lands <= 38) strengths.push({ title: "Reasonable land count", text: `${lands} lands is within the usual Commander range.` });
  if (synergyRoles.length) strengths.push({ title: "Detected synergy packages", text: `There is density in: ${synergyRoles.join(", ")}. That suggests internal engines beyond individual good cards.` });

  if (!strengths.length) strengths.push({ title: "Initial base detected", text: "The app detected the deck structure, but needs Scryfall data and more tags to evaluate strengths better." });
  return strengths;
}

function generateWeaknesses(cards) {
  const weaknesses = [];
  const lands = cards.filter(c => c.type === "Lands").reduce((a, c) => a + c.qty, 0);
  const ramp = getRoleCount(cards, "Ramp");
  const draw = getRoleCount(cards, "Draw");
  const interaction = getRoleCount(cards, "Removal") + getRoleCount(cards, "Counterspell") + getRoleCount(cards, "Board Wipe");
  const protection = getRoleCount(cards, "Protection");
  const unknown = unknownCmcCount(cards);
  const avg = Number(averageCmc(cards));

  if (unknown > 0) weaknesses.push({ title: "Incomplete data", text: `${unknown} cards still do not have real cost/type data. Load Scryfall so curve, roles, and scores are more reliable.` });
  if (draw < 7) weaknesses.push({ title: "Low draw", text: `Only ${draw} draw pieces were detected. In Commander, you usually want 7-12 depending on the deck.` });
  if (ramp < 7) weaknesses.push({ title: "Ramp low", text: `Only ${ramp} ramp pieces were detected. If the curve is medium/high, the deck may start slowly.` });
  if (interaction < 7) weaknesses.push({ title: "Low interaction", text: `Detected ${interaction} answers. You may struggle against key threats or opposing combos.` });
  if (protection < 3) weaknesses.push({ title: "Low protection", text: `Only ${protection} protection pieces were detected. If the commander is central, this matters a lot.` });
  if (lands < 34) weaknesses.push({ title: "Too few lands", text: `${lands} lands may be low unless the deck has a very low curve and a lot of cheap ramp.` });
  if (lands > 39) weaknesses.push({ title: "Too many lands", text: `${lands} lands may be high; you may be losing action slots.` });
  if (avg && avg > 3.6) weaknesses.push({ title: "High curve", text: `Average CMC ${avg.toFixed(2)}. Check whether there is enough ramp/draw to support it.` });

  if (!weaknesses.length) weaknesses.push({ title: "No critical issues", text: "No major structural holes detected. The next step is to test hands and mark dead cards/MVPs." });
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
    addLine("Aristocrats engine", ["Sac Outlet", "Drain", "Tokens", "Recursion"], "Sacrificing creatures or making them die turns into life loss, value, and constant pressure.");
  }
  if (getRoleCount(cards, "Tokens") >= 3 && (getRoleCount(cards, "Draw") >= 1 || getRoleCount(cards, "Sac Outlet") >= 1)) {
    addLine("Tokens as fuel", ["Tokens", "Draw", "Sac Outlet", "Drain"], "Tokens do not only attack: they also fuel sacrifice, draw, drain, convoke, or resources.");
  }
  if (getRoleCount(cards, "Lifegain") >= 2 && getRoleCount(cards, "Drain") >= 2) {
    addLine("Lifegain turned into damage", ["Lifegain", "Drain"], "Life gained becomes real pressure on the table through drainers or Sanguine Bond-type effects.");
  }
  if (getRoleCount(cards, "Blink") >= 2 && getRoleCount(cards, "ETB") >= 4) {
    addLine("Blink / ETB value", ["Blink", "ETB", "Draw", "Removal"], "The deck can repeat ETB effects to draw, remove, generate tokens, or accumulate advantage.");
  }
  if (getRoleCount(cards, "Spellslinger") >= 2 || countBy(cards, c => c.type).filter(t => ["Instants", "Sorceries"].includes(t.name)).reduce((a, t) => a + t.value, 0) >= 24) {
    addLine("Spellslinger", ["Spellslinger", "Draw", "Removal", "Counterspell"], "The density of instants/sorceries or payoffs suggests a plan of chaining spells and generating value.");
  }
  if (getRoleCount(cards, "Artifacts") >= 3) {
    addLine("Artifacts value", ["Artifacts", "Ramp", "Draw", "Combo"], "There are enough artifact signals to look for value, ramp, or combo lines.");
  }
  if (getRoleCount(cards, "Counters") >= 4) {
    addLine("Counters engine", ["Counters", "Proliferate", "Draw"], "The deck appears to accumulate counters and can scale well with proliferate or doublers.");
  }
  if (getRoleCount(cards, "Recursion") + getRoleCount(cards, "Reanimator") >= 4) {
    addLine("Graveyard as a resource", ["Recursion", "Reanimator", "Sac Outlet", "Removal"], "The deck can recover pieces or turn the graveyard into a second hand.");
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
    .filter(c => c.type !== "Commander" && c.type !== "Lands" && !protectedKeys.has(c.key))
    .map(c => {
      const roles = getEffectiveRoles(c);
      const isCore = roles.some(r => coreRoles.has(r));
      let score = 10;
      const reasons = [];

      if (isComboPiece(c, cards)) {
        score -= 80;
        reasons.push("detected combo piece");
      }
      if (roles.includes("Game Changer") || roles.includes("Fast Mana")) {
        score -= 35;
        reasons.push("card de high impacto");
      }
      if (isCore) {
        score -= 18;
        reasons.push("cumple rol central del archetype");
      }
      if (roles.length === 0) {
        score += 32;
        reasons.push("no clear role detected");
      }
      if (roles.length === 1 && ["Evasion", "ETB", "Lifegain"].includes(roles[0])) {
        score += 10;
        reasons.push("rol aislado de low impacto relativo");
      }

      // El cost high solo es problema si el deck no es big mana/stompy.
      if ((c.cmc || 0) >= 6 && !primary.includes("Big Mana")) {
        score += 14;
        reasons.push("high cost for the detected plan");
      } else if ((c.cmc || 0) >= 7 && primary.includes("Big Mana") && !roles.includes("Finisher") && !roles.includes("Draw")) {
        score += 6;
        reasons.push("cost high incluso para big mana, revisar impacto");
      }

      if (roles.includes("Ramp") && rampCount <= Math.ceil(scores.components.rampTarget)) {
        score -= 28;
        reasons.push("avoid cutting ramp: it is near/below the target");
      }
      if (roles.includes("Draw") && drawCount <= Math.ceil(scores.components.drawTarget)) {
        score -= 28;
        reasons.push("avoid cutting draw: it is near/below the target");
      }
      if ((roles.includes("Removal") || roles.includes("Counterspell") || roles.includes("Board Wipe")) && interactionCount <= Math.ceil(scores.components.interactionTarget)) {
        score -= 22;
        reasons.push("avoid cutting interaction: it is near/below the target");
      }
      if (roles.includes("Protection") && isCommanderCentric(cards)) {
        score -= 18;
        reasons.push("protects key pieces/commander");
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

      // Si estoy metiendo una card de un rol que falta, no me recomiendes cortar ese mismo rol.
      if (roles.includes(wantedRole) && target !== null && currentRoleCount <= target) {
        score -= 35;
        reasons.unshift(`do not cut ${wantedRole}: it is still near/below the target`);
      }

      // Si estoy metiendo una card del mismo rol y ese rol está sobrado, sí puede ser reemplazo natural.
      if (roles.includes(wantedRole) && target !== null && currentRoleCount > target + 2) {
        score += 12;
        reasons.unshift(`possible replacement within the same role: ${wantedRole}`);
      }

      // Si meto una wincon/combo, suelen sobrar cards de value sin rol claro antes que ramp/draw/protection.
      if (["Finisher", "Untap", "Upgrade"].includes(wantedRole) && roles.length === 0) {
        score += 8;
        reasons.unshift("the new card appears to raise the ceiling; this slot has little detected role impact");
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

const priorityColor = { High: "#ef4444", Medium: "#f59e0b", Low: "#6b7280" };

export default function DeckAnalysis() {
  const [tab, setTab] = useState("home");
  const [theme, setTheme] = useState(() => {
    try { return window.localStorage.getItem("commanderDeckAnalyzer.theme.v1") || "dark"; } catch { return "dark"; }
  });
  const [language, setLanguage] = useState(() => {
    try { return window.localStorage.getItem("deckForgeAnalyzer.language.v1") || "en"; } catch { return "en"; }
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
  const [cardVisibleCount, setCardVisibleCount] = useState(40);
  const [typeFilter, setTypeFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
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
  const [spellbookStatus, setSpellbookStatus] = useState("Commander Spellbook not checked");
  const [spellbookLoading, setSpellbookLoading] = useState(false);
  const [spellbookHasFetched, setSpellbookHasFetched] = useState(false);
  const [previewCard, setPreviewCard] = useState(null);
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 });
  const [selectedDiagnostic, setSelectedDiagnostic] = useState(null);
  const [comboSizeFilter, setComboSizeFilter] = useState("all");
  const [comboVisibleCount, setComboVisibleCount] = useState(5);
  const [suggestionCardData, setSuggestionCardData] = useState({});
  const [artModalCard, setArtModalCard] = useState(null);
  const [artModalPrints, setArtModalPrints] = useState([]);
  const [artModalStatus, setArtModalStatus] = useState("");
  const previewFetchInFlight = useRef(new Set());

  const commander = useMemo(() => getCommander(cards), [cards]);
  const deckAllowedColors = useMemo(() => getDeckAllowedColors(cards), [cards]);
  const totalDeckPrice = useMemo(() => getDeckTotalPrice(cards), [cards]);
  const totalCards = useMemo(() => cards.reduce((a, c) => a + c.qty, 0), [cards]);
  const pricedCardsCount = useMemo(() => cards.filter(c => Number(c.price) > 0).reduce((a, c) => a + c.qty, 0), [cards]);
  const unpricedCardsCount = useMemo(() => cards.filter(c => !(Number(c.price) > 0)).reduce((a, c) => a + c.qty, 0), [cards]);
  const landsCount = useMemo(() => cards.filter(c => c.type === "Lands").reduce((a, c) => a + c.qty, 0), [cards]);
  const manaCurve = useMemo(() => calculateManaCurve(cards), [cards]);
  const cardTypes = useMemo(() => countBy(cards, c => c.type).map(d => ({ ...d, color: CARD_TYPE_COLORS[d.name] || CARD_TYPE_COLORS.Other })), [cards]);
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
      .filter(c => c.complete && c.pieces.length >= 2)
      .sort((a, b) => a.pieces.length - b.pieces.length || a.name.localeCompare(b.name));
  }, [combos, spellbookIncludedCombos, spellbookHasFetched]);
  const almostCombos = useMemo(() => {
    const source = spellbookHasFetched ? spellbookAlmostCombos : combos;
    const hasCommander = !!commander;
    return source
      .filter(c => !c.complete && c.pieces.length >= 2 && c.missing.length === 1 && c.present.length >= c.pieces.length - 1)
      .filter(c => (c.missing || []).every(name => isSuggestionAllowedForCommander(name, suggestionCardData, deckAllowedColors, hasCommander)))
      .sort((a, b) => a.missing.length - b.missing.length || b.present.length - a.present.length || a.name.localeCompare(b.name));
  }, [combos, spellbookAlmostCombos, spellbookHasFetched, suggestionCardData, deckAllowedColors, commander]);
  const comboSource = comboView === "included" ? includedCombos : almostCombos;
  const twoCardComboCount = comboSource.filter(c => c.pieces.length === 2).length;
  const threeCardComboCount = comboSource.filter(c => c.pieces.length === 3).length;
  const fourPlusComboCount = comboSource.filter(c => c.pieces.length >= 4).length;
  const displayedCombos = comboSource.filter(c => comboSizeFilter === "all" || (comboSizeFilter === "4plus" ? c.pieces.length >= 4 : c.pieces.length === Number(comboSizeFilter)));
  const visibleDisplayedCombos = useMemo(() => displayedCombos.slice(0, comboVisibleCount), [displayedCombos, comboVisibleCount]);
  const visibleMissingComboNames = useMemo(() => [...new Set(visibleDisplayedCombos.flatMap(combo => combo.missing || []).map(cleanDisplayCardName).filter(Boolean))], [visibleDisplayedCombos]);
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
        push(missing, "Complete combo", `Completes the line: ${combo.name}`);
      }
    }

    return out.slice(0, 18);
  }, [cards, recommendations, almostCombos]);
  const visibleAutoAddRecommendations = useMemo(() => {
    const hasCommander = !!commander;
    return autoAddRecommendations.filter(suggestion => isSuggestionAllowedForCommander(suggestion.name, suggestionCardData, deckAllowedColors, hasCommander));
  }, [autoAddRecommendations, suggestionCardData, deckAllowedColors, commander]);
  const allMissingComboNames = useMemo(() => visibleMissingComboNames.slice(0, 30), [visibleMissingComboNames]);
  const synergyLines = useMemo(() => detectSynergyLines(cards), [cards]);
  const strengths = useMemo(() => generateStrengths(cards), [cards]);
  const weaknesses = useMemo(() => generateWeaknesses(cards), [cards]);
  const cutCandidates = useMemo(() => getCutCandidates(cards, 10), [cards]);
  const manaStats = useMemo(() => getManaStats(), [cards]);
  const colorCurveGroups = useMemo(() => getColorCurveGroups(), [cards]);
  const tokensAndExtras = useMemo(() => detectTokensAndExtras(), [cards]);
  const allTypes = useMemo(() => ["All", ...new Set(cards.map(c => c.type).filter(Boolean))], [cards]);
  const allRoles = useMemo(() => ["All", ...new Set(cards.flatMap(c => getEffectiveRoles(c)).filter(Boolean))].sort((a, b) => a === "All" ? -1 : b === "All" ? 1 : a.localeCompare(b)), [cards]);
  const filteredCards = useMemo(() => {
    let base = filterCards(cards, activeFilter);
    if (typeFilter !== "All") base = base.filter(c => c.type === typeFilter);
    if (roleFilter !== "All") base = base.filter(c => getEffectiveRoles(c).includes(roleFilter));
    if (cardSearch.trim()) {
      const q = normalizeName(cardSearch);
      base = base.filter(c => normalizeName(c.name).includes(q));
    }
    return base;
  }, [cards, activeFilter, cardSearch, typeFilter, roleFilter]);
  const visibleFilteredCards = useMemo(() => filteredCards.slice(0, cardVisibleCount), [filteredCards, cardVisibleCount]);

  const tabs = [
    { id: "home", label: "🏠 Home" },
    { id: "decks", label: "📚 Decks" },
    { id: "input", label: "🧾 Input" },
    { id: "overview", label: "📊 Overview" },
    { id: "deckview", label: "🗂️ Deck" },
    { id: "stats", label: "📈 Stats" },
    { id: "extras", label: "🧪 Extras" },
    { id: "bracket", label: "🏷️ Bracket" },
    { id: "combos", label: "🧩 Combos" },
    { id: "analysis", label: "🔬 Analysis" },
    { id: "recommendations", label: "🔧 Upgrades" },
    { id: "swap", label: "🔁 Add cards" },
    { id: "cards", label: "🖼️ Cards" },
  ];

  const isLightTheme = theme === "light";
  const bg = isLightTheme ? {
    page: "radial-gradient(circle at 12% 0%, rgba(34,197,94,0.16) 0%, transparent 28%), radial-gradient(circle at 86% 8%, rgba(245,158,11,0.12) 0%, transparent 24%), linear-gradient(160deg, #f7fbf5 0%, #edf7ee 48%, #fff7ed 100%)",
    card: "rgba(255,255,255,0.94)",
    cardBorder: "rgba(22,101,52,0.22)",
    text: "#102016",
    muted: "#475569",
    header: "linear-gradient(135deg, rgba(6,78,59,0.96) 0%, rgba(20,83,45,0.94) 54%, rgba(15,23,42,0.92) 100%)",
    nav: "rgba(255,255,255,0.92)",
    navText: "#0f172a",
    panel: "rgba(248,250,252,0.94)",
    input: "#ffffff",
    heroText: "#0f172a",
    shadow: "0 18px 60px rgba(15,23,42,0.12)",
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

  const ui = isLightTheme ? {
    subTabBg: "rgba(255,255,255,0.94)",
    subTabText: "#334155",
    subTabBorder: "rgba(22,101,52,0.18)",
    subTabActiveBg: "linear-gradient(135deg,#16a34a,#0ea5e9)",
    subTabActiveText: "#ffffff",
    inputPanel: "rgba(255,255,255,0.96)",
    infoBoxBg: "linear-gradient(135deg,#f0fdf4,#f8fafc)",
    infoBoxBorder: "rgba(22,101,52,0.22)",
    fieldBg: "#ffffff",
    fieldText: "#0f172a",
    fieldPlaceholder: "#64748b",
    greenText: "#166534",
    greenSoftText: "#15803d",
    darkGreenButtonBg: "#166534",
    darkGreenButtonText: "#ffffff",
    softGreenButtonBg: "#ecfdf5",
    softGreenButtonText: "#166534",
    orangeButtonBg: "#fff7ed",
    orangeButtonText: "#9a3412",
    dangerButtonBg: "#fef2f2",
    dangerButtonText: "#991b1b",
  } : {
    subTabBg: "#0c180c",
    subTabText: "#6b7280",
    subTabBorder: "#1a2e1a",
    subTabActiveBg: "#14532d",
    subTabActiveText: "#4ade80",
    inputPanel: bg.card,
    infoBoxBg: "#071207",
    infoBoxBorder: "#14532d",
    fieldBg: "#050d05",
    fieldText: "#d1fae5",
    fieldPlaceholder: "#94a3b8",
    greenText: "#86efac",
    greenSoftText: "#86efac",
    darkGreenButtonBg: "#14532d",
    darkGreenButtonText: "#86efac",
    softGreenButtonBg: "#0d2b14",
    softGreenButtonText: "#d1fae5",
    orangeButtonBg: "#2a160a",
    orangeButtonText: "#fed7aa",
    dangerButtonBg: "#2a0d0d",
    dangerButtonText: "#fca5a5",
  };

  useEffect(() => {
    setSavedDecks(safeLoadSavedDecks());
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem("commanderDeckAnalyzer.theme.v1", theme); } catch {}
  }, [theme]);

  useEffect(() => {
    try { window.localStorage.setItem("deckForgeAnalyzer.language.v1", language); } catch {}
    if (typeof document !== "undefined") document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    setCardVisibleCount(40);
  }, [cardSearch, typeFilter, roleFilter, activeFilter]);

  useEffect(() => {
    setComboVisibleCount(5);
  }, [comboView, comboSizeFilter, spellbookHasFetched]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.googleTranslateElementInit = () => {
      if (!window.google?.translate?.TranslateElement) return;
      new window.google.translate.TranslateElement({
        pageLanguage: "en",
        includedLanguages: LANGUAGE_OPTIONS.map(l => l.code).filter(code => code !== "en").join(","),
        autoDisplay: false,
      }, "google_translate_element");
      setTimeout(() => {
        if (language !== "en") applyGoogleTranslateLanguage(language);
      }, 400);
    };
    if (!document.querySelector('script[src*="translate_a/element.js"]')) {
      const script = document.createElement("script");
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    } else if (window.google?.translate?.TranslateElement) {
      window.googleTranslateElementInit();
    }
  }, []);

  useEffect(() => {
    if (language === "en") return;
    const t = setTimeout(() => applyGoogleTranslateLanguage(language), 700);
    return () => clearTimeout(t);
  }, [language]);

  function handleLanguageChange(nextLanguage) {
    setLanguage(nextLanguage);
    setTranslateCookie(nextLanguage);
    const applied = applyGoogleTranslateLanguage(nextLanguage);
    if (!applied || nextLanguage === "en") {
      setTimeout(() => window.location.reload(), 120);
    }
  }

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
          const data = await fetchScryfallCardCached(name);
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

  useEffect(() => {
    let cancelled = false;
    async function loadMissingComboImages() {
      for (const name of allMissingComboNames) {
        const key = normalizeName(name);
        if (!key || suggestionCardData[key]) continue;
        try {
          const data = await fetchScryfallCardCached(name);
          const scry = scryToCardData(data);
          if (!cancelled) setSuggestionCardData(prev => ({ ...prev, [key]: { name: scry.name || name, image: scry.image, smallImage: scry.smallImage, typeLine: scry.typeLine, manaCost: scry.manaCost, colorIdentity: scry.colorIdentity || [], price: scry.price } }));
        } catch {
          if (!cancelled) setSuggestionCardData(prev => ({ ...prev, [key]: { name, image: "", smallImage: "", typeLine: "Not found on Scryfall", colorIdentity: null, notFound: true } }));
        }
        await sleep(45);
      }
    }
    if (allMissingComboNames.length) loadMissingComboImages();
    return () => { cancelled = true; };
  }, [allMissingComboNames]);

  useEffect(() => {
    let cancelled = false;
    async function loadVisibleMissingComboImages() {
      for (const name of visibleMissingComboNames) {
        const key = normalizeName(name);
        if (!key || suggestionCardData[key]) continue;
        try {
          const data = await fetchScryfallCardCached(name);
          const scry = scryToCardData(data);
          if (!cancelled) setSuggestionCardData(prev => ({ ...prev, [key]: { name: scry.name || name, image: scry.image, smallImage: scry.smallImage, typeLine: scry.typeLine, manaCost: scry.manaCost, colorIdentity: scry.colorIdentity || [], price: scry.price } }));
        } catch {
          if (!cancelled) setSuggestionCardData(prev => ({ ...prev, [key]: { name, image: "", smallImage: "", typeLine: "Not found on Scryfall", colorIdentity: null, notFound: true } }));
        }
        await sleep(25);
      }
    }
    if (visibleMissingComboNames.length) loadVisibleMissingComboImages();
    return () => { cancelled = true; };
  }, [visibleMissingComboNames]);

  async function enrichCardsList(inputCards) {
    if (!inputCards.length) return inputCards;
    setLoading(true);
    const next = inputCards.map(card => ({ ...card }));
    let failedLoads = 0;
    const concurrency = 8;
    setCards([...next]);

    for (let start = 0; start < next.length; start += concurrency) {
      const batch = next.slice(start, start + concurrency);
      setLoadStatus(`Loading Scryfall ${start + 1}-${Math.min(start + batch.length, next.length)}/${next.length}. Cached cards load instantly.`);
      const results = await Promise.all(batch.map(async (card) => {
        try {
          const data = await fetchScryfallCardCached(card);
          const scry = scryToCardData(data);
          const relatedTokens = lightweightRelatedTokensFromScryfall(data);
          const enriched = { ...card, ...scry, relatedTokens };
          enriched.type = inferTypeFromScryfall(enriched);
          enriched.roles = detectRoles(enriched);
          return enriched;
        } catch {
          failedLoads += 1;
          return { ...card, notFound: true };
        }
      }));
      results.forEach((card, offset) => { next[start + offset] = card; });
      setCards([...next]);
      await sleep(40);
    }

    setLoadStatus(failedLoads ? `Scryfall data loaded with ${failedLoads} card(s) not found. Check names, set or collector number.` : "Scryfall data loaded successfully. Future loads are cached in this browser.");
    setLoading(false);
    return next;
  }

  async function analyzeDeck() {
    const parsed = parseDecklist(deckText).map(c => ({ ...c, roles: detectRoles(c) }));
    const detectedCommander = getCommander(parsed);
    setActiveFilter(null);
    setCardSearch("");
    setCardVisibleCount(40);
    setTypeFilter("All");
    setRoleFilter("All");
    setSpellbookIncludedCombos([]);
    setSpellbookAlmostCombos([]);
    setSpellbookHasFetched(false);
    setSpellbookStatus("Waiting to check Commander Spellbook");
    if (!deckName.trim()) setDeckName(detectedCommander?.name || "Untitled deck");
    setCards(parsed);
    setTab("overview");
    const enriched = await enrichCardsList(parsed);
    await refreshSpellbookCombos(enriched);
  }

  function saveCurrentDeck() {
    if (!cards.length) {
      setSaveStatus("Analyze a decklist first.");
      return;
    }
    const now = new Date().toISOString();
    const name = deckName.trim() || commander?.name || "Untitled deck";
    const record = {
      id: `${Date.now()}`,
      name,
      commanderName: commander?.name || "Commander not detected",
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
        archetype: archetypes[0] ? {
          name: archetypes[0].name,
          macroArchetype: archetypes[0].macroArchetype,
          mainTheme: archetypes[0].mainTheme,
          subThemes: archetypes[0].subThemes || [],
          confidence: archetypes[0].confidence || archetypes[0].score,
          evidenceCards: archetypes[0].evidenceCards || archetypes[0].evidence || [],
        } : null,
        commanderImage: commander?.image || commander?.smallImage || "",
        combos: relevantCombos.filter(c => c.complete).length,
        totalPrice: totalDeckPrice,
        pricedCardsCount,
        unpricedCardsCount,
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
      setSaveStatus(`Saved: ${name}`);
    }

    const ok = safeSaveSavedDecks(next);
    if (ok) setSavedDecks(next);
    else setSaveStatus("Could not save. LocalStorage is full or blocked.");
  }

  function loadSavedDeck(deck) {
    setDeckName(deck.name || "");
    setDeckText(deck.deckText || "");
    setCards((deck.cards || []).map(c => ({ ...c, roles: detectRoles(c) })));
    setActiveFilter(null);
    setCardSearch("");
    setCardVisibleCount(40);
    setTypeFilter("All");
    setRoleFilter("All");
    setSaveStatus(`Loaded: ${deck.name}`);
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
    setLoadStatus("New analysis ready. Paste a decklist to start.");
    setWantedCards("");
    setWantedSearch("");
    setWantedSuggestions([]);
    setSelectedWantedCards([]);
    setWantedSearchStatus("");
    setActiveFilter(null);
    setCardSearch("");
    setCardVisibleCount(40);
    setTypeFilter("All");
    setRoleFilter("All");
    setDeckName("");
    setSaveStatus("");
    setReportStatus("");
    setSpellbookIncludedCombos([]);
    setSpellbookAlmostCombos([]);
    setSpellbookHasFetched(false);
    setSpellbookStatus("Commander Spellbook not checked");
    setSelectedDiagnostic(null);
    setComboSizeFilter("all");
    setComboVisibleCount(5);
    setSuggestionCardData({});
    setPreviewCard(null);
    setTab("input");
  }

  function generateReportText() {
    if (!cards.length) return "Paste and analyze a decklist to generate a report.";
    const archetype = archetypes[0] || {};
    const topStrengths = strengths.slice(0, 4).map(x => `- ${x.title}: ${x.text}`).join(String.fromCharCode(10));
    const topWeaknesses = weaknesses.slice(0, 4).map(x => `- ${x.title}: ${x.text}`).join(String.fromCharCode(10));
    const topRecs = recommendations.slice(0, 5).map(x => `- ${x.area}: ${x.card} (${x.priority})`).join(String.fromCharCode(10));
    const topCuts = cutCandidates.slice(0, 6).map(x => `- ${x.card.name}: ${(x.reasons || []).slice(0, 2).join(" · ") || "reviewable slot"}`).join(String.fromCharCode(10));
    const completeCombos = includedCombos.slice(0, 6).map(x => `- ${x.name}`).join(String.fromCharCode(10)) || "- No complete combos detected.";
    return [
      `DeckForge Analyzer — Shareable report`,
      `Commander: ${commander?.name || "Not detected"}`,
      `Overall: ${scores.overall}/10`,
      `Bracket: ${bracket.bracket} (${bracket.shortLabel})`,
      `Estimated price: ${formatMoney(totalDeckPrice)} · ${unpricedCardsCount} cards without price detected`,
      `Macroarchetype: ${archetype.macroArchetype || "Not detected"}`,
      `Main theme: ${archetype.mainTheme || "Not detected"}`,
      `Subplans: ${(archetype.subThemes || []).join(" / ") || "Not detected"}`,
      `Confidence archetype: ${archetype.confidence || archetype.score || "?"}%`,
      "",
      "Game plan:",
      planText,
      "",
      "Strengths:",
      topStrengths || "- No clear strengths detected.",
      "",
      "Weaknesses:",
      topWeaknesses || "- No critical weaknesses detected.",
      "",
      "Included combos:",
      completeCombos,
      "",
      "Recommendations:",
      topRecs || "- No critical recommendations.",
      "",
      "Suggested cuts:",
      topCuts || "- No clear cuts detected.",
      "",
      "Note: bracket and score are automatic estimates; confirm expectations with the table before playing."
    ].join(String.fromCharCode(10));
  }

  async function copyReportToClipboard() {
    const text = generateReportText();
    try {
      await navigator.clipboard.writeText(text);
      setReportStatus("Report copied to clipboard.");
    } catch {
      setReportStatus("Could not copy automatically. Select and copy manually from the browser.");
    }
  }

  function pdfCleanText(value) {
    return String(value ?? "")
      .replace(/€/g, " EUR")
      .replace(/[•·]/g, "-")
      .replace(/[“”]/g, '"')
      .replace(/[’]/g, "'")
      .replace(/[–—]/g, "-")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
  }

  function pdfEscape(value) {
    return pdfCleanText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  }

  function wrapPdfText(text, maxChars) {
    const words = pdfCleanText(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxChars && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }

  function buildPdfFromStreams(pageStreams) {
    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    ];
    const pageRefs = [];
    for (const stream of pageStreams) {
      const pageObj = objects.length + 1;
      const contentObj = pageObj + 1;
      pageRefs.push(`${pageObj} 0 R`);
      objects.push(`<< /Type /Page /Parent 2 0 R /MediumBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObj} 0 R >>`);
      objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    }
    objects[1] = `<< /Type /Pages /Kids [${pageRefs.join(" ")}] /Count ${pageRefs.length} >>`;
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((obj, i) => {
      offsets.push(pdf.length);
      pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
    });
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= objects.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return pdf;
  }

  function downloadAnalysisPdf() {
    if (!cards.length) {
      setReportStatus("Analyze a decklist first to download the analysis.");
      return;
    }
    const pageStreams = [];
    let ops = [];
    let y = 805;
    const W = 595;
    const M = 48;

    const rgb = (hex) => {
      const h = String(hex || "#000000").replace("#", "");
      const n = parseInt(h.length === 3 ? h.split("").map(x => x + x).join("") : h, 16);
      return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    };
    const setFill = (hex) => {
      const [r, g, b] = rgb(hex);
      ops.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
    };
    const addPage = () => { pageStreams.push(ops.join("\n")); ops = []; y = 805; };
    const ensureSpace = (needed = 40) => { if (y - needed < 48) addPage(); };
    const text = (value, x = M, size = 10, font = "F1", color = "#111827") => {
      ensureSpace(size + 8);
      setFill(color);
      ops.push(`BT /${font} ${size} Tf ${x} ${y} Td (${pdfEscape(value)}) Tj ET`);
      y -= size + 6;
    };
    const wrapped = (value, x = M, width = W - M * 2, size = 10, font = "F1", color = "#111827", leading = size + 5) => {
      const maxChars = Math.max(24, Math.floor(width / (size * 0.54)));
      for (const para of String(value || "").split(/\n+/)) {
        for (const line of wrapPdfText(para, maxChars)) {
          ensureSpace(leading + 2);
          setFill(color);
          ops.push(`BT /${font} ${size} Tf ${x} ${y} Td (${pdfEscape(line)}) Tj ET`);
          y -= leading;
        }
        y -= 2;
      }
    };
    const section = (title) => {
      ensureSpace(44);
      y -= 8;
      setFill("#166534");
      ops.push(`${M} ${y - 4} ${W - M * 2} 2 re f`);
      y -= 20;
      text(title, M, 15, "F2", "#166534");
    };
    const bulletList = (items, limit = 12) => {
      for (const item of (items || []).slice(0, limit)) wrapped(`- ${item}`, M + 10, W - M * 2 - 10, 9, "F1", "#111827", 13);
    };
    const barChart = (title, data, maxValue = 100) => {
      section(title);
      const left = M + 120;
      const barW = 320;
      for (const item of data.slice(0, 12)) {
        ensureSpace(24);
        const label = item.label || item.name || item.subject || item.role || "Dato";
        const value = Number(item.value ?? item.count ?? 0);
        setFill("#111827");
        ops.push(`BT /F1 9 Tf ${M} ${y} Td (${pdfEscape(String(label).slice(0, 28))}) Tj ET`);
        setFill("#dcfce7");
        ops.push(`${left} ${y - 2} ${barW} 9 re f`);
        setFill("#22c55e");
        ops.push(`${left} ${y - 2} ${Math.max(2, Math.min(barW, (value / maxValue) * barW))} 9 re f`);
        setFill("#111827");
        ops.push(`BT /F2 9 Tf ${left + barW + 8} ${y} Td (${pdfEscape(String(Math.round(value)))}) Tj ET`);
        y -= 19;
      }
    };

    text("DeckForge Analyzer - Deck Analysis", M, 20, "F2", "#166534");
    text(`${commander?.name || deckName || "Commander not detected"}`, M, 18, "F2", "#111827");
    wrapped(`Date: ${new Date().toLocaleString()} - Version: ${APP_VERSION}`, M, W - M * 2, 9, "F1", "#475569");

    section("Executive summary");
    bulletList([
      `Overall: ${scores.overall}/10`,
      `Bracket: ${bracket.bracket} (${bracket.shortLabel})`,
      `Estimated price: ${formatMoney(totalDeckPrice)} (${unpricedCardsCount} cards without price detected)`,
      `Total cards: ${totalCards} - Lands: ${landsCount} - Average CMC: ${avgCMC}`,
      `Archetype: ${archetypes[0]?.macroArchetype || "Not detected"} - ${archetypes[0]?.mainTheme || archetypes[0]?.name || "Not detected"}`,
      `Subplans: ${(archetypes[0]?.subThemes || []).join(" / ") || "Not detected"}`,
    ]);

    barChart("Chart: role diagnosis", scores.radar.map(x => ({ label: x.subject, value: x.value })), 100);
    if (manaCurve.length) barChart("Chart: mana curve", manaCurve.map(x => ({ label: `CMC ${x.cmc}`, value: x.count })), Math.max(1, ...manaCurve.map(x => x.count)));
    if (roles.length) barChart("Chart: main roles", roles.slice(0, 10).map(x => ({ label: x.role, value: x.count })), Math.max(1, ...roles.slice(0, 10).map(x => x.count)));

    section("Archetype explained");
    const arch = archetypes[0] || {};
    bulletList([
      `Macroarchetype: ${arch.macroArchetype || "Not detected"}`,
      `Main theme: ${arch.mainTheme || "Not detected"}`,
      `Confidence: ${arch.confidence || arch.score || "?"}%`,
      `EDHREC: pending real integration; no EDHREC data is invented.`
    ], 8);
    bulletList((arch.explanation || []).map(x => x), 8);
    if (arch.evidenceCards?.length || arch.evidence?.length) bulletList([`Evidence cards: ${(arch.evidenceCards || arch.evidence || []).slice(0, 12).join(", ")}`], 2);

    section("Strengths");
    bulletList(strengths.map(x => `${x.title}: ${x.text}`), 8);
    section("Weaknesses");
    bulletList(weaknesses.map(x => `${x.title}: ${x.text}`), 8);

    section("Combos incluidos");
    bulletList(includedCombos.slice(0, 16).map(x => `${x.name} - ${(x.effects || []).join(" / ")}`), 16);
    section("Combos casi incluidos");
    bulletList(almostCombos.slice(0, 16).map(x => `${x.name} - falta: ${(x.missing || []).join(", ")}`), 16);

    section("Recommendations and cuts");
    bulletList(recommendations.slice(0, 10).map(x => `${x.area}: ${x.card} (${x.priority}) - ${x.reason}`), 10);
    bulletList(cutCandidates.slice(0, 10).map(x => `Corte posible: ${x.card.name} - ${(x.reasons || []).slice(0, 2).join(" / ") || "reviewable slot"}`), 10);

    section("Decklist analyzada");
    bulletList(cards.map(c => `${c.qty}x ${c.name} [${getEffectiveRoles(c).slice(0, 3).join(" / ") || c.type}]`), 140);

    if (ops.length) pageStreams.push(ops.join("\n"));
    const pdf = buildPdfFromStreams(pageStreams);
    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizeFilename(commander?.name || deckName || "deck")}_DeckForge_${APP_VERSION}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setReportStatus("Analysis PDF downloaded.");
  }

  async function openArtSelector(card) {
    if (!card?.name) return;
    setArtModalCard(card);
    setArtModalPrints([]);
    setArtModalStatus("Searching arts on Scryfall...");
    try {
      const prints = await fetchScryfallPrints(card);
      setArtModalPrints(prints);
      setArtModalStatus(prints.length ? `${prints.length} art(s)/version(s) found.` : "No alternate arts found.");
    } catch {
      setArtModalStatus("Alternate arts could not be loaded.");
    }
  }

  function applyCardArt(printData) {
    if (!artModalCard || !printData) return;
    const scry = scryToCardData(printData);
    setCards(prev => prev.map(card => card.key === artModalCard.key ? {
      ...card,
      image: scry.image || card.image,
      smallImage: scry.smallImage || scry.image || card.smallImage,
      setCode: scry.setCode || card.setCode,
      collectorNumber: scry.collectorNumber || card.collectorNumber,
      price: scry.price || card.price,
    } : card));
    setArtModalStatus(`Arte aplicado: ${printData.set?.toUpperCase?.() || "Scryfall"} #${printData.collector_number || ""}`);
    setArtModalCard(null);
    setArtModalPrints([]);
  }

  function cardFromDisplayLabel(label) {
    const clean = cleanDisplayCardName(label);
    return findCard(cards, clean) || suggestionCardData[normalizeName(clean)] || (clean ? { name: clean } : null);
  }

  async function showCardPreviewFromData(card, event) {
    if (!card) return;
    const name = cleanDisplayCardName(card.name || card);
    const key = normalizeName(name);
    setPreviewPos({ x: event.clientX, y: event.clientY });
    let data = (card.image || card.smallImage) ? card : suggestionCardData[key];
    if (data?.image || data?.smallImage) {
      setPreviewCard({ ...data, name: data.name || name, image: data.image || data.smallImage, qty: data.qty || card.qty || 1 });
      return;
    }
    if (!key) return;
    if (data?.notFound) {
      setPreviewCard({ name, image: "", smallImage: "", qty: card.qty || 1, typeLine: "No image found on Scryfall", notFound: true });
      return;
    }
    setPreviewCard({ name, image: "", smallImage: "", qty: card.qty || 1, typeLine: "Loading image from Scryfall…", loading: true });
    if (previewFetchInFlight.current.has(key)) return;
    previewFetchInFlight.current.add(key);
    try {
      const raw = await fetchScryfallCardCached(name);
      const scry = scryToCardData(raw);
      const payload = { name: scry.name || name, image: scry.image, smallImage: scry.smallImage, typeLine: scry.typeLine, manaCost: scry.manaCost, colorIdentity: scry.colorIdentity || [], price: scry.price };
      setSuggestionCardData(prev => ({ ...prev, [key]: payload }));
      setPreviewCard({ ...payload, image: payload.image || payload.smallImage, qty: card.qty || 1 });
    } catch {
      setSuggestionCardData(prev => ({ ...prev, [key]: { name, image: "", smallImage: "", typeLine: "No image found on Scryfall", colorIdentity: null, notFound: true } }));
      setPreviewCard({ name, image: "", smallImage: "", qty: card.qty || 1, typeLine: "No image found on Scryfall", notFound: true });
    } finally {
      previewFetchInFlight.current.delete(key);
    }
  }

  async function ensureSuggestionCardLoaded(name) {
    const clean = cleanDisplayCardName(name);
    const key = normalizeName(clean);
    if (!key || suggestionCardData[key] || previewFetchInFlight.current.has(key)) return;
    previewFetchInFlight.current.add(key);
    try {
      const data = await fetchScryfallCardCached(clean);
      const scry = scryToCardData(data);
      setSuggestionCardData(prev => ({ ...prev, [key]: { name: scry.name || clean, image: scry.image, smallImage: scry.smallImage, typeLine: scry.typeLine, manaCost: scry.manaCost, colorIdentity: scry.colorIdentity || [], price: scry.price } }));
    } catch {
      setSuggestionCardData(prev => ({ ...prev, [key]: { name: clean, image: "", smallImage: "", typeLine: "No image found on Scryfall", colorIdentity: null, notFound: true } }));
    } finally {
      previewFetchInFlight.current.delete(key);
    }
  }

  function getDeckViewPrimaryRole(card) {
    if (card.type === "Commander") return "Commander";
    if (card.type === "Lands") return "Land";
    const roles = getEffectiveRoles(card);
    const priority = ["Ramp", "Draw", "Removal", "Board Wipe", "Counterspell", "Protection", "Tutor", "Combo", "Finisher", "Tokens", "Sac Outlet", "Drain", "Lifegain", "Recursion", "Reanimator", "Untap", "Evasion", "Counters", "Blink", "ETB", "Artifacts", "Enchantress", "Voltron", "Equipment", "Tribal", "Stax", "Goad"];
    return priority.find(r => roles.includes(r)) || roles[0] || card.type || "Other";
  }

  function getDeckViewGroup(card) {
    if (deckViewGroupBy === "type") return card.type || "Other";
    if (deckViewGroupBy === "role") return getDeckViewPrimaryRole(card);
    if (deckViewGroupBy === "cmc") {
      const bucket = getCmcBucket(card);
      return card.type === "Lands" ? "Land" : bucket ? `MV ${bucket}` : "MV ?";
    }
    if (deckViewGroupBy === "color") {
      const ci = card.colorIdentity || [];
      if (card.type === "Lands") return "Land";
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
    const preferredOrder = ["Commander", "Ramp", "Draw", "Removal", "Board Wipe", "Counterspell", "Protection", "Tutor", "Combo", "Finisher", "Creature Combo", "Tokens", "Sac Outlet", "Drain", "Lifegain", "Recursion", "Reanimator", "Untap", "Evasion", "Counters", "Blink", "ETB", "Artifacts", "Enchantress", "Voltron", "Equipment", "Tribal", "Creatures", "Artifacts", "Enchantments", "Instants", "Sorceries", "Planeswalker", "Land", "Lands", "Colorless", "W", "U", "B", "R", "G", "WU", "UB", "BR", "RG", "GW", "WB", "UR", "BG", "RW", "GU", "WUBRG", "Other", "Other"];
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
      if (card.type !== "Lands" && card.type !== "Commander") {
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
      if (card.type === "Lands") {
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
        if (card.type === "Lands" || card.type === "Commander") continue;
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
    setCardVisibleCount(40);
    setTypeFilter("All");
    setRoleFilter("All");
    setTab("cards");
  }

  function clearAllCardFilters() {
    setActiveFilter(null);
    setCardSearch("");
    setCardVisibleCount(40);
    setTypeFilter("All");
    setRoleFilter("All");
  }

  async function enrichScryfall() {
    if (!cards.length) return;
    const enriched = await enrichCardsList(cards);
    await refreshSpellbookCombos(enriched);
  }

  async function refreshSpellbookCombos(inputCards = cards) {
    if (!inputCards.length) return;
    setSpellbookLoading(true);
    setSpellbookStatus("Checking Commander Spellbook...");
    try {
      const result = await fetchCommanderSpellbookCombosForCards(inputCards);
      setSpellbookIncludedCombos(result.included || []);
      setSpellbookAlmostCombos(result.almost || []);
      setSpellbookHasFetched(true);
      setSpellbookStatus(`${result.source || "Commander Spellbook"}: ${result.included?.length || 0} incluidos, ${result.almost?.length || 0} a 1 card.`);
    } catch (err) {
      setSpellbookHasFetched(false);
      setSpellbookStatus(`Could not connect to Commander Spellbook. Using the reduced local fallback database. ${err?.message || ""}`);
    } finally {
      setSpellbookLoading(false);
    }
  }

  async function searchWantedCard() {
    if (!wantedSearch.trim()) return;
    setWantedSearchStatus("Searching Scryfall...");
    try {
      const results = await fetchScryfallAutocomplete(wantedSearch);
      setWantedSuggestions(results.slice(0, 8));
      setWantedSearchStatus(results.length ? `${results.length} resultado(s)` : "No results");
    } catch {
      setWantedSearchStatus("Could not search. Type it manually below.");
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
        goal: `Estimated target: ${components.landTarget || "?"} lands based on curve/archetype`,
        why: `You have ${landsCount} lands and average CMC ${avgCMC}. The app checks whether the land count supports the deck curve.`,
        formula: "Scores higher when the land count is close to target. Penalizes counts that are too low or too high.",
        cards: cards.filter(c => c.type === "Lands").slice(0, 12).map(c => `${c.qty}x ${c.name}`),
      },
      "Ramp": {
        title: "Ramp",
        goal: `Estimated target: ${components.rampTarget || "?"} ramp pieces`,
        why: `Detected ${roleCount("Ramp")} ramp pieces. Target goes up if the deck is Big Mana or has a high curve.`,
        formula: "Low ramp lowers consistency; enough ramp lets the plan start earlier and supports high costs.",
        cards: cardNamesForRoles(["Ramp"], 14),
      },
      "Card Draw": {
        title: "Card Draw",
        goal: `Estimated target: ${components.drawTarget || "?"} draw/advantage sources`,
        why: `Detected ${roleCount("Draw")} draw sources. The app counts direct draw, Clues/investigate, and advantage engines.`,
        formula: "Score rises with repeatable sources or enough one-shot sources to avoid running out of cards.",
        cards: cardNamesForRoles(["Draw"], 14),
      },
      "Interaction": {
        title: "Interaction",
        goal: `Estimated target: ${components.interactionTarget || "?"} answers`,
        why: `Detected ${roleCount("Removal") + roleCount("Counterspell") + roleCount("Board Wipe")} answers across removal, counters, and wipes.`,
        formula: "Mixes single-target removal + some wipes + flexible answers. Penalizes the deck if it cannot stop opposing threats.",
        cards: cardNamesForRoles(["Removal", "Counterspell", "Board Wipe"], 16),
      },
      "Win Cons": {
        title: "Win Cons",
        goal: "Estimated target: 4-6 real ways to close the game, depending on archetype",
        why: `Detected ${roleCount("Finisher")} finishers, ${roleCount("Drain")} drain pieces, and ${compact.length} compact combo(s).`,
        formula: "Counts finishers, real drain, compact combos, and cards that convert advantage into victory. Not all value counts as a wincon.",
        cards: [...cardNamesForRoles(["Finisher", "Drain", "Combo"], 14), ...compact.map(c => `Combo: ${c.name}`)].slice(0, 16),
      },
      "Synergy": {
        title: "Synergy",
        goal: `Detected main archetype: ${archetype}`,
        why: `The app checks whether main roles reinforce each other. Detected engines: ${synergyLines.length}.`,
        formula: "Rises when there is density of pieces that work together: tokens + sac outlet + drain, spellslinger + cantrips, counters + proliferate, etc.",
        cards: synergyLines.flatMap(line => [line.name, ...(line.pieces || [])]).slice(0, 16),
      },
      "Consistency": {
        title: "Consistency",
        goal: "That the deck repeats its plan across games",
        why: `Calculated from ramp (${roleCount("Ramp")}), draw (${roleCount("Draw")}), curve (${avgCMC}), and compact combos (${compact.length}).`,
        formula: "Rises with ramp, draw, reasonable curve, tutors, or redundancy. Low if it depends too much on drawing one specific card.",
        cards: cardNamesForRoles(["Ramp", "Draw", "Tutor"], 16),
      },
      "Resilience": {
        title: "Resilience",
        goal: `Estimated target: ${components.protectionTarget || "?"} protection pieces if the commander/engine is central`,
        why: `Detected ${roleCount("Protection")} protection pieces and ${roleCount("Recursion") + roleCount("Reanimator")} recursion/reanimation pieces.`,
        formula: "Rises if it can protect the commander, rebuild after wipes, or recover key pieces from the graveyard.",
        cards: cardNamesForRoles(["Protection", "Recursion", "Reanimator"], 16),
      },
    };
    return details[subject] || details["Consistency"];
  }

  function handleDeckFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setDeckText(String(reader.result || ""));
      setLoadStatus(`File loaded: ${file.name}`);
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  const dashboardDecks = useMemo(() => savedDecks.slice(0, 8), [savedDecks]);
  const dashboardStats = useMemo(() => {
    const count = savedDecks.length;
    const avgOverall = count ? (savedDecks.reduce((a, d) => a + (Number(d.summary?.overall) || 0), 0) / count).toFixed(1) : "-";
    const maxBracket = count ? Math.max(...savedDecks.map(d => Number(d.summary?.bracket) || 0)) : "-";
    const latest = savedDecks[0]?.name || "No saved analyses";
    return { count, avgOverall, maxBracket, latest };
  }, [savedDecks]);

  const heroImage = commander?.image || commander?.smallImage || savedDecks[0]?.summary?.commanderImage || "";

  const statCards = [
    { label: "Cards", value: cards.length ? String(totalCards) : "-", icon: "🃏", color: "#4ade80", sub: totalCards === 100 ? "Commander legal" : totalCards ? `${totalCards > 100 ? "Over" : "Missing"} ${Math.abs(totalCards - 100)}` : "No deck" },
    { label: "Avg. CMC", value: avgCMC, icon: "⚡", color: "#fbbf24", sub: "calculated from deck" },
    { label: "Lands", value: cards.length ? String(landsCount) : "-", icon: "🌍", color: "#94a3b8", sub: landsCount < 34 ? "low" : landsCount <= 38 ? "ok" : "high" },
    { label: "Price", value: cards.length ? formatMoney(totalDeckPrice) : "-", icon: "💶", color: "#facc15", sub: cards.length ? `${unpricedCardsCount} unpriced cards` : "load Scryfall" },
    { label: "Archetype", value: archetypes[0]?.mainTheme || "-", icon: "🎭", color: "#a855f7", sub: archetypes[0]?.macroArchetype || "not detected" },
    { label: "Bracket", value: cards.length ? String(bracket.bracket) : "-", icon: "🏷️", color: "#ef4444", sub: bracket.label?.replace(/Bracket \d — /, "") || "-" },
    { label: "Overall", value: cards.length ? scores.overall : "-", icon: "⭐", color: "#f59e0b", sub: "/ 10 deck health" },
  ];

  function handleStatCardClick(label) {
    if (!cards.length) {
      setTab("input");
      return;
    }
    if (label === "Cards") {
      clearAllCardFilters();
      setTab("cards");
      return;
    }
    if (label === "Avg. CMC") {
      setTab("stats");
      return;
    }
    if (label === "Lands") {
      openCardFilter({ kind: "type", value: "Lands" });
      return;
    }
    if (label === "Price") {
      setTab("stats");
      return;
    }
    if (label === "Price") {
      setTab("stats");
      return;
    }
    if (label === "Archetype") {
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
      Cards: "View the full card gallery",
      "Avg. CMC": "View detailed curve and color stats",
      Lands: "View only deck lands",
      Price: "View estimated total price and stats",
      Archetype: "View strategic archetype analysis",
      Bracket: "View full bracket explanation",
      Overall: "View deck health diagnosis",
    };
    return hints[label] || "View details";
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
              DeckForge Analyzer <span style={{ fontSize: 10, color: "#86efac", border: "1px solid rgba(34,197,94,.4)", borderRadius: 999, padding: "2px 7px", marginLeft: 2 }}>{APP_VERSION}</span>
            </button>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              {[
                ["home", "Home"],
                ["decks", "My decks"],
                ["input", "Deck Analyzer"],
                ["combos", "Combos"],
                ["recommendations", "Upgrades"],
                ["cards", "Cards"],
              ].map(([id, label]) => (
                <button key={id} onClick={() => setTab(id)} className="da-soft-button" style={{ background: tab === id ? "linear-gradient(135deg,#16a34a,#0ea5e9)" : bg.panel, color: tab === id ? "#fff" : bg.navText, border: `1px solid ${tab === id ? "rgba(255,255,255,.22)" : bg.cardBorder}`, borderRadius: 999, padding: "8px 12px", cursor: "pointer", fontWeight: 800, fontSize: 13 }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={resetAnalyzer} className="da-soft-button" style={{ background: "#16a34a", color: "#fff", border: "1px solid rgba(255,255,255,.2)", borderRadius: 999, padding: "8px 13px", cursor: "pointer", fontWeight: 900 }}>+ New clean analysis</button>
              <label style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 6, background: bg.panel, color: bg.navText, border: `1px solid ${bg.cardBorder}`, borderRadius: 999, padding: "7px 10px", fontWeight: 900, fontSize: 12 }}>
                🌐 Language
                <select aria-label="Language selector" value={language} onChange={(e) => handleLanguageChange(e.target.value)} style={{ background: "transparent", color: bg.navText, border: "none", outline: "none", fontWeight: 900, cursor: "pointer" }}>
                  {LANGUAGE_OPTIONS.map(opt => <option key={opt.code} value={opt.code}>{opt.label}</option>)}
                </select>
              </label>
              <div id="google_translate_element" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0, pointerEvents: "none" }} />
              <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="da-soft-button" style={{ background: bg.panel, color: bg.navText, border: `1px solid ${bg.cardBorder}`, borderRadius: 999, padding: "8px 12px", cursor: "pointer", fontWeight: 900 }}>
                {theme === "dark" ? "☀️ Light mode" : "🌙 Dark mode"}
              </button>
            </div>
          </div>
        </div>
      <style>{`
        .stat-card-clickable { transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease, background .18s ease; }
        .stat-card-clickable:hover { transform: translateY(-2px); border-color: rgba(34,197,94,.85) !important; box-shadow: 0 0 30px rgba(34,197,94,.16) !important; background: ${isLightTheme ? "#f0fdf4" : "#0f1f0f"} !important; }
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
              <img src={commander.smallImage || commander.image} alt={commander.name} onMouseEnter={(e) => showCardPreviewFromData(commander, e)} onMouseMove={(e) => showCardPreviewFromData(commander, e)} onMouseLeave={() => setPreviewCard(null)} style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "zoom-in" }} />
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
              {(archetypes.length ? archetypes : [{ name: "Paste a decklist", score: 0 }]).map(a => <Tag key={a.name} label={`${a.name}${a.score ? ` · ${a.score}` : ""}`} />)}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "stretch" }}>
          {cards.length > 0 && (
            <div style={{ background: "rgba(0,0,0,0.45)", borderRadius: 14, padding: "12px 14px", border: "1px solid #14532d", minWidth: 220 }}>
              <div style={{ color: "#86efac", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Save analysis</div>
              <input
                value={deckName}
                onChange={e => setDeckName(e.target.value)}
                placeholder="Deck name"
                style={{ width: "100%", boxSizing: "border-box", background: "#050d05", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 8, padding: "7px 9px", outline: "none", marginBottom: 8 }}
              />
              <button onClick={saveCurrentDeck} style={{ width: "100%", background: "#14532d", color: "#86efac", border: "1px solid #22c55e", borderRadius: 8, padding: "7px 10px", cursor: "pointer", fontWeight: 800 }}>
                Save deck
              </button>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 7 }}>
                <button onClick={downloadAnalysisPdf} style={{ background: "#0d2b14", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 8, padding: "7px 8px", cursor: "pointer", fontSize: 11, fontWeight: 800 }}>Download analysis</button>
                <button onClick={resetAnalyzer} style={{ background: "#2a160a", color: "#fed7aa", border: "1px solid #7c2d12", borderRadius: 8, padding: "7px 8px", cursor: "pointer", fontSize: 11, fontWeight: 800 }}>New analysis</button>
              </div>
              {saveStatus && <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 6 }}>{saveStatus}</div>}
              {reportStatus && <div style={{ color: "#86efac", fontSize: 11, marginTop: 4 }}>{reportStatus}</div>}
            </div>
          )}
          <div className="stat-card-clickable header-score-box" onClick={() => handleStatCardClick("Overall")} title="View full overall diagnosis" style={{ background: "rgba(0,0,0,0.5)", borderRadius: 14, padding: "14px 24px", textAlign: "center", border: "2px solid #f59e0b55", cursor: "pointer" }}>
            <div style={{ fontSize: 42, fontWeight: 900, color: "#f59e0b", lineHeight: 1, fontFamily: "monospace" }}>{cards.length ? scores.overall : "-"}</div>
            <div style={{ fontSize: 10, color: "#fbbf24", marginTop: 4, letterSpacing: 2, textTransform: "uppercase" }}>Overall /10</div>
          </div>
          <div className="stat-card-clickable header-score-box" onClick={() => handleStatCardClick("Bracket")} title="View full bracket explanation" style={{ background: "rgba(0,0,0,0.5)", borderRadius: 14, padding: "14px 24px", textAlign: "center", border: "2px solid #22c55e55", cursor: "pointer" }}>
            <div style={{ fontSize: 42, fontWeight: 900, color: "#4ade80", lineHeight: 1, fontFamily: "monospace" }}>{cards.length ? bracket.bracket : "-"}</div>
            <div style={{ fontSize: 10, color: "#86efac", marginTop: 4, letterSpacing: 2, textTransform: "uppercase" }}>Bracket</div>
          </div>
        </div>
      </div>

      <div className="main-stat-grid" style={{ display: tab === "home" ? "none" : "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 20 }}>
        {statCards.map(s => (
          <div key={s.label} className="stat-card-clickable" onClick={() => handleStatCardClick(s.label)} title={getStatCardHint(s.label)} style={{ background: bg.card, border: `1px solid ${s.color}22`, borderRadius: 12, padding: "14px 10px", textAlign: "center", boxShadow: `0 0 20px ${s.color}08`, cursor: "pointer", userSelect: "none" }}>
            <div style={{ fontSize: 22 }}>{s.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: s.color, lineHeight: 1.2, fontFamily: "monospace" }}>{s.value}</div>
            <div style={{ fontSize: 10, color: bg.muted, marginTop: 3, letterSpacing: 0.5, textTransform: "uppercase" }}>{s.label}</div>
            <div style={{ fontSize: 9, color: "#374151", marginTop: 2 }}>{s.sub}</div>
            <div style={{ fontSize: 9, color: "#14532d", marginTop: 5, fontWeight: 900 }}>View details →</div>
          </div>
        ))}
      </div>

      <div style={{ display: tab === "home" ? "none" : "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ background: tab === t.id ? ui.subTabActiveBg : ui.subTabBg, color: tab === t.id ? ui.subTabActiveText : ui.subTabText, border: `1px solid ${tab === t.id ? "#22c55e" : ui.subTabBorder}`, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: tab === t.id ? 800 : 700, transition: "all 0.2s", fontFamily: "inherit", boxShadow: tab === t.id ? "0 10px 24px rgba(34,197,94,.16)" : "none" }}>{t.label}</button>
        ))}
      </div>

      {tab === "home" && (
        <div style={{ display: "grid", gap: 18 }}>
          <section className="da-hero-grid" style={{ position: "relative", overflow: "hidden", display: "grid", gridTemplateColumns: "1.25fr .75fr", gap: 18, background: bg.header, border: `1px solid ${bg.cardBorder}`, borderRadius: 28, padding: 28, boxShadow: bg.shadow }}>
            {heroImage && <img src={heroImage} alt="Commander art" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: isLightTheme ? 0.10 : 0.16, filter: "blur(2px) saturate(1.15)", pointerEvents: "none" }} />}
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "inline-flex", gap: 8, alignItems: "center", background: isLightTheme ? "rgba(22,163,74,.10)" : "rgba(34,197,94,.12)", border: "1px solid rgba(34,197,94,.32)", color: "#22c55e", borderRadius: 999, padding: "7px 12px", fontWeight: 900, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase" }}>Commander · EDH · Deck Intelligence</div>
              <h1 style={{ color: bg.heroText, fontSize: "clamp(36px, 6vw, 76px)", lineHeight: .95, letterSpacing: -2.2, margin: "18px 0 12px", fontWeight: 950 }}>
                Analyze your decks deeply.
              </h1>
              <p style={{ color: bg.muted, maxWidth: 760, fontSize: 18, lineHeight: 1.65, margin: 0 }}>
                Paste a decklist from Archidekt, Moxfield or Manabox and get bracket, overall, combos, tokens, cards to add, suggested cuts, estimated price and a shareable report.
              </p>
              <div style={{ marginTop: 14, color: "#86efac", fontWeight: 800, fontSize: 13, letterSpacing: .4 }}>
                Premium view · explained archetype · global hover · visible missing combo pieces
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
                <button onClick={() => setTab("input")} className="da-soft-button" style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)", color: "#fff", border: "none", borderRadius: 14, padding: "13px 18px", fontWeight: 950, cursor: "pointer", boxShadow: "0 12px 34px rgba(34,197,94,.22)" }}>Analyze deck</button>
                <button onClick={() => setTab("decks")} className="da-soft-button" style={{ background: bg.panel, color: bg.navText, border: `1px solid ${bg.cardBorder}`, borderRadius: 14, padding: "13px 18px", fontWeight: 950, cursor: "pointer" }}>View my analyses</button>
                <button onClick={resetAnalyzer} className="da-soft-button" style={{ background: "transparent", color: "#22c55e", border: "1px solid rgba(34,197,94,.42)", borderRadius: 14, padding: "13px 18px", fontWeight: 950, cursor: "pointer" }}>New clean analysis</button>
              </div>
            </div>
            <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 12, alignContent: "center" }}>
              {[
                ["Saved analyses", dashboardStats.count, "📚"],
                ["Average overall", dashboardStats.avgOverall, "⭐"],
                ["Highest bracket", dashboardStats.maxBracket, "🏷️"],
                ["Last deck", dashboardStats.latest, "🕘"],
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
                <h2 style={{ margin: 0, color: bg.heroText, fontSize: 28 }}>Recent analyses</h2>
                <p style={{ margin: "6px 0 0", color: bg.muted }}>Your saved decks appear as a visual library. Later this can move to real user accounts with Supabase.</p>
              </div>
              <button onClick={() => setTab("decks")} className="da-soft-button" style={{ background: bg.panel, color: bg.navText, border: `1px solid ${bg.cardBorder}`, borderRadius: 12, padding: "10px 14px", cursor: "pointer", fontWeight: 900 }}>View all →</button>
            </div>
            {dashboardDecks.length === 0 ? (
              <div style={{ background: bg.card, border: `1px solid ${bg.cardBorder}`, borderRadius: 22, padding: 28, color: bg.muted, textAlign: "center" }}>
                You have not saved any analyses yet. Open Deck Analyzer, paste a decklist and click Save deck.
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
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                        <div style={{ background: isLightTheme ? "#f8fafc" : "#061006", borderRadius: 9, padding: 8 }}>
                          <div style={{ color: "#facc15", fontWeight: 950, fontSize: 13 }}>{formatMoney(deck.summary?.totalPrice || deck.summary?.price || 0)}</div>
                          <div style={{ color: bg.muted, fontSize: 9, textTransform: "uppercase" }}>Price</div>
                        </div>
                        <div style={{ background: isLightTheme ? "#f8fafc" : "#061006", borderRadius: 9, padding: 8 }}>
                          <div style={{ color: "#a78bfa", fontWeight: 950, fontSize: 13 }}>{deck.summary?.archetype?.confidence || "?"}%</div>
                          <div style={{ color: bg.muted, fontSize: 9, textTransform: "uppercase" }}>Confidence</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <Tag label={deck.summary?.archetype?.mainTheme || deck.summary?.archetypes?.[0] || "Archetype"} />
                        {deck.summary?.archetype?.macroArchetype && <Tag label={deck.summary.archetype.macroArchetype} />}
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
              ["Bracket explained", "Detects Game Changers, compact combos, tutors, fast mana and locks to estimate table experience.", "🏷️", "bracket"],
              ["Detected combos", "Separates included and almost-included combos, with filters by size and real missing cards.", "🧩", "combos"],
              ["Actionable upgrades", "Suggests cards to add and cuts based on weak roles, archetype and color identity.", "🔧", "recommendations"],
              ["Downloadable analysis", "Generate a PDF with summary, diagnosis, charts, combos, recommendations and decklist.", "📋", "analysis"],
              ["My decks", "Open your saved analyses from localStorage as a visual library.", "📚", "decks"],
              ["Estimated price", "Check the estimated total price and how many cards are missing prices.", "💶", "stats"],
            ].map(([title, text, icon, target]) => (
              <button key={title} onClick={() => setTab(target)} className="da-card-hover" style={{ textAlign: "left", background: bg.card, border: `1px solid ${bg.cardBorder}`, borderRadius: 20, padding: 20, boxShadow: bg.shadow, cursor: "pointer", fontFamily: "inherit" }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
                <h3 style={{ margin: 0, color: bg.heroText, fontSize: 20 }}>{title}</h3>
                <p style={{ margin: "8px 0 0", color: bg.muted, lineHeight: 1.55 }}>{text}</p>
                <div style={{ color: "#22c55e", fontSize: 12, marginTop: 12, fontWeight: 900 }}>Open →</div>
              </button>
            ))}
          </section>
        </div>
      )}

      {tab === "decks" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
          <div style={{ background: bg.card, borderRadius: 16, padding: 22, border: `1px solid ${bg.cardBorder}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ color: "#fff", margin: 0 }}>📚 Saved decks</h2>
                <p style={{ color: "#94a3b8", margin: "6px 0 0", lineHeight: 1.5 }}>
                  Save your analyses and reload them without pasting the decklist again.
                </p>
              </div>
              <button onClick={() => setTab("input")} style={{ background: "#14532d", color: "#86efac", border: "1px solid #22c55e", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontWeight: 800 }}>
                + Analyze new deck
              </button>
            </div>
            {saveStatus && <div style={{ color: "#fbbf24", marginTop: 12, fontSize: 13 }}>{saveStatus}</div>}
          </div>

          {savedDecks.length === 0 && (
            <div style={{ background: bg.card, borderRadius: 16, padding: 24, border: `1px solid ${bg.cardBorder}`, color: "#94a3b8", textAlign: "center" }}>
              There are no saved decks yet. Analyze a deck, add a name and click <b style={{ color: "#86efac" }}>Save deck</b>.
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

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 14 }}>
                  <div style={{ background: "#061006", borderRadius: 10, padding: 10, textAlign: "center" }}>
                    <div style={{ color: "#4ade80", fontWeight: 900, fontFamily: "monospace" }}>{deck.summary?.totalCards || "-"}</div>
                    <div style={{ color: "#6b7280", fontSize: 10, textTransform: "uppercase" }}>Cards</div>
                  </div>
                  <div style={{ background: "#061006", borderRadius: 10, padding: 10, textAlign: "center" }}>
                    <div style={{ color: "#94a3b8", fontWeight: 900, fontFamily: "monospace" }}>{deck.summary?.landsCount || "-"}</div>
                    <div style={{ color: "#6b7280", fontSize: 10, textTransform: "uppercase" }}>Lands</div>
                  </div>
                  <div style={{ background: "#061006", borderRadius: 10, padding: 10, textAlign: "center" }}>
                    <div style={{ color: "#a78bfa", fontWeight: 900, fontFamily: "monospace" }}>{deck.summary?.combos || 0}</div>
                    <div style={{ color: "#6b7280", fontSize: 10, textTransform: "uppercase" }}>Combos</div>
                  </div>
                  <div style={{ background: "#061006", borderRadius: 10, padding: 10, textAlign: "center" }}>
                    <div style={{ color: "#facc15", fontWeight: 900, fontFamily: "monospace" }}>{formatMoney(deck.summary?.totalPrice || deck.summary?.price || 0)}</div>
                    <div style={{ color: "#6b7280", fontSize: 10, textTransform: "uppercase" }}>Price</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                  <Tag label={deck.summary?.archetype?.mainTheme || deck.summary?.archetypes?.[0] || "Archetype"} />
                  {deck.summary?.archetype?.macroArchetype && <Tag label={deck.summary.archetype.macroArchetype} />}
                </div>

                <div style={{ color: "#6b7280", fontSize: 11, marginTop: 12 }}>
                  Saved: {deck.updatedAt ? new Date(deck.updatedAt).toLocaleString() : "-"}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                  <button onClick={() => loadSavedDeck(deck)} style={{ flex: 1, minWidth: 90, background: "#14532d", color: "#86efac", border: "1px solid #22c55e", borderRadius: 9, padding: "8px 10px", cursor: "pointer", fontWeight: 800 }}>
                    Open
                  </button>
                  <button onClick={() => exportSavedDeck(deck)} style={{ background: "#0d2b14", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 9, padding: "8px 10px", cursor: "pointer", fontWeight: 800 }}>
                    Export
                  </button>
                  <button onClick={() => deleteSavedDeck(deck.id)} style={{ background: "#2a0d0d", color: "#fca5a5", border: "1px solid #7f1d1d", borderRadius: 9, padding: "8px 10px", cursor: "pointer", fontWeight: 800 }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "input" && (
        <div className="input-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 14 }}>
          <div style={{ background: ui.inputPanel, borderRadius: 12, padding: 20, border: `1px solid ${bg.cardBorder}`, boxShadow: isLightTheme ? "0 16px 42px rgba(15,23,42,.08)" : "none" }}>
            <h3 style={{ color: ui.greenText, margin: "0 0 12px", fontSize: 14 }}>How to use</h3>
            <p style={{ color: bg.muted, lineHeight: 1.6, fontSize: 13 }}>Paste a decklist from Archidekt, Moxfield, Manabox, Arena or similar. It accepts headers, exported CSV/JSON, quantities, manual tags and set + collector number.</p>
            <div style={{ background: ui.infoBoxBg, border: `1px solid ${ui.infoBoxBorder}`, borderRadius: 10, padding: 12, color: bg.muted, fontSize: 12, lineHeight: 1.65 }}>
              <b style={{ color: ui.greenText }}>Recommended flow:</b><br />
              1. Export your deck from Archidekt/Moxfield/Manabox.<br />
              2. Paste it on the right or upload the file.<br />
              3. Click <b style={{ color: isLightTheme ? "#0f172a" : "#d1fae5" }}>Analyze decklist</b> and wait for Scryfall to load.<br />
              4. Review Overview, Bracket, Combos, Upgrades and Add cards.<br /><br />
              <b style={{ color: ui.greenText }}>Valid formats:</b><br />
              1 Sol Ring<br />
              1x Sol Ring (CMM) 703 [Ramp]<br />
              # Commander / # Lands / # Sideboard<br />
              CSV con columnas Name, Quantity, Set Code, Collector Number
            </div>
            <label style={{ display: "block", marginTop: 12, background: ui.softGreenButtonBg, color: ui.softGreenButtonText, border: "1px solid #22c55e66", borderRadius: 10, padding: 10, cursor: "pointer", textAlign: "center", fontWeight: 800 }}>
              Upload exported file (.txt/.csv/.json)
              <input type="file" accept=".txt,.csv,.json,.dek" onChange={handleDeckFileUpload} style={{ display: "none" }} />
            </label>
            <button onClick={analyzeDeck} disabled={loading || !deckText.trim()} style={{ width: "100%", marginTop: 12, background: loading ? "#94a3b8" : ui.darkGreenButtonBg, color: ui.darkGreenButtonText, border: "1px solid #22c55e", borderRadius: 10, padding: 12, cursor: loading ? "not-allowed" : "pointer", fontWeight: 800 }}>{loading ? "Analyzing decklist..." : "Analyze decklist"}</button>
            <button onClick={enrichScryfall} disabled={!cards.length || loading} style={{ width: "100%", marginTop: 10, background: loading ? "#94a3b8" : ui.softGreenButtonBg, color: ui.softGreenButtonText, border: "1px solid #14532d66", borderRadius: 10, padding: 12, cursor: loading ? "not-allowed" : "pointer", fontWeight: 800 }}>Reload Scryfall data</button>
            <button onClick={resetAnalyzer} style={{ width: "100%", marginTop: 10, background: ui.orangeButtonBg, color: ui.orangeButtonText, border: "1px solid #f59e0b66", borderRadius: 10, padding: 12, cursor: "pointer", fontWeight: 800 }}>New analysis / clear</button>
            <div style={{ color: loading ? "#fbbf24" : "#6b7280", fontSize: 12, marginTop: 10 }}>{loadStatus}</div>
          </div>
          <div style={{ background: ui.inputPanel, borderRadius: 12, padding: 20, border: `1px solid ${bg.cardBorder}`, boxShadow: isLightTheme ? "0 16px 42px rgba(15,23,42,.08)" : "none" }}>
            <textarea value={deckText} onChange={e => setDeckText(e.target.value)} placeholder="Paste your decklist here..." style={{ width: "100%", height: 430, background: ui.fieldBg, color: ui.fieldText, border: `1px solid ${isLightTheme ? "rgba(22,101,52,.28)" : "#14532d"}`, borderRadius: 12, padding: 14, fontFamily: "monospace", fontSize: 12, outline: "none", boxShadow: isLightTheme ? "inset 0 0 0 1px rgba(15,23,42,.02)" : "none" }} />
          </div>
        </div>
      )}

      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ background: bg.card, borderRadius: 12, padding: 20, border: `1px solid ${bg.cardBorder}` }}>
            <h3 style={{ color: "#86efac", margin: "0 0 14px", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace" }}>📊 Mana Curve</h3>
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
                {unknownCmc} cards still do not have calculated costs. Click “Load Scryfall data” to complete the real curve.
              </div>
            )}
          </div>

          <div style={{ background: bg.card, borderRadius: 12, padding: 20, border: `1px solid ${bg.cardBorder}` }}>
            <h3 style={{ color: "#86efac", margin: "0 0 14px", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace" }}>🥧 Card Types</h3>
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
            <h3 style={{ color: "#86efac", margin: "0 0 14px", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace" }}>🎯 Deck Profile</h3>
            <ResponsiveContainer width="100%" height={230}>
              <RadarChart data={scores.radar}>
                <PolarGrid stroke="#1a3a1a" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "#86efac", fontSize: 11 }} />
                <Radar dataKey="value" stroke="#22c55e" fill="#22c55e" fillOpacity={0.25} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: bg.card, borderRadius: 12, padding: 20, border: `1px solid ${bg.cardBorder}` }}>
            <h3 style={{ color: "#86efac", margin: "0 0 14px", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace" }}>🎭 Detected Roles</h3>
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
            <h3 style={{ color: "#86efac", margin: "0 0 12px", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace" }}>🧠 Detected game plan</h3>
            <p style={{ color: "#cbd5e1", lineHeight: 1.7, margin: 0 }}>{cards.length ? planText : "Paste a decklist to generate the analysis."}</p>
          </div>
        </div>
      )}

      {tab === "deckview" && (
        <div style={{ background: bg.card, borderRadius: 16, padding: 18, border: `1px solid ${bg.cardBorder}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <div>
              <h2 style={{ color: "#fff", margin: 0 }}>🗂️ Vista del deck</h2>
              <p style={{ color: "#94a3b8", margin: "6px 0 0", fontSize: 13 }}>Archidekt-style view: columns by role/type/cost/color, stacked cards and quick filters.</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input
                value={deckViewSearch}
                onChange={e => setDeckViewSearch(e.target.value)}
                placeholder="Filter card..."
                style={{ background: "#050d05", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 8, padding: "9px 10px", outline: "none", minWidth: 180 }}
              />
              <select value={deckViewGroupBy} onChange={e => setDeckViewGroupBy(e.target.value)} style={{ background: "#050d05", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 8, padding: "9px 10px", outline: "none" }}>
                <option value="role">Agrupar por rol</option>
                <option value="type">Agrupar por type</option>
                <option value="cmc">Agrupar por cost</option>
                <option value="color">Agrupar por color</option>
              </select>
              <select value={deckViewSortBy} onChange={e => setDeckViewSortBy(e.target.value)} style={{ background: "#050d05", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 8, padding: "9px 10px", outline: "none" }}>
                <option value="name">Sort: alphabetical</option>
                <option value="cmc">Sort: cost</option>
                <option value="price">Sort: price</option>
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
                      title={`${card.qty}x ${card.name} · ${card.manaCost || (card.type === "Lands" ? "Land" : `MV ${card.cmc ?? "?"}`)}`}
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
                          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", fontSize: 12, textAlign: "center", padding: 12 }}>No image<br />{card.name}</div>
                        )}
                        <div style={{ position: "absolute", top: 5, left: 5, background: "rgba(0,0,0,0.72)", color: "#fff", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 6, padding: "2px 6px", fontSize: 11, fontWeight: 900 }}>{card.qty}</div>
                        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "18px 7px 6px", background: "linear-gradient(0deg, rgba(0,0,0,0.92), rgba(0,0,0,0.62) 55%, transparent)", color: "#fff" }}>
                          <div style={{ fontSize: 11, fontWeight: 900, lineHeight: 1.15, textShadow: "0 1px 2px #000" }}>{card.name}</div>
                          <div style={{ color: "#cbd5e1", fontSize: 9, marginTop: 2 }}>{card.manaCost || (card.type === "Lands" ? "Land" : `MV ${card.cmc ?? "?"}`)}</div>
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
              Visual reading of curve, colors and mana production. Useful to see whether the deck asks for more black/green/white/etc. than it actually produces.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, marginBottom: 18 }}>
              <div style={{ background: "#071207", border: "1px solid #14532d", borderRadius: 12, padding: 14 }}>
                <div style={{ color: "#86efac", fontWeight: 900 }}>Avg Mana Value</div>
                <div style={{ color: "#fff", fontSize: 28, fontFamily: "monospace", fontWeight: 900 }}>{manaStats.avgManaValue}</div>
              </div>
              <div style={{ background: "#071207", border: "1px solid #14532d", borderRadius: 12, padding: 14 }}>
                <div style={{ color: "#86efac", fontWeight: 900 }}>Estimated total price</div>
                <div style={{ color: "#facc15", fontSize: 28, fontFamily: "monospace", fontWeight: 900 }}>{formatMoney(totalDeckPrice)}</div>
                <div style={{ color: "#6b7280", fontSize: 11, marginTop: 4 }}>{pricedCardsCount ? `${pricedCardsCount} cards with Scryfall price` : "Load Scryfall to calculate it"}</div>
              </div>
              <div style={{ background: "#071207", border: "1px solid #14532d", borderRadius: 12, padding: 14 }}>
                <div style={{ color: "#86efac", fontWeight: 900 }}>Lands</div>
                <div style={{ color: landsCount >= 34 && landsCount <= 38 ? "#4ade80" : "#fbbf24", fontSize: 28, fontFamily: "monospace", fontWeight: 900 }}>{landsCount}</div>
              </div>
              <div style={{ background: "#071207", border: "1px solid #14532d", borderRadius: 12, padding: 14 }}>
                <div style={{ color: "#86efac", fontWeight: 900 }}>Cards without data</div>
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
              Detection first uses related tokens/all_parts from Scryfall and, if unavailable, Oracle text. It also shows which cards generate each token.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              <span style={{ background: "#14532d", color: "#86efac", border: "1px solid #22c55e", borderRadius: 8, padding: "8px 12px", fontWeight: 900 }}>Tokens ({tokensAndExtras.tokens.length})</span>
              <span style={{ background: "#071207", color: "#cbd5e1", border: "1px solid #14532d", borderRadius: 8, padding: "8px 12px", fontWeight: 900 }}>Extras ({tokensAndExtras.extras.length})</span>
            </div>

            {tokensAndExtras.tokens.length === 0 && tokensAndExtras.extras.length === 0 && (
              <div style={{ color: "#94a3b8", background: "#0a150a", borderRadius: 10, padding: 14 }}>No clear tokens or extras detected. Loading Scryfall is necessary to detect official tokens with exact image and source.</div>
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
                    {token.sources.length > 6 && <div style={{ color: "#6b7280", fontSize: 11 }}>+{token.sources.length - 6} more source(s)</div>}
                  </div>
                </div>
              ))}
              {tokensAndExtras.extras.map(extra => (
                <div key={extra} style={{ background: "#071207", border: "1px solid #3a2a0a", borderRadius: 12, padding: 14 }}>
                  <div style={{ color: "#fbbf24", fontWeight: 900 }}>Detected extra</div>
                  <div style={{ color: "#fff", marginTop: 8 }}>{extra}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: bg.card, borderRadius: 16, padding: 22, border: `1px solid ${bg.cardBorder}` }}>
            <h3 style={{ color: "#86efac", marginTop: 0 }}>Deck description</h3>
            <p style={{ color: "#cbd5e1", lineHeight: 1.7 }}>{cards.length ? planText : "When you analyze a deck, a playable description of the game plan appears here."}</p>
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
                  Automatic estimate: bracket is based on detected cards, combos, fast mana, tutors, locks and structure. It does not replace a pre-game table conversation.
                </div>
              </div>
              <div style={{ minWidth: 120, minHeight: 120, borderRadius: 18, border: "2px solid #22c55e66", background: "radial-gradient(circle at 50% 30%, #14532d 0%, #061106 75%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 0 30px rgba(34,197,94,0.15)" }}>
                <div style={{ fontSize: 54, lineHeight: 1, color: "#4ade80", fontWeight: 900, fontFamily: "monospace" }}>{bracket.bracket}</div>
                <div style={{ color: "#86efac", fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}>{bracket.shortLabel}</div>
              </div>
            </div>
            <div style={{ marginTop: 16, background: "#071207", border: "1px solid #14532d", borderRadius: 12, padding: 14, color: "#cbd5e1", lineHeight: 1.6 }}>
              Bracket is not a pure power score. It communicates what the deck contains: Game Changers, compact combos, tutors, fast mana, extra turns, locks or mass land denial. The <b style={{ color: "#fbbf24" }}>Overall {scores.overall}/10</b> mide salud estructural; el <b style={{ color: "#4ade80" }}>Bracket {bracket.bracket}</b> mide experiencia de table.
            </div>
          </div>

          <div style={{ background: bg.card, borderRadius: 16, padding: 24, border: "1px solid #f59e0b44" }}>
            <div style={{ color: "#fbbf24", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", fontFamily: "monospace", marginBottom: 10 }}>Quick summary</div>
            {[
              { label: "Game Changers", value: bracket.gameChangers.length },
              { label: "2-card combos", value: bracket.compactCombos.length },
              { label: "Premium tutors", value: bracket.tutors.length },
              { label: "Fast mana premium", value: bracket.fastMana.length },
              { label: "MLD / Locks", value: bracket.mld.length },
              { label: "Extra turns", value: bracket.extraTurns.length },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid #1a2e1a" }}>
                <span style={{ color: "#cbd5e1" }}>{row.label}</span>
                <span style={{ color: row.value ? "#fbbf24" : "#6b7280", fontFamily: "monospace", fontWeight: 900 }}>{row.value}</span>
              </div>
            ))}
          </div>

          <div style={{ background: bg.card, borderRadius: 16, padding: 22, border: "1px solid #22c55e33" }}>
            <h3 style={{ color: "#86efac", marginTop: 0 }}>What pushes it up</h3>
            {(bracket.up.length ? bracket.up : ["There are no strong factors pushing the bracket much higher."]).map((x, i) => (
              <div key={i} style={{ background: "#071207", border: "1px solid #14532d", borderRadius: 10, color: "#cbd5e1", padding: 10, marginBottom: 8 }}>+ {x}</div>
            ))}
          </div>

          <div style={{ background: bg.card, borderRadius: 16, padding: 22, border: "1px solid #ef444433" }}>
            <h3 style={{ color: "#f87171", marginTop: 0 }}>What holds it back</h3>
            {bracket.down.map((x, i) => (
              <div key={i} style={{ background: "#150a0a", border: "1px solid #3f1515", borderRadius: 10, color: "#cbd5e1", padding: 10, marginBottom: 8 }}>- {x}</div>
            ))}
          </div>

          {bracket.reasoningCards.length > 0 && (
            <div style={{ background: bg.card, borderRadius: 16, padding: 22, border: "1px solid #f59e0b33", gridColumn: "1 / -1" }}>
              <h3 style={{ color: "#fbbf24", marginTop: 0 }}>Relevant cards for bracket</h3>
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
            <h3 style={{ color: "#86efac", marginTop: 0 }}>🧩 Detected combos and synergies</h3>
            <p style={{ color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>
              This tab uses Commander Spellbook when it can be queried online. If the API fails due to CORS/network issues, it uses a small local fallback, but Commander Spellbook is the preferred source.
            </p>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 14 }}>
              <button onClick={() => refreshSpellbookCombos(cards)} disabled={!cards.length || spellbookLoading} style={{ background: spellbookLoading ? "#1f2937" : "#14532d", color: "#86efac", border: "1px solid #22c55e", borderRadius: 10, padding: "9px 13px", cursor: spellbookLoading ? "not-allowed" : "pointer", fontWeight: 900 }}>
                {spellbookLoading ? "Checking combos..." : "Refresh combos from Commander Spellbook"}
              </button>
              <span style={{ color: spellbookHasFetched ? "#86efac" : "#fbbf24", fontSize: 12 }}>{spellbookStatus}</span>
            </div>
          </div>

          <div style={{ background: bg.card, borderRadius: 12, padding: 20, border: `1px solid ${bg.cardBorder}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
              <h3 style={{ color: "#fbbf24", margin: 0 }}>Known combos</h3>
              <div style={{ display: "flex", gap: 8, background: "#071207", border: "1px solid #14532d", borderRadius: 999, padding: 4 }}>
                <button onClick={() => setComboView("included")} style={{ background: comboView === "included" ? "#14532d" : "transparent", color: comboView === "included" ? "#86efac" : "#94a3b8", border: "none", borderRadius: 999, padding: "7px 12px", cursor: "pointer", fontWeight: 800 }}>
                  Included ({includedCombos.length})
                </button>
                <button onClick={() => setComboView("almost")} style={{ background: comboView === "almost" ? "#3a2a0a" : "transparent", color: comboView === "almost" ? "#fbbf24" : "#94a3b8", border: "none", borderRadius: 999, padding: "7px 12px", cursor: "pointer", fontWeight: 800 }}>
                  Almost included ({almostCombos.length})
                </button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              <button onClick={() => setComboSizeFilter("all")} style={{ background: comboSizeFilter === "all" ? "#14532d" : "#071207", color: comboSizeFilter === "all" ? "#86efac" : "#94a3b8", border: "1px solid #14532d", borderRadius: 999, padding: "7px 12px", cursor: "pointer", fontWeight: 800 }}>
                All ({comboSource.length})
              </button>
              <button onClick={() => setComboSizeFilter("2")} style={{ background: comboSizeFilter === "2" ? "#14532d" : "#071207", color: comboSizeFilter === "2" ? "#86efac" : "#94a3b8", border: "1px solid #14532d", borderRadius: 999, padding: "7px 12px", cursor: "pointer", fontWeight: 800 }}>
                2 cards ({twoCardComboCount})
              </button>
              <button onClick={() => setComboSizeFilter("3")} style={{ background: comboSizeFilter === "3" ? "#14532d" : "#071207", color: comboSizeFilter === "3" ? "#86efac" : "#94a3b8", border: "1px solid #14532d", borderRadius: 999, padding: "7px 12px", cursor: "pointer", fontWeight: 800 }}>
                3 cards ({threeCardComboCount})
              </button>
              <button onClick={() => setComboSizeFilter("4plus")} style={{ background: comboSizeFilter === "4plus" ? "#14532d" : "#071207", color: comboSizeFilter === "4plus" ? "#86efac" : "#94a3b8", border: "1px solid #14532d", borderRadius: 999, padding: "7px 12px", cursor: "pointer", fontWeight: 800 }}>
                4+ cards ({fourPlusComboCount})
              </button>
            </div>
            {displayedCombos.length === 0 && (
              <div style={{ color: "#94a3b8", background: "#0a150a", borderRadius: 8, padding: 12 }}>
                {comboView === "included" ? "No complete combos detected." : "No almost-complete combos. They appear when you are missing exactly one piece and it respects commander color identity."}
              </div>
            )}
            {visibleDisplayedCombos.map(combo => (
              <div key={combo.name} style={{ background: "linear-gradient(135deg, #081308 0%, #0d1a0d 100%)", color: "#e2f0e2", borderRadius: 16, padding: 18, border: `1px solid ${combo.complete ? "#22c55e66" : "#f59e0b66"}`, marginBottom: 14, boxShadow: combo.complete ? "0 0 28px rgba(34,197,94,0.12)" : "0 0 24px rgba(245,158,11,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 280 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                      <span style={{ background: combo.complete ? "#14532d" : "#3a2a0a", color: combo.complete ? "#86efac" : "#fbbf24", border: `1px solid ${combo.complete ? "#22c55e" : "#f59e0b"}`, borderRadius: 999, padding: "3px 9px", fontSize: 11, fontWeight: 900 }}>
                        {combo.complete ? "✓ COMBO INCLUDED" : `ALMOST INCLUDED · MISSING ${combo.missing.length}`}
                      </span>
                      <span style={{ background: combo.power === "cEDH" ? "#7f1d1d" : "#3a2a0a", color: combo.power === "cEDH" ? "#fca5a5" : "#fbbf24", borderRadius: 999, padding: "3px 9px", fontSize: 11, fontWeight: 900 }}>{combo.power}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <h3 style={{ color: "#fff", fontWeight: 900, fontSize: 20, margin: "0 0 6px" }}>{combo.name}</h3>
                      {combo.url && (
                        <a href={combo.url} target="_blank" rel="noreferrer" style={{ background: "#1d4ed8", color: "#dbeafe", textDecoration: "none", borderRadius: 8, padding: "6px 10px", fontSize: 11, fontWeight: 900 }}>
                          View on Commander Spellbook
                        </a>
                      )}
                    </div>
                    <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.5, margin: "0 0 10px" }}>{combo.desc}</p>
                    {!combo.complete && <div style={{ color: "#fbbf24", fontSize: 13, marginBottom: 10 }}>Missing: <b>{combo.missing.join(", ")}</b></div>}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {(combo.effects || [combo.type]).map(effect => <span key={effect} style={{ background: effect.toLowerCase().includes("infinite") ? "#123d68" : effect.toLowerCase().includes("lock") || effect.toLowerCase().includes("land") ? "#5f2412" : "#3b1f66", color: "#dbeafe", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 999, padding: "4px 9px", fontSize: 11, fontWeight: 800 }}>{effect}</span>)}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
                  {combo.pieces.map(piece => {
                    const ownedCard = findCard(cards, piece);
                    const suggestedCard = suggestionCardData[normalizeName(piece)];
                    const card = ownedCard || suggestedCard;
                    const image = card?.image || card?.smallImage || "";
                    const isPresent = combo.present.includes(piece);
                    return (
                      <div
                        key={piece}
                        onMouseEnter={(e) => { if (!isPresent && !suggestedCard) ensureSuggestionCardLoaded(piece); showCardPreviewFromData(card || { name: piece }, e); }}
                        onMouseMove={(e) => showCardPreviewFromData(card || { name: piece }, e)}
                        onMouseLeave={() => setPreviewCard(null)}
                        style={{ width: 126, background: "#061006", border: `1px solid ${isPresent ? "#22c55e66" : "#f59e0b"}`, borderRadius: 12, padding: 8, cursor: image ? "zoom-in" : "default", position: "relative" }}
                      >
                        {!isPresent && <div style={{ position: "absolute", top: 6, right: 6, zIndex: 2, background: "#f59e0b", color: "#111827", borderRadius: 999, padding: "2px 6px", fontSize: 9, fontWeight: 900 }}>Missing</div>}
                        <div style={{ height: 176, borderRadius: 9, background: "#020802", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                          {image ? <img src={image} alt={piece} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", textAlign: "center", padding: 8, fontSize: 12, color: isPresent ? "#86efac" : "#fbbf24", background: isPresent ? "linear-gradient(135deg,#052e16,#020802)" : "linear-gradient(135deg,#3a2a0a,#020802)", border: isPresent ? "1px solid #14532d" : "1px solid #f59e0b66" }}><div><div style={{ fontWeight: 950, marginBottom: 8 }}>{piece}</div><div style={{ fontSize: 10 }}>{isPresent ? "In deck" : suggestedCard?.notFound ? "No Scryfall image" : "Loading Scryfall version"}</div></div></div>}
                        </div>
                        <div style={{ marginTop: 7, fontWeight: 800, fontSize: 12, color: "#fff", lineHeight: 1.25 }}>{piece}</div>
                        <div style={{ color: isPresent ? "#86efac" : "#fbbf24", fontSize: 10, marginTop: 4 }}>{isPresent ? "Detected" : "Missing card"}</div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginTop: 16 }}>
                  <div style={{ background: "#071207", border: "1px solid #14532d", borderRadius: 12, padding: 13 }}>
                    <h4 style={{ margin: "0 0 8px", color: "#86efac" }}>How it works</h4>
                    <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6, color: "#cbd5e1" }}>
                      {(combo.steps || [combo.desc]).map((s, i) => <li key={i}>{s}</li>)}
                    </ol>
                  </div>
                  <div style={{ background: "#071207", border: "1px solid #14532d", borderRadius: 12, padding: 13 }}>
                    <h4 style={{ margin: "0 0 8px", color: "#60a5fa" }}>Effects</h4>
                    <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6, color: "#cbd5e1" }}>
                      {(combo.effects || [combo.type]).map(e => <li key={e}>{e}</li>)}
                    </ul>
                  </div>
                  <div style={{ background: "#071207", border: "1px solid #14532d", borderRadius: 12, padding: 13 }}>
                    <h4 style={{ margin: "0 0 8px", color: "#fbbf24" }}>Requirements</h4>
                    <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6, color: "#cbd5e1" }}>
                      {getComboPrerequisites(combo).map((p, i) => <li key={`${i}-${p}`}>{p}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
            {displayedCombos.length > visibleDisplayedCombos.length && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
                <button onClick={() => setComboVisibleCount(count => count + 5)} style={{ background: "#14532d", color: "#86efac", border: "1px solid #22c55e", borderRadius: 999, padding: "10px 18px", cursor: "pointer", fontWeight: 900 }}>
                  Load 5 more combos ({visibleDisplayedCombos.length}/{displayedCombos.length})
                </button>
              </div>
            )}
          </div>

          <div style={{ background: bg.card, borderRadius: 12, padding: 20, border: `1px solid ${bg.cardBorder}` }}>
            <h3 style={{ color: "#86efac", marginTop: 0 }}>Synergy engines</h3>
            {synergyLines.length === 0 && (
              <div style={{ color: "#94a3b8", background: "#0a150a", borderRadius: 8, padding: 12 }}>
                There is not enough role density yet to detect clear engines. Loading Scryfall data usually improves this section.
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
                    Detected pieces: {line.pieces.join(", ")}
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
              <h3 style={{ color: "#86efac", margin: 0 }}>📄 Downloadable analysis</h3>
              <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>Download a PDF with summary, diagnosis, charts, combos, recommendations, cuts and decklist.</div>
            </div>
            <button onClick={downloadAnalysisPdf} disabled={!cards.length} style={{ background: cards.length ? "#14532d" : "#1f2937", color: "#86efac", border: "1px solid #22c55e", borderRadius: 10, padding: "10px 14px", cursor: cards.length ? "pointer" : "not-allowed", fontWeight: 900 }}>Download analysis</button>
            {reportStatus && <div style={{ color: "#86efac", fontSize: 12, width: "100%" }}>{reportStatus}</div>}
          </div>
          <div style={{ background: bg.card, borderRadius: 16, padding: 22, border: "1px solid #a855f755", gridColumn: "1 / -1" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div>
                <div style={{ color: "#c084fc", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", fontFamily: "monospace", marginBottom: 8 }}>Archetype v2.9</div>
                <h3 style={{ color: "#fff", margin: 0, fontSize: 24 }}>{archetypes[0]?.macroArchetype || "No macroarchetype"} · {archetypes[0]?.mainTheme || "No main theme"}</h3>
                <div style={{ color: "#fbbf24", marginTop: 6, fontWeight: 900 }}>Confidence: {archetypes[0]?.confidence || archetypes[0]?.score || 0}%</div>
              </div>
              <div style={{ background: "#071207", border: "1px solid #14532d", borderRadius: 12, padding: 12, minWidth: 240 }}>
                <div style={{ color: "#86efac", fontWeight: 900, marginBottom: 6 }}>Subplans</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{(archetypes[0]?.subThemes?.length ? archetypes[0].subThemes : ["No strong subplans"]).map(x => <Tag key={x} label={x} />)}</div>
              </div>
            </div>
            <details style={{ marginTop: 16 }} open>
              <summary style={{ color: "#86efac", cursor: "pointer", fontWeight: 900 }}>Why this archetype?</summary>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12, marginTop: 12 }}>
                <div style={{ background: "#071207", border: "1px solid #14532d", borderRadius: 12, padding: 14 }}>
                  <div style={{ color: "#86efac", fontWeight: 900, marginBottom: 8 }}>Explanation</div>
                  {(archetypes[0]?.explanation || ["Paste a decklist to calculate the archetype."]).map((x, i) => <p key={i} style={{ color: "#cbd5e1", lineHeight: 1.55, margin: "0 0 8px" }}>• {x}</p>)}
                  <div style={{ color: "#fbbf24", fontSize: 12, marginTop: 10 }}>{archetypes[0]?.edhrecStatus || "EDHREC comparison: pending integration."}</div>
                  <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 8, lineHeight: 1.45 }}>
                    Current method: macroarchetype based on Aggro / Midrange / Control / Combo, categories used by Wizards to read formats. The Commander theme comes from Oracle text, detected roles, card density, and the commander ability. EDHREC is prepared as an external comparison, but it is not used until real integration exists.
                  </div>
                </div>
                <div style={{ background: "#071207", border: "1px solid #14532d", borderRadius: 12, padding: 14 }}>
                  <div style={{ color: "#86efac", fontWeight: 900, marginBottom: 8 }}>Theme score</div>
                  {(archetypes[0]?.themeScores || []).slice(0, 8).map(t => (
                    <div key={t.name} style={{ marginBottom: 9 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, color: "#cbd5e1", fontSize: 12, marginBottom: 4 }}><span>{t.name}</span><b>{t.score}</b></div>
                      <ScoreBar value={t.score} color={t.name === archetypes[0]?.mainTheme ? "#c084fc" : "#22c55e"} />
                    </div>
                  ))}
                </div>
                <div style={{ background: "#071207", border: "1px solid #14532d", borderRadius: 12, padding: 14 }}>
                  <div style={{ color: "#86efac", fontWeight: 900, marginBottom: 8 }}>Evidence cards</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {(archetypes[0]?.evidenceCards || archetypes[0]?.evidence || []).map(name => {
                      const card = findCard(cards, name) || suggestionCardData[normalizeName(name)];
                      return <span key={name} onMouseEnter={(e) => showCardPreviewFromData(card || { name }, e)} onMouseMove={(e) => showCardPreviewFromData(card || { name }, e)} onMouseLeave={() => setPreviewCard(null)} style={{ background: "#0a150a", border: "1px solid #14532d", color: "#cbd5e1", borderRadius: 999, padding: "5px 9px", fontSize: 12, cursor: card?.image ? "zoom-in" : "default" }}>{name}</span>;
                    })}
                  </div>
                  <div style={{ color: "#86efac", fontWeight: 900, margin: "14px 0 8px" }}>Why not others</div>
                  {(archetypes[0]?.whyNot || []).slice(0, 4).map(x => <div key={x} style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.45, marginBottom: 6 }}>• {x}</div>)}
                </div>
              </div>
            </details>
          </div>

          <div style={{ background: bg.card, borderRadius: 12, padding: 20, border: "1px solid #14532d" }}>
            <h3 style={{ color: "#4ade80", marginTop: 0 }}>✅ Strengths</h3>
            {strengths.map((s, i) => (
              <div key={i} style={{ color: "#cbd5e1", background: "#0a1f0a", padding: 12, borderRadius: 8, marginBottom: 10, border: "1px solid #0d2b0d" }}>
                <div style={{ color: "#86efac", fontWeight: 800, marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>{s.text}</div>
              </div>
            ))}
          </div>

          <div style={{ background: bg.card, borderRadius: 12, padding: 20, border: "1px solid #7f1d1d44" }}>
            <h3 style={{ color: "#f87171", marginTop: 0 }}>⚠️ Weaknesses</h3>
            {weaknesses.map((w, i) => (
              <div key={i} style={{ color: "#cbd5e1", background: "#150a0a", padding: 12, borderRadius: 8, marginBottom: 10, border: "1px solid #2b0d0d" }}>
                <div style={{ color: "#fca5a5", fontWeight: 800, marginBottom: 4 }}>{w.title}</div>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>{w.text}</div>
              </div>
            ))}
          </div>

          <div style={{ background: bg.card, borderRadius: 12, padding: 20, border: `1px solid ${bg.cardBorder}`, gridColumn: "1 / -1" }}>
            <h3 style={{ color: "#86efac", marginTop: 0 }}>📋 Role diagnosis</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              {scores.radar.map(r => (
                <button
                  key={r.subject}
                  onClick={() => setSelectedDiagnostic(selectedDiagnostic === r.subject ? null : r.subject)}
                  title={`View breakdown for ${r.subject}`}
                  style={{ textAlign: "left", background: selectedDiagnostic === r.subject ? "#102510" : "#0a150a", borderRadius: 10, padding: 12, border: selectedDiagnostic === r.subject ? "1px solid #22c55e" : "1px solid #1a2e1a", cursor: "pointer", fontFamily: "inherit" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 8 }}>
                    <span style={{ color: "#cbd5e1", fontWeight: 700 }}>{r.subject}</span>
                    <span style={{ color: r.value >= 75 ? "#4ade80" : r.value >= 55 ? "#fbbf24" : "#ef4444", fontFamily: "monospace", fontWeight: 900 }}>{r.value}</span>
                  </div>
                  <ScoreBar value={r.value} color={r.value >= 75 ? "#4ade80" : r.value >= 55 ? "#fbbf24" : "#ef4444"} />
                  <div style={{ color: "#6b7280", fontSize: 10, marginTop: 7 }}>Click for breakdown</div>
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
                    <button onClick={() => setSelectedDiagnostic(null)} style={{ background: "#0d2b14", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>Close</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginTop: 12 }}>
                    <div style={{ color: "#cbd5e1", lineHeight: 1.6 }}><b style={{ color: "#fff" }}>Goal:</b><br />{detail.goal}</div>
                    <div style={{ color: "#cbd5e1", lineHeight: 1.6 }}><b style={{ color: "#fff" }}>Why this score:</b><br />{detail.why}</div>
                    <div style={{ color: "#cbd5e1", lineHeight: 1.6 }}><b style={{ color: "#fff" }}>How it is calculated:</b><br />{detail.formula}</div>
                  </div>
                  {detail.cards?.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ color: "#86efac", fontWeight: 900, marginBottom: 8 }}>Cards/pieces that matter:</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {detail.cards.map(x => {
                          const card = cardFromDisplayLabel(x);
                          return <span key={x} onMouseEnter={(e) => showCardPreviewFromData(card, e)} onMouseMove={(e) => showCardPreviewFromData(card, e)} onMouseLeave={() => setPreviewCard(null)} style={{ background: "#0a150a", border: "1px solid #14532d", color: "#cbd5e1", borderRadius: 999, padding: "5px 9px", fontSize: 12, cursor: card?.image || card?.smallImage ? "zoom-in" : "default" }}>{x}</span>;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <div style={{ background: bg.card, borderRadius: 12, padding: 20, border: `1px solid ${bg.cardBorder}`, gridColumn: "1 / -1" }}>
            <h3 style={{ color: "#86efac", marginTop: 0 }}>🕹️ Suggested game plan</h3>
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
              💡 Upgrades come from detected structural gaps. They are not a fixed list: they change based on roles, curve and deck archetype.
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
            <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.5 }}>These are not mandatory cuts. They are cards the algorithm considers more reviewable due to low role impact, high cost, or lower structural importance.</p>
            {cutCandidates.slice(0, 8).map(({ card, score, roles, reasons }, i) => (
              <div key={card.key} style={{ display: "flex", gap: 10, alignItems: "center", background: "#0a150a", borderRadius: 8, padding: 10, marginBottom: 8, border: "1px solid #1a2e1a" }}>
                {card.smallImage && <img src={card.smallImage} style={{ width: 44, borderRadius: 5 }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#fff", fontWeight: 700 }}>{i + 1}. {card.name}</div>
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>{roles.join(", ") || "No clear role"}</div>
                  <div style={{ color: "#6b7280", fontSize: 11, marginTop: 2 }}>{reasons?.slice(0, 2).join(" · ") || "revisar impacto real en table"}</div>
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
            <h3 style={{ color: "#86efac", marginTop: 0 }}>Cards you want to add</h3>

            {visibleAutoAddRecommendations.length > 0 && (
              <div style={{ background: "#071207", border: "1px solid #14532d", borderRadius: 12, padding: 12, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 10 }}>
                  <div>
                    <div style={{ color: "#86efac", fontWeight: 900 }}>Automatic suggestions for this deck</div>
                    <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>Cards you do not have that the app detects as possible inclusions due to missing roles, archetype, or almost-complete combos. Filtered by commander color identity once Scryfall loads that data.</div>
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
              <div style={{ color: "#cbd5e1", fontSize: 13, marginBottom: 8 }}>Search and select a card</div>
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
                  placeholder="Type a card, e.g. Skullclamp"
                  style={{ flex: 1, minWidth: 220, background: "#050d05", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 8, padding: "10px 12px", outline: "none" }}
                />
                <button onClick={searchWantedCard} style={{ background: "#14532d", color: "#86efac", border: "1px solid #22c55e", borderRadius: 8, padding: "10px 14px", cursor: "pointer", fontWeight: 800 }}>
                  Search
                </button>
                <button onClick={() => addWantedCard(wantedSearch)} style={{ background: "#0d2b14", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 8, padding: "10px 14px", cursor: "pointer", fontWeight: 800 }}>
                  Add text
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
                  <div style={{ color: "#86efac", fontSize: 12, marginBottom: 6 }}>Selected:</div>
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
                          title="Click to remove"
                          style={{ background: "#1a3a1a", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 10, padding: 7, cursor: "pointer", fontSize: 12, display: "flex", gap: 8, alignItems: "center", textAlign: "left", fontFamily: "inherit" }}
                        >
                          <div style={{ width: 38, height: 53, borderRadius: 5, overflow: "hidden", background: "#020802", border: "1px solid #14532d", flex: "0 0 auto" }}>
                            {data?.smallImage || data?.image ? <img src={data.smallImage || data.image} alt={card} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ color: "#fff", fontWeight: 800, lineHeight: 1.2 }}>{card}</div>
                            <div style={{ color: "#fca5a5", fontSize: 10, marginTop: 2 }}>Remove ✕</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div style={{ color: "#cbd5e1", fontSize: 13, margin: "12px 0 8px" }}>Or paste several manually</div>
            <textarea
              value={wantedCards}
              onChange={e => setWantedCards(e.target.value)}
              placeholder={`Skullclamp
Tendershoot Dryad
Mycoloth`}
              style={{ width: "100%", height: 160, background: "#050d05", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 12, padding: 14, fontFamily: "monospace", fontSize: 12, outline: "none" }}
            />
            <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.5 }}>
              The app tries to infer each new card role and avoids cutting the commander, lands, Sol Ring, Arcane Signet, and structural pieces unless they are truly redundant.
            </p>
          </div>
          <div style={{ background: bg.card, borderRadius: 12, padding: 20, border: `1px solid ${bg.cardBorder}` }}>
            <h3 style={{ color: "#86efac", marginTop: 0 }}>Suggested cuts by card</h3>
            {[...selectedWantedCards, ...parseWantedList(wantedCards)].length === 0 && <div style={{ color: "#94a3b8" }}>Select or type cards to add to see suggestions.</div>}
            {[...new Set([...selectedWantedCards, ...parseWantedList(wantedCards)])].map(wanted => {
              const wantedRole = inferWantedCardRole(wanted);
              const candidates = getCutCandidatesForWanted(cards, wanted, 5);
              return (
                <div key={wanted} style={{ background: "#0a150a", borderRadius: 10, padding: 14, marginBottom: 12, border: "1px solid #14532d" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 10 }}>
                    <div style={{ color: "#fff", fontWeight: 800 }}>To add: {wanted}</div>
                    <Tag label={wantedRole} color={ROLE_COLORS[wantedRole] || "#86efac"} />
                  </div>
                  {candidates.map(({ card, score, roles, reasons }, i) => (
                    <div key={`${wanted}-${card.key}`} style={{ display: "flex", gap: 10, alignItems: "center", background: "#071007", borderRadius: 8, padding: 10, marginBottom: 8 }}>
                      {card.smallImage && <img src={card.smallImage} style={{ width: 44, borderRadius: 5 }} />}
                      <div style={{ flex: 1 }}>
                        <div style={{ color: "#fff", fontWeight: 700 }}>{i + 1}. {card.name}</div>
                        <div style={{ color: "#94a3b8", fontSize: 12 }}>{roles.join(", ") || "No clear role"}</div>
                        <div style={{ color: "#6b7280", fontSize: 11 }}>Reason: {reasons?.slice(0, 2).join(" · ") || `reviewable slot por score ${score}`}. Confirm manually before cutting.</div>
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
              <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>{visibleFilteredCards.reduce((a, c) => a + c.qty, 0)} of {filteredCards.reduce((a, c) => a + c.qty, 0)} cards shown</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                value={cardSearch}
                onChange={e => setCardSearch(e.target.value)}
                placeholder="Search card..."
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
              {(activeFilter || cardSearch || typeFilter !== "All" || roleFilter !== "All") && (
                <button onClick={clearAllCardFilters} style={{ background: "#0d2b14", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontWeight: 700 }}>
                  Clear filter
                </button>
              )}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14 }}>
            {visibleFilteredCards.map(c => <div
              key={c.key}
              onClick={() => openArtSelector(c)}
              onMouseEnter={(e) => showCardPreviewFromData(c, e)}
              onMouseMove={(e) => showCardPreviewFromData(c, e)}
              onMouseLeave={() => setPreviewCard(null)}
              style={{ background: bg.card, borderRadius: 12, padding: 10, border: `1px solid ${bg.cardBorder}`, cursor: "pointer" }}
              title="Click to choose another art/printing"
            >
              {c.image ? <img src={c.image} alt={c.name} loading="lazy" style={{ width: "100%", borderRadius: 10, display: "block" }} /> : <div style={{ height: 230, borderRadius: 10, background: "#050d05", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", textAlign: "center" }}>No image<br />Load Scryfall</div>}
              <div style={{ marginTop: 8, color: "#fff", fontWeight: 800, fontSize: 13 }}>{c.qty}x {c.name}</div>
              <div style={{ color: "#94a3b8", fontSize: 11 }}>{c.typeLine || c.type}</div>
              <div style={{ color: "#fbbf24", fontSize: 10, fontWeight: 800, marginTop: 3 }}>Click: choose art</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>{getEffectiveRoles(c).slice(0, 4).map(r => <Tag key={r} label={r} />)}</div>
            </div>)}
          </div>
          {filteredCards.length > visibleFilteredCards.length && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
              <button onClick={() => setCardVisibleCount(count => count + 40)} style={{ background: "#14532d", color: "#86efac", border: "1px solid #22c55e", borderRadius: 999, padding: "10px 18px", cursor: "pointer", fontWeight: 900 }}>
                Load 40 more cards ({visibleFilteredCards.length}/{filteredCards.length})
              </button>
            </div>
          )}
        </div>
      )}

      {artModalCard && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 99998, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => { setArtModalCard(null); setArtModalPrints([]); }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: "min(1120px, 96vw)", maxHeight: "86vh", overflow: "auto", background: "#061006", border: "1px solid #22c55e88", borderRadius: 20, padding: 18, boxShadow: "0 24px 90px rgba(0,0,0,.8)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <h3 style={{ color: "#86efac", margin: 0 }}>Choose art for {artModalCard.name}</h3>
                <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>{artModalStatus}</div>
              </div>
              <button onClick={() => { setArtModalCard(null); setArtModalPrints([]); }} style={{ background: "#0d2b14", color: "#d1fae5", border: "1px solid #14532d", borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontWeight: 900 }}>Close</button>
            </div>
            {!artModalPrints.length && <div style={{ color: "#fbbf24", padding: 22, textAlign: "center" }}>Searching versions on Scryfall…</div>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14 }}>
              {artModalPrints.map(print => {
                const scry = scryToCardData(print);
                const img = scry.image || scry.smallImage;
                return (
                  <button key={print.id || `${print.set}-${print.collector_number}`} onClick={() => applyCardArt(print)} style={{ textAlign: "left", background: "#081308", border: "1px solid #14532d", borderRadius: 14, padding: 10, cursor: "pointer", color: "#e2f0e2", fontFamily: "inherit" }}>
                    {img ? <img src={img} alt={print.name} loading="lazy" style={{ width: "100%", borderRadius: 10, display: "block", marginBottom: 8 }} /> : <div style={{ height: 235, borderRadius: 10, background: "#020802", display: "grid", placeItems: "center", color: "#6b7280", marginBottom: 8 }}>No image</div>}
                    <div style={{ fontWeight: 900, fontSize: 13 }}>{print.name}</div>
                    <div style={{ color: "#94a3b8", fontSize: 11 }}>{String(print.set || "").toUpperCase()} #{print.collector_number || "?"} · {print.lang || ""}</div>
                    <div style={{ color: "#fbbf24", fontSize: 10, marginTop: 4 }}>{print.released_at || ""}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {previewCard && (
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
          {previewCard.image ? (
            <img src={previewCard.image} alt={previewCard.name} style={{ width: "100%", borderRadius: 14, display: "block" }} />
          ) : (
            <div style={{ height: 438, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 18, background: "linear-gradient(135deg,#061006,#020802)", border: "1px solid #14532d", color: previewCard.notFound ? "#fbbf24" : "#86efac", fontWeight: 900 }}>
              {previewCard.loading ? "Loading image…" : "No image available"}
            </div>
          )}
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 14, marginTop: 8 }}>{previewCard.qty}x {previewCard.name}</div>
          <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 3 }}>{previewCard.typeLine || previewCard.type}</div>
        </div>
      )}

      <div style={{ textAlign: "center", color: "#31503a", fontSize: 11, marginTop: 20, fontFamily: "monospace", lineHeight: 1.6 }}>
        {`DECKFORGE ANALYZER · DASHBOARD · UNIVERSAL · ${APP_VERSION}`}<br />
        Deck Analyzer is an unofficial fan project. Not affiliated with Wizards of the Coast, Scryfall, EDHREC, Archidekt, Moxfield, Manabox or Commander Spellbook.
      </div>
      </div>
    </div>
  );
}
