const express = require('express');
const cookieParser = require('cookie-parser');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const simulationRoutes = require('./routes/simulationRoutes');
const errorMiddleware = require('./middleware/errorMiddleware');
const notFoundMiddleware = require('./middleware/notFoundMiddleware');

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/simulations', simulationRoutes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
