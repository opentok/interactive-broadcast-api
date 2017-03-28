/* eslint-env es6 */

/** Imports */
import redis from 'redis';
import jwt from 'jsonwebtoken';
import request from 'request';
import config from '../../config/config';

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
    issuer: ot.apiKey,
    expiresIn: '1m',
  };
  return jwt.sign({ ist: 'project' }, ot.apiSecret, options);
};

/** Exports */

/**
 * Clean up local storage and redis after broadcast ends
 * @param {String} sessionId - The broadcast session id
 * @param {String} broadcastId - The broadcast id
 * @param [Boolean] now - Clean up immediately
 */
const scheduleCleanup = (sessionId, broadcastId, now) => {
  const cleanUp = () => {
    if (!activeBroadcasts.has(sessionId)) return;
    // Active broadcasts
    activeBroadcasts.delete(sessionId);
    // Redis
    client.del(`broadcast-${sessionId}`);
  };
  // Broadcasts automatically end 120 minutes after they begin
  const delay = now ? 0 : (1000 * 60 * 120);
  setTimeout(cleanUp, delay);
};

/**
 * Start the broadcast, update in-memory and redis data, and schedule cleanup
 * @param {String} broadcastSessionId - Spotlight host session id
 * @returns {Promise} <Resolve => {Object} Broadcast data, Reject => {Error}>
 */
const startBroadcast = async (broadcastSessionId) => {
  try {
    const { apiKey, apiSecret, rtmpUrl } = await presence.getInteractiveSessionData(broadcastSessionId);
    const token = createToken({ apiKey, apiSecret });
    const requestConfig = {
      headers: {
        'Content-Type': 'application/json',
        'X-OPENTOK-AUTH': `${token}` },
      url: broadcastURL(apiKey),
      body: broadcastBody(broadcastSessionId, rtmpUrl)
    };
    const response = await request.postAsync(requestConfig);
    const data = JSON.parse(response.body);
    if (data.id) {
      const broadcastData = {
        broadcastSession: broadcastSessionId,
        broadcastUrl: rtmpUrl || ensureHTTPS(data.broadcastUrls.hls),
        rtmpUrl,
        broadcastId: data.id,
        broadcastKey: data.projectId,
        availableAt: data.createdAt + broadcastDelay,
        eventLive: 'false'
      };

      // Broadcasts are stored according to broadcastSessionId => {broadcastSessionId: {broadcastData}}
      client.hmsetAsync(`broadcast-${broadcastSessionId}`, broadcastData);
      activeBroadcasts.add(broadcastSessionId);
      scheduleCleanup(broadcastSessionId, broadcastData.broadcastId);
      return broadcastData;
    }

    return null;
  } catch (error) {
    if (error.status === 409) {
      return await client.hgetallAsync(broadcastSessionId);
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
  const sessionId = identifier.sessionId;
  /**
   * Check redis to see if we've already started the broadcast.
   * If there isn't any data in redis, we need to make a call to
   * the broadcast api to get the info and start the broadcast stream.
   */
  if (sessionId) {
    let broadcastData = await client.hgetallAsync(`broadcast-${sessionId}`);
    if (!broadcastData) {
      broadcastData = await startBroadcast(sessionId);
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
  const { apiKey, apiSecret } = await presence.getInteractiveSessionData(broadcastSession);
  const token = createToken({ apiKey, apiSecret });
  const requestConfig = {
    headers: {
      'Content-Type': 'application/json',
      'X-OPENTOK-AUTH': `${token}` },
    url: stopBroadcastURL(broadcastId, broadcastURL(apiKey))
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
