import express from 'express';

const bodyParser = require('body-parser');

const router = express.Router(); // eslint-disable-line new-cap
const Admin = require('../services/admin');

// const jsonParser = bodyParser.json();
const urlencodedParser = bodyParser.urlencoded({ extended: false });

// Get all Users/Admin

router.get('/', (req, res) => {
  Admin.getAdmins()
    .then(admins => res.status(200).send(admins))
    .catch(error => res.status(500).send(error));
});

// Get Users/Admin by Id
router.get('/:id', (req, res) => {
  Admin.getAdmin(req.params.id)
    .then(admin => res.status(200).send(admin))
    .catch(error => res.status(500).send(error));
});

// Create Users/Admin by Id
router.post('/', urlencodedParser, (req, res) => {
  if (!req.body) {
    return res.status(500).send('No data in post');
  }
  return Admin.createAdmin(req.body)
    .then(admin => res.status(200).send(admin))
    .catch(error => res.status(500).send(error));
});

// Edit Users/Admin by Id
router.patch('/:id', urlencodedParser, (req, res) => {
  Admin.editAdmin(req.params.id, req.body)
    .then(admin => res.status(200).send(admin))
    .catch(error => res.status(500).send(error));
});

// Delete Users/Admin by Id
router.delete('/:id', (req, res) => {
  Admin.deleteAdmin(req.params.id)
    .then(() => res.status(200).send())
    .catch(error => res.status(500).send(error));
});

export default router;
