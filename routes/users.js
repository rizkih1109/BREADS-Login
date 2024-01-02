var express = require('express');
var router = express.Router();
const moment = require('moment');
var { isLoggedIn } = require('../helper/util.js');
const path = require('path');

module.exports = function (db) {

  router.get('/', isLoggedIn, async (req, res) => {
    const { page = 1, title, startdate, enddate, complete, mode, sort='desc', sortby='id' } = req.query
    const queries = []
    const params = []
    const limit = 5
    const offset = (page - 1) * 5
    const { rows: akun } = await db.query(`SELECT * FROM users WHERE id = $1`, [req.session.user.userid])


    if (title) {
      params.push(title)
      queries.push(`title ILIKE '%' || $${params.length} || '%'`)
    }

    if (startdate && enddate) {
      params.push(startdate, enddate)
      queries.push(`deadline BETWEEN $${params.length - 1} and $${params.length}::TIMESTAMP + INTERVAL '1 DAY - 1 SECOND'`)
    } else if (startdate) {
      params.push(startdate)
      queries.push(`deadline >= $${params.length}`)
    } else if (enddate) {
      params.push(enddate)
      queries.push(`deadline <= $${params.length}::TIMESTAMP + INTERVAL '1 DAY - 1 SECOND'`)
    }

    if (complete) {
      params.push(JSON.parse(complete))
      queries.push(`complete = $${params.length}`)
    }

    params.push(req.session.user.userid)
    let sql = `SELECT COUNT (*) AS total FROM todos WHERE userid = $${params.length}`

    if (queries.length > 0) {
      sql += ` AND (${queries.join(` ${mode} `)})`
    }

    db.query(sql, params, (err, { rows: data }) => {
      if (err) res.send(err)
      else {
        const url = req.url == '/' ? `/?page=${page}&sortby=${sortby}&sort=${sort}` : req.url
        const total = data[0].total
        const pages = Math.ceil(total / limit)

        sql = `SELECT * FROM todos WHERE userid = $${params.length}`

        if (queries.length > 0) {
          sql += ` AND (${queries.join(` ${mode} `)})`
        }

        sql += ` ORDER BY ${sortby} ${sort}`

        params.push(limit, offset)
        sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`

        db.query(sql, params, (err, { rows }) => {
          if (err) return res.send(err)
          res.render('users/list', { data: rows, query: req.query, pages, offset, page, url, moment, akun: akun[0], user: req.session.user, sort, sortby })
        })
      }
    })
  })

  router.get('/add', (req, res) => {
    res.render('users/add')
  })

  router.post('/add', (req, res) => {
    db.query('INSERT INTO todos (title, userid) values ($1, $2)', [req.body.title, req.session.user.userid], (err) => {
      if (err) return res.send(err)
      res.redirect('/users')
    })
  })

  router.get('/delete/:index', (req, res) => {
    db.query('DELETE FROM todos WHERE id = $1', [req.params.index], (err) => {
      if (err) return res.send(err)
      res.redirect('/users')
    })
  })

  router.get('/edit/:index', (req, res) => {
    const index = req.params.index
    db.query('SELECT * FROM todos where id = $1', [index], (err, { rows: data }) => {
      if (err) return res.send(err)
      res.render('users/edit', { data, moment })
    })
  })

  router.post('/edit/:index', (req, res) => {
    const index = req.params.index
    db.query('UPDATE todos SET title = $1, deadline = $2, complete = $3 WHERE id = $4', [req.body.title, req.body.deadline, req.body.complete ? req.body.complete : false, index], (err) => {
      if (err) res.send(err)
      else res.redirect('/users')
    })
  })

  router.get('/upload', async (req, res) => {
    const { rows: akun } = await db.query(`SELECT * FROM users WHERE id = $1`, [req.session.user.userid])
    res.render('users/upload', {preAvatar : akun[0].avatar})
  })

  router.post('/upload', function (req, res) {
    let avatar;
    let uploadPath;

    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send('No files were uploaded.');
    }

    avatar = req.files.avatar;
    let fileName = Date.now() + '-' + avatar.name;
    uploadPath = path.join(__dirname, '..', 'public', 'images', fileName);

    avatar.mv(uploadPath, async function (err) {
      if (err)
        return res.status(500).send(err);

      const { rows } = await db.query('UPDATE users SET avatar = $1 WHERE id = $2', [fileName, req.session.user.userid])
      res.redirect('/users');
    });
  });

  return router;

}