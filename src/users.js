// Import mongoClient
import { client } from './dbconnect.js'

// POST new users
export const addUser = (req, res) => {
    console.log("TEST");
    client.connect((err) => {
        if(err){
            res.status(500).send(err);
            return;
        }

        const user = req.body;
        const collection = client.db('game_site').collection('users');
        console.log(user);
        collection.insertOne(user, (err, result) => {
            console.log(result);
            if(err) res.status(500).send(err);
            if(result){
                res.json(result);
            } 
            client.close();
        })
    })
}