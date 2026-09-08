require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/workspace';

mongoose
	.connect(MONGO_URI)
	.then(() => console.log('MongoDB connected'))
	.catch((err) => console.error('MongoDB connection error:', err.message || err));

const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const emailRoutes = require('./routes/emailRoutes');
const voiceRoutes = require('./routes/voiceRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/voice', voiceRoutes);

app.get('/', (req, res) => {
	res.json({ status: 'ok', uptime: process.uptime() });
});

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
