import { client } from './dbconnect.js';

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
        }

        const result = await users.insertOne(doc);
        console.log(`A document was inserted with id ${result.insertedId}`)
    } finally {
        //await client.close();
    }
}

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
            projection: {_id: 0, username: 1, password: 1},
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