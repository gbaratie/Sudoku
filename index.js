/**
 * Jeu de Sudoku - Interface interactive sans dépendance externe
 * Génération par backtracking, validation en temps réel, mode notes
 */

const GRID_SIZE = 9;
const BLOCK_SIZE = 3;
const HOLES = 40;
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/* --- État global --- */
let board = [];
let solution = [];
let fixedCells = [];
let notes = [];
let invalidCells = new Set();
let boardContainer;
let numberPadContainer;
let selectedCell = null;
let wasMobileView = null;
let notesMode = false;

/* --- Utilitaires --- */
function isMobileView() {
  return window.matchMedia('(max-width: 768px)').matches;
}

function createEmptyBoard() {
  return Array.from({ length: GRID_SIZE }, () => new Array(GRID_SIZE).fill(0));
}

function cloneBoard(grid) {
  return grid.map((row) => row.slice());
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* --- Génération de grille --- */
function isSafe(grid, row, col, num) {
  for (let x = 0; x < GRID_SIZE; x++) {
    if (grid[row][x] === num || grid[x][col] === num) return false;
  }
  const startRow = row - (row % BLOCK_SIZE);
  const startCol = col - (col % BLOCK_SIZE);
  for (let r = 0; r < BLOCK_SIZE; r++) {
    for (let c = 0; c < BLOCK_SIZE; c++) {
      if (grid[startRow + r][startCol + c] === num) return false;
    }
  }
  return true;
}

function fillBoard(grid) {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === 0) {
        for (const num of shuffle([...DIGITS])) {
          if (isSafe(grid, r, c, num)) {
            grid[r][c] = num;
            if (fillBoard(grid)) return true;
            grid[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function generateSolvedBoard() {
  const grid = createEmptyBoard();
  fillBoard(grid);
  return grid;
}

function generatePuzzle(solvedGrid, holes) {
  const puzzle = cloneBoard(solvedGrid);
  let removed = 0;
  while (removed < holes) {
    const r = Math.floor(Math.random() * GRID_SIZE);
    const c = Math.floor(Math.random() * GRID_SIZE);
    if (puzzle[r][c] !== 0) {
      puzzle[r][c] = 0;
      removed++;
    }
  }
  return puzzle;
}

/* --- Validation --- */
function findDuplicates(cells) {
  const occ = {};
  cells.forEach(({ value, key }) => {
    if (value !== '') {
      if (!occ[value]) occ[value] = [];
      occ[value].push(key);
    }
  });
  return Object.values(occ).flatMap((keys) => (keys.length > 1 ? keys : []));
}

function validateAndHighlight() {
  invalidCells = new Set();

  for (let r = 0; r < GRID_SIZE; r++) {
    const cells = DIGITS.map((_, c) => ({ value: board[r][c], key: `${r}-${c}` }));
    findDuplicates(cells).forEach((key) => invalidCells.add(key));
  }
  for (let c = 0; c < GRID_SIZE; c++) {
    const cells = DIGITS.map((_, r) => ({ value: board[r][c], key: `${r}-${c}` }));
    findDuplicates(cells).forEach((key) => invalidCells.add(key));
  }
  for (let br = 0; br < BLOCK_SIZE; br++) {
    for (let bc = 0; bc < BLOCK_SIZE; bc++) {
      const cells = [];
      for (let r = 0; r < BLOCK_SIZE; r++) {
        for (let c = 0; c < BLOCK_SIZE; c++) {
          const row = br * BLOCK_SIZE + r;
          const col = bc * BLOCK_SIZE + c;
          cells.push({ value: board[row][col], key: `${row}-${col}` });
        }
      }
      findDuplicates(cells).forEach((key) => invalidCells.add(key));
    }
  }

  const cellElems = boardContainer.children;
  let i = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      cellElems[i++].classList.toggle('invalid', invalidCells.has(`${r}-${c}`));
    }
  }
}

/* --- Affichage de la grille --- */
function getCellClasses(r, c) {
  const classes = ['cell'];
  if (r % BLOCK_SIZE === 0) classes.push('bold-border-top');
  if (c % BLOCK_SIZE === 0) classes.push('bold-border-left');
  if (r === GRID_SIZE - 1) classes.push('bold-border-bottom');
  if (c === GRID_SIZE - 1) classes.push('bold-border-right');
  if (fixedCells[r][c]) classes.push('fixed');
  if (invalidCells.has(`${r}-${c}`)) classes.push('invalid');
  return classes.join(' ');
}

function buildNotesDiv(r, c) {
  const notesDiv = document.createElement('div');
  notesDiv.className = 'cell-notes';
  DIGITS.forEach((n) => {
    const span = document.createElement('span');
    span.textContent = notes[r][c].has(String(n)) ? n : '';
    notesDiv.appendChild(span);
  });
  return notesDiv;
}

function buildCell(r, c) {
  const cell = document.createElement('div');
  cell.className = getCellClasses(r, c);
  cell.dataset.row = r;
  cell.dataset.col = c;

  if (fixedCells[r][c]) {
    cell.textContent = board[r][c];
  } else {
    if (board[r][c]) {
      cell.textContent = board[r][c];
    } else if (notes[r]?.[c]?.size > 0) {
      cell.appendChild(buildNotesDiv(r, c));
    }
    cell.classList.add('editable');
    cell.tabIndex = 0;
    cell.setAttribute('role', 'button');
    cell.addEventListener('click', onCellClick);
  }
  return cell;
}

function renderBoard() {
  boardContainer.innerHTML = '';
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      boardContainer.appendChild(buildCell(r, c));
    }
  }
  updateSelectedCellStyles();
}

/* --- Sélection et saisie --- */
function onCellClick(event) {
  const cell = event.currentTarget;
  selectCell(parseInt(cell.dataset.row, 10), parseInt(cell.dataset.col, 10));
  if (!isMobileView()) cell.focus();
}

function selectCell(row, col) {
  selectedCell = { row, col };
  updateSelectedCellStyles();
}

function updateSelectedCellStyles() {
  boardContainer.querySelectorAll('.cell.editable').forEach((cell) => {
    const r = parseInt(cell.dataset.row, 10);
    const c = parseInt(cell.dataset.col, 10);
    const isSelected = selectedCell?.row === r && selectedCell?.col === c;
    cell.classList.toggle('selected', isSelected);
  });
}

function removeNoteFromRelatedCells(row, col, value) {
  for (let i = 0; i < GRID_SIZE; i++) {
    notes[row][i]?.delete(value);
    notes[i][col]?.delete(value);
  }
  const startRow = row - (row % BLOCK_SIZE);
  const startCol = col - (col % BLOCK_SIZE);
  for (let r = 0; r < BLOCK_SIZE; r++) {
    for (let c = 0; c < BLOCK_SIZE; c++) {
      notes[startRow + r]?.[startCol + c]?.delete(value);
    }
  }
}

function onNumberPadInput(num) {
  if (!selectedCell || fixedCells[selectedCell.row][selectedCell.col]) return;
  const { row, col } = selectedCell;

  if (notesMode) {
    if (num === '') {
      notes[row][col] = new Set();
    } else {
      const n = String(num);
      notes[row][col].has(n) ? notes[row][col].delete(n) : notes[row][col].add(n);
    }
  } else {
    const value = num === '' ? '' : String(num);
    board[row][col] = value;
    notes[row][col] = new Set();
    if (value) removeNoteFromRelatedCells(row, col, value);
  }

  validateAndHighlight();
  renderBoard();

  if (!isMobileView() && selectedCell) {
    const cell = boardContainer.querySelector(
      `[data-row="${selectedCell.row}"][data-col="${selectedCell.col}"]`
    );
    cell?.focus();
  }
  checkCompleteAndShowPopup();
}

function onKeyDown(event) {
  if (!selectedCell || fixedCells[selectedCell.row][selectedCell.col]) return;
  if (event.target.matches('input, textarea, select')) return;

  if (event.key >= '1' && event.key <= '9') {
    event.preventDefault();
    onNumberPadInput(event.key);
  } else if (event.key === 'Backspace' || event.key === 'Delete') {
    event.preventDefault();
    onNumberPadInput('');
  }
}

/* --- Clavier numérique (mobile) --- */
function buildNumberPad() {
  const pad = document.createElement('div');
  pad.className = 'number-pad-container';
  pad.setAttribute('aria-label', 'Clavier numérique');

  const numRow = document.createElement('div');
  numRow.className = 'number-pad-row';
  DIGITS.forEach((n) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'num-btn';
    btn.textContent = n;
    btn.addEventListener('click', () => onNumberPadInput(n));
    numRow.appendChild(btn);
  });
  pad.appendChild(numRow);

  const actionRow = document.createElement('div');
  actionRow.className = 'number-pad-actions';

  const actions = [
    ['Effacer', () => onNumberPadInput('')],
    ['Option', toggleNotesMode, { option: true }],
    ['Solution', showSolution, { title: 'Afficher la solution' }],
    ['Nouvelle', generateNewGame, { title: 'Nouvelle grille' }],
  ];

  actions.forEach(([text, handler, opts = {}]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'action-btn';
    btn.textContent = text;
    if (opts.option) btn.dataset.option = 'option';
    if (opts.title) btn.title = opts.title;
    btn.addEventListener('click', handler);
    actionRow.appendChild(btn);
  });
  pad.appendChild(actionRow);

  return pad;
}

