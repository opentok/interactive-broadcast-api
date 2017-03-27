import httpStatus from 'http-status';
import R from 'ramda';
import opentok from '../services/opentok';
import APIError from '../helpers/APIError';

const Admin = require('../services/admin');
const Event = require('../services/event');


const sendError = (res, error) => {
  const validationError = new APIError(error.message || error,
    error.status || httpStatus.CONFLICT,
    error.code || -1);
  const { status, message, code } = validationError;
  res.status(status).send({ message, code });
};

const validateApiKey = (req, res, next) => {
  opentok.createSession(req.body.otApiKey, req.body.otSecret, true)
  .then(() => next())
  .catch(R.partial(sendError, [res, 'Invalid APIKey or APISecret']));
};

const validateEvent = (req, res, next) => {
  const { adminId, fanUrl } = req.body;
  const { id } = req.params;
  Admin.getAdmin(adminId)
  .then(() => Event.getEventByKey(adminId, fanUrl, 'fanUrl'))
  .then(event => (!event || event.id === id ? next() : sendError(res, 'Event exists')))
  .catch(R.partial(sendError, [res]));
};


module.exports = {
  validateApiKey,
  validateEvent
};
