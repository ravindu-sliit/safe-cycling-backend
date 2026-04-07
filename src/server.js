const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Load environment variables from .env file
dotenv.config();

// Initialize express app
const app = express();
// Import the routes
// const routeRoutes = require('./routes/routeRoutes');
const hazardRoutes = require('./routes/HazardRoutes');
// const userRoutes = require('./routes/userRoutes');
// const authRoutes = require('./routes/authRoutes');
// const reviewRoutes = require('./routes/reviewRoutes');

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

// Middleware to parse JSON and enable CORS
app.use(express.json());
app.use(cors());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Mount the routes
// app.use('/api/routes', routeRoutes);
app.use('/api/hazards', hazardRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/auth', authRoutes);
// app.use('/api/reviews', reviewRoutes);

// Connect to MongoDB 
if (process.env.MONGODB_URI) {
    connectDB();
} else {
    console.warn('MONGODB_URI is not set. Database-backed hazard APIs will not work until it is configured.');
}

// A simple test route
app.get('/', (req, res) => {
    res.json({ message: 'Eco-friendly Cycling Route API is running!' });
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({
        message: err.message || 'Internal server error',
    });
});

// Define the port and start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});