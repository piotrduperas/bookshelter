var express = require('express');
var app = express();
var pdfTE = require("pdf-table-extractor");
var pdf_table_extractor = require("pdf-table-extractor");
var fs = require('fs');

app.set('view engine', 'ejs');

let port = 8083;
app.listen(port);
console.log('[ OK ] '+port+' is the magic port');


app.get('/', function(req, res) {
	res.render('index', {
		req: req.query,
		page: 'index'
	});
});

app.get('/main', function(req, res) {
	if(!req.query.key){
		req.query.key = '';
		for(let i = 0; i < 10; i++)
			req.query.key += String.fromCharCode(Math.floor(Math.random() * 26) + 97);
		res.redirect('main?key='+req.query.key);
		db[req.query.key] = {liked:{}, deleted:{}}
		return;
	}
	
	res.render('main', {
		books: getBooks(req.query.key),
		booksCount: booksCount,
		req: req.query,
		page: 'main',
		update: lastUpdate
	});
});

app.get('/liked', function(req, res) {
	let m = [];
	if(req.query.key){
		m = getLikedBooks(req.query.key);
	}

	res.render('liked', {
		books: m,
		booksCount: booksCount,
		req: req.query,
		page: 'liked',
		update: lastUpdate
	});
});

app.get('/removed', function(req, res) {
	let m = [];
	if(req.query.key){
		m = getRemovedBooks(req.query.key);
	}

	res.render('removed', {
		books: m,
		booksCount: booksCount,
		req: req.query,
		page: 'removed',
		update: lastUpdate
	});
});

app.get('/action', function(req, res) {
	let m = req.query.key;
	if(!req.query.a || !m || !db[m] || !books[req.query.book]){
		return;
	}
	if(req.query.a == 'like'){
		if(req.query.s == 'true'){
			db[m].liked[req.query.book] = 1;
		}
		else{
			db[m].liked[req.query.book] = undefined;
		}
	}
	if(req.query.a == 'delete'){
		if(req.query.s == '0' || !req.query.s){
			db[m].deleted[req.query.book] = 1;
		}
		else{
			db[m].deleted[req.query.book] = undefined;
		}
	}
	saveDB();

	res.sendStatus(200);
});

app.get('/data.json', function(req, res) {
	res.json(getBooks(req.query.key));
});
app.get('/data_liked.json', function(req, res) {
	res.json(getLikedBooks(req.query.key));
});
app.get('/data_removed.json', function(req, res) {
	res.json(getRemovedBooks(req.query.key));
});
app.use(express.static('public'))

books = [];
booksArray = [];
booksCount = 0;





function getShelter(){
	getWebsite('http://www.koszykowa.pl/dla-czytelnikow/schronisko-ksiazek', parseShelter);
}

function parseShelter(body){
	console.log('[ OK ] Getting website')
	const cheerio = require('cheerio')
	const $ = cheerio.load(body)
	let a = $('.at_url[title^="Pobierz plik (Spis"]');
	let m = a.text();
	if(!m) {
		console.log("[ ERROR ] Cannot get current list of books");
	}
	else{
		if(fileName != m){
			sendNotification('Nowe książki na Koszykowej')
			fileName = m;
			lastUpdate = new Date().toJSON().slice(0,10);
			saveDB();
		}
		getNewList(a.attr('href'));
	}
	setTimeout(getShelter, 5*60*1000);
}

function getWebsite(url, cb){
	require('curlrequest').request({url:url, method:'GET', encoding:null, headers:{accept:'text/pdf'}}, function (err, body){
		cb(body)
	});
}

function getNewList(link){
	getWebsite(link.replace(/ /g, "%20"), saveList)
}

function saveList(data){
	console.log('[ OK ] Downloading PDF');
	fs.writeFile(__dirname + "/shelter.pdf", data, 'binary', function(err) {
    	if(err) {
        	return console.log(err);
    	}
    	console.log('[ OK ] Saving PDF');
    	books = {};
    	booksArray = [];
    	booksCount = 0;
    	readListFromPDF();
	}); 
}

