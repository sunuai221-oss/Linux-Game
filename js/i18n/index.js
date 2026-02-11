import { fr } from './locales/fr.js';
import { en } from './locales/en.js';

const LOCALES = { fr, en };
const DEFAULT_LANGUAGE = 'en';
const LANGUAGE_STORAGE_KEY = 'linux-game-lang';

function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function interpolate(template, params = {}) {
    if (typeof template !== 'string') return template;
    return template.replace(/\{(\w+)\}/g, (match, key) => {
        return Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match;
    });
}

const FR_TO_EN_REPLACEMENTS = [
    ['Tape simplement :', 'Just type:'],
    ['Tape :', 'Type:'],
    ['Utilise la commande', 'Use the command'],
    ['Utilise un pipe', 'Use a pipe'],
    ['Utilise', 'Use'],
    ['Affiche', 'Display'],
    ['Trouve', 'Find'],
    ['Cree', 'Create'],
    ['Crée', 'Create'],
    ['Deplace-toi', 'Move to'],
    ['Déplace-toi', 'Move to'],
    ['Deplace', 'Move'],
    ['Déplace', 'Move'],
    ['Retourne', 'Go back'],
    ['Supprime', 'Delete'],
    ['Copie', 'Copy'],
    ['Renomme', 'Rename'],
    ['Ajoute', 'Add'],
    ['Compte', 'Count'],
    ['Consulte', 'Open'],
    ['Lis', 'Read'],
    ['Verifie', 'Check'],
    ['Vérifie', 'Check'],
    ['fichier', 'file'],
    ['fichiers', 'files'],
    ['dossier', 'folder'],
    ['dossiers', 'folders'],
    ['commande', 'command'],
    ['commandes', 'commands'],
    ['permissions', 'permissions'],
    ['repertoire', 'directory'],
    ['répertoire', 'directory'],
    ['caches', 'hidden'],
    ['cachés', 'hidden'],
    ['niveau', 'level'],
    ['Mission finale', 'Final mission'],
    ['lecon', 'lesson'],
    ['leçon', 'lesson'],
    ['Termine', 'Completed'],
];

function autoTranslateFrToEn(text) {
    if (typeof text !== 'string' || text.length === 0) return text;
    let translated = text;

    for (const [from, to] of FR_TO_EN_REPLACEMENTS) {
        translated = translated.replace(new RegExp(escapeRegExp(from), 'g'), to);
    }

    return translated;
}

function getByPath(obj, path) {
    if (!obj || !path) return undefined;
    return path.split('.').reduce((acc, part) => {
        if (acc === undefined || acc === null) return undefined;
        return acc[part];
    }, obj);
}

class I18nService {
    constructor() {
        this.language = DEFAULT_LANGUAGE;
        this.listeners = new Set();

        const stored = this._readStoredLanguage();
        this.setLanguage(stored || DEFAULT_LANGUAGE, false);
    }

    _readStoredLanguage() {
        try {
            return window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
        } catch (error) {
            return null;
        }
    }

    _persistLanguage(lang) {
        try {
            window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
        } catch (error) {
            // Ignore storage failures.
        }
    }

    _notify() {
        for (const listener of this.listeners) {
            try {
                listener(this.language);
            } catch (error) {
                // Ignore listener errors to avoid breaking app flow.
            }
        }
    }

    onChange(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    getLanguage() {
        return this.language;
    }

    setLanguage(lang, persist = true) {
        const normalized = LOCALES[lang] ? lang : DEFAULT_LANGUAGE;
        this.language = normalized;

        if (persist) {
            this._persistLanguage(normalized);
        }

        const htmlLang = this.t('ui.htmlLang', normalized);
        if (typeof document !== 'undefined' && document.documentElement) {
            document.documentElement.setAttribute('lang', htmlLang);
        }

        this._notify();
        return this.language;
    }

    getLocale(lang = this.language) {
        return LOCALES[lang] || LOCALES[DEFAULT_LANGUAGE];
    }

    t(key, fallback = '', params = {}) {
        const current = getByPath(this.getLocale(), key);
        const fallbackFr = getByPath(LOCALES.fr, key);
        const raw = current !== undefined ? current : (fallbackFr !== undefined ? fallbackFr : fallback);
        return interpolate(raw, params);
    }

    localizeLevels(levels) {
        const localeLevels = this.getLocale().levels || {};
        return levels.map((level) => {
            const override = localeLevels[level.id] || {};
            return {
                ...level,
                name: override.name || level.name,
                description: override.description || level.description,
            };
        });
    }

    localizeMissions(missions) {
        const locale = this.getLocale();
        const missionOverrides = locale.missions || {};
        const shouldAutoTranslate = this.language === 'en' && !!locale.autoTranslateMissions;

        return missions.map((mission) => {
            const override = missionOverrides[mission.id] || {};
            const localized = { ...mission };

            localized.title = this._localizeMissionField(mission.title, override.title, shouldAutoTranslate);
            localized.description = this._localizeMissionField(mission.description, override.description, shouldAutoTranslate);
            localized.hint = this._localizeMissionField(mission.hint, override.hint, shouldAutoTranslate);

            if (mission.lesson) {
                const lessonOverride = override.lesson || {};
                localized.lesson = {
                    ...mission.lesson,
                    title: this._localizeMissionField(mission.lesson.title, lessonOverride.title, shouldAutoTranslate),
                    content: this._localizeMissionField(mission.lesson.content, lessonOverride.content, shouldAutoTranslate),
                };
            }

            return localized;
        });
    }

    _localizeMissionField(baseValue, overrideValue, autoTranslate) {
        if (typeof overrideValue === 'string') {
            return overrideValue;
        }
        if (autoTranslate && typeof baseValue === 'string') {
            return autoTranslateFrToEn(baseValue);
        }
        return baseValue;
    }
}

export const i18n = new I18nService();
