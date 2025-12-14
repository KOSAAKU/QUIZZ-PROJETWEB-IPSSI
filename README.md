# Quizz App - IPSSI Web Project

Application web de création et de gestion de quiz avec authentification multi-rôles et génération automatique de questions par IA (gemini).

## Fonctionnalités

### Pour tous les utilisateurs
- Inscription et connexion sécurisées avec JWT
- Authentification par cookies HTTP-only
- Système de sessions avec suivi des utilisateurs actifs

### Rôles utilisateurs

#### Admin
- Gestion complète des utilisateurs (activation/désactivation)
- Gestion de tous les quiz de la plateforme
- Visualisation des utilisateurs connectés en temps réel
- Statistiques globales sur les quiz et participations

#### Ecole / Entreprise
- Création de quiz personnalisés (QCM et questions ouvertes)
- Génération automatique de questions avec l'IA Gemini
- Gestion du cycle de vie des quiz (pending → started → finish)
- Visualisation des participants et de leurs résultats
- Consultation détaillée des réponses individuelles

#### User
- Participation aux quiz actifs
- Consultation de l'historique des quiz complétés
- Visualisation des scores et résultats

#### Anonyme
- Participation aux quiz actifs sans authentification
- Les réponses sont enregistrées avec userId = 0

### Génération de Quiz par IA
- Intégration avec Google Gemini AI
- Génération automatique de questions basées sur un thème
- Support des questions QCM et ouvertes
- Personnalisation selon le contexte (école/entreprise)

## Architecture technique

### Backend
- **Framework**: Express.js (Modules ES6)
- **Base de données**: MySQL avec Sequelize (requêtes SQL brutes)
- **Authentification**: JWT + bcrypt
- **Sessions**: express-session avec stockage en mémoire
- **IA**: Google Generative AI (Gemini)
- **Architecture**: MVC avec routes modulaires et middlewares personnalisés

### Middlewares personnalisés
- **auth.js** - Authentification JWT et vérification des rôles
- **logger.js** - Journalisation des requêtes HTTP
- **onlineUsers.js** - Suivi des utilisateurs connectés en temps réel
- **accountCheck.js** - Vérification du statut actif des comptes utilisateurs

### Structure du projet

```
QUIZZ-PROJETWEB-IPSSI/
├── config/
│   └── database.js          # Configuration Sequelize
├── controllers/
│   ├── AuthController.js    # Gestion de l'authentification
│   ├── TokenController.js   # Gestion des tokens JWT
│   ├── UserController.js    # CRUD utilisateurs
│   ├── QuizzController.js   # CRUD quiz
│   ├── GeminiController.js  # Intégration IA Gemini
│   └── LoggerController.js  # Logs des requêtes
├── middleware/
│   ├── auth.js              # Middleware d'authentification
│   ├── logger.js            # Middleware de logs
│   ├── onlineUsers.js       # Suivi des utilisateurs en ligne
│   └── accountCheck.js      # Vérification des comptes actifs
├── routes/
│   ├── auth.routes.js       # Routes d'authentification
│   ├── dashboard.routes.js  # Routes des dashboards
│   ├── pages.routes.js      # Routes des pages statiques
│   ├── quiz.routes.js       # Routes des quiz
│   ├── user.routes.js       # Routes utilisateurs
│   └── admin.routes.js      # Routes administrateur
├── public/
│   ├── index.html           # Page d'accueil
│   ├── login.html           # Page de connexion
│   ├── register.html        # Page d'inscription
│   ├── logout.html          # Page de déconnexion
│   ├── dashbadmin.html      # Dashboard administrateur
│   ├── dashbecole.html      # Dashboard école
│   ├── dashbentreprise.html # Dashboard entreprise
│   ├── dashbuser.html       # Dashboard utilisateur
│   ├── create_quizz_ecole.html       # Création de quiz (école)
│   ├── create_quizz_entreprise.html  # Création de quiz (entreprise)
│   ├── quizz.html           # Interface de passage de quiz
│   ├── quiz_participants.html # Liste des participants
│   ├── quiz_answers.html    # Détail des réponses
│   └── suspended.html       # Page compte suspendu
├── server.js                # Point d'entrée de l'application
├── seed.js                  # Données de test
├── adminacc.js              # Création compte admin
├── test-gemini.js           # Script de test de l'API Gemini
└── package.json
```

## Installation

### Prérequis
- Node.js (v14 ou supérieur)
- MySQL (v8 ou supérieur)
- Compte Google Cloud avec accès à l'API Gemini

### Étapes d'installation

1. Cloner le dépôt
```bash
git clone https://github.com/KOSAAKU/QUIZZ-PROJETWEB-IPSSI.git
cd QUIZZ-PROJETWEB-IPSSI
```

2. Installer les dépendances
```bash
npm install
```

3. Configurer les variables d'environnement

Créer un fichier `.env` à la racine du projet (voir `.env.example`):
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=votre_mot_de_passe
DB_NAME=quizzeo

