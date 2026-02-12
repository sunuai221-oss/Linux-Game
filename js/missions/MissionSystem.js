import { missions, levels } from './levels.js';
import { storage } from './storage.js';

export class MissionSystem {
    constructor(fs, i18n = null) {
        this.fs = fs;
        this.i18n = i18n;
        this.baseMissions = missions;
        this.baseLevels = levels;
        this.missions = missions;
        this.levels = levels;
        this.completed = new Set();
        this.score = 0;
        this.hintsUsed = new Set();
        this.currentMissionIndex = 0;
        this.freeMode = false;
        this.commandHistory = [];

        this._applyLocalization();
        this._loadProgress();
        this._ensurePermissionLessonFixtures();
        this._renderMissions();
        this._updateHeader();
    }

    // Called after each command execution
    onCommand(input, parsed, result) {
        if (this.freeMode) return;
        if (!parsed) return;
        const mission = this.missions[this.currentMissionIndex];
        if (!mission || this.completed.has(mission.id)) return;
        if (result && result.isError && !mission.acceptErrorResult) return;

        this.commandHistory.push(input);

        try {
            const isCompleted = mission.validate(
                this.fs,
                this.commandHistory,
                input.trim(),
                result,
                parsed
            );

            if (isCompleted) {
                this._completeMission(mission);
            }
        } catch (e) {
            console.warn(`[MissionSystem] Validation error for mission '${mission.id}':`, e);
        }
    }

    _completeMission(mission) {
        this.completed.add(mission.id);

        // Calculate points (bonus if no hint used)
        let points = mission.points;
        if (this.hintsUsed.has(mission.id)) {
            points = Math.floor(points * 0.6);
        }
        this.score += points;

        // Move to next mission
        this._advanceToNext();
        this._renderMissions();
        this._updateHeader();
        this._saveProgress();
        this._showCompletionToast(mission.title, points);
    }

    _advanceToNext() {
        for (let i = 0; i < this.missions.length; i++) {
            if (!this.completed.has(this.missions[i].id)) {
                this.currentMissionIndex = i;
                return;
            }
        }
        this.currentMissionIndex = this.missions.length; // All done
    }

    _renderMissions() {
        const container = document.getElementById('missions-list');
        container.innerHTML = '';

        for (const level of this.levels) {
            const levelMissions = this.missions.filter(m => m.level === level.id);
            const group = document.createElement('div');
            group.className = 'level-group';

            const title = document.createElement('div');
            title.className = 'level-group-title';
            title.textContent = this._t(
                'mission.levelGroupTitle',
                `Level ${level.id} - ${level.name}`,
                { level: level.id, name: level.name }
            );
            group.appendChild(title);

            for (const mission of levelMissions) {
                const card = this._createMissionCard(mission);
                group.appendChild(card);
            }

            container.appendChild(group);
        }

        // Hint section
        const hintSection = document.createElement('div');
        hintSection.className = 'hint-section';

        const hintBtn = document.createElement('button');
        hintBtn.className = 'btn-hint';
        hintBtn.textContent = this._t('ui.showHint', 'Show hint');
        hintBtn.id = 'hint-btn';

        const current = this.missions[this.currentMissionIndex];
        hintBtn.disabled = !current || this.completed.has(current?.id);

        hintBtn.addEventListener('click', () => this._showHint());
        hintSection.appendChild(hintBtn);

        const hintText = document.createElement('div');
        hintText.className = 'hint-text';
        hintText.id = 'hint-text';
        hintText.style.display = 'none';
        hintSection.appendChild(hintText);

        container.appendChild(hintSection);
    }

