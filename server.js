var express = require('express');
var fs      = require('fs');
var request = require('request');
var q       = require('q');
var cheerio = require('cheerio');
var app     = express();
var port    = 8081;

var imdb = {};
imdb.urlBase = 'http://www.imdb.com';
imdb.urlTitle = imdb.urlBase + '/title/';
imdb.urlMoviesTheaters = imdb.urlBase + '/movies-in-theaters/';

imdb.scrapeTitle = function(titleId) {
  var deferred = q.defer();
  var url = imdb.urlTitle + titleId;
  request(url, function(error, response, html) {
    console.log('Requesting', url);
    if (!error) {
      var $ = cheerio.load(html);
      var json = { title : "", release : "", rating : "", url: url};

      $('.header').filter(function() {
        var data = $(this);
        json.title = data.children().first().text();
        json.release = data.children().last().children().text();
      });

      $('.star-box-giga-star').filter(function() {
        var data = $(this);
        json.rating = data.text();
      });
    }
    deferred.resolve(json);
  });
  return deferred.promise;
};

imdb.scrapeMoviesTheaters = function() {
  var deferred = q.defer();
  var promise = deferred.promise;
  var url = imdb.urlMoviesTheaters;
  var outputArray = [];
  request(url, function(error, response, html) {
    console.log('Requesting', url);
    if (!error) {
      var $ = cheerio.load(html);
      q.all($('#main .list.detail.sub-list').first().find('.list_item').map(function(i, elem) {
        var promise = q.defer().promise;
        var regex = /(tt[0-9]*)/g;
        var href = $(elem).find('h4[itemprop=name] a').attr('href');
        var arr = regex.exec(href);
        if (arr && arr[1]) {
          promise = imdb.scrapeTitle(arr[1]).then(function(json) {
            console.log('Scraped', json);
            outputArray.push(json);
          });
        }
        return promise;
      })).then(function() {
        deferred.resolve(outputArray);
      });
    }
  });
  return promise;
};

app.get('/scrape/title/:id', function(req, res) {
  imdb.scrapeTitle(req.params.id).then(function(json) {
    // To write to the system we will use the built in 'fs' library.
    // In this example we will pass 3 parameters to the writeFile function
    // Parameter 1 :  output.json - this is what the created filename will be called
    // Parameter 2 :  JSON.stringify(json, null, 4) - the data to write, here we do an extra step by calling JSON.stringify to make our JSON easier to read
    // Parameter 3 :  callback function - a callback function to let us know the status of our function
    fs.writeFile('output.json', JSON.stringify(json, null, 4), function(err) {
      console.log('File successfully written! - Check your project directory for the output.json file');
    });
    res.send(json);
  });
});

app.get('/scrape/movies-theaters', function(req, res) {
  imdb.scrapeMoviesTheaters().then(function(array) {
    res.send(array);
  });
});

app.listen(port, function() {
  console.log('Started server on port ' + port);
});
exports = module.exports = app;
