//This is a nodejs script, and requires the following npm packages to run:
//jssha, btoa and command-line-args

//WARNING - Token generation should NEVER be done client side (in a browser for
//example), because then you are exposing your developer key to customers
/*jshint esversion: 6 */
/**
 *  This is a Nodejs script for creating superadmins that was meant to be executed from a command line.
 *  Required parameters:
 *  - name: admin's name
 *  - email: admin's email
 *  - password: admin's password. Must be at least 6 characters.
 *  - apikey: OpenTok APIKey
 *  - secret: OpenTok APIKey Secret
 * 
 *  Usage example:
 *  node server/scripts/create-user.js --name=SuperAdmin --email=test@test.com --password=123456 --apikey=12312312 --secret=780b7632d16a09d0dd8eca0667dc37d1769f370b
 */

const firebase = require('firebase-admin');
const R = require('ramda');
const commandLineArgs = require('command-line-args');
const serviceAccountCredentials = require('../../firebaseCredentials.json');
const { adminProps, userProps, timestampCreate } = require('../services/dbProperties');

/* Use .env file to get the environment variables */
require('dotenv').config();

/* Helpers */
const printError = (error) => {
    console.log('Error:', error);
    process.exit();
};

const setDefaults = (adminData) => {
  adminData.hls = false;
  adminData.httpSupport = false;
  adminData.superAdmin = true;
  return adminData;
};

const buildUser = (props = userProps, data) => R.pick(props, data);
const buildAdmin = data => setDefaults(buildUser(adminProps, data));
const validateArgs = args => {
    const keys = ['name', 'apikey', 'secret', 'password', 'email'];
    const validateKey = (key) => {
        if (typeof args[key] === 'undefined') {
            printError(['the option ', key, ' is required'].join('\''));
        }
    }
    
    R.forEach(validateKey, keys);
};

/* Get the parameters from command line */
const optionDefinitions = [{
    name: 'name',
    type: String,
    required: true,
}, {
    name: 'apikey',
    type: String
}, {
    name: 'secret',
    type: String
}, {
    name: 'password',
    type: String
}, {
    name: 'email',
    type: String
}];

const options = commandLineArgs(optionDefinitions, { partial: true });

// Validate the options
validateArgs(options);

// Initialize the app with a service account, granting admin privileges
firebase.initializeApp({
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  credential: firebase.credential.cert(serviceAccountCredentials)
});

// Define the user information
const userData = {
    displayName: options.name,
    otApiKey: options.apikey,
    otSecret: options.secret,
    password: options.password,
    email: options.email,
};

// Create the firebase user
firebase.auth().createUser(userData)
.then(data => {
    // Create the admin account
    const adminData = buildAdmin(R.merge(timestampCreate, R.merge({ id: data.uid }, userData)));
    firebase.database().ref(`admins/${adminData.id}`).set(adminData)
    .then(() => {
        console.log('The user has been created succesfully.');
        process.exit();
    })
    .catch((error) => {
        printError(error.message);
    });
})
.catch((error) => {
    printError(error.message);
});

