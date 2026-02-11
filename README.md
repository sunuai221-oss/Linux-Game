# Linux Game

Linux Game is an interactive web app to learn Linux commands through a simulated terminal and progressive missions.

## Overview

- 5 learning levels
- 89 guided missions
- Simulated terminal (navigation, files, search, permissions, pipes)
- Built-in lessons per mission
- Local progress persistence
- Free mode for open practice
- Bilingual UI support (English/French), English by default

## Core Features

- Base commands: `pwd`, `cd`, `ls`, `cat`, `touch`, `mkdir`, `rm`, `cp`, `mv`
- Search and filtering: `grep`, `find`, `head`, `tail`, `wc`, `less`
- Permissions: numeric and symbolic `chmod`
- Simplified editor: `nano` (`/help`, `/show`, `/save`, `/exit`)
- Advanced missions: pipes, least-privilege scenarios, strict success-based validation

## Run Locally

### Requirements

- Node.js 18+
- `npx`

### Quick Start (Windows)

```bat
start.bat
```

This opens: `http://localhost:3000`

### Manual Start

```powershell
npx serve . -l 3000 -s
```

Then open: `http://localhost:3000`

## Tests

Run regression tests:

```powershell
node tests/targeted-regression-tests.cjs
```

## Project Structure

```text
css/                UI styles
js/
  app.js            App bootstrap
  commands/         Command registry and handlers
  filesystem/       Virtual filesystem engine
  i18n/             Localization system (en/fr)
  missions/         Levels, missions, progression
  terminal/         Terminal UI, history, autocomplete
tests/              Targeted regression tests
index.html          Entry point
start.bat           Local startup script (Windows)
```

## Release Notes

### v1.0.0

- Complete Linux Game baseline application
- Multi-level mission system with scoring
- Extended `find` support (`-name`, `-iname`, `-mtime`, `-mmin`)
- Simplified `nano` mode with dedicated missions
- Strengthened permissions model with numeric + symbolic `chmod`
- Dedicated least-privilege mission
- Regression and security-focused test coverage

## License

Distributed as-is for educational purposes.
