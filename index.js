#!/usr/bin/env node
const http = require('http')
const program = require('commander');
const inquirer = require('inquirer');
const fs = require('fs');
const Twitter = require('twitter');
const db = require('sqlite');
const jade = require('jade');
const spawn = require('child_process').spawn
const xlsx = require('xlsx');
const Promise = require('bluebird');
const gutil = require('gulp-util');
const questions = require('./questions.json');
const configuration = require('./configuration.json');
function start()
{
	program
		.version('1.0.0')
		.option('-s, --start', 'Start twitter crawler')
		.option('-e, --export [database]', 'Export to excel')
		.option('-r, --run [database]', 'Run web server')
		.option('-c, --create [database]', 'Create database to save data')
		.option('-d, --delete [database]', 'Delete database to erase data')
		.parse(process.argv);

	if(program.start)
	{
		menu();
	} else if (program.create) {
		if(program.create.indexOf(".db") > -1){
			createTable(program.create, "", false);
		}
		else {
			console.log('Veuillez retaper le nom de la base en incluant l\'extention .db');
		}
	} else if (program.delete) {
		fs.exists('./'+program.delete, function(exists) {
		  if(exists) {
		    console.log(gutil.colors.green('File exists. Deleting now ...'));
		    fs.unlink('./'+program.delete);
		  } else {
		    console.log(gutil.colors.red('File not found, so not deleting.'));
		  }
		});
	} else if (program.export) {
			if(program.export != true && program.export.indexOf(".db") > -1)
			{
				generateExcel(program.export);
			}
			else {
				console.log('Veuillez retaper le nom de la base en incluant l\'extention .db')
			}
	} else if (program.run) {
		if(program.run != true && program.run.indexOf(".db") > -1)
		{
			startServer(program.run);
		}
		else {
			console.log('Veuillez retaper le nom de la base en incluant l\'extention .db')
		}
	} else {
		program.help();
	}
}

function menu()
{
	inquirer.prompt([
		questions.questionOne
	]).then((answer) => {
		if(answer.choice == "Enregister les données en base")
		{
			askQuestion("Dans quelle base voulez-vous sauvegarder les données ?").then((save)=>{
							inquirer.prompt([
		 			 		{
		 			 			type: 'input',
		 			 			message: 'Tapez le hashtag à rechercher',
		 			 			name: 'hashtag',
		 			 		}
						]).then((search)=> {
							createTable(save, search.hashtag, true);
						})
					})
		}
		else if (answer.choice == "Exporter les données en BDD (excel)") {
			askQuestion("De quelle base voulez-vous extraire les données ?").then((response)=>{
				generateExcel(response);
			})
		}
		else if (answer.choice == "Quitter l'application") {
			process.exit(1);
		}
		else {
			askQuestion("De quelle base voulez-vous voir les données ?").then((response)=>{
				startServer(response);
			})
		}
	});
}

function getTwitter(database, word)
{
	var client = new Twitter({
		consumer_key: configuration.consumer_key,
		consumer_secret: configuration.consumer_secret,
		access_token_key: configuration.access_token_key,
		access_token_secret: configuration.access_token_secret
	});

	var params = {screen_name: 'nodejs'};
	client.get('search/tweets', {q: word}, function(error, tweets, response) {
		let i = 0;
		 tweets.statuses.forEach(function(index){
			 i++;
			 insertInDatabase(database, index.user.name, index.user.profile_image_url, index.text, word);
			 if(i == tweets.statuses.length)
			 {
				 console.log('Les données ont été correctement insérées');
			 	 menu();
			 }
		 })
		 console.log('Les données sont en cours d\'insertion');
	});
}

function createTable(database, hashtag, insert)
{
	db.open(database).then(() => {
		db.run('CREATE TABLE IF NOT EXISTS twitter (id INTEGER PRIMARY KEY, pseudo TEXT, description TEXT, picture TEXT, recherche TEXT)').then(()=>{
			if(insert == true)
			{
				getTwitter(database, hashtag);
			}
		})
	})
}

