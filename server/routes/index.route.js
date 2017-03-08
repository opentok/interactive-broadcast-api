import express from 'express';
import adminRoutes from './admin.route';

const router = express.Router(); // eslint-disable-line new-cap
// mount admin routes at /admin
router.use('/admin', adminRoutes);

export default router;
