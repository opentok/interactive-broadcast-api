import jwt from 'jsonwebtoken';
import httpStatus from 'http-status';
import APIError from '../helpers/APIError';
import config from '../../config/config';
import { getEventByKey, getMostRecentEvent } from './event';
import { verifyIdToken } from './firebase';

const roles = {
  ADMIN: 'admin',
  PRODUCER: 'producer',
  HOST: 'host',
  CELEBRITY: 'celebrity',
  FAN: 'fan',
  BACKSTAGE_FAN: 'backstageFan',
  CELEBHOST: 'celebhost',
};

/**
 * Returns jwt token if valid username and password is provided
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
const login = async (req, res, next) => {
  const idToken = req.body.idToken;
  const uid = config.env !== 'development' ? await verifyIdToken(idToken) : true;
  if (uid) {
    const token = jwt.sign({
      uid,
      role: roles.ADMIN
    }, config.jwtSecret);
    return res.json({ token });
  }
  const err = new APIError('Authentication error', httpStatus.UNAUTHORIZED, true);
  return next(err);
};

/**
 * Returns jwt token if valid username and password is provided
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
const loginFan = async (req, res, next) => {
  const { fanUrl, adminId } = req.body;
  const event = fanUrl ? await getEventByKey(adminId, fanUrl, 'fanUrl') : await getMostRecentEvent(adminId);
  if (event) {
    const token = jwt.sign({
      fanUrl,
      adminId,
      role: roles.FAN,
    }, config.jwtSecret);
    return res.json({ token });
  }

  const err = new APIError('Authentication error', httpStatus.UNAUTHORIZED, true);
  return next(err);
};

/**
 * Returns jwt token if valid username and password is provided
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
const loginHost = async (req, res, next) => {
  const { hostUrl, adminId } = req.body;
  const event = hostUrl ? await getEventByKey(adminId, hostUrl, 'hostUrl') : await getMostRecentEvent(adminId);
  if (event) {
    const token = jwt.sign({
      hostUrl,
      adminId,
      role: roles.CELEBHOST,
    }, config.jwtSecret);
    return res.json({ token });
  }

  const err = new APIError('Authentication error', httpStatus.UNAUTHORIZED, true);
  return next(err);
};

/**
 * Returns jwt token if valid username and password is provided
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
const loginCelebrity = async (req, res, next) => {
  const { celebrityUrl, adminId } = req.body;
  const event = celebrityUrl ? await getEventByKey(adminId, celebrityUrl, 'celebrityUrl') : await getMostRecentEvent(adminId);
  if (event) {
    const token = jwt.sign({
      celebrityUrl,
      adminId,
      role: roles.CELEBHOST,
    }, config.jwtSecret);
    return res.json({ token });
  }

  const err = new APIError('Authentication error', httpStatus.UNAUTHORIZED, true);
  return next(err);
};

export default {
  login,
  loginFan,
  loginHost,
  loginCelebrity,
  roles
};
