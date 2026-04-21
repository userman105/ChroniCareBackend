const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

       
        if (!authHeader) {
            req.user = {
                user_id: null,
                is_guest: true,
            };
            return next();
        }

        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                message: 'Authorization token malformed',
            });
        }

        const token = authHeader.split(' ')[1];

        if (token === "guest_access_token") {
            req.user = {
                user_id: null,
                is_guest: true,
            };
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = {
            user_id: decoded.user_id,
            is_guest: false,
        };

        next();

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Access token expired' });
        }

        return res.status(401).json({ message: 'Invalid access token' });
    }
};

module.exports = authMiddleware;