/**
 * Jeu de Sudoku - Interface interactive sans dépendance externe
 * Génération de grilles par backtracking, validation en temps réel
 */

const GRID_SIZE = 9;
const HOLES = 40;

function isMobileView() {
  return window.matchMedia('(max-width: 768px)').matches;
}

let board = [];
let solution = [];
let fixedCells = [];
let notes = []; // notes[r][c] = Set des candidats (mode option)
let invalidCells = new Set();
let boardContainer;
let selectedCell = null;
let numberPadContainer = null;
let wasMobileView = null;
let notesMode = false;

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

function isSafe(grid, row, col, num) {
  for (let x = 0; x < GRID_SIZE; x++) {
    if (grid[row][x] === num || grid[x][col] === num) return false;
  }
  const startRow = row - (row % 3);
  const startCol = col - (col % 3);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (grid[startRow + r][startCol + c] === num) return false;
    }
  }
  return true;
}

function fillBoard(grid) {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === 0) {
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const num of nums) {
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
    const cells = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      cells.push({ value: board[r][c], key: `${r}-${c}` });
    }
    findDuplicates(cells).forEach((key) => invalidCells.add(key));
  }

  for (let c = 0; c < GRID_SIZE; c++) {
    const cells = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      cells.push({ value: board[r][c], key: `${r}-${c}` });
    }
    findDuplicates(cells).forEach((key) => invalidCells.add(key));
  }

  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const cells = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const row = br * 3 + r;
          const col = bc * 3 + c;
          cells.push({ value: board[row][col], key: `${row}-${col}` });
        }
      }
      findDuplicates(cells).forEach((key) => invalidCells.add(key));
    }
  }

  const cells = boardContainer.children;
  let i = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const cellElem = cells[i++];
      cellElem.classList.toggle('invalid', invalidCells.has(`${r}-${c}`));
    }
  }
}

function getCellClasses(r, c) {
  const classes = ['cell'];
  if (r % 3 === 0) classes.push('bold-border-top');
  if (c % 3 === 0) classes.push('bold-border-left');
  if (r === GRID_SIZE - 1) classes.push('bold-border-bottom');
  if (c === GRID_SIZE - 1) classes.push('bold-border-right');
  if (fixedCells[r][c]) classes.push('fixed');
  if (invalidCells.has(`${r}-${c}`)) classes.push('invalid');
  return classes.join(' ');
}

