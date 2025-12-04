import { sequelize } from "./config/database.js";
import { DataTypes, Model } from "sequelize";

class User extends Model {}; 
User.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    fullname : {
        type: DataTypes.STRING,
        allowNull: false
    },
    role : {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "user"
    },
    actif : {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    createdAt : {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
}, {
    sequelize,
    modelName: "User",
    tableName: "users"
});

class Quizz extends Model {}; 
Quizz.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
   name : {
        type: DataTypes.STRING,
        allowNull: false
    },
    questions : {
        type: DataTypes.JSON,
        allowNull: true
    },
    ownerId : {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    status : {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "pending"
    },
    createdAt : {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    sequelize,
    modelName: "Quizz",
    tableName: "quizz"
});

class Reponses extends Model {}; 
Reponses.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    quizzId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    answers: {
        type: DataTypes.JSON,
        allowNull: false
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
}, {
    sequelize,
    modelName: "Reponses",
    tableName: "reponses"
});