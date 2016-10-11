#!/usr/bin/env node

//*********DECLARATION DES CONSTANTES********
const http = require('http');
const program = require('commander');
const inquirer = require('inquirer');
const fs = require('fs');
const Twitter = require('twitter');
const db = require('sqlite');
const jade = require('jade');
const spawn = require('child_process').spawn;
const xlsx = require('xlsx');
const promise = require('bluebird');
const gutil = require('gulp-util');
const questions = require('./questions.json');
const configuration = require('./configuration.json');
//**********************************************

//Fonction start utilisant commander pour l'ajout des options
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
		menu(); //Lancement du menu pour l'option -s (start)
	} else if (program.create) {
		if(program.create.indexOf(".db") > -1){
			createTable(program.create, "", false); //Creation d'une base pour l'option -c (create) avec le nom de la base.db
		}
		else {
			console.log('Veuillez retaper le nom de la base en incluant l\'extention .db'); //Erreur si le nom de la base ne comporte pas l'extension.db
		}
	} else if (program.delete) {
		fs.exists('./'+program.delete, function(exists) { //Suppression de la base si celle-ci existe
		  if(exists) {
		    console.log(gutil.colors.green('File exists. Deleting now ...')); //Affichage en couleur de l'information via gutil
		    fs.unlink('./'+program.delete); //Suppresion du fichier
		  } else {
		    console.log(gutil.colors.red('File not found, so not deleting.'));
		  }
		});
	} else if (program.export) { // Pour l'option -e (export)
			if(program.export !== true && program.export.indexOf(".db") > -1) // Si le champ comporte un nom avec l'extension .db
			{
				generateExcel(program.export); // Export d'une base au format excel
			}
			else {
				console.log('Veuillez retaper le nom de la base en incluant l\'extention .db');
			}
	} else if (program.run) { // Pour l'option -r (run)
		if(program.run !== true && program.run.indexOf(".db") > -1)
		{
			startServer(program.run); // Lancement du serveur web pour une base choisie
		}
		else {
			console.log('Veuillez retaper le nom de la base en incluant l\'extention .db');
		}
	} else {
		program.help();
	}
}

// Function menu appelée pour intéragir avec l'utilisateur
function menu()
{
	inquirer.prompt([
		questions.questionOne // Question 1 du fichier questions.json
	]).then((answer) => {
		if(answer.choice == "Enregister les données en base")
		{
			askQuestion("Dans quelle base voulez-vous sauvegarder les données ?").then((save)=>{
							inquirer.prompt([
		 			 		questions.questionTwo
						]).then((search)=> {
							createTable(save, search.hashtag, true); // Création d'une table pour la table contenu dans la variable save, passage du hashtag à rechercher pour la fonction getTwitter
						});
					});
		}
		else if (answer.choice == "Exporter les données en BDD (excel)") {
			askQuestion("De quelle base voulez-vous extraire les données ?").then((response)=>{
				generateExcel(response); // Génération de la table excel
			});
		}
		else if (answer.choice == "Quitter l'application") {
			process.exit(1);
		}
		else {
			askQuestion("De quelle base voulez-vous voir les données ?").then((response)=>{
				startServer(response); // Lancement du serveur web
			});
		}
	});
}

// Fonction pour récupérer les conversations autour d'un mot clé passé en paramètre
function getTwitter(database, word)
{
	var client = new Twitter({
		consumer_key: configuration.consumer_key,
		consumer_secret: configuration.consumer_secret,
		access_token_key: configuration.access_token_key,
		access_token_secret: configuration.access_token_secret
	});

	var params = {screen_name: 'nodejs'};
	client.get('search/tweets', {q: word}, function(error, tweets, response) { // API call
		let i = 0;
		 tweets.statuses.forEach(function(index){ // Boucle sur chaque résultat
			 i++;
			 insertInDatabase(database, index.user.name, index.user.profile_image_url, index.text, word); // Insertion en base
			 if(i == tweets.statuses.length) // Quand toutes les insertions sont terminées
			 {
				 console.log('Les données ont été correctement insérées');
			 	 menu(); // Affichage du menu
			 }
		 });
		 console.log('Les données sont en cours d\'insertion'); // Affichage asynchrone
	});
}

