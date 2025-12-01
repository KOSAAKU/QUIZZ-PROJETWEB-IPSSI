import { sequelize } from "./server.js";
import { DataTypes, Models, Op} from "sequelize";

class User extends Models {}; 
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
    modelName: "User"
});

class Quiz extends Models {}; 
Quiz.init({
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
    modelName: "Quiz"
});

class Reponses extends Models {}; 
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
    modelName: "Reponses"
});
