// Import mongoClient
import { client } from './dbconnect.js'

// POST new users
export const addUser = (req, res) => {
    client.connect((err) => {
        if(err){
            res.status(500).send(err);
            return;
        }

        const car = req.body;
        const collection = client.db('game_site').collection('users');
        collection.insertOne(car, (err, result) => {
            if(err) res.status(500).send(err);
            if(result) res.json(result);
            client.close();
        })
    })
}