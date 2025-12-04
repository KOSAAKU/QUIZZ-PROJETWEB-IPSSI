# Quizz App - IPSSI Web Project

Application web de création et de gestion de quiz avec authentification multi-rôles et génération automatique de questions par IA.

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

### Génération de Quiz par IA
- Intégration avec Google Gemini AI
- Génération automatique de questions basées sur un thème
- Support des questions QCM et ouvertes
- Personnalisation selon le contexte (école/entreprise)

## Architecture technique

### Backend
- **Framework**: Express.js
- **Base de données**: MySQL avec Sequelize
- **Authentification**: JWT + bcrypt
- **Sessions**: express-session avec stockage en mémoire
- **IA**: Google Generative AI (Gemini)

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
├── public/
│   ├── dashbadmin.html      # Dashboard administrateur
│   ├── dashbecole.html      # Dashboard école
│   ├── dashbentreprise.html # Dashboard entreprise
│   ├── dashbuser.html       # Dashboard utilisateur
│   ├── create_quizz_*.html  # Pages de création de quiz
│   ├── quizz.html           # Interface de passage de quiz
│   ├── quiz_participants.html # Liste des participants
│   ├── quiz_answers.html    # Détail des réponses
│   ├── login.html           # Page de connexion
│   ├── register.html        # Page d'inscription
│   └── suspended.html       # Page compte suspendu
├── server.js                # Point d'entrée de l'application
├── seed.js                  # Données de test
├── adminacc.js              # Création compte admin
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
DB_USER=root
DB_PASSWORD=votre_mot_de_passe
DB_NAME=quizz_db
JWT_SECRET=votre_secret_jwt
GEMINI_API_KEY=votre_clé_api_gemini
```

4. Créer la base de données
```bash
mysql -u root -p
CREATE DATABASE quizz_db;
```

5. Initialiser la base de données

Le serveur créera automatiquement les tables au démarrage grâce à Sequelize sync.

6. Lancer l'application
```bash
npm start
```

L'application sera accessible sur `http://localhost:3000`

## Utilisation

### Créer un compte administrateur
```bash
node adminacc.js
```

### Endpoints API principaux

#### Authentification
- `POST /register` - Inscription
- `POST /login` - Connexion
- `GET /logout` - Déconnexion

#### Utilisateurs
- `GET /users` - Liste des utilisateurs (admin)
- `POST /api/admin/users/:id/toggle` - Activer/désactiver un utilisateur (admin)
- `GET /api/admin/online-users` - Utilisateurs connectés (admin)

#### Quiz
- `POST /api/quizzes` - Créer un quiz (école/entreprise)
- `GET /quizzes` - Mes quiz (école/entreprise)
- `GET /quizzes/:id` - Détails d'un quiz
- `POST /quizzes/:id/submit` - Soumettre des réponses
- `GET /quizz/:id/toggle` - Changer le statut d'un quiz
- `DELETE /quizz/:id/delete` - Supprimer un quiz
- `GET /api/quizzes/:id/participants` - Liste des participants
- `GET /api/quizzes/:id/answers/:answerId` - Réponses d'un participant

#### IA
- `POST /api/quizz/generate` - Générer des questions avec l'IA (école/entreprise)

#### Admin
- `GET /api/admin/quizzes` - Tous les quiz (admin)
- `DELETE /api/admin/quizzes/:id` - Supprimer un quiz (admin)
- `POST /api/admin/quizzes/:id/toggle` - Changer le statut d'un quiz (admin)

### Statuts des quiz
- `pending` - Quiz créé mais non démarré
- `started` - Quiz actif, disponible aux participants
- `finish` - Quiz terminé, plus de participation possible

## Sécurité

- Mots de passe hashés avec bcrypt
- Authentification par tokens JWT
- Cookies HTTP-only pour prévenir les attaques XSS
- Validation des rôles sur toutes les routes protégées
- Vérification des permissions (propriété des ressources)
- Sessions utilisateur avec timeout d'inactivité (10 minutes)
- Protection contre les opérations auto-destructrices (admin ne peut pas se désactiver)

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
