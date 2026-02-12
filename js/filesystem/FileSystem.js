export class FileSystem {
    constructor(structure) {
        this.root = this._buildTree(structure);
        this.cwd = '/home/user';
        this.home = '/home/user';
        this.username = 'user';
        this.hostname = 'linux-game';
        this.userGroups = new Set(['user']);
        this.users = new Map();
        this.groupIds = new Map();
        this.nextUid = 1001;
        this.nextGid = 1001;

        this._initAccountsFromTree();
        this._refreshPasswdFile();
    }

    _buildTree(node, name = '/', parent = null) {
        const entry = {
            name,
            type: node.type || 'dir',
            parent,
            permissions: node.permissions || (node.type === 'file' ? 'rw-r--r--' : 'rwxr-xr-x'),
            owner: node.owner || 'user',
            group: node.group || node.owner || 'user',
            mtime: typeof node.mtime === 'number' ? node.mtime : Date.now(),
        };

        if (entry.type === 'dir') {
            entry.children = {};
            if (node.children) {
                for (const [childName, childNode] of Object.entries(node.children)) {
                    entry.children[childName] = this._buildTree(childNode, childName, entry);
                }
            }
        } else {
            entry.content = node.content || '';
        }

        return entry;
    }

    _initAccountsFromTree() {
        // Seed core groups and users for deterministic IDs.
        this._ensureGroupRecord('root', 0);
        this._ensureGroupRecord('user', 1000);
        this._ensureGroupRecord('nobody', 65534);
        this._ensureGroupRecord('hr', 2000);
        this._ensureGroupRecord('security', 2001);
        this._ensureGroupRecord('admin', 2002);
        this._ensureGroupRecord('finance', 2003);
        this._ensureGroupRecord('executive', 2004);
        this._ensureGroupRecord('marketing', 2005);

        this._ensureUserRecord({
            username: 'root',
            uid: 0,
            primaryGroup: 'root',
            supplementalGroups: ['root'],
            home: '/root',
            shell: '/bin/bash',
            locked: false,
        });
        this._ensureUserRecord({
            username: 'user',
            uid: 1000,
            primaryGroup: 'user',
            supplementalGroups: ['user'],
            home: '/home/user',
            shell: '/bin/bash',
            locked: false,
        });
        this._ensureUserRecord({
            username: 'nobody',
            uid: 65534,
            primaryGroup: 'nobody',
            supplementalGroups: ['nobody'],
            home: '/nonexistent',
            shell: '/usr/sbin/nologin',
            locked: true,
        });

        this._scanTreeForOwnership(this.root);
        this._syncCurrentUserGroups();
    }

    _scanTreeForOwnership(node) {
        if (!node) return;

        if (node.owner) {
            this._ensureUserRecord({
                username: node.owner,
                primaryGroup: node.group || node.owner,
                supplementalGroups: [node.group || node.owner],
                home: node.owner === 'root' ? '/root' : `/home/${node.owner}`,
                shell: '/bin/bash',
                locked: false,
            });
        }
        if (node.group) {
            this._ensureGroupRecord(node.group);
        }

        if (node.type === 'dir' && node.children) {
            for (const child of Object.values(node.children)) {
                this._scanTreeForOwnership(child);
            }
        }
    }

    _ensureGroupRecord(groupName, fixedId = null) {
        if (!groupName) return null;
        if (this.groupIds.has(groupName)) return this.groupIds.get(groupName);

        const gid = Number.isInteger(fixedId) ? fixedId : this.nextGid++;
        this.groupIds.set(groupName, gid);
        if (gid >= this.nextGid) this.nextGid = gid + 1;
        return gid;
    }

    _ensureUserRecord(user) {
        if (!user || !user.username) return null;
        if (this.users.has(user.username)) return this.users.get(user.username);

        const username = user.username;
        const primaryGroup = user.primaryGroup || username;
        this._ensureGroupRecord(primaryGroup);
        for (const group of user.supplementalGroups || []) {
            this._ensureGroupRecord(group);
        }

        const uid = Number.isInteger(user.uid) ? user.uid : this.nextUid++;
        if (uid >= this.nextUid) this.nextUid = uid + 1;

        const entry = {
            username,
            uid,
            primaryGroup,
            supplementalGroups: new Set(user.supplementalGroups || [primaryGroup]),
            home: user.home || `/home/${username}`,
            shell: user.shell || '/bin/bash',
            locked: !!user.locked,
        };
        this.users.set(username, entry);
        return entry;
    }

    _syncCurrentUserGroups() {
        const current = this.users.get(this.username);
        if (!current) {
            this.userGroups = new Set([this.username]);
            return;
        }

        this.userGroups = new Set([current.primaryGroup, ...current.supplementalGroups]);
    }

    _refreshPasswdFile() {
        const passwd = this.getNode('/etc/passwd');
        if (!passwd || passwd.type !== 'file') return;

        const sortedUsers = [...this.users.values()].sort((a, b) => a.uid - b.uid);
        const lines = sortedUsers.map((user) => {
            const gid = this.groupIds.get(user.primaryGroup) ?? 1000;
            const gecos = user.username === 'root' ? 'root' : user.username;
            const shell = user.locked ? '/usr/sbin/nologin' : (user.shell || '/bin/bash');
            return `${user.username}:x:${user.uid}:${gid}:${gecos}:${user.home}:${shell}`;
        });
        passwd.content = lines.join('\n');
        passwd.mtime = Date.now();
    }

    _isValidAccountName(name) {
        return typeof name === 'string' && /^[a-z_][a-z0-9_-]{0,31}$/.test(name);
    }

    getUser(username) {
        return this.users.get(username) || null;
    }

    useradd(username, options = {}) {
        if (!this._isValidAccountName(username)) {
            return { error: `useradd: invalid user name '${username}'` };
        }
        if (this.users.has(username)) {
            return { error: `useradd: user '${username}' already exists` };
        }

        const primaryGroup = options.primaryGroup || username;
        if (options.primaryGroup && !this.groupIds.has(primaryGroup)) {
            return { error: `useradd: group '${primaryGroup}' does not exist` };
        }

        const supplemental = new Set();
        if (Array.isArray(options.supplementalGroups)) {
            for (const group of options.supplementalGroups) {
                if (!this.groupIds.has(group)) {
                    return { error: `useradd: group '${group}' does not exist` };
                }
                supplemental.add(group);
            }
        }

        this._ensureGroupRecord(primaryGroup);
        supplemental.add(primaryGroup);

        const home = `/home/${username}`;
        this._ensureUserRecord({
            username,
            primaryGroup,
            supplementalGroups: [...supplemental],
            home,
            shell: '/bin/bash',
            locked: false,
        });

        const mk = this.createDir(home, true);
        if (!mk.error) {
            const homeNode = this.getNode(home);
            if (homeNode) {
                homeNode.owner = username;
                homeNode.group = primaryGroup;
                homeNode.permissions = 'rwxr-xr-x';
            }
        }

        this._refreshPasswdFile();
        return { success: true };
    }

    usermod(username, options = {}) {
        const user = this.users.get(username);
        if (!user) {
            return { error: `usermod: user '${username}' does not exist` };
        }

        if (options.newLogin) {
            const newLogin = options.newLogin;
            if (!this._isValidAccountName(newLogin)) {
                return { error: `usermod: invalid user name '${newLogin}'` };
            }
            if (this.users.has(newLogin)) {
                return { error: `usermod: user '${newLogin}' already exists` };
            }

            this.users.delete(username);
            user.username = newLogin;
            this.users.set(newLogin, user);
            this._replaceOwnershipUsername(this.root, username, newLogin);
            if (this.username === username) {
                this.username = newLogin;
            }
            username = newLogin;
        }

        if (options.primaryGroup) {
            if (!this.groupIds.has(options.primaryGroup)) {
                return { error: `usermod: group '${options.primaryGroup}' does not exist` };
            }
            user.primaryGroup = options.primaryGroup;
            user.supplementalGroups.add(options.primaryGroup);
        }

        if (Array.isArray(options.supplementalGroups)) {
            for (const group of options.supplementalGroups) {
                if (!this.groupIds.has(group)) {
                    return { error: `usermod: group '${group}' does not exist` };
                }
            }

            if (options.appendSupplemental) {
                for (const group of options.supplementalGroups) {
                    user.supplementalGroups.add(group);
                }
            } else {
                user.supplementalGroups = new Set([user.primaryGroup, ...options.supplementalGroups]);
            }
        }

        if (options.home) {
            const homePath = this.resolvePath(options.home);
            user.home = homePath;
            const mk = this.createDir(homePath, true);
            if (!mk.error) {
                const homeNode = this.getNode(homePath);
                if (homeNode) {
                    homeNode.owner = user.username;
                    homeNode.group = user.primaryGroup;
                    homeNode.permissions = 'rwxr-xr-x';
                }
            }
        }

        if (options.lock === true) {
            user.locked = true;
        }

        if (this.username === user.username) {
            this._syncCurrentUserGroups();
        }
        this._refreshPasswdFile();
        return { success: true };
    }

    userdel(username, options = {}) {
        const user = this.users.get(username);
        if (!user) {
            return { error: `userdel: user '${username}' does not exist` };
        }
        if (username === 'root') {
            return { error: `userdel: cannot remove root user` };
        }

        this.users.delete(username);

        if (options.removeHome && user.home) {
            this._deletePathForce(user.home);
        }

        this._refreshPasswdFile();
        return { success: true };
    }

    _deletePathForce(path) {
        const absPath = this.resolvePath(path);
        if (absPath === '/') return false;
        const parentPath = absPath.substring(0, absPath.lastIndexOf('/')) || '/';
        const name = absPath.substring(absPath.lastIndexOf('/') + 1);
        const parent = this.getNode(parentPath);
        if (!parent || parent.type !== 'dir' || !parent.children[name]) return false;
        delete parent.children[name];
        return true;
    }

    _replaceOwnershipUsername(node, oldUser, newUser) {
        if (!node) return;
        if (node.owner === oldUser) node.owner = newUser;
        if (node.type === 'dir' && node.children) {
            for (const child of Object.values(node.children)) {
                this._replaceOwnershipUsername(child, oldUser, newUser);
            }
        }
    }

    chown(path, ownerSpec, recursive = false) {
        const node = this.getNode(path);
        if (!node) return { error: `chown: cannot access '${path}': No such file or directory` };

        const spec = String(ownerSpec || '').trim();
        if (!spec) return { error: 'chown: missing owner operand' };

        let newOwner = null;
        let newGroup = null;

        if (spec.startsWith(':')) {
            newGroup = spec.slice(1);
        } else if (spec.includes(':')) {
            const [ownerPart, groupPart] = spec.split(':');
            newOwner = ownerPart || null;
            newGroup = groupPart || null;
        } else {
            newOwner = spec;
        }

        if (newOwner && !this.users.has(newOwner)) {
            return { error: `chown: invalid user: '${newOwner}'` };
        }
        if (newGroup && !this.groupIds.has(newGroup)) {
            return { error: `chown: invalid group: '${newGroup}'` };
        }

        const applyOwnership = (target) => {
            if (newOwner) target.owner = newOwner;
            if (newGroup) target.group = newGroup;
            if (!target.group && target.owner) {
                target.group = this.users.get(target.owner)?.primaryGroup || target.owner;
            }
        };

        if (recursive && node.type === 'dir') {
            const walk = (current) => {
                applyOwnership(current);
                if (current.type === 'dir') {
                    for (const child of Object.values(current.children)) {
                        walk(child);
                    }
                }
            };
            walk(node);
        } else {
            applyOwnership(node);
        }

        return { success: true };
    }

    // Resolve a path string to an absolute path
    resolvePath(path) {
        if (!path) return this.cwd;

        // Handle ~
        if (path === '~') return this.home;
        if (path.startsWith('~/')) {
            path = this.home + path.slice(1);
        }

        // Handle relative vs absolute
        let parts;
        if (path.startsWith('/')) {
            parts = path.split('/').filter(Boolean);
        } else {
            parts = [...this.cwd.split('/').filter(Boolean), ...path.split('/').filter(Boolean)];
        }

        // Resolve . and ..
        const resolved = [];
        for (const part of parts) {
            if (part === '.') continue;
            if (part === '..') {
                resolved.pop();
            } else {
                resolved.push(part);
            }
        }

        return '/' + resolved.join('/');
    }

    // Get a filesystem node from a path
    getNode(path) {
        const absPath = this.resolvePath(path);
        if (absPath === '/') return this.root;

        const parts = absPath.split('/').filter(Boolean);
        let current = this.root;

        for (const part of parts) {
            if (!current || current.type !== 'dir' || !current.children[part]) {
                return null;
            }
            current = current.children[part];
        }

        return current;
    }

    // Get the display path (replace /home/user with ~)
    displayPath(path) {
        const absPath = path || this.cwd;
        if (absPath === this.home) return '~';
        if (absPath.startsWith(this.home + '/')) {
            return '~' + absPath.slice(this.home.length);
        }
        return absPath;
    }

    _getPermissionClass(node) {
        if (this.username === 'root') return 'u';
        if (node.owner === this.username) return 'u';
        if (this.userGroups.has(node.group)) return 'g';
        return 'o';
    }

    _getCurrentPrimaryGroup() {
        return this.users.get(this.username)?.primaryGroup || this.username;
    }

    _hasPermission(node, permission) {
        if (this.username === 'root') return true;
        const perms = (node.permissions || '---------').padEnd(9, '-').slice(0, 9);
        const ownerClass = this._getPermissionClass(node);
        const offset = ownerClass === 'u' ? 0 : ownerClass === 'g' ? 3 : 6;
        return perms.slice(offset, offset + 3).includes(permission);
    }

    _canTraverse(absPath, includeTargetDir = false) {
        const parts = absPath.split('/').filter(Boolean);
        let current = this.root;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const child = current?.children?.[part];
            if (!child) return true; // Existence handled by callers.

            const isLast = i === parts.length - 1;
            if (child.type === 'dir' && (!isLast || includeTargetDir)) {
                if (!this._hasPermission(child, 'x')) return false;
            }

            current = child;
        }

        return true;
    }

    // List directory contents
    listDir(path, showHidden = false) {
        const requestedPath = path || '.';
        const absPath = this.resolvePath(requestedPath);
        const node = this.getNode(requestedPath);
        if (!node) return { error: `ls: cannot access '${requestedPath}': No such file or directory` };
        if (!this._canTraverse(absPath, node.type === 'dir')) {
            if (node.type === 'dir') return { error: `ls: cannot open directory '${requestedPath}': Permission denied` };
            return { error: `ls: cannot access '${requestedPath}': Permission denied` };
        }

        if (node.type === 'file') {
            if (!this._hasPermission(node, 'r')) {
                return { error: `ls: cannot access '${requestedPath}': Permission denied` };
            }
            return {
                entries: [{
                    name: node.name,
                    type: node.type,
                    permissions: node.permissions,
                    owner: node.owner,
                    group: node.group,
                }],
            };
        }

        if (!this._hasPermission(node, 'r')) {
            return { error: `ls: cannot open directory '${requestedPath}': Permission denied` };
        }

        const entries = Object.keys(node.children);
        const filtered = showHidden ? entries : entries.filter(n => !n.startsWith('.'));
        return {
            entries: filtered.sort().map(name => ({
                name,
                type: node.children[name].type,
                permissions: node.children[name].permissions,
                owner: node.children[name].owner,
                group: node.children[name].group,
            }))
        };
    }

    // Read a file
    readFile(path) {
        const absPath = this.resolvePath(path);
        const node = this.getNode(path);
        if (!node) return { error: `cat: ${path}: No such file or directory` };
        if (node.type === 'dir') return { error: `cat: ${path}: Is a directory` };
        if (!this._canTraverse(absPath, false) || !this._hasPermission(node, 'r')) {
            return { error: `cat: ${path}: Permission denied` };
        }
        return { content: node.content };
    }

    // Create a file
    createFile(path, content = '') {
        const absPath = this.resolvePath(path);
        const parentPath = absPath.substring(0, absPath.lastIndexOf('/')) || '/';
        const fileName = absPath.substring(absPath.lastIndexOf('/') + 1);

        const parent = this.getNode(parentPath);
        if (!parent) return { error: `touch: cannot create '${path}': No such file or directory` };
        if (parent.type !== 'dir') return { error: `touch: cannot create '${path}': Not a directory` };
        if (!this._canTraverse(parentPath, true) || !this._hasPermission(parent, 'x') || !this._hasPermission(parent, 'w')) {
            return { error: `touch: cannot create '${path}': Permission denied` };
        }

        if (parent.children[fileName] && parent.children[fileName].type === 'dir') {
            return { error: `touch: cannot create '${path}': Is a directory` };
        }

        if (parent.children[fileName] && parent.children[fileName].type === 'file') {
            // File exists, update content if provided
            if (!this._hasPermission(parent.children[fileName], 'w')) {
                return { error: `touch: cannot create '${path}': Permission denied` };
            }
            if (content !== '') parent.children[fileName].content = content;
            parent.children[fileName].mtime = Date.now();
            return { success: true };
        }

        parent.children[fileName] = {
            name: fileName,
            type: 'file',
            content,
            permissions: 'rw-r--r--',
            owner: this.username,
            group: this._getCurrentPrimaryGroup(),
            parent,
            mtime: Date.now(),
        };
        return { success: true };
    }

    // Create a directory
    createDir(path, recursive = false) {
        const absPath = this.resolvePath(path);
        const parts = absPath.split('/').filter(Boolean);

        if (recursive) {
            let current = this.root;
            for (const part of parts) {
                if (!current.children[part]) {
                    if (!this._hasPermission(current, 'x') || !this._hasPermission(current, 'w')) {
                        return { error: `mkdir: cannot create directory '${path}': Permission denied` };
                    }
                    current.children[part] = {
                        name: part,
                        type: 'dir',
                        children: {},
                        permissions: 'rwxr-xr-x',
                        owner: this.username,
                        group: this._getCurrentPrimaryGroup(),
                        parent: current,
                        mtime: Date.now(),
                    };
                } else if (current.children[part].type !== 'dir') {
                    return { error: `mkdir: cannot create directory '${path}': File exists` };
                }
                if (!this._hasPermission(current.children[part], 'x')) {
                    return { error: `mkdir: cannot create directory '${path}': Permission denied` };
                }
                current = current.children[part];
            }
            return { success: true };
        }

        const parentPath = absPath.substring(0, absPath.lastIndexOf('/')) || '/';
        const dirName = absPath.substring(absPath.lastIndexOf('/') + 1);
        const parent = this.getNode(parentPath);

        if (!parent) return { error: `mkdir: cannot create directory '${path}': No such file or directory` };
        if (parent.children[dirName]) return { error: `mkdir: cannot create directory '${path}': File exists` };
        if (!this._canTraverse(parentPath, true) || !this._hasPermission(parent, 'x') || !this._hasPermission(parent, 'w')) {
            return { error: `mkdir: cannot create directory '${path}': Permission denied` };
        }

        parent.children[dirName] = {
            name: dirName,
            type: 'dir',
            children: {},
            permissions: 'rwxr-xr-x',
            owner: this.username,
            group: this._getCurrentPrimaryGroup(),
            parent,
            mtime: Date.now(),
        };
        return { success: true };
    }

    // Delete a file or directory
    delete(path, recursive = false) {
        const absPath = this.resolvePath(path);
        const parentPath = absPath.substring(0, absPath.lastIndexOf('/')) || '/';
        const name = absPath.substring(absPath.lastIndexOf('/') + 1);

        const parent = this.getNode(parentPath);
        if (!parent || !parent.children[name]) {
            return { error: `rm: cannot remove '${path}': No such file or directory` };
        }
        if (!this._canTraverse(parentPath, true) || !this._hasPermission(parent, 'x') || !this._hasPermission(parent, 'w')) {
            return { error: `rm: cannot remove '${path}': Permission denied` };
        }

        const target = parent.children[name];
        if (target.type === 'dir' && !recursive) {
            return { error: `rm: cannot remove '${path}': Is a directory (use -r)` };
        }

        delete parent.children[name];
        return { success: true };
    }

    // Copy a file or directory
    copy(src, dest, recursive = false) {
        const srcAbsPath = this.resolvePath(src);
        const srcNode = this.getNode(src);
        if (!srcNode) return { error: `cp: cannot stat '${src}': No such file or directory` };
        if (srcNode.type === 'dir' && !recursive) {
            return { error: `cp: omitting directory '${src}' (use -r)` };
        }
        if (!this._canTraverse(srcAbsPath, srcNode.type === 'dir')) {
            return { error: `cp: cannot stat '${src}': Permission denied` };
        }
        if (srcNode.type === 'file' && !this._hasPermission(srcNode, 'r')) {
            return { error: `cp: cannot stat '${src}': Permission denied` };
        }
        if (srcNode.type === 'dir' && (!this._hasPermission(srcNode, 'r') || !this._hasPermission(srcNode, 'x'))) {
            return { error: `cp: cannot stat '${src}': Permission denied` };
        }

        const destAbsPath = this.resolvePath(dest);
        const destNode = this.getNode(dest);

        if (destNode && destNode.type === 'dir') {
            if (!this._canTraverse(destAbsPath, true) || !this._hasPermission(destNode, 'x') || !this._hasPermission(destNode, 'w')) {
                return { error: `cp: cannot create '${dest}': Permission denied` };
            }
            // Copy into directory
            const cloned = this._cloneNode(srcNode, destNode);
            this._setTreeMtime(cloned, Date.now());
            destNode.children[srcNode.name] = cloned;
            return { success: true };
        }

        // Copy to new name
        const destParentPath = destAbsPath.substring(0, destAbsPath.lastIndexOf('/')) || '/';
        const destName = destAbsPath.substring(destAbsPath.lastIndexOf('/') + 1);
        const destParent = this.getNode(destParentPath);

        if (!destParent) return { error: `cp: cannot create '${dest}': No such file or directory` };
        if (!this._canTraverse(destParentPath, true) || !this._hasPermission(destParent, 'x') || !this._hasPermission(destParent, 'w')) {
            return { error: `cp: cannot create '${dest}': Permission denied` };
        }

        const cloned = this._cloneNode(srcNode, destParent);
        this._setTreeMtime(cloned, Date.now());
        cloned.name = destName;
        destParent.children[destName] = cloned;
        return { success: true };
    }

    // Move (rename) a file or directory
    move(src, dest) {
        const srcAbsPath = this.resolvePath(src);
        const srcNode = this.getNode(src);
        if (!srcNode) return { error: `mv: cannot stat '${src}': No such file or directory` };
        if (srcAbsPath === '/') return { error: `mv: cannot move '/': Operation not permitted` };
        if (!this._canTraverse(srcAbsPath, srcNode.type === 'dir')) {
            return { error: `mv: cannot stat '${src}': Permission denied` };
        }

        const destAbsPath = this.resolvePath(dest);
        const destNode = this.getNode(dest);
        const destRaw = (dest || '').trim();
        const expectsDirectory = destRaw.endsWith('/');

        const srcParentPath = srcAbsPath.substring(0, srcAbsPath.lastIndexOf('/')) || '/';
        const srcName = srcAbsPath.substring(srcAbsPath.lastIndexOf('/') + 1);
        const srcParent = this.getNode(srcParentPath);
        if (!srcParent || !this._canTraverse(srcParentPath, true) || !this._hasPermission(srcParent, 'x') || !this._hasPermission(srcParent, 'w')) {
            return { error: `mv: cannot move '${src}' to '${dest}': Permission denied` };
        }

        if (expectsDirectory && (!destNode || destNode.type !== 'dir')) {
            return { error: `mv: cannot move '${src}' to '${dest}': Not a directory` };
        }

        if (destNode && destNode.type === 'dir') {
            if (!this._canTraverse(destAbsPath, true) || !this._hasPermission(destNode, 'x') || !this._hasPermission(destNode, 'w')) {
                return { error: `mv: cannot move '${src}' to '${dest}': Permission denied` };
            }
            if (destNode === srcParent) {
                // Example: mv file . -> no-op
                return { success: true };
            }
            if (destNode === srcNode) {
                return { error: `mv: cannot move '${src}' to '${dest}': Cannot move a directory into itself` };
            }
            if (srcNode.type === 'dir' && this._isSameOrChildPath(destAbsPath, srcAbsPath)) {
                return { error: `mv: cannot move '${src}' to '${dest}': Cannot move a directory into itself` };
            }
            // Move into directory
            destNode.children[srcName] = srcNode;
            srcNode.parent = destNode;
            delete srcParent.children[srcName];
            return { success: true };
        }

        if (srcAbsPath === destAbsPath) {
            return { success: true };
        }

        // Move/rename to new name
        const destParentPath = destAbsPath.substring(0, destAbsPath.lastIndexOf('/')) || '/';
        const destName = destAbsPath.substring(destAbsPath.lastIndexOf('/') + 1);
        const destParent = this.getNode(destParentPath);

        if (!destParent) return { error: `mv: cannot move '${src}' to '${dest}': No such file or directory` };
        if (!this._canTraverse(destParentPath, true) || !this._hasPermission(destParent, 'x') || !this._hasPermission(destParent, 'w')) {
            return { error: `mv: cannot move '${src}' to '${dest}': Permission denied` };
        }
        if (srcNode.type === 'dir' && this._isSameOrChildPath(destParentPath, srcAbsPath)) {
            return { error: `mv: cannot move '${src}' to '${dest}': Cannot move a directory into itself` };
        }

        srcNode.name = destName;
        srcNode.parent = destParent;
        destParent.children[destName] = srcNode;
        delete srcParent.children[srcName];
        return { success: true };
    }

    _isSameOrChildPath(candidatePath, parentPath) {
        if (candidatePath === parentPath) return true;
        if (parentPath === '/') return true;
        return candidatePath.startsWith(parentPath + '/');
    }

    // Change permissions
    chmod(path, mode) {
        const absPath = this.resolvePath(path);
        const node = this.getNode(path);
        if (!node) return { error: `chmod: cannot access '${path}': No such file or directory` };
        if (!this._canTraverse(absPath, false)) {
            return { error: `chmod: cannot access '${path}': Permission denied` };
        }
        if (this.username !== 'root' && node.owner !== this.username) {
            return { error: `chmod: changing permissions of '${path}': Operation not permitted` };
        }

        // Support numeric mode (e.g., 755)
        if (/^\d{3}$/.test(mode)) {
            const map = { '0': '---', '1': '--x', '2': '-w-', '3': '-wx', '4': 'r--', '5': 'r-x', '6': 'rw-', '7': 'rwx' };
            node.permissions = mode.split('').map(d => map[d] || '---').join('');
            return { success: true };
        }

        // Support symbolic mode (e.g., g-rw, u=r,g=r,o=r, u+rwx)
        if (/^[ugoa]*[+\-=][rwx]+(?:,[ugoa]*[+\-=][rwx]+)*$/.test(mode)) {
            let permissions = (node.permissions || '---------').padEnd(9, '-').slice(0, 9).split('');
            const clauses = mode.split(',');

            for (const clause of clauses) {
                const match = clause.match(/^([ugoa]*)([+\-=])([rwx]+)$/);
                if (!match) return { error: `chmod: invalid mode: '${mode}'` };
                const [, whoRaw, operator, rights] = match;

                const targets = whoRaw && !whoRaw.includes('a')
                    ? [...new Set(whoRaw.split(''))]
                    : ['u', 'g', 'o'];

                for (const target of targets) {
                    const offset = target === 'u' ? 0 : target === 'g' ? 3 : 6;

                    if (operator === '=') {
                        permissions[offset] = '-';
                        permissions[offset + 1] = '-';
                        permissions[offset + 2] = '-';
                    }

                    for (const right of rights) {
                        const bit = right === 'r' ? 0 : right === 'w' ? 1 : 2;
                        if (operator === '-') {
                            permissions[offset + bit] = '-';
                        } else {
                            permissions[offset + bit] = right;
                        }
                    }
                }
            }

            node.permissions = permissions.join('');
            return { success: true };
        }

        return { error: `chmod: invalid mode: '${mode}'` };
    }

    // Change directory
    cd(path) {
        if (!path || path === '~') {
            this.cwd = this.home;
            return { success: true };
        }

        const absPath = this.resolvePath(path);
        const node = this.getNode(absPath);

        if (!node) return { error: `cd: ${path}: No such file or directory` };
        if (node.type !== 'dir') return { error: `cd: ${path}: Not a directory` };
        if (!this._canTraverse(absPath, true)) {
            return { error: `cd: ${path}: Permission denied` };
        }

        this.cwd = absPath;
        return { success: true };
    }

    // Find files recursively
    find(startPath, nameOrOptions, type) {
        const criteria = typeof nameOrOptions === 'object' && nameOrOptions !== null
            ? nameOrOptions
            : { name: nameOrOptions, type };

        const name = criteria.name || null;
        const iname = criteria.iname || null;
        const fileType = criteria.type || null;
        const mtime = criteria.mtime || null;
        const mmin = criteria.mmin || null;

        const results = [];
        const start = this.getNode(startPath || '.');
        if (!start || start.type !== 'dir') return results;

        const basePath = this.resolvePath(startPath || '.');
        if (!this._canTraverse(basePath, true) || !this._hasPermission(start, 'r') || !this._hasPermission(start, 'x')) {
            return results;
        }
        const now = Date.now();

        const walk = (node, currentPath) => {
            if (node.type !== 'dir') return;
            if (!this._hasPermission(node, 'r') || !this._hasPermission(node, 'x')) return;

            for (const [childName, child] of Object.entries(node.children)) {
                const childPath = currentPath === '/' ? '/' + childName : currentPath + '/' + childName;

                let matches = true;
                if (name) {
                    // Support simple glob: *pattern*
                    const pattern = name.replace(/\*/g, '.*');
                    matches = new RegExp(`^${pattern}$`).test(childName);
                }
                if (matches && iname) {
                    const pattern = iname.replace(/\*/g, '.*');
                    matches = new RegExp(`^${pattern}$`, 'i').test(childName);
                }
                if (matches && fileType) {
                    if (fileType === 'f' && child.type !== 'file') matches = false;
                    if (fileType === 'd' && child.type !== 'dir') matches = false;
                }

                const ageMs = Math.max(0, now - (child.mtime || now));
                if (matches && mtime !== null) {
                    const ageDays = ageMs / (24 * 60 * 60 * 1000);
                    matches = this._matchesTimeCondition(ageDays, String(mtime));
                }
                if (matches && mmin !== null) {
                    const ageMinutes = ageMs / (60 * 1000);
                    matches = this._matchesTimeCondition(ageMinutes, String(mmin));
                }

                if (matches) results.push(childPath);
                if (child.type === 'dir' && this._hasPermission(child, 'r') && this._hasPermission(child, 'x')) {
                    walk(child, childPath);
                }
            }
        };

        walk(start, basePath);
        return results;
    }

    _matchesTimeCondition(ageValue, condition) {
        if (!condition) return true;
        if (condition.startsWith('+')) {
            const n = parseInt(condition.slice(1), 10);
            if (!Number.isFinite(n)) return false;
            return ageValue > n;
        }
        if (condition.startsWith('-')) {
            const n = parseInt(condition.slice(1), 10);
            if (!Number.isFinite(n)) return false;
            return ageValue < n;
        }

        const n = parseInt(condition, 10);
        if (!Number.isFinite(n)) return false;
        return Math.floor(ageValue) === n;
    }

    // Grep: search inside files
    grep(pattern, path, options = {}) {
        const results = [];
        let regex;
        try {
            regex = new RegExp(pattern, options.ignoreCase ? 'gi' : 'g');
        } catch (error) {
            return { error: `grep: invalid regular expression '${pattern}'` };
        }

        const searchFile = (node, filePath) => {
            if (node.type === 'file') {
                const lines = node.content.split('\n');
                lines.forEach((line, i) => {
                    if (regex.test(line)) {
                        results.push({
                            file: filePath,
                            line: i + 1,
                            text: line,
                        });
                    }
                    regex.lastIndex = 0;
                });
            }
        };

        const searchDir = (node, dirPath) => {
            for (const [name, child] of Object.entries(node.children)) {
                const childPath = dirPath === '/' ? '/' + name : dirPath + '/' + name;
                if (child.type === 'file') {
                    if (this._canTraverse(childPath, false) && this._hasPermission(child, 'r')) {
                        searchFile(child, childPath);
                    }
                } else if (child.type === 'dir' && options.recursive) {
                    if (!this._canTraverse(childPath, true) || !this._hasPermission(child, 'r') || !this._hasPermission(child, 'x')) {
                        continue;
                    }
                    searchDir(child, childPath);
                }
            }
        };

        const target = this.getNode(path);
        if (!target) return { error: `grep: ${path}: No such file or directory` };
        const absPath = this.resolvePath(path);

        if (!this._canTraverse(absPath, target.type === 'dir')) {
            return { error: `grep: ${path}: Permission denied` };
        }

        if (target.type === 'file') {
            if (!this._hasPermission(target, 'r')) return { error: `grep: ${path}: Permission denied` };
            searchFile(target, this.resolvePath(path));
        } else if (options.recursive) {
            if (!this._hasPermission(target, 'r') || !this._hasPermission(target, 'x')) {
                return { error: `grep: ${path}: Permission denied` };
            }
            searchDir(target, this.resolvePath(path));
        } else {
            return { error: `grep: ${path}: Is a directory` };
        }

        return { results };
    }

    // Write content to file (overwrite or append)
    writeFile(path, content, append = false) {
        const normalizedPath = this.normalizeWritePath(path);
        if (!normalizedPath) {
            return { error: `cannot write to '${path}': Invalid path` };
        }

        const absPath = normalizedPath;
        const node = this.getNode(normalizedPath);
        if (node && node.type === 'dir') {
            return { error: `cannot write to '${path}': Is a directory` };
        }
        if (node && node.type === 'file') {
            if (!this._canTraverse(absPath, false) || !this._hasPermission(node, 'w')) {
                return { error: `cannot write to '${path}': Permission denied` };
            }
            node.content = append ? node.content + content : content;
            node.mtime = Date.now();
            return { success: true };
        }
        // File doesn't exist, create it
        return this.createFile(normalizedPath, content);
    }

    normalizeWritePath(path) {
        if (typeof path !== 'string') return null;
        const trimmed = path.trim();
        if (!trimmed || trimmed.length > 260) return null;
        if (trimmed.includes('\0') || trimmed.includes('\\')) return null;
        if (!/^[A-Za-z0-9._~\-\/]+$/.test(trimmed)) return null;

        const segments = trimmed.split('/').filter(Boolean);
        if (segments.some((segment) => segment === '..')) return null;

        const resolved = this.resolvePath(trimmed);
        if (!resolved || !resolved.startsWith('/')) return null;
        return resolved;
    }

    _isSafeWritePath(path) {
        return this.normalizeWritePath(path) !== null;
    }

    // Clone a node deeply
    _cloneNode(node, newParent) {
        const clone = {
            name: node.name,
            type: node.type,
            permissions: node.permissions,
            owner: node.owner,
            group: node.group,
            parent: newParent,
            mtime: node.mtime,
        };

        if (node.type === 'file') {
            clone.content = node.content;
        } else {
            clone.children = {};
            for (const [name, child] of Object.entries(node.children)) {
                clone.children[name] = this._cloneNode(child, clone);
            }
        }

        return clone;
    }

    _setTreeMtime(node, timestamp) {
        node.mtime = timestamp;
        if (node.type === 'dir' && node.children) {
            for (const child of Object.values(node.children)) {
                this._setTreeMtime(child, timestamp);
            }
        }
    }

    // Serialize (for localStorage, skip parent refs to avoid circular)
    serialize() {
        const serializeNode = (node) => {
            const obj = {
                name: node.name,
                type: node.type,
                permissions: node.permissions,
                owner: node.owner,
                group: node.group,
                mtime: node.mtime,
            };
            if (node.type === 'file') {
                obj.content = node.content;
            } else {
                obj.children = {};
                for (const [name, child] of Object.entries(node.children)) {
                    obj.children[name] = serializeNode(child);
                }
            }
            return obj;
        };

        return {
            tree: serializeNode(this.root),
            cwd: this.cwd,
            users: [...this.users.values()].map((user) => ({
                username: user.username,
                uid: user.uid,
                primaryGroup: user.primaryGroup,
                supplementalGroups: [...user.supplementalGroups],
                home: user.home,
                shell: user.shell,
                locked: user.locked,
            })),
            groupIds: [...this.groupIds.entries()],
            nextUid: this.nextUid,
            nextGid: this.nextGid,
        };
    }

    // Restore from serialized data
    restore(data) {
        if (!data || typeof data !== 'object' || !data.tree || typeof data.tree !== 'object') {
            return { error: 'filesystem restore: invalid snapshot' };
        }

        const snapshot = {
            root: this.root,
            cwd: this.cwd,
            users: this.users,
            groupIds: this.groupIds,
            nextUid: this.nextUid,
            nextGid: this.nextGid,
        };

        try {
            this.root = this._buildTree(data.tree, '/');

            if (Array.isArray(data.groupIds)) {
                this.groupIds = new Map(data.groupIds);
            } else {
                this.groupIds = new Map();
            }

            this.users = new Map();
            if (Array.isArray(data.users)) {
                for (const user of data.users) {
                    if (!user || typeof user.username !== 'string') continue;
                    this.users.set(user.username, {
                        ...user,
                        supplementalGroups: new Set(user.supplementalGroups || []),
                    });
                }
            }

            this.nextUid = Number.isInteger(data.nextUid) ? data.nextUid : 1001;
            this.nextGid = Number.isInteger(data.nextGid) ? data.nextGid : 1001;

            if (this.users.size === 0 || this.groupIds.size === 0) {
                this.users = new Map();
                this.groupIds = new Map();
                this.nextUid = 1001;
                this.nextGid = 1001;
                this._initAccountsFromTree();
            }

            const restoredCwd = typeof data.cwd === 'string' ? this.resolvePath(data.cwd) : this.home;
            const cwdNode = this.getNode(restoredCwd);
            this.cwd = cwdNode && cwdNode.type === 'dir' ? restoredCwd : this.home;

            this._syncCurrentUserGroups();
            this._refreshPasswdFile();
            return { success: true };
        } catch (error) {
            this.root = snapshot.root;
            this.cwd = snapshot.cwd;
            this.users = snapshot.users;
            this.groupIds = snapshot.groupIds;
            this.nextUid = snapshot.nextUid;
            this.nextGid = snapshot.nextGid;
            this._syncCurrentUserGroups();
            this._refreshPasswdFile();
            return { error: 'filesystem restore: failed to apply snapshot' };
        }
    }
}
