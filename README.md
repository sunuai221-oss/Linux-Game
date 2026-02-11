# Linux Game

Linux Game est une application web interactive pour apprendre les commandes Linux via un faux terminal et des missions progressives.

## Apercu

- 5 niveaux pedagogiques
- 89 missions guidees
- Terminal simule (navigation, fichiers, recherche, permissions, pipes)
- Lecons integrees dans les missions
- Sauvegarde locale de la progression
- Mode libre pour s entrainer sans validation

## Fonctionnalites principales

- Commandes de base: `pwd`, `cd`, `ls`, `cat`, `touch`, `mkdir`, `rm`, `cp`, `mv`
- Recherche et filtres: `grep`, `find`, `head`, `tail`, `wc`, `less`
- Permissions: `chmod` numerique et symbolique
- Editeur simplifie: `nano` (`/help`, `/show`, `/save`, `/exit`)
- Missions avancees: pipes, least privilege, validations ciblees

## Lancer en local

### Prerequis

- Node.js 18+
- `npx` disponible

### Demarrage rapide (Windows)

```bat
start.bat
```

Le script ouvre automatiquement: `http://localhost:3000`

### Demarrage manuel

```powershell
npx serve . -l 3000 -s
```

Puis ouvrir: `http://localhost:3000`

## Tests

Suite de tests de regression:

```powershell
node tests/targeted-regression-tests.cjs
```

## Structure du projet

```text
css/                Styles UI
js/
  app.js            Bootstrap application
  commands/         Registry + commandes terminal
  filesystem/       Systeme de fichiers virtuel
  missions/         Niveaux, missions, progression
  terminal/         UI terminal + historique + autocomplete
tests/              Tests cibles de non-regression
index.html          Entry point
start.bat           Lancement local Windows
```

## Notes de version

### v1.0.0

- Base complete de l application Linux Game
- Missions multi-niveaux et systeme de score
- Support `find` et filtres avances (`-name`, `-iname`, `-mtime`, `-mmin`)
- Support `nano` simplifie et missions dediees
- Permissions renforcees avec `chmod` numerique et symbolique
- Mission least privilege dediee
- Tests de regression et securite renforces

## Licence

Projet distribue tel quel pour apprentissage.
