import express from 'express';

const router = express.Router(); // eslint-disable-line new-cap
const Admin = require('../services/admin');


router.get('/', (req, res) => {
  Admin.getAdmins()
  .then(admins => res.status(200).send(admins))
  .catch(error => res.status(500).send(error));
});

export default router;
