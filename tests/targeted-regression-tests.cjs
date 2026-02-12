const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function stripModuleSyntax(code) {
    return code
        .replace(/^\s*import\s+[^;]+;\s*$/gm, '')
        .replace(/export class /g, 'class ')
        .replace(/export const /g, 'const ')
        .replace(/export function /g, 'function ')
        .replace(/export \{[^}]+\};?/g, '');
}

function loadExports(filePath, exportNames, injected = {}) {
    const absolutePath = path.resolve(filePath);
    const rawCode = fs.readFileSync(absolutePath, 'utf8');
    const code = stripModuleSyntax(rawCode);

    const sandbox = {
        console,
        ...injected,
    };
    vm.createContext(sandbox);

    const exportObject = exportNames
        .map((name) => `'${name}': (typeof ${name} !== 'undefined' ? ${name} : undefined)`)
        .join(', ');

    vm.runInContext(`${code}\nthis.__exports = { ${exportObject} };`, sandbox, { filename: absolutePath });
    return { exports: sandbox.__exports, sandbox };
}

const { exports: fsExports } = loadExports('js/filesystem/FileSystem.js', ['FileSystem']);
const { exports: defaultExports } = loadExports('js/filesystem/defaultStructure.js', ['defaultStructure']);
const { exports: registryExports } = loadExports('js/commands/registry.js', ['registry']);
const { exports: navExports } = loadExports('js/commands/navigation.js', ['registerNavigationCommands'], {
    registry: registryExports.registry,
});
const { exports: searchExports } = loadExports('js/commands/search.js', ['registerSearchCommands'], {
    registry: registryExports.registry,
});
const { exports: utilExports } = loadExports('js/commands/utils.js', ['registerUtilCommands'], {
    registry: registryExports.registry,
});
const { exports: parserExports } = loadExports('js/commands/CommandParser.js', ['CommandParser']);
const { exports: fileExports } = loadExports('js/commands/files.js', ['registerFileCommands'], {
    registry: registryExports.registry,
    CommandParser: parserExports.CommandParser,
});
const { exports: levelsExports } = loadExports('js/missions/levels.js', ['missions']);
const { exports: missionSystemExports } = loadExports('js/missions/MissionSystem.js', ['MissionSystem']);
const { exports: autocompleteExports } = loadExports('js/terminal/autocomplete.js', ['Autocomplete']);

const { FileSystem } = fsExports;
const { defaultStructure } = defaultExports;
const { registry } = registryExports;
const { registerNavigationCommands } = navExports;
const { registerSearchCommands } = searchExports;
const { registerUtilCommands } = utilExports;
const { registerFileCommands } = fileExports;
const { CommandParser } = parserExports;
const { missions } = levelsExports;
const { MissionSystem } = missionSystemExports;
const { Autocomplete } = autocompleteExports;

const tests = [];

function test(name, fn) {
    tests.push({ name, fn });
}

function run() {
    let failed = 0;
    for (const t of tests) {
        try {
            t.fn();
            console.log(`PASS ${t.name}`);
        } catch (error) {
            failed++;
            console.error(`FAIL ${t.name}`);
            console.error(error.stack || error.message || error);
        }
    }

    if (failed > 0) {
        console.error(`\n${failed} test(s) failed.`);
        process.exit(1);
    }

    console.log(`\n${tests.length} tests passed.`);
}

test('mission catalog is significantly expanded and balanced across levels', () => {
    assert.ok(Array.isArray(missions));
    assert.ok(missions.length >= 75);

    const countsByLevel = new Map();
    for (const mission of missions) {
        countsByLevel.set(mission.level, (countsByLevel.get(mission.level) || 0) + 1);
    }

    for (const level of [1, 2, 3, 4, 5]) {
        assert.ok((countsByLevel.get(level) || 0) >= 15, `Level ${level} should have at least 15 missions`);
    }
});

