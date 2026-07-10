// Fallback words database in case words.json fails to load (e.g., CORS via file:// protocol)
const FALLBACK_WORDS = [
  { "es": "Text 1 Spanish", "ja": "Text 1 Japanese" },
  { "es": "Text 2 Spanish", "ja": "Text 2 Japanese" },
  { "es": "Text 3 Spanish", "ja": "Text 3 Japanese" },
  { "es": "Text 4 Spanish", "ja": "Text 4 Japanese" },
  { "es": "Text 5 Spanish", "ja": "Text 5 Japanese" },
  { "es": "Text 6 Spanish", "ja": "Text 6 Japanese" },
  { "es": "Text 7 Spanish", "ja": "Text 7 Japanese" },
  { "es": "Text 8 Spanish", "ja": "Text 8 Japanese" },
  { "es": "Text 9 Spanish", "ja": "Text 9 Japanese" },
  { "es": "Text 10 Spanish", "ja": "Text 10 Japanese" },
  { "es": "Text 11 Spanish", "ja": "Text 11 Japanese" },
  { "es": "Text 12 Spanish", "ja": "Text 12 Japanese" },
  { "es": "Text 13 Spanish", "ja": "Text 13 Japanese" },
  { "es": "Text 14 Spanish", "ja": "Text 14 Japanese" },
  { "es": "Text 15 Spanish", "ja": "Text 15 Japanese" },
  { "es": "Text 16 Spanish", "ja": "Text 16 Japanese" },
  { "es": "Text 17 Spanish", "ja": "Text 17 Japanese" },
  { "es": "Text 18 Spanish", "ja": "Text 18 Japanese" },
  { "es": "Text 19 Spanish", "ja": "Text 19 Japanese" },
  { "es": "Text 20 Spanish", "ja": "Text 20 Japanese" }
];

// Sound Synthesis Controller using Web Audio API
class SoundController {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('neon_match_muted') === 'true';
    this.updateMuteUI();
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('neon_match_muted', this.muted);
    this.updateMuteUI();
    this.playTap();
  }

  updateMuteUI() {
    const soundOnSvg = document.getElementById('svg-sound-on');
    const soundOffSvg = document.getElementById('svg-sound-off');
    if (soundOnSvg && soundOffSvg) {
      if (this.muted) {
        soundOnSvg.classList.add('hidden');
        soundOffSvg.classList.remove('hidden');
      } else {
        soundOnSvg.classList.remove('hidden');
        soundOffSvg.classList.add('hidden');
      }
    }
  }

  playOscillator(freqs, durations, type = 'sine', slide = false) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    if (slide && freqs.length > 1) {
      osc.frequency.setValueAtTime(freqs[0], now);
      osc.frequency.exponentialRampToValueAtTime(freqs[1], now + durations[0]);
    } else {
      let time = now;
      freqs.forEach((freq, idx) => {
        osc.frequency.setValueAtTime(freq, time);
        if (idx > 0) {
          time += durations[idx - 1];
        }
      });
    }
    
    const totalDuration = durations.reduce((a, b) => a + b, 0);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + totalDuration);
    
    osc.start(now);
    osc.stop(now + totalDuration);
  }

  playTap() {
    this.playOscillator([580], [0.06], 'sine');
  }

  playMatch() {
    // Satisfying major arpeggio
    this.playOscillator([392, 523, 659, 784], [0.07, 0.07, 0.07, 0.16], 'triangle');
  }

  playMismatch() {
    // Dynamic dissonant sweep
    this.playOscillator([180, 130], [0.12], 'sawtooth', true);
  }

  playTick() {
    // Soft wooden tick
    this.playOscillator([1000], [0.015], 'triangle');
  }

  playGameOver() {
    // Sad downward slide
    this.playOscillator([300, 80], [0.65], 'sine', true);
  }

  playShuffle() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    
    // Play rapid succession of ticks
    const clicksCount = 7;
    const interval = 0.08;
    const now = this.ctx.currentTime;
    
    for (let i = 0; i < clicksCount; i++) {
      const time = now + (i * interval);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      const freq = 750 + Math.random() * 300;
      osc.frequency.setValueAtTime(freq, time);
      
      gain.gain.setValueAtTime(0.06, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(time);
      osc.stop(time + 0.03);
    }
  }
}

