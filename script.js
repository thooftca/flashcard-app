// ─── Constants ────────────────────────────────────────────────────────────────
const SNOOZE_MS = {
  1: 1 * 60 * 60 * 1000,        // 1 hour
  2: 24 * 60 * 60 * 1000,       // 24 hours
  3: 3 * 24 * 60 * 60 * 1000,   // 3 days
};

// ─── App State ─────────────────────────────────────────────────────────────────
let currentDeckFilename = null;  // key for localStorage
let allCards = [];               // all cards parsed from file (including snoozed)
let activeDeck = [];             // cards currently in play this session
let currentCardIndex = 0;
let isAnswerVisible = false;

// ─── DOM Elements ──────────────────────────────────────────────────────────────
const cardFrontEl = document.getElementById('card-front');
const cardFrontContentEl = document.getElementById('card-front-content');
const cardBackEl = document.getElementById('card-back');
const cardBackContentEl = document.getElementById('card-back-content');
const hintSpaceEl = document.getElementById('hint-space');
const hintActionsEl = document.getElementById('hint-actions');
const completionScreenEl = document.getElementById('completion-screen');
const completionMsgEl = document.getElementById('completion-msg');
const restartBtnEl = document.getElementById('restart-btn');
const deckSelectionEl = document.getElementById('deck-selection');
const deckListEl = document.getElementById('deck-list');
const appCoreEl = document.getElementById('app-core');
const streakBarContainerEl = document.getElementById('streak-bar-container');
const streakBarEl = document.getElementById('streak-bar');
const streakLabelsEl = document.getElementById('streak-labels');
const scoreChipEl = document.getElementById('score-chip');
const btnBackToDecks = document.getElementById('btn-back-to-decks');

// ─── LocalStorage Helpers ──────────────────────────────────────────────────────
function getStorageKey(filename) {
  return `mastery_cards_state_${filename}`;
}

