import express from 'express';
import validate from 'express-validation';
import paramValidation from '../../config/param-validation';
import auth from '../services/auth';

const router = express.Router(); // eslint-disable-line new-cap

/** POST /api/auth/login - Returns token */
router.route('/token')
  .post(validate(paramValidation.login), auth.login);

export default router;