// Game Manager class
class GameManager {
  constructor() {
    this.sound = new SoundController();
    this.wordsPool = [];
    this.score = 0;
    this.bestScore = parseInt(localStorage.getItem('neon_match_best') || '0');
    
    this.currentPairsCount = 3; // Start with 3 pairs (6 cards)
    this.maxPairsCap = 10;       // Max pairs cap at 10 pairs (20 cards) for screen size constraints
    
    this.activeCards = [];
    this.selectedCard = null;
    this.isAnimating = false;
    this.peakCardsCount = 0;
    
    // Timer variables
    this.timeLimit = 0; // ms
    this.timeRemaining = 0; // ms
    this.timerInterval = null;
    this.lastTickTime = 0;
    this.timerTickAudioBoundary = 0;
    
    this.initDOM();
  }

  initDOM() {
    // Screens
    this.startScreen = document.getElementById('start-screen');
    this.reviewScreen = document.getElementById('review-screen');
    this.playScreen = document.getElementById('play-screen');
    this.gameOverScreen = document.getElementById('game-over-screen');
    
    // Review Elements
    this.reviewCounter = document.getElementById('review-counter');
    this.reviewEsText = document.getElementById('review-es-text');
    this.reviewJaText = document.getElementById('review-ja-text');
    this.btnNextReview = document.getElementById('btn-next-review');
    
    // Modal Overlay Elements
    this.expandModal = document.getElementById('expand-modal');
    this.modalDesc = document.getElementById('modal-desc');
    this.btnExpandDeck = document.getElementById('btn-expand-deck');
    this.btnModalMenu = document.getElementById('btn-modal-menu');
    
    // Progress Overlay Elements
    this.btnProgress = document.getElementById('btn-progress');
    this.btnResetProgress = document.getElementById('btn-reset-progress');
    this.progressModal = document.getElementById('progress-modal');
    this.btnCloseProgress = document.getElementById('btn-close-progress');
    this.progNumLearned = document.getElementById('prog-num-learned');
    this.progNumMissing = document.getElementById('prog-num-missing');
    this.deckList = document.getElementById('deck-list');
    
    // Buttons
    this.btnLearn = document.getElementById('btn-learn');
    this.btnPractice = document.getElementById('btn-practice');
    this.btnRestart = document.getElementById('btn-restart');
    this.btnMenu = document.getElementById('btn-menu');
    this.btnMute = document.getElementById('btn-mute');
    this.btnQuit = document.getElementById('btn-quit');
    
    // Values
    this.scoreVal = document.getElementById('score-val');
    this.bestVal = document.getElementById('best-val');
    this.finalScore = document.getElementById('final-score');
    this.matchedPairs = document.getElementById('matched-pairs');
    this.peakCards = document.getElementById('peak-cards');
    
    // Board, Grids, Decks & Timer
    this.board = document.getElementById('game-board');
    this.esGrid = document.getElementById('es-grid');
    this.jaGrid = document.getElementById('ja-grid');
    this.esDeck = document.getElementById('es-deck');
    this.jaDeck = document.getElementById('ja-deck');
    this.timerFill = document.getElementById('timer-bar-fill');
    this.timerText = document.getElementById('timer-text');
    
    // Bind Event Listeners
    this.btnLearn.addEventListener('click', () => this.startLearnMode());
    this.btnPractice.addEventListener('click', () => this.startPracticeMode());
    this.btnRestart.addEventListener('click', () => this.startPracticeMode());
    this.btnMenu.addEventListener('click', () => { this.applySRS(); this.showScreen('start'); });
    this.btnQuit.addEventListener('click', () => this.endGame());
    this.btnMute.addEventListener('click', () => this.sound.toggleMute());
    
    // Progress Event Listeners
    this.btnProgress.addEventListener('click', () => this.showProgressModal());
    this.btnResetProgress.addEventListener('click', () => this.resetProgress());
    this.btnCloseProgress.addEventListener('click', () => this.hideProgressModal());
    
    // Review Event Listener
    this.btnNextReview.addEventListener('click', () => this.nextReviewCard());
    
    // Modal Event Listeners
    this.btnExpandDeck.addEventListener('click', () => this.expandDeck());
    this.btnModalMenu.addEventListener('click', () => {
      this.expandModal.classList.remove('active');
      this.applySRS(true);
      this.showScreen('start');
    });
    
    // Window resizing to dynamically adjust grid height
    window.addEventListener('resize', () => {
      if (this.playScreen.classList.contains('active')) {
        this.adjustGridLayout();
      }
    });

    // Update best score
    this.bestVal.textContent = this.bestScore;
    
    // Load words
    this.loadWords();
  }