function toggleNotesMode() {
  notesMode = !notesMode;
  document.querySelectorAll('[data-option="option"]').forEach((btn) =>
    btn.classList.toggle('active', notesMode)
  );
}

function updateNumberPadVisibility() {
  const mobile = isMobileView();
  if (wasMobileView !== null && wasMobileView !== mobile && boardContainer) {
    renderBoard();
  }
  wasMobileView = mobile;
  numberPadContainer?.classList.toggle('visible', mobile);
}

/* --- Jeu --- */
function generateNewGame() {
  closeSuccessModal();
  notesMode = false;
  document.querySelectorAll('[data-option="option"]').forEach((btn) =>
    btn.classList.remove('active')
  );

  const solved = generateSolvedBoard();
  const puzzle = generatePuzzle(solved, HOLES);

  board = [];
  solution = [];
  fixedCells = [];
  notes = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    const rowVals = [];
    const solRow = [];
    const fixedRow = [];
    const notesRow = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      const v = puzzle[r][c];
      rowVals.push(v === 0 ? '' : String(v));
      solRow.push(String(solved[r][c]));
      fixedRow.push(v !== 0);
      notesRow.push(new Set());
    }
    board.push(rowVals);
    solution.push(solRow);
    fixedCells.push(fixedRow);
    notes.push(notesRow);
  }

  invalidCells = new Set();
  renderBoard();
}

