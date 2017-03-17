import admin from 'firebase-admin';

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
  'redirectUrl',
  'composed',
  'showStartedAt',
  'showEndedAt',
  'adminId',
  'createdAt',
  'updatedAt'
];

const timestampCreate = { createdAt: admin.database.ServerValue.TIMESTAMP, updatedAt: admin.database.ServerValue.TIMESTAMP };
const timestampUpdate = { updatedAt: admin.database.ServerValue.TIMESTAMP };

export {
  adminProps,
  userProps,
  eventProps,
  timestampCreate,
  timestampUpdate
};
