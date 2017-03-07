import express from 'express';


const router = express.Router(); // eslint-disable-line new-cap
const db = require('../services/firebase');

/** GET /health-check - Check service health */
router.get('/health-check', (req, res) =>
  res.send('OK')
);

// mount auth routes at /auth
// router.use('/auth', authRoutes);

export default router;
