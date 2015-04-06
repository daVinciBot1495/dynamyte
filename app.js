var logger = require('morgan');
var express = require('express');
var bodyParser = require('body-parser');

var app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Development Settings
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// Production Settings
if (app.get('env') === 'production') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: {}
        });
    });
}

/**
 * Gets a value from the datastore.
 *
 * @param key {String} A key.
 * @return {Object} A value.
 */
app.post('/api/get', function (req, res) {
    res.json(req.body);
});

/**
 * Puts a key value pair into the datastore.
 *
 * @param key {String} A key.
 * @param value {Object} A value.
 */
app.post('/api/put', function (req, res) {
    res.json(req.body);
});

module.exports = app;
