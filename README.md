# Linux Game

Linux Game is an interactive web app to learn Linux commands through a simulated terminal and progressive missions.

## Overview

- 5 learning levels
- 94 guided missions
- Simulated terminal (navigation, files, search, permissions, pipes)
- Built-in lessons per mission
- Local progress persistence
- Free mode for open practice
- Bilingual UI support (English/French), English by default

## Core Features

- Base commands: `pwd`, `cd`, `ls`, `cat`, `touch`, `mkdir`, `rm`, `cp`, `mv`
- Search and filtering: `grep`, `find`, `head`, `tail`, `wc`, `less`
- Command discovery and docs: `whatis`, `man`, `apropos`
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

### v1.1.0

- Parser hardening:
  - better handling of escaped operators (`\|`, `\>`)
  - explicit syntax errors for unmatched quotes, trailing pipes, and missing redirect targets
  - safer pipe + redirection parsing flow
- Terminal execution hardening:
  - redirected write failures now propagate as command errors
  - parser syntax errors are surfaced directly in terminal output
- Filesystem and permissions consistency:
  - unified safe write-path normalization API
  - permission-aware `grep`/`find` traversal checks
  - new files/directories inherit current user ownership metadata
- Mission and persistence robustness:
  - mission error handling supports opt-in validation for expected command failures
  - versioned `localStorage` payloads with legacy compatibility fallback
  - safer filesystem snapshot restore guards against malformed/corrupted saves
- Autocomplete now respects directory listing permissions.
- Expanded regression suite for parser, permissions, persistence, autocomplete, and mission error flows.

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
