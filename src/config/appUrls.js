const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

let hasWarnedAboutLocalPublicApiUrl = false;

const getEnvValue = (key) => {
    const value = process.env[key];
    return typeof value === 'string' ? value.trim() : '';
};

const normalizeBaseUrl = (value) => {
    if (!value) {
        return '';
    }

    try {
        const url = new URL(value);

        if (!['http:', 'https:'].includes(url.protocol)) {
            return '';
        }

        url.pathname = url.pathname.replace(/\/+$/, '');
        url.search = '';
        url.hash = '';

        return url.toString().replace(/\/$/, '');
    } catch (error) {
        return '';
    }
};

const isLocalUrl = (value) => {
    if (!value) {
        return false;
    }

    try {
        const { hostname } = new URL(value);
        return LOCAL_HOSTNAMES.has(hostname);
    } catch (error) {
        return false;
    }
};

const getRequestBaseUrl = (req) => {
    if (!req?.get) {
        return '';
    }

    const forwardedProto = req.get('x-forwarded-proto');
    const forwardedHost = req.get('x-forwarded-host');
    const protocol = (forwardedProto || req.protocol || 'http').split(',')[0].trim();
    const host = (forwardedHost || req.get('host') || '').split(',')[0].trim();

    if (!host) {
        return '';
    }

    return normalizeBaseUrl(`${protocol}://${host}`);
};

const warnAboutLocalPublicApiUrl = (url) => {
    if (url && isLocalUrl(url) && !hasWarnedAboutLocalPublicApiUrl) {
        hasWarnedAboutLocalPublicApiUrl = true;
        console.warn('Verification emails are using a local URL. Set PUBLIC_API_URL to your public backend domain so emailed links work outside local development.');
    }

    return url;
};

const getPublicApiUrl = (req) => {
    const configuredUrl = normalizeBaseUrl(
        getEnvValue('PUBLIC_API_URL') || getEnvValue('BACKEND_PUBLIC_URL')
    );

    return warnAboutLocalPublicApiUrl(
        configuredUrl || getRequestBaseUrl(req) || 'http://localhost:5000'
    );
};

const getFrontendUrl = () => normalizeBaseUrl(getEnvValue('FRONTEND_URL')) || 'http://localhost:5173';

const getPublicFrontendUrl = () => {
    const frontendUrl = normalizeBaseUrl(getEnvValue('FRONTEND_URL'));
    return frontendUrl && !isLocalUrl(frontendUrl) ? frontendUrl : '';
};

const buildVerificationUrl = (req, token) => {
    return `${getPublicApiUrl(req)}/api/auth/verify/${encodeURIComponent(token)}`;
};

module.exports = {
    buildVerificationUrl,
    getFrontendUrl,
    getPublicApiUrl,
    getPublicFrontendUrl,
    isLocalUrl,
};
