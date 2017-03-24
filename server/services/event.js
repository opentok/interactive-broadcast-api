const Promise = require('bluebird');
const { db } = require('./firebase');
const R = require('ramda');
const { eventProps, timestampCreate, timestampUpdate, eventStatuses, TS } = require('./dbProperties');
const Admin = require('./admin');
const OpenTok = require('./opentok');

const setDefaults = (eventData) => {
  const setDefaultProps = {
    status: R.defaultTo(eventStatuses.NON_STARTED),
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
const getEvents = (adminId = null) => new Promise((resolve, reject) => {
  db.ref('events').orderByChild('adminId').equalTo(adminId).once('value')
    .then(snapshot => resolve(snapshot.val()))
    .catch(reject);
});

/**
 * Get a particular Event
 * @param {String} id
 * @returns {Promise} <resolve: Event data, reject: Error>
 */
const getEvent = id => new Promise((resolve, reject) => {
  db.ref('events').child(id).once('value')
    .then(snapshot => resolve(snapshot.val()))
    .catch(reject);
});

/**
 * Get a particular Event
 * @param {String} adminId
 * @param {String} fanUrl
 * @returns {Promise} <resolve: Event data, reject: Error>
 */
const getEventByPrimaryKey = (adminId, fanUrl) => new Promise((resolve, reject) => {
  const filterByAdmin = (snapshot) => {
    let event;
    R.forEachObjIndexed((s) => {
      if (s.adminId === adminId) event = s;
    }, snapshot.val());
    return event;
  };
  db.ref('events').orderByChild('fanUrl').equalTo(fanUrl).once('value')
    .then(filterByAdmin)
    .then(resolve)
    .catch(reject);
});

/**
 * Create an event
 * @param {Object} event
 * @returns {Promise} <resolve: Event data, reject: Error>
 */
const saveEvent = data => new Promise((resolve, reject) => {
  const id = db.ref('events').push().key;
  db.ref(`events/${id}`).set(buildEvent(eventProps, R.mergeAll([timestampCreate, { id }, data])))
    .then(resolve(getEvent(id)))
    .catch(reject);
});


const getSessions = admin =>
  new Promise((resolve, reject) => {
    const createSession = OpenTok.createSession(admin.otApiKey, admin.otSecret);
    Promise.all([createSession, createSession])
      .then(sessions => resolve({ sessionId: sessions[0].sessionId, stageSessionId: sessions[1].sessionId }))
      .catch(reject);
  });

/**
 * Save an appointment
 * @param {Object} data
 * @param {Object} data.user
 * @param {String} data.user.name
 * @param {String} data.user.email
 * @param {Object} data.appointment
 */
const create = data =>
  new Promise((resolve, reject) => {
    Admin.getAdmin(data.adminId)
      .then(getSessions)
      .then(sessions => saveEvent(R.merge(data, sessions)))
      .then(resolve)
      .catch(reject);
  });

/**
 * Update an event
 * @param {String} id
 * @param {Object} eventData
 * @returns {Promise} <resolve: Event data, reject: Error>
 */
const update = (id, data) => new Promise((resolve, reject) => {
  db.ref(`events/${id}`).update(buildEvent(eventProps, R.merge(timestampUpdate, data)))
    .then(resolve(getEvent(id)))
    .catch(reject);
});


/**
 * Change status
 * @param {String} id
 * @param {Object} eventData
 * @returns {Promise} <resolve: Event data, reject: Error>
 */
const changeStatus = (id, data) => new Promise((resolve, reject) => {
  const updateData = data;

  if (data.status === eventStatuses.LIVE) {
    updateData.showStartedAt = TS;
  } else if (data.status === eventStatuses.CLOSED) {
    updateData.showEndedAt = TS;
  }

  update(id, updateData)
  .then(resolve(getEvent(id)))
  .catch(reject);
});

const constructObj = event => new Promise((resolve, reject) => {
  Admin.getAdmin(event.adminId)
  .then(admin => (resolve({ admin, event })))
  .catch(reject);
});

/* Start archive
* @param {String} id
* @returns {Promise} <resolve: Event data, reject: Error>
*/
const startArchive = id => new Promise((resolve, reject) => {
  getEvent(id)
  .then(constructObj)
  .then(({ admin, event }) => OpenTok.startArchive(admin.otApiKey, admin.otSecret, event.stageSessionId, event.name, event.composed))
  .then(archiveId => update(id, { archiveId }))
  .then(resolve)
  .catch(reject);
});


/* Stop archive
* @param {String} id
* @returns {Promise} <resolve: Event data, reject: Error>
*/
const stopArchive = id => new Promise((resolve, reject) => {
  getEvent(id)
  .then(constructObj)
  .then(({ admin, event }) => OpenTok.stopArchive(admin.otApiKey, admin.otSecret, event.archiveId))
  .then(resolve)
  .catch(reject);
});

/**
 * Delete an event
 * @param {String} id
 */
const deleteEvent = id => new Promise((resolve, reject) => {
  db.ref(`events/${id}`).remove()
    .then(resolve(true))
    .catch(reject);
});

/**
 * Delete events by AdminId
 * @param {String} id
 */
const deleteEventsByAdminId = id => new Promise((resolve, reject) => {
  const ref = db.ref('events');
  const removeEvents = (snapshot) => {
    const updates = {};
    snapshot.forEach((child) => {
      updates[child.key] = null;
    });
    ref.update(updates);
  };

  ref.orderByChild('adminId').equalTo(id).once('value')
  .then(removeEvents)
  .then(resolve)
  .catch(reject);
});

export {
  getEvents,
  create,
  update,
  deleteEvent,
  getEvent,
  deleteEventsByAdminId,
  getEventByPrimaryKey,
  changeStatus,
  startArchive,
  stopArchive
};