test('mission ids are unique', () => {
    const ids = missions.map((mission) => mission.id);
    const unique = new Set(ids);
    assert.strictEqual(unique.size, ids.length);
});

test('fs.move prevents moving a directory into its own descendant', () => {
    const vfs = new FileSystem(defaultStructure);
    const result = vfs.move('/home', '/home/user');

    assert.ok(result.error);
    assert.ok(result.error.includes('Cannot move a directory into itself'));
    assert.ok(vfs.getNode('/home'));
    assert.ok(vfs.getNode('/home/user'));
});

test('fs.move to same directory is a no-op and does not delete files', () => {
    const vfs = new FileSystem(defaultStructure);
    const before = vfs.readFile('/home/user/.bashrc').content;

    const result = vfs.move('/home/user/.bashrc', '/home/user');

    assert.ok(result.success);
    const after = vfs.readFile('/home/user/.bashrc').content;
    assert.strictEqual(after, before);
});

test('fs.move with trailing slash requires an existing directory destination', () => {
    const vfs = new FileSystem(defaultStructure);
    vfs.cd('telechargements');

    const result = vfs.move('readme.md', 'documents/');

    assert.ok(result.error);
    assert.ok(result.error.includes('Not a directory'));
    assert.ok(vfs.getNode('/home/user/telechargements/readme.md'));
    assert.strictEqual(vfs.getNode('/home/user/telechargements/documents'), null);
});

test('fs.move from telechargements to ../documents works with relative parent path', () => {
    const vfs = new FileSystem(defaultStructure);
    vfs.cd('telechargements');

    const result = vfs.move('readme.md', '../documents/');

    assert.ok(result.success);
    assert.ok(vfs.getNode('/home/user/documents/readme.md'));
    assert.strictEqual(vfs.getNode('/home/user/telechargements/readme.md'), null);
});

test('ls escapes user-controlled file names in HTML output', () => {
    const vfs = new FileSystem(defaultStructure);
    vfs.createFile('/home/user/<img src=x onerror=1>.txt', 'x');
    registerNavigationCommands(vfs);

    const lsHandler = registry.get('ls').handler;
    const result = lsHandler([], {}, null, {});

    assert.ok(result.isHtml);
    assert.ok(result.output.includes('&lt;img src=x onerror=1&gt;.txt'));
    assert.ok(!result.output.includes('<img src=x onerror=1>'));
});

test('grep escapes matching content and recursive file paths in HTML output', () => {
    const vfs = new FileSystem(defaultStructure);
    vfs.createDir('/home/user/evil<script>', false);
    vfs.createFile('/home/user/evil<script>/note.txt', '<img src=x onerror=1>');
    registerSearchCommands(vfs);

    const grepHandler = registry.get('grep').handler;
    const contentResult = grepHandler(['img', '/home/user/evil<script>/note.txt'], {}, null, {});
    const recursiveResult = grepHandler(['img', '/home/user'], { r: true }, null, {});

    assert.ok(contentResult.isHtml);
    assert.ok(contentResult.output.includes('&lt;img src=x onerror=1&gt;'));
    assert.ok(!contentResult.output.includes('<img src=x onerror=1>'));

    assert.ok(recursiveResult.isHtml);
    assert.ok(recursiveResult.output.includes('evil&lt;script&gt;'));
    assert.ok(!recursiveResult.output.includes('evil<script>'));
});

test('MissionSystem.onCommand ignores failed commands', () => {
    let completionCount = 0;
    const mock = {
        freeMode: false,
        commandHistory: [],
        missions: [{ id: 'm1', validate: () => true }],
        currentMissionIndex: 0,
        completed: new Set(),
        _completeMission: () => { completionCount += 1; },
    };

    MissionSystem.prototype.onCommand.call(
        mock,
        'cat /missing/file',
        { type: 'command', command: 'cat', args: ['/missing/file'], flags: {} },
        { output: 'cat: /missing/file: No such file or directory', isError: true }
    );

    assert.strictEqual(completionCount, 0);
    assert.strictEqual(mock.commandHistory.length, 0);
});

