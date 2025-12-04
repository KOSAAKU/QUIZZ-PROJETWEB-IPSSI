# Documentation Projet - Quizz App IPSSI

**Projet de Développement Web - IPSSI**

**Dépôt GitHub:** https://github.com/KOSAAKU/QUIZZ-PROJETWEB-IPSSI

---

## Table des matières

1. [Présentation du projet](#présentation-du-projet)
2. [Fonctionnalités](#fonctionnalités)
3. [Architecture technique](#architecture-technique)
4. [Modèle de données](#modèle-de-données)
5. [Structure du projet](#structure-du-projet)
6. [Installation et configuration](#installation-et-configuration)
7. [Guide d'utilisation](#guide-dutilisation)
8. [API REST](#api-rest)
9. [Sécurité](#sécurité)
10. [Déploiement](#déploiement)
11. [Technologies utilisées](#technologies-utilisées)
12. [Perspectives d'amélioration](#perspectives-damélioration)

---

## 1. Présentation du projet

### 1.1 Contexte

L'application **Quizz App** est une plateforme web développée dans le cadre du projet de développement web à l'IPSSI. Elle permet la création, la gestion et la participation à des quiz en ligne avec un système d'authentification multi-rôles sophistiqué.

### 1.2 Objectifs

- Proposer une plateforme intuitive pour la création et la gestion de quiz
- Offrir une expérience utilisateur différenciée selon les rôles
- Intégrer l'intelligence artificielle pour la génération automatique de questions
- Assurer la sécurité des données et des sessions utilisateurs
- Permettre le suivi et l'analyse des résultats

### 1.3 Public cible

- **Établissements scolaires** : création de quiz pédagogiques
- **Entreprises** : évaluations et formations
- **Utilisateurs finaux** : participation aux quiz et consultation des résultats
- **Administrateurs** : gestion globale de la plateforme

---

## 2. Fonctionnalités

### 2.1 Authentification et gestion des utilisateurs

#### Inscription
- Formulaire d'inscription avec validation
- Choix du rôle (user, ecole, entreprise)
- Hachage sécurisé des mots de passe avec bcrypt
- Vérification de l'unicité de l'email

#### Connexion
- Authentification par email/mot de passe
- Génération de token JWT
- Stockage sécurisé dans des cookies HTTP-only
- Système de sessions avec suivi d'activité

#### Gestion de compte
- Activation/désactivation par l'administrateur
- Page de suspension pour les comptes inactifs
- Déconnexion avec nettoyage des sessions

### 2.2 Fonctionnalités par rôle

#### Administrateur
- **Gestion des utilisateurs**
  - Liste complète de tous les utilisateurs
  - Activation/désactivation des comptes
  - Visualisation des utilisateurs en ligne en temps réel
  - Protection contre l'auto-désactivation

- **Gestion des quiz**
  - Vue d'ensemble de tous les quiz de la plateforme
  - Modification du statut des quiz
  - Suppression de quiz
  - Statistiques détaillées (nombre de participants, questions, etc.)

- **Monitoring**
  - Suivi des utilisateurs connectés
  - Logs des activités
  - Statistiques globales

#### École / Entreprise
- **Création de quiz**
  - Interface dédiée selon le contexte (école/entreprise)
  - Ajout manuel de questions (QCM et ouvertes)
  - Génération automatique de questions via IA Gemini
  - Configuration du quiz (nom, thème, nombre de questions)

- **Gestion des quiz**
  - Liste de mes quiz créés
  - Modification du statut (pending → started → finish)
  - Suppression de quiz
  - Visualisation du nombre de participants

- **Analyse des résultats**
  - Liste des participants par quiz
  - Consultation des réponses individuelles
  - Calcul automatique des scores pour les QCM
  - Visualisation des réponses ouvertes

#### Utilisateur
- **Participation aux quiz**
  - Accès aux quiz au statut "started"
  - Interface de passage de quiz intuitive
  - Support des questions QCM et ouvertes
  - Validation et correction automatique des QCM

- **Historique personnel**
  - Liste de tous les quiz complétés
  - Consultation des scores obtenus
  - Calcul du pourcentage de réussite
  - Date de participation

### 2.3 Génération de quiz par IA

L'application intègre **Google Gemini AI** pour générer automatiquement des questions de quiz :

- Génération basée sur un thème fourni
- Personnalisation selon le contexte (école/entreprise)
- Support des questions QCM avec 4 choix de réponses
- Support des questions ouvertes
- Configuration du nombre de questions à générer
- Validation et formatage automatique des réponses

**Exemple de génération :**
```
Thème : "Histoire de France"
Nombre de questions : 10
Type : Mixte (QCM + ouvertes)
→ L'IA génère 10 questions pertinentes avec réponses
```

---

## 3. Architecture technique

### 3.1 Architecture globale

L'application suit une architecture **client-serveur** classique :

```
┌─────────────────────────────────────────────────┐
│                   CLIENT                         │
│  (HTML/CSS/JavaScript - Pages statiques)        │
└────────────────┬────────────────────────────────┘
                 │ HTTPS
                 │ (Fetch API)
┌────────────────▼────────────────────────────────┐
│              SERVEUR EXPRESS                     │
│  ┌──────────────────────────────────────────┐  │
│  │         Routes & Middlewares             │  │
│  │  • Authentification (JWT)                │  │
│  │  • Vérification des rôles                │  │
│  │  • Logging                               │  │
│  │  • Suivi des utilisateurs en ligne       │  │
│  └──────────────┬───────────────────────────┘  │
│                 │                                │
│  ┌──────────────▼───────────────────────────┐  │
│  │           Controllers                     │  │
│  │  • AuthController                        │  │
│  │  • UserController                        │  │
│  │  • QuizzController                       │  │
│  │  • GeminiController (IA)                 │  │
│  └──────────────┬───────────────────────────┘  │
│                 │                                │
│  ┌──────────────▼───────────────────────────┐  │
│  │        Sequelize ORM                     │  │
│  └──────────────┬───────────────────────────┘  │
└─────────────────┼────────────────────────────────┘
                  │
┌─────────────────▼────────────────────────────────┐
│              BASE DE DONNÉES MySQL               │
│  • Table users                                   │
│  • Table quizzs                                  │
│  • Table reponses                                │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│           SERVICES EXTERNES                      │
│  • Google Gemini AI (génération de questions)   │
└──────────────────────────────────────────────────┘
```

### 3.2 Backend - Express.js

#### Middlewares
1. **Middlewares globaux** (appliqués à toutes les routes)
   - `express.json()` : parsing des corps JSON
   - `express.urlencoded()` : parsing des formulaires
   - `cookieParser()` : gestion des cookies
   - `express-session` : gestion des sessions
   - `loggerMiddleware` : logging des requêtes
   - `trackOnlineUsers` : suivi des utilisateurs connectés
   - `checkAccountActive` : vérification du statut du compte

2. **Middlewares de sécurité**
   - `authenticate` : vérification du token JWT
   - `requireRole(...roles)` : vérification des rôles autorisés
   - `optionalAuth` : authentification optionnelle

#### Structure des routes
```
/                           → Page d'accueil
/login                      → Page de connexion
/register                   → Page d'inscription
/logout                     → Déconnexion
/dashboard                  → Dashboard selon le rôle
/quizz/create              → Création de quiz
/quizz/:id                 → Passage d'un quiz
/dashboard/quizz/:id       → Gestion d'un quiz
/api/*                     → Endpoints API REST
```

### 3.3 Frontend

#### Technologies
- **HTML5** : structure des pages
- **CSS3** : stylisation (design responsive)
- **JavaScript vanilla** : logique client
- **Fetch API** : communication avec le serveur

#### Pages principales
1. **Page d'accueil** (`index.html`)
2. **Authentification** (`login.html`, `register.html`)
3. **Dashboards différenciés**
   - `dashbadmin.html` : tableau de bord administrateur
   - `dashbecole.html` : tableau de bord école
   - `dashbentreprise.html` : tableau de bord entreprise
   - `dashbuser.html` : tableau de bord utilisateur
4. **Gestion des quiz**
   - `create_quizz_ecole.html` : création de quiz (école)
   - `create_quizz_entreprise.html` : création de quiz (entreprise)
   - `quizz.html` : interface de passage de quiz
   - `quiz_participants.html` : liste des participants
   - `quiz_answers.html` : détail des réponses
5. **Pages système**
   - `suspended.html` : compte suspendu
   - `logout.html` : confirmation de déconnexion

---

## 4. Modèle de données

### 4.1 Schéma de base de données

La base de données est structurée autour de trois tables principales :

#### Table `users`
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    fullname VARCHAR(255) NOT NULL,
    role ENUM('admin', 'ecole', 'entreprise', 'user') DEFAULT 'user',
    actif BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Description des champs :**
- `id` : Identifiant unique de l'utilisateur
- `email` : Adresse email (unique)
- `password` : Mot de passe haché (bcrypt)
- `fullname` : Nom complet de l'utilisateur
- `role` : Rôle de l'utilisateur (admin, ecole, entreprise, user)
- `actif` : Statut du compte (true = actif, false = suspendu)
- `createdAt` : Date de création du compte

#### Table `quizzs`
```sql
CREATE TABLE quizzs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    questions JSON,
    ownerId INT NOT NULL,
    status ENUM('pending', 'started', 'finish') DEFAULT 'pending',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ownerId) REFERENCES users(id)
);
```

**Description des champs :**
- `id` : Identifiant unique du quiz
- `name` : Nom du quiz
- `questions` : Tableau JSON des questions
- `ownerId` : ID du créateur (école/entreprise)
- `status` : Statut du quiz (pending/started/finish)
- `createdAt` : Date de création

**Format JSON des questions :**
```json
[
  {
    "id": 1,
    "type": "qcm",
    "question": "Quelle est la capitale de la France ?",
    "options": ["Paris", "Lyon", "Marseille", "Bordeaux"],
    "correctAnswer": 0
  },
  {
    "id": 2,
    "type": "open",
    "question": "Décrivez l'importance de la Révolution française."
  }
]
```

#### Table `reponses`
```sql
CREATE TABLE reponses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    quizzId INT NOT NULL,
    userId INT NOT NULL,
    answers JSON NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quizzId) REFERENCES quizzs(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

**Description des champs :**
- `id` : Identifiant unique de la réponse
- `quizzId` : ID du quiz concerné
- `userId` : ID de l'utilisateur ayant répondu
- `answers` : Tableau JSON des réponses
- `createdAt` : Date de soumission

**Format JSON des réponses :**
```json
[
  {
    "questionId": 1,
    "type": "qcm",
    "selectedAnswer": 0,
    "isCorrect": true
  },
  {
    "questionId": 2,
    "type": "open",
    "answer": "La Révolution française a marqué..."
  }
]
```

### 4.2 Relations

```
users (1) ─────< quizzs (N)
  │                │
  │                │
  └────< reponses >┘
       (N)     (N)
```

- Un **utilisateur** peut créer plusieurs **quiz** (relation 1:N)
- Un **utilisateur** peut avoir plusieurs **réponses** (relation 1:N)
- Un **quiz** peut avoir plusieurs **réponses** (relation 1:N)

---

## 5. Structure du projet

```
QUIZZ-PROJETWEB-IPSSI/
│
├── config/
│   └── database.js              # Configuration Sequelize + MySQL
│
├── controllers/
│   ├── AuthController.js        # Logique d'authentification
│   ├── TokenController.js       # Gestion des tokens JWT
│   ├── UserController.js        # CRUD utilisateurs
│   ├── QuizzController.js       # CRUD quiz
│   ├── GeminiController.js      # Intégration Google Gemini AI
│   └── LoggerController.js      # Système de logs
│
├── middleware/
│   ├── auth.js                  # Middlewares d'authentification
│   ├── accountCheck.js          # Vérification statut compte
│   ├── logger.js                # Middleware de logging
│   └── onlineUsers.js           # Suivi utilisateurs en ligne
│
├── routes/
│   ├── auth.routes.js           # Routes d'authentification
│   ├── user.routes.js           # Routes utilisateurs
│   ├── admin.routes.js          # Routes administrateur
│   ├── quiz.routes.js           # Routes quiz
│   ├── dashboard.routes.js      # Routes dashboards
│   └── pages.routes.js          # Routes pages HTML
│
├── public/
│   ├── assets/                  # Ressources statiques (CSS, JS, images)
│   ├── index.html               # Page d'accueil
│   ├── login.html               # Page de connexion
│   ├── register.html            # Page d'inscription
│   ├── logout.html              # Page de déconnexion
│   ├── suspended.html           # Page compte suspendu
│   ├── dashbadmin.html          # Dashboard administrateur
│   ├── dashbecole.html          # Dashboard école
│   ├── dashbentreprise.html     # Dashboard entreprise
│   ├── dashbuser.html           # Dashboard utilisateur
│   ├── create_quizz_ecole.html  # Création quiz (école)
│   ├── create_quizz_entreprise.html  # Création quiz (entreprise)
│   ├── quizz.html               # Interface passage de quiz
│   ├── quiz_participants.html   # Liste participants
│   └── quiz_answers.html        # Détail réponses
│
├── server.js                    # Point d'entrée de l'application
├── seed.js                      # Définition des modèles Sequelize
├── adminacc.js                  # Script création compte admin
├── test-gemini.js               # Test de l'API Gemini
│
├── .env                         # Variables d'environnement (ignoré)
├── .env.example                 # Exemple de configuration
├── .gitignore                   # Fichiers ignorés par Git
├── package.json                 # Dépendances Node.js
├── package-lock.json            # Versions exactes des dépendances
├── vercel.json                  # Configuration Vercel
│
└── README.md                    # Documentation du projet
```

---

## 6. Installation et configuration

### 6.1 Prérequis

- **Node.js** version 14 ou supérieure
- **npm** (inclus avec Node.js)
- **MySQL** version 8 ou supérieure
- **Git** pour cloner le dépôt
- **Compte Google Cloud** avec accès à l'API Gemini

### 6.2 Installation

#### Étape 1 : Cloner le dépôt
```bash
git clone https://github.com/KOSAAKU/QUIZZ-PROJETWEB-IPSSI.git
cd QUIZZ-PROJETWEB-IPSSI
```

#### Étape 2 : Installer les dépendances
```bash
npm install
```

Les dépendances suivantes seront installées :
- express@^4.21.2
- sequelize@^6.37.7
- mysql2@^3.15.3
- bcrypt@^6.0.0
- jsonwebtoken@^9.0.2
- cookie-parser@^1.4.7
- express-session@^1.18.2
- dotenv@^17.2.3
- @google/generative-ai@^0.24.1

#### Étape 3 : Configuration de la base de données

1. **Créer la base de données MySQL**
```bash
mysql -u root -p
```

```sql
CREATE DATABASE quizz_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

2. **Configurer les variables d'environnement**

Créer un fichier `.env` à la racine du projet :
```env
# Configuration de la base de données
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=votre_mot_de_passe
DB_NAME=quizz_db

# Configuration JWT
JWT_SECRET=votre_secret_jwt_tres_securise_et_aleatoire

# Configuration Google Gemini AI
GEMINI_API_KEY=votre_cle_api_gemini
```

**Important :**
- Remplacez `votre_mot_de_passe` par votre mot de passe MySQL
- Générez un `JWT_SECRET` fort et aléatoire
- Obtenez une clé API Gemini sur [Google AI Studio](https://makersuite.google.com/app/apikey)

#### Étape 4 : Initialisation de la base de données

Les tables seront créées automatiquement au premier démarrage grâce à Sequelize. Si vous souhaitez supprimer d'anciennes tables :

```sql
USE quizz_db;
DROP TABLE IF EXISTS reponses;
DROP TABLE IF EXISTS quizzs;
DROP TABLE IF EXISTS users;
```

#### Étape 5 : Créer un compte administrateur

```bash
node adminacc.js
```

Suivez les instructions pour créer le premier compte administrateur.

#### Étape 6 : Lancer l'application

```bash
npm start
```

L'application sera accessible sur **http://localhost:3000**

### 6.3 Configuration pour le déploiement

#### Vercel
Le fichier `vercel.json` est déjà configuré :
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    },
    {
      "src": "public/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/assets/(.*)",
      "dest": "/public/assets/$1"
    },
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ]
}
```

**Variables d'environnement à configurer sur Vercel :**
- DB_HOST
- DB_PORT
- DB_USER
- DB_PASSWORD
- DB_NAME
- JWT_SECRET
- GEMINI_API_KEY

---

## 7. Guide d'utilisation

### 7.1 Première connexion

1. Accédez à **http://localhost:3000**
2. Cliquez sur **"S'inscrire"**
3. Remplissez le formulaire :
   - Nom complet
   - Email
   - Mot de passe
   - Rôle (user, ecole, entreprise)
4. Cliquez sur **"S'inscrire"**
5. Vous serez redirigé vers la page de connexion
6. Connectez-vous avec vos identifiants

### 7.2 Utilisation en tant qu'administrateur

#### Gestion des utilisateurs
1. Connectez-vous avec un compte administrateur
2. Depuis le dashboard, accédez à **"Gestion des utilisateurs"**
3. Vous pouvez :
   - Voir la liste complète des utilisateurs
   - Activer/désactiver un compte
   - Voir les utilisateurs en ligne

#### Gestion des quiz
1. Accédez à **"Gestion des quiz"**
2. Vous pouvez :
   - Voir tous les quiz de la plateforme
   - Modifier le statut d'un quiz
   - Supprimer un quiz
   - Voir les statistiques

### 7.3 Utilisation en tant qu'école/entreprise

#### Créer un quiz manuellement
1. Depuis le dashboard, cliquez sur **"Créer un quiz"**
2. Remplissez le formulaire :
   - Nom du quiz
   - Ajoutez des questions une par une
   - Pour chaque question, choisissez le type (QCM ou ouverte)
   - Pour les QCM, définissez les options et la bonne réponse
3. Cliquez sur **"Créer le quiz"**

#### Créer un quiz avec l'IA
1. Depuis le dashboard, cliquez sur **"Générer avec l'IA"**
2. Remplissez le formulaire :
   - Thème du quiz
   - Nombre de questions souhaitées
3. L'IA générera automatiquement les questions
4. Vous pouvez modifier les questions avant de valider
5. Cliquez sur **"Créer le quiz"**

#### Gérer un quiz
1. Depuis **"Mes quiz"**, sélectionnez un quiz
2. Vous pouvez :
   - Changer le statut (pending → started → finish)
   - Voir la liste des participants
   - Consulter les réponses individuelles
   - Supprimer le quiz

### 7.4 Utilisation en tant qu'utilisateur

#### Participer à un quiz
1. Depuis le dashboard, accédez à **"Quiz disponibles"**
2. Sélectionnez un quiz au statut "started"
3. Répondez aux questions
4. Cliquez sur **"Soumettre"**
5. Votre score s'affichera (pour les QCM)

#### Consulter l'historique
1. Depuis le dashboard, accédez à **"Mes quiz"**
2. Vous verrez :
   - La liste de tous les quiz complétés
   - Votre score pour chaque quiz
   - Le pourcentage de réussite
   - La date de participation

---

## 8. API REST

### 8.1 Authentification

#### POST /register
Inscription d'un nouveau compte

**Body :**
```json
{
  "fullname": "Jean Dupont",
  "email": "jean.dupont@example.com",
  "password": "motdepasse123",
  "role": "user"
}
```

**Réponse (201) :**
```json
{
  "message": "User registered successfully"
}
```

#### POST /login
Connexion d'un utilisateur

**Body :**
```json
{
  "email": "jean.dupont@example.com",
  "password": "motdepasse123"
}
```

**Réponse (200) :**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "fullname": "Jean Dupont",
    "email": "jean.dupont@example.com",
    "role": "user",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### GET /logout
Déconnexion d'un utilisateur

**Réponse :** Redirection vers `/logout` avec nettoyage des cookies

### 8.2 Utilisateurs

#### GET /users
Liste tous les utilisateurs (authentifié requis)

**Réponse (200) :**
```json
{
  "users": [
    {
      "id": 1,
      "fullname": "Jean Dupont",
      "email": "jean.dupont@example.com",
      "role": "user",
      "actif": true
    }
  ]
}
```

#### GET /api/user/my-quizzes
Liste des quiz de l'utilisateur connecté

**Réponse (200) :**
```json
{
  "count": 5,
  "quizzes": [
    {
      "quizId": 1,
      "quizName": "Quiz d'histoire",
      "answerId": 42,
      "ownerName": "École IPSSI",
      "score": 8,
      "total": 10,
      "percentage": 80,
      "submittedAt": "2024-12-04T18:30:00.000Z"
    }
  ]
}
```

### 8.3 Quiz

#### POST /api/quizzes
Créer un nouveau quiz (école/entreprise)

**Body :**
```json
{
  "name": "Quiz de mathématiques",
  "questions": [
    {
      "id": 1,
      "type": "qcm",
      "question": "Combien font 2+2 ?",
      "options": ["3", "4", "5", "6"],
      "correctAnswer": 1
    },
    {
      "id": 2,
      "type": "open",
      "question": "Expliquez le théorème de Pythagore."
    }
  ]
}
```

**Réponse (201) :**
```json
{
  "message": "Quiz created successfully",
  "quizId": 10
}
```

#### GET /quizzes
Liste des quiz de l'utilisateur connecté (école/entreprise)

**Réponse (200) :**
```json
{
  "quizzes": [
    {
      "id": 10,
      "name": "Quiz de mathématiques",
      "status": "pending",
      "questions": 2,
      "participants": 0
    }
  ]
}
```

#### GET /quizz/:id
Détails d'un quiz spécifique

**Réponse (200) :**
```json
{
  "id": 10,
  "name": "Quiz de mathématiques",
  "status": "started",
  "questions": [...]
}
```

#### POST /quizz/:id/submit
Soumettre les réponses à un quiz

**Body :**
```json
{
  "answers": [
    {
      "questionId": 1,
      "type": "qcm",
      "selectedAnswer": 1,
      "isCorrect": true
    },
    {
      "questionId": 2,
      "type": "open",
      "answer": "Le théorème de Pythagore..."
    }
  ]
}
```

**Réponse (200) :**
```json
{
  "message": "Quiz submitted successfully",
  "score": 8,
  "total": 10,
  "percentage": 80
}
```

#### GET /quizz/:id/toggle
Changer le statut d'un quiz (propriétaire uniquement)

**Réponse (200) :**
```json
{
  "message": "Quiz status updated successfully",
  "status": "started"
}
```

#### DELETE /quizz/:id/delete
Supprimer un quiz (propriétaire uniquement)

**Réponse (200) :**
```json
{
  "message": "Quiz deleted successfully"
}
```

#### GET /api/quizzes/:id/participants
Liste des participants d'un quiz (propriétaire uniquement)

**Réponse (200) :**
```json
{
  "count": 5,
  "participants": [
    {
      "answerId": 42,
      "userName": "Jean Dupont",
      "userEmail": "jean.dupont@example.com",
      "score": 8,
      "total": 10,
      "percentage": 80,
      "submittedAt": "2024-12-04T18:30:00.000Z"
    }
  ]
}
```

#### GET /api/quizzes/:id/answers/:answerId
Détails des réponses d'un participant (propriétaire uniquement)

**Réponse (200) :**
```json
{
  "participant": {
    "userName": "Jean Dupont",
    "userEmail": "jean.dupont@example.com"
  },
  "quiz": {
    "name": "Quiz de mathématiques",
    "questions": [...]
  },
  "answers": [...],
  "score": 8,
  "total": 10,
  "percentage": 80
}
```

### 8.4 IA - Génération de quiz

#### POST /api/quizz/generate
Générer des questions avec l'IA Gemini (école/entreprise)

**Body :**
```json
{
  "theme": "Histoire de France",
  "numberOfQuestions": 10
}
```

**Réponse (200) :**
```json
{
  "questions": [
    {
      "id": 1,
      "type": "qcm",
      "question": "En quelle année a eu lieu la Révolution française ?",
      "options": ["1789", "1799", "1804", "1815"],
      "correctAnswer": 0
    }
  ]
}
```

### 8.5 Administration

#### GET /api/admin/users
Liste de tous les utilisateurs (admin uniquement)

**Réponse (200) :**
```json
{
  "users": [...]
}
```

#### POST /api/admin/users/:id/toggle
Activer/désactiver un utilisateur (admin uniquement)

**Réponse (200) :**
```json
{
  "message": "Utilisateur activé avec succès",
  "actif": true
}
```

#### GET /api/admin/quizzes
Liste de tous les quiz (admin uniquement)

**Réponse (200) :**
```json
{
  "quizzes": [...]
}
```

#### DELETE /api/admin/quizzes/:id
Supprimer un quiz (admin uniquement)

**Réponse (200) :**
```json
{
  "message": "Quiz supprimé avec succès"
}
```

#### POST /api/admin/quizzes/:id/toggle
Changer le statut d'un quiz (admin uniquement)

**Réponse (200) :**
```json
{
  "message": "Statut du quiz mis à jour avec succès",
  "status": "started"
}
```

#### GET /api/admin/online-users
Utilisateurs en ligne (admin uniquement)

**Réponse (200) :**
```json
{
  "count": 3,
  "users": [
    {
      "userId": 1,
      "fullname": "Jean Dupont",
      "email": "jean.dupont@example.com",
      "role": "user",
      "lastActivity": "2024-12-04T18:45:00.000Z"
    }
  ]
}
```

---

## 9. Sécurité

### 9.1 Authentification et autorisation

#### Hachage des mots de passe
- Utilisation de **bcrypt** avec un salt factor de 10
- Les mots de passe ne sont jamais stockés en clair
- Comparaison sécurisée lors de la connexion

#### Tokens JWT
- Génération de tokens JWT lors de la connexion
- Durée de validité : 24 heures
- Signature avec une clé secrète forte
- Stockage dans des cookies HTTP-only

#### Cookies sécurisés
- **HTTP-only** : protection contre les attaques XSS
- **SameSite** : protection contre les attaques CSRF
- Cookies chiffrés côté client

### 9.2 Protection des routes

#### Middleware d'authentification
```javascript
// Toutes les routes protégées vérifient :
1. Présence du token dans les cookies
2. Validité du token JWT
3. Existence de l'utilisateur en base
4. Statut actif du compte
```

#### Middleware de vérification des rôles
```javascript
// Restrictions d'accès par rôle
- Routes /api/admin/* → admin uniquement
- Routes /quizz/create → ecole/entreprise uniquement
- Routes /api/quizzes → propriétaire uniquement
```

### 9.3 Validation des données

#### Validation côté serveur
- Vérification des champs requis
- Validation du format email
- Validation des types de données
- Protection contre les injections SQL (Sequelize ORM)

#### Validation des permissions
- Vérification de la propriété des ressources
- Protection contre les opérations auto-destructrices
- Limitation des actions selon le rôle

### 9.4 Gestion des sessions

#### Suivi des utilisateurs en ligne
- Map en mémoire des utilisateurs connectés
- Mise à jour à chaque requête authentifiée
- Nettoyage automatique après 10 minutes d'inactivité

#### Protection des comptes suspendus
- Middleware vérifiant le statut `actif`
- Redirection vers page de suspension
- Blocage de toutes les actions

### 9.5 Bonnes pratiques appliquées

- Variables d'environnement pour les secrets
- Pas de données sensibles dans le code source
- Logs des actions critiques
- Gestion des erreurs sans exposer de détails techniques
- Protection contre l'énumération des comptes
- Limitation des tentatives de connexion (à implémenter)
- HTTPS recommandé en production

---

## 10. Déploiement

### 10.1 Déploiement sur Vercel

L'application est configurée pour être déployée sur Vercel.

#### Étapes de déploiement

1. **Créer un compte sur Vercel** : https://vercel.com

2. **Installer Vercel CLI**
```bash
npm install -g vercel
```

3. **Se connecter**
```bash
vercel login
```

4. **Déployer**
```bash
vercel
```

5. **Configurer les variables d'environnement**

Dans le dashboard Vercel, ajoutez les variables d'environnement :
- DB_HOST
- DB_PORT
- DB_USER
- DB_PASSWORD
- DB_NAME
- JWT_SECRET
- GEMINI_API_KEY

6. **Redéployer avec les variables**
```bash
vercel --prod
```

### 10.2 Considérations pour la production

#### Base de données
- Utiliser un service de base de données managé (ex: PlanetScale, AWS RDS)
- Configurer les sauvegardes automatiques
- Monitorer les performances

#### Sécurité
- Activer HTTPS (automatique sur Vercel)
- Configurer les cookies en mode `secure: true`
- Implémenter un rate limiting
- Ajouter des logs de sécurité

#### Performance
- Utiliser un CDN pour les fichiers statiques
- Implémenter du caching
- Optimiser les requêtes SQL
- Compresser les réponses

---

## 11. Technologies utilisées

### 11.1 Backend

| Technologie | Version | Description |
|-------------|---------|-------------|
| **Node.js** | 14+ | Environnement d'exécution JavaScript |
| **Express.js** | 4.21.2 | Framework web minimaliste |
| **Sequelize** | 6.37.7 | ORM pour MySQL |
| **MySQL2** | 3.15.3 | Driver MySQL pour Node.js |
| **bcrypt** | 6.0.0 | Hachage de mots de passe |
| **jsonwebtoken** | 9.0.2 | Génération et vérification de JWT |
| **cookie-parser** | 1.4.7 | Parsing des cookies |
| **express-session** | 1.18.2 | Gestion des sessions |
| **dotenv** | 17.2.3 | Chargement des variables d'environnement |
| **@google/generative-ai** | 0.24.1 | SDK Google Gemini AI |

### 11.2 Frontend

| Technologie | Description |
|-------------|-------------|
| **HTML5** | Structure des pages |
| **CSS3** | Stylisation et mise en page |
| **JavaScript** | Logique client (vanilla JS) |
| **Fetch API** | Communication avec le serveur |

### 11.3 Outils de développement

| Outil | Description |
|-------|-------------|
| **Git** | Contrôle de version |
| **GitHub** | Hébergement du code source |
| **Vercel** | Plateforme de déploiement |
| **MySQL Workbench** | Administration de la base de données |

---

## 12. Perspectives d'amélioration

### 12.1 Fonctionnalités futures

#### Court terme
- Système de notifications en temps réel (WebSockets)
- Pagination des listes de quiz et utilisateurs
- Filtre et recherche dans les quiz
- Export des résultats en CSV/PDF
- Statistiques avancées pour les créateurs de quiz

#### Moyen terme
- Système de tags pour les quiz
- Quiz programmés (date de début/fin)
- Limite de temps par quiz
- Système de points et badges
- Classement (leaderboard) par quiz
- Quiz collaboratifs (plusieurs créateurs)

#### Long terme
- Mode hors ligne (PWA)
- Application mobile (React Native)
- Intégration avec plateformes LMS (Moodle, Canvas)
- API publique pour intégrations tierces
- Système de paiement pour quiz premium
- Marketplace de quiz

### 12.2 Améliorations techniques

#### Performance
- Mise en cache Redis pour les sessions
- Optimisation des requêtes SQL (index, jointures)
- Lazy loading des images
- Service Worker pour le cache client

#### Sécurité
- Rate limiting par IP et par utilisateur
- Authentification à deux facteurs (2FA)
- OAuth2 (Google, Microsoft, etc.)
- Audit logs pour toutes les actions critiques
- Chiffrement des données sensibles en base

#### Infrastructure
- Containerisation avec Docker
- CI/CD avec GitHub Actions
- Monitoring avec Sentry ou New Relic
- Tests automatisés (Jest, Supertest)
- Documentation API avec Swagger

#### UX/UI
- Design system cohérent
- Mode sombre
- Responsive design amélioré
- Accessibilité (WCAG 2.1)
- Internationalisation (i18n)

---

## Conclusion

L'application **Quizz App** représente une solution complète et moderne pour la création et la gestion de quiz en ligne. Grâce à son architecture robuste, son système d'authentification sécurisé et son intégration avec l'intelligence artificielle, elle offre une expérience utilisateur riche et différenciée selon les rôles.

Le projet met en œuvre les meilleures pratiques du développement web moderne, tant au niveau de l'architecture (séparation des préoccupations, middleware, ORM) que de la sécurité (JWT, bcrypt, validation des permissions).

L'intégration de Google Gemini AI pour la génération automatique de questions constitue une valeur ajoutée significative, permettant aux créateurs de quiz de gagner du temps tout en maintenant une qualité élevée.

Avec les perspectives d'amélioration identifiées, l'application dispose d'un potentiel d'évolution important pour répondre à des besoins toujours plus variés dans le domaine de l'évaluation et de la formation en ligne.

---

**Dépôt GitHub :** https://github.com/KOSAAKU/QUIZZ-PROJETWEB-IPSSI

**Date de documentation :** Décembre 2024

**Projet réalisé dans le cadre de la soutenance du projet de développement web à l'IPSSI.**