  async loadWords() {
    try {
      const response = await fetch('words.json');
      if (!response.ok) throw new Error('Failed to fetch JSON');
      this.wordsPool = await response.json();
    } catch (e) {
      console.warn('Could not load words.json, using fallback dictionary:', e.message);
      this.wordsPool = FALLBACK_WORDS;
    }
    
    // Load SRS Weights from localStorage
    this.srsWeights = JSON.parse(localStorage.getItem('neon_match_srs_points') || '{}');
    this.wordsPool.forEach(word => {
      word.points = this.srsWeights[word.es] !== undefined ? this.srsWeights[word.es] : 0;
    });
  }

  showScreen(screenName) {
    this.startScreen.classList.remove('active');
    this.reviewScreen.classList.remove('active');
    this.playScreen.classList.remove('active');
    this.gameOverScreen.classList.remove('active');
    
    if (screenName === 'start') {
      this.startScreen.classList.add('active');
    } else if (screenName === 'review') {
      this.reviewScreen.classList.add('active');
    } else if (screenName === 'play') {
      this.playScreen.classList.add('active');
    } else if (screenName === 'gameover') {
      this.gameOverScreen.classList.add('active');
    }
  }

  showProgressModal() {
    this.sound.playTap();
    this.progressModal.classList.add('active');
    
    // Determine learned set
    // If they have started a game, use this.sessionPairs. Otherwise, use localStorage weights existence.
    const hasActiveGame = this.sessionPairs && this.sessionPairs.length > 0;
    
    let learnedCount = 0;
    this.deckList.innerHTML = '';
    
    this.wordsPool.forEach(word => {
      const isLearned = hasActiveGame 
        ? this.sessionPairs.some(p => p.es === word.es)
        : (this.srsWeights[word.es] !== undefined);
        
      if (isLearned) {
        learnedCount++;
      }
      
      const row = document.createElement('div');
      row.className = 'deck-row';
      
      const wordsDiv = document.createElement('div');
      wordsDiv.className = 'deck-row-words';
      
      const esSpan = document.createElement('span');
      esSpan.className = 'deck-row-es';
      esSpan.textContent = word.es;
      
      const jaSpan = document.createElement('span');
      jaSpan.className = 'deck-row-ja';
      jaSpan.textContent = word.ja;
      
      wordsDiv.appendChild(esSpan);
      wordsDiv.appendChild(jaSpan);
      
      const badge = document.createElement('span');
      if (isLearned) {
        badge.className = 'deck-badge learned';
        badge.textContent = `${word.points} pts`;
      } else {
        badge.className = 'deck-badge locked';
        badge.textContent = 'LOCKED';
      }
      
      row.appendChild(wordsDiv);
      row.appendChild(badge);
      this.deckList.appendChild(row);
    });
    
    this.progNumLearned.textContent = learnedCount;
    this.progNumMissing.textContent = this.wordsPool.length - learnedCount;
  }

  hideProgressModal() {
    this.sound.playTap();
    this.progressModal.classList.remove('active');
  }

  resetProgress() {
    this.sound.playTap();
    const confirmed = confirm("Are you sure you want to reset all learned cards and progress?");
    if (confirmed) {
      localStorage.removeItem('neon_match_srs_points');
      this.srsWeights = {};
      this.wordsPool.forEach(word => {
        word.points = 0;
      });
      this.sessionPairs = [];
      alert("Progress successfully reset!");
    }
  }

