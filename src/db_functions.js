import { ObjectId } from 'mongodb';
import { client } from './dbconnect.js';

// ----------------------------------- USERS --------------------------------------------------------------------

// Get all users
export function getAllUsers(){
    try{
        const database = client.db("game_site");
        const users = database.collection("users");
        let list;
        const findUsers = async() => {
            list = await users.find().sort({userType:1}).toArray((err, result) => {
            if(err){
                return null;
            }
            return result;
            });
        }

        let result = findUsers().then(() =>{
            return list;
        })
        return result;
    }
    finally{

    }
}

// Insert a user
export async function insertUser(username, password, email, question, answer, userType){
    try{
        const database = client.db("game_site");
        const users = database.collection("users");
        const doc = {
            username: username,
            password: password,
            userType: userType,
            question: question,
            email: email,
            answer: answer,
            isMuted: false
        }

        const result = await users.insertOne(doc);
        console.log(`A document was inserted with id ${result.insertedId}`)
    } finally {
        //await client.close();
    }
}

// Update password
export async function updateUserPassword(email, password){
    try{
        const database = client.db("game_site");
        const users = database.collection("users");
        const result = await users.updateOne(
            {"email": email},
            { $set: {"password": password}}
        )
        console.log(result);
    }
    finally{

    }
}

// Find the user in the database
export async function findUser(username, userType="All"){
    try{
        const database = client.db("game_site");
        const users = database.collection("users");

        // Query for the user
        const query = userType === "All" ? {username: username} : {username: username, userType: userType};
        const options = {
            projection: {_id: 1, username: 1, password: 1, email: 1, isMuted: 1},
        }

        const user = await users.findOne(query, options);
        return user;
    }
    finally{
        //await client.close();
    }
}

// Find user by email
export async function findUserByEmail(email){
    try{
        const database = client.db("game_site");
        const users = database.collection("users");
        
        // Query for the user
        const query = {email: email};
        const options = {
            projection: {_id: 0, username: 1, email: 1},
        }

        const user = await users.findOne(query, options);
        return user;
    }
    finally{
        //await client.close();
    }
}

export async function findUserQuestion(email){
    try{
        const database = client.db("game_site");
        const users = database.collection("users");

        // Query for the user
        const query = {email: email};
        const options = {
            projection: {_id: 0, question: 1, answer: 1},
        }

        const user = await users.findOne(query, options);
        return user;
    }
    finally{
        //await client.close();
    }
}

export async function getUserType(username){
    try{
        const database = client.db("game_site");
        const users = database.collection("users");

        // Query for the user
        const query = {username: username};
        const options = {
            projection: {_id: 0, username: 1, userType: 1},
        }

        const user = await users.findOne(query, options);
        return user;
    }
    finally{
        //await client.close();
    }
}

// Find game by id
export async function findUserById(id){
    try{
        const database = client.db("game_site");
        const users = database.collection("users");
        let objectId = new ObjectId(id);

        // Query for the game
        const query = {_id: objectId}
        const options = {
            projection: {_id: 0, username:1, email:1, isMuted: 1}
        }

        const user = await users.findOne(query, options);
        return user;
    }
    finally{

    }
}

export async function deleteUser(id){
    try{
        const database = client.db("game_site");
        const users = database.collection("users");

        let objectId = new ObjectId(id);
        const query = {_id: objectId}
        const result = await users.deleteOne(query)

        if(result.deletedCount === 1){
            console.log("A document has been deleted.");
        }
        else{
            console.log("No match.")
        }
    }
    finally{

    }
}

// Login user and update last login field
export async function updateLastLogin(username){
    try{
        const database = client.db("game_site");
        const users = database.collection("users");
        let today = new Date();
        let month = today.getMonth()+1;
        let day = today.getDate();
        let minutes = today.getMinutes();
        let seconds = today.getSeconds();

        let monthText = month < 10 ? "0" + month : month;
        let dayText = day < 10 ? "0" + day : day;
        let minuteText = minutes < 10 ? "0" + minutes : minutes;
        let secondText = seconds < 10 ? "0" + seconds : seconds;

        let date = today.getFullYear() + '-' + monthText + '-' + dayText;
        let time = today.getHours() + ":" + minuteText + ":" + secondText;
        let timestamp = date + ' ' + time;

        const result = await users.updateOne(
            {"username": username},
            { $set: {
                "lastLogin": timestamp
            }}
        )
        console.log(result);
    }
    finally{

    }
}

// Update user
export async function updateUser(id, username, password, email, question, answer, userType, passwordFlag, questionFlag){
    try{
        const database = client.db("game_site");
        const users = database.collection("users");
        let doc;

        if(passwordFlag && questionFlag){
            doc = {
                username: username,
                password: password,
                question: question,
                email: email,
                answer: answer,
            }
        }
        else if(!passwordFlag && questionFlag){
            doc = {
                username: username,
                question: question,
                email: email,
                answer: answer,
            }
        }
        else if(passwordFlag && !questionFlag){
            doc = {
                username: username,
                password: password,
                email: email,
            }
        }
        else{
            doc = {
                username: username,
                email: email,
            }
        }

        let objectId = new ObjectId(id);
        const result = await users.updateOne(
            {"_id": objectId},
            { $set: doc}
        )
        console.log(result);
    }
    finally{

    }
}

