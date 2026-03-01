// App State
let originalDeck = [];
let deck = [];
let completedCards = [];
let currentCardIndex = 0;
let isAnswerVisible = false;

// DOM Elements
const cardFrontEl = document.getElementById('card-front');
const cardFrontContentEl = document.getElementById('card-front-content');
const cardBackEl = document.getElementById('card-back');
const cardBackContentEl = document.getElementById('card-back-content');
const progressBarEl = document.getElementById('progress-bar');
const progressTextEl = document.getElementById('progress-text');
const remainingTextEl = document.getElementById('remaining-text');
const hintSpaceEl = document.getElementById('hint-space');
const hintActionsEl = document.getElementById('hint-actions');
const completionScreenEl = document.getElementById('completion-screen');
const restartBtnEl = document.getElementById('restart-btn');

// New DOM Elements for Deck Selection
const deckSelectionEl = document.getElementById('deck-selection');
const deckListEl = document.getElementById('deck-list');
const appCoreEl = document.getElementById('app-core');
const progressContainerEl = document.getElementById('progress-container');
const statsContainerEl = document.getElementById('stats-container');
const btnBackToDecks = document.getElementById('btn-back-to-decks');

// Initialize app: Fetch manifest instead of starting game immediately
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

function renderDeckMenu(decks) {
  deckListEl.innerHTML = ''; // clear loading message
  if (decks.length === 0) {
    deckListEl.innerHTML = `<p style="color:#94a3b8;">No decks found.</p>`;
    return;
  }

  decks.forEach(deckFilename => {
    const btn = document.createElement('button');
    btn.className = 'deck-item';
    // Remove extension for display name
    btn.textContent = deckFilename.replace(/\.[^/.]+$/, "");
    btn.addEventListener('click', () => loadDeck(deckFilename));
    deckListEl.appendChild(btn);
  });
}

async function loadDeck(filename) {
  try {
    deckSelectionEl.style.display = 'none';
    appCoreEl.style.display = 'block';
    progressContainerEl.style.display = 'block';
    statsContainerEl.style.display = 'flex';

    // Show a loading state on the card
    cardFrontContentEl.textContent = "Loading deck...";
    cardBackContentEl.textContent = "";

    const response = await fetch(`decks/${filename}`);
    if (!response.ok) throw new Error('Could not fetch deck file');
    const textData = await response.text();

    // Parse the text data (number   text)
    originalDeck = [];
    const lines = textData.split('\n');
    for (const line of lines) {
      if (!line.trim()) continue; // skip empty lines

      // Match strictly on a tab character.
      // e.g. "Front with spaces\tBackside text" -> front: "Front with spaces", back: "Backside text"
      // Split by the first tab
      const firstTabIdx = line.indexOf('\t');
      if (firstTabIdx !== -1) {
        const front = line.substring(0, firstTabIdx).trim();
        const back = line.substring(firstTabIdx + 1).trim();
        originalDeck.push({ front, back });
      }
    }

    if (originalDeck.length === 0) {
      throw new Error("No valid cards found in this file.");
    }

    resetState();
    updateUI();

  } catch (error) {
    cardFrontContentEl.textContent = `Error: ${error.message}`;
    originalDeck = [];
    deck = [];
  }
}

function resetState() {
  // Deep copy original deck and shuffle
  deck = [...originalDeck].sort(() => Math.random() - 0.5);
  completedCards = [];
  currentCardIndex = 0;
  isAnswerVisible = false;
  completionScreenEl.classList.remove('visible');
}

function updateUI() {
  if (deck.length === 0) {
    showCompletionScreen();
    return;
  }

  const currentCard = deck[currentCardIndex];
  cardFrontContentEl.textContent = currentCard.front;
  cardBackContentEl.textContent = currentCard.back;

  // Update stats
  const totalCards = originalDeck.length;
  const completedCount = completedCards.length;
  const progressPercent = (completedCount / totalCards) * 100;

  progressBarEl.style.width = `${progressPercent}%`;
  progressTextEl.textContent = `${completedCount} / ${totalCards} Mastered`;
  remainingTextEl.textContent = `${deck.length} remaining`;

  // Visibility logic
  if (isAnswerVisible) {
    cardBackEl.classList.remove('hidden');
    cardBackEl.classList.add('visible', 'animate-pop-in');
    hintSpaceEl.style.display = 'none';
    hintActionsEl.style.display = 'flex';
  } else {
    cardBackEl.classList.add('hidden');
    cardBackEl.classList.remove('visible', 'animate-pop-in');

    // Add pop-in animation to front card on new question
    cardFrontEl.classList.remove('animate-pop-in');
    void cardFrontEl.offsetWidth; // trigger reflow
    cardFrontEl.classList.add('animate-pop-in');

    hintSpaceEl.style.display = 'flex';
    hintActionsEl.style.display = 'none';
  }
}

function handleSpacebar() {
  if (deck.length === 0) return;
  if (!isAnswerVisible) {
    isAnswerVisible = true;
    updateUI();
  }
}

function handleEnter() {
  if (deck.length === 0 || !isAnswerVisible) return;

  // Mark as correct (remove from active deck)
  const currentCard = deck.splice(currentCardIndex, 1)[0];
  completedCards.push(currentCard);

  // If we reached the end of the deck, wrap around
  if (currentCardIndex >= deck.length) {
    currentCardIndex = 0;
  }

  isAnswerVisible = false;
  updateUI();
}

function handleDownArrow() {
  if (deck.length === 0 || !isAnswerVisible) return;

  // Keep in active deck, just move to next card
  currentCardIndex++;

  // Wrap around if at the end
  if (currentCardIndex >= deck.length) {
    currentCardIndex = 0;
  }

  isAnswerVisible = false;
  updateUI();
}

function showCompletionScreen() {
  progressBarEl.style.width = '100%';
  progressTextEl.textContent = `${originalDeck.length} / ${originalDeck.length} Mastered`;
  remainingTextEl.textContent = `0 remaining`;
  completionScreenEl.classList.add('visible');
}

function setupEventListeners() {
  // Keyboard events
  document.addEventListener('keydown', (e) => {
    // Prevent default scrolling for Space and Down arrow
    if (e.code === 'Space' || e.code === 'ArrowDown') {
      e.preventDefault();
    }

    if (e.code === 'Space') {
      handleSpacebar();
    } else if (e.code === 'Enter') {
      handleEnter();
    } else if (e.code === 'ArrowDown') {
      handleDownArrow();
    }
  });

  // Restart button click
  restartBtnEl.addEventListener('click', () => {
    resetState();
    updateUI();
  });

  // Back to Deck Selection
  btnBackToDecks.addEventListener('click', () => {
    // Hide App Core, Show Selection Menu
    appCoreEl.style.display = 'none';
    progressContainerEl.style.display = 'none';
    statsContainerEl.style.display = 'none';
    deckSelectionEl.style.display = 'block';
    // Hide completion screen if it was visible
    completionScreenEl.classList.remove('visible');

    // Reset deck arrays so keyboard shortcuts do nothing while in menu
    originalDeck = [];
    deck = [];
  });
}

// Start app
document.addEventListener('DOMContentLoaded', init);