test('MissionSystem.onCommand can process failed commands when mission accepts errors', () => {
    let completionCount = 0;
    const mock = {
        freeMode: false,
        commandHistory: [],
        missions: [{
            id: 'm-err',
            acceptErrorResult: true,
            validate: () => true,
        }],
        currentMissionIndex: 0,
        completed: new Set(),
        _completeMission: () => { completionCount += 1; },
    };

    MissionSystem.prototype.onCommand.call(
        mock,
        'cat /forbidden',
        { type: 'command', command: 'cat', args: ['/forbidden'], flags: {} },
        { output: 'cat: /forbidden: Permission denied', isError: true }
    );

    assert.strictEqual(completionCount, 1);
    assert.strictEqual(mock.commandHistory.length, 1);
});

test('cat mission now requires successful output for the expected file', () => {
    const vfs = new FileSystem(defaultStructure);
    const catMission = missions.find((mission) => mission.id === 'cat-1');
    assert.ok(catMission);

    const parsed = {
        type: 'command',
        command: 'cat',
        args: ['documents/notes.txt'],
        flags: {},
    };

    const failedValidation = catMission.validate(
        vfs,
        [],
        'cat documents/notes.txt',
        { output: '', isError: false },
        parsed
    );

    const successValidation = catMission.validate(
        vfs,
        [],
        'cat documents/notes.txt',
        { output: vfs.readFile('/home/user/documents/notes.txt').content, isError: false },
        parsed
    );

    assert.strictEqual(failedValidation, false);
    assert.strictEqual(successValidation, true);
});

test('grep mission now requires an actual "Error" match in /var/log/system.log', () => {
    const vfs = new FileSystem(defaultStructure);
    const grepMission = missions.find((mission) => mission.id === 'grep-1');
    assert.ok(grepMission);

    const parsed = {
        type: 'command',
        command: 'grep',
        args: ['Error', '/var/log/system.log'],
        flags: {},
    };

    const failedValidation = grepMission.validate(
        vfs,
        [],
        'grep Error /var/log/system.log',
        { output: '', isError: false },
        parsed
    );

    const successValidation = grepMission.validate(
        vfs,
        [],
        'grep Error /var/log/system.log',
        { output: '[2024-01-15 11:22:33] Error: connection timeout to remote server', isError: false },
        parsed
    );

    assert.strictEqual(failedValidation, false);
    assert.strictEqual(successValidation, true);
});

test('parser + find support "find -name \\"*.txt\\"" without explicit start path', () => {
    const vfs = new FileSystem(defaultStructure);
    registerSearchCommands(vfs);

    const parsed = CommandParser.parse('find -name "*.txt"');
    const findHandler = registry.get('find').handler;
    const result = findHandler(parsed.args, parsed.flags, null, {});

    assert.ok(parsed.args.includes('-name'));
    assert.ok(result.output);
    const lines = result.output.split('\n').filter(Boolean);
    assert.ok(lines.length > 0);
    assert.ok(lines.every((line) => line.endsWith('.txt')));
});

test('parser keeps -iname/-mtime/-mmin options and numeric values', () => {
    const parsed = CommandParser.parse('find ~ -iname "*NOTE*" -mtime -3 -mmin +10');
    assert.ok(parsed);
    assert.strictEqual(parsed.command, 'find');
    assert.ok(parsed.args.includes('-iname'));
    assert.ok(parsed.args.includes('*NOTE*'));
    assert.ok(parsed.args.includes('-mtime'));
    assert.ok(parsed.args.includes('-3'));
    assert.ok(parsed.args.includes('-mmin'));
    assert.ok(parsed.args.includes('+10'));
});