export async function toggleMuting(id, mutingStatus){
    try{
        const database = client.db("game_site");
        const users = database.collection("users");

        let objectId = new ObjectId(id);
        const result = await users.updateOne(
            {"_id": objectId},
            { $set: {
                "isMuted": mutingStatus,
            }}
        )
        console.log(result);
    }
    finally{

    }
}

// ----------------------------------- GAMES --------------------------------------------------------------------

export function getAllGames(){
    try{
        const database = client.db("game_site");
        const games = database.collection("games");
        let list;
        const findGames = async() => {
            list = await games.find().sort({timeline:1}).toArray((err, result) => {
            if(err){
                return null;
            }
            return result;
            });
        }

        let result = findGames().then(() =>{
            return list;
        })
        return result;
    }
    finally{

    }
}

// Insert a game
export async function insertGame(name, genre, rating, image, start, end, thoughts){
    try{
        let timeline = start + " - " + end;
        const database = client.db("game_site");
        const games = database.collection("games");
        const doc = {
            name: name,
            genre: genre,
            rating: rating,
            image: image,
            timeline: timeline,
            thoughts: thoughts,
        }

        const result = await games.insertOne(doc);
        console.log(`A document was inserted with id ${result.insertedId}`)
    } finally {
        //await client.close();
    }
}

// Find a game by name
export async function findGameByName(name){
    try{
        const database = client.db("game_site");
        const games = database.collection("games");

        // Query for the game
        const query = {name:name}
        const options = {
            projection: {_id: 0, name: 1}
        }

        const game = await games.findOne(query, options);
        return game;
    }
    finally{

    }
}

// Find game by id
export async function findGameById(id){
    try{
        const database = client.db("game_site");
        const games = database.collection("games");
        let objectId = new ObjectId(id);

        // Query for the game
        const query = {_id: objectId}
        const options = {
            projection: {_id: 0, name: 1, genre:1, rating:1, image:1, timeline:1, thoughts:1}
        }

        const game = await games.findOne(query, options);
        return game;
    }
    finally{

    }
}

// Update game
export async function updateGame(id, name, genre, rating, image, start, end, thoughts){
    try{
        const database = client.db("game_site");
        const games = database.collection("games");

        let objectId = new ObjectId(id);
        let timeline = start + " - " + end;
        const result = await games.updateOne(
            {"_id": objectId},
            { $set: {
                "name" : name,
                "genre" : genre,
                "rating" : rating,
                "image" : image,
                "timeline" : timeline,
                "thoughts" : thoughts,
            }}
        )
        console.log(result);
    }
    finally{

    }
}

export async function deleteGame(id){
    try{
        const database = client.db("game_site");
        const games = database.collection("games");

        let objectId = new ObjectId(id);
        const query = {_id: objectId}
        const result = await games.deleteOne(query)

        if(result.deletedCount === 1){
            console.log("A document has been deleted.");
        }
        else{
            console.log("No match.")
        }
    }
    finally{

    }
}

// ----------------------------------- GAME COMMENTS --------------------------------------------------------------------
// Get all posts for a specific game
export async function getGameComments(gameId){
    try{
        const database = client.db("game_site");
        const comments = database.collection("comments");
        let gameObjectId = new ObjectId(gameId);
        let list;
        const query = {gameId: gameObjectId};
        const options = {
            projection: {_id: 0, user: 1, subject: 1, content: 1, timePosted:1},
        }

        const findComments = async() => {
            list = await comments.find(query, options).toArray((err, result) => {
            if(err){
                return null;
            }
            return result;
            });
        }

        let result = findComments().then(() =>{
            return list;
        })
        return result;
    }
    finally{

    }
}

// Insert a post
export async function insertComment(username, gameId, subject, content){
    try{
        const database = client.db("game_site");
        const comments = database.collection("comments");

        let today = new Date();
        let month = today.getMonth()+1;
        let day = today.getDate();
        let minutes = today.getMinutes();
        let seconds = today.getSeconds();

        let monthText = month < 10 ? "0" + month : month;
        let dayText = day < 10 ? "0" + day : day;
        let minuteText = minutes < 10 ? "0" + minutes : minutes;
        let secondText = seconds < 10 ? "0" + seconds : seconds;

        let date = today.getFullYear() + '-' + monthText + '-' + dayText;
        let time = today.getHours() + ":" + minuteText + ":" + secondText;
        let timestamp = date + ' ' + time;
        let gameObjectId = new ObjectId(gameId);

        const doc = {
            user: username,
            gameId: gameObjectId,
            subject: subject,
            content: content,
            timePosted: timestamp
        }

        const result = await comments.insertOne(doc);
        console.log(`A document was inserted with id ${result.insertedId}`)
    } finally {
        //await client.close();
    }
}

export async function deleteAllPosts(gameId){
    try{
        const database = client.db("game_site");
        const comments = database.collection("comments");

        let objectId = new ObjectId(gameId);
        const query = {gameId: objectId}
        const result = await comments.deleteMany(query);

        if(result.deletedCount > 1){
            console.log("Documents have been deleted.");
        }
        else{
            console.log("No match.")
        }
    }
    finally{

    }    
}