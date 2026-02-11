// Each mission has:
// - id: unique identifier
// - level: difficulty level (1-5)
// - title: short title (FR)
// - description: what to do (FR)
// - hint: help text (FR)
// - lesson: mini-lecon pedagogique (FR)
// - points: score awarded
// - validate(fs, history, lastCmd, lastResult, parsed): returns true if mission is completed

export const levels = [
    { id: 1, name: 'Premiers pas', description: 'Apprends a naviguer dans le systeme' },
    { id: 2, name: 'Createur', description: 'Cree et lis des fichiers' },
    { id: 3, name: 'Organisateur', description: 'Deplace, copie et supprime' },
    { id: 4, name: 'Detective', description: 'Cherche et analyse' },
    { id: 5, name: 'Expert', description: 'Permissions et pipes' },
];

export const missions = [
    // === LEVEL 1: Premiers pas ===
    {
        id: 'pwd-1',
        level: 1,
        title: 'Ou suis-je ?',
        description: 'Utilise la commande pwd pour afficher ton repertoire actuel.',
        hint: 'Tape simplement : pwd',
        lesson: {
            title: 'La commande pwd',
            content: `<b>pwd</b> = <i>Print Working Directory</i>

Cette commande affiche le chemin complet du dossier ou tu te trouves actuellement.

<span class="lesson-example">$ pwd
/home/user</span>

Sous Linux, les dossiers sont organises en arbre :
<span class="lesson-example">/           -> racine (tout part d'ici)
/home/      -> dossiers des utilisateurs
/home/user/ -> TON dossier personnel</span>

C'est ta boussole ! Quand tu es perdu, tape <b>pwd</b>.`,
        },
        points: 50,
        validate(fs, history, lastCmd) {
            return lastCmd === 'pwd';
        },
    },
    {
        id: 'ls-1',
        level: 1,
        title: 'Regarde autour de toi',
        description: 'Utilise ls pour voir le contenu du repertoire courant.',
        hint: 'Tape simplement : ls',
        lesson: {
            title: 'La commande ls',
            content: `<b>ls</b> = <i>List</i>

Affiche la liste des fichiers et dossiers dans le repertoire courant.

<span class="lesson-example">$ ls
documents/  images/  musique/</span>

Les <span class="lesson-dir">dossiers</span> sont affiches en bleu avec un <b>/</b>.
Les fichiers normaux sont affiches en blanc.

<b>Variantes utiles :</b>
<span class="lesson-example">ls -l    -> format detaille (taille, date...)
ls -a    -> montre les fichiers caches
ls -la   -> combine les deux !</span>`,
        },
        points: 50,
        validate(fs, history, lastCmd) {
            return lastCmd.startsWith('ls') && !lastCmd.includes('/');
        },
    },
    {
        id: 'cd-1',
        level: 1,
        title: 'Explore les documents',
        description: 'Deplace-toi dans le dossier "documents" avec cd, puis liste son contenu.',
        hint: 'Tape : cd documents puis ls',
        lesson: {
            title: 'La commande cd',
            content: `<b>cd</b> = <i>Change Directory</i>

Te deplace dans un autre dossier.

<span class="lesson-example">$ cd documents     -> entre dans "documents"
$ cd ..            -> remonte d'un niveau
$ cd ~             -> retourne au home
$ cd /             -> va a la racine</span>

<b>Raccourcis de chemins :</b>
<span class="lesson-example">~    = ton home (/home/user)
.    = dossier actuel
..   = dossier parent
./   = a partir d'ici</span>

<b>Combine cd + ls</b> pour explorer :
<span class="lesson-example">$ cd documents
$ ls
notes.txt  projets/  todo.txt</span>`,
        },
        points: 100,
        validate(fs, history, lastCmd) {
            return fs.cwd.endsWith('/documents') && lastCmd.startsWith('ls');
        },
    },
    {
        id: 'ls-hidden',
        level: 1,
        title: 'Fichiers caches',
        description: 'Retourne dans ton home (~) et trouve les fichiers caches avec ls -a.',
        hint: 'Tape : cd ~ puis ls -a  (les fichiers caches commencent par un point)',
        lesson: {
            title: 'Les fichiers caches',
            content: `Sous Linux, un fichier dont le nom commence par un <b>point (.)</b> est <b>cache</b>.

<span class="lesson-example">.bashrc      -> configuration du terminal
.profile     -> configuration du profil
.secret_note -> un fichier cache !</span>

La commande <b>ls</b> normale ne les montre pas.
Il faut utiliser le flag <b>-a</b> (all) :

<span class="lesson-example">$ ls
documents/  images/

$ ls -a
.bashrc  .profile  documents/  images/</span>

Les fichiers de configuration importants sont souvent caches pour eviter de les supprimer par erreur.`,
        },
        points: 100,
        validate(fs, history, lastCmd) {
            return fs.cwd === fs.home && (lastCmd === 'ls -a' || lastCmd === 'ls -la' || lastCmd === 'ls -al');
        },
    },
    {
        id: 'whoami-1',
        level: 1,
        title: 'Quel est ton user ?',
        description: 'Utilise whoami pour afficher le nom de ton utilisateur.',
        hint: 'Tape : whoami',
        points: 50,
        validate(fs, history, lastCmd, lastResult, parsed) {
            return !!parsed &&
                parsed.type === 'command' &&
                parsed.command === 'whoami' &&
                typeof lastResult?.output === 'string' &&
                lastResult.output.trim() === fs.username;
        },
    },
    {
        id: 'hostname-1',
        level: 1,
        title: 'Nom de la machine',
        description: 'Affiche le nom de la machine avec hostname.',
        hint: 'Tape : hostname',
        points: 50,
        validate(fs, history, lastCmd, lastResult, parsed) {
            return !!parsed &&
                parsed.type === 'command' &&
                parsed.command === 'hostname' &&
                typeof lastResult?.output === 'string' &&
                lastResult.output.trim() === fs.hostname;
        },
    },
    {
        id: 'cd-root-1',
        level: 1,
        title: 'Va a la racine',
        description: 'Deplace-toi vers la racine du systeme (/).',
        hint: 'Tape : cd /',
        points: 75,
        validate(fs, history, lastCmd, lastResult, parsed) {
            return !!parsed &&
                parsed.type === 'command' &&
                parsed.command === 'cd' &&
                fs.cwd === '/';
        },
    },
    {
        id: 'ls-root-1',
        level: 1,
        title: 'Inspecte la racine',
        description: 'Liste le contenu de / pour repérer les dossiers systeme.',
        hint: 'Tape : ls /  (ou place-toi dans / puis ls)',
        points: 75,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'ls') return false;
            const output = typeof lastResult?.output === 'string' ? lastResult.output : '';
            const targets = parsed.args.map(arg => fs.resolvePath(arg));
            const listingRoot = targets.includes('/') || fs.cwd === '/';
            return listingRoot && output.includes('home/') && output.includes('tmp/');
        },
    },
    {
        id: 'ls-etc-1',
        level: 1,
        title: 'Regarde /etc',
        description: 'Affiche le contenu du dossier /etc.',
        hint: 'Tape : ls /etc',
        points: 75,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'ls') return false;
            const output = typeof lastResult?.output === 'string' ? lastResult.output : '';
            const targets = parsed.args.map(arg => fs.resolvePath(arg));
            const listingEtc = targets.includes('/etc') || fs.cwd === '/etc';
            return listingEtc && output.includes('hostname');
        },
    },
    {
        id: 'cd-home-back-1',
        level: 1,
        title: 'Retour au home',
        description: 'Reviens dans ton home (~) avec cd.',
        hint: 'Tape : cd ~',
        points: 75,
        validate(fs, history, lastCmd, lastResult, parsed) {
            return !!parsed &&
                parsed.type === 'command' &&
                parsed.command === 'cd' &&
                fs.cwd === fs.home;
        },
    },
    {
        id: 'pwd-home-2',
        level: 1,
        title: 'Confirme ton home',
        description: 'Affiche le chemin absolu de ton home avec pwd.',
        hint: 'Tape : pwd (depuis ~)',
        points: 75,
        validate(fs, history, lastCmd, lastResult, parsed) {
            return !!parsed &&
                parsed.type === 'command' &&
                parsed.command === 'pwd' &&
                typeof lastResult?.output === 'string' &&
                lastResult.output.trim() === fs.home;
        },
    },
    {
        id: 'ls-long-home-1',
        level: 1,
        title: 'Liste detaillee',
        description: 'Utilise ls -l dans ton home pour voir les details.',
        hint: 'Tape : ls -l',
        points: 80,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'ls' || !parsed.flags.l) return false;
            const targets = parsed.args.map(arg => fs.resolvePath(arg));
            const listingHome = targets.length ? targets.includes(fs.home) : fs.cwd === fs.home;
            return listingHome && typeof lastResult?.output === 'string' && lastResult.output.includes('total');
        },
    },
    {
        id: 'date-1',
        level: 1,
        title: 'Date systeme',
        description: 'Affiche la date courante du systeme.',
        hint: 'Tape : date',
        points: 60,
        validate(fs, history, lastCmd, lastResult, parsed) {
            return !!parsed &&
                parsed.type === 'command' &&
                parsed.command === 'date' &&
                typeof lastResult?.output === 'string' &&
                lastResult.output.includes(':');
        },
    },
    {
        id: 'clear-1',
        level: 1,
        title: 'Nettoie l ecran',
        description: 'Utilise la commande clear pour vider le terminal.',
        hint: 'Tape : clear',
        points: 60,
        validate(fs, history, lastCmd, lastResult, parsed) {
            return !!parsed &&
                parsed.type === 'command' &&
                parsed.command === 'clear' &&
                !!lastResult?.clear;
        },
    },
    {
        id: 'history-1',
        level: 1,
        title: 'Relis tes actions',
        description: 'Affiche l historique de tes commandes.',
        hint: 'Tape : history',
        points: 70,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'history') return false;
            const output = typeof lastResult?.output === 'string' ? lastResult.output.trim() : '';
            return output.split('\n').length >= 3;
        },
    },
    {
        id: 'find-iname-1',
        level: 1,
        title: 'Recherche sans casse',
        description: 'Trouve les fichiers contenant "NOTE" (majuscules) avec find -iname depuis ton home.',
        hint: 'Tape : find ~ -iname "*NOTE*"',
        points: 90,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'find') return false;
            if (!(parsed.args.includes('-iname') && parsed.args.includes('*NOTE*'))) return false;
            const output = typeof lastResult?.output === 'string' ? lastResult.output : '';
            return output.includes('/home/user/documents/notes.txt');
        },
    },
    {
        id: 'nano-open-exit-1',
        level: 1,
        title: 'Premier nano',
        description: 'Ouvre documents/todo.txt avec nano puis quitte avec /exit.',
        hint: 'Tape : nano documents/todo.txt  puis /exit',
        points: 95,
        validate(fs, history, lastCmd, lastResult, parsed) {
            return !!parsed &&
                parsed.type === 'command' &&
                parsed.command === 'nano' &&
                parsed.args[0] === '--exit' &&
                parsed.args[1] === '/home/user/documents/todo.txt' &&
                lastResult?.nanoEvent?.action === 'exit';
        },
    },

    // === LEVEL 2: Createur ===
    {
        id: 'cat-1',
        level: 2,
        title: 'Lis tes notes',
        description: 'Utilise cat pour lire le fichier documents/notes.txt.',
        hint: 'Tape : cat documents/notes.txt  (tu peux aussi utiliser ~/documents/notes.txt)',
        lesson: {
            title: 'La commande cat',
            content: `<b>cat</b> = <i>Concatenate</i>

Affiche le contenu d'un fichier dans le terminal.

<span class="lesson-example">$ cat notes.txt
Bienvenue dans Linux Game !</span>

Tu peux lire un fichier avec un <b>chemin relatif</b> ou <b>absolu</b> :
<span class="lesson-example">$ cat notes.txt              -> relatif
$ cat ./notes.txt            -> relatif explicite
$ cat ~/documents/notes.txt  -> depuis le home
$ cat /home/user/documents/notes.txt  -> absolu</span>

Tu peux aussi afficher <b>plusieurs fichiers</b> :
<span class="lesson-example">$ cat fichier1.txt fichier2.txt</span>`,
        },
        points: 75,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'cat') return false;
            const targets = parsed.args.map(arg => fs.resolvePath(arg));
            return targets.includes('/home/user/documents/notes.txt') &&
                   typeof lastResult?.output === 'string' &&
                   lastResult.output.includes('Bienvenue dans Linux Game');
        },
    },
    {
        id: 'mkdir-1',
        level: 2,
        title: 'Cree ton espace',
        description: 'Cree un nouveau dossier appele "mon_projet" dans ton home.',
        hint: 'Tape : mkdir mon_projet  (assure-toi d\'etre dans ~)',
        lesson: {
            title: 'La commande mkdir',
            content: `<b>mkdir</b> = <i>Make Directory</i>

Cree un nouveau dossier.

<span class="lesson-example">$ mkdir mon_projet
$ ls
documents/  mon_projet/  images/</span>

<b>Attention :</b> tu dois etre dans le bon dossier !
Utilise <b>pwd</b> pour verifier, et <b>cd ~</b> pour retourner au home.

<span class="lesson-example">$ cd ~           -> retour au home
$ pwd            -> /home/user
$ mkdir mon_projet   -> cree le dossier ici</span>

Avec le flag <b>-p</b>, tu peux creer des dossiers imbriques :
<span class="lesson-example">$ mkdir -p a/b/c  -> cree a, a/b et a/b/c</span>`,
        },
        points: 100,
        validate(fs) {
            return fs.getNode('/home/user/mon_projet') !== null &&
                   fs.getNode('/home/user/mon_projet').type === 'dir';
        },
    },
    {
        id: 'touch-1',
        level: 2,
        title: 'Cree un fichier',
        description: 'Cree un fichier vide appele "test.txt" avec la commande touch.',
        hint: 'Tape : touch test.txt',
        lesson: {
            title: 'La commande touch',
            content: `<b>touch</b> cree un fichier vide (ou met a jour sa date si il existe deja).

<span class="lesson-example">$ touch test.txt
$ ls
test.txt</span>

C'est la facon la plus simple de creer un fichier.

Tu peux creer <b>plusieurs fichiers</b> d'un coup :
<span class="lesson-example">$ touch a.txt b.txt c.txt</span>

<b>Difference avec mkdir :</b>
- <b>touch</b> cree des <i>fichiers</i>
- <b>mkdir</b> cree des <i>dossiers</i>

<b>Note :</b> le nom ne doit pas contenir d'espaces. Utilise des _ ou - a la place.`,
        },
        points: 75,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'touch') return false;
            for (const arg of parsed.args) {
                if (!arg.endsWith('test.txt')) continue;
                const node = fs.getNode(fs.resolvePath(arg));
                if (node && node.type === 'file') return true;
            }
            return false;
        },
    },
    {
        id: 'echo-1',
        level: 2,
        title: 'Ecris dans un fichier',
        description: 'Utilise echo avec > pour ecrire "Bonjour Linux" dans un fichier message.txt.',
        hint: 'Tape : echo "Bonjour Linux" > message.txt',
        lesson: {
            title: 'echo et la redirection >',
            content: `<b>echo</b> affiche du texte dans le terminal :
<span class="lesson-example">$ echo "Hello"
Hello</span>

Avec <b>></b> tu rediriges la sortie vers un <b>fichier</b> (ecrase le contenu) :
<span class="lesson-example">$ echo "Bonjour Linux" > message.txt</span>

Avec <b>>></b> tu <b>ajoutes</b> a la fin du fichier sans ecraser :
<span class="lesson-example">$ echo "ligne 1" > fichier.txt    -> ecrase
$ echo "ligne 2" >> fichier.txt   -> ajoute</span>

Puis tu peux verifier avec cat :
<span class="lesson-example">$ cat fichier.txt
ligne 1
ligne 2</span>

<b>Important :</b> mets ton texte entre guillemets si il contient des espaces !`,
        },
        points: 125,
        validate(fs) {
            const home = fs.getNode('/home/user');
            if (!home) return false;
            for (const [name, child] of Object.entries(home.children)) {
                if (child.type === 'file' && child.content && child.content.includes('Bonjour')) {
                    return true;
                }
            }
            const cwdNode = fs.getNode(fs.cwd);
            if (cwdNode && cwdNode.type === 'dir') {
                for (const [name, child] of Object.entries(cwdNode.children)) {
                    if (child.type === 'file' && child.content && child.content.includes('Bonjour')) {
                        return true;
                    }
                }
            }
            return false;
        },
    },
    {
        id: 'cat-secret-1',
        level: 2,
        title: 'Message cache',
        description: 'Lis le fichier cache ~/.secret_note.',
        hint: 'Tape : cat ~/.secret_note',
        points: 90,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'cat') return false;
            const targets = parsed.args.map(arg => fs.resolvePath(arg));
            return targets.includes('/home/user/.secret_note') &&
                typeof lastResult?.output === 'string' &&
                lastResult.output.includes('fichier cache');
        },
    },
    {
        id: 'touch-multi-1',
        level: 2,
        title: 'Creation multiple',
        description: 'Cree deux fichiers en une commande: mon_projet/journal.txt et mon_projet/ideas.txt.',
        hint: 'Tape : touch mon_projet/journal.txt mon_projet/ideas.txt',
        points: 100,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'touch') return false;
            const journal = fs.getNode('/home/user/mon_projet/journal.txt');
            const ideas = fs.getNode('/home/user/mon_projet/ideas.txt');
            return !!journal && journal.type === 'file' && !!ideas && ideas.type === 'file' && parsed.args.length >= 2;
        },
    },
    {
        id: 'mkdir-sandbox-1',
        level: 2,
        title: 'Structure de travail',
        description: 'Cree le dossier mon_projet/sandbox/logs avec mkdir -p.',
        hint: 'Tape : mkdir -p mon_projet/sandbox/logs',
        points: 100,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'mkdir' || !parsed.flags.p) return false;
            const node = fs.getNode('/home/user/mon_projet/sandbox/logs');
            return !!node && node.type === 'dir';
        },
    },
    {
        id: 'echo-append-1',
        level: 2,
        title: 'Ajoute une ligne',
        description: 'Ajoute "Deuxieme ligne" a mon_projet/journal.txt avec >>.',
        hint: 'Tape : echo "Deuxieme ligne" >> mon_projet/journal.txt',
        points: 110,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'echo' || !parsed.redirect) return false;
            if (parsed.redirect.type !== 'append') return false;
            if (fs.resolvePath(parsed.redirect.file) !== '/home/user/mon_projet/journal.txt') return false;
            const file = fs.readFile('/home/user/mon_projet/journal.txt');
            return !file.error && file.content.includes('Deuxieme ligne');
        },
    },
    {
        id: 'cat-double-1',
        level: 2,
        title: 'Lecture double',
        description: 'Affiche documents/notes.txt et documents/todo.txt dans une seule commande cat.',
        hint: 'Tape : cat documents/notes.txt documents/todo.txt',
        points: 110,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'cat') return false;
            const targets = parsed.args.map(arg => fs.resolvePath(arg));
            const hasNotes = targets.includes('/home/user/documents/notes.txt');
            const hasTodo = targets.includes('/home/user/documents/todo.txt');
            return hasNotes && hasTodo &&
                typeof lastResult?.output === 'string' &&
                lastResult.output.includes('Apprendre la commande ls');
        },
    },
    {
        id: 'help-1',
        level: 2,
        title: 'Aide generale',
        description: 'Affiche toutes les commandes disponibles.',
        hint: 'Tape : help',
        points: 75,
        validate(fs, history, lastCmd, lastResult, parsed) {
            const output = typeof lastResult?.output === 'string' ? lastResult.output : '';
            return !!parsed &&
                parsed.type === 'command' &&
                parsed.command === 'help' &&
                (/Commandes disponibles/i.test(output) || /Available commands/i.test(output));
        },
    },
    {
        id: 'man-cd-1',
        level: 2,
        title: 'Manuel de cd',
        description: 'Ouvre la page man de la commande cd.',
        hint: 'Tape : man cd',
        points: 75,
        validate(fs, history, lastCmd, lastResult, parsed) {
            return !!parsed &&
                parsed.type === 'command' &&
                parsed.command === 'man' &&
                parsed.args[0] === 'cd' &&
                typeof lastResult?.output === 'string' &&
                lastResult.output.includes('change directory');
        },
    },
    {
        id: 'less-notes-1',
        level: 2,
        title: 'Lis avec less',
        description: 'Affiche documents/notes.txt avec less.',
        hint: 'Tape : less documents/notes.txt',
        points: 90,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'less') return false;
            const target = parsed.args[0] ? fs.resolvePath(parsed.args[0]) : '';
            return target === '/home/user/documents/notes.txt' &&
                typeof lastResult?.output === 'string' &&
                lastResult.output.includes('Bienvenue dans Linux Game');
        },
    },
    {
        id: 'less-todo-1',
        level: 2,
        title: 'Lis la todo',
        description: 'Affiche documents/todo.txt avec less.',
        hint: 'Tape : less documents/todo.txt',
        points: 90,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'less') return false;
            const target = parsed.args[0] ? fs.resolvePath(parsed.args[0]) : '';
            return target === '/home/user/documents/todo.txt' &&
                typeof lastResult?.output === 'string' &&
                lastResult.output.includes('Apprendre la commande ls');
        },
    },
    {
        id: 'echo-plan-create-1',
        level: 2,
        title: 'Cree un plan',
        description: 'Ecris "Plan A" dans mon_projet/plan.txt avec >.',
        hint: 'Tape : echo "Plan A" > mon_projet/plan.txt',
        points: 100,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'echo' || !parsed.redirect) return false;
            if (parsed.redirect.type !== 'overwrite') return false;
            if (fs.resolvePath(parsed.redirect.file) !== '/home/user/mon_projet/plan.txt') return false;
            const file = fs.readFile('/home/user/mon_projet/plan.txt');
            return !file.error && file.content.includes('Plan A');
        },
    },
    {
        id: 'echo-plan-append-1',
        level: 2,
        title: 'Complete le plan',
        description: 'Ajoute "Plan B" a mon_projet/plan.txt avec >>.',
        hint: 'Tape : echo "Plan B" >> mon_projet/plan.txt',
        points: 105,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'echo' || !parsed.redirect) return false;
            if (parsed.redirect.type !== 'append') return false;
            if (fs.resolvePath(parsed.redirect.file) !== '/home/user/mon_projet/plan.txt') return false;
            const file = fs.readFile('/home/user/mon_projet/plan.txt');
            return !file.error && file.content.includes('Plan A') && file.content.includes('Plan B');
        },
    },
    {
        id: 'cat-plan-1',
        level: 2,
        title: 'Verifie le plan',
        description: 'Affiche mon_projet/plan.txt pour verifier son contenu.',
        hint: 'Tape : cat mon_projet/plan.txt',
        points: 95,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'cat') return false;
            const target = parsed.args[0] ? fs.resolvePath(parsed.args[0]) : '';
            return target === '/home/user/mon_projet/plan.txt' &&
                typeof lastResult?.output === 'string' &&
                lastResult.output.includes('Plan A') &&
                lastResult.output.includes('Plan B');
        },
    },
    {
        id: 'find-mmin-2',
        level: 2,
        title: 'Modifications recentes',
        description: 'Cree mon_projet/mmin_probe.txt puis retrouve-le avec find -mmin -5.',
        hint: '1) touch mon_projet/mmin_probe.txt  2) find ~ -mmin -5 -name "*mmin_probe*"',
        points: 120,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'find') return false;
            if (!(parsed.args.includes('-mmin') && parsed.args.includes('-5'))) return false;
            const node = fs.getNode('/home/user/mon_projet/mmin_probe.txt');
            if (!node || node.type !== 'file') return false;
            const output = typeof lastResult?.output === 'string' ? lastResult.output : '';
            return output.includes('/home/user/mon_projet/mmin_probe.txt');
        },
    },
    {
        id: 'nano-write-message-2',
        level: 2,
        title: 'Ecris avec nano',
        description: 'Edite mon_projet/message.txt avec nano, ajoute "Bonjour depuis nano", puis sauvegarde.',
        hint: '1) nano mon_projet/message.txt  2) Bonjour depuis nano  3) /save  4) /exit',
        points: 130,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'nano') return false;
            if (parsed.args[0] !== '--save' || parsed.args[1] !== '/home/user/mon_projet/message.txt') return false;
            if (lastResult?.nanoEvent?.action !== 'save') return false;
            const file = fs.readFile('/home/user/mon_projet/message.txt');
            return !file.error && file.content.includes('Bonjour depuis nano');
        },
    },

    // === LEVEL 3: Organisateur ===
    {
        id: 'cp-1',
        level: 3,
        title: 'Fais une copie',
        description: 'Copie le fichier documents/notes.txt vers documents/notes_backup.txt.',
        hint: 'Tape : cp documents/notes.txt documents/notes_backup.txt',
        lesson: {
            title: 'La commande cp',
            content: `<b>cp</b> = <i>Copy</i>

Copie un fichier (ou dossier) d'un endroit a un autre.

<b>Syntaxe :</b> cp SOURCE DESTINATION

<span class="lesson-example">$ cp notes.txt notes_backup.txt
-> Cree une copie du fichier</span>

Tu peux copier vers un <b>autre dossier</b> :
<span class="lesson-example">$ cp notes.txt /tmp/
-> Copie dans /tmp/ en gardant le meme nom</span>

Pour copier un <b>dossier entier</b>, utilise <b>-r</b> (recursif) :
<span class="lesson-example">$ cp -r projets/ projets_backup/</span>

<b>Rappel chemins :</b>
<span class="lesson-example">~/documents/notes.txt  -> chemin depuis le home
./notes.txt            -> chemin relatif</span>`,
        },
        points: 100,
        validate(fs) {
            return fs.getNode('/home/user/documents/notes_backup.txt') !== null;
        },
    },
    {
        id: 'mv-1',
        level: 3,
        title: 'Demenagement',
        description: 'Deplace le fichier telechargements/readme.md vers le dossier documents/.',
        hint: 'Tape : cd ~ puis mv telechargements/readme.md documents/',
        lesson: {
            title: 'La commande mv',
            content: `<b>mv</b> = <i>Move</i>

Deplace ou renomme un fichier/dossier.

<b>Deplacer :</b>
<span class="lesson-example">$ mv fichier.txt dossier/
-> Deplace fichier.txt dans dossier/</span>

<b>Renommer :</b>
<span class="lesson-example">$ mv ancien_nom.txt nouveau_nom.txt
-> Renomme le fichier</span>

<b>Difference avec cp :</b>
- <b>cp</b> = copie (l'original reste)
- <b>mv</b> = deplace (l'original disparait)

<span class="lesson-example">$ mv telechargements/readme.md documents/
-> Le fichier quitte telechargements
   et arrive dans documents

Depuis ~/telechargements, utilise plutot :
$ mv readme.md ../documents/</span>`,
        },
        points: 100,
        validate(fs) {
            return fs.getNode('/home/user/documents/readme.md') !== null &&
                   fs.getNode('/home/user/telechargements/readme.md') === null;
        },
    },
    {
        id: 'rm-1',
        level: 3,
        title: 'Menage dans /tmp',
        description: 'Supprime le fichier /tmp/cache_old.tmp.',
        hint: 'Tape : rm /tmp/cache_old.tmp',
        lesson: {
            title: 'La commande rm',
            content: `<b>rm</b> = <i>Remove</i>

Supprime un fichier. <b>Attention : pas de corbeille sous Linux !</b>

<span class="lesson-example">$ rm fichier.txt     -> supprime le fichier
$ rm -r dossier/     -> supprime un dossier et tout son contenu</span>

<b>Flags utiles :</b>
<span class="lesson-example">-r  -> recursif (pour les dossiers)
-f  -> force (pas de confirmation)</span>

<b>Attention :</b> la suppression est <b>definitive</b> !
Sous Linux, il n'y a pas de corbeille.

<b>Le dossier /tmp :</b>
C'est un dossier pour les fichiers temporaires.
Tu peux y supprimer des fichiers sans risque.`,
        },
        points: 100,
        validate(fs) {
            return fs.getNode('/tmp/cache_old.tmp') === null;
        },
    },
    {
        id: 'mkdir-p',
        level: 3,
        title: 'Dossiers imbriques',
        description: 'Cree l\'arborescence projets/api/src en une seule commande avec mkdir -p.',
        hint: 'Tape : mkdir -p projets/api/src',
        lesson: {
            title: 'mkdir -p (creation recursive)',
            content: `Le flag <b>-p</b> permet de creer toute une arborescence d'un coup.

<b>Sans -p</b> (erreur si le parent n'existe pas) :
<span class="lesson-example">$ mkdir a/b/c
mkdir: cannot create directory: No such file</span>

<b>Avec -p</b> (cree les parents automatiquement) :
<span class="lesson-example">$ mkdir -p a/b/c
-> Cree a/, puis a/b/, puis a/b/c/</span>

C'est tres utile pour creer une structure de projet :
<span class="lesson-example">$ mkdir -p projet/src/components
$ mkdir -p projet/tests
$ mkdir -p projet/docs</span>

<b>Rappel :</b> assure-toi d'etre dans le bon dossier avec <b>pwd</b> avant de creer !`,
        },
        points: 125,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'mkdir' || !parsed.flags.p) return false;
            const node = fs.getNode('/home/user/projets/api/src');
            return node && node.type === 'dir';
        },
    },
    {
        id: 'cp-web-backup-1',
        level: 3,
        title: 'Sauvegarde web',
        description: 'Copie le dossier documents/projets/web vers documents/projets/web_backup avec cp -r.',
        hint: 'Tape : cp -r documents/projets/web documents/projets/web_backup',
        points: 130,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'cp' || !parsed.flags.r) return false;
            const node = fs.getNode('/home/user/documents/projets/web_backup');
            return !!node && node.type === 'dir';
        },
    },
    {
        id: 'cp-python-backup-1',
        level: 3,
        title: 'Sauvegarde python',
        description: 'Copie le dossier documents/projets/python vers documents/projets/python_backup.',
        hint: 'Tape : cp -r documents/projets/python documents/projets/python_backup',
        points: 130,
        validate(fs) {
            const node = fs.getNode('/home/user/documents/projets/python_backup');
            return !!node && node.type === 'dir';
        },
    },
    {
        id: 'cp-todo-tmp-1',
        level: 3,
        title: 'Copie temporaire',
        description: 'Copie documents/todo.txt vers /tmp/todo_copy.txt.',
        hint: 'Tape : cp documents/todo.txt /tmp/todo_copy.txt',
        points: 115,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'cp') return false;
            const node = fs.getNode('/tmp/todo_copy.txt');
            return !!node && node.type === 'file';
        },
    },
    {
        id: 'mv-temp-data-1',
        level: 3,
        title: 'Renomme un temporaire',
        description: 'Renomme /tmp/temp_data.txt en /tmp/temp_data_old.txt.',
        hint: 'Tape : mv /tmp/temp_data.txt /tmp/temp_data_old.txt',
        points: 115,
        validate(fs) {
            return fs.getNode('/tmp/temp_data_old.txt') !== null &&
                fs.getNode('/tmp/temp_data.txt') === null;
        },
    },
    {
        id: 'mkdir-archives-1',
        level: 3,
        title: 'Arborescence d archives',
        description: 'Cree documents/archives/2026/feb avec mkdir -p.',
        hint: 'Tape : mkdir -p documents/archives/2026/feb',
        points: 120,
        validate(fs) {
            const node = fs.getNode('/home/user/documents/archives/2026/feb');
            return !!node && node.type === 'dir';
        },
    },
    {
        id: 'mv-copy-archive-1',
        level: 3,
        title: 'Deplace la copie',
        description: 'Deplace /tmp/todo_copy.txt dans documents/archives/2026/feb/.',
        hint: 'Tape : mv /tmp/todo_copy.txt documents/archives/2026/feb/',
        points: 120,
        validate(fs) {
            return fs.getNode('/home/user/documents/archives/2026/feb/todo_copy.txt') !== null &&
                fs.getNode('/tmp/todo_copy.txt') === null;
        },
    },
    {
        id: 'rm-api-recursive-1',
        level: 3,
        title: 'Nettoyage recursif',
        description: 'Supprime le dossier projets/api et tout son contenu avec rm -r.',
        hint: 'Tape : rm -r projets/api',
        points: 130,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'rm' || !parsed.flags.r) return false;
            return fs.getNode('/home/user/projets/api') === null;
        },
    },
    {
        id: 'mkdir-lab-1',
        level: 3,
        title: 'Laboratoire temporaire',
        description: 'Cree le dossier /tmp/lab/work avec mkdir -p.',
        hint: 'Tape : mkdir -p /tmp/lab/work',
        points: 120,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'mkdir' || !parsed.flags.p) return false;
            const node = fs.getNode('/tmp/lab/work');
            return !!node && node.type === 'dir';
        },
    },
    {
        id: 'cp-notes-lab-1',
        level: 3,
        title: 'Copie de travail',
        description: 'Copie documents/notes.txt vers /tmp/lab/work/notes_lab.txt.',
        hint: 'Tape : cp documents/notes.txt /tmp/lab/work/notes_lab.txt',
        points: 120,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'cp') return false;
            const node = fs.getNode('/tmp/lab/work/notes_lab.txt');
            return !!node && node.type === 'file';
        },
    },
    {
        id: 'mv-notes-lab-1',
        level: 3,
        title: 'Renommage de travail',
        description: 'Renomme /tmp/lab/work/notes_lab.txt en notes_lab_done.txt.',
        hint: 'Tape : mv /tmp/lab/work/notes_lab.txt /tmp/lab/work/notes_lab_done.txt',
        points: 120,
        validate(fs) {
            return fs.getNode('/tmp/lab/work/notes_lab_done.txt') !== null &&
                fs.getNode('/tmp/lab/work/notes_lab.txt') === null;
        },
    },
    {
        id: 'cp-web-lab-1',
        level: 3,
        title: 'Clone web temporaire',
        description: 'Copie le dossier documents/projets/web dans /tmp/lab/work/web_clone avec -r.',
        hint: 'Tape : cp -r documents/projets/web /tmp/lab/work/web_clone',
        points: 130,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'cp' || !parsed.flags.r) return false;
            const node = fs.getNode('/tmp/lab/work/web_clone');
            return !!node && node.type === 'dir';
        },
    },
    {
        id: 'rm-web-lab-1',
        level: 3,
        title: 'Nettoie le clone',
        description: 'Supprime /tmp/lab/work/web_clone avec rm -r.',
        hint: 'Tape : rm -r /tmp/lab/work/web_clone',
        points: 130,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'rm' || !parsed.flags.r) return false;
            return fs.getNode('/tmp/lab/work/web_clone') === null;
        },
    },
    {
        id: 'find-mtime-old-3',
        level: 3,
        title: 'Fichier ancien',
        description: 'Trouve les fichiers modifies il y a plus de 7 jours dans telechargements.',
        hint: 'Tape : find ~/telechargements -mtime +7',
        points: 130,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'find') return false;
            if (!(parsed.args.includes('-mtime') && parsed.args.includes('+7'))) return false;
            const output = typeof lastResult?.output === 'string' ? lastResult.output : '';
            return output.includes('/home/user/telechargements/archive.zip');
        },
    },
    {
        id: 'nano-update-worknote-3',
        level: 3,
        title: 'Mise a jour labo',
        description: 'Ajoute "archive terminee" dans /tmp/lab/work/notes_lab_done.txt avec nano puis sauvegarde.',
        hint: '1) nano /tmp/lab/work/notes_lab_done.txt  2) archive terminee  3) /save  4) /exit',
        points: 140,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'nano') return false;
            if (parsed.args[0] !== '--save' || parsed.args[1] !== '/tmp/lab/work/notes_lab_done.txt') return false;
            if (lastResult?.nanoEvent?.action !== 'save') return false;
            const file = fs.readFile('/tmp/lab/work/notes_lab_done.txt');
            return !file.error && file.content.includes('archive terminee');
        },
    },

    // === LEVEL 4: Detective ===
    {
        id: 'grep-1',
        level: 4,
        title: 'Cherche le mot',
        description: 'Utilise grep pour trouver le mot "Error" dans /var/log/system.log.',
        hint: 'Tape : grep "Error" /var/log/system.log  (ou grep -i "error" pour ignorer la casse)',
        lesson: {
            title: 'La commande grep',
            content: `<b>grep</b> = <i>Global Regular Expression Print</i>

Cherche un mot ou un motif dans un fichier et affiche les lignes correspondantes.

<b>Syntaxe :</b> grep "motif" fichier

<span class="lesson-example">$ grep "Error" /var/log/system.log
[2024-01-15 11:22:33] Error: connection timeout</span>

<b>Flags utiles :</b>
<span class="lesson-example">-i  -> ignore majuscules/minuscules
-n  -> affiche les numeros de lignes
-r  -> cherche dans tous les fichiers d'un dossier</span>

<b>Exemples :</b>
<span class="lesson-example">$ grep -i "error" fichier.log   -> Error, ERROR, error...
$ grep -n "TODO" code.py       -> 5:# TODO: fix this
$ grep -r "password" /etc/     -> cherche partout</span>`,
        },
        points: 125,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'grep') return false;
            if (parsed.args.length < 2) return false;
            if (fs.resolvePath(parsed.args[1]) !== '/var/log/system.log') return false;
            return typeof lastResult?.output === 'string' && /error/i.test(lastResult.output);
        },
    },
    {
        id: 'find-1',
        level: 4,
        title: 'Trouve les .txt',
        description: 'Utilise find pour trouver tous les fichiers .txt depuis ton home (~).',
        hint: 'Tape : find ~ -name "*.txt"',
        lesson: {
            title: 'La commande find',
            content: `<b>find</b> cherche des fichiers dans une arborescence.

<b>Syntaxe :</b> find OuChercher -name "motif"

<span class="lesson-example">$ find ~ -name "*.txt"
/home/user/documents/notes.txt
/home/user/documents/todo.txt</span>

Le <b>*</b> est un joker qui remplace n'importe quoi :
<span class="lesson-example">*.txt     -> tous les fichiers .txt
hello*    -> tout ce qui commence par hello
*data*    -> tout ce qui contient data</span>

<b>Filtrer par type :</b>
<span class="lesson-example">-type f   -> fichiers seulement
-type d   -> dossiers seulement</span>

<b>Exemples :</b>
<span class="lesson-example">$ find . -name "*.py"         -> .py dans le dossier courant
$ find /etc -type f           -> tous les fichiers dans /etc
$ find ~ -name "*.log" -type f</span>`,
        },
        points: 125,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'find') return false;
            const startArg = parsed.args[0] || '.';
            if (fs.resolvePath(startArg) !== '/home/user') return false;

            const output = typeof lastResult?.output === 'string' ? lastResult.output.trim() : '';
            if (!output) return false;

            const lines = output.split('\n').map(line => line.trim()).filter(Boolean);
            if (lines.length === 0) return false;
            return lines.every(line => line.startsWith('/home/user/') && line.endsWith('.txt'));
        },
    },
    {
        id: 'head-1',
        level: 4,
        title: 'Les 3 premieres lignes',
        description: 'Affiche les 3 premieres lignes de /var/log/system.log avec head.',
        hint: 'Tape : head -n 3 /var/log/system.log',
        lesson: {
            title: 'Les commandes head et tail',
            content: `<b>head</b> affiche les <b>premieres</b> lignes d'un fichier.
<b>tail</b> affiche les <b>dernieres</b> lignes.

Par defaut : 10 lignes. Avec <b>-n</b> tu choisis le nombre.

<span class="lesson-example">$ head -n 3 fichier.log
-> Affiche les 3 premieres lignes

$ tail -n 5 fichier.log
-> Affiche les 5 dernieres lignes</span>

<b>Tres utile pour les fichiers de log !</b>
<span class="lesson-example">$ head -n 3 /var/log/system.log
[2024-01-15 08:00:01] System started
[2024-01-15 08:00:02] Network interface up
[2024-01-15 08:00:03] SSH service started</span>

Tu peux aussi les combiner avec un <b>pipe</b> :
<span class="lesson-example">$ cat fichier.txt | head -n 5</span>`,
        },
        points: 100,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'head') return false;
            const targetArg = parsed.args.find(arg => fs.resolvePath(arg) === '/var/log/system.log');
            if (!targetArg) return false;
            const output = typeof lastResult?.output === 'string' ? lastResult.output.trim() : '';
            if (!output) return false;
            return output.split('\n').length === 3;
        },
    },
    {
        id: 'wc-1',
        level: 4,
        title: 'Compte les lignes',
        description: 'Compte le nombre de lignes dans /var/log/auth.log avec wc.',
        hint: 'Tape : wc -l /var/log/auth.log',
        lesson: {
            title: 'La commande wc',
            content: `<b>wc</b> = <i>Word Count</i>

Compte les lignes, mots et caracteres d'un fichier.

<span class="lesson-example">$ wc fichier.txt
  10   45  320 fichier.txt
  ^    ^    ^
  |    |    caracteres
  |    mots
  lignes</span>

<b>Flags pour choisir quoi compter :</b>
<span class="lesson-example">-l  -> lignes seulement
-w  -> mots seulement
-c  -> caracteres seulement</span>

<b>Exemples :</b>
<span class="lesson-example">$ wc -l /var/log/auth.log
5 /var/log/auth.log

$ wc -w notes.txt
42 notes.txt</span>

Tres utile avec un <b>pipe</b> :
<span class="lesson-example">$ grep "Error" log.txt | wc -l
-> Compte les lignes contenant "Error"</span>`,
        },
        points: 100,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'wc') return false;
            const targetArg = parsed.args.find(arg => fs.resolvePath(arg) === '/var/log/auth.log');
            if (!targetArg) return false;

            const file = fs.readFile('/var/log/auth.log');
            if (file.error) return false;
            const expectedLineCount = file.content.split('\n').length;

            const output = typeof lastResult?.output === 'string' ? lastResult.output.trim() : '';
            if (!output) return false;

            const firstValue = parseInt(output.split(/\s+/)[0], 10);
            return Number.isFinite(firstValue) && firstValue === expectedLineCount;
        },
    },
    {
        id: 'grep-warning-n-1',
        level: 4,
        title: 'Warnings numerotes',
        description: 'Cherche "Warning" dans /var/log/system.log avec numerotation des lignes.',
        hint: 'Tape : grep -n "Warning" /var/log/system.log',
        points: 130,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'grep') return false;
            if (!parsed.flags.n || parsed.args.length < 2) return false;
            if (fs.resolvePath(parsed.args[1]) !== '/var/log/system.log') return false;
            return typeof lastResult?.output === 'string' && lastResult.output.includes('Warning');
        },
    },
    {
        id: 'grep-recursive-bonjour-1',
        level: 4,
        title: 'Recherche recursive',
        description: 'Cherche le mot "Bonjour" recursivement dans ton home.',
        hint: 'Tape : grep -r "Bonjour" ~',
        points: 140,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'grep') return false;
            if (!parsed.flags.r || parsed.args.length < 2) return false;
            if (fs.resolvePath(parsed.args[1]) !== '/home/user') return false;
            return typeof lastResult?.output === 'string' && lastResult.output.includes('Bonjour');
        },
    },
    {
        id: 'find-dirs-1',
        level: 4,
        title: 'Trouve les dossiers',
        description: 'Utilise find pour lister les dossiers de ton home avec -type d.',
        hint: 'Tape : find ~ -type d',
        points: 130,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'find') return false;
            const hasTypeD = parsed.args.includes('-type') && parsed.args.includes('d');
            if (!hasTypeD) return false;
            const output = typeof lastResult?.output === 'string' ? lastResult.output : '';
            return output.includes('/home/user/documents') && output.includes('/home/user/images');
        },
    },
    {
        id: 'find-py-1',
        level: 4,
        title: 'Fichiers Python',
        description: 'Trouve tous les fichiers .py depuis ton home.',
        hint: 'Tape : find ~ -name "*.py"',
        points: 130,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'find') return false;
            const hasNamePy = parsed.args.includes('-name') && parsed.args.includes('*.py');
            if (!hasNamePy) return false;
            const output = typeof lastResult?.output === 'string' ? lastResult.output : '';
            return output.includes('.py');
        },
    },
    {
        id: 'tail-auth-2-1',
        level: 4,
        title: 'Dernieres tentatives',
        description: 'Affiche les 2 dernieres lignes de /var/log/auth.log avec tail.',
        hint: 'Tape : tail -n 2 /var/log/auth.log',
        points: 120,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'tail') return false;
            const targetArg = parsed.args.find(arg => fs.resolvePath(arg) === '/var/log/auth.log');
            if (!targetArg) return false;
            const output = typeof lastResult?.output === 'string' ? lastResult.output.trim() : '';
            if (!output) return false;
            return output.split('\n').length === 2;
        },
    },
    {
        id: 'wc-readme-words-1',
        level: 4,
        title: 'Compte les mots',
        description: 'Compte les mots du fichier documents/readme.md avec wc -w.',
        hint: 'Tape : wc -w documents/readme.md',
        points: 120,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'wc') return false;
            if (!parsed.flags.w) return false;
            const targetArg = parsed.args.find(arg => fs.resolvePath(arg) === '/home/user/documents/readme.md');
            if (!targetArg) return false;
            const output = typeof lastResult?.output === 'string' ? lastResult.output.trim() : '';
            if (!output) return false;
            const count = parseInt(output.split(/\s+/)[0], 10);
            return Number.isFinite(count) && count > 0;
        },
    },
    {
        id: 'grep-failed-auth-1',
        level: 4,
        title: 'Echecs auth',
        description: 'Trouve les lignes contenant "Failed" dans /var/log/auth.log.',
        hint: 'Tape : grep "Failed" /var/log/auth.log',
        points: 130,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'grep') return false;
            if (parsed.args.length < 2 || fs.resolvePath(parsed.args[1]) !== '/var/log/auth.log') return false;
            return typeof lastResult?.output === 'string' && lastResult.output.includes('Failed');
        },
    },
    {
        id: 'head-passwd-2-1',
        level: 4,
        title: 'Debut de passwd',
        description: 'Affiche les 2 premieres lignes de /etc/passwd.',
        hint: 'Tape : head -n 2 /etc/passwd',
        points: 125,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'head') return false;
            const targetArg = parsed.args.find(arg => fs.resolvePath(arg) === '/etc/passwd');
            if (!targetArg) return false;
            const output = typeof lastResult?.output === 'string' ? lastResult.output.trim() : '';
            return output.split('\n').length === 2;
        },
    },
    {
        id: 'tail-system-1-1',
        level: 4,
        title: 'Derniere ligne systeme',
        description: 'Affiche la derniere ligne de /var/log/system.log.',
        hint: 'Tape : tail -n 1 /var/log/system.log',
        points: 125,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'tail') return false;
            const targetArg = parsed.args.find(arg => fs.resolvePath(arg) === '/var/log/system.log');
            if (!targetArg) return false;
            const output = typeof lastResult?.output === 'string' ? lastResult.output.trim() : '';
            return output.length > 0 && output.split('\n').length === 1;
        },
    },
    {
        id: 'less-system-1',
        level: 4,
        title: 'Lecture log avec less',
        description: 'Affiche /var/log/system.log avec less.',
        hint: 'Tape : less /var/log/system.log',
        points: 130,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'less') return false;
            const target = parsed.args[0] ? fs.resolvePath(parsed.args[0]) : '';
            return target === '/var/log/system.log' &&
                typeof lastResult?.output === 'string' &&
                lastResult.output.includes('System started');
        },
    },
    {
        id: 'wc-system-lines-1',
        level: 4,
        title: 'Compte system.log',
        description: 'Compte les lignes de /var/log/system.log avec wc -l.',
        hint: 'Tape : wc -l /var/log/system.log',
        points: 130,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'wc' || !parsed.flags.l) return false;
            const targetArg = parsed.args.find(arg => fs.resolvePath(arg) === '/var/log/system.log');
            if (!targetArg) return false;
            const file = fs.readFile('/var/log/system.log');
            if (file.error) return false;
            const expected = file.content.split('\n').length;
            const output = typeof lastResult?.output === 'string' ? lastResult.output.trim() : '';
            const count = parseInt(output.split(/\s+/)[0], 10);
            return Number.isFinite(count) && count === expected;
        },
    },
    {
        id: 'find-mtime-recent-4',
        level: 4,
        title: 'Logs recents',
        description: 'Trouve les fichiers .log modifies dans la derniere journee dans /var/log.',
        hint: 'Tape : find /var/log -name "*.log" -mtime -1',
        points: 140,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'find') return false;
            if (!(parsed.args.includes('-mtime') && parsed.args.includes('-1'))) return false;
            if (!(parsed.args.includes('-name') && parsed.args.includes('*.log'))) return false;
            const output = typeof lastResult?.output === 'string' ? lastResult.output : '';
            return output.includes('/var/log/system.log');
        },
    },
    {
        id: 'nano-note-report-4',
        level: 4,
        title: 'Note d analyse',
        description: 'Ajoute "Analyse grep OK" dans documents/rapport.txt avec nano puis sauvegarde.',
        hint: '1) nano documents/rapport.txt  2) Analyse grep OK  3) /save  4) /exit',
        points: 145,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'nano') return false;
            if (parsed.args[0] !== '--save' || parsed.args[1] !== '/home/user/documents/rapport.txt') return false;
            if (lastResult?.nanoEvent?.action !== 'save') return false;
            const file = fs.readFile('/home/user/documents/rapport.txt');
            return !file.error && file.content.includes('Analyse grep OK');
        },
    },

    // === LEVEL 5: Expert ===
    {
        id: 'chmod-1',
        level: 5,
        title: 'Permissions',
        description: 'Change les permissions du fichier documents/rapport.txt en 755 (rwxr-xr-x).',
        hint: 'Tape : chmod 755 documents/rapport.txt',
        lesson: {
            title: 'chmod et les permissions',
            content: `Sous Linux, chaque fichier a des <b>permissions</b> : qui peut lire, ecrire ou executer.

<b>3 types :</b>  r (read) / w (write) / x (execute)
<b>3 groupes :</b> proprietaire / groupe / autres

<span class="lesson-example">rwxr-xr-x = proprio: rwx, groupe: r-x, autres: r-x</span>

<b>chmod</b> utilise des chiffres (0 a 7) :
<span class="lesson-example">4 = lire (r)
2 = ecrire (w)
1 = executer (x)
-> On additionne !</span>

<b>Exemples courants :</b>
<span class="lesson-example">chmod 755 fichier  -> rwxr-xr-x (script executable)
chmod 644 fichier  -> rw-r--r-- (fichier normal)
chmod 700 fichier  -> rwx------ (prive)</span>

<b>Syntaxe :</b> chmod MODE fichier
<span class="lesson-example">$ chmod 755 documents/rapport.txt</span>`,
        },
        points: 150,
        validate(fs, history, lastCmd) {
            const node = fs.getNode('/home/user/documents/rapport.txt');
            return node && node.permissions === 'rwxr-xr-x';
        },
    },
    {
        id: 'least-privilege-bonuses-1',
        level: 5,
        title: 'Least privilege RH',
        description: 'Le fichier documents/bonuses.txt est en rw-rw----. Retire rw au groupe avec chmod symbolique.',
        hint: 'Tape : chmod g-rw documents/bonuses.txt',
        lesson: {
            title: 'Principe du moindre privilege',
            content: `Le <b>principe du moindre privilege</b> consiste a donner uniquement les droits necessaires.

Ici, <b>bonuses.txt</b> contient des donnees sensibles et le groupe a trop de droits :
<span class="lesson-example">rw-rw----</span>

Pour retirer lecture/ecriture au groupe, utilise <b>chmod symbolique</b> :
<span class="lesson-example">$ chmod g-rw documents/bonuses.txt</span>

Le resultat attendu devient :
<span class="lesson-example">rw-------</span>`,
        },
        points: 170,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'chmod') return false;
            const mode = parsed.args[0] || '';
            const target = parsed.args[1] ? fs.resolvePath(parsed.args[1]) : '';
            if (target !== '/home/user/documents/bonuses.txt') return false;
            if (!mode.includes('g-rw')) return false;
            const node = fs.getNode('/home/user/documents/bonuses.txt');
            return !!node && node.permissions === 'rw-------';
        },
    },
    {
        id: 'pipe-1',
        level: 5,
        title: 'Enchaine les commandes',
        description: 'Utilise un pipe (|) pour enchainer deux commandes. Ex: cat fichier | grep mot.',
        hint: 'Tape : cat /var/log/system.log | grep "Warning"',
        lesson: {
            title: 'Le pipe |',
            content: `Le <b>pipe</b> <b>|</b> connecte la sortie d'une commande a l'entree d'une autre.

C'est comme un tuyau : la sortie de gauche coule dans l'entree de droite.

<span class="lesson-example">commande1 | commande2</span>

<b>Exemple concret :</b>
<span class="lesson-example">$ cat system.log | grep "Warning"
-> cat affiche tout le fichier
-> grep filtre et ne garde que les "Warning"</span>

<b>On peut enchainer plusieurs pipes :</b>
<span class="lesson-example">$ cat fichier | grep "mot" | wc -l
-> Lit le fichier
-> Filtre les lignes avec "mot"
-> Compte ces lignes</span>

C'est un des concepts <b>les plus puissants</b> de Linux !`,
        },
        points: 150,
        validate(fs, history, lastCmd, lastResult, parsed) {
            return !!parsed && parsed.type === 'pipe' && parsed.commands.length >= 2;
        },
    },
    {
        id: 'pipe-wc',
        level: 5,
        title: 'Detective expert',
        description: 'Compte le nombre de lignes contenant "Failed" dans /var/log/auth.log en utilisant grep et wc.',
        hint: 'Tape : grep "Failed" /var/log/auth.log | wc -l',
        lesson: {
            title: 'Combiner grep + wc avec un pipe',
            content: `Maintenant on combine ce que tu as appris !

<b>Objectif :</b> compter combien de fois "Failed" apparait dans auth.log.

<b>Etape par etape :</b>
<span class="lesson-example">1. grep "Failed" /var/log/auth.log
   -> Filtre les lignes contenant "Failed"

2. | wc -l
   -> Compte le nombre de ces lignes</span>

<b>Commande complete :</b>
<span class="lesson-example">$ grep "Failed" /var/log/auth.log | wc -l
3</span>

<b>Autre exemple utile :</b>
<span class="lesson-example">$ grep -i "error" system.log | wc -l
-> Combien d'erreurs dans le log ?</span>

Ce genre de commande est utilise <b>quotidiennement</b> par les administrateurs systeme !`,
        },
        points: 175,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'pipe' || parsed.commands.length < 2) return false;

            const commandNames = parsed.commands.map(cmd => cmd.command);
            if (!commandNames.includes('grep') || !commandNames.includes('wc')) return false;

            const grepCmd = parsed.commands.find(cmd => cmd.command === 'grep');
            if (!grepCmd || grepCmd.args.length < 2) return false;
            if (fs.resolvePath(grepCmd.args[1]) !== '/var/log/auth.log') return false;

            const file = fs.readFile('/var/log/auth.log');
            if (file.error) return false;
            const expectedCount = file.content.split('\n').filter(line => line.includes('Failed')).length;

            const output = typeof lastResult?.output === 'string' ? lastResult.output.trim() : '';
            if (!output) return false;

            const count = parseInt(output.split(/\s+/)[0], 10);
            return Number.isFinite(count) && count === expectedCount;
        },
    },
    {
        id: 'chmod-hello-700-1',
        level: 5,
        title: 'Permission stricte',
        description: 'Passe le fichier documents/projets/python/hello.py en permission 700.',
        hint: 'Tape : chmod 700 documents/projets/python/hello.py',
        points: 150,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'chmod') return false;
            const node = fs.getNode('/home/user/documents/projets/python/hello.py');
            return !!node && node.permissions === 'rwx------';
        },
    },
    {
        id: 'chmod-hello-755-1',
        level: 5,
        title: 'Permission executable',
        description: 'Repasse hello.py en 755.',
        hint: 'Tape : chmod 755 documents/projets/python/hello.py',
        points: 150,
        validate(fs) {
            const node = fs.getNode('/home/user/documents/projets/python/hello.py');
            return !!node && node.permissions === 'rwxr-xr-x';
        },
    },
    {
        id: 'pipe-warning-first-1',
        level: 5,
        title: 'Premier warning',
        description: 'Affiche le premier warning de system.log avec cat | grep | head.',
        hint: 'Tape : cat /var/log/system.log | grep "Warning" | head -n 1',
        points: 170,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'pipe' || parsed.commands.length < 3) return false;
            const names = parsed.commands.map(cmd => cmd.command);
            if (names[0] !== 'cat' || names[1] !== 'grep' || names[2] !== 'head') return false;
            const catCmd = parsed.commands[0];
            if (!catCmd.args[0] || fs.resolvePath(catCmd.args[0]) !== '/var/log/system.log') return false;
            return typeof lastResult?.output === 'string' && lastResult.output.includes('Warning');
        },
    },
    {
        id: 'pipe-failed-last-1',
        level: 5,
        title: 'Dernier failed',
        description: 'Affiche la derniere ligne Failed de auth.log avec grep | tail.',
        hint: 'Tape : grep "Failed" /var/log/auth.log | tail -n 1',
        points: 170,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'pipe' || parsed.commands.length < 2) return false;
            const names = parsed.commands.map(cmd => cmd.command);
            if (names[0] !== 'grep' || names[1] !== 'tail') return false;
            const grepCmd = parsed.commands[0];
            if (!grepCmd.args[1] || fs.resolvePath(grepCmd.args[1]) !== '/var/log/auth.log') return false;
            return typeof lastResult?.output === 'string' && lastResult.output.includes('Failed');
        },
    },
    {
        id: 'history-review-1',
        level: 5,
        title: 'Relis tes commandes',
        description: 'Affiche ton historique recent avec history.',
        hint: 'Tape : history',
        points: 140,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'history') return false;
            const output = typeof lastResult?.output === 'string' ? lastResult.output.trim() : '';
            if (!output) return false;
            return output.split('\n').length >= 5;
        },
    },
    {
        id: 'pipe-error-count-1',
        level: 5,
        title: 'Compte les erreurs',
        description: 'Compte les lignes "error" de system.log avec grep -i et wc -l.',
        hint: 'Tape : grep -i "error" /var/log/system.log | wc -l',
        points: 180,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'pipe' || parsed.commands.length < 2) return false;
            const commandNames = parsed.commands.map(cmd => cmd.command);
            if (!commandNames.includes('grep') || !commandNames.includes('wc')) return false;

            const grepCmd = parsed.commands.find(cmd => cmd.command === 'grep');
            if (!grepCmd || !grepCmd.flags.i || grepCmd.args.length < 2) return false;
            if (fs.resolvePath(grepCmd.args[1]) !== '/var/log/system.log') return false;

            const output = typeof lastResult?.output === 'string' ? lastResult.output.trim() : '';
            if (!output) return false;
            const count = parseInt(output.split(/\s+/)[0], 10);
            return Number.isFinite(count) && count >= 1;
        },
    },
    {
        id: 'man-chmod-1',
        level: 5,
        title: 'Manuel chmod',
        description: 'Consulte le manuel de chmod.',
        hint: 'Tape : man chmod',
        points: 120,
        validate(fs, history, lastCmd, lastResult, parsed) {
            return !!parsed &&
                parsed.type === 'command' &&
                parsed.command === 'man' &&
                parsed.args[0] === 'chmod' &&
                typeof lastResult?.output === 'string' &&
                lastResult.output.includes('change file permissions');
        },
    },
    {
        id: 'pipe-find-head-1',
        level: 5,
        title: 'Echantillon de fichiers',
        description: 'Affiche 2 resultats de fichiers .txt avec find puis head via un pipe.',
        hint: 'Tape : find ~ -name "*.txt" | head -n 2',
        points: 170,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'pipe' || parsed.commands.length < 2) return false;
            const [first, second] = parsed.commands;
            if (!first || !second || first.command !== 'find' || second.command !== 'head') return false;
            if (!(first.args.includes('-name') && first.args.includes('*.txt'))) return false;
            const output = typeof lastResult?.output === 'string' ? lastResult.output.trim() : '';
            return output && output.split('\n').length === 2;
        },
    },
    {
        id: 'pipe-grep-less-1',
        level: 5,
        title: 'Filtre puis lis',
        description: 'Utilise grep puis less en pipe sur system.log pour lire les warnings.',
        hint: 'Tape : grep "Warning" /var/log/system.log | less',
        points: 170,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'pipe' || parsed.commands.length < 2) return false;
            const [first, second] = parsed.commands;
            if (!first || !second || first.command !== 'grep' || second.command !== 'less') return false;
            if (!first.args[1] || fs.resolvePath(first.args[1]) !== '/var/log/system.log') return false;
            return typeof lastResult?.output === 'string' && lastResult.output.includes('Warning');
        },
    },
    {
        id: 'chmod-rapport-644-1',
        level: 5,
        title: 'Rapport en lecture',
        description: 'Passe documents/rapport.txt en permission 644.',
        hint: 'Tape : chmod 644 documents/rapport.txt',
        points: 150,
        validate(fs) {
            const node = fs.getNode('/home/user/documents/rapport.txt');
            return !!node && node.permissions === 'rw-r--r--';
        },
    },
    {
        id: 'chmod-rapport-755-restore-1',
        level: 5,
        title: 'Rapport executable',
        description: 'Remets documents/rapport.txt en 755.',
        hint: 'Tape : chmod 755 documents/rapport.txt',
        points: 150,
        validate(fs) {
            const node = fs.getNode('/home/user/documents/rapport.txt');
            return !!node && node.permissions === 'rwxr-xr-x';
        },
    },
    {
        id: 'less-passwd-1',
        level: 5,
        title: 'Lecture de passwd',
        description: 'Affiche /etc/passwd avec less.',
        hint: 'Tape : less /etc/passwd',
        points: 140,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'less') return false;
            const target = parsed.args[0] ? fs.resolvePath(parsed.args[0]) : '';
            return target === '/etc/passwd' &&
                typeof lastResult?.output === 'string' &&
                lastResult.output.includes('user:x:1000:1000');
        },
    },
    {
        id: 'pipe-find-iname-5',
        level: 5,
        title: 'Pipe + iname',
        description: 'Utilise find -iname puis grep pour ne garder que les fichiers .md.',
        hint: 'Tape : find ~ -iname "*readme*" | grep ".md"',
        points: 180,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'pipe' || parsed.commands.length < 2) return false;
            const [first, second] = parsed.commands;
            if (!first || !second || first.command !== 'find' || second.command !== 'grep') return false;
            if (!(first.args.includes('-iname') && first.args.includes('*readme*'))) return false;
            const output = typeof lastResult?.output === 'string' ? lastResult.output : '';
            return output.toLowerCase().includes('readme.md');
        },
    },
    {
        id: 'nano-create-script-5',
        level: 5,
        title: 'Script avec nano',
        description: 'Cree mon_projet/audit.sh avec nano, ajoute un shebang et une ligne echo, puis sauvegarde.',
        hint: '1) nano mon_projet/audit.sh  2) #!/bin/bash  3) echo "audit ok"  4) /save  5) /exit',
        points: 185,
        validate(fs, history, lastCmd, lastResult, parsed) {
            if (!parsed || parsed.type !== 'command' || parsed.command !== 'nano') return false;
            if (parsed.args[0] !== '--save' || parsed.args[1] !== '/home/user/mon_projet/audit.sh') return false;
            if (lastResult?.nanoEvent?.action !== 'save') return false;
            const file = fs.readFile('/home/user/mon_projet/audit.sh');
            if (file.error) return false;
            return file.content.includes('#!/bin/bash') && file.content.includes('audit ok');
        },
    },
    {
        id: 'final',
        level: 5,
        title: 'Mission finale',
        description: 'Trouve tous les fichiers .py, lis-en un, et copie-le dans ton home. Trois commandes !',
        hint: '1. find ~ -name "*.py"\n2. cat ~/documents/projets/python/hello.py\n3. cp ~/documents/projets/python/hello.py ~/',
        lesson: {
            title: 'Combiner tout ce que tu sais !',
            content: `C'est la mission finale ! Tu dois utiliser <b>3 commandes</b> successives.

<b>Etape 1 : Trouve les fichiers .py</b>
<span class="lesson-example">$ find ~ -name "*.py"
-> Liste tous les fichiers Python dans ton home</span>

<b>Etape 2 : Lis-en un</b>
<span class="lesson-example">$ cat chemin/vers/fichier.py
-> Affiche le contenu du script</span>

<b>Etape 3 : Copie-le dans ton home</b>
<span class="lesson-example">$ cp chemin/vers/fichier.py ~/
-> Copie le fichier a la racine de ton home</span>

<b>Rappel des chemins :</b>
<span class="lesson-example">~  = /home/user
~/ = dans le home (destination)</span>

Tu as toutes les connaissances, c'est le moment de briller !`,
        },
        points: 200,
        validate(fs) {
            const home = fs.getNode('/home/user');
            if (!home) return false;
            return Object.keys(home.children).some(name => name.endsWith('.py'));
        },
    },
];
