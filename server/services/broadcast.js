/* eslint-env es6 */

// @TODO rewrite this module

/** Imports */
import redis from 'redis';
import jwt from 'jsonwebtoken';
import request from 'request';
import config from '../../config/config';
import { buildEventKey } from './event';

const presence = require('./presence');

const client = redis.createClient(config.redisUrl);

Promise.promisifyAll(request);
Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

/** Constants */

const broadcastURL = apiKey => `https://api.opentok.com/v2/project/${apiKey}/broadcast`;
const broadcastBody = (broadcastSessionId, rtmpUrl) => {
  const body = {};
  if (rtmpUrl) {
    body.sessionId = broadcastSessionId;
    body.outputs = {
      rtmp: {
        url: rtmpUrl
      }
    };
  } else {
    body.sessionId = broadcastSessionId;
  }
  return JSON.stringify(body);
};

const stopBroadcastURL = (id, url) => `${url}/${id}/stop`;

/**
 * There is currently a ~50 second delay between the interactive session due to the
 * encoding process and the time it takes to upload the video to the CDN. This gap
 * may decrease to ~20 seconds in the future.  Currently using a 60-second delay to
 * be safe.
 */
const broadcastDelay = 60 * 1000;

/** Local Storage */

/**
 * Which sessions have active broadcasts
 * Set{ sessionId ... }
 * */
const activeBroadcasts = new Set();

/** Internal Methods */

/** Until Broadcast API returns https for broadcast urls*/
const ensureHTTPS = url => (url.startsWith('https') ? url : `https${url.slice(4)}`);

/** Create token auth **/
const createToken = (ot) => {
  const options = {
    issuer: ot.otApiKey,
    expiresIn: '1m',
  };
  return jwt.sign({ ist: 'project' }, ot.otSecret, options);
};

/** Exports */

/**
 * Clean up local storage and redis after broadcast ends
 * @param {String} eventKey - The eventKey
 * @param {String} broadcastId - The broadcast id
 * @param [Boolean] now - Clean up immediately
 */
const scheduleCleanup = (eventKey, broadcastId, now) => {
  const cleanUp = () => {
    if (!activeBroadcasts.has(eventKey)) return;
    // Active broadcasts
    activeBroadcasts.delete(eventKey);
    // Redis
    client.del(`broadcast-${eventKey}`);
  };
  // Broadcasts automatically end 120 minutes after they begin
  const delay = now ? 0 : (1000 * 60 * 120);
  setTimeout(cleanUp, delay);
};

/**
 * Start the broadcast, update in-memory and redis data, and schedule cleanup
 * @param {String} fanUrl - fanUrl
 * @param {String} adminId - adminId
 * @returns {Promise} <Resolve => {Object} Broadcast data, Reject => {Error}>
 */
const startBroadcast = async (fanUrl, adminId) => {
  const eventKey = buildEventKey(fanUrl, adminId);
  try {
    const { otApiKey, otSecret, rtmpUrl, stageSessionId } = await presence.getInteractiveEventData(fanUrl, adminId);
    const token = createToken({ otApiKey, otSecret });
    const requestConfig = {
      headers: {
        'Content-Type': 'application/json',
        'X-OPENTOK-AUTH': `${token}` },
      url: broadcastURL(otApiKey),
      body: broadcastBody(stageSessionId, rtmpUrl)
    };
    const response = await request.postAsync(requestConfig);
    const data = JSON.parse(response.body);
    if (data.id) {
      const broadcastData = {
        broadcastSession: stageSessionId,
        broadcastUrl: rtmpUrl || ensureHTTPS(data.broadcastUrls.hls),
        rtmpUrl,
        broadcastId: data.id,
        broadcastKey: data.projectId,
        availableAt: data.createdAt + broadcastDelay,
        eventLive: 'false'
      };

      // Broadcasts are stored according to eventKey => {eventKey: {broadcastData}}
      client.hmsetAsync(`broadcast-${eventKey}`, broadcastData);
      activeBroadcasts.add(eventKey);
      scheduleCleanup(eventKey, broadcastData.broadcastId);
      return broadcastData;
    }

    return null;
  } catch (error) {
    if (error.status === 409) {
      return await client.hgetallAsync(eventKey);
    }
    return error;
  }
};

/**
 * Returns data required for the client to connect to the broadcast (CDN) feed
 * @param {Object} identifier - A sessionId or fanUrl property is required
 * @returns {Promise} <Resolve => {Object} Broadcast data, Reject => {Error}>
 */
const getBroadcastData = async (identifier) => {
  const { fanUrl, adminId } = identifier;
  const eventKey = buildEventKey(fanUrl, adminId);
  /**
   * Check redis to see if we've already started the broadcast.
   * If there isn't any data in redis, we need to make a call to
   * the broadcast api to get the info and start the broadcast stream.
   */
  if (fanUrl && adminId) {
    let broadcastData = await client.hgetallAsync(`broadcast-${eventKey}`);
    if (!broadcastData) {
      broadcastData = await startBroadcast(fanUrl, adminId);
    }
    return broadcastData;
  }

  return 'A valid broadcast identifier is required';
};

/**
 * End the broadcast
 * @param {String} broadcastId
 */
const endBroadcast = async (broadcastId, broadcastSession) => {
  const { otApiKey, otSecret } = await presence.getInteractiveEventData(broadcastSession);
  const token = createToken({ otApiKey, otSecret });
  const requestConfig = {
    headers: {
      'Content-Type': 'application/json',
      'X-OPENTOK-AUTH': `${token}` },
    url: stopBroadcastURL(broadcastId, broadcastURL(otApiKey))
  };

  const sendEndRequest = async () => {
    await request.postAsync(requestConfig);
    client.hsetAsync(`broadcast-${broadcastSession}`, 'eventEnded', true);
    /**
     * The broadcast API will immediately end the CDN stream when we make the
     * request.  Thus, we want to delay the request so that the CDN viewers are
     * able to watch the broadcast in its entirety.
     */
    setTimeout(sendEndRequest, broadcastDelay);
  };
};

/**
 * Put the event live
 * @param {String} broadcastSession
 */
const eventGoLive = async (broadcastSessionId) => {
  const broadcastData = client.hgetallAsync(`broadcast-${broadcastSessionId}`);
  broadcastData.eventLive = 'true';
  client.hmsetAsync(`broadcast-${broadcastSessionId}`, broadcastData);
};

module.exports = {
  getBroadcastData,
  endBroadcast,
  eventGoLive
};
