const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Load environment variables from .env file
dotenv.config();

// Initialize express app
const app = express();
// Import the routes
const routeRoutes = require('./routes/routeRoutes');

const userRoutes = require('./routes/userRoutes');
const reviewRoutes = require('./routes/reviewRoutes');

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

// Middleware to parse JSON and enable CORS
app.use(express.json());
app.use(cors());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Mount the routes
app.use('/api/routes', routeRoutes);

app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewRoutes);

// Connect to MongoDB 
// (Commented out until you add your real URI to the .env file)
connectDB(); 

// A simple test route
app.get('/', (req, res) => {
    res.json({ message: 'Eco-friendly Cycling Route API is running!' });
});

// Define the port and start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});