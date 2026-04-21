const express = require('express');
const router = express.Router();

const { addDailyLog } = require('../controllers/user.controller');
const upload = require('../middleware/upload.middleware');
const { addLabTest } = require('../controllers/user.controller');
const { addUserDisease } = require('../controllers/user.controller');
const { addUserAllergy } = require('../controllers/user.controller');

const authMiddleware = require('../middleware/auth.middleware');
router.post('/logs', authMiddleware, addDailyLog);
router.post("/lab-test",authMiddleware,upload.single("file"),addLabTest);
router.post('/diseases', authMiddleware, addUserDisease);
router.post('/allergies', authMiddleware, addUserAllergy);
module.exports = router;