test('find supports case-insensitive name matching via -iname', () => {
    const vfs = new FileSystem(defaultStructure);
    registerSearchCommands(vfs);

    const parsed = CommandParser.parse('find ~ -iname "*NOTE*"');
    const findHandler = registry.get('find').handler;
    const result = findHandler(parsed.args, parsed.flags, null, {});

    assert.ok(result.output.includes('/home/user/documents/notes.txt'));
});

test('find supports -mtime using defaultStructure timestamps', () => {
    const vfs = new FileSystem(defaultStructure);
    registerSearchCommands(vfs);

    const parsed = CommandParser.parse('find ~/telechargements -mtime +7');
    const findHandler = registry.get('find').handler;
    const result = findHandler(parsed.args, parsed.flags, null, {});

    assert.ok(result.output.includes('/home/user/telechargements/archive.zip'));
});

test('find supports -mmin for recently modified files', () => {
    const vfs = new FileSystem(defaultStructure);
    registerSearchCommands(vfs);

    vfs.createDir('/home/user/mon_projet', true);
    vfs.createFile('/home/user/mon_projet/mmin_test.log', 'x');
    const parsed = CommandParser.parse('find ~ -mmin -2 -name "*mmin_test*"');
    const findHandler = registry.get('find').handler;
    const result = findHandler(parsed.args, parsed.flags, null, {});

    assert.ok(result.output.includes('/home/user/mon_projet/mmin_test.log'));
});

test('head -n 3 reads exactly 3 lines', () => {
    const vfs = new FileSystem(defaultStructure);
    registerUtilCommands(vfs);

    const parsed = CommandParser.parse('head -n 3 /var/log/system.log');
    const headHandler = registry.get('head').handler;
    const result = headHandler(parsed.args, parsed.flags, null, {});

    assert.ok(result.output);
    assert.strictEqual(result.output.split('\n').length, 3);
});

test('less command reads files and supports piped input', () => {
    const vfs = new FileSystem(defaultStructure);
    registerUtilCommands(vfs);

    const lessHandler = registry.get('less').handler;
    const fileResult = lessHandler(['/home/user/documents/notes.txt'], {}, null, {});
    const pipeResult = lessHandler([], {}, 'line-a\nline-b', {});

    assert.ok(typeof fileResult.output === 'string' && fileResult.output.includes('Linux Game'));
    assert.strictEqual(pipeResult.output, 'line-a\nline-b');
});

test('nano command opens simplified editor metadata on files', () => {
    const vfs = new FileSystem(defaultStructure);
    registerUtilCommands(vfs);

    const nanoHandler = registry.get('nano').handler;
    const result = nanoHandler(['documents/notes.txt'], {}, null, {});

    assert.ok(result);
    assert.ok(result.nano);
    assert.strictEqual(result.nano.action, 'open');
    assert.strictEqual(result.nano.path, '/home/user/documents/notes.txt');
    assert.ok(typeof result.nano.content === 'string' && result.nano.content.includes('Linux Game'));
});

test('nano command rejects directory targets', () => {
    const vfs = new FileSystem(defaultStructure);
    registerUtilCommands(vfs);

    const nanoHandler = registry.get('nano').handler;
    const result = nanoHandler(['documents'], {}, null, {});

    assert.ok(result.isError);
    assert.ok(result.output.includes('Is a directory'));
});

test('man nano documents simplified nano controls', () => {
    const vfs = new FileSystem(defaultStructure);
    registerUtilCommands(vfs);

    const manHandler = registry.get('man').handler;
    const result = manHandler(['nano'], {}, null, {});

    assert.ok(typeof result.output === 'string');
    assert.ok(result.output.includes('nano - edit files in a simplified mode'));
    assert.ok(result.output.includes('/save'));
    assert.ok(result.output.includes('/exit'));
});

