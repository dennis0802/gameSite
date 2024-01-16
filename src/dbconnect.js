// Import MongoClient and ServerAPIVersion from mongodb
import { MongoClient, ServerApiVersion } from "mongodb";

// Import secret uri
import { uri } from '../secret.js';

// Create new MongoClient instance and export
export const client = new MongoClient(uri, {

})