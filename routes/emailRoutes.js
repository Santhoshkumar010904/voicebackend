const express = require('express');
const router = express.Router();
const { getInbox, getEmailDetails, sendEmail } = require('../controllers/emailController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getInbox);
router.route('/send').post(protect, sendEmail);
router.route('/:id').get(protect, getEmailDetails);

module.exports = router;
