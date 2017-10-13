/* eslint-env es6 */

/** Imports */

const Promise = require('bluebird');
const OpenTok = require('opentok');
const R = require('ramda');

const { decrypt } = require('./encrypt');

/** Private */

// apiKey => OT instance
const OT = {};
const testPortal = false;
const defaultSessionOptions = { mediaMode: 'routed' };

/**
 * Create the OT instance for a project (apiKey)
 * @param {String} apiKey
 * @param {String} apiSecret
 */
const createOTInstance = (apiKey, apiSecret) => {
  const tbrelUrl = 'https://anvil-tbrel.opentok.com';
  return !testPortal ?
    new OpenTok(apiKey, apiSecret) :
    R.assocPath(
      ['_client', 'c', 'apiUrl'],
      tbrelUrl,
      R.assoc('apiUrl', tbrelUrl, new OpenTok(apiKey, apiSecret)) // eslint-disable-line comma-dangle
    );
};

/**
 * Get the OT instance for a project (apiKey)
 * @param {String} apiKey
 * @param {String} apiSecret
 * @param {Boolean} descryptSecret
 */
const otInstance = (apiKey, apiSecret, descryptSecret = true) => {
  if (OT[apiKey]) { return OT[apiKey]; }
  const secret = descryptSecret ? decrypt(apiSecret) : apiSecret;
  const ot = createOTInstance(apiKey, secret);
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
  try {
    return ot.generateToken(sessionId, options);
  } catch (error) {
    console.log('Error creating token', error);
  }
  return false;
};

/**
 * Returns a new OpenTok session, along with the corresponding OpenTok API key.
 * @param {Object} ot - An instance of the OpenTok SDK
 * @param {Object} options for the token creation
 * @param {Boolean} descryptSecret
 * @returns {Promise} <Resolve => {Object}, Reject => {Error}>
 */
const createSession = (apiKey, apiSecret, descryptSecret = true) =>
  new Promise((resolve, reject) => {
    const ot = otInstance(apiKey, apiSecret, descryptSecret);
    const onCreate = (err, session) => (err ? reject(err) : resolve(session));
    ot.createSession(defaultSessionOptions, onCreate);
  });

/**
 * Starts the archiving and returns the archiveId
 * @param {String} apiKey
 * @param {String} apiSecret
 * @param {String} sessionId
 * @param {String} eventName
 * @param {Boolean} uncomposed
 * @returns {Promise} <Resolve => {String}, Reject => {Error}>
 */
const startArchive = (apiKey, apiSecret, sessionId, eventName, uncomposed) =>
  new Promise((resolve, reject) => {
    const ot = otInstance(apiKey, apiSecret);
    const name = ['Archive', eventName, new Date().toISOString().slice(0, 10)].join(' ');
    const outputMode = uncomposed ? 'individual' : 'composed';
    const archiveOptions = { name, outputMode };
    ot.startArchive(sessionId, archiveOptions, (err, archive) => (err ? reject(err) : resolve(archive.id)));
  });

/**
 * Starts the archiving and returns the archiveId
 * @param {String} archiveId
 * @returns {Promise} <Resolve => {Object}, Reject => {Error}>
 */
const stopArchive = (apiKey, apiSecret, archiveId) =>
  new Promise((resolve, reject) => {
    const ot = otInstance(apiKey, apiSecret);
    ot.stopArchive(archiveId, err => (err ? reject(err) : resolve(true)));
  });

const otRoles = {
  MODERATOR: 'moderator',
  PUBLISHER: 'publisher',
  SUBSCRIBER: 'subscriber',
};

module.exports = {
  createOTInstance,
  createSession,
  createToken,
  startArchive,
  stopArchive,
  otRoles
};
