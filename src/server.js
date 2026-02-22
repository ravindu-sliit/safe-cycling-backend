const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Load environment variables from .env file
dotenv.config();

// Initialize express app
const app = express();

// Middleware to parse JSON and enable CORS
app.use(express.json());
app.use(cors());

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