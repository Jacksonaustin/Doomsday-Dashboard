const express = require('express');
const healthRoutes = require('./routes/healthRoutes');
const errorMiddleware = require('./middleware/errorMiddleware');
const notFoundMiddleware = require('./middleware/notFoundMiddleware');

const app = express();

app.use(express.json());
app.use('/api/health', healthRoutes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
