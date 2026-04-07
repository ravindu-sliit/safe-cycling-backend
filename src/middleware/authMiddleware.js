const jwt = require('jsonwebtoken');
const User = require('../models/User');

const loadUserFromToken = async (token) => {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
        throw new Error('Not authorized, user not found');
    }

    return user;
};

const protect = async (req, res, next) => {
    let token;

    // 1. Check if the token was sent in the headers (Format: "Bearer eyJhbGci...")
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // 2. Extract just the token string
            token = req.headers.authorization.split(' ')[1];

            // 3. Verify the token and attach the user
            req.user = await loadUserFromToken(token);

            // 5. The user is verified! Let them proceed to the Controller
            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ success: false, message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
    }
};

const optionalAuth = async (req, res, next) => {
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer')) {
        return next();
    }

    try {
        const token = req.headers.authorization.split(' ')[1];
        req.user = await loadUserFromToken(token);
        next();
    } catch (error) {
        console.error(error);
        res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
};

// RBAC: Check if user's role is authorized for this resource
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        // Ensure protect middleware ran first
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
        }

        // Check if user's role is in the allowed roles array
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: `Forbidden: This action requires one of these roles: ${allowedRoles.join(', ')}` 
            });
        }

        next();
    };
};

module.exports = { protect, optionalAuth, authorize };