test('whatis returns one-line description for an existing command', () => {
    const vfs = new FileSystem(defaultStructure);
    registerSearchCommands(vfs);
    registerUtilCommands(vfs);

    const whatisHandler = registry.get('whatis').handler;
    const result = whatisHandler(['grep'], {}, null, {});

    assert.ok(typeof result.output === 'string');
    assert.ok(result.output.includes('grep - Search for patterns in files'));
});

test('apropos finds permission-related commands from keyword search', () => {
    const vfs = new FileSystem(defaultStructure);
    registerFileCommands(vfs);
    registerUtilCommands(vfs);

    const aproposHandler = registry.get('apropos').handler;
    const result = aproposHandler(['permission'], {}, null, {});

    assert.ok(typeof result.output === 'string');
    assert.ok(result.output.includes('chmod - Change file permissions'));
});

test('manual pages exist for whatis and apropos', () => {
    const vfs = new FileSystem(defaultStructure);
    registerUtilCommands(vfs);

    const manHandler = registry.get('man').handler;
    const whatisPage = manHandler(['whatis'], {}, null, {});
    const aproposPage = manHandler(['apropos'], {}, null, {});

    assert.ok(typeof whatisPage.output === 'string' && whatisPage.output.includes('whatis - display one-line manual page descriptions'));
    assert.ok(typeof aproposPage.output === 'string' && aproposPage.output.includes('apropos - search command descriptions by keyword'));
});

test('question missions for whatis/man/apropos are present in level 2', () => {
    const expected = [
        ['whatis-grep-2', 2],
        ['man-grep-2', 2],
        ['apropos-permissions-2', 2],
    ];

    for (const [id, level] of expected) {
        const mission = missions.find((m) => m.id === id);
        assert.ok(mission, `Missing mission ${id}`);
        assert.strictEqual(mission.level, level);
    }
});

test('nano missions are present across all 5 levels', () => {
    const expected = [
        ['nano-open-exit-1', 1],
        ['nano-write-message-2', 2],
        ['nano-update-worknote-3', 3],
        ['nano-note-report-4', 4],
        ['nano-create-script-5', 5],
    ];

    for (const [id, level] of expected) {
        const mission = missions.find((m) => m.id === id);
        assert.ok(mission, `Missing mission ${id}`);
        assert.strictEqual(mission.level, level);
    }
});

test('chmod supports symbolic modes (+, -, =) and applies expected permissions', () => {
    const vfs = new FileSystem(defaultStructure);

    assert.strictEqual(vfs.getNode('/home/user/documents/bonuses.txt').permissions, 'rw-rw----');

    const removeGroup = vfs.chmod('/home/user/documents/bonuses.txt', 'g-rw');
    assert.ok(removeGroup.success);
    assert.strictEqual(vfs.getNode('/home/user/documents/bonuses.txt').permissions, 'rw-------');

    const setAllRead = vfs.chmod('/home/user/documents/bonuses.txt', 'u=r,g=r,o=r');
    assert.ok(setAllRead.success);
    assert.strictEqual(vfs.getNode('/home/user/documents/bonuses.txt').permissions, 'r--r--r--');

    const addWriteExecOwner = vfs.chmod('/home/user/documents/bonuses.txt', 'u+wx');
    assert.ok(addWriteExecOwner.success);
    assert.strictEqual(vfs.getNode('/home/user/documents/bonuses.txt').permissions, 'rwxr--r--');
});

test('chmod symbolic mode rejects invalid expressions', () => {
    const vfs = new FileSystem(defaultStructure);
    const result = vfs.chmod('/home/user/documents/bonuses.txt', 'g?rw');
    assert.ok(result.error);
    assert.ok(result.error.includes('invalid mode'));
});

test('chmod enforces ownership (non-owner cannot chmod root-owned files)', () => {
    const vfs = new FileSystem(defaultStructure);
    const result = vfs.chmod('/etc/passwd', '644');
    assert.ok(result.error);
    assert.ok(result.error.includes('Operation not permitted'));
});

