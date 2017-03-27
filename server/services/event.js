const { db } = require('./firebase');
const R = require('ramda');
const { eventProps, timestampCreate, timestampUpdate, eventStatuses, TS } = require('./dbProperties');
const Admin = require('./admin');
const OpenTok = require('./opentok');

const setDefaults = (eventData) => {
  const setDefaultProps = {
    status: R.defaultTo(eventStatuses.NOT_STARTED),
    archiveEvent: R.defaultTo(false),
    composed: R.defaultTo(false),
  };
  return R.evolve(setDefaultProps, eventData);
};
const buildEvent = (props, eventData) => setDefaults(R.pick(props, eventData));

/**
 * Get the list of admins
 * @returns {Promise} <resolve: Admin List, reject: Error>
 */
const getEvents = async (adminId = null) => {
  const snapshot = await db.ref('events').orderByChild('adminId').equalTo(adminId).once('value');
  return snapshot.val();
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
 * Get a particular Event by primary key <slug, adminId>
 * @param {String} adminId
 * @param {String} slug <fanUrl OR hostUrl OR celebrityUrl>
 * @returns {Promise} <resolve: Event data, reject: Error>
 */
const getEventByKey = async (adminId, slug, field = 'fanUrl') => {
  const filterByAdmin = (events) => {
    let event;
    R.forEachObjIndexed((s) => {
      if (s.adminId === adminId) event = s;
    }, events);
    return event;
  };
  const snapshot = await db.ref('events').orderByChild(field).equalTo(slug).once('value');
  return filterByAdmin(snapshot.val());
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
  const session = await createSession(admin);
  const stageSession = await createSession(admin);
  return { sessionId: session.sessionId, stageSessionId: stageSession.sessionId };
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
  return saveEvent(R.mergeAll([{ status }, data, sessions]));
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
 * Change status
 * @param {String} id
 * @param {Object} eventData
 * @returns {Promise} <resolve: Event data, reject: Error>
 */
const changeStatus = async (id, data) => {
  const updateData = data;

  if (data.status === eventStatuses.LIVE) {
    updateData.showStartedAt = TS;
  } else if (data.status === eventStatuses.CLOSED) {
    updateData.showEndedAt = TS;
  }
  update(id, updateData);
  return getEvent(id);
};

/**
* Start archive
* @param {String} id
* @returns archiveId
*/
const startArchive = async (id) => {
  const event = await getEvent(id);
  const admin = await Admin.getAdmin(event.adminId);
  const archiveId = await OpenTok.startArchive(admin.otApiKey, admin.otSecret, event.stageSessionId, event.name, event.composed);
  update(id, { archiveId });
  return archiveId;
};

/**
* Stop archive
* @param {String} id
* @returns true
*/
const stopArchive = async (id) => {
  const event = await getEvent(id);
  const admin = await Admin.getAdmin(event.adminId);
  OpenTok.stopArchive(admin.otApiKey, admin.otSecret, event.archiveId);
  return true;
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
  const options = { role: OpenTok.otRoles.MODERATOR, data: 'userType=producer' };
  const backstageToken = await OpenTok.createToken(admin.otApiKey, admin.otSecret, event.sessionId, options);
  const stageToken = await OpenTok.createToken(admin.otApiKey, admin.otSecret, event.stageSessionId, options);
  return {
    apiKey: admin.otApiKey,
    event,
    backstageToken,
    stageToken,
  };
};


/**
 * Create the tokens for the fan, and returns also the event data
 * @param {String} fanUrl
 * @param {String} AdminId
 * @returns {Object}
 */
const createTokenFan = async (AdminId, slug) => {
  const event = await getEventByKey(AdminId, slug, 'fanUrl');
  const admin = await Admin.getAdmin(event.adminId);
  const options = { role: OpenTok.otRoles.PUBLISHER, data: 'userType=fan' };
  const backstageToken = await OpenTok.createToken(admin.otApiKey, admin.otSecret, event.sessionId, options);
  const stageToken = await OpenTok.createToken(admin.otApiKey, admin.otSecret, event.stageSessionId, options);
  return {
    apiKey: admin.otApiKey,
    event,
    backstageToken,
    stageToken,
    httpSupport: admin.httpSupport
  };
};

/**
 * Create the token for the host or celebrity, and returns also the event data
 * @param {String} adminId
 * @param {String} slug
 * @param {String} userType
 * @returns {Object}
 */
const createTokenHostCeleb = async (AdminId, slug, userType) => {
  const field = userType === 'host' ? 'hostUrl' : 'celebrityUrl';
  const event = await getEventByKey(AdminId, slug, field);
  const admin = await Admin.getAdmin(event.adminId);
  const options = { role: OpenTok.otRoles.PUBLISHER, data: `userType=${userType}` };
  const stageToken = await OpenTok.createToken(admin.otApiKey, admin.otSecret, event.stageSessionId, options);
  return {
    apiKey: admin.otApiKey,
    event,
    stageToken,
    httpSupport: admin.httpSupport
  };
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
  startArchive,
  stopArchive,
  createTokenProducer,
  createTokenFan,
  createTokenHostCeleb
};
