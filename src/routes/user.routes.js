const express = require('express');
const router = express.Router();

const { addDailyLog } = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/logs', authMiddleware, addDailyLog);

module.exports = router;