test('permission enforcement blocks unauthorized write operations', () => {
    const vfs = new FileSystem(defaultStructure);

    const writeRootFile = vfs.writeFile('/etc/passwd', 'hacked');
    assert.ok(writeRootFile.error);
    assert.ok(writeRootFile.error.includes('Permission denied'));

    const createInEtc = vfs.createFile('/etc/new.conf');
    assert.ok(createInEtc.error);
    assert.ok(createInEtc.error.includes('Permission denied'));
});

test('permission enforcement blocks reading file without read bit', () => {
    const vfs = new FileSystem(defaultStructure);
    vfs.createDir('/home/user/mon_projet', true);
    vfs.createFile('/home/user/mon_projet/private.txt', 'secret');

    const chmodResult = vfs.chmod('/home/user/mon_projet/private.txt', '000');
    assert.ok(chmodResult.success);

    const readResult = vfs.readFile('/home/user/mon_projet/private.txt');
    assert.ok(readResult.error);
    assert.ok(readResult.error.includes('Permission denied'));
});

test('new files and directories inherit current user ownership metadata', () => {
    const vfs = new FileSystem(defaultStructure);
    vfs.username = 'root';
    vfs._syncCurrentUserGroups();

    const fileResult = vfs.createFile('/tmp/root-owned.txt', 'x');
    assert.ok(fileResult.success);
    const fileNode = vfs.getNode('/tmp/root-owned.txt');
    assert.strictEqual(fileNode.owner, 'root');
    assert.strictEqual(fileNode.group, 'root');

    const dirResult = vfs.createDir('/tmp/root-owned-dir', false);
    assert.ok(dirResult.success);
    const dirNode = vfs.getNode('/tmp/root-owned-dir');
    assert.strictEqual(dirNode.owner, 'root');
    assert.strictEqual(dirNode.group, 'root');
});

test('least privilege mission is present and validates symbolic chmod outcome', () => {
    const mission = missions.find((m) => m.id === 'least-privilege-bonuses-1');
    assert.ok(mission);
    assert.strictEqual(mission.level, 5);

    const vfs = new FileSystem(defaultStructure);
    const parsed = CommandParser.parse('chmod g-rw documents/bonuses.txt');
    const chmodResult = vfs.chmod(parsed.args[1], parsed.args[0]);
    assert.ok(chmodResult.success);

    const completed = mission.validate(
        vfs,
        [],
        'chmod g-rw documents/bonuses.txt',
        { output: '', isError: false },
        parsed
    );
    assert.strictEqual(completed, true);
});

test('user admin commands require sudo and sudo allowlist is enforced', () => {
    const vfs = new FileSystem(defaultStructure);
    registerFileCommands(vfs);

    const useraddHandler = registry.get('useradd').handler;
    const sudoHandler = registry.get('sudo').handler;

    const direct = useraddHandler(['alice'], {}, null, {});
    assert.ok(direct.isError);
    assert.ok(direct.output.includes('permission denied'));

    const blocked = sudoHandler(['rm', '-rf', '/'], {}, null, {});
    assert.ok(blocked.isError);
    assert.ok(blocked.output.includes('blocked'));
});

test('sudo useradd/usermod/userdel lifecycle updates users and home directory', () => {
    const vfs = new FileSystem(defaultStructure);
    registerFileCommands(vfs);
    const sudo = registry.get('sudo').handler;

    let result = sudo(['useradd', '-G', 'security,admin', 'analyst1'], {}, null, {});
    assert.ok(!result.isError);
    assert.ok(vfs.getUser('analyst1'));
    assert.ok(vfs.getNode('/home/analyst1'));

    result = sudo(['usermod', '-a', '-G', 'marketing', 'analyst1'], {}, null, {});
    assert.ok(!result.isError);
    assert.ok(vfs.getUser('analyst1').supplementalGroups.has('marketing'));

    result = sudo(['userdel', '-r', 'analyst1'], {}, null, {});
    assert.ok(!result.isError);
    assert.strictEqual(vfs.getUser('analyst1'), null);
    assert.strictEqual(vfs.getNode('/home/analyst1'), null);
});

