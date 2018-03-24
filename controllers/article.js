var express = require('express');
var path = require('path');
var Article = require('../models/Article.js');
var Note = require('../models/Note.js');
var router = express.Router();
// Our scraping tools
var request = require("request");
var cheerio = require("cheerio");
var ObjectId = require('mongoose').Types.ObjectId;

router.get("/", function(req, res) {
    res.render("index");
});

router.get("/savedArticles", function(req, res) {
    res.render("saved");
});

router.get("/getSavedArticles", function(req, res) {
    // Grab every doc in the Articles array where saved = true
    Article.find({saved: true}, function(error, doc) {
        if (error) {
            console.log(error);
        } else {
            res.json(doc);
        }
    });
});

router.get("/getNote", function(req, res) {
    var query = { _id: new ObjectId(req.query.id) };
    Note.find(query, function(error, doc) {
        if (error) {
            console.log(error);
        } else {
            res.json(doc);
        }
    });
});

router.get("/articles", function(req, res) {
    // Grab every doc in the Articles array
    Article.find({}, function(error, doc) {
        if (error) {
        console.log(error);
        } else {
            res.json(doc);
        }
    });
});

router.post("/save", function(req, res) {
    Article.findOneAndUpdate({ "_id": req.body.articleId }, { "saved": true })
    // Execute the above query
    .exec(function(err, doc) {
      // Log any errors
      if (err) {
        console.log(err);
      }
      else {
        // Or send the document to the browser
        res.sendStatus(200);
      }
    });
});

router.post("/delete", function(req, res) {
    Article.findOneAndUpdate({ "_id": req.body.articleId }, { "saved": false })
    // Execute the above query
    .exec(function(err, doc) {
      // Log any errors
      if (err) {
        console.log(err);
      }
      else {
        // Or send the document to the browser
        res.sendStatus(200);
      }
    });
});

router.post("/saveNote", function(req, res) {
    var obj = {
        body: req.body.content
    };
    var newNote = new Note(obj);
    
      // And save the new note the db
      newNote.save(function(error, doc) {
        // Log any errors
        if (error) {
          console.log(error);
        }
        // Otherwise
        else {
          // Use the article id to find and update it's note
          var noteId = doc._id;
          Article.findOneAndUpdate({ "_id": req.body.articleId }, { "note": doc._id })
          // Execute the above query
          .exec(function(err, doc) {
            // Log any errors
            if (err) {
              console.log(err);
            }
            else {
              // Or send the document to the browser
              res.send({note: noteId});
            }
          });
        }
      });
});

router.post("/removeNote", function(req, res) {
    // Use the article id to find and update it's note
    Article.findOneAndUpdate({ "_id": req.body.articleId }, { "note": null })
    // Execute the above query
    .exec(function(err, doc) {
      // Log any errors
      if (err) {
        console.log(err);
      }
      else {
        // Or send the document to the browser
        res.sendStatus(200);
      }
    });
});


//A GET route to scrape article data from New York Times
router.post("/scrape", function(req, res) {
    // First, we grab the body of the html with request
    request("https://www.nytimes.com/section/technology", function(error, response, html) {
      // Then, we load that into cheerio and save it to $ for a shorthand selector
      var $ = cheerio.load(html);
      // Now, we grab every h2 within an article tag, and do the following:
      $("article").each(function(i, element) {
        // Save an empty result object
        var result = {};
  
        // Add the text and href of every link, and save them as properties of the result object
        result.title = $(this).find(".headline").text().replace(/(\r\n|\n|\r)/gm,"").trim();
        result.link = $(this).find("a").attr("href");
        result.storyId = $(this).parent("li").attr("id");
        if(result.title != '' && result.storyId != undefined) {
            // Using our Article model, create a new entry
            // This effectively passes the result object to the entry (and the title and link)
            var entry = new Article(result);
            
            // Now, save that entry to the db
            Article.update(
                {storyId: entry.storyId},
                {$setOnInsert: entry},
                {upsert: true},
                function(err, doc) {
                    if (err) {
                        console.log(err);
                    }
                }
            );
        }
      })
    }).on('response', function(response){
        res.send(response);
    });
  });

module.exports.Router = router;