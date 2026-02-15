/**
 * Jeu de Sudoku - Interface interactive sans dépendance externe
 * Génération de grilles par backtracking, validation en temps réel, mode options (candidats)
 */

// --- Constantes ---

const GRID_SIZE = 9;
const HOLES = 40;

// --- État du jeu ---

let board = [];
let solution = [];
let fixedCells = [];
let invalidCells = new Set();
let options = []; // options[r][c] = Set des chiffres "1".."9" en mode candidat
let optionMode = false;
let boardContainer;

// --- Génération de grille (backtracking) ---

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

// --- Validation (doublons ligne / colonne / bloc) ---

function getCellsWithKeys(positions) {
  return positions.map(([r, c]) => ({ value: board[r][c], key: `${r}-${c}` }));
}

function findDuplicateKeys(cells) {
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
    const positions = Array.from({ length: GRID_SIZE }, (_, c) => [r, c]);
    findDuplicateKeys(getCellsWithKeys(positions)).forEach((k) => invalidCells.add(k));
  }
  for (let c = 0; c < GRID_SIZE; c++) {
    const positions = Array.from({ length: GRID_SIZE }, (_, r) => [r, c]);
    findDuplicateKeys(getCellsWithKeys(positions)).forEach((k) => invalidCells.add(k));
  }
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const positions = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          positions.push([br * 3 + r, bc * 3 + c]);
        }
      }
      findDuplicateKeys(getCellsWithKeys(positions)).forEach((k) => invalidCells.add(k));
    }
  }

  let i = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      boardContainer.children[i++].classList.toggle('invalid', invalidCells.has(`${r}-${c}`));
    }
  }
}

// --- Options (candidats / mode crayon) ---

function getPeers(r, c) {
  const peers = new Set();
  for (let x = 0; x < GRID_SIZE; x++) {
    if (x !== c) peers.add(`${r}-${x}`);
    if (x !== r) peers.add(`${x}-${c}`);
  }
  const startRow = r - (r % 3);
  const startCol = c - (c % 3);
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const rr = startRow + br;
      const cc = startCol + bc;
      if (rr !== r || cc !== c) peers.add(`${rr}-${cc}`);
    }
  }
  return Array.from(peers).map((key) => key.split('-').map(Number));
}

function updateOptionsDisplayForCell(r, c) {
  const cellElem = boardContainer.children[r * GRID_SIZE + c];
  const optsGrid = cellElem?.querySelector('.cell-options');
  if (!optsGrid) return;
  const set = options[r][c];
  optsGrid.querySelectorAll('.option-digit').forEach((el) => {
    el.classList.toggle('visible', set.has(el.dataset.digit));
  });
}

function buildOptionsGrid(r, c) {
  const optsGrid = document.createElement('div');
  optsGrid.className = 'cell-options';
  optsGrid.setAttribute('aria-hidden', 'true');
  for (let d = 1; d <= 9; d++) {
    const span = document.createElement('span');
    span.className = 'option-digit';
    span.dataset.digit = String(d);
    span.textContent = d;
    if (options[r][c].has(String(d))) span.classList.add('visible');
    optsGrid.appendChild(span);
  }
  return optsGrid;
}

// --- Rendu des cellules ---

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

  if (fixedCells[r][c]) {
    cell.textContent = board[r][c];
    return cell;
  }

  cell.classList.add('cell-with-options');
  cell.appendChild(buildOptionsGrid(r, c));

  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.value = board[r][c];
  input.maxLength = 1;
  input.dataset.row = r;
  input.dataset.col = c;
  input.addEventListener('input', onCellInput);
  cell.appendChild(input);

  return cell;
}

function renderBoard() {
  boardContainer.innerHTML = '';
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      boardContainer.appendChild(buildCell(r, c));
    }
  }
}

// --- Saisie (chiffre définitif ou option) ---

function onCellInput(event) {
  const input = event.target;
  const value = /^[1-9]$/.test(input.value.trim()) ? input.value.trim() : '';
  const row = parseInt(input.dataset.row, 10);
  const col = parseInt(input.dataset.col, 10);

  if (optionMode) {
    input.value = '';
    if (value) {
      const set = options[row][col];
      if (set.has(value)) set.delete(value);
      else set.add(value);
      updateOptionsDisplayForCell(row, col);
    }
    return;
  }

  input.value = value;
  board[row][col] = value;
  options[row][col].clear();

  if (value) {
    getPeers(row, col).forEach(([rr, cc]) => options[rr][cc].delete(value));
    updateOptionsDisplayForCell(row, col);
    getPeers(row, col).forEach(([rr, cc]) => updateOptionsDisplayForCell(rr, cc));
  }
  validateAndHighlight();
}

// --- Actions du jeu ---

function checkSolution() {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r][c] === '' || board[r][c] !== solution[r][c]) {
        alert('Solution incorrecte ou incomplète.');
        return;
      }
    }
  }
  alert('Bravo ! Vous avez complété le Sudoku.');
}

function showSolution() {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      board[r][c] = solution[r][c];
      fixedCells[r][c] = true;
      options[r][c].clear();
    }
  }
  invalidCells = new Set();
  renderBoard();
}

function initBoardFromPuzzle(puzzle, solved) {
  board = [];
  solution = [];
  fixedCells = [];
  options = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const rowVals = [];
    const solRow = [];
    const fixedRow = [];
    const optRow = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      const v = puzzle[r][c];
      rowVals.push(v === 0 ? '' : String(v));
      solRow.push(String(solved[r][c]));
      fixedRow.push(v !== 0);
      optRow.push(new Set());
    }
    board.push(rowVals);
    solution.push(solRow);
    fixedCells.push(fixedRow);
    options.push(optRow);
  }
}

function generateNewGame() {
  const solved = generateSolvedBoard();
  const puzzle = generatePuzzle(solved, HOLES);
  initBoardFromPuzzle(puzzle, solved);
  invalidCells = new Set();
  renderBoard();
}

// --- UI ---

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

  const buttons = document.createElement('div');
  buttons.className = 'buttons';

  const optionBtn = document.createElement('button');
  optionBtn.type = 'button';
  optionBtn.id = 'option-mode-btn';
  optionBtn.textContent = 'Mode option';
  optionBtn.addEventListener('click', () => {
    optionMode = !optionMode;
    optionBtn.textContent = optionMode ? 'Mode chiffre' : 'Mode option';
    optionBtn.classList.toggle('active', optionMode);
  });

  const buttonsConfig = [
    ['Nouvelle grille', generateNewGame],
    ['Vérifier', checkSolution],
    ['Afficher la solution', showSolution],
  ];

  buttons.appendChild(optionBtn);
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

// --- Init ---

document.addEventListener('DOMContentLoaded', () => {
  buildUI();
  generateNewGame();
});
