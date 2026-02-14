/**
 * Jeu de Sudoku - Interface interactive sans dépendance externe
 * Génération de grilles par backtracking, validation en temps réel
 */

const GRID_SIZE = 9;
const HOLES = 40;

let board = [];
let solution = [];
let fixedCells = [];
let invalidCells = new Set();
let boardContainer;

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

  if (fixedCells[r][c]) {
    cell.textContent = board[r][c];
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

function renderBoard() {
  boardContainer.innerHTML = '';
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      boardContainer.appendChild(buildCell(r, c));
    }
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
}

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
    }
  }
  invalidCells = new Set();
  renderBoard();
}

function generateNewGame() {
  const solved = generateSolvedBoard();
  const puzzle = generatePuzzle(solved, HOLES);

  board = [];
  solution = [];
  fixedCells = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    const rowVals = [];
    const solRow = [];
    const fixedRow = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      const v = puzzle[r][c];
      rowVals.push(v === 0 ? '' : String(v));
      solRow.push(String(solved[r][c]));
      fixedRow.push(v !== 0);
    }
    board.push(rowVals);
    solution.push(solRow);
    fixedCells.push(fixedRow);
  }

  invalidCells = new Set();
  renderBoard();
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

  const buttons = document.createElement('div');
  buttons.className = 'buttons';

  const buttonsConfig = [
    ['Nouvelle grille', generateNewGame],
    ['Vérifier', checkSolution],
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
});
