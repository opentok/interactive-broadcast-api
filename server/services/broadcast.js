/* eslint-env es6 */

/** Imports */
import jwt from 'jsonwebtoken';
import request from 'request-promise-native';
import { decrypt } from './encrypt';


/** Constants */
const broadcastURL = apiKey => `https://api.opentok.com/v2/project/${apiKey}/broadcast`;
const broadcastBody = (sessionId, hlsEnabled, rtmpUrl) => {
  const body = {
    sessionId,
    outputs: {},
  };
  if (hlsEnabled) body.outputs.hls = {};
  if (rtmpUrl) body.outputs.rtmp = { url: rtmpUrl };
  return body;
};

const stopBroadcastURL = (id, url) => `${url}/${id}/stop`;

/**
 * There is currently a ~50 second delay between the interactive session due to the
 * encoding process and the time it takes to upload the video to the CDN. This gap
 * may decrease to ~20 seconds in the future.  Currently using a 60-second delay to
 * be safe.
 */
const broadcastDelay = 60 * 1000;

/** Internal Methods */

/** Until Broadcast API returns https for broadcast urls*/
const ensureHTTPS = url => (url.startsWith('https') ? url : `https${url.slice(4)}`);

/** Create token auth **/
const createToken = (otApiKey, otSecret) => {
  const options = {
    issuer: otApiKey,
    expiresIn: '1m',
  };
  return jwt.sign({ ist: 'project' }, decrypt(otSecret), options);
};

/** Exports */

/**
 * Start the broadcast
 * @param {String} otApiKey - OT APIKey
 * @param {String} otSecret - OT APISecret
 * @param {String} sessionId - Session Id (stage)
 * @param {String} rtmpUrl - RTMP URL
 * @param {String} hlsEnabled - Booelan
 * @returns {Promise} <Resolve => {Object} Broadcast data, Reject => {Error}>
 */
const start = async (otApiKey, otSecret, sessionId, rtmpUrl, hlsEnabled) => {
  try {
    const token = createToken(otApiKey, otSecret);
    const requestConfig = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-OPENTOK-AUTH': `${token}` },
      uri: broadcastURL(otApiKey),
      body: broadcastBody(sessionId, hlsEnabled, rtmpUrl),
      json: true,
    };
    const response = await request(requestConfig);
    console.log('HLS has started =>', response);
    return {
      hlsUrl: ensureHTTPS(response.broadcastUrls.hls),
      hlsId: response.id,
    };
  } catch (error) {
    if (error.status === 409) {
      console.log("what's this error?");
    }
    return error;
  }
};

/**
 * Stop the broadcast
 * @param {String} broadcastId
 */
const stop = async (otApiKey, otSecret, broadcastId) => {
  const token = createToken(otApiKey, otSecret);
  const requestConfig = {
    headers: {
      'Content-Type': 'application/json',
      'X-OPENTOK-AUTH': `${token}` },
    uri: stopBroadcastURL(broadcastId, broadcastURL(otApiKey))
  };

  const sendEndRequest = async () => {
    try {
      await request(requestConfig);
    } catch (error) {
      console.log('Error stopping broadcast => ', error);
    }
  };

  /**
   * The broadcast API will immediately end the CDN stream when we make the
   * request.  Thus, we want to delay the request so that the CDN viewers are
   * able to watch the broadcast in its entirety.
   */
  setTimeout(sendEndRequest, broadcastDelay);
};

module.exports = {
  stop,
  start
};