function buildCell(r, c) {
  const cell = document.createElement('div');
  cell.className = getCellClasses(r, c);
  cell.dataset.row = r;
  cell.dataset.col = c;

  if (fixedCells[r][c]) {
    cell.textContent = board[r][c];
  } else if (isMobileView()) {
    if (board[r][c]) {
      cell.textContent = board[r][c];
    } else if (notes[r] && notes[r][c] && notes[r][c].size > 0) {
      const notesDiv = document.createElement('div');
      notesDiv.className = 'cell-notes';
      [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((n) => {
        const span = document.createElement('span');
        span.textContent = notes[r][c].has(String(n)) ? n : '';
        notesDiv.appendChild(span);
      });
      cell.appendChild(notesDiv);
    }
    cell.classList.add('editable');
    cell.tabIndex = 0;
    cell.setAttribute('role', 'button');
    cell.addEventListener('click', onMobileCellClick);
  } else {
    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'numeric';
    input.value = board[r][c];
    input.maxLength = 1;
    input.dataset.row = r;
    input.dataset.col = c;
    input.addEventListener('input', onCellInput);
    cell.appendChild(input);
  }

  return cell;
}

function onMobileCellClick(event) {
  const cell = event.currentTarget;
  const row = parseInt(cell.dataset.row, 10);
  const col = parseInt(cell.dataset.col, 10);
  selectCell(row, col);
}

function selectCell(row, col) {
  selectedCell = { row, col };
  updateSelectedCellStyles();
}

function updateSelectedCellStyles() {
  const cells = boardContainer.querySelectorAll('.cell.editable');
  cells.forEach((cell) => {
    const r = parseInt(cell.dataset.row, 10);
    const c = parseInt(cell.dataset.col, 10);
    const isSelected =
      selectedCell && selectedCell.row === r && selectedCell.col === c;
    cell.classList.toggle('selected', isSelected);
  });
}

function onNumberPadInput(num) {
  if (!selectedCell || fixedCells[selectedCell.row][selectedCell.col]) return;
  const { row, col } = selectedCell;

  if (notesMode) {
    if (num === '') {
      notes[row][col] = new Set();
    } else {
      const n = String(num);
      if (notes[row][col].has(n)) {
        notes[row][col].delete(n);
      } else {
        notes[row][col].add(n);
      }
    }
  } else {
    board[row][col] = num === '' ? '' : String(num);
    notes[row][col] = new Set(); // Effacer les notes quand on met une valeur
  }
  validateAndHighlight();
  renderBoard();
  checkCompleteAndShowPopup();
}

function buildNumberPad() {
  const pad = document.createElement('div');
  pad.className = 'number-pad-container';
  pad.setAttribute('aria-label', 'Clavier numérique pour remplir les cases');

  const numRow = document.createElement('div');
  numRow.className = 'number-pad-row';
  pad.appendChild(numRow);

  [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((n) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'num-btn';
    btn.textContent = n;
    btn.addEventListener('click', () => onNumberPadInput(n));
    numRow.appendChild(btn);
  });

  const actionRow = document.createElement('div');
  actionRow.className = 'number-pad-actions';
  pad.appendChild(actionRow);

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'action-btn';
  clearBtn.textContent = 'Effacer';
  clearBtn.addEventListener('click', () => onNumberPadInput(''));
  actionRow.appendChild(clearBtn);

  const optionBtn = document.createElement('button');
  optionBtn.type = 'button';
  optionBtn.className = 'action-btn';
  optionBtn.textContent = 'Option';
  optionBtn.dataset.option = 'option';
  optionBtn.addEventListener('click', toggleNotesMode);
  actionRow.appendChild(optionBtn);

  const solutionBtn = document.createElement('button');
  solutionBtn.type = 'button';
  solutionBtn.className = 'action-btn';
  solutionBtn.textContent = 'Solution';
  solutionBtn.title = 'Afficher la solution';
  solutionBtn.addEventListener('click', showSolution);
  actionRow.appendChild(solutionBtn);

  const newGameBtn = document.createElement('button');
  newGameBtn.type = 'button';
  newGameBtn.className = 'action-btn';
  newGameBtn.textContent = 'Nouvelle';
  newGameBtn.title = 'Nouvelle grille';
  newGameBtn.addEventListener('click', generateNewGame);
  actionRow.appendChild(newGameBtn);

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
  if (numberPadContainer) {
    numberPadContainer.classList.toggle('visible', mobile);
  }
}

function renderBoard() {
  boardContainer.innerHTML = '';
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      boardContainer.appendChild(buildCell(r, c));
    }
  }
  if (isMobileView()) {
    updateSelectedCellStyles();
  }
}

function onCellInput(event) {
  const input = event.target;
  const value = /^[1-9]$/.test(input.value) ? input.value : '';
  input.value = value;

  const row = parseInt(input.dataset.row, 10);
  const col = parseInt(input.dataset.col, 10);
  board[row][col] = value;

  validateAndHighlight();
  checkCompleteAndShowPopup();
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

function checkCompleteAndShowPopup() {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r][c] === '' || board[r][c] !== solution[r][c]) return;
    }
  }
  showSuccessModal();
}

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

  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSuccessModal();
  });
  document.body.appendChild(overlay);
}

function closeSuccessModal() {
  const modal = document.getElementById('success-modal');
  if (modal) modal.remove();
}

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
  const buttonsConfig = [
    ['Nouvelle grille', generateNewGame],
    ['Afficher la solution', showSolution],
  ];
  buttonsConfig.forEach(([text, handler]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = text;
    btn.addEventListener('click', handler);
    buttons.appendChild(btn);
  });
  gameWrapper.appendChild(buttons);
  root.appendChild(gameWrapper);
}

document.addEventListener('DOMContentLoaded', () => {
  buildUI();
  generateNewGame();
  updateNumberPadVisibility();
  window.addEventListener('resize', updateNumberPadVisibility);
});
