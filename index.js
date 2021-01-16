const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.write(HelloHello);
    res.end();
})

module.exports = router;