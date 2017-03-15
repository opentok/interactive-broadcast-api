import express from 'express';
import adminRoutes from './admin.route';
import authRoutes from './auth.route';

const router = express.Router(); // eslint-disable-line new-cap
// mount admin routes at /admin
router.use('/admin', adminRoutes);
router.use('/auth', authRoutes);

export default router;
