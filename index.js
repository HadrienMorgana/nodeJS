#!/usr/bin/env node

const program = require('commander');
const inquirer = require('inquirer');
const fs = require('fs');
const Twitter = require('twitter');

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
					createTable(save.database);
					inquirer.prompt([
 			 		{
 			 			type: 'input',
 			 			message: 'Tapez le hashtag à rechercher',
 			 			name: 'hashtag',
 			 		}
				]).then((answer)=> {
					getTwitter(answer.hashtag)
				})
			})
		}
	})
}

function getTwitter(word)
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
			 console.log(index.text);
			 console.log(index.user.name);
			 console.log(index.user.profile_image_url);
		 })
	});
}

function createTable(database)
{
	// db.open('twitter.db').then(() => {
	// 	console.log("open");
	// })
}
start();