// Function de création de table
function createTable(database, hashtag, insert)
{
	db.open(database).then(() => {
		db.run('CREATE TABLE IF NOT EXISTS twitter (id INTEGER PRIMARY KEY, pseudo TEXT, description TEXT, picture TEXT, recherche TEXT)').then(()=>{
			if(insert === true)
			{
				getTwitter(database, hashtag); // Passage des paramètres à la fonction
			}
		});
	});
}

// Fonction d'insertion en base
function insertInDatabase(database, name, picture, description, word)
{
	db.all('SELECT count(*) as count FROM twitter WHERE pseudo=? AND description=? AND recherche=?', name, description, word).then((response) => { // Vérifier si la donnée n'existe pas déjà
		if(response[0].count === 0)
		{
			db.run('INSERT INTO twitter VALUES(NULL,?,?,?,?)', name, description, picture, word); //  Si la donnée n'existe pas en base, insertion de celle-ci
		}
	});
}

// Fonction lancement du serveur
function startServer(database)
{
		db.open(database).then(() => {
			retrieveData().then((response) => {
				http.createServer((req, res) => {
					jade.renderFile('index.jade', { result: response }, function(err, html) { // Utilisation du module jade pour passer à la vue les résultats de la réquete SQLITE
			            res.write(html);
			            res.end();
			        });
				}).listen(8080);
			});
		});
	spawn('open', ['http://localhost:8080']); // Ouverture du navigateur
}

// Génération excel
function generateExcel(database)
{
	db.open(database).then(() => {
		retrieveData().then((data) => {
			let bigArray = [];
			bigArray.push(["Id", "Pseudo", "Description", "Picture", "Recherche"]);
			data.forEach(function(index) // Boucle de création de la data au format adéquat
			{
				var array = [];
				array.push(index.id);
				array.push(index.pseudo);
				array.push(index.description);
				array.push(index.picture);
				array.push(index.recherche);
				bigArray.push(array);
			});

			var lastData = bigArray; // [{COLUMN_NAME, COLUMN_NAME},{DATA_ROW1, DATA_ROW1},{DATA_ROW2, DATA_ROW2}]
			var ws_name = "Twitter Crawler"; // Nom de la feuille
			var wb = new Workbook(), ws = sheet_from_array_of_arrays(lastData);
			wb.SheetNames.push(ws_name);
			wb.Sheets[ws_name] = ws;
			name = database.replace('.db', '.xlsx');
			xlsx.writeFile(wb, name); // Ecriture du fichier
			spawn('open', [name]); // Ouverture
			console.log('Ouverture du fichier généré en cours');
		});
	});

}

// Fonction de conversion des dates pour le format excel
function datenum(v, date1904) {
	if(date1904) v+=1462;
	var epoch = Date.parse(v);
	return (epoch - new Date(Date.UTC(1899, 11, 30))) / (24 * 60 * 60 * 1000);
}

// Fonction de purification des données à insérer pour excel
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
			if(cell.v === null) continue;
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

// Instanciation de la "PAGE/Zone de travail" excel
function Workbook() {
	if(!(this instanceof Workbook)) return new Workbook();
	this.SheetNames = [];
	this.Sheets = {};
}

// Fonction d'intéraction avec l'utilisateur
function askQuestion(request)
{
	return new promise(function(resolve,reject){ // Utilisation de bluebird pour retourner une promesse
		let array = [];
		fs.readdir("./", (err, files) => { // Lecture du dossier racine pour trouver les databases existantes
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
					});
				 }
				 else {
					 console.log("Veuillez commencer par créer une base en utilisant twitter -d [nom de la base]");
				 	 process.exit(1);
				 }
			}
		});
	});
}

// Fonction de récupération des données de la table twitter
function retrieveData()
{
		return db.all('SELECT * FROM twitter');
}

// Lancement du programme
start();
