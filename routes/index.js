var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;

module.exports = function (db) {

  router.get('/', function (req, res, next) {
    res.render('login');
  });

  router.post('/', async function (req, res, next) {
    try {
      const { email, password } = req.body

      const { rows: users } = await db.query(`SELECT * FROM users WHERE email = $1`, [email])

      if (users.length == 0) return res.send(`email doesn't exits`)

      if (!bcrypt.compareSync(password, users[0].password)) return res.send('password is wrong')

      req.session.user = { email: users[0].email }
      res.redirect('/users')
    } catch (e) {
      console.log(e)
      res.redirect('/')
    }

  });

  router.get('/register', function (req, res, next) {
    res.render('register');
  });

  router.post('/register', async function (req, res, next) {
    const { email, password, repassword } = req.body

    if (password !== repassword) return res.send(`password doesn't match`)

    const { rows: emails } = await db.query('SELECT * FROM users WHERE email = $1', [email])
    console.log(emails)
    if (emails.length > 0) return res.send(`email already exits`)

    const hash = bcrypt.hashSync(password, saltRounds);
    console.log(hash)

    await db.query(`INSERT INTO users (email, password) VALUES ($1, $2)`, [email, hash])
    res.redirect('/')

  });

  return router;
}
