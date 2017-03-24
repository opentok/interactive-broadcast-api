/* eslint-env es6 */

/** Imports */

const Promise = require('bluebird');
const OpenTok = require('opentok');
const R = require('ramda');

/** Private */

// apiKey => OT instance
const OT = {};
const testPortal = true;
const defaultSessionOptions = { mediaMode: 'routed' };

/**
 * Get the OT instance for a project (apiKey)
 * @param {String} apiKey
 * @param {String} apiSecret
 */
const otInstance = (apiKey, apiSecret) => {
  if (OT[apiKey]) { return OT[apiKey]; }
  const tbrelUrl = 'https://anvil-tbrel.opentok.com';
  const ot = testPortal ?
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
const createSession = (apiKey, apiSecret) =>
  new Promise((resolve, reject) => {
    const ot = otInstance(apiKey, apiSecret);
    const onCreate = (err, session) => (err ? reject(err) : resolve(session));
    ot.createSession(defaultSessionOptions, onCreate);
  });

/**
 * Starts the archiving and returns the archiveId
 * @param {String} apiKey
 * @param {String} apiSecret
 * @param {String} sessionId
 * @param {String} eventName
 * @param {Boolean} composed
 * @returns {Promise} <Resolve => {String}, Reject => {Error}>
 */
const startArchive = (apiKey, apiSecret, sessionId, eventName, composed) =>
  new Promise((resolve, reject) => {
    const ot = otInstance(apiKey, apiSecret);
    const name = ['Archive', eventName, new Date().toISOString().slice(0, 10)].join(' ');
    const outputMode = composed ? 'composed' : 'individual';
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

module.exports = {
  createSession,
  createToken,
  startArchive,
  stopArchive
};
