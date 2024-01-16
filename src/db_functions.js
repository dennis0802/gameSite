import { client } from './dbconnect.js';

// Insert a user
export async function insertUser(username, password, userType){
    try{
        const database = client.db("game_site");
        const users = database.collection("users");

        const doc = {
            username: username,
            password: password,
            userType: userType,
        }

        const result = await users.insertOne(doc);
        console.log(`A document was inserted with id ${result.insertedId}`)
    } finally {
        //await client.close();
    }
}

// Find the user in the database
export async function findUser(username, userType){
    try{
        const database = client.db("game_site");
        const users = database.collection("users");

        // Query for the user
        const query = {username: username, userType: userType};
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