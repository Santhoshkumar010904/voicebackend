const express = require('express');
const router = express.Router();
const { processCommand, formatEmail } = require('../controllers/voiceController');

router.post('/command', processCommand);
router.post('/format-email', formatEmail);

module.exports = router;
