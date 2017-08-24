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
  fireBaseAuthDomain: 'your-app-id.firebaseapp.com',
  firebaseDatabaseURL: 'https://your-app-id.firebaseio.com',
  firebaseProjectId: 'your-app-id',
  firebaseStorageBucket: 'your-app-id.appspot.com',
  interactiveStreamLimit: envVars.INTERACTIVE_STREAM_LIMIT || Infinity,
  bucketUrl: envVars.BUCKET_URL,
};

export default config;