function loadState(filename) {
  try {
    const raw = localStorage.getItem(getStorageKey(filename));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveState(filename, state) {
  localStorage.setItem(getStorageKey(filename), JSON.stringify(state));
}

function getCardState(state, cardId) {
  return state[cardId] || { correctStreak: 0, nextShowTime: 0 };
}

// ─── Score & Streak Computation ────────────────────────────────────────────────
function computeStreakCounts(cards, state) {
  let counts = [0, 0, 0, 0]; // [streak0, streak1, streak2, streak3+]
  for (const card of cards) {
    const cs = getCardState(state, card.id).correctStreak;
    if (cs <= 0) counts[0]++;
    else if (cs === 1) counts[1]++;
    else if (cs === 2) counts[2]++;
    else counts[3]++;
  }
  return counts;
}

function computeScore(counts) {
  return counts[1] * 1 + counts[2] * 2 + counts[3] * 3;
}

// ─── Progress Bar ──────────────────────────────────────────────────────────────
const STREAK_COLOURS = ['#475569', '#f97316', '#22c55e', '#c026d3'];
const STREAK_LABELS = ['None', 'Streak 1', 'Streak 2', 'Streak 3+'];
const STREAK_EMOJI = ['⬜', '🟠', '🟢', '🟣'];

function updateStreakBar() {
  const state = loadState(currentDeckFilename);
  const counts = computeStreakCounts(allCards, state);
  const total = allCards.length;

  streakBarEl.innerHTML = '';
  streakLabelsEl.innerHTML = '';

  if (total === 0) return;

  counts.forEach((count, i) => {
    const pct = (count / total) * 100;
    if (pct === 0) return;
    const seg = document.createElement('div');
    seg.className = 'streak-segment';
    seg.style.width = `${pct}%`;
    seg.style.backgroundColor = STREAK_COLOURS[i];
    seg.title = `${STREAK_LABELS[i]}: ${count}`;
    streakBarEl.appendChild(seg);
  });

  counts.forEach((count, i) => {
    const span = document.createElement('span');
    span.className = 'streak-label-item';
    span.style.color = i === 0 ? '#94a3b8' : STREAK_COLOURS[i];
    span.textContent = `${STREAK_EMOJI[i]} ${count}`;
    streakLabelsEl.appendChild(span);
  });
}

function updateScoreChip() {
  const state = loadState(currentDeckFilename);
  const counts = computeStreakCounts(allCards, state);
  const score = computeScore(counts);
  const total = allCards.length * 3;
  scoreChipEl.textContent = `${score} / ${total}`;
}

// ─── Deck Menu ─────────────────────────────────────────────────────────────────
async function init() {
  setupEventListeners();
  try {
    const response = await fetch('decks/manifest.json');
    if (!response.ok) throw new Error('Could not fetch manifest');
    const decks = await response.json();
    renderDeckMenu(decks);
  } catch (error) {
    deckListEl.innerHTML = `<p style="color:#ef4444;">Error loading decks: ${error.message}</p>
    <p style="color:#94a3b8; font-size:0.9rem; margin-top:1rem;">Note: If viewing locally via file://, CORS might block loading files. Consider using a local server (like python -m http.server).</p>`;
  }
}

function getDeckScoreInfo(filename) {
  const state = loadState(filename);
  if (Object.keys(state).length === 0) return null; // never played

  // We cache total card count in state under a special key
  const totalCards = state.__totalCards;
  const counts = [0, 0, 0, 0];
  for (const [key, val] of Object.entries(state)) {
    if (key === '__totalCards') continue;
    const cs = val.correctStreak || 0;
    if (cs <= 0) counts[0]++;
    else if (cs === 1) counts[1]++;
    else if (cs === 2) counts[2]++;
    else counts[3]++;
  }
  const score = computeScore(counts);
  const total = totalCards ? totalCards * 3 : null;
  return { score, total };
}

function renderDeckMenu(decks) {
  deckListEl.innerHTML = '';
  if (decks.length === 0) {
    deckListEl.innerHTML = `<p style="color:#94a3b8;">No decks found.</p>`;
    return;
  }

  decks.forEach(deckFilename => {
    const btn = document.createElement('button');
    btn.className = 'deck-item';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'deck-name';
    nameSpan.textContent = deckFilename.replace(/\.[^/.]+$/, '');

    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'deck-score';
    const info = getDeckScoreInfo(deckFilename);
    if (info) {
      scoreSpan.textContent = info.total != null
        ? `${info.score} / ${info.total}`
        : `${info.score} pts`;
    } else {
      scoreSpan.textContent = '—';
    }

    btn.appendChild(nameSpan);
    btn.appendChild(scoreSpan);
    btn.addEventListener('click', () => loadDeck(deckFilename));
    deckListEl.appendChild(btn);
  });
}

// ─── Load Deck ─────────────────────────────────────────────────────────────────
async function loadDeck(filename) {
  try {
    currentDeckFilename = filename;

    deckSelectionEl.style.display = 'none';
    appCoreEl.style.display = 'block';
    streakBarContainerEl.style.display = 'block';
    scoreChipEl.style.display = 'flex';

    cardFrontContentEl.textContent = 'Loading deck...';
    cardBackContentEl.textContent = '';

    const response = await fetch(`decks/${filename}`);
    if (!response.ok) throw new Error('Could not fetch deck file');
    const textData = await response.text();

    // Parse: {id}\t{front}\t{back}
    allCards = [];
    for (const line of textData.split('\n')) {
      if (!line.trim()) continue;
      const parts = line.split('\t');
      if (parts.length >= 3) {
        const id = parts[0].trim();
        const front = parts[1].trim();
        const back = parts.slice(2).join('\t').trim();
        allCards.push({ id, front, back });
      } else if (parts.length === 2) {
        // Legacy 2-column format (no ID) — skip or handle gracefully
        const front = parts[0].trim();
        const back = parts[1].trim();
        allCards.push({ id: `__${front}`, front, back });
      }
    }

    if (allCards.length === 0) throw new Error('No valid cards found in this file.');

    // Cache the total card count for score display on menu
    const state = loadState(filename);
    state.__totalCards = allCards.length;
    saveState(filename, state);

    startSession();

  } catch (error) {
    cardFrontContentEl.textContent = `Error: ${error.message}`;
    allCards = [];
    activeDeck = [];
  }
}

// ─── Session Management ────────────────────────────────────────────────────────
function startSession() {
  const state = loadState(currentDeckFilename);
  const now = Date.now();

  // Only include non-snoozed cards in the active deck
  const eligible = allCards.filter(card => {
    const cs = getCardState(state, card.id);
    return cs.nextShowTime <= now;
  });

  // Shuffle
  activeDeck = eligible.sort(() => Math.random() - 0.5);
  currentCardIndex = 0;
  isAnswerVisible = false;
  completionScreenEl.classList.remove('visible');

  updateUI();
}

// ─── UI Update ─────────────────────────────────────────────────────────────────
function updateUI() {
  updateStreakBar();
  updateScoreChip();

  if (activeDeck.length === 0) {
    showCompletionScreen();
    return;
  }

  const currentCard = activeDeck[currentCardIndex];
  cardFrontContentEl.textContent = currentCard.front;
  cardBackContentEl.textContent = currentCard.back;

  if (isAnswerVisible) {
    cardBackEl.classList.remove('hidden');
    cardBackEl.classList.add('visible', 'animate-pop-in');
    hintSpaceEl.style.display = 'none';
    hintActionsEl.style.display = 'flex';
  } else {
    cardBackEl.classList.add('hidden');
    cardBackEl.classList.remove('visible', 'animate-pop-in');

    cardFrontEl.classList.remove('animate-pop-in');
    void cardFrontEl.offsetWidth; // trigger reflow
    cardFrontEl.classList.add('animate-pop-in');

    hintSpaceEl.style.display = 'flex';
    hintActionsEl.style.display = 'none';
  }
}

// ─── Answer Handlers ───────────────────────────────────────────────────────────
function handleSpacebar() {
  if (activeDeck.length === 0) return;
  if (!isAnswerVisible) {
    isAnswerVisible = true;
    updateUI();
  }
}

function handleEnter() {
  if (activeDeck.length === 0 || !isAnswerVisible) return;

  const card = activeDeck[currentCardIndex];
  const state = loadState(currentDeckFilename);
  const cardState = getCardState(state, card.id);

  // Increment streak
  const newStreak = cardState.correctStreak + 1;
  const snoozeMs = SNOOZE_MS[newStreak] || SNOOZE_MS[3];

  state[card.id] = {
    correctStreak: newStreak,
    nextShowTime: Date.now() + snoozeMs,
  };
  saveState(currentDeckFilename, state);

  // Remove from active deck
  activeDeck.splice(currentCardIndex, 1);

  if (currentCardIndex >= activeDeck.length) {
    currentCardIndex = 0;
  }

  isAnswerVisible = false;
  updateUI();
}

function handleDownArrow() {
  if (activeDeck.length === 0 || !isAnswerVisible) return;

  const card = activeDeck[currentCardIndex];
  const state = loadState(currentDeckFilename);

  // Reset streak to 0 on wrong answer
  state[card.id] = {
    correctStreak: 0,
    nextShowTime: 0,
  };
  saveState(currentDeckFilename, state);

  // Move card to the back of the active deck
  activeDeck.splice(currentCardIndex, 1);
  activeDeck.push(card);

  if (currentCardIndex >= activeDeck.length) {
    currentCardIndex = 0;
  }

  isAnswerVisible = false;
  updateUI();
}

// ─── Completion Screen ─────────────────────────────────────────────────────────
function showCompletionScreen() {
  const state = loadState(currentDeckFilename);
  const now = Date.now();

  // Find earliest snoozed card
  const snoozedCards = allCards.filter(card => {
    const cs = getCardState(state, card.id);
    return cs.nextShowTime > now;
  });

  if (snoozedCards.length > 0) {
    const earliest = Math.min(...snoozedCards.map(c => getCardState(state, c.id).nextShowTime));
    const diffMs = earliest - now;
    completionMsgEl.textContent = `All active cards done! ${snoozedCards.length} card${snoozedCards.length > 1 ? 's' : ''} will be ready in ${formatDuration(diffMs)}.`;
  } else {
    completionMsgEl.textContent = 'You have successfully mastered all cards in this deck.';
  }

  updateStreakBar();
  updateScoreChip();
  completionScreenEl.classList.add('visible');
}

function formatDuration(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 24) {
    const days = Math.floor(h / 24);
    return `${days} day${days > 1 ? 's' : ''}`;
  }
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ─── Event Listeners ───────────────────────────────────────────────────────────
function setupEventListeners() {
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowDown') e.preventDefault();
    if (e.code === 'Space') handleSpacebar();
    else if (e.code === 'Enter') handleEnter();
    else if (e.code === 'ArrowDown') handleDownArrow();
  });

  restartBtnEl.addEventListener('click', () => {
    startSession();
  });

  btnBackToDecks.addEventListener('click', () => {
    appCoreEl.style.display = 'none';
    streakBarContainerEl.style.display = 'none';
    scoreChipEl.style.display = 'none';
    deckSelectionEl.style.display = 'block';
    completionScreenEl.classList.remove('visible');

    // Re-render menu so scores refresh
    fetch('decks/manifest.json')
      .then(r => r.json())
      .then(decks => renderDeckMenu(decks))
      .catch(() => { });

    allCards = [];
    activeDeck = [];
    currentDeckFilename = null;
  });
}

// ─── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
