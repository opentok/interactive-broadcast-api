import express from 'express';
import validate from 'express-validation';
import auth from '../services/auth';

const paramValidation = require('../../config/param-validation');

const router = express.Router(); // eslint-disable-line new-cap

/** POST /api/auth/login - Returns token */
router.route('/token')
  .post(validate(paramValidation.login), auth.login);

export default router;
