# Sudoku

Jeu de Sudoku en HTML, CSS et JavaScript vanilla — sans dépendances externes.

## Fonctionnalités

- **Génération aléatoire** : grilles créées par algorithme de backtracking
- **Validation en temps réel** : les doublons (lignes, colonnes, blocs 3×3) sont signalés en rouge
- **Trois actions** : nouvelle grille, vérification, affichage de la solution

## Lancement

Ouvrir `index.html` dans un navigateur web. Aucune installation ni serveur requis.

```bash
# Option : servir avec un serveur local (Python)
python -m http.server 8000
# Puis ouvrir http://localhost:8000
```

## Structure

```
Sudoku/
├── index.html   # Page principale
├── index.js     # Logique du jeu et interface
├── style.css    # Styles de la grille et des boutons
└── README.md
```

## Algorithme

1. **Génération** : remplissage récursif par backtracking avec ordre aléatoire des chiffres
2. **Puzzle** : suppression de 40 cases (difficulté moyenne) dans une grille résolue
3. **Validation** : détection des doublons par ligne, colonne et bloc 3×3

## Stack

- HTML5
- CSS3 (Grid)
- JavaScript ES6+

## Licence

Libre d'utilisation.
