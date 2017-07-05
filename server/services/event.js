import config from '../../config/config';

const { db } = require('./firebase');
const R = require('ramda');
const { eventProps, timestampCreate, timestampUpdate, eventStatuses, TS, eventPublicProps } = require('./dbProperties');
const Admin = require('./admin');
const OpenTok = require('./opentok');
const { roles } = require('./auth');
const broadcast = require('./broadcast');

/** Private */
const setDefaults = (eventData) => {
  const setDefaultProps = {
    status: R.defaultTo(eventStatuses.NOT_STARTED),
    archiveEvent: R.defaultTo(false),
    uncomposed: R.defaultTo(false),
  };
  return R.evolve(setDefaultProps, eventData);
};
const buildEvent = (props, eventData) => setDefaults(R.pick(props, eventData));
const buildOtData = userType => JSON.stringify({ userType });
const sortByCreatedAt = R.sortWith([R.ascend(R.prop('createdAt'))]);
const filterByStatus = status => R.find(R.propEq('status', status));

/** Exports */

/**
 * Get the list of events by admin
 * @returns {Promise} <resolve: Event List, reject: Error>
 */
const getEvents = async (adminId = null) => {
  const snapshot = await db.ref('events').orderByChild('adminId').equalTo(adminId).once('value');
  return snapshot.val();
};

/**
 * Get the list of events by admin for mobile apps without token
 * @returns {Promise} <resolve: Event List, reject: Error>
 */
const getEventsByAdmin = async (adminId = null) => {
  const events = await getEvents(adminId);
  if (events) {
    const notClosed = event => event.status !== eventStatuses.CLOSED;
    const pickProps = items => items.map(item => R.pick(eventPublicProps, item));
    return R.filter(notClosed, sortByCreatedAt(pickProps(Object.values(events))));
  }
  return null;
};

/**
 * Get the last event that is `live` or `preshow`
 * @param {String} adminId
 * @returns {Promise} <resolve: Event List, reject: Error>
 */
const getMostRecentEvent = async (adminId = null) => {
  const snapshot = await getEvents(adminId);
  if (snapshot) {
    const events = sortByCreatedAt(Object.values(snapshot));
    return filterByStatus(eventStatuses.LIVE)(events) || filterByStatus(eventStatuses.PRESHOW)(events);
  }
  return null;
};

/**
 * Get a particular Event
 * @param {String} id
 * @returns {Promise} <resolve: Event data, reject: Error>
 */
const getEvent = async (id) => {
  const snapshot = await db.ref('events').child(id).once('value');
  return snapshot.val();
};

/**
 * Get a particular Event by sessionId
 * @param {String} sessionId
 * @returns {Promise} <resolve: Event data, reject: Error>
 */
const getEventBySessionId = async (sessionId) => {
  const snapshot = await db.ref('events').orderByChild('sessionId').equalTo(sessionId).once('value');
  return R.values(snapshot.val())[0];
};

/**
 * Get a particular Event by primary key <slug, adminId>
 * @param {String} adminId
 * @param {String} slug <fanUrl OR hostUrl OR celebrityUrl>
 * @returns {Promise} <resolve: Event data, reject: Error>
 */
const getEventByKey = async (adminId, slug, field = 'fanUrl') => {
  const snapshot = await db.ref('events').orderByChild(field).equalTo(slug).once('value');
  if (snapshot.numChildren()) {
    const events = Object.values(snapshot.val());
    // Filtering by adminId
    return R.find(R.propEq('adminId', adminId))(events);
  }

  return null;
};

/**
 * Create an event
 * @param {Object} event
 * @returns {Promise} <resolve: Event data, reject: Error>
 */
const saveEvent = async (data) => {
  const id = db.ref('events').push().key;
  await db.ref(`events/${id}`).set(buildEvent(eventProps, R.mergeAll([timestampCreate, { id }, data])));
  return await getEvent(id);
};

/**
 * Creates the backstage and onstage sessions for an event
 * @param {Object} event
 * @returns {Object} <sessionId, stageSessionId>
 */
const getSessions = async (admin) => {
  const createSession = ({ otApiKey, otSecret }) => OpenTok.createSession(otApiKey, otSecret);
  try {
    const session = await createSession(admin);
    const stageSession = await createSession(admin);
    return { sessionId: session.sessionId, stageSessionId: stageSession.sessionId };
  } catch (error) {
    return new Error('error creating sessions', error);
  }
};

/**
 * Save an appointment
 * @param {Object} data
 * @param {Object} data.user
 * @param {String} data.user.name
 * @param {String} data.user.email
 * @param {Object} data.appointment
 */
const create = async (data) => {
  const admin = await Admin.getAdmin(data.adminId);
  const sessions = await getSessions(admin);
  const status = eventStatuses.NOT_STARTED;
  const rtmpUrl = '';
  const defaultValues = { status, rtmpUrl };
  return saveEvent(R.mergeAll([defaultValues, data, sessions]));
};

/**
 * Update an event
 * @param {String} id
 * @param {Object} eventData
 * @returns {Promise} <resolve: Event data, reject: Error>
 */
