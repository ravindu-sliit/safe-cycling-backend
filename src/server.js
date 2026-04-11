const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const { getBranding } = require('./config/branding');

// Support both legacy src/.env and root .env locations.
const srcEnvPath = path.join(__dirname, '.env');
const rootEnvPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: fs.existsSync(srcEnvPath) ? srcEnvPath : rootEnvPath });

// Initialize express app
const app = express();
// Import the routes
const routeRoutes = require('./routes/routeRoutes');
const hazardRoutes = require('./routes/HazardRoutes');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const reviewRoutes = require('./routes/reviewRoutes');

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const branding = getBranding();
const brandedSwaggerDocument = {
    ...swaggerDocument,
    info: {
        ...swaggerDocument.info,
        title: branding.apiTitle,
    },
};

// Middleware to parse JSON and enable CORS
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(brandedSwaggerDocument, {
    customSiteTitle: branding.docsTitle,
}));

// Mount the routes
app.use('/api/routes', routeRoutes);
app.use('/api/hazards', hazardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/reviews', reviewRoutes);

// Avoid side effects when imported by tests.
if (process.env.NODE_ENV !== 'test') {
    connectDB();
}

// A simple test route
app.get('/', (req, res) => {
    res.json({ message: `${branding.appName} API is running!` });
});

app.get('/api/branding', (req, res) => {
    res.json({
        success: true,
        data: {
            appName: branding.appName,
            logoUrl: branding.logoUrl,
        },
    });
});

app.use((error, req, res, next) => {
    if (error?.type === 'entity.too.large') {
        return res.status(413).json({
            success: false,
            message: 'Uploaded image is too large. Please choose a smaller profile photo.'
        });
    }

    if (error) {
        console.error(error);
        return res.status(error.status || 500).json({
            success: false,
            message: error.message || 'Server Error'
        });
    }

    next();
});

// Start HTTP server only outside test environment.
if (process.env.NODE_ENV !== 'test') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`Mailer: Gmail SMTP as ${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}`);
        console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    });
}

module.exports = app;
