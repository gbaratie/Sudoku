/*
 * Ce script crée une interface Sudoku interactive sans dépendance externe.
 * Un générateur de Sudoku basé sur le retour arrière fabrique une grille
 * aléatoire à chaque nouvelle partie. Les utilisateurs peuvent saisir des
 * chiffres, vérifier leur solution et afficher la solution complète.
 */

// États globaux du jeu
let board = [];      // Tableau 9x9 des valeurs courantes (chaîne ou '')
let solution = [];   // Tableau 9x9 de la solution (chaînes)
let fixedCells = []; // Tableau 9x9 de booléens indiquant les cases fixes
let invalidCells = new Set(); // Ensemble des cellules en conflit 'r-c'

let boardContainer; // Élément DOM contenant la grille

/**
 * Génère un tableau 9x9 rempli de zéros.
 */
function createEmptyBoard() {
  const board = [];
  for (let i = 0; i < 9; i++) {
    board.push(new Array(9).fill(0));
  }
  return board;
}

/**
 * Clone un plateau de Sudoku (copie profonde).
 */
function cloneBoard(board) {
  return board.map((row) => row.slice());
}

/**
 * Mélange les éléments d'un tableau (Durstenfeld).
 */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Vérifie si un nombre peut être placé à la position (row,col).
 */
function isSafe(board, row, col, num) {
  for (let x = 0; x < 9; x++) {
    if (board[row][x] === num) return false;
    if (board[x][col] === num) return false;
  }
  const startRow = row - (row % 3);
  const startCol = col - (col % 3);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (board[startRow + r][startCol + c] === num) return false;
    }
  }
  return true;
}

/**
 * Remplit un plateau vide pour générer une solution complète.
 */
function fillBoard(board) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (let num of nums) {
          if (isSafe(board, r, c, num)) {
            board[r][c] = num;
            if (fillBoard(board)) return true;
            board[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

/**
 * Génère une grille complètement remplie (solution).
 */
function generateSolvedBoard() {
  const b = createEmptyBoard();
  fillBoard(b);
  return b;
}

/**
 * Supprime un certain nombre de cellules pour créer un puzzle.
 */
function generatePuzzle(board, holes) {
  const puzzle = cloneBoard(board);
  let removed = 0;
  while (removed < holes) {
    const r = Math.floor(Math.random() * 9);
    const c = Math.floor(Math.random() * 9);
    if (puzzle[r][c] !== 0) {
      puzzle[r][c] = 0;
      removed++;
    }
  }
  return puzzle;
}

/**
 * Construit le tableau d'éléments DOM représentant la grille et les boutons.
 */
function buildUI() {
  const root = document.getElementById('root');
  root.innerHTML = '';
  // Titre
  const title = document.createElement('h1');
  title.textContent = 'Jeu de Sudoku';
  root.appendChild(title);
  // Grille
  boardContainer = document.createElement('div');
  boardContainer.className = 'board';
  root.appendChild(boardContainer);
  // Boutons
  const buttons = document.createElement('div');
  buttons.className = 'buttons';
  const newBtn = document.createElement('button');
  newBtn.textContent = 'Nouvelle grille';
  newBtn.addEventListener('click', generateNewGame);
  const checkBtn = document.createElement('button');
  checkBtn.textContent = 'Vérifier';
  checkBtn.addEventListener('click', checkSolution);
  const solBtn = document.createElement('button');
  solBtn.textContent = 'Afficher la solution';
  solBtn.addEventListener('click', showSolution);
  buttons.appendChild(newBtn);
  buttons.appendChild(checkBtn);
  buttons.appendChild(solBtn);
  root.appendChild(buttons);
}

/**
 * Met à jour l'affichage de la grille en fonction de l'état global 'board'.
 */
function renderBoard() {
  boardContainer.innerHTML = '';
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const key = `${r}-${c}`;
      const isFixed = fixedCells[r][c];
      // Détermination des classes de bordure
      let className = 'cell';
      if (r % 3 === 0) className += ' bold-border-top';
      if (c % 3 === 0) className += ' bold-border-left';
      if (r === 8) className += ' bold-border-bottom';
      if (c === 8) className += ' bold-border-right';
      if (isFixed) className += ' fixed';
      if (invalidCells.has(key)) className += ' invalid';
      const cell = document.createElement('div');
      cell.className = className;
      if (isFixed) {
        cell.textContent = board[r][c];
      } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = board[r][c];
        input.maxLength = 1;
        input.dataset.row = r;
        input.dataset.col = c;
        input.addEventListener('input', onCellInput);
        cell.appendChild(input);
      }
      boardContainer.appendChild(cell);
    }
  }
}

