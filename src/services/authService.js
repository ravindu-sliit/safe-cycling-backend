// src/services/authService.js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const TWO_FACTOR_CODE_TTL_MS = 10 * 60 * 1000;
const TWO_FACTOR_RESEND_COOLDOWN_MS = 30 * 1000;
const TWO_FACTOR_MAX_ATTEMPTS = 5;
const AUTH_USER_SELECT = [
    'name',
    'email',
    'password',
    'role',
    'cyclingStyle',
    'profileImageUrl',
    'preferences',
    'isVerified',
    'verificationToken',
    'resetPasswordToken',
    'resetPasswordExpire',
    'twoFactorEnabled',
    'createdAt',
    'updatedAt',
    '+twoFactorCode',
    '+twoFactorCodeExpire',
    '+twoFactorChallengeToken',
    '+twoFactorChallengeExpire',
    '+twoFactorAttempts',
    '+twoFactorLastSentAt',
].join(' ');

const normalizeEmail = (value) => String(value || '').trim();
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizeTwoFactorCode = (value) => String(value || '').replace(/\s+/g, '').trim();
const hashValue = (value) => crypto.createHash('sha256').update(String(value || '')).digest('hex');

const createServiceError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const signAuthToken = (user) => jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
);

const clearTwoFactorState = (user) => {
    user.twoFactorCode = undefined;
    user.twoFactorCodeExpire = undefined;
    user.twoFactorChallengeToken = undefined;
    user.twoFactorChallengeExpire = undefined;
    user.twoFactorAttempts = 0;
    user.twoFactorLastSentAt = undefined;
};

const findUserByEmailInsensitive = async (email) => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
        return null;
    }

    return await User.findOne({
        email: new RegExp(`^${escapeRegExp(normalizedEmail)}$`, 'i'),
    });
};

const generateVerificationTokenPair = () => {
    const plainToken = crypto.randomBytes(20).toString('hex');
    const hashedToken = hashValue(plainToken);

    return { plainToken, hashedToken };
};

const generateTwoFactorCode = () => crypto.randomInt(100000, 1000000).toString();

const createTwoFactorChallenge = async (user, options = {}) => {
    const verificationCode = generateTwoFactorCode();
    const challengeToken = options.reuseChallenge && user.twoFactorChallengeToken
        ? options.currentChallengeToken
        : crypto.randomBytes(32).toString('hex');

    const expiresAt = new Date(Date.now() + TWO_FACTOR_CODE_TTL_MS);
    user.twoFactorCode = hashValue(verificationCode);
    user.twoFactorCodeExpire = expiresAt;
    user.twoFactorChallengeToken = hashValue(challengeToken);
    user.twoFactorChallengeExpire = expiresAt;
    user.twoFactorAttempts = 0;
    user.twoFactorLastSentAt = new Date();
    await user.save();

    return {
        challengeToken,
        verificationCode,
        expiresAt,
    };
};

const getTwoFactorChallengeUser = async (challengeToken) => {
    const normalizedToken = String(challengeToken || '').trim();
    if (!normalizedToken) {
        throw createServiceError('A 2-step verification session is required.', 400);
    }

    const user = await User.findOne({
        twoFactorChallengeToken: hashValue(normalizedToken),
    }).select(AUTH_USER_SELECT);

    if (!user) {
        throw createServiceError('This 2-step verification session is invalid or has expired. Please sign in again.', 400);
    }

    if (!user.twoFactorEnabled) {
        clearTwoFactorState(user);
        await user.save();
        throw createServiceError('2-step verification is no longer enabled for this account. Please sign in again.', 400);
    }

    if (!user.twoFactorChallengeExpire || user.twoFactorChallengeExpire.getTime() <= Date.now()) {
        clearTwoFactorState(user);
        await user.save();
        throw createServiceError('This 2-step verification session has expired. Please sign in again.', 400);
    }

    return user;
};

const assertPasswordMatches = async (user, currentPassword) => {
    if (!currentPassword) {
        throw createServiceError('Current password is required.', 400);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
        throw createServiceError('Current password is incorrect.', 400);
    }
};