function showSolution() {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      board[r][c] = solution[r][c];
      fixedCells[r][c] = true;
    }
  }
  invalidCells = new Set();
  renderBoard();
}

function checkCompleteAndShowPopup() {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r][c] === '' || board[r][c] !== solution[r][c]) return;
    }
  }
  showSuccessModal();
}

/* --- Modal succès --- */
function showSuccessModal() {
  if (document.getElementById('success-modal')) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'success-modal';

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <p class="modal-message">Bravo, vous avez réussi !</p>
    <div class="modal-buttons">
      <button type="button" class="modal-btn" data-action="ok">OK</button>
      <button type="button" class="modal-btn primary" data-action="new">Nouvelle grille</button>
    </div>
  `;

  modal.querySelector('[data-action="ok"]').addEventListener('click', closeSuccessModal);
  modal.querySelector('[data-action="new"]').addEventListener('click', generateNewGame);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSuccessModal();
  });

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

function closeSuccessModal() {
  document.getElementById('success-modal')?.remove();
}

/* --- Interface --- */
function buildUI() {
  const root = document.getElementById('root');
  root.innerHTML = '';

  const title = document.createElement('h1');
  title.textContent = 'Jeu de Sudoku';
  root.appendChild(title);

  const gameWrapper = document.createElement('div');
  gameWrapper.className = 'game-wrapper';

  boardContainer = document.createElement('div');
  boardContainer.className = 'board';
  gameWrapper.appendChild(boardContainer);

  numberPadContainer = document.createElement('div');
  numberPadContainer.className = 'number-pad-wrapper';
  numberPadContainer.appendChild(buildNumberPad());
  gameWrapper.appendChild(numberPadContainer);

  const buttons = document.createElement('div');
  buttons.className = 'buttons desktop-only';
  buttons.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    e.preventDefault();
    if (btn.dataset.action === 'option') toggleNotesMode();
    else if (btn.dataset.action === 'new-game') generateNewGame();
    else if (btn.dataset.action === 'solution') showSolution();
  });

  const desktopButtons = [
    ['Option', 'option'],
    ['Nouvelle grille', 'new-game'],
    ['Afficher la solution', 'solution'],
  ];
  desktopButtons.forEach(([text, action]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = text;
    btn.dataset.action = action;
    if (action === 'option') btn.dataset.option = 'option';
    buttons.appendChild(btn);
  });

  gameWrapper.appendChild(buttons);
  root.appendChild(gameWrapper);
}

/* --- Init --- */
document.addEventListener('DOMContentLoaded', () => {
  buildUI();
  generateNewGame();
  updateNumberPadVisibility();
  window.addEventListener('resize', updateNumberPadVisibility);
  document.addEventListener('keydown', onKeyDown);
});
