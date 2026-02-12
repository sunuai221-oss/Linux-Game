const PASSTHROUGH_SHORT_OPTIONS = new Set(['-name', '-iname', '-type', '-mtime', '-mmin']);

export class CommandParser {

    // Parse a raw command line into structured parts
    static parse(input) {
        const trimmed = input.trim();
        if (!trimmed) return null;

        const syntaxError = CommandParser.validateSyntax(trimmed);
        if (syntaxError) {
            return { type: 'error', error: syntaxError, raw: input };
        }

        // Extract redirection first so pipelines can still redirect their final output.
        const { command: commandPart, redirect, error: redirectError } = CommandParser.extractRedirect(trimmed);
        if (redirectError) {
            return { type: 'error', error: redirectError, raw: input };
        }

        // Check for pipes
        const pipeSegments = CommandParser.splitPipes(commandPart);
        if (pipeSegments.length > 1) {
            if (pipeSegments.some(seg => seg.trim().length === 0)) {
                return { type: 'error', error: "syntax error near unexpected token '|'", raw: input };
            }
            const parsedPipe = {
                type: 'pipe',
                commands: pipeSegments.map(seg => CommandParser.parseSingle(seg.trim())),
            };
            if (redirect) parsedPipe.redirect = redirect;
            return parsedPipe;
        }

        const parsed = CommandParser.parseSingle(commandPart);
        if (redirect && parsed.type !== 'empty') parsed.redirect = redirect;

        return parsed;
    }

    static validateSyntax(input) {
        let inSingleQuote = false;
        let inDoubleQuote = false;
        let escaped = false;

        for (let i = 0; i < input.length; i++) {
            const char = input[i];

            if (escaped) {
                escaped = false;
                continue;
            }
            if (char === '\\' && !inSingleQuote) {
                escaped = true;
                continue;
            }
            if (char === "'" && !inDoubleQuote) {
                inSingleQuote = !inSingleQuote;
                continue;
            }
            if (char === '"' && !inSingleQuote) {
                inDoubleQuote = !inDoubleQuote;
                continue;
            }
        }

        if (inSingleQuote || inDoubleQuote) {
            return 'syntax error: unmatched quote';
        }
        return null;
    }

    // Parse a single command (no pipes)
    static parseSingle(input) {
        const tokens = CommandParser.tokenize(input);
        if (tokens.length === 0) return { type: 'empty' };

        const command = tokens[0];
        const rest = tokens.slice(1);

        const args = [];
        const flags = {};

        for (const token of rest) {
            if (token.startsWith('--')) {
                const flag = token.slice(2);
                const eqIndex = flag.indexOf('=');
                if (eqIndex !== -1) {
                    flags[flag.substring(0, eqIndex)] = flag.substring(eqIndex + 1);
                } else {
                    flags[flag] = true;
                }
            } else if (PASSTHROUGH_SHORT_OPTIONS.has(token)) {
                // Keep options like "-name" as positional arguments for commands such as find.
                args.push(token);
            } else if (/^-\d+$/.test(token)) {
                // Keep negative numbers as values (used by find -mtime/-mmin).
                args.push(token);
            } else if (token.startsWith('-') && token.length > 1 && !token.startsWith('-/')) {
                // Short flags: -la becomes { l: true, a: true }
                for (const char of token.slice(1)) {
                    flags[char] = true;
                }
            } else {
                args.push(token);
            }
        }

        return { type: 'command', command, args, flags, raw: input };
    }

    // Tokenize with quote handling
    static tokenize(input) {
        const tokens = [];
        let current = '';
        let inSingleQuote = false;
        let inDoubleQuote = false;
        let escaped = false;

        for (let i = 0; i < input.length; i++) {
            const char = input[i];

            if (escaped) {
                current += char;
                escaped = false;
                continue;
            }

            if (char === '\\' && !inSingleQuote) {
                escaped = true;
                continue;
            }

            if (char === "'" && !inDoubleQuote) {
                inSingleQuote = !inSingleQuote;
                continue;
            }

            if (char === '"' && !inSingleQuote) {
                inDoubleQuote = !inDoubleQuote;
                continue;
            }

            if (char === ' ' && !inSingleQuote && !inDoubleQuote) {
                if (current) {
                    tokens.push(current);
                    current = '';
                }
                continue;
            }

            current += char;
        }

        if (escaped) current += '\\';
        if (current) tokens.push(current);
        return tokens;
    }

    // Split by pipe operator (not inside quotes)
    static splitPipes(input) {
        const segments = [];
        let current = '';
        let inSingleQuote = false;
        let inDoubleQuote = false;
        let escaped = false;

        for (let i = 0; i < input.length; i++) {
            const char = input[i];

            if (escaped) {
                current += char;
                escaped = false;
                continue;
            }

            if (char === '\\' && !inSingleQuote) {
                current += char;
                escaped = true;
                continue;
            }

            if (char === "'" && !inDoubleQuote) inSingleQuote = !inSingleQuote;
            if (char === '"' && !inSingleQuote) inDoubleQuote = !inDoubleQuote;

            if (char === '|' && !inSingleQuote && !inDoubleQuote) {
                segments.push(current);
                current = '';
                continue;
            }

            current += char;
        }

        if (escaped) current += '\\';
        segments.push(current);
        return segments;
    }

    // Extract redirect operators > and >>
    static extractRedirect(input) {
        let inSingleQuote = false;
        let inDoubleQuote = false;
        let escaped = false;
        let redirectIndex = -1;
        let redirectType = 'overwrite';

        for (let i = 0; i < input.length; i++) {
            const char = input[i];

            if (escaped) {
                escaped = false;
                continue;
            }

            if (char === '\\' && !inSingleQuote) {
                escaped = true;
                continue;
            }

            if (char === "'" && !inDoubleQuote) { inSingleQuote = !inSingleQuote; continue; }
            if (char === '"' && !inSingleQuote) { inDoubleQuote = !inDoubleQuote; continue; }

            if (char === '>' && !inSingleQuote && !inDoubleQuote) {
                const append = input[i + 1] === '>';
                redirectIndex = i;
                redirectType = append ? 'append' : 'overwrite';
                if (append) i++;
            }
        }

        if (redirectIndex === -1) {
            return { command: input, redirect: null, error: null };
        }

        const fileStart = redirectType === 'append' ? redirectIndex + 2 : redirectIndex + 1;
        const file = input.slice(fileStart).trim();
        if (!file) {
            return {
                command: input,
                redirect: null,
                error: "syntax error near unexpected token `newline'",
            };
        }

        const command = input.slice(0, redirectIndex).trim();
        return {
            command,
            redirect: { type: redirectType, file },
            error: null,
        };
    }
}
