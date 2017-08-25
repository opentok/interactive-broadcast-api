import Joi from 'joi';

require('babel-polyfill');

// require and configure dotenv, will load vars in .env in PROCESS.ENV
require('dotenv').config();

// define validation for all the env vars
const envVarsSchema = Joi.object({
  NODE_ENV: Joi.string()
    .allow(['development', 'production', 'test', 'provision'])
    .default('development'),
  PORT: Joi.number()
    .default(4040),
  JWT_SECRET: Joi.string().required()
    .description('JWT Secret required to sign'),
  INTERACTIVE_STREAM_LIMIT: Joi.number().integer().min(0).default('10')
    .description('INTERACTIVE_STREAM_LIMIT is required'),
  BUCKET_URL: Joi.string().required()
    .description('BUCKET_URL required'),
  FIREBASE_PROJECT_ID: Joi.string().required()
    .description('FIREBASE_PROJECT_ID required'),
  FIREBASE_AUTH_DOMAIN: Joi.string().required()
    .description('FIREBASE_AUTH_DOMAIN required'),
  FIREBASE_DATABASE_URL: Joi.string().required()
    .description('FIREBASE_DATABASE_URL required'),
  FIREBASE_STORAGE_BUCKET: Joi.string().required()
    .description('FIREBASE_STORAGE_BUCKET required'),        
}).unknown()
  .required();

const { error, value: envVars } = Joi.validate(process.env, envVarsSchema);
if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  jwtSecret: envVars.JWT_SECRET,
  firebaseProjectId: envVars.FIREBASE_PROJECT_ID,
  fireBaseAuthDomain: envVars.FIREBASE_AUTH_DOMAIN,
  firebaseDatabaseURL: envVars.FIREBASE_DATABASE_URL,
  firebaseStorageBucket: envVars.FIREBASE_STORAGE_BUCKET,
  interactiveStreamLimit: envVars.INTERACTIVE_STREAM_LIMIT || Infinity,
  bucketUrl: envVars.BUCKET_URL,
};

export default config;