/**
 * Met à jour l'ensemble invalidCells en vérifiant les doublons et actualise
 * l'affichage des cases invalides.
 */
function validateAndHighlight() {
  invalidCells = new Set();
  // Lignes
  for (let r = 0; r < 9; r++) {
    const occ = {};
    for (let c = 0; c < 9; c++) {
      const v = board[r][c];
      if (v !== '') {
        if (!occ[v]) occ[v] = [];
        occ[v].push(c);
      }
    }
    Object.keys(occ).forEach((val) => {
      if (occ[val].length > 1) {
        occ[val].forEach((c) => invalidCells.add(`${r}-${c}`));
      }
    });
  }
  // Colonnes
  for (let c = 0; c < 9; c++) {
    const occ = {};
    for (let r = 0; r < 9; r++) {
      const v = board[r][c];
      if (v !== '') {
        if (!occ[v]) occ[v] = [];
        occ[v].push(r);
      }
    }
    Object.keys(occ).forEach((val) => {
      if (occ[val].length > 1) {
        occ[val].forEach((r) => invalidCells.add(`${r}-${c}`));
      }
    });
  }
  // Blocs 3x3
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const occ = {};
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const row = br * 3 + r;
          const col = bc * 3 + c;
          const v = board[row][col];
          if (v !== '') {
            if (!occ[v]) occ[v] = [];
            occ[v].push({ row, col });
          }
        }
      }
      Object.keys(occ).forEach((val) => {
        if (occ[val].length > 1) {
          occ[val].forEach(({ row, col }) => invalidCells.add(`${row}-${col}`));
        }
      });
    }
  }
  // Met à jour les classes 'invalid' des cellules existantes
  const cells = boardContainer.children;
  let index = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cellElem = cells[index++];
      const key = `${r}-${c}`;
      if (invalidCells.has(key)) {
        cellElem.classList.add('invalid');
      } else {
        cellElem.classList.remove('invalid');
      }
    }
  }
}

/**
 * Gestionnaire d'événement pour la saisie dans une cellule.
 */
function onCellInput(event) {
  const input = event.target;
  let value = input.value;
  // N'accepte que les chiffres 1-9; supprime tout autre caractère
  if (!/^$|^[1-9]$/.test(value)) {
    value = '';
  }
  input.value = value;
  const row = parseInt(input.dataset.row);
  const col = parseInt(input.dataset.col);
  board[row][col] = value;
  // Recalculer les conflits
  validateAndHighlight();
}

/**
 * Vérifie si la grille complétée correspond à la solution.
 */
function checkSolution() {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === '' || board[r][c] !== solution[r][c]) {
        alert('Solution incorrecte ou incomplète.');
        return;
      }
    }
  }
  alert('Bravo ! Vous avez complété le Sudoku.');
}

/**
 * Remplace la grille actuelle par la solution et désactive les entrées.
 */
function showSolution() {
  // Copie la solution dans le plateau et marque toutes les cases comme non fixes
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      board[r][c] = solution[r][c];
      fixedCells[r][c] = true;
    }
  }
  // Réinitialise l'ensemble des cellules invalides
  invalidCells = new Set();
  renderBoard();
}

/**
 * Génère un nouveau puzzle, met à jour les états et l'affichage.
 */
function generateNewGame() {
  // Génère une solution puis un puzzle avec 40 trous (difficulté moyenne)
  const solved = generateSolvedBoard();
  const puzzle = generatePuzzle(solved, 40);
  board = [];
  solution = [];
  fixedCells = [];
  for (let r = 0; r < 9; r++) {
    const rowVals = [];
    const solRow = [];
    const fixedRow = [];
    for (let c = 0; c < 9; c++) {
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

// Initialise l'interface au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
  buildUI();
  generateNewGame();
});