  startLearnMode() {
    this.sound.init(); // Activate AudioContext on user interaction
    this.score = 0;
    this.peakCardsCount = 0;
    this.selectedCard = null;
    this.isAnimating = false;
    this.mismatchedPairs = new Set();
    this.currentPairsCount = 5; // Play first 5 cards
    
    // Load previously learned cards from wordsPool (based on presence in srsWeights)
    this.sessionPairs = this.wordsPool.filter(word => this.srsWeights[word.es] !== undefined);
    
    this.scoreVal.textContent = this.score;
    this.bestVal.textContent = this.bestScore;
    
    // Always trigger review for 5 new cards in Learn mode
    this.startReviewSession();
  }

  startPracticeMode() {
    this.sound.init(); // Activate AudioContext on user interaction
    
    // Load previously learned cards from wordsPool (based on presence in srsWeights)
    this.sessionPairs = this.wordsPool.filter(word => this.srsWeights[word.es] !== undefined);
    
    if (this.sessionPairs.length >= 5) {
      this.score = 0;
      this.peakCardsCount = 0;
      this.selectedCard = null;
      this.isAnimating = false;
      this.mismatchedPairs = new Set();
      this.currentPairsCount = 5; // Starts at 5 cards
      
      this.scoreVal.textContent = this.score;
      this.bestVal.textContent = this.bestScore;
      
      console.log(`Starting Practice mode with ${this.sessionPairs.length} learned cards.`);
      this.showScreen('play');
      this.generateRound();
    } else {
      // Not enough learned cards to practice yet! Auto-redirect to Learn mode.
      alert("You need to learn at least 5 cards first! Redirecting to Learn Mode...");
      this.startLearnMode();
    }
  }

  startReviewSession() {
    // 1. Sort words pool by points descending (SRS priorities)
    this.wordsPool.sort((a, b) => b.points - a.points);
    
    // 2. Select 5 cards that are NOT already in the session deck
    this.newReviewPairs = [];
    for (let i = 0; i < this.wordsPool.length; i++) {
      const word = this.wordsPool[i];
      const isAlreadyInDeck = this.sessionPairs.some(p => p.es === word.es);
      if (!isAlreadyInDeck) {
        this.newReviewPairs.push(word);
      }
      if (this.newReviewPairs.length === 5) break;
    }
    
    // Fallback if we run out of unique words
    if (this.newReviewPairs.length === 0) {
      this.newReviewPairs = this.wordsPool.slice(0, 5);
    }
    
    // 3. Increment appearance points for any card NOT reviewed in this round
    // "adding 2 points if we dont review it"
    this.wordsPool.forEach(word => {
      const isReviewedNow = this.newReviewPairs.some(p => p.es === word.es);
      const isReviewedBefore = this.sessionPairs.some(p => p.es === word.es);
      if (!isReviewedNow && !isReviewedBefore) {
        word.points += 2;
      }
    });

    // Log the selection and points details
    console.log("=== SRS PRIORITY DECK SELECTION ===");
    console.log("Sorted word pool weights:");
    this.wordsPool.forEach(word => {
      console.log(`- ${word.es}: ${word.points} pts`);
    });
    console.log("Selecting for review:", this.newReviewPairs.map(p => p.es).join(", "));
    console.log(`Current Deck Size: ${this.sessionPairs.length} pairs`);
    console.log("====================================");
    
    this.reviewIndex = 0;
    this.showScreen('review');
    this.showReviewCard();
  }

  showReviewCard() {
    const pair = this.newReviewPairs[this.reviewIndex];
    this.reviewCounter.textContent = `Card ${this.reviewIndex + 1} of 5`;
    this.reviewEsText.textContent = pair.es;
    this.reviewJaText.textContent = pair.ja;
    
    if (this.reviewIndex === 4) {
      this.btnNextReview.textContent = "START CHALLENGE";
    } else {
      this.btnNextReview.textContent = "NEXT CARD";
    }
  }

