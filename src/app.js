const express = require('express');
const cors = require('cors');

// const userRoutes = require('./routes/user.routes');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');

const app = express();

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// app.use('/api/users', userRoutes);

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;