const DEFAULT_USER_PREFERENCES = Object.freeze({
    notifications: Object.freeze({
        email: true,
        push: true,
        marketing: false,
    }),
    privacy: Object.freeze({
        profileVisibility: 'public',
        showEmail: false,
    }),
    appearance: Object.freeze({
        language: 'en',
        theme: 'system',
    }),
});

const cloneDefaultUserPreferences = () => ({
    notifications: {
        ...DEFAULT_USER_PREFERENCES.notifications,
    },
    privacy: {
        ...DEFAULT_USER_PREFERENCES.privacy,
    },
    appearance: {
        ...DEFAULT_USER_PREFERENCES.appearance,
    },
});

const normalizeBoolean = (value, fallback) => {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    if (value === true || value === 'true') {
        return true;
    }

    if (value === false || value === 'false') {
        return false;
    }

    return fallback;
};

const normalizeLanguage = (value, fallback) => {
    if (typeof value !== 'string') {
        return fallback;
    }

    const normalizedValue = value.trim().toLowerCase();
    return normalizedValue || fallback;
};

const assertAllowedEnum = (value, allowedValues, fieldName) => {
    if (!allowedValues.includes(value)) {
        throw new Error(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
    }

    return value;
};

const buildUserPreferences = (value = {}) => {
    const source = value && typeof value === 'object' ? value : {};
    const nextPreferences = cloneDefaultUserPreferences();

    nextPreferences.notifications.email = normalizeBoolean(
        source.notifications?.email,
        nextPreferences.notifications.email
    );
    nextPreferences.notifications.push = normalizeBoolean(
        source.notifications?.push,
        nextPreferences.notifications.push
    );
    nextPreferences.notifications.marketing = normalizeBoolean(
        source.notifications?.marketing,
        nextPreferences.notifications.marketing
    );

    const privacyVisibility = source.privacy?.profileVisibility;
    if (typeof privacyVisibility === 'string' && privacyVisibility.trim()) {
        nextPreferences.privacy.profileVisibility = ['public', 'private'].includes(privacyVisibility.trim())
            ? privacyVisibility.trim()
            : nextPreferences.privacy.profileVisibility;
    }

    nextPreferences.privacy.showEmail = normalizeBoolean(
        source.privacy?.showEmail,
        nextPreferences.privacy.showEmail
    );

    nextPreferences.appearance.language = normalizeLanguage(
        source.appearance?.language,
        nextPreferences.appearance.language
    );

    const theme = source.appearance?.theme;
    if (typeof theme === 'string' && theme.trim()) {
        nextPreferences.appearance.theme = ['light', 'dark', 'system'].includes(theme.trim())
            ? theme.trim()
            : nextPreferences.appearance.theme;
    }

    return nextPreferences;
};

const applyUserPreferencesUpdate = (user, updates = {}) => {
    if (!updates || typeof updates !== 'object') {
        return;
    }

    const nextPreferences = buildUserPreferences(user.preferences);

    if (updates.notifications && typeof updates.notifications === 'object') {
        if (Object.prototype.hasOwnProperty.call(updates.notifications, 'email')) {
            nextPreferences.notifications.email = normalizeBoolean(
                updates.notifications.email,
                nextPreferences.notifications.email
            );
        }

        if (Object.prototype.hasOwnProperty.call(updates.notifications, 'push')) {
            nextPreferences.notifications.push = normalizeBoolean(
                updates.notifications.push,
                nextPreferences.notifications.push
            );
        }

        if (Object.prototype.hasOwnProperty.call(updates.notifications, 'marketing')) {
            nextPreferences.notifications.marketing = normalizeBoolean(
                updates.notifications.marketing,
                nextPreferences.notifications.marketing
            );
        }
    }

    if (updates.privacy && typeof updates.privacy === 'object') {
        if (Object.prototype.hasOwnProperty.call(updates.privacy, 'profileVisibility')) {
            const value = String(updates.privacy.profileVisibility || '').trim();
            nextPreferences.privacy.profileVisibility = assertAllowedEnum(
                value,
                ['public', 'private'],
                'Privacy profileVisibility'
            );
        }

        if (Object.prototype.hasOwnProperty.call(updates.privacy, 'showEmail')) {
            nextPreferences.privacy.showEmail = normalizeBoolean(
                updates.privacy.showEmail,
                nextPreferences.privacy.showEmail
            );
        }
    }

    if (updates.appearance && typeof updates.appearance === 'object') {
        if (Object.prototype.hasOwnProperty.call(updates.appearance, 'language')) {
            nextPreferences.appearance.language = normalizeLanguage(
                updates.appearance.language,
                nextPreferences.appearance.language
            );
        }

        if (Object.prototype.hasOwnProperty.call(updates.appearance, 'theme')) {
            const value = String(updates.appearance.theme || '').trim();
            nextPreferences.appearance.theme = assertAllowedEnum(
                value,
                ['light', 'dark', 'system'],
                'Appearance theme'
            );
        }
    }

    user.preferences = nextPreferences;
};

module.exports = {
    DEFAULT_USER_PREFERENCES,
    applyUserPreferencesUpdate,
    buildUserPreferences,
    cloneDefaultUserPreferences,
};