  nextReviewCard() {
    this.sound.playTap();
    if (this.reviewIndex < 4) {
      this.reviewIndex++;
      this.showReviewCard();
    } else {
      // Add reviewed cards to the session deck
      this.sessionPairs = [...this.sessionPairs, ...this.newReviewPairs];
      
      // If we just started the session, currentPairsCount is 5.
      // Otherwise, we increment the currentPairsCount since a new level was cleared!
      if (this.sessionPairs.length === 5) {
        this.currentPairsCount = 5;
      } else {
        this.currentPairsCount++;
      }
      
      // Start matching phase
      this.showScreen('play');
      this.generateRound();
    }
  }

  expandDeck() {
    this.expandModal.classList.remove('active');
    if (this.currentPairsCount < this.sessionPairs.length) {
      this.currentPairsCount++;
      this.generateRound();
    } else {
      this.startReviewSession();
    }
  }

  generateRound() {
    this.selectedCard = null;
    this.stopTimer();
    
    // Clear active grids
    this.esGrid.innerHTML = '';
    this.jaGrid.innerHTML = '';
    
    // 1. Play shuffle sound and visual shuffle animation on decks
    this.isAnimating = true;
    this.sound.playShuffle();
    this.esDeck.classList.add('shuffling');
    this.jaDeck.classList.add('shuffling');
    
    // Select a shuffled subset of sessionPairs for this round
    const shuffledPool = this.shuffleArray([...this.sessionPairs]);
    this.activeRoundPairs = shuffledPool.slice(0, this.currentPairsCount);
    
    this.matchedPairsCount = 0;
    this.mismatchedPairs = new Set();
    this.matchedWords = new Set();
    
    // 2. Wait for shuffle to complete (700ms) before dealing
    setTimeout(() => {
      this.esDeck.classList.remove('shuffling');
      this.jaDeck.classList.remove('shuffling');
      
      const esCardData = [];
      const jaCardData = [];
      
      this.activeRoundPairs.forEach((pair, index) => {
        esCardData.push({
          id: `es-${index}`,
          text: pair.es,
          lang: 'es',
          pairIndex: index
        });
        jaCardData.push({
          id: `ja-${index}`,
          text: pair.ja,
          lang: 'ja',
          pairIndex: index
        });
      });
      
      // Shuffle lists independently so they are not lined up in matching slots
      const shuffledEs = this.shuffleArray(esCardData);
      const shuffledJa = this.shuffleArray(jaCardData);
      this.activeCards = [...shuffledEs, ...shuffledJa];
      
      // Render Spanish cards (Upper)
      shuffledEs.forEach(cardObj => {
        const cardDiv = this.createCardElement(cardObj);
        this.esGrid.appendChild(cardDiv);
      });
      
      // Render Japanese cards (Lower)
      shuffledJa.forEach(cardObj => {
        const cardDiv = this.createCardElement(cardObj);
        this.jaGrid.appendChild(cardDiv);
      });
      
      // Track peak stats (this counts total cards in active round)
      const totalCards = this.currentPairsCount * 2;
      if (totalCards > this.peakCardsCount) {
        this.peakCardsCount = totalCards;
      }
      
      // Adjust layout height sizing
      this.adjustGridLayout();
      
      // 3. Trigger staggered FLIP dealing animation from decks to grids
      const esCards = Array.from(this.esGrid.querySelectorAll('.card'));
      const jaCards = Array.from(this.jaGrid.querySelectorAll('.card'));
      const cardsToDeal = [];
      
      for (let i = 0; i < this.currentPairsCount; i++) {
        if (esCards[i]) cardsToDeal.push({ div: esCards[i], deck: this.esDeck });
        if (jaCards[i]) cardsToDeal.push({ div: jaCards[i], deck: this.jaDeck });
      }
      
      cardsToDeal.forEach((item, index) => {
        const cardDiv = item.div;
        const deckDiv = item.deck;
        
        // Compute offset from deck to grid slot
        const cardRect = cardDiv.getBoundingClientRect();
        const deckRect = deckDiv.getBoundingClientRect();
        
        const deltaX = deckRect.left - cardRect.left;
        const deltaY = deckRect.top - cardRect.top;
        
        // Move to deck face-down transitionless
        cardDiv.classList.add('face-down');
        cardDiv.style.transition = 'none';
        cardDiv.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        
        // Force reflow
        cardDiv.offsetHeight;
        
        // Staggered deal out and flip face-up
        setTimeout(() => {
          cardDiv.style.transition = 'transform 0.65s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.5s ease';
          cardDiv.style.transform = 'translate(0px, 0px)';
          cardDiv.classList.remove('face-down');
        }, index * 60);
      });
      
      // 4. Start play timer after cards are fully distributed and flipped
      const totalDealDuration = (cardsToDeal.length * 60) + 650;
      setTimeout(() => {
        this.isAnimating = false;
        
        // Clean temporary dealing styles
        cardsToDeal.forEach(item => {
          item.div.style.transition = '';
          item.div.style.transform = '';
        });
        
        // Timer limit is 3 seconds per pair on the board (e.g. 5 pairs = 15 seconds)
        this.timeLimit = this.currentPairsCount * 3000;
        this.timeRemaining = this.timeLimit;
        this.startTimer();
      }, totalDealDuration);
      
    }, 700);
  }

