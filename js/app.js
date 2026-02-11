import { FileSystem } from './filesystem/FileSystem.js';
import { defaultStructure } from './filesystem/defaultStructure.js';
import { registerNavigationCommands } from './commands/navigation.js';
import { registerFileCommands } from './commands/files.js';
import { registerSearchCommands } from './commands/search.js';
import { registerUtilCommands } from './commands/utils.js';
import { Terminal } from './terminal/Terminal.js';
import { MissionSystem } from './missions/MissionSystem.js';
import { i18n } from './i18n/index.js';

class App {
    constructor() {
        this.i18n = i18n;
        this.fs = new FileSystem(defaultStructure);
        this.missionSystem = null;
        this.terminal = null;

        this._init();
    }

    _init() {
        // Register all commands
        registerNavigationCommands(this.fs);
        registerFileCommands(this.fs);
        registerSearchCommands(this.fs);
        registerUtilCommands(this.fs, this.i18n);

        // Init mission system (loads saved progress and may restore fs)
        this.missionSystem = new MissionSystem(this.fs, this.i18n);

        // Init terminal
        this.terminal = new Terminal(this.fs, (input, parsed, result) => {
            this.missionSystem.onCommand(input, parsed, result);
        }, this.i18n);

        // Bind UI events
        this._bindUI();
        this._applyLocalizedUI();

        // Focus terminal
        this.terminal.focus();
    }

    _bindUI() {
        // Theme toggle
        const themeBtn = document.getElementById('theme-toggle');
        const savedTheme = localStorage.getItem('linux-game-theme') || 'light';
        this._setTheme(savedTheme);

        themeBtn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            this._setTheme(next);
            localStorage.setItem('linux-game-theme', next);
        });

        // Language toggle
        const langBtn = document.getElementById('lang-toggle');
        langBtn.addEventListener('click', () => {
            const current = this.i18n.getLanguage();
            const next = current === 'en' ? 'fr' : 'en';
            this.i18n.setLanguage(next);
            this.missionSystem.setLanguage(next);
            this._applyLocalizedUI();
        });

        // Free mode toggle
        const freeModeToggle = document.getElementById('free-mode-toggle');
        freeModeToggle.addEventListener('change', (e) => {
            this.missionSystem.setFreeMode(e.target.checked);
        });

        // Reset button
        const resetBtn = document.getElementById('reset-btn');
        resetBtn.addEventListener('click', () => {
            if (confirm(this.i18n.t('ui.resetConfirm', 'Restart? Your progress will be lost.'))) {
                this.missionSystem.reset();
                this.fs = new FileSystem(defaultStructure);

                // Re-register commands with new fs
                registerNavigationCommands(this.fs);
                registerFileCommands(this.fs);
                registerSearchCommands(this.fs);
                registerUtilCommands(this.fs, this.i18n);

                this.missionSystem.fs = this.fs;
                this.missionSystem._renderMissions();
                this.missionSystem._updateHeader();

                this.terminal.fs = this.fs;
                this.terminal.nanoSession = null;
                this.terminal.autocomplete.fs = this.fs;
                this.terminal.clear();
                this.terminal._showWelcome();
                this.terminal._updatePrompt();
                this._applyLocalizedUI();
                this.terminal.focus();
            }
        });
    }

    _applyLocalizedUI() {
        document.title = this.i18n.t('ui.documentTitle', 'Linux Game - Learn the Terminal');

        const title = document.getElementById('app-title');
        if (title) title.textContent = this.i18n.t('ui.appTitle', 'Linux Game');

        const missionsTitle = document.getElementById('missions-title');
        if (missionsTitle) missionsTitle.textContent = this.i18n.t('ui.missionsTitle', 'Missions');

        const freeModeLabel = document.getElementById('free-mode-label');
        if (freeModeLabel) freeModeLabel.textContent = this.i18n.t('ui.freeMode', 'Free mode');

        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) resetBtn.title = this.i18n.t('ui.resetTitle', 'Restart');

        const langBtn = document.getElementById('lang-toggle');
        if (langBtn) {
            const current = this.i18n.getLanguage();
            const next = current === 'en' ? 'fr' : 'en';
            langBtn.textContent = next.toUpperCase();
            langBtn.title = current === 'en'
                ? this.i18n.t('ui.switchToFrench', 'Switch to French')
                : this.i18n.t('ui.switchToEnglish', 'Switch to English');
        }

        this._setTheme(document.documentElement.getAttribute('data-theme') || 'light');
    }

    _setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const btn = document.getElementById('theme-toggle');
        btn.textContent = theme === 'dark' ? '\u2600' : '\u263E';
        btn.title = theme === 'dark'
            ? this.i18n.t('ui.themeLightTitle', 'Light mode')
            : this.i18n.t('ui.themeDarkTitle', 'Dark mode');
    }
}

// Launch
window.addEventListener('DOMContentLoaded', () => {
    new App();
});
