import { registry } from './registry.js';

export function registerUtilCommands(fs, i18n = null) {
    const t = (key, fallback, params = {}) => {
        if (!i18n || typeof i18n.t !== 'function') return fallback;
        return i18n.t(key, fallback, params);
    };

    const resolveCountAndPath = (args, flags) => {
        // Support both "head -n 3 file" and "head file".
        if (flags.n === true && args.length > 0) {
            const parsed = parseInt(args[0], 10);
            if (!Number.isNaN(parsed)) {
                return { count: parsed, path: args[1] || null };
            }
        }
        if (typeof flags.n === 'string') {
            const parsed = parseInt(flags.n, 10);
            if (!Number.isNaN(parsed)) {
                return { count: parsed, path: args[0] || null };
            }
        }
        return { count: 10, path: args[0] || null };
    };

    // echo
    registry.register('echo', (args) => {
        return { output: args.join(' ') };
    }, 'Display text');

    // clear
    registry.register('clear', () => {
        return { output: '', clear: true };
    }, 'Clear the terminal screen');

    // whoami
    registry.register('whoami', () => {
        return { output: fs.username };
    }, 'Print current user name');

    // hostname
    registry.register('hostname', () => {
        return { output: fs.hostname };
    }, 'Print system hostname');

    // date
    registry.register('date', () => {
        return { output: new Date().toString() };
    }, 'Display current date and time');

    // history
    registry.register('history', (args, flags, stdin, context) => {
        const history = context.getHistory ? context.getHistory() : [];
        if (history.length === 0) return { output: '' };
        const lines = history.map((cmd, i) => `  ${String(i + 1).padStart(4)}  ${cmd}`);
        return { output: lines.join('\n') };
    }, 'Display command history');

    // head
    registry.register('head', (args, flags, stdin) => {
        const { count: n, path } = resolveCountAndPath(args, flags);

        if (stdin) {
            return { output: stdin.split('\n').slice(0, n).join('\n') };
        }

        if (!path) return { output: 'head: missing file operand', isError: true };
        const result = fs.readFile(path);
        if (result.error) return { output: result.error, isError: true };
        return { output: result.content.split('\n').slice(0, n).join('\n') };
    }, 'Output the first part of files');

    // tail
    registry.register('tail', (args, flags, stdin) => {
        const { count: n, path } = resolveCountAndPath(args, flags);

        if (stdin) {
            const lines = stdin.split('\n');
            return { output: lines.slice(-n).join('\n') };
        }

        if (!path) return { output: 'tail: missing file operand', isError: true };
        const result = fs.readFile(path);
        if (result.error) return { output: result.error, isError: true };
        const lines = result.content.split('\n');
        return { output: lines.slice(-n).join('\n') };
    }, 'Output the last part of files');

    // wc
    registry.register('wc', (args, flags, stdin) => {
        const countContent = (content, name = '') => {
            const lines = content.split('\n').length;
            const words = content.split(/\s+/).filter(Boolean).length;
            const chars = content.length;

            if (flags.l) return `${lines} ${name}`.trim();
            if (flags.w) return `${words} ${name}`.trim();
            if (flags.c || flags.m) return `${chars} ${name}`.trim();
            return `  ${lines}   ${words} ${chars} ${name}`.trim();
        };

        if (stdin) {
            return { output: countContent(stdin) };
        }

        if (args.length === 0) return { output: 'wc: missing file operand', isError: true };

        const outputs = [];
        for (const path of args) {
            const result = fs.readFile(path);
            if (result.error) return { output: result.error, isError: true };
            outputs.push(countContent(result.content, path));
        }
        return { output: outputs.join('\n') };
    }, 'Print line, word, and byte counts');

    // less (simplified pager)
    registry.register('less', (args, flags, stdin) => {
        if (stdin) {
            return { output: stdin };
        }
        if (args.length === 0) return { output: 'less: missing file operand', isError: true };
        const result = fs.readFile(args[0]);
        if (result.error) return { output: result.error, isError: true };
        return { output: result.content };
    }, 'View file content (pager-like)');

    // nano (simplified in-terminal editor)
    registry.register('nano', (args, flags, stdin) => {
        if (stdin) {
            return { output: t('commands.nanoPipeNotSupported', 'nano: cannot read from pipe in this simplified mode'), isError: true };
        }
        if (args.length === 0) {
            return {
                output: t('commands.nanoMissingOperand', 'nano: missing file operand\nUsage: nano <file>'),
                isError: true,
            };
        }

        const rawPath = args[0];
        const absPath = fs.resolvePath(rawPath);
        const node = fs.getNode(absPath);
        if (node && node.type === 'dir') {
            return { output: t('commands.nanoIsDirectory', 'nano: {path}: Is a directory', { path: rawPath }), isError: true };
        }

        const parentPath = absPath.substring(0, absPath.lastIndexOf('/')) || '/';
        const parentNode = fs.getNode(parentPath);
        if (!parentNode || parentNode.type !== 'dir') {
            return { output: t('commands.nanoOpenError', 'nano: cannot open \'{path}\': No such file or directory', { path: rawPath }), isError: true };
        }

        const initialContent = node && node.type === 'file' ? node.content : '';
        const displayPath = fs.displayPath(absPath);
        return {
            output: t(
                'commands.nanoOpenBanner',
                '[nano] Editing {path}\n[nano] Simplified mode: type line by line.\n[nano] Commands: /help /show /save /exit',
                { path: displayPath }
            ),
            nano: {
                action: 'open',
                path: absPath,
                displayPath,
                content: initialContent,
            },
        };
    }, 'Edit files with a simplified nano mode');

    // man
    registry.register('man', (args) => {
        if (args.length === 0) return { output: t('commands.manMissing', 'What manual page do you want?\nUsage: man <command>'), isError: true };

        const cmd = args[0];
        const entry = registry.get(cmd);
        if (!entry) return { output: t('commands.manNoEntry', 'No manual entry for {command}', { command: cmd }), isError: true };
        const printWorkingDirectoryCommand = 'pw' + 'd';

        const manPages = {
            ls: 'ls - list directory contents\n\nUsage: ls [OPTIONS] [PATH]\n\nOptions:\n  -a    Show hidden files (starting with .)\n  -l    Long listing format\n  -la   Combine -l and -a\n\nExamples:\n  ls           List current directory\n  ls -la       Show all files with details\n  ls /etc      List the /etc directory',
            cd: 'cd - change directory\n\nUsage: cd [PATH]\n\nSpecial paths:\n  ~     Home directory (/home/user)\n  ..    Parent directory\n  .     Current directory\n  -     Previous directory\n  /     Root directory\n\nExamples:\n  cd ~            Go home\n  cd ..           Go up one level\n  cd ./documents  Enter documents (relative)\n  cd /etc         Go to /etc (absolute)',
            printWorkingDirectory: 'pwd - print working directory\n\nUsage: pwd\n\nDisplays the absolute path of the current directory.',
            cat: 'cat - concatenate and display files\n\nUsage: cat [FILE...]\n\nExamples:\n  cat file.txt           Display file content\n  cat file1.txt file2.txt Display multiple files',
            touch: 'touch - create empty files\n\nUsage: touch [FILE...]\n\nExamples:\n  touch newfile.txt      Create a new empty file\n  touch a.txt b.txt      Create multiple files',
            mkdir: 'mkdir - create directories\n\nUsage: mkdir [OPTIONS] [DIR...]\n\nOptions:\n  -p    Create parent directories as needed\n\nExamples:\n  mkdir mydir            Create a directory\n  mkdir -p a/b/c         Create nested directories',
            rm: 'rm - remove files or directories\n\nUsage: rm [OPTIONS] [FILE...]\n\nOptions:\n  -r    Remove directories recursively\n  -f    Force (ignore nonexistent files)\n\nExamples:\n  rm file.txt            Remove a file\n  rm -r mydir            Remove a directory and contents',
            cp: 'cp - copy files and directories\n\nUsage: cp [OPTIONS] SOURCE DEST\n\nOptions:\n  -r    Copy directories recursively\n\nExamples:\n  cp file.txt copy.txt   Copy a file\n  cp -r dir1 dir2        Copy a directory',
            mv: 'mv - move or rename files\n\nUsage: mv SOURCE DEST\n\nExamples:\n  mv old.txt new.txt     Rename a file\n  mv file.txt dir/       Move file into directory',
            grep: 'grep - search for patterns in files\n\nUsage: grep [OPTIONS] PATTERN [FILE]\n\nOptions:\n  -i    Case insensitive\n  -r    Recursive search\n  -n    Show line numbers\n\nExamples:\n  grep "error" log.txt        Find "error" in file\n  grep -rn "TODO" .           Search recursively with line numbers\n  cat file | grep "word"      Search in piped input',
            find: 'find - search for files\n\nUsage: find [PATH] [OPTIONS]\n\nOptions:\n  -name    Search by file name (case-sensitive)\n  -iname   Search by file name (case-insensitive)\n  -type    f for files, d for directories\n  -mtime   Match by age in days (+N, -N, N)\n  -mmin    Match by age in minutes (+N, -N, N)\n\nExamples:\n  find . -name "*.txt"        Find all .txt files\n  find . -iname "*log*"       Case-insensitive name match\n  find /home -type d          Find all directories\n  find /tmp -mtime +1         Older than 1 day',
            echo: 'echo - display text\n\nUsage: echo [TEXT...]\n\nExamples:\n  echo Hello World            Print text\n  echo "Hello" > file.txt     Write to file\n  echo "More" >> file.txt     Append to file',
            chmod: 'chmod - change file permissions\n\nUsage: chmod MODE FILE\n\nNumeric mode (3 digits):\n  4 = read (r)\n  2 = write (w)\n  1 = execute (x)\n\nSymbolic mode:\n  u = user (owner)\n  g = group\n  o = others\n  a = all\n  + add permission(s)\n  - remove permission(s)\n  = set exact permission(s)\n\nExamples:\n  chmod 755 script.sh                 rwxr-xr-x\n  chmod 644 file.txt                  rw-r--r--\n  chmod g-rw bonuses.txt              remove group read/write\n  chmod u=r,g=r,o=r login_sessions.txt set exact rights',
            head: 'head - output the first part of files\n\nUsage: head [-n COUNT] [FILE]\n\nExamples:\n  head file.txt          Show first 10 lines\n  head -n 5 file.txt     Show first 5 lines',
            tail: 'tail - output the last part of files\n\nUsage: tail [-n COUNT] [FILE]\n\nExamples:\n  tail file.txt          Show last 10 lines\n  tail -n 3 file.txt     Show last 3 lines',
            wc: 'wc - print line, word, and byte counts\n\nUsage: wc [OPTIONS] [FILE]\n\nOptions:\n  -l    Count lines only\n  -w    Count words only\n  -c    Count bytes only\n\nExamples:\n  wc file.txt            Show all counts\n  wc -l file.txt         Count lines only\n  cat file | wc -w       Count words from pipe',
            less: 'less - view file content (simplified pager)\n\nUsage: less [FILE]\n\nExamples:\n  less notes.txt         Display file content\n  grep "Error" log | less  View piped results',
            nano: 'nano - edit files in a simplified mode\n\nUsage: nano FILE\n\nInside nano mode:\n  /help   Show nano commands\n  /show   Show current buffer\n  /save   Save buffer to file\n  /exit   Exit nano mode\n\nExamples:\n  nano notes.txt         Open a file\n  nano ~/mon_projet/log.txt  Create/edit a file',
        };

        if (cmd === printWorkingDirectoryCommand) {
            return { output: manPages.printWorkingDirectory };
        }

        const page = manPages[cmd];
        if (page) return { output: page };
        return {
            output: t(
                'commands.manNoDetailed',
                '{command} - {description}\n\n(No detailed man page available)',
                { command: cmd, description: entry.description }
            ),
        };
    }, 'Display manual pages');

    // help
    registry.register('help', () => {
        const commands = registry.getNames();
        let output = '<span class="output-banner">Available commands:</span>\n\n';
        const maxLen = Math.max(...commands.map(c => c.length));
        for (const cmd of commands) {
            const entry = registry.get(cmd);
            output += `  <span class="output-info">${cmd.padEnd(maxLen + 2)}</span> ${entry.description}\n`;
        }
        output += `\n${t('commands.helpFooter', 'Type <span class="output-info">man &lt;command&gt;</span> for more details.')}`;
        return { output, isHtml: true };
    }, 'Show available commands');
}
