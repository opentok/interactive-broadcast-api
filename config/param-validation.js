import Joi from 'joi';
import R from 'ramda';

const { eventStatuses } = require('../server/services/dbProperties');

const jwtAdmin = {
  body: {
    idToken: Joi.string().required()
  }
};

const jwtFan = {
  body: {
    fanUrl: Joi.string(),
    adminId: Joi.string().required(),
  }
};

const jwtHost = {
  body: {
    hostUrl: Joi.string(),
    adminId: Joi.string().required(),
  }
};

const jwtCelebrity = {
  body: {
    celebrityUrl: Joi.string(),
    adminId: Joi.string().required(),
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
    startImage: Joi.object({
      id: Joi.string(),
      url: Joi.string(),
    }),
    endImage: Joi.object({
      id: Joi.string(),
      url: Joi.string(),
    }),
    fanUrl: Joi.string().required(),
    celebrityUrl: Joi.string().required(),
    hostUrl: Joi.string().required(),
    archiveEvent: Joi.boolean().required(),
    redirectUrl: Joi.string(),
    uncomposed: Joi.boolean().required(),
    adminId: Joi.string(),
    status: Joi.string().valid(R.values(eventStatuses)),
  },
};

const eventStatus = {
  body: {
    status: Joi.string().valid(R.values(eventStatuses)).required(),
  },
};

const createTokenFan = {
  body: {
    adminId: Joi.string().required(),
    fanUrl: Joi.string().required(),
  },
};

const createTokenHost = {
  body: {
    adminId: Joi.string().required(),
    hostUrl: Joi.string().required(),
  },
};

const createTokenCelebrity = {
  body: {
    adminId: Joi.string().required(),
    celebrityUrl: Joi.string().required(),
  },
};

export {
  jwtAdmin,
  createAdmin,
  updateAdmin,
  event,
  eventStatus,
  createTokenFan,
  createTokenHost,
  createTokenCelebrity,
  jwtFan,
  jwtHost,
  jwtCelebrity
};