  createCardElement(cardObj) {
    const cardDiv = document.createElement('div');
    cardDiv.className = `card ${cardObj.lang === 'es' ? 'spanish' : 'japanese'}`;
    cardDiv.id = cardObj.id;
    
    const cardInner = document.createElement('div');
    cardInner.className = 'card-inner';
    
    // Front Face
    const cardFront = document.createElement('div');
    cardFront.className = 'card-front';
    const textSpan = document.createElement('span');
    textSpan.className = 'card-text';
    textSpan.textContent = cardObj.text;
    cardFront.appendChild(textSpan);
    
    // Back Face
    const cardBack = document.createElement('div');
    cardBack.className = 'card-back';
    const pattern = document.createElement('div');
    pattern.className = 'card-back-pattern';
    cardBack.appendChild(pattern);
    
    cardInner.appendChild(cardFront);
    cardInner.appendChild(cardBack);
    cardDiv.appendChild(cardInner);
    
    cardDiv.cardData = cardObj;
    cardDiv.addEventListener('click', () => this.handleCardClick(cardDiv));
    return cardDiv;
  }

  getRandomPairs(count) {
    const shuffled = this.shuffleArray([...this.wordsPool]);
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(shuffled[i % shuffled.length]);
    }
    return result;
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  adjustGridLayout() {
    const M = this.currentPairsCount;
    if (M === 0) return;
    
    const isLandscape = window.innerWidth > window.innerHeight;
    let cols, rows;
    
    if (isLandscape) {
      if (M <= 5) { cols = M; rows = 1; }
      else if (M <= 8) { cols = Math.ceil(M / 2); rows = 2; }
      else { cols = Math.ceil(M / 2); rows = 2; }
    } else {
      if (M <= 4) { cols = M; rows = 1; }
      else if (M <= 6) { cols = 3; rows = 2; }
      else if (M <= 8) { cols = 4; rows = 2; }
      else { cols = 5; rows = 2; }
    }
    
    this.esGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    this.jaGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    
    const esGridHeight = this.esGrid.clientHeight || 120;
    const jaGridHeight = this.jaGrid.clientHeight || 120;
    const gap = 8;
    
    const esAvailableHeight = esGridHeight - (gap * (rows - 1));
    const esCardHeight = Math.max(52, Math.floor(esAvailableHeight / rows));
    
    const jaAvailableHeight = jaGridHeight - (gap * (rows - 1));
    const jaCardHeight = Math.max(52, Math.floor(jaAvailableHeight / rows));
    
    const esCards = this.esGrid.querySelectorAll('.card');
    esCards.forEach(card => {
      card.style.height = `${esCardHeight}px`;
    });
    
    const jaCards = this.jaGrid.querySelectorAll('.card');
    jaCards.forEach(card => {
      card.style.height = `${jaCardHeight}px`;
    });
  }

