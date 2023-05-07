const router = require('express').Router();
const {catchErrors} =  require("../handlers/errorHandler");
const userController = require("../controllers/userController");
const auth = require('../middlewares/auth');

router.post("/login", catchErrors(userController.login));
router.post("/register", catchErrors(userController.register));
router.post("/getinfo", auth, catchErrors(userController.getInfo))
router.delete('/delete', auth, catchErrors(userController.delete))

module.exports = router;