test('sudo chown changes owner and group on target file', () => {
    const vfs = new FileSystem(defaultStructure);
    registerFileCommands(vfs);
    const sudo = registry.get('sudo').handler;

    let result = sudo(['useradd', 'ops1'], {}, null, {});
    assert.ok(!result.isError);

    result = sudo(['chown', 'ops1:security', '/home/user/documents/notes.txt'], {}, null, {});
    assert.ok(!result.isError);

    const node = vfs.getNode('/home/user/documents/notes.txt');
    assert.strictEqual(node.owner, 'ops1');
    assert.strictEqual(node.group, 'security');
});

test('sudo/account management missions are present in level 5', () => {
    const expected = [
        'sudo-useradd-analyst-1',
        'sudo-usermod-marketing-1',
        'sudo-chown-rapport-copy-1',
        'sudo-useradd-tempops-1',
        'sudo-userdel-tempops-1',
    ];

    for (const id of expected) {
        const mission = missions.find((m) => m.id === id);
        assert.ok(mission, `Missing mission ${id}`);
        assert.strictEqual(mission.level, 5);
    }
});

test('parser supports redirect on piped commands while preserving quoted pipes', () => {
    const parsed = CommandParser.parse('echo "a | b" | grep a > /tmp/out.txt');
    assert.ok(parsed);
    assert.strictEqual(parsed.type, 'pipe');
    assert.strictEqual(parsed.commands.length, 2);
    assert.ok(parsed.redirect);
    assert.strictEqual(parsed.redirect.type, 'overwrite');
    assert.strictEqual(parsed.redirect.file, '/tmp/out.txt');
    assert.strictEqual(parsed.commands[0].args[0], 'a | b');
});

test('parser ignores escaped pipe and redirect operators', () => {
    const escapedPipe = CommandParser.parse('echo a\\|b');
    assert.ok(escapedPipe);
    assert.strictEqual(escapedPipe.type, 'command');
    assert.strictEqual(escapedPipe.args.length, 1);
    assert.strictEqual(escapedPipe.args[0], 'a|b');

    const escapedRedirect = CommandParser.parse('echo a\\>b');
    assert.ok(escapedRedirect);
    assert.strictEqual(escapedRedirect.type, 'command');
    assert.ok(!escapedRedirect.redirect);
    assert.strictEqual(escapedRedirect.args.length, 1);
    assert.strictEqual(escapedRedirect.args[0], 'a>b');
});

test('write path normalization blocks unsafe characters and keeps valid dotted names', () => {
    const vfs = new FileSystem(defaultStructure);

    assert.strictEqual(vfs.normalizeWritePath('/home/user/documents/bad<script>.txt'), null);
    assert.strictEqual(vfs.normalizeWritePath('/home/user/documents/../secrets.txt'), null);
    assert.strictEqual(vfs.normalizeWritePath('/home/user/documents/file..txt'), '/home/user/documents/file..txt');

    const blocked = vfs.writeFile('/home/user/documents/bad<script>.txt', 'x');
    assert.ok(blocked.error);
    assert.ok(blocked.error.includes('Invalid path'));
});

test('filesystem restore rejects malformed snapshots without corrupting current state', () => {
    const vfs = new FileSystem(defaultStructure);
    const before = vfs.readFile('/home/user/documents/notes.txt').content;

    const result = vfs.restore({ cwd: '/home/user' });

    assert.ok(result.error);
    const after = vfs.readFile('/home/user/documents/notes.txt').content;
    assert.strictEqual(after, before);
});

test('grep reports invalid regular expressions as command errors', () => {
    const vfs = new FileSystem(defaultStructure);
    registerSearchCommands(vfs);

    const grepHandler = registry.get('grep').handler;
    const result = grepHandler(['[abc', '/home/user/documents/notes.txt'], {}, null, {});

    assert.ok(result.isError);
    assert.ok(result.output.includes('invalid regular expression'));
});

