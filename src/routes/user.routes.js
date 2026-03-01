const express = require('express');
const router = express.Router();

const { addDailyLog } = require('../controllers/user.controller');
const upload = require('../middleware/upload.middleware');
const { addLabTest } = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');
router.post('/logs', authMiddleware, addDailyLog);
router.post(
    '/lab-tests',
    authMiddleware,
    upload.single('image'),
    addLabTest
);

module.exports = router;