import express from 'express';
import validate from 'express-validation';
import auth from '../services/auth';

const paramValidation = require('../../config/param-validation');

const router = express.Router(); // eslint-disable-line new-cap

/** POST /api/auth/login - Returns token for the admin */
router.route('/token')
  .post(validate(paramValidation.jwtAdmin), auth.login);

router.route('/token-fan')
  .post(validate(paramValidation.jwtFan), auth.loginFan);

router.route('/token-host')
  .post(validate(paramValidation.jwtHost), auth.loginHost);

router.route('/token-celebrity')
  .post(validate(paramValidation.jwtCelebrity), auth.loginCelebrity);

export default router;