  handleCardClick(cardDiv) {
    const cardObj = cardDiv.cardData;
    if (this.isAnimating || cardDiv.classList.contains('matched')) return;
    
    this.sound.playTap();
    
    // Tap selection behavior
    if (this.selectedCard && this.selectedCard.id === cardObj.id) {
      cardDiv.classList.remove('selected');
      this.selectedCard = null;
      return;
    }
    
    if (this.selectedCard && this.selectedCard.lang === cardObj.lang) {
      const prevSelectedDiv = document.getElementById(this.selectedCard.id);
      if (prevSelectedDiv) prevSelectedDiv.classList.remove('selected');
      
      cardDiv.classList.add('selected');
      this.selectedCard = { div: cardDiv, id: cardObj.id, lang: cardObj.lang, data: cardObj };
      return;
    }
    
    if (!this.selectedCard) {
      cardDiv.classList.add('selected');
      this.selectedCard = { div: cardDiv, id: cardObj.id, lang: cardObj.lang, data: cardObj };
      return;
    }
    
    // Match Verification
    const firstCard = this.selectedCard;
    const secondCard = { div: cardDiv, id: cardObj.id, lang: cardObj.lang, data: cardObj };
    
    if (firstCard.data.pairIndex === secondCard.data.pairIndex) {
      this.isAnimating = true;
      this.sound.playMatch();
      
      // Apply matched state immediately
      firstCard.div.classList.add('matched');
      secondCard.div.classList.add('matched');
      
      // Return-to-deck fly-back animation helper
      const flyBack = (cDiv, deckDiv) => {
        const cRect = cDiv.getBoundingClientRect();
        const dRect = deckDiv.getBoundingClientRect();
        
        const deltaX = dRect.left - cRect.left;
        const deltaY = dRect.top - cRect.top;
        
        cDiv.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.5s ease';
        cDiv.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        cDiv.classList.add('face-down');
        cDiv.style.opacity = '0';
      };
      
      // Distribute to respective upper and lower decks
      flyBack(firstCard.div, firstCard.lang === 'es' ? this.esDeck : this.jaDeck);
      flyBack(secondCard.div, secondCard.lang === 'es' ? this.esDeck : this.jaDeck);
      
      this.score += 1;
      this.scoreVal.textContent = this.score;
      this.matchedPairsCount += 1;
      
      // Track matched Spanish word for SRS points
      const matchedPair = this.activeRoundPairs[firstCard.data.pairIndex];
      if (matchedPair) {
        this.matchedWords.add(matchedPair.es);
      }
      
      if (this.score > this.bestScore) {
        this.bestScore = this.score;
        localStorage.setItem('neon_match_best', this.bestScore);
        this.bestVal.textContent = this.bestScore;
      }
      
      const allMatched = this.matchedPairsCount === this.currentPairsCount;
      
      if (allMatched) {
        this.stopTimer();
        
        // Show Level Clear Modal with custom text based on deck completion
        setTimeout(() => {
          this.isAnimating = false;
          this.expandModal.classList.add('active');
          
          if (this.currentPairsCount < this.sessionPairs.length) {
            this.btnExpandDeck.textContent = "PLAY NEXT LEVEL (+1 CARD)";
            this.modalDesc.textContent = `Round Cleared! Ready to play with ${this.currentPairsCount + 1} cards?`;
          } else {
            this.btnExpandDeck.textContent = "REVIEW 5 MORE";
            this.modalDesc.textContent = "You matched all learned cards! Expand your deck?";
          }
        }, 650);
      } else {
        setTimeout(() => {
          this.selectedCard = null;
          this.isAnimating = false;
        }, 300);
      }
      
    } else {
      // Mistake shake penalty (hides text for 0.1s)
      this.isAnimating = true;
      this.sound.playMismatch();
      
      // Track mismatch cards Spanish words for SRS points
      const firstMismatchedPair = this.activeRoundPairs[firstCard.data.pairIndex];
      const secondMismatchedPair = this.activeRoundPairs[secondCard.data.pairIndex];
      if (firstMismatchedPair) this.mismatchedPairs.add(firstMismatchedPair.es);
      if (secondMismatchedPair) this.mismatchedPairs.add(secondMismatchedPair.es);
      
      firstCard.div.classList.add('shake');
      secondCard.div.classList.add('shake');
      
      setTimeout(() => {
        firstCard.div.classList.remove('shake', 'selected');
        secondCard.div.classList.remove('shake', 'selected');
        this.selectedCard = null;
        this.isAnimating = false;
      }, 100);
    }
  }

