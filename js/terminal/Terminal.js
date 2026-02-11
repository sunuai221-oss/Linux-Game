import { CommandParser } from '../commands/CommandParser.js';
import { registry } from '../commands/registry.js';
import { CommandHistory } from './history.js';
import { Autocomplete } from './autocomplete.js';

export class Terminal {
    constructor(fs, onCommandExecuted, i18n = null) {
        this.fs = fs;
        this.i18n = i18n;
        this.onCommandExecuted = onCommandExecuted || (() => {});
        this.history = new CommandHistory();
        this.autocomplete = new Autocomplete(fs, registry);
        this.nanoSession = null;

        this.outputEl = document.getElementById('terminal-output');
        this.inputEl = document.getElementById('terminal-input');
        this.promptEl = document.getElementById('terminal-prompt');
        this.titleEl = document.querySelector('.terminal-title');

        this._bindEvents();
        this._updatePrompt();
        this._showWelcome();
    }

    _bindEvents() {
        this.inputEl.addEventListener('keydown', (e) => this._handleKeyDown(e));

        // Keep focus on input
        document.getElementById('terminal-container').addEventListener('click', () => {
            this.inputEl.focus();
        });
    }

    _handleKeyDown(e) {
        switch (e.key) {
            case 'Enter':
                e.preventDefault();
                this._executeInput();
                break;

            case 'ArrowUp':
                e.preventDefault();
                const prevCmd = this.history.navigateUp(this.inputEl.value);
                if (prevCmd !== null) this.inputEl.value = prevCmd;
                break;

            case 'ArrowDown':
                e.preventDefault();
                const nextCmd = this.history.navigateDown(this.inputEl.value);
                if (nextCmd !== null) this.inputEl.value = nextCmd;
                break;

            case 'Tab':
                e.preventDefault();
                if (this.nanoSession) {
                    const start = this.inputEl.selectionStart ?? this.inputEl.value.length;
                    const end = this.inputEl.selectionEnd ?? this.inputEl.value.length;
                    const before = this.inputEl.value.slice(0, start);
                    const after = this.inputEl.value.slice(end);
                    this.inputEl.value = before + '\t' + after;
                    this.inputEl.selectionStart = this.inputEl.selectionEnd = start + 1;
                } else {
                    this._handleTab();
                }
                break;

            case 'c':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this._appendOutput(this._getPromptHtml() + this.inputEl.value + '^C', true);
                    this.inputEl.value = '';
                    this.history.reset();
                }
                break;

            case 'l':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.clear();
                }
                break;
        }
    }

    _handleTab() {
        const input = this.inputEl.value;
        const cursorPos = this.inputEl.selectionStart;
        const textBeforeCursor = input.substring(0, cursorPos);

        const parts = textBeforeCursor.split(' ');
        const lastPart = parts[parts.length - 1];

        const result = this.autocomplete.complete(textBeforeCursor);

        if (result.completed) {
            if (parts.length <= 1) {
                // Completing command
                this.inputEl.value = result.completed + input.substring(cursorPos);
            } else {
                // Completing path argument
                parts[parts.length - 1] = result.completed;
                this.inputEl.value = parts.join(' ') + input.substring(cursorPos);
            }
            this.inputEl.selectionStart = this.inputEl.selectionEnd = this.inputEl.value.length;
        }

        if (result.options.length > 1) {
            // Show options
            this._appendOutput(this._getPromptHtml() + this._escapeHtml(input), true);
            this._appendOutput(result.options.join('  '));
        }
    }

    _executeInput() {
        const input = this.inputEl.value;
        this.inputEl.value = '';
        this.history.reset();

        // Show the command in output
        this._appendOutput(this._getPromptHtml() + this._escapeHtml(input), true);

        if (this.nanoSession) {
            const nanoResult = this._executeNanoInput(input);

            if (nanoResult && nanoResult.output) {
                if (nanoResult.isHtml) {
                    this._appendOutput(nanoResult.output, true, nanoResult.isError ? 'output-error' : '');
                } else {
                    this._appendOutput(
                        this._escapeHtml(nanoResult.output),
                        true,
                        nanoResult.isError ? 'output-error' : ''
                    );
                }
            }

            if (nanoResult && nanoResult._mission && !nanoResult.isError) {
                const missionResult = {
                    output: nanoResult.output || '',
                    isError: false,
                    nanoEvent: nanoResult.nanoEvent || null,
                };
                this.onCommandExecuted(
                    nanoResult._mission.input,
                    nanoResult._mission.parsed,
                    missionResult
                );
            }

            this._updatePrompt();
            this._scrollToBottom();
            return;
        }

        if (!input.trim()) {
            this._updatePrompt();
            this._scrollToBottom();
            return;
        }

        this.history.add(input);

        const parsed = CommandParser.parse(input);
        if (!parsed || parsed.type === 'empty') {
            this._updatePrompt();
            return;
        }

        let result;
        if (parsed.type === 'pipe') {
            result = this._executePipe(parsed.commands);
        } else {
            result = this._executeSingle(parsed);
        }

        // Handle redirections
        if (parsed.redirect && result && !result.isError) {
            const content = result.output || '';
            const writeResult = this.fs.writeFile(
                parsed.redirect.file,
                parsed.redirect.type === 'append' ? '\n' + content : content,
                parsed.redirect.type === 'append'
            );
            if (writeResult.error) {
                this._appendOutput(writeResult.error, false, 'output-error');
            }
            // Don't show output when redirected
            result = { output: '' };
        }

        if (result) {
            if (result.clear) {
                this.clear();
            } else if (result.output) {
                if (result.isHtml) {
                    this._appendOutput(result.output, true, result.isError ? 'output-error' : '');
                } else {
                    this._appendOutput(
                        this._escapeHtml(result.output),
                        true,
                        result.isError ? 'output-error' : ''
                    );
                }
            }
        }

        if (result && result.nano && result.nano.action === 'open') {
            this._openNanoSession(result.nano);
        }

        this._updatePrompt();
        this._scrollToBottom();

        // Notify that a command was executed
        this.onCommandExecuted(input, parsed, result);
    }

    _executeSingle(parsed, stdin = null) {
        const entry = registry.get(parsed.command);
        if (!entry) {
            return {
                output: `${parsed.command}: command not found. Type 'help' for available commands.`,
                isError: true,
            };
        }

        const context = {
            getHistory: () => this.history.getAll(),
        };

        try {
            return entry.handler(parsed.args, parsed.flags, stdin, context);
        } catch (err) {
            return { output: `Error: ${err.message}`, isError: true };
        }
    }

    _executePipe(commands) {
        let stdin = null;
        let result = null;

        for (const cmd of commands) {
            if (cmd.type === 'empty') continue;
            result = this._executeSingle(cmd, stdin);
            if (result.isError) return result;
            stdin = result.output || '';
        }

        return result;
    }

    _openNanoSession(payload) {
        const content = typeof payload.content === 'string' ? payload.content : '';
        this.nanoSession = {
            path: payload.path,
            buffer: content.length > 0 ? content.split('\n') : [],
            dirty: false,
        };
    }

    _executeNanoInput(input) {
        if (!this.nanoSession) return null;

        const command = input.trim();
        const path = this.nanoSession.path;
        const displayPath = this.fs.displayPath(path);

        if (command === '/help') {
            return { output: this._t('terminal.nanoPromptHelp', '[nano] Commands: /help /show /save /exit') };
        }

        if (command === '/show') {
            if (this.nanoSession.buffer.length === 0) {
                return { output: this._t('terminal.nanoBufferEmpty', '[nano] (empty buffer)') };
            }

            const lines = this.nanoSession.buffer.map((line, index) => {
                return `${String(index + 1).padStart(3)} ${line}`;
            });
            return { output: lines.join('\n') };
        }

        if (command === '/save') {
            const content = this.nanoSession.buffer.join('\n');
            const writeResult = this.fs.writeFile(path, content, false);
            if (writeResult.error) {
                return { output: writeResult.error, isError: true };
            }

            this.nanoSession.dirty = false;
            return {
                output: this._t('terminal.nanoSaved', '[nano] Saved {path}', { path: displayPath }),
                nanoEvent: { action: 'save', path },
                _mission: {
                    input: `nano --save ${displayPath}`,
                    parsed: { type: 'command', command: 'nano', args: ['--save', path], flags: {} },
                },
            };
        }

        if (command === '/exit') {
            const hadUnsavedChanges = this.nanoSession.dirty;
            this.nanoSession = null;
            return {
                output: hadUnsavedChanges
                    ? this._t('terminal.nanoExitUnsaved', '[nano] Exit without saving.')
                    : this._t('terminal.nanoExitSaved', '[nano] Exiting nano.'),
                nanoEvent: { action: 'exit', path },
                _mission: {
                    input: `nano --exit ${displayPath}`,
                    parsed: { type: 'command', command: 'nano', args: ['--exit', path], flags: {} },
                },
            };
        }

        if (command.startsWith('/')) {
            return {
                output: this._t('terminal.nanoUnknownCmd', '[nano] Unknown command: {command}. Use /help.', { command }),
                isError: true,
            };
        }

        // In nano mode, each entered line is appended to the in-memory buffer.
        this.nanoSession.buffer.push(input);
        this.nanoSession.dirty = true;
        return null;
    }

    _appendOutput(text, isHtml = false, className = '') {
        const line = document.createElement('div');
        line.className = 'output-line' + (className ? ' ' + className : '');
        if (isHtml) {
            line.innerHTML = text;
        } else {
            line.textContent = text;
        }
        this.outputEl.appendChild(line);
    }

    _getPromptHtml() {
        if (this.nanoSession) {
            const filePath = this._escapeHtml(this.fs.displayPath(this.nanoSession.path));
            return `<span class="output-info">nano</span>:<span class="output-info">${filePath}</span>&gt; `;
        }

        const path = this._escapeHtml(this.fs.displayPath(this.fs.cwd));
        const username = this._escapeHtml(this.fs.username);
        const hostname = this._escapeHtml(this.fs.hostname);
        return `<span class="output-prompt">${username}@${hostname}</span>:<span class="output-info">${path}</span>$ `;
    }

    _updatePrompt() {
        if (this.nanoSession) {
            const filePath = this.fs.displayPath(this.nanoSession.path);
            this.promptEl.textContent = `nano:${filePath}> `;
            this.titleEl.textContent = `nano: ${filePath}`;
            return;
        }

        const path = this.fs.displayPath(this.fs.cwd);
        this.promptEl.textContent = `${this.fs.username}@${this.fs.hostname}:${path}$ `;
        this.titleEl.textContent = `${this.fs.username}@${this.fs.hostname}: ${path}`;
    }

    _scrollToBottom() {
        this.outputEl.scrollTop = this.outputEl.scrollHeight;
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    clear() {
        this.outputEl.innerHTML = '';
    }

    _showWelcome() {
        const banner = `<span class="output-banner">
  _     _                    ____
 | |   (_)_ __  _   ___  __ / ___| __ _ _ __ ___   ___
 | |   | | '_ \\| | | \\ \\/ / |  _ / _\` | '_ \` _ \\ / _ \\
 | |___| | | | | |_| |>  <| |_| | (_| | | | | | |  __/
 |_____|_|_| |_|\\__,_/_/\\_\\\\____|\\__,_|_| |_| |_|\\___|
</span>
${this._t('terminal.welcomeIntro', 'Welcome to <span class="output-info">Linux Game</span>! Learn Linux commands while playing.')}

${this._t('terminal.welcomeHelp', 'Type <span class="output-info">help</span> to see available commands.')}
${this._t('terminal.welcomeMan', 'Type <span class="output-info">man &lt;command&gt;</span> for a command manual.')}

`;
        this._appendOutput(banner, true);
    }

    focus() {
        this.inputEl.focus();
    }

    _t(key, fallback, params = {}) {
        if (!this.i18n || typeof this.i18n.t !== 'function') {
            return String(fallback).replace(/\{(\w+)\}/g, (match, name) => {
                return Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match;
            });
        }
        return this.i18n.t(key, fallback, params);
    }
}
