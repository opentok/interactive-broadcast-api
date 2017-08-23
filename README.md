# OpenTok Interactive Broadcasting Solution Backend

The OpenTok Interactive Broadcast Solution Backend is based on  [Apache Hadoop](https://hadoop.apache.org/docs/stable/index.html) and uses [Firebase](https://firebase.google.com/) as the underlying storage.

This document describes how to create an OpenTok Interactive Broadcast Solution Backend Server.

Use the backend server to manages interactive broadcast events. Use it in conjunction with
the Interactive Broadcast Solution client apps for [the web](https://github.com/opentok/ibs-js),
[iOS](https://github.com/opentok/ibs-ios), and [Android](https://github.com/opentok/ibs-android).

## Installing dependencies

Clone the repository and `cd` to the project directory.
```sh
git clone https://github.com/opentok/interactive-broadcast-api
cd interactive-broadcast-api
```

Install yarn:
```js
npm install -g yarn
```

Install dependencies:
```sh
yarn
```

## Configuration settings

Set environment (vars):
```sh
cp .env.example .env
```

Edit the .env file:

```sh
NODE_ENV=development
PORT=3001
JWT_SECRET=0a6b944d-d2fb-46fc-a85e-0295c986cd9f
INTERACTIVE_STREAM_LIMIT=2
BUCKET_URL=INSERT_HERE
```

Replace these values with the following:

* `NODE_ENV` -- Your Node environment setting, either `development` or `production`.

* `PORT` -- The port for the backend service should use.

* `JWT_SECRET` -- The backend uses this string to generate JWT tokens used to validate
  all client requests.

* `INTERACTIVE_STREAM_LIMIT` -- The maximum number of active fans to allow in an event.
  After this limit is reached, a fan connecting to the event will see the HLS broadcast of
  the event, and the fan will not be able to join the event interactively by publishing their
  audio-video stream. (Note that Safari users will always receive the HLS broadcast, since
  OpenTok is not currently supported in Safari.)

* `BUCKET_URL` -- The URL of your Amazon S3 bucket, such as
  `https//s3.amazonaws.com/yourBucketName`.

Add you Firebase credentials to the /config/config.js file.

```javascript
const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  jwtSecret: envVars.JWT_SECRET,
  fireBaseAuthDomain: 'your-app-id.firebaseapp.com',
  firebaseDatabaseURL: 'https://your-app-id.firebaseio.com',
  firebaseProjectId: 'your-app-id',
  firebaseStorageBucket: 'your-app-id.appspot.comx',
  interactiveStreamLimit: envVars.INTERACTIVE_STREAM_LIMIT || Infinity,
};
```

Set the following values:

* `fireBaseAuthDomain` -- Your Firebase authentication domain. This will look like
  `'your-app-id.firebaseapp.com'`.

* `firebaseDatabaseURL` -- Your Firebase database URL. This will look like
  `'https://your-app-id.firebaseio.com'`.

* `firebaseProjectId` -- Your Firebase project ID. This will look like
  `'your-app-id'`.

* `firebaseStorageBucket` -- Your Firebase storage bucket. This will look like
  `'your-app-id.appspot.com'`.

## Running the app

Start the server:

```sh
yarn start
```

## Deployment

```sh
# compile to ES5
1. yarn build

# upload dist/ to your server
2. scp -rp dist/ user@dest:/path

# install production dependencies only
3. yarn --production

# Use any process manager to start your services
4. pm2 start dist/index.js
```

## Exploring the Code

This section details the inner workings of OpenTok Interactive Broadcasting Solution Backend.

### Services

The Interactive Broadcasting Solution Backend consists of various services:

#### admins.js

Manage operation over administrator users. It implements the following methods:

```javascript
getAdmins     => Gets the list of admins
getAdmin      => Gets a particular Admin from firebase
createAdmin   => Creates an admin
createUser    => Creates an user in firebase-admin
updateUser    => Updates an user in firebase-admin
updateAdmin   => Updates an admin
deleteAdmin   => Deletes an admin in firebase-admin
deleteUser    => Deletes an user in firebase-admin
```

#### auth.js

Handles authentication using the following methods:

```javascript
login           => Returns jwt token if valid username and password is provided for an admin or producer.
loginFan        => Returns jwt token if valid username and password is provided for a fan user.
loginHost       => Returns jwt token if valid username and password is provided for a host user.
loginCelebrity  => Returns jwt token if valid username and password is provided for a celebrity user
updateUser      => Updates an user in firebase-admin
updateAdmin     => Updates an admin
deleteAdmin     => Deletes an admin in firebase-admin
deleteUser      => Deletes an user in firebase-admin
```

#### broadcast.js

Manages the broadcast session, implements these methods:

```javascript
getBroadcastData  => Returns data required for the client to connect to the broadcast (CDN) feed.
endBroadcast      => End the broadcast.
eventGoLive       => Puts the event live.
```

#### dbProperties.js

Exports the following `Props`.

##### adminProps

Data of the admin users

```javascript

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
```

##### userProps

Contains common data of all the users disregarding the role:

```javascript
const userProps = ['displayName',
  'email',
  'password'
];
```

##### eventProps

These `Props` represent private data for the events.

```javascript
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
```

##### eventPublicProps

Contains data publicly visible from the events

```javascript
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
```

##### TS

The current timestamp.

##### timestampCreate

The creation timestamp of an event.

##### timestampUpdate

The last timestamp at which an event was updated.

##### eventStatuses

Array containing the possible status values for an event.

```javascript
const eventStatuses = {
  NOT_STARTED: 'notStarted',
  PRESHOW: 'preshow',
  LIVE: 'live',
  CLOSED: 'closed'
};
```

#### event.js
Handles interaction with the events database using the following methods.

```javascript
getEvents              =>  Get the list of events by admin
create                 =>  Save an event
update                 =>  Updates an event
deleteEvent            =>  Deletes an event
getEvent               =>  Get a particular Event
deleteEventsByAdminId  =>  Delete events by AdminId
getEventByKey          =>  Get a particular Event by primary key <slug, adminId>
changeStatus           =>  Change status of an event.
startArchive           =>  Starts archive
stopArchive            =>  Stops archive
createTokenProducer    =>  Create the tokens for the producer, and returns also the event data
createTokenHostCeleb   =>  Create the token for the host or celebrity, and returns also the event data
getEventBySessionId    =>  Get a particular Event by sessionId
createTokensFan        =>  Create the tokens for the fan, and returns also the event data
getMostRecentEvent     =>  Get the last event that is `live` or `preshow`
createTokenByUserType  =>  Get credentials for the last event that is `live` or `preshow`
getEventsByAdmin       =>  Get the list of events by admin for mobile apps without token
```

#### firebase.js

Initializes the app with a service account, granting admin privileges.

```javascript
firebase.initializeApp({
  databaseURL: config.firebaseDatabaseURL,
  credential: firebase.credential.cert(serviceAccountCredentials)
});
```
It implements the `verifyIdToken` method that verifies an IdToken with firebase

```javascript
const verifyIdToken = async (idToken) => {
  try {
    const decodedToken = await firebase.auth().verifyIdToken(idToken);
    return decodedToken.user_id;
  } catch (error) {
    return null;
  }
};
```
and also exposes a `file` method which utilizes the google cloud storage API to interact with files in firebase storage.

#### opentok.js

This service is in charge of managing OpenTok tokens and archiving using the following methods:

```javascript
createSession => Returns a new OpenTok session, along with the corresponding OpenTok API key.
createToken   => Creates an OpenTok token
startArchive  => Starts the archiving and returns the archiveId
stopArchive   => Starts the archiving and returns the archiveId
otRoles       => Array containing the user roles
getAdmins     => Gets the list of admins
getAdmin      => Gets a particular Admin from firebase
createAdmin   => Creates an admin
createUser    => Creates an user in firebase-admin
updateUser    => Updates an user in firebase-admin
updateAdmin   => Updates an admin
deleteAdmin   => Deletes an admin in firebase-admin
deleteUser    => Deletes an user in firebase-admin
```

### Middleware

The Interactive Broadcasting Solution Backend uses the `validation.js` middleware to convert the OpenTok data to a `json` format imeplementing the following **API methods**:


```javascript
validateApiKey  => Checks if the `APIKey` and `APISecret` are valid.
validateEvent   => Validates if the event already exsists by comparing the event id with the existing events
checkAdmin      => Check the role of the user is Admin, if not returns an authentication error.
checkFan        => Similar to `checkAdmin`, checks if the role of an user is Fan
checkCelebHost  => Similar to `checkAdmin`, checks if the role of an user is Celebrity or Host
```

## Contribute

If you'd like to contribute to OpenTok IBS's development, please follow the guidelines in the
[contributing guidelines](/.github/CONTRIBUTING.md).

## License

This project is under the [MIT](./LICENSE)

## About OpenTok

![logo](./tokbox-logo.png)

The OpenTok platform, developed by TokBox, makes it easy to embed high-quality interactive video, voice, messaging, and screen sharing into web and mobile apps. For more info on how OpenTok works, check out our [Core Concepts](https://tokbox.com/developer/guides/core-concepts/).
