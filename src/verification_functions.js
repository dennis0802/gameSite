import bcrypt from 'bcrypt';

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