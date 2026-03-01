// Sample flashcard data

const originalDeck = [
  { front: '00', back: 'Ozzy Ozbourne bites a bat' }, { front: '03', back: 'Oliver Cromwell starved the irish' }, { front: '15', back: 'Albert Einstein Draws on the chalboard' }, { front: '16', back: 'Arnold Schwarzenegger Lifts weights' }, { front: '18', back: 'Adolf Hitler Does a nazi salute to nazi soldiers' }, { front: '33', back: 'Charlie Chaplin Leans on a cane' }, { front: '37', back: 'Che Guevara Does a communist revolution in cuba' }, { front: '38', back: 'Chris Hemsworth throws a hammer' }, { front: '39', back: 'Chuck Norris Roundhouse kicked ' }, { front: '40', back: 'Dara OBrien Does guest apperance on bbc panel show' }, { front: '41', back: 'David Attenborough Presents a nature show' }, { front: '42', back: 'David Beckham Scores a freekick at world cup' }, { front: '43', back: 'Daniel Craig Neutralises a russian spy' }, { front: '44', back: 'Didier Drogba Scores a header with his big forhead' }, { front: '45', back: 'Dale Earnhart Dies at Daytona 500' }, { front: '46', back: 'Dr Spence Gives talk at morning assembly' }, { front: 'stevel carrel', back: 'Santa Claus Flies a sleigh' }, { front: '', back: 'Sarah Nelson gets married in stockholm' }, { front: '', back: 'Gerry Adams shoots someone in kneecap' }, { front: '', back: 'George Clooney Robs a casino with 11 people in Las Vegas' }
];


// const originalDeck = [
//   { front: 'What does CSS stand for?', back: 'Cascading Style Sheets' },
//   { front: 'What is the keyword to define a variable in ES6 that cannot be reassigned?', back: 'const' },
//   { front: 'Which HTML tag is used to define an internal style sheet?', back: '<style>' },
//   { front: 'What is the output of `typeof null` in JavaScript?', back: '"object"' },
//   { front: 'What does API stand for?', back: 'Application Programming Interface' },
//   { front: 'In Git, what command is used to save your changes to the local repository?', back: 'git commit' },
//   { front: 'What is the main function of a DNS server?', back: 'To translate domain names into IP addresses' }
// ];

// App State
let deck = [...originalDeck];
let completedCards = [];
let currentCardIndex = 0;
let isAnswerVisible = false;
let currentLevel = 2; // 1: Initials, 2: Actions

// Mnemonic Mapping for Level 1
const mnemonicMap = {
  '1': 'A',
  '2': 'B',
  '3': 'C (K)',
  '4': 'D',
  '5': 'E',
  '6': 'S',
  '7': 'G (J)',
  '8': 'H',
  '9': 'N (M)',
  '0': 'O'
};

function getInitials(numStr) {
  const str = String(numStr).trim();
  if (/^\d+$/.test(str)) {
    return str.split('').map(d => mnemonicMap[d] || d).join(' - ');
  }
  return '(Not a number)';
}

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
const btnLevel1 = document.getElementById('btn-level-1');
const btnLevel2 = document.getElementById('btn-level-2');

// Initialize app
function init() {
  resetState();
  updateUI();
  setupEventListeners();
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

  if (currentLevel === 1) {
    cardBackContentEl.textContent = getInitials(currentCard.front);
  } else {
    cardBackContentEl.textContent = currentCard.back;
  }

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

  // Level selector clicks
  btnLevel1.addEventListener('click', () => {
    currentLevel = 1;
    btnLevel1.classList.add('active');
    btnLevel2.classList.remove('active');
    updateUI();
  });

  btnLevel2.addEventListener('click', () => {
    currentLevel = 2;
    btnLevel2.classList.add('active');
    btnLevel1.classList.remove('active');
    updateUI();
  });
}

// Start app
document.addEventListener('DOMContentLoaded', init);