const loginUser = async (email, password) => {
    const user = await findUserByEmailInsensitive(email);
    if (!user) {
        throw createServiceError('Invalid email or password', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw createServiceError('Invalid email or password', 401);
    }

    if (!user.isVerified) {
        throw createServiceError('Please verify your email address before logging in.', 401);
    }

    if (user.twoFactorEnabled) {
        const challenge = await createTwoFactorChallenge(user);

        return {
            user,
            requiresTwoFactor: true,
            twoFactorChallengeToken: challenge.challengeToken,
            twoFactorCode: challenge.verificationCode,
            twoFactorCodeExpiresAt: challenge.expiresAt,
        };
    }

    return {
        user,
        requiresTwoFactor: false,
        token: signAuthToken(user),
    };
};

const verifyTwoFactorLogin = async (challengeToken, verificationCode) => {
    const normalizedCode = normalizeTwoFactorCode(verificationCode);
    if (!normalizedCode) {
        throw createServiceError('Please enter the verification code from your email.', 400);
    }

    const user = await getTwoFactorChallengeUser(challengeToken);

    if (!user.twoFactorCode || !user.twoFactorCodeExpire || user.twoFactorCodeExpire.getTime() <= Date.now()) {
        clearTwoFactorState(user);
        await user.save();
        throw createServiceError('Your verification code has expired. Please sign in again.', 400);
    }

    if (user.twoFactorCode !== hashValue(normalizedCode)) {
        user.twoFactorAttempts = (user.twoFactorAttempts || 0) + 1;

        if (user.twoFactorAttempts >= TWO_FACTOR_MAX_ATTEMPTS) {
            clearTwoFactorState(user);
            await user.save();
            throw createServiceError('Too many incorrect verification codes. Please sign in again.', 401);
        }

        await user.save();

        throw createServiceError(
            `Invalid verification code. ${TWO_FACTOR_MAX_ATTEMPTS - user.twoFactorAttempts} attempt(s) remaining.`,
            401
        );
    }

    clearTwoFactorState(user);
    await user.save();

    return {
        user,
        token: signAuthToken(user),
    };
};

const resendTwoFactorCode = async (challengeToken) => {
    const user = await getTwoFactorChallengeUser(challengeToken);

    if (user.twoFactorLastSentAt) {
        const elapsedMs = Date.now() - user.twoFactorLastSentAt.getTime();
        if (elapsedMs < TWO_FACTOR_RESEND_COOLDOWN_MS) {
            const waitSeconds = Math.ceil((TWO_FACTOR_RESEND_COOLDOWN_MS - elapsedMs) / 1000);
            throw createServiceError(`Please wait ${waitSeconds} second(s) before requesting a new verification code.`, 429);
        }
    }

    const challenge = await createTwoFactorChallenge(user, {
        reuseChallenge: true,
        currentChallengeToken: String(challengeToken || '').trim(),
    });

    return {
        user,
        twoFactorChallengeToken: challenge.challengeToken,
        twoFactorCode: challenge.verificationCode,
        twoFactorCodeExpiresAt: challenge.expiresAt,
    };
};

const clearTwoFactorChallengeForUser = async (userId) => {
    if (!userId) {
        return null;
    }

    const user = await User.findById(userId).select(AUTH_USER_SELECT);
    if (!user) {
        return null;
    }

    clearTwoFactorState(user);
    await user.save();
    return user;
};

const verifyEmailToken = async (token) => {
    const hashedToken = hashValue(token);
    const user = await User.findOne({ verificationToken: hashedToken });

    if (!user) {
        throw createServiceError('Invalid or expired verification token', 400);
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    return user;
};

const forgotPassword = async (email) => {
    const user = await findUserByEmailInsensitive(email);
    if (!user) {
        throw createServiceError('There is no user registered with that email address.', 404);
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = hashValue(resetToken);
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save();

    return { user, resetToken };
};

const resetPassword = async (resetToken, newPassword) => {
    const hashedToken = hashValue(resetToken);

    const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { $gt: Date.now() }
    }).select(AUTH_USER_SELECT);

    if (!user) {
        throw createServiceError('Invalid or expired password reset token', 400);
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    clearTwoFactorState(user);

    await user.save();

    return user;
};

const changePassword = async (userId, currentPassword, newPassword) => {
    if (!currentPassword || !newPassword) {
        throw createServiceError('Current password and new password are required.', 400);
    }

    const user = await User.findById(userId).select(AUTH_USER_SELECT);
    if (!user) {
        throw createServiceError('User not found', 404);
    }

    await assertPasswordMatches(user, currentPassword);

    if (currentPassword === newPassword) {
        throw createServiceError('New password must be different from your current password.', 400);
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    clearTwoFactorState(user);
    await user.save();

    return user;
};

const resendVerificationEmail = async (email) => {
    const user = await findUserByEmailInsensitive(email);

    if (!user || user.isVerified) {
        return null;
    }

    const { plainToken, hashedToken } = generateVerificationTokenPair();
    user.verificationToken = hashedToken;
    user.isVerified = false;
    await user.save();

    return {
        user,
        verificationToken: plainToken,
    };
};

const changeUserEmail = async (userId, newEmail, currentPassword) => {
    const normalizedEmail = normalizeEmail(newEmail);
    if (!normalizedEmail) {
        throw createServiceError('Please provide a new email address.', 400);
    }

    if (!currentPassword) {
        throw createServiceError('Current password is required to change your email address.', 400);
    }

    const user = await User.findById(userId).select(AUTH_USER_SELECT);
    if (!user) {
        throw createServiceError('User not found', 404);
    }

    if (normalizeEmail(user.email).toLowerCase() === normalizedEmail.toLowerCase()) {
        throw createServiceError('New email address must be different from your current email.', 400);
    }

    const existingUser = await findUserByEmailInsensitive(normalizedEmail);
    if (existingUser && existingUser._id.toString() !== userId.toString()) {
        throw createServiceError('That email address is already in use.', 400);
    }

    await assertPasswordMatches(user, currentPassword);

    const { plainToken, hashedToken } = generateVerificationTokenPair();
    user.email = normalizedEmail;
    user.isVerified = false;
    user.verificationToken = hashedToken;
    clearTwoFactorState(user);
    await user.save();

    return {
        user,
        verificationToken: plainToken,
    };
};

const updateTwoFactorPreference = async (userId, enabled, currentPassword) => {
    if (typeof enabled !== 'boolean') {
        throw createServiceError('Please specify whether 2-step verification should be enabled or disabled.', 400);
    }

    const user = await User.findById(userId).select(AUTH_USER_SELECT);
    if (!user) {
        throw createServiceError('User not found', 404);
    }

    await assertPasswordMatches(user, currentPassword);

    if (enabled && !user.isVerified) {
        throw createServiceError('Please verify your email address before enabling 2-step verification.', 400);
    }

    user.twoFactorEnabled = enabled;
    clearTwoFactorState(user);
    await user.save();

    return user;
};

module.exports = {
    changePassword,
    changeUserEmail,
    clearTwoFactorChallengeForUser,
    generateVerificationTokenPair,
    loginUser,
    resendTwoFactorCode,
    resendVerificationEmail,
    resetPassword,
    updateTwoFactorPreference,
    verifyEmailToken,
    verifyTwoFactorLogin,
    forgotPassword,
};
