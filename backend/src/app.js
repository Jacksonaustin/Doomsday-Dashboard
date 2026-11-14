const express = require('express');
const cookieParser = require('cookie-parser');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const householdRoutes = require('./routes/householdRoutes');
const simulationRoutes = require('./routes/simulationRoutes');
const errorMiddleware = require('./middleware/errorMiddleware');
const notFoundMiddleware = require('./middleware/notFoundMiddleware');
const leaderboardRoutes = require('./routes/leaderboardRoutes')
const checklistRoutes = require('./routes/checklistRoutes');

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/household', householdRoutes);
app.use('/api/simulations', simulationRoutes);
app.use('/api/leaderboard', leaderboardRoutes)
app.use('/api/checklist', checklistRoutes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
