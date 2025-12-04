# QUIZZ - Application Web IPSSI

Application web de gestion de quiz développée pour le projet IPSSI. Cette plateforme permet aux écoles et entreprises de créer des quiz, et aux utilisateurs d'y répondre.

## 📋 Table des matières

- [Aperçu](#aperçu)
- [Fonctionnalités](#fonctionnalités)
- [Technologies utilisées](#technologies-utilisées)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Démarrage](#démarrage)
- [Architecture du projet](#architecture-du-projet)
- [Modèles de données](#modèles-de-données)
- [API Endpoints](#api-endpoints)
- [Système d'authentification](#système-dauthentification)
- [Gestion des rôles](#gestion-des-rôles)
- [Contribuer](#contribuer)

## 🎯 Aperçu

QUIZZ est une application web complète qui permet :
- Aux écoles et entreprises de créer et gérer des questionnaires
- Aux utilisateurs de répondre aux quiz disponibles
- Aux administrateurs de superviser l'ensemble de la plateforme
- Une gestion fine des accès basée sur les rôles utilisateurs

## ✨ Fonctionnalités

### Pour tous les utilisateurs
- ✅ Inscription et connexion sécurisées
- ✅ Authentification par JWT avec cookies sécurisés
- ✅ Tableau de bord personnalisé selon le rôle

### Pour les écoles et entreprises
- ✅ Création de quiz avec questions personnalisées
- ✅ Gestion de leurs propres quiz
- ✅ Consultation des réponses des utilisateurs

### Pour les administrateurs
- ✅ Gestion complète des utilisateurs
- ✅ Activation/désactivation des comptes
- ✅ Vue d'ensemble de tous les quiz

## 🛠 Technologies utilisées

### Backend
- **Node.js** - Environnement d'exécution JavaScript
- **Express.js** - Framework web minimaliste
- **MySQL** - Base de données relationnelle
- **Sequelize** - ORM pour MySQL
- **JWT** - Authentification par tokens
- **bcrypt** - Hashage sécurisé des mots de passe

### Frontend
- **HTML5/CSS3** - Interface utilisateur
- **JavaScript** - Logique client

### Autres
- **cookie-parser** - Gestion des cookies
- **dotenv** - Gestion des variables d'environnement

## 📦 Prérequis

Avant de commencer, assurez-vous d'avoir installé :

- [Node.js](https://nodejs.org/) (version 14 ou supérieure)
- [MySQL](https://www.mysql.com/) (version 5.7 ou supérieure)
- [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)

## 🚀 Installation

1. **Cloner le repository**
```bash
git clone https://github.com/KOSAAKU/QUIZZ-PROJETWEB-IPSSI.git
cd QUIZZ-PROJETWEB-IPSSI
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Créer la base de données**
```sql
CREATE DATABASE quizzeo;
```

## ⚙️ Configuration

1. **Créer le fichier `.env`**

Copiez le fichier `.env.example` et renommez-le en `.env` :
```bash
cp .env.example .env
```

2. **Configurer les variables d'environnement**

Éditez le fichier `.env` avec vos paramètres :
```env
# Configuration de la base de données
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=votre_mot_de_passe
DB_NAME=quizzeo

# Clé secrète JWT (générez une clé aléatoire sécurisée)
JWT_SECRET=votre_cle_secrete_super_securisee
```

> **Note de sécurité** : Générez une clé JWT forte et unique pour la production. Ne commitez jamais votre fichier `.env` !

## 🎬 Démarrage

Lancez le serveur de développement :

```bash
npm start
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

La base de données se synchronisera automatiquement au démarrage grâce à `sequelize.sync()`.

## 📁 Architecture du projet

```
QUIZZ-PROJETWEB-IPSSI/
├── server.js                    # Point d'entrée de l'application
├── config/
│   └── database.js             # Configuration Sequelize
├── controllers/
│   ├── AuthController.js       # Logique d'authentification
│   ├── TokenController.js      # Gestion des JWT
│   ├── UserController.js       # CRUD utilisateurs
│   └── LoggerController.js     # Logger des requêtes
├── seed.js                     # Définition des modèles Sequelize
├── public/                     # Fichiers statiques frontend
│   ├── index.html             # Page d'accueil
│   ├── login.html             # Page de connexion
│   ├── register.html          # Page d'inscription
│   ├── dashbadmin.html        # Dashboard administrateur
│   ├── dashbecole.html        # Dashboard école
│   ├── dashbentreprise.html   # Dashboard entreprise
│   └── create_quiz.html       # Page de création de quiz
├── .env.example               # Modèle de configuration
├── .gitignore                 # Fichiers à ignorer par Git
├── package.json               # Dépendances et scripts
├── CLAUDE.md                  # Instructions pour Claude Code
└── README.md                  # Documentation (ce fichier)
```

## 🗄 Modèles de données

### User (Utilisateur)
```javascript
{
  id: INTEGER (PK, Auto-increment),
  email: STRING (UNIQUE, NOT NULL),
  password: STRING (NOT NULL, hashé avec bcrypt),
  fullname: STRING,
  role: ENUM('admin', 'ecole', 'entreprise', 'user'),
  actif: BOOLEAN (par défaut: true),
  createdAt: DATE
}
```

### Quizz
```javascript
{
  id: INTEGER (PK, Auto-increment),
  name: STRING (NOT NULL),
  questions: JSON (tableau de questions),
  ownerId: INTEGER (FK -> User.id),
  status: STRING (ex: 'pending', 'published'),
  createdAt: DATE
}
```

### Reponses
```javascript
{
  id: INTEGER (PK, Auto-increment),
  quizzId: INTEGER (FK -> Quizz.id),
  userId: INTEGER (FK -> User.id),
  answers: JSON (réponses de l'utilisateur),
  createdAt: DATE
}
```

## 🔌 API Endpoints

### Authentification

| Méthode | Endpoint | Description | Accès |
|---------|----------|-------------|-------|
| POST | `/register` | Inscription d'un nouvel utilisateur | Public |
| POST | `/login` | Connexion utilisateur | Public |
| GET | `/dashboard` | Accès au tableau de bord | Authentifié |

### Utilisateurs

| Méthode | Endpoint | Description | Accès |
|---------|----------|-------------|-------|
| GET | `/users` | Liste tous les utilisateurs | Admin uniquement |

### Quiz

| Méthode | Endpoint | Description | Accès |
|---------|----------|-------------|-------|
| GET | `/quizzes` | Liste les quiz de l'utilisateur | Authentifié |
| POST | `/quizzes` | Créer un nouveau quiz | Écoles & Entreprises |
| GET | `/quizz/create` | Page de création de quiz | Écoles & Entreprises |

## 🔐 Système d'authentification

L'application utilise un système d'authentification sécurisé :

### Inscription
1. Validation des données (email unique, rôle valide)
2. Hashage du mot de passe avec **bcrypt**
3. Création du compte utilisateur dans la base de données

### Connexion
1. Vérification des identifiants avec `bcrypt.compare()`
2. Génération d'un JWT avec `jsonwebtoken` (validité : 30 jours)
3. Stockage du token dans un cookie **httpOnly** sécurisé

### Vérification des tokens
```javascript
// Le token est stocké dans un cookie au format JSON
const tokenCookie = req.cookies.token;
const token = JSON.parse(tokenCookie);
const decoded = verifyToken(token);
```

### Protection des routes
Toutes les routes protégées suivent ce schéma :
1. Extraction du token depuis `req.cookies.token`
2. Parsing JSON du cookie
3. Vérification avec `verifyToken(token)`
4. Contrôle que l'utilisateur existe et est actif (`actif = true`)
5. Vérification du rôle si nécessaire

## 👥 Gestion des rôles

L'application supporte 4 rôles distincts :

### 🔴 Admin
- Accès complet à la plateforme
- Gestion de tous les utilisateurs
- Activation/désactivation des comptes
- Vue sur tous les quiz

### 🟢 École (`ecole`)
- Création et gestion de quiz
- Consultation des réponses
- Dashboard dédié

### 🟡 Entreprise (`entreprise`)
- Création et gestion de quiz
- Consultation des réponses
- Dashboard dédié

### 🔵 Utilisateur (`user`)
- Participation aux quiz disponibles
- Consultation de ses réponses

## 🤝 Contribuer

Les contributions sont les bienvenues ! Pour contribuer :

1. Fork le projet
2. Créez une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Pushez vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📝 License

Ce projet est sous licence ISC.

## 🔗 Liens utiles

- [Repository GitHub](https://github.com/KOSAAKU/QUIZZ-PROJETWEB-IPSSI)
- [Issues](https://github.com/KOSAAKU/QUIZZ-PROJETWEB-IPSSI/issues)

## 📧 Contact

Pour toute question ou suggestion, n'hésitez pas à ouvrir une issue sur GitHub.

---

Développé avec ❤️ pour le projet IPSSI
