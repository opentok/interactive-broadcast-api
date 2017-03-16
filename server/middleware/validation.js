import httpStatus from 'http-status';
import R from 'ramda';
import Validator from 'validatorjs';
import opentok from '../services/opentok';
import APIError from '../helpers/APIError';
import { userProps } from '../services/dbProperties';

const userValidationRules = props => R.zipObj(props, R.times(() => 'required', props.length));

const sendError = (res, error) => {
  const validationError = new APIError(error.message || error,
    error.status || httpStatus.FORBIDDEN,
    error.code || -1);
  const { status, message, code } = validationError;
  res.status(status).send({ message, code });
};

const userValidation = data => new Promise((resolve, reject) => {
  const validation = new Validator(data, userValidationRules(userProps));
  if (validation.fails()) {
    return reject(new Error(JSON.stringify(validation.errors.errors)));
  }
  resolve();
  return null;
});

const validateAdmin = (req, res, next) => {
  opentok.createSession(req.body.otApiKey, req.body.otSecret, true)
  .then(() => userValidation(req.body))
  .then(next)
  .catch(R.partial(sendError, [res]));
};

module.exports = {
  validateAdmin
};
