const express = require('express');
const {
  getAllUsersRender,
  getUserProfileRender,
  showEditUserRender,
  updateUserRender,
  deleteUserRender
} = require('../../../controllers/customerRegister');  
const authMiddleware = require('../../../middlewares/auth');
const rbac = require('../../../middlewares/roleAccess');

const upload = require('../../../middlewares/profilePhoto');  

const router = express.Router();

// routes rendering 
router.get('/users',authMiddleware ,getAllUsersRender);
router.get('/users/:id',authMiddleware, getUserProfileRender);
router.get('/users/:id/edit',authMiddleware,rbac('developer', 'superAdmin') ,showEditUserRender);
router.post('/users/:id/update',authMiddleware,rbac('developer', 'superAdmin'), upload.single('photo'), updateUserRender);
router.post('/users/:id/delete',authMiddleware,rbac('developer', 'superAdmin'), deleteUserRender);

module.exports = router;