function sendNotification(msg, cb){
	var nodemailer = require('nodemailer');

	var transporter = nodemailer.createTransport({
	  service: 'gmail',
	  auth: {
	    user: 'hackercats.team@gmail.com',
	    pass: 'PASSWORD_HERE'
	  }
	});

	var mailOptions = {
	  from: 'hackercats.team@gmail.com',
	  to: 'hackercats.team@gmail.com',
	  subject: 'Schonisko na Koszykowej',
	  text: msg
	};

	transporter.sendMail(mailOptions, function(error, info){
	  if (error) {
	    console.log('[ ERROR ] Cannot send email:', error);
	  } else {
	    console.log('[ OK ] Email sent:', info.response);
	    cb();
	  }
	}); 
}

function readListFromPDF(){
	pdfTE("shelter.pdf", readTableFromPDF, function(err){
		console.log('Error: ' + err)
	});
}

function readTableFromPDF(r)
{
	for(let page in r.pageTables){
   		let p = r.pageTables[page].tables;
   		for(let m in p){
   			if(p[m][0] == 'ID') continue;
   			booksCount++;
   			let id = p[m][0];
   			let author = p[m][1];
   			let title = p[m][2];
   			let year = p[m][3];
   			let publ = p[m][4];
   			let place = p[m][5];
   			let unique = encodeURIComponent((title+'_'+author).toLowerCase().replace(/ /g, '_'));
   			if(books[unique]){
   				let u = books[unique];
   				u.places.push(place);
   				u.ids.push(id);
   			}
   			else{
   				books[unique] = {
   					ids: [id],
   					places: [place],
   					year: year,
   					publ: publ,
   					title: title,
   					author: author,
   					key: unique
   				}
   				//console.log(books[title+author]);
   			}
   		}
	}
	console.log('[ OK ] Reading books data')
}

function getBooks(user){
	let u = []
	for(let i in books){
		let b = JSON.parse(JSON.stringify(books[i]));
		if(user && db[user] && db[user].deleted[b.key]) continue;
		if(user && db[user] && db[user].liked[b.key]) b.heart = 1;
		else b.heart = 0;
		u.push(b);
	}
	return u;
}

function getLikedBooks(user){
	let u = []
	if(!user) return u;
	for(let i in books){
		let b = JSON.parse(JSON.stringify(books[i]));
		if(user && db[user] && db[user].deleted[b.key]) continue;
		if(user && db[user] && db[user].liked[b.key]) b.heart = 1;
		else continue;
		u.push(b);
	}
	return u;
}

function getRemovedBooks(user){
	let u = []
	if(!user) return u;
	for(let i in books){
		let b = JSON.parse(JSON.stringify(books[i]));
		if(user && db[user] && !db[user].deleted[b.key]) continue;
		if(user && db[user] && db[user].liked[b.key]) b.heart = 1;
		else b.heart = 0;
		u.push(b);
	}
	return u;
}

function saveDB(){
	let d = JSON.stringify({users:db, update: lastUpdate, fileName:fileName});
	fs.writeFile("books.json", d, function(err) {
		if(err) {
			return console.log(err);
		}
		console.log("[ OK ] Saving database");
	});
}

db = {}
fs.readFile('books.json', 'utf8', function (err, data) {
	if(err) {
		console.log('[ ERROR ] Cannot read database file');
		db = {};
		lastUpdate = '';
		fileName = '';
		getShelter();
		return;
	};
	let u;
	try{
		u = JSON.parse(data);
	}
	catch(Exception)
	{
		console.log('[ ERROR ] Data in books.json file are not correct');
		db = {};
		lastUpdate = '';
		fileName = '';
		getShelter();
		return;
	}
	db = u.users
	lastUpdate = u.update
	fileName = u.fileName
	console.log('[ OK ] Reading database file');
	getShelter();
});
