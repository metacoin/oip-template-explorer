const pug = require('pug')
const getJSON = require('get-json')
const express = require('express')
const ta = require('./lib/timeago.js')
require('dotenv').config();
const { EXPRESS_PORT, PAGINATION_LIMIT } = process.env;

// expressjs configuration
const app = express()
const port = EXPRESS_PORT
app.set('view engine', 'pug')
app.use(express.static('public'))

// Template configuration
const limit = PAGINATION_LIMIT

// Middleware function for async requests within expressjs
const asyncMiddleware = fn =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next))
      .catch(next)
  }

// Index page
app.get('/', asyncMiddleware(async(req, res, next) => {
  let recentTemplates = await getRecentTemplates(0, "")
  formatTime(recentTemplates.results)
  recentTemplates.page=1
  res.render('index', { data: recentTemplates })
}))

// Index pagination
app.get('/page', asyncMiddleware(async(req, res, next) => {
  page = req.query.page
  after = req.query.after
  last = req.query.last
  let recentTemplates = await getRecentTemplates(after)
  formatTime(recentTemplates.results)
  recentTemplates.page=page
  recentTemplates.last=last
  res.render('index', { data: recentTemplates })
}))

// Templates
app.get('/template', asyncMiddleware(async(req, res, next) => {
  template = req.query.template
  page = req.query.page
  let records = await getRecordsFromTemplate(template)
  records.template_name = template
  records.friendly_name = req.query.friendly_name
  if(records.total==0) {
    res.render('noresults', { data: records })
    return
  }
  formatRecordTime(records.results)
  res.render('template', { data: records })
}))

// -- Helper functions --
function formatRecordTime(records) {
  for (let record of records) {
    // Set timeago to timeago(tx time)
    record.meta.timeago = ta.ago(record.meta.time * 1000);

    // Set tx.tx.time to human readable time
    var newDate = new Date();
    newDate.setTime(record.meta.time * 1000);
    record.meta.time = newDate.toUTCString();
  }
}

// Get all recent templates (pages of 20)
const getRecentTemplates = async(after) => {
  // Format URL for pagination
  url = 'https://api.oip.io/oip/o5/template/get/latest?limit=' + limit + '&sort=meta.time:d'
  if (after!="") { url = url + '&after=' + after }

  console.log(url)
  return getJSON(url)
  .then(function(response) {
    return response
  })
  .catch(function(err) {
    console.log("Error hitting template API:")
    console.log(err)
  })
}

const setTemplateRecords = async(results) => {
  for (let result of results) {
    resp = await getTemplateRecordCount(result.template.name)
    result.template.records = resp.total
    console.log(result.template.friendly_name + ": " + result.template.records)
  }
}

const getTemplateRecordCount = async(name) => {
  return getJSON('https://api.oip.io/oip/o5/record/search?q=_exists_:record.details.' + name)
    .then(function(response) {
      return response
    })
    .catch(function(err) {
      console.log("Error hitting record search API:")
      console.log(err)
    })
}

const getRecordsFromTemplate = async(name) => {
  return getJSON('https://api.oip.io/oip/o5/record/search?q=_exists_:record.details.' + name)
    .then(function(response) {
      return response
    })
    .catch(function(err) {
      console.log("Error hitting record search API:")
      console.log(err)
    })
}

// Format OIP time data for rendering
function formatTime(r) {
  for (let record of r) {
    // Set timeago to timeago(tx time)
    record.meta.timeago = ta.ago(record.meta.time * 1000);

    // Set tx.tx.time to human readable time
    var newDate = new Date();
    newDate.setTime(record.meta.time * 1000);
    record.meta.time = newDate.toUTCString();
  }
}
app.listen(port, () => console.log(`oip-express listening on port ${port}`))
