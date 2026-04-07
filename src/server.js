const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// Load environment variables from the src/.env file beside this server entrypoint
dotenv.config({ path: path.join(__dirname, '.env') });

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

// Middleware to parse JSON and enable CORS
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Mount the routes
app.use('/api/routes', routeRoutes);
app.use('/api/hazards', hazardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/reviews', reviewRoutes);

// Connect to MongoDB 
// (Commented out until you add your real URI to the .env file)
connectDB(); 

// A simple test route
app.get('/', (req, res) => {
    res.json({ message: 'Eco-friendly Cycling Route API is running!' });
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

// Define the port and start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Mailer: Gmail SMTP as ${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}`);
    console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
});