JWT_SECRET=votre_secret_jwt

GEMINI_API_KEY=votre_clé_api_gemini
```

4. Créer la base de données
```bash
mysql -u root -p
CREATE DATABASE quizzeo;
```

5. Initialiser la base de données

Le serveur créera automatiquement les tables au démarrage grâce à Sequelize sync.

6. Lancer l'application
```bash
npm start
```

L'application sera accessible sur `http://localhost:3000` (écoute sur toutes les interfaces : `0.0.0.0:3000`)

## Utilisation

### Créer un compte administrateur
```bash
node adminacc.js
```

### Tester l'intégration Gemini AI
```bash
node test-gemini.js
```

### Routes de navigation principales

- `GET /` - Page d'accueil (index.html)
- `GET /login` - Page de connexion
- `GET /register` - Page d'inscription
- `GET /logout` - Déconnexion et page de confirmation
- `GET /dashboard` - Redirection automatique vers le dashboard selon le rôle
- `GET /quizz/create` - Page de création de quiz (école/entreprise)
- `GET /quizz/:id` - Page de passage d'un quiz
- `GET /dashboard/quizz/:id` - Liste des participants d'un quiz (école/entreprise)
- `GET /dashboard/quizz/:id/:answerId` - Détails des réponses d'un participant (école/entreprise)
- `GET /suspended` - Page affichée aux comptes suspendus

### Endpoints API principaux

#### Authentification
- `POST /register` - Inscription
- `POST /login` - Connexion
- `GET /logout` - Déconnexion

#### Utilisateurs
- `GET /users` - Liste des utilisateurs (authentifié)
- `GET /api/user/my-quizzes` - Historique de mes quiz complétés (user)

#### Quiz (préfixe `/quizz`)
- `GET /quizz/quizzes` - Mes quiz créés (école/entreprise)
- `GET /quizz/quizzes/:id` - Détails d'un quiz actif
- `POST /quizz/api/quizzes` - Créer un quiz (école/entreprise)
- `POST /quizz/quizzes/:id/submit` - Soumettre des réponses (authentifié ou anonyme)
- `GET /quizz/:id/toggle` - Changer le statut d'un quiz (propriétaire)
- `DELETE /quizz/:id/delete` - Supprimer un quiz (propriétaire)
- `GET /quizz/api/quizzes/:id/participants` - Liste des participants (propriétaire)
- `GET /quizz/api/quizzes/:id/answers/:answerId` - Détails des réponses d'un participant (propriétaire)

#### IA
- `POST /quizz/api/quizz/generate` - Générer des questions avec l'IA Gemini (école/entreprise)

#### Administration
- `GET /api/admin/users` - Tous les utilisateurs (admin)
- `POST /api/admin/users/:id/toggle` - Activer/désactiver un utilisateur (admin)
- `GET /api/admin/online-users` - Utilisateurs connectés en temps réel (admin)
- `GET /api/admin/quizzes` - Tous les quiz de la plateforme (admin)
- `DELETE /api/admin/quizzes/:id` - Supprimer n'importe quel quiz (admin)
- `POST /api/admin/quizzes/:id/toggle` - Changer le statut de n'importe quel quiz (admin)

### Statuts des quiz
- `pending` - Quiz créé mais non démarré
- `started` - Quiz actif, disponible aux participants
- `finish` - Quiz terminé, plus de participation possible

## Sécurité

- Mots de passe hashés avec bcrypt (salt rounds: 10)
- Authentification par tokens JWT stockés dans des cookies HTTP-only
- Cookies HTTP-only pour prévenir les attaques XSS
- Validation des rôles sur toutes les routes protégées (middleware requireRole)
- Vérification des permissions (propriété des ressources)
- Sessions utilisateur avec suivi en temps réel
- Middleware de vérification du statut actif des comptes
- Protection contre les opérations auto-destructrices (admin ne peut pas se désactiver)
- Support de la participation anonyme aux quiz (sans authentification)

## Technologies utilisées

### Backend
- **Express.js** - Framework web
- **Sequelize** - ORM pour MySQL
- **bcrypt** - Hachage de mots de passe
- **jsonwebtoken** - Authentification JWT
- **cookie-parser** - Gestion des cookies
- **express-session** - Gestion des sessions
- **dotenv** - Variables d'environnement
- **@google/generative-ai** - Intégration Gemini AI

### Frontend
- HTML5 / CSS3 / JavaScript vanilla
- Fetch API pour les requêtes HTTP

## Contribution

Les contributions sont les bienvenues. Pour les changements majeurs, veuillez d'abord ouvrir une issue pour discuter de ce que vous aimeriez changer.

## Auteurs

Projet réalisé dans le cadre de la soutenance du projet de développement web à l'IPSSI.

## Licence

ISC

## Liens

- [Repository GitHub](https://github.com/KOSAAKU/QUIZZ-PROJETWEB-IPSSI)
- [Signaler un bug](https://github.com/KOSAAKU/QUIZZ-PROJETWEB-IPSSI/issues)