  startTimer() {
    this.stopTimer();
    
    this.lastTickTime = Date.now();
    this.timerTickAudioBoundary = Math.floor(this.timeRemaining / 1000);
    this.updateTimerUI();
    
    this.timerInterval = setInterval(() => {
      const now = Date.now();
      const delta = now - this.lastTickTime;
      this.lastTickTime = now;
      
      this.timeRemaining -= delta;
      if (this.timeRemaining <= 0) {
        this.timeRemaining = 0;
        this.updateTimerUI();
        this.endGame();
      } else {
        this.updateTimerUI();
        
        // Play tick sound every second when remaining time is less than 3.5 seconds
        const currentSeconds = Math.floor(this.timeRemaining / 1000);
        if (this.timeRemaining < 3500 && currentSeconds < this.timerTickAudioBoundary) {
          this.sound.playTick();
          this.timerTickAudioBoundary = currentSeconds;
        }
      }
    }, 50);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  updateTimerUI() {
    const percentage = Math.max(0, (this.timeRemaining / this.timeLimit) * 100);
    this.timerFill.style.transform = `scaleX(${percentage / 100})`;
    
    // Add warning color indicator when below 3.5 seconds
    if (this.timeRemaining < 3500) {
      this.timerFill.classList.add('warning');
    } else {
      this.timerFill.classList.remove('warning');
    }
    
    const seconds = (this.timeRemaining / 1000).toFixed(1);
    this.timerText.textContent = `${seconds}s`;
  }

  endGame() {
    this.stopTimer();
    this.sound.playGameOver();
    
    // Apply SRS weight score adjustments
    this.applySRS(false);
    
    // Update stats on Game Over screen
    this.finalScore.textContent = this.score;
    this.matchedPairs.textContent = this.score;
    this.peakCards.textContent = this.peakCardsCount;
    
    this.showScreen('gameover');
  }

  applySRS(completed = false) {
    // Loop through wordsPool to compute appearance points
    this.wordsPool.forEach(word => {
      const isActiveInRound = this.activeRoundPairs && this.activeRoundPairs.some(p => p.es === word.es);
      
      if (isActiveInRound) {
        // Word was active in the current round
        const wasMatched = this.matchedWords && this.matchedWords.has(word.es);
        if (wasMatched) {
          // Matched!
          const wasMismatched = this.mismatchedPairs && this.mismatchedPairs.has(word.es);
          if (wasMismatched) {
            word.points += 3;
          } else {
            word.points = Math.max(-10, word.points - 1);
          }
        } else {
          // Left on the table (time ran out) -> +2
          word.points += 2;
        }
      } else {
        // Not in current round -> +2
        word.points += 2;
      }
    });
    
    // Save srs weights to localStorage
    const weights = {};
    this.wordsPool.forEach(word => {
      weights[word.es] = word.points;
    });
    localStorage.setItem('neon_match_srs_points', JSON.stringify(weights));

    // Log SRS weights and active deck size for user diagnostics
    console.log("=== SRS APPARANCE POINTS ===");
    this.wordsPool.forEach(word => {
      console.log(`- Card: [${word.es} / ${word.ja}] | Points: ${word.points}`);
    });
    console.log(`Active Deck Size: ${this.sessionPairs.length} pairs (${this.sessionPairs.length * 2} cards)`);
    console.log("============================");
  }
}

// Initialise Game once page loaded
window.addEventListener('DOMContentLoaded', () => {
  window.game = new GameManager();
});