    _createMissionCard(mission) {
        const isCompleted = this.completed.has(mission.id);
        const isCurrent = this.missions[this.currentMissionIndex]?.id === mission.id;
        const isLocked = !isCompleted && !isCurrent && this._isMissionLocked(mission);

        const wrapper = document.createElement('div');
        wrapper.className = 'mission-wrapper';

        const card = document.createElement('div');
        card.className = 'mission-card';
        if (isCompleted) card.classList.add('completed');
        if (isCurrent && !this.freeMode) card.classList.add('active');
        if (isLocked) card.classList.add('locked');

        const icon = document.createElement('span');
        icon.className = 'mission-icon';
        icon.textContent = isCompleted ? '\u2705' : (isCurrent ? '\uD83D\uDD35' : '\uD83D\uDD12');

        const info = document.createElement('div');
        info.className = 'mission-info';

        const titleRow = document.createElement('div');
        titleRow.className = 'mission-title-row';

        const title = document.createElement('span');
        title.className = 'mission-title';
        title.textContent = mission.title;

        titleRow.appendChild(title);

        // Lesson button (only if not locked and lesson exists)
        if (mission.lesson && !isLocked) {
            const lessonBtn = document.createElement('button');
            lessonBtn.className = 'btn-lesson';
            lessonBtn.textContent = '\uD83D\uDCD6';
            lessonBtn.title = this._t('ui.viewLesson', 'View lesson');
            lessonBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._toggleLesson(mission.id, wrapper);
            });
            titleRow.appendChild(lessonBtn);
        }

        const desc = document.createElement('div');
        desc.className = 'mission-desc';
        desc.textContent = mission.description;

        info.appendChild(titleRow);
        if (isCurrent || isCompleted) info.appendChild(desc);

        const points = document.createElement('span');
        points.className = 'mission-points';
        points.textContent = isCompleted
            ? (this.hintsUsed.has(mission.id) ? `${Math.floor(mission.points * 0.6)}` : `${mission.points}`)
            : `${mission.points} pts`;

        card.appendChild(icon);
        card.appendChild(info);
        card.appendChild(points);

        wrapper.appendChild(card);

        // Hidden lesson card
        if (mission.lesson && !isLocked) {
            const lessonCard = document.createElement('div');
            lessonCard.className = 'lesson-card';
            lessonCard.id = `lesson-${mission.id}`;
            lessonCard.style.display = 'none';

            const lessonHeader = document.createElement('div');
            lessonHeader.className = 'lesson-header';

            const lessonTitle = document.createElement('span');
            lessonTitle.className = 'lesson-title';
            lessonTitle.textContent = mission.lesson.title;

            const closeBtn = document.createElement('button');
            closeBtn.className = 'lesson-close';
            closeBtn.textContent = '\u2715';
            closeBtn.addEventListener('click', () => {
                lessonCard.style.display = 'none';
            });

            lessonHeader.appendChild(lessonTitle);
            lessonHeader.appendChild(closeBtn);

            const lessonBody = document.createElement('div');
            lessonBody.className = 'lesson-body';
            lessonBody.innerHTML = mission.lesson.content;

            lessonCard.appendChild(lessonHeader);
            lessonCard.appendChild(lessonBody);
            wrapper.appendChild(lessonCard);
        }

        return wrapper;
    }

    _toggleLesson(missionId, wrapper) {
        const lessonCard = wrapper.querySelector(`#lesson-${missionId}`);
        if (!lessonCard) return;

        // Close all other open lessons
        document.querySelectorAll('.lesson-card').forEach(card => {
            if (card.id !== `lesson-${missionId}`) {
                card.style.display = 'none';
            }
        });

        // Toggle this one
        lessonCard.style.display = lessonCard.style.display === 'none' ? 'block' : 'none';
    }

    _isMissionLocked(mission) {
        // A mission is locked if the previous mission in same level is not completed
        const sameLevelMissions = this.missions.filter(m => m.level === mission.level);
        const index = sameLevelMissions.indexOf(mission);
        if (index === 0) {
            // First mission of a level: locked if previous level not fully completed
            if (mission.level === 1) return false;
            const prevLevelMissions = this.missions.filter(m => m.level === mission.level - 1);
            return prevLevelMissions.some(m => !this.completed.has(m.id));
        }
        return !this.completed.has(sameLevelMissions[index - 1].id);
    }

    _showHint() {
        const mission = this.missions[this.currentMissionIndex];
        if (!mission) return;

        this.hintsUsed.add(mission.id);
        this._saveProgress();

        const hintText = document.getElementById('hint-text');
        hintText.textContent = mission.hint;
        hintText.style.display = 'block';
    }

    _showCompletionToast(title, points) {
        const toast = document.createElement('div');
        toast.className = 'mission-complete-toast';
        toast.textContent = this._t('ui.missionCompleted', 'Mission completed! "{title}" +{points} pts', { title, points });
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);

        // Hide hint
        const hintText = document.getElementById('hint-text');
        if (hintText) hintText.style.display = 'none';
    }

    _updateHeader() {
        const currentLevel = this.missions[this.currentMissionIndex]?.level || 5;
        const levelInfo = this.levels.find(l => l.id === currentLevel);

        document.getElementById('level-badge').textContent = this._t('ui.levelBadge', 'Level {level}', { level: currentLevel });
        document.getElementById('level-name').textContent = levelInfo?.name || this._t('ui.levelDone', 'Completed!');
        document.getElementById('score-display').textContent = `${this.score} ${this._t('ui.pointsSuffix', 'pts')}`;

        const completedCount = this.completed.size;
        const totalCount = this.missions.length;
        const percent = Math.round((completedCount / totalCount) * 100);

        document.getElementById('progress-fill').style.width = `${percent}%`;
        document.getElementById('progress-text').textContent = `${completedCount} / ${totalCount}`;
    }

    setFreeMode(enabled) {
        this.freeMode = enabled;
        this._renderMissions();
    }

    setLanguage() {
        this._applyLocalization();
        this._renderMissions();
        this._updateHeader();
    }

    _saveProgress() {
        storage.save({
            completed: [...this.completed],
            score: this.score,
            hintsUsed: [...this.hintsUsed],
            currentMissionIndex: this.currentMissionIndex,
            filesystem: this.fs.serialize(),
        });
    }

    _loadProgress() {
        const data = storage.load();
        if (!data || typeof data !== 'object') return;

        this.completed = new Set(Array.isArray(data.completed) ? data.completed : []);
        this.score = Number.isFinite(data.score) ? data.score : 0;
        this.hintsUsed = new Set(Array.isArray(data.hintsUsed) ? data.hintsUsed : []);
        this.currentMissionIndex = Number.isInteger(data.currentMissionIndex) && data.currentMissionIndex >= 0
            ? data.currentMissionIndex
            : 0;
        if (this.currentMissionIndex > this.missions.length) {
            this.currentMissionIndex = this.missions.length;
        }

        if (data.filesystem) {
            try {
                const restored = this.fs.restore(data.filesystem);
                if (restored && restored.error) {
                    console.warn('[MissionSystem] Ignoring corrupted filesystem snapshot:', restored.error);
                    this.completed = new Set();
                    this.score = 0;
                    this.hintsUsed = new Set();
                    this.currentMissionIndex = 0;
                    storage.clear();
                    return;
                }
            } catch (error) {
                console.warn('[MissionSystem] Failed to restore filesystem snapshot:', error);
                this.completed = new Set();
                this.score = 0;
                this.hintsUsed = new Set();
                this.currentMissionIndex = 0;
                storage.clear();
                return;
            }
        }

        // Re-advance to find next uncompleted
        this._advanceToNext();
    }

    _ensurePermissionLessonFixtures() {
        const bonusesPath = '/home/user/documents/bonuses.txt';
        let node = this.fs.getNode(bonusesPath);
        let createdFresh = false;

        if (!node) {
            const content = 'Bonus RH - Confidentiel\nAlice: 1200\nBob: 900\nCharlie: 600';
            const created = this.fs.createFile(bonusesPath, content);
            if (!created.error) {
                node = this.fs.getNode(bonusesPath);
                createdFresh = true;
            }
        }

        if (node && node.type === 'file') {
            if (createdFresh) {
                node.owner = 'user';
                node.group = 'hr';
                node.permissions = 'rw-rw----';
            } else {
                if (!node.owner) node.owner = 'user';
                if (!node.group) node.group = 'hr';
                if (!node.permissions) node.permissions = 'rw-rw----';
            }
        }
    }

    reset() {
        this.completed = new Set();
        this.score = 0;
        this.hintsUsed = new Set();
        this.currentMissionIndex = 0;
        this.commandHistory = [];
        storage.clear();
    }

    _applyLocalization() {
        if (!this.i18n) {
            this.missions = this.baseMissions;
            this.levels = this.baseLevels;
            return;
        }

        this.levels = this.i18n.localizeLevels(this.baseLevels);
        this.missions = this.i18n.localizeMissions(this.baseMissions);
        this._advanceToNext();
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
