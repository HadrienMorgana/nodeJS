#!/usr/bin/env node

const program = require('commander');
const inquirer = require('inquirer');
const fs = require('fs');
const Twitter = require('twitter');
const db = require('sqlite');

function start()
{
	program
		.version('1.0.0')
		.option('-s, --start', 'Start twitter crawler');

	program.parse(process.argv);

	if(program.start)
	{
		menu();
	} else {
		program.help();
	}
}

function menu()
{
	inquirer.prompt([
		{
			type: 'list',
			message: 'Que voulez-vous faire ?',
			name: 'choice',
			choices: [
			'Enregister les données en base',
			'Exporter les données en BDD (excel)',
			'Lancer le serveur web'
			]
		}
	]).then((answer) => {
		if(answer.choice == "Enregister les données en base")
		{
			chooseDatabase();
		}
		else if (answer.choice == "Exporter les données en BDD (excel)") {
			console.log(2);
		}
		else {
			console.log(3);
		}
	});
}

function chooseDatabase()
{
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
				 inquirer.prompt([
			 		{
			 			type: 'list',
			 			message: 'Dans quelle base souhaitez vous enregistrer les données ?',
			 			name: 'database',
			 			choices: array
			 		}
			 	]).then((save) => {
					inquirer.prompt([
 			 		{
 			 			type: 'input',
 			 			message: 'Tapez le hashtag à rechercher',
 			 			name: 'hashtag',
 			 		}
				]).then((answer)=> {
					createTable(save.database, answer.hashtag);
				})
			})
		}
	})
}

function getTwitter(database, word)
{
	var client = new Twitter({
		consumer_key: 'kIpKDwmjDhHcgIagm1ISTokIu',
		consumer_secret: 'G1EIYmx9OESvAQtDi3XnGFmWRG9v3FGKbedmhAhQITFjY9BX5u',
		access_token_key: '783766110374068224-2ylLRi2v9v1z7quQooXprZneQwduw4q',
		access_token_secret: '7zgid8P3gNZYjKPhcwQTvHC3Ep2R4v2J1G98VueG8GgZX'
	});

	var params = {screen_name: 'nodejs'};
	client.get('search/tweets', {q: word}, function(error, tweets, response) {
		 tweets.statuses.forEach(function(index){
			 insertInDatabase(database, index.user.name, index.user.profile_image_url, index.text, word);
		 })
	});
}

function createTable(database, hashtag)
{
	db.open(database).then(() => {
		db.run('CREATE TABLE IF NOT EXISTS twitter (id INTEGER PRIMARY KEY, pseudo TEXT, description TEXT, picture TEXT, recherche sTEXT)').then(()=>{
			getTwitter(database, hashtag);
		})
	})
}

function insertInDatabase(database, name, picture, description, word)
{
		db.run('INSERT INTO twitter VALUES(NULL,?,?,?,?)', name, description, picture, word);
}

start();
