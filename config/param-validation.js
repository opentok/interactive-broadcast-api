import Joi from 'joi';

export default {
// POST /api/auth/login
  login: {
    body: {
      uid: Joi.string().required()
    }
  }
};
