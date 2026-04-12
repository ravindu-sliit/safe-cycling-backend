const getEnvValue = (key) => {
    const value = process.env[key];
    return typeof value === 'string' ? value.trim() : '';
};

const DEFAULT_APP_NAME = 'Cyclora';
const DEFAULT_API_SUFFIX = 'Route Mapping API';

const getBranding = () => {
    const appName = getEnvValue('APP_NAME') || DEFAULT_APP_NAME;
    const logoUrl = getEnvValue('APP_LOGO_URL');

    return {
        appName,
        logoUrl,
        apiTitle: `${appName} ${DEFAULT_API_SUFFIX}`,
        docsTitle: `${appName} API Docs`,
    };
};

module.exports = {
    getBranding,
};