test('grep enforces read permissions on target files', () => {
    const vfs = new FileSystem(defaultStructure);
    vfs.createFile('/home/user/documents/private-grep.txt', 'secret');
    const chmodResult = vfs.chmod('/home/user/documents/private-grep.txt', '000');
    assert.ok(chmodResult.success);
    registerSearchCommands(vfs);

    const grepHandler = registry.get('grep').handler;
    const result = grepHandler(['secret', '/home/user/documents/private-grep.txt'], {}, null, {});

    assert.ok(result.isError);
    assert.ok(result.output.includes('Permission denied'));
});

test('find does not traverse directories without read/execute permissions', () => {
    const vfs = new FileSystem(defaultStructure);
    vfs.createDir('/home/user/secret_zone', false);
    vfs.createFile('/home/user/secret_zone/token.txt', 'token');
    const chmodResult = vfs.chmod('/home/user/secret_zone', '000');
    assert.ok(chmodResult.success);
    registerSearchCommands(vfs);

    const parsed = CommandParser.parse('find ~ -name "token.txt"');
    const findHandler = registry.get('find').handler;
    const result = findHandler(parsed.args, parsed.flags, null, {});

    assert.ok(!result.output || !result.output.includes('/home/user/secret_zone/token.txt'));
});

test('storage.save writes versioned payload and storage.load preserves backward compatibility', () => {
    const fakeLocalStorage = (() => {
        const store = new Map();
        return {
            setItem(key, value) { store.set(key, String(value)); },
            getItem(key) { return store.has(key) ? store.get(key) : null; },
            removeItem(key) { store.delete(key); },
        };
    })();

    const { exports: storageExports } = loadExports('js/missions/storage.js', ['storage'], {
        localStorage: fakeLocalStorage,
    });
    const { storage } = storageExports;

    const payload = { score: 42, completed: ['m1'] };
    storage.save(payload);
    const rawSaved = JSON.parse(fakeLocalStorage.getItem('linux-game-save'));
    assert.strictEqual(rawSaved.version, 1);
    assert.strictEqual(JSON.stringify(storage.load()), JSON.stringify(payload));

    fakeLocalStorage.setItem('linux-game-save', JSON.stringify({ score: 7, completed: ['legacy'] }));
    const legacyLoaded = storage.load();
    assert.strictEqual(JSON.stringify(legacyLoaded), JSON.stringify({ score: 7, completed: ['legacy'] }));
});

test('autocomplete hides entries when current user cannot list the directory', () => {
    const vfs = new FileSystem(defaultStructure);
    vfs.createDir('/home/user/locked', false);
    vfs.createFile('/home/user/locked/secret.txt', 'x');
    vfs.chmod('/home/user/locked', '000');

    const autocomplete = new Autocomplete(vfs, registry);
    const result = autocomplete.complete('cat /home/user/locked/s');

    assert.strictEqual(result.completed, null);
    assert.strictEqual(result.options.length, 0);
});

test('parser returns syntax errors for unmatched quote and missing redirect target', () => {
    const unmatched = CommandParser.parse('echo "hello');
    assert.ok(unmatched);
    assert.strictEqual(unmatched.type, 'error');
    assert.ok(unmatched.error.includes('unmatched quote'));

    const missingRedirectTarget = CommandParser.parse('echo hello >');
    assert.ok(missingRedirectTarget);
    assert.strictEqual(missingRedirectTarget.type, 'error');
    assert.ok(missingRedirectTarget.error.includes('newline'));
});

test('parser returns syntax error for trailing pipe', () => {
    const parsed = CommandParser.parse('ls |');
    assert.ok(parsed);
    assert.strictEqual(parsed.type, 'error');
    assert.ok(parsed.error.includes('|'));
});

run();
