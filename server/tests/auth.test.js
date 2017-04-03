import request from 'supertest-as-promised';
import httpStatus from 'http-status';
import jwt from 'jsonwebtoken';
import chai, { expect } from 'chai';
import app from '../../index';
import config from '../../config/config';
import { roles } from '../services/auth';

chai.config.includeStack = true;

describe('## Auth APIs', () => {
  const invalidUserCredentials = {
    idToken: '12345',
  };

  const validUserCredentials = {
    idToken: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjkxNmY3NjJhNzU4MWJkZTliYTMyNGVjODkxOGU1MTAyZjMwMzBkYWUifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vb3BlbnRvay1pYiIsIm5hbWUiOiJHZXJtYW4gdGVzdGluZyIsImF1ZCI6Im9wZW50b2staWIiLCJhdXRoX3RpbWUiOjE0OTEyNTEwOTcsInVzZXJfaWQiOiJwdTZqNXhWM2NTVjNvdjk0NEFCZmtTZERGTlUyIiwic3ViIjoicHU2ajV4VjNjU1Yzb3Y5NDRBQmZrU2RERk5VMiIsImlhdCI6MTQ5MTI1MTA5OCwiZXhwIjoxNDkxMjU0Njk4LCJlbWFpbCI6Imdlcm1hbmNpdG9AdGVzdGluZy5jb20iLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsiZ2VybWFuY2l0b0B0ZXN0aW5nLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6InBhc3N3b3JkIn19.nAK6cHPNAMeZYN4gAN8VzR3CtLsjDJXvHtsYap_QdE25_IHwCuLe6OQFxrNdf1V51zwMVko7dA4Si7_it2V7VPkROAJ5N47OBGC8tZSr5Wih0o5KxQDSiDS9IT__GtsvFkeu_7IqV5Mj2bvy3GYmf6tDvMxlW_59QhgSTX486iAbwXNvDM_FecTp-dRejTFHs_MMkkEEkcoAp794hF7E66sqe-3GwjbWRccx_8EFKPmK0QRqaO1xLw8PNenEmfdOMM3gYRwlhMId9BxNkaob03aDLpyyHqCW5yAjKQFwtJJri6LIMuLu5HUJWZKtmdXyVef8RUf2PKIjNFgpn0HRKg' // eslint-disable-line max-len
  };

  let jwtToken; // eslint-disable-line no-unused-vars

  describe('# POST /api/auth', () => {
    it('should return Authentication error', (done) => {
      request(app)
        .post('/api/auth/token')
        .send(invalidUserCredentials)
        .expect(httpStatus.UNAUTHORIZED)
        .then((res) => {
          expect(res.body.message).to.equal('Authentication error');
          done();
        })
        .catch(done);
    });

    it('should get valid JWT token', (done) => {
      request(app)
        .post('/api/auth/token')
        .send(validUserCredentials)
        .expect(httpStatus.OK)
        .then((res) => {
          expect(res.body).to.have.property('token');
          jwt.verify(res.body.token, config.jwtSecret, (err, decoded) => {
            expect(err).to.not.be.ok; // eslint-disable-line no-unused-expressions
            expect(decoded.uid).to.not.equal(undefined);
            expect(decoded.role).to.equal(roles.ADMIN);
            jwtToken = `Bearer ${res.body.token}`;
            done();
          });
        })
        .catch(done);
    });
  });
});