function insertInDatabase(database, name, picture, description, word)
{
	db.all('SELECT count(*) as count FROM twitter WHERE pseudo=? AND description=? AND recherche=?', name, description, word).then((response) => {
		if(response[0].count == 0)
		{
			db.run('INSERT INTO twitter VALUES(NULL,?,?,?,?)', name, description, picture, word);
		}
	})
}

function startServer(database)
{
		db.open(database).then(() => {
			db.all('SELECT * FROM twitter').then((response) => {
				http.createServer((req, res) => {
					jade.renderFile('index.jade', { result: response }, function(err, html) {
			            res.write(html)
			            res.end()
			        });
				}).listen(8080)
			})
		})
	spawn('open', ['http://localhost:8080']);
}

function generateExcel(database)
{
	db.open(database).then(() => {
		retrieveData().then((data) => {
			let bigArray = [];
			bigArray.push(["Id", "Pseudo", "Description", "Picture", "Recherche"])
			data.forEach(function(index)
			{
				var array = [];
				array.push(index.id);
				array.push(index.pseudo);
				array.push(index.description);
				array.push(index.picture);
				array.push(index.recherche);
				bigArray.push(array);
			})

			var data = bigArray;
			var ws_name = "Twitter Crawler";
			var wb = new Workbook(), ws = sheet_from_array_of_arrays(data);
			wb.SheetNames.push(ws_name);
			wb.Sheets[ws_name] = ws;
			name = database.replace('.db', '.xlsx');
			xlsx.writeFile(wb, name);
			spawn('open', [name]);
		})
	})

}

function datenum(v, date1904) {
	if(date1904) v+=1462;
	var epoch = Date.parse(v);
	return (epoch - new Date(Date.UTC(1899, 11, 30))) / (24 * 60 * 60 * 1000);
}

function sheet_from_array_of_arrays(data, opts) {
	var ws = {};
	var range = {s: {c:10000000, r:10000000}, e: {c:0, r:0 }};
	for(var R = 0; R != data.length; ++R) {
		for(var C = 0; C != data[R].length; ++C) {
			if(range.s.r > R) range.s.r = R;
			if(range.s.c > C) range.s.c = C;
			if(range.e.r < R) range.e.r = R;
			if(range.e.c < C) range.e.c = C;
			var cell = {v: data[R][C] };
			if(cell.v == null) continue;
			var cell_ref = xlsx.utils.encode_cell({c:C,r:R});

			if(typeof cell.v === 'number') cell.t = 'n';
			else if(typeof cell.v === 'boolean') cell.t = 'b';
			else if(cell.v instanceof Date) {
				cell.t = 'n'; cell.z = xlsx.SSF._table[14];
				cell.v = datenum(cell.v);
			}
			else cell.t = 's';

			ws[cell_ref] = cell;
		}
	}
	if(range.s.c < 10000000) ws['!ref'] = xlsx.utils.encode_range(range);
	return ws;
}

function Workbook() {
	if(!(this instanceof Workbook)) return new Workbook();
	this.SheetNames = [];
	this.Sheets = {};
}

function askQuestion(request)
{
	return new Promise(function(resolve,reject){
		let array = [];
		fs.readdir("./", (err, files) => {
			if(err)
			{
				console.error(err);
			}
			else
			{
				files
				 .forEach(function(index){
					 if(~index.indexOf(".db")) {
						 array.push(index);
					 }
				 });
				 if(array.length > 0)
				 {
					 inquirer.prompt([
						{
							type: 'list',
							message: request,
							name: 'database',
							choices: array
						}
					]).then((save) => {
						resolve(save.database);
					})
				 }
				 else {
					 console.log("Veuillez commencer par créer une base en utilisant twitter -d [nom de la base]");
				 	 process.exit(1);
				 }
			}
		})
	})
}

function retrieveData()
{
		return db.all('SELECT * FROM twitter');
}

start();
