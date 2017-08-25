const admin = require('firebase-admin');

const adminProps = [
  'id',
  'displayName',
  'otApiKey',
  'otSecret',
  'superAdmin',
  'httpSupport',
  'email',
  'hls',
  'createdAt',
  'updatedAt'
];

const userProps = ['displayName',
  'email',
  'password'
];

const eventProps = [
  'id',
  'name',
  'startImage',
  'endImage',
  'fanUrl',
  'celebrityUrl',
  'hostUrl',
  'archiveEvent',
  'status',
  'dateTimeStart',
  'dateTimeEnd',
  'sessionId',
  'stageSessionId',
  'archiveUrl',
  'archiveId',
  'redirectUrl',
  'uncomposed',
  'showStartedAt',
  'showEndedAt',
  'adminId',
  'rtmpUrl',
  'createdAt',
  'updatedAt'
];

const eventPublicProps = [
  'id',
  'adminId',
  'name',
  'startImage',
  'endImage',
  'fanUrl',
  'celebrityUrl',
  'hostUrl',
  'status',
  'dateTimeStart',
  'dateTimeEnd'
];

const TS = admin.database.ServerValue.TIMESTAMP;
const timestampCreate = { createdAt: TS, updatedAt: TS };
const timestampUpdate = { updatedAt: TS };

const eventStatuses = {
  NOT_STARTED: 'notStarted',
  PRESHOW: 'preshow',
  LIVE: 'live',
  CLOSED: 'closed'
};

module.exports = {
  adminProps,
  userProps,
  eventProps,
  eventPublicProps,
  timestampCreate,
  timestampUpdate,
  eventStatuses,
  TS
};
