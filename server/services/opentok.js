/* eslint-env es6 */

/** Imports */

const Promise = require('bluebird');
const OpenTok = require('opentok');
const R = require('ramda');

/** Private */

// apiKey => OT instance
const OT = {};

const defaultSessionOptions = { mediaMode: 'routed' };

/**
 * Get the OT instance for a project (apiKey)
 * @param {String} apiKey
 * @param {String} apiSecret
 * @param {Boolean} test - Test portal?
 */
const otInstance = (apiKey, apiSecret, test) => {
  if (OT[apiKey]) { return OT[apiKey]; }
  const tbrelUrl = 'https://anvil-tbrel.opentok.com';
  const ot = test ?
    new OpenTok(apiKey, apiSecret) :
    R.assocPath(
      ['_client', 'c', 'apiUrl'],
      tbrelUrl,
      R.assoc('apiUrl', tbrelUrl, new OpenTok(apiKey, apiSecret)) // eslint-disable-line comma-dangle
    );
  OT[apiKey] = ot;
  return ot;
};

/** Exports */

/**
 * Create an OpenTok token
 * @param {Object} ot - An instance of the OpenTok SDK
 * @param {Object} session An OpenTok session id
 * @param {Object} options Token creation options
 * @returns {String}
 */
const createToken = (apiKey, apiSecret, sessionId, options) => {
  const ot = otInstance(apiKey, apiSecret);
  return ot.generateToken(sessionId, options);
};

/**
 * Returns a new OpenTok session, along with the corresponding OpenTok API key.
 * @param {Object} ot - An instance of the OpenTok SDK
 * @param {Object} options for the token creation
 * @returns {Promise} <Resolve => {Object}, Reject => {Error}>
 */
const createSession = (apiKey, apiSecret, test) =>
  new Promise((resolve, reject) => {
    const ot = otInstance(apiKey, apiSecret, test);
    const onCreate = (err, session) => (err ? reject(err) : resolve(session));
    ot.createSession(defaultSessionOptions, onCreate);
  });

module.exports = {
  createSession,
  createToken
};
