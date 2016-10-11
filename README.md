# Twitter crawler

L'application Twitter Crawler est un script NodeJS en CLI qui permet de récupérer en fonction d'un mot, les conversations twitter correspondantes.
Les données retournées par l'API sont sauvegardées dans la base de notre choix, préalablement créee via l'option -c. Une fonctionnalité permet d'exporter les données de la base au format Excel.
Une option permet aussi de générer un serveur web afin d'afficher le contenu de notre base au format HTML.

**Lancement de l'application, accés au menu.**
>twitter -s

**Export au format excel.**
>twitter -e [database]

**Lancement du serveur web.**
>twitter -r [database]

**Création d'une base de données.**
>twitter -c [nom de la base.db]

**Suppression d'une base de données.**
>twitter -d [nom de la base.db]


#Liste des modules utilisés
```javascript
const http = require('http') //Lancement d'un serveur
const program = require('commander'); //Lancement de la commande de lancement avec des options
const inquirer = require('inquirer'); //Interaction utilisateur/questionnement
const fs = require('fs'); //Lecture de dossier
const Twitter = require('twitter'); //API call twitter
const db = require('sqlite'); //Gestion de base de données
const jade = require('jade'); //Gestionnaire de vue
const spawn = require('child_process').spawn; //Ouverture d'un programme interne
const xlsx = require('xlsx'); //Générateur de fichier excel
const Promise = require('bluebird'); //Création de promesses
const gutil = require('gulp-util'); //Changement de style console (ajout de couleurs)
```


