import express from 'express';

const router = express.Router(); // eslint-disable-line new-cap
const Admin = require('../services/admin');
const getAPIResponse = require('../helpers/APIResponse');
const { validateAdmin } = require('../middleware/validation');

const getAdmins = getAPIResponse(() => Admin.getAdmins(), { skipNotFoundValidation: true });
const getAdminById = getAPIResponse(req => Admin.getAdmin(req.params.id));
const createAdmin = getAPIResponse(req => Admin.createUser(req.body));
const updateAdmin = getAPIResponse(req => Admin.updateAdmin(req.params.id, req.body));
const deleteAdmin = getAPIResponse(req => Admin.deleteUser(req.params.id));

router.get('/', getAdmins);
router.get('/:id', getAdminById);
router.post('/', validateAdmin, createAdmin);
router.patch('/:id', validateAdmin, updateAdmin);
router.delete('/:id', deleteAdmin);

export default router;
