const STORAGE_KEY = 'linux-game-save';
const STORAGE_VERSION = 1;

function isLegacyPayload(data) {
    return !!data
        && typeof data === 'object'
        && ('completed' in data || 'score' in data || 'filesystem' in data);
}

export const storage = {
    save(data) {
        try {
            const payload = {
                version: STORAGE_VERSION,
                savedAt: Date.now(),
                data,
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (e) {
            console.warn('Failed to save progress:', e);
        }
    },

    load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;

            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                if (parsed.version === STORAGE_VERSION && parsed.data && typeof parsed.data === 'object') {
                    return parsed.data;
                }
                if (isLegacyPayload(parsed)) {
                    return parsed;
                }
            }

            return null;
        } catch (e) {
            console.warn('Failed to load progress:', e);
            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch (cleanupError) {
                // Ignore cleanup errors.
            }
            return null;
        }
    },

    clear() {
        localStorage.removeItem(STORAGE_KEY);
    },
};
