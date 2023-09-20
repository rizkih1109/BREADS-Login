var express = require('express');
var router = express.Router();
const moment = require('moment')

const { Pool } = require('pg');

const db = new Pool({
  user: 'rizkih',
  host: 'localhost',
  database: 'datadb',
  password: '12345',
  port: 5432,
})

router.get('/', (req, res) => {
  const { page = 1, title, startdate, enddate, complete, mode } = req.query
  const queries = []
  const params = []
  const paramscount = []
  const limit = 5
  const offset = (page - 1) * 5

  if (title) {
    params.push(title)
    paramscount.push(title)
    queries.push(`title like '%' || $${params.length} || '%'`)
  }

  if (startdate && enddate) {
    params.push(startdate, enddate)
    paramscount.push(startdate, enddate)
    queries.push(`deadline BETWEEN $${params.length - 1} and $${params.length}`)
  } else if (startdate) {
    params.push(startdate)
    paramscount.push(startdate)
    queries.push(`deadline >= $${params.length}`)
  } else if (enddate) {
    params.push(enddate)
    paramscount.push(enddate)
    queries.push(`deadline <= $${params.length}`)
  }

  if (complete) {
    params.push(JSON.parse(complete))
    paramscount.push(JSON.parse(complete))
    queries.push(`complete = $${params.length}`)
  }

  let sql = `SELECT * FROM todos`
  let sqlcount = `SELECT COUNT (*) AS total FROM todos`
  if (queries.length > 0) {
    sql += ` WHERE ${queries.join(` ${mode} `)}`
    sqlcount += ` WHERE ${queries.join(` ${mode} `)}`
  }

  params.push(limit, offset)
  sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`
  
  db.query(sqlcount, paramscount, (err, { rows: data }) => {
    const total = data.total
    const pages = Math.ceil(total / limit)

    db.query(sql, params, (err, { rows }) => {
      if (err) return res.send(err)
      res.render('users/list', { data: rows, query: req.query, pages, offset, page, url: req.url, moment })
    })
  })
})

router.get('/add', (req, res) => {
  res.render('users/add')
})

router.post('/add', (req, res) => {
  db.query('INSERT INTO data (title, userid) values (?, ?)', [req.body.title, req.body.userid], (err) => {
    if (err) return res.send(err)
    res.redirect('/')
  })
})

router.get('/delete/:index', (req, res) => {
  db.run('DELETE FROM data WHERE id = ?', [req.params.index], (err) => {
    if (err) return res.send(err)
    res.redirect('/')
  })
})

router.get('/edit/:index', (req, res) => {
  const index = req.params.index
  db.get('SELECT * FROM data where id = ?', [index], (err, rows) => {
    if (err) return res.send(err)
    res.render('edit', { data: rows })
  })
})

router.post('/edit/:index', (req, res) => {
  db.run('UPDATE data SET name = ?, height = ?, weight = ?, birthdate = ?, married = ? WHERE id = ?', [req.body.name, req.body.height, req.body.weight, req.body.birthdate, req.body.married, req.params.index], (err) => {
    if (err) {
      console.log(err)
      return res.send(err)
    }
    res.redirect('/')
  })
})

module.exports = router;