const update = async (id, data) => {
  await db.ref(`events/${id}`).update(buildEvent(eventProps, R.merge(timestampUpdate, data)));
  return getEvent(id);
};

/**
* Start archive
* @param {String} id
* @returns archiveId
*/
const startArchive = async (id) => {
  const event = await getEvent(id);
  if (event.archiveEvent) {
    const admin = await Admin.getAdmin(event.adminId);
    try {
      const archiveId = await OpenTok.startArchive(admin.otApiKey, admin.otSecret, event.stageSessionId, event.name, event.uncomposed);
      console.log('Starting the archive => ', archiveId);
      return archiveId;
    } catch (error) {
      console.log('Error starting the archive =>', error);
    }
  }
  return false;
};

/**
* Stop archive
* @param {String} id
* @returns true
*/
const stopArchive = async (event, admin) => {
  if (event.archiveId) {
    try {
      await OpenTok.stopArchive(admin.otApiKey, admin.otSecret, event.archiveId);
      const archiveExtension = event.uncomposed ? 'zip' : 'mp4';
      const url = `${config.bucketUrl}/${admin.otApiKey}/${event.archiveId}/archive.${archiveExtension}`;
      console.log('Stopping the archive =>', url);
      return url;
    } catch (error) {
      console.log('Error stopping the archive =>', error);
    }
  }
  return true;
};

/**
 * Create a new record in the activeBroadcasts node
 * @param {String} id
 * @returns {Promise} <resolve: Event data, reject: Error>
 */
const addActiveBroadcast = async (id) => {
  const event = await getEvent(id);
  const admin = await Admin.getAdmin(event.adminId);
  const record = {
    interactiveLimit: config.interactiveStreamLimit,
    name: event.name,
    hlsUrl: null,
    status: eventStatuses.PRESHOW,
    startImage: event.startImage || null,
    endImage: event.endImage || null,
    activeFans: null,
    archiving: false,
    hlsEnabled: admin.hls,
  };
  const ref = db.ref(`activeBroadcasts/${event.adminId}/${event.fanUrl}`);
  try {
    ref.set(record);
    ref.on('value', async (value) => {
      const activeBroadcast = value.val();
      if (activeBroadcast) {
        const { activeFans, hlsUrl, hlsEnabled, interactiveLimit, status } = activeBroadcast; // eslint-disable-line  no-unused-vars
        const viewers = R.length(R.keys(activeFans));  // eslint-disable-line  no-unused-vars
        /* Uncomment the next line if you need to consider the limit */
        // const shouldStartBroadcast = hlsEnabled && !hlsUrl && status === 'live' && viewers >= interactiveLimit;
        const shouldStartBroadcast = (hlsEnabled || event.rtmpUrl) && !hlsUrl && status === 'live';
        if (shouldStartBroadcast) {
          const broadcastData = await broadcast.start(admin.otApiKey, admin.otSecret, event.stageSessionId, event.rtmpUrl, hlsEnabled);
          await ref.update(broadcastData);
        }
      }
    });
  } catch (error) {
    console.log('Error connecting to firebase => ', error);
  }
};

/**
 * Update the status of an activeBroadcast
 * @param {String} id
 * @param {String} newStatus
 * @param {String} archiveId
 * @returns {Promise} <resolve: Event data, reject: Error>
 */
const updateActiveBroadcast = async (id, newStatus, archiveId) => {
  const event = await getEvent(id);
  const record = {
    status: newStatus,
    archiving: archiveId !== false,
  };
  try {
    await db.ref(`activeBroadcasts/${event.adminId}/${event.fanUrl}`).update(record);
  } catch (error) {
    console.log(error);
  }
};

/**
 * Stop HLS if it's running
 * @param {String} id
 * @returns {Promise} <resolve: Event data, reject: Error>
 */
const stopHLS = async (otApiKey, otSecret, fanUrl, adminId) => {
  try {
    const query = await db.ref(`activeBroadcasts/${adminId}/${fanUrl}`).once('value');
    const activeBroadcast = query.val();
    if (activeBroadcast.hlsUrl) broadcast.stop(otApiKey, otSecret, activeBroadcast.hlsId);
  } catch (error) {
    console.log('Error stopping HLS', error);
  }
};

/**
 * Delete an activeBroadcast
 * @param {String} id
 * @returns {Promise} <resolve: Event data, reject: Error>
 */
const deleteActiveBroadcast = async (fanUrl, adminId) => {
  try {
    await db.ref(`activeBroadcasts/${adminId}/${fanUrl}`).remove();
  } catch (error) {
    console.log(error);
  }
};

/**
 * Change status
 * @param {String} id
 * @param {Object} eventData
 * @returns {Promise} <resolve: Event data, reject: Error>
 */
const changeStatus = async (id, data) => {
  const updateData = data;

  if (data.status === eventStatuses.PRESHOW) {
    /* Create a new record in activeBroadcasts node */
    await addActiveBroadcast(id);
  } else if (data.status === eventStatuses.LIVE) {
    updateData.showStartedAt = TS;

    /* Start archiving */
    const archiveId = await startArchive(id);
    updateData.archiveId = archiveId;

    /* Update the status of the activeBroadcast */
    await updateActiveBroadcast(id, data.status, archiveId);
  } else if (data.status === eventStatuses.CLOSED) {
    /* Get the event and admin information */
    const event = await getEvent(id);
    const admin = await Admin.getAdmin(event.adminId);

    /* Stop HLS */
    await stopHLS(admin.otApiKey, admin.otSecret, event.fanUrl, event.adminId);

    /* Delete the activeBroadcast record */
    await deleteActiveBroadcast(event.fanUrl, event.adminId);

    /* Stop archiving */
    const archiveUrl = await stopArchive(event, admin);
    updateData.archiveUrl = archiveUrl;

    /* update the showEndedAt */
    updateData.showEndedAt = TS;
  }
  update(id, updateData);
  return getEvent(id);
};

/**
 * Delete an event
 * @param {String} id
 */
const deleteEvent = async (id) => {
  await db.ref(`events/${id}`).remove();
  return true;
};

/**
 * Delete events by AdminId
 * @param {String} id
 */
const deleteEventsByAdminId = async (id) => {
  const ref = db.ref('events');
  const removeEvents = (snapshot) => {
    const updates = {};
    snapshot.forEach((child) => {
      updates[child.key] = null;
    });
    ref.update(updates);
  };

  const snapshot = await ref.orderByChild('adminId').equalTo(id).once('value');
  removeEvents(snapshot);
  return true;
};

/**
 * Create the tokens for the producer, and returns also the event data
 * @param {String} eventId
 * @returns {Object}
 */
const createTokenProducer = async (id) => {
  const event = await getEvent(id);
  const admin = await Admin.getAdmin(event.adminId);
  const options = { role: OpenTok.otRoles.MODERATOR, data: buildOtData(roles.PRODUCER) };
  const backstageToken = await OpenTok.createToken(admin.otApiKey, admin.otSecret, event.sessionId, options);
  const stageToken = await OpenTok.createToken(admin.otApiKey, admin.otSecret, event.stageSessionId, options);
  return R.merge(event, { apiKey: admin.otApiKey, backstageToken, stageToken });
};

const createTokensFan = async (otApiKey, otSecret, stageSessionId, sessionId) => {
  const options = { role: OpenTok.otRoles.PUBLISHER, data: buildOtData(roles.FAN) };
  const backstageToken = await OpenTok.createToken(otApiKey, otSecret, sessionId, R.assoc('data', buildOtData(roles.BACKSTAGE_FAN), options));
  const stageToken = await OpenTok.createToken(otApiKey, otSecret, stageSessionId, options);
  return { backstageToken, stageToken };
};


/**
 * Create the tokens for the fan, and returns also the event data
 * @param {String} fanUrl
 * @param {String} adminId
 * @returns {Object}
 */
const createTokenFan = async (adminId, slug) => {
  const event = await getEventByKey(adminId, slug, 'fanUrl');
  const { otApiKey, otSecret, httpSupport } = await Admin.getAdmin(event.adminId);
  const { backstageToken, stageToken } = await createTokensFan(otApiKey, otSecret, event.stageSessionId, event.sessionId);
  return R.merge(event, { apiKey: otApiKey, backstageToken, stageToken, httpSupport });
};

/**
 * Create the token for the host or celebrity, and returns also the event data
 * @param {String} adminId
 * @param {String} slug
 * @param {String} userType
 * @returns {Object}
 */
const createTokenHostCeleb = async (adminId, slug, userType) => {
  const field = userType === 'host' ? 'hostUrl' : 'celebrityUrl';
  const event = await getEventByKey(adminId, slug, field);
  const admin = await Admin.getAdmin(event.adminId);
  const options = { role: OpenTok.otRoles.PUBLISHER, data: buildOtData(userType) };
  const stageToken = await OpenTok.createToken(admin.otApiKey, admin.otSecret, event.stageSessionId, options);
  return R.merge(event, { apiKey: admin.otApiKey, stageToken, httpSupport: admin.httpSupport });
};

const buildEventKey = (fanUrl, adminId) => [fanUrl, adminId].join('-');

/**
 * Get credentils for the last event that is `live` or `preshow`
 * @param {String} adminId
 * @param {String} userType <host/celebrity>
 * @returns {Promise} <resolve: Event List, reject: Error>
 */
const createTokenByUserType = async (adminId, userType) => {
  const event = await getMostRecentEvent(adminId);
  if (event) {
    return userType !== roles.FAN ?
      await createTokenHostCeleb(adminId, userType === roles.CELEBRITY ? event.celebrityUrl : event.hostUrl, userType) :
      await createTokenFan(adminId, event.fanUrl);
  }
  return null;
};

export {
  getEvents,
  create,
  update,
  deleteEvent,
  getEvent,
  deleteEventsByAdminId,
  getEventByKey,
  changeStatus,
  createTokenProducer,
  createTokenFan,
  createTokenHostCeleb,
  getEventBySessionId,
  buildEventKey,
  getMostRecentEvent,
  createTokenByUserType,
  getEventsByAdmin
};
