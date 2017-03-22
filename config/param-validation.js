import Joi from 'joi';
import R from 'ramda';

const login = {
  body: {
    uid: Joi.string().required()
  }
};

const createAdmin = {
  body: {
    displayName: Joi.string().required(),
    otApiKey: Joi.string().required(),
    otSecret: Joi.string().required(),
    superAdmin: Joi.boolean(),
    httpSupport: Joi.boolean(),
    hls: Joi.boolean(),
    email: Joi.string().email().required(),
    password: Joi.string().regex(/[a-zA-Z0-9]{6,30}/)
      .required()
      .options({ language: { string: { regex: { base: 'must be a string with at least 6 characters.' } } } })
      .label('Password'),
  },
};

const updateAdmin = {
  body: R.omit(['password'], createAdmin.body)
};

const event = {
  body: {
    name: Joi.string().required(),
    startImage: Joi.string(),
    endImage: Joi.string(),
    fanUrl: Joi.string().required(),
    celebrityUrl: Joi.string().required(),
    hostUrl: Joi.string().required(),
    archiveEvent: Joi.boolean().required(),
    redirectUrl: Joi.string(),
    composed: Joi.boolean(),
    adminId: Joi.string(),
  },
};

export {
  login,
  createAdmin,
  updateAdmin,
  event,
};
