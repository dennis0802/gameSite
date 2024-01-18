import bcrypt from 'bcrypt';
import { findUser, findUserByEmail, findGameByName } from './db_functions.js';

export const isPasswordInvalid = async function(password, passwordConfirmation){
    let errors=[];
    let mainHash;

    // Contain at least 1 digit
    let pattern=/[0-9]/;
    let containsDigits = pattern.test(password);

    if(!containsDigits){
        errors.push("Password must contain at least one number!");
    }

    // Lower case
    pattern = /[a-z]/
    let lowercasePresent = pattern.test(password);

    if(!lowercasePresent){
        errors.push("Password must contain at least one lowercase letter!")
    }

    // Uppercase
    pattern = /[a-z]/
    let uppercasePresent = pattern.test(password);

    if(!uppercasePresent){
        errors.push("Password must contain at least one uppercase letter!")
    }

    // Special characters
    pattern = /\W/
    let specialPresent = pattern.test(password);

    if(!specialPresent){
        errors.push("Password must contain at least one special character!")
    }

    // Length
    pattern =/^[A-Za-z0-9\W]{12,}$/
    let requiredLength = pattern.test(password);
    
    if(!requiredLength){
        errors.push("Password must be at least 12 characters long!")
    }

    mainHash = await bcrypt.hash(password, 10).then(hash => {
        return hash;
    })
    .catch(err => {
        console.log(err);
    })

    const passwordAccepted = await bcrypt.compare(passwordConfirmation, mainHash).then(res=>{
        return res;
    })
    .catch(err => {
        console.log(err);
    })
    
    if(!passwordAccepted){
        errors.push("The passwords do not match.")
    }

    if(errors.length !== 0){
        return errors
    }
    return mainHash;
}

export const verifyPasswordLogin = async function(password, hashFound){
    const passwordExists = await bcrypt.compare(password, hashFound).then(res=>{
        return res;
    })
    .catch(err => {
        console.log(err);
    })

    return passwordExists;
}

export const isUserNameInvalid = function(username){
    let errors=[]
    // Contain at least 1 digit
    let pattern=/[0-9]/;
    let containsDigits = pattern.test(username);

    if(!containsDigits){
        errors.push("Username must contain at least one number!");
    }

    // No special characters and matches length
    pattern = /^[a-zA-Z0-9]{4,25}$/
    let validCharacters = pattern.test(username);

    if(!validCharacters){
        errors.push("Username contains special characters or does not match the specified length!")
    }

    if(errors.length !== 0){
        return errors
    }
    return false;
}

export const isEmailInvalid = function(email){
    let pattern=/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    let validEmail = pattern.test(email);
    let errors=[];

    if(!validEmail){
        errors.push("Email must be a valid email address!");
    }

    if(errors.length !== 0){
        return errors;
    }
    return false;
}

export const isUserNameUnique = async function(username){
    let result = await findUser(username).then(res => {
        return res;
    })

    return result;
}

export const isEmailUnique = async function(email){
    let result = await findUserByEmail(email).then(res => {
        return res;
    })
    return result;
}

export const encryptAnswer = async function(answer){
    let mainHash;

    mainHash = await bcrypt.hash(answer, 10).then(hash => {
        return hash;
    })
    .catch(err => {
        console.log(err);
    })

    return mainHash;
}

export const verifyAnswer = async function(answer, hashFound){
    const answerExists = await bcrypt.compare(answer, hashFound).then(res=>{
        return res;
    })
    .catch(err => {
        console.log(err);
    })

    return answerExists;
}

export const isGameEntryInvalid = function(name, genre, start, end){
    let errors = [];

    if(!name || !genre || !start){
        errors.push("Name, genre, and start date must be filled out!");
    }

    let date = /([0-9]{4})-(0[1-9]|1[0-2])/;
    // Start date should match a date pattern
    let validDate = date.test(start);

    if(!validDate){
        errors.push("Start date is invalid!");
    }

    // End date should match date or blank
    validDate = date.test(end);
    if(!validDate && end){
        errors.push("End date is invalid!");
    }

    if(errors.length !== 0){
        return errors;
    }
    return false;
}

export const isGameNameUnique = async function(name){
    let result = await findGameByName(name).then(res => {
        return res;
    })
    return result;
}