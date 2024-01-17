import express from 'express';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import bodyParser from 'body-parser';
import { insertUser, findUser, getUserType, findUserQuestion, updateUserPassword } from './src/db_functions.js';
import { isPasswordInvalid, isUserNameInvalid, verifyPasswordLogin, isEmailInvalid, isUserNameUnique, isEmailUnique, encryptAnswer, verifyAnswer } from './src/verification_functions.js';

const app = express();
const port = 3000;
const __dirname = dirname(fileURLToPath(import.meta.url));

app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use('/views', express.static(path.join(__dirname, 'views')));
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
    secret: 'my-secret',  // a secret string used to sign the session ID cookie
    resave: false,  // don't save session if unmodified
    saveUninitialized: false  // don't create session until something stored
}))

// ROUTES
app.get('/', (req, res) => {
    res.render('index.pug', {title: "Games Database", loggedIn:req.session.loggedInAs})
})

app.get('/games', (req, res) => {
    if(req.session.loggedInAs){
        getUserType(req.session.loggedInAs).then((result) => {
            if(result === "User"){
                res.render('content.pug', {title: "Games", loggedIn:req.session.loggedInAs, isGame:true, isAdmin:false})
            }
            else{
                res.render('content.pug', {title: "Games", loggedIn:req.session.loggedInAs, isGame:true, isAdmin:true})
            }
        })
    }
    else{
        res.render('content.pug', {title: "Games", loggedIn:req.session.loggedInAs, isGame:true})
    }
})

app.get('/users', (req, res) => {
    if(req.session.loggedInAs){
        getUserType(req.session.loggedInAs).then((result) => {
            if(result === "User"){
                res.render('index.pug', {title: "Games Database", loggedIn:req.session.loggedInAs})
            }
            else{
                res.render('content.pug', {title: "Users", loggedIn:req.session.loggedInAs, isOnUsers:true, isAdmin:true})
            }
        })
    }
    else{
        res.render('index.pug', {title: "Games Database", loggedIn:req.session.loggedInAs})
    }
})

app.get('/login', (req, res) => {
    if(req.session.loggedInAs){
        getUserType(req.session.loggedInAs).then((result) => {
            if(result === "User"){
                return res.render('accountPage.pug', {user:req.session.loggedInAs, isAdmin: true});
            }
            else{
                return res.render('accountPage.pug', {user:req.session.loggedInAs, isAdmin: false});
            }
        })
    }
    else{
        res.render('login.pug', {title: "Login Page"})
    }
})

app.get('/loginUser', (req, res) => {
    if(req.session.loggedInAs){
        res.render('accountPage.pug', {user:req.session.loggedInAs, isAdmin: false});
    }
    res.render('loginUser.pug', {title: "Login User", loginMessage: "Login User", error:null, username:null})
})

app.post('/loginUser', (req, res) => {
    findUser(req.body.username, "User").then((result) => {
        if(!req.body.username || !req.body.password || result === null){
            return res.render('loginUser.pug', {title: "Login User", loginMessage: "Login User", error:"Incorrect username or password.", username:req.body.username})
        }
    
        let verified;
        const verifyPassword = async() => {
            verified = await verifyPasswordLogin(req.body.password, result.password);
        }

        verifyPassword().then(() => {
            if(verified){
                req.session.loggedInAs = req.body.username;
                res.render('accountPage.pug', {user:req.session.loggedInAs, isAdmin:false});
            }
            else{
                res.render('loginUser.pug', {title: "Login User", loginMessage: "Login User", error:"Incorrect username or password.", username:req.body.username})
            }
        })
    });
    
})

app.get('/loginAdmin', (req, res) => {
    if(req.session.loggedInAs){
        res.render('accountPage.pug', {user:req.session.loggedInAs, isAdmin: true});
    }
    res.render('loginUser.pug', {title: "Login Admin", loginMessage: "Login Admin"})
})

app.post('/loginAdmin', (req, res) => {
    findUser(req.body.username, "Admin").then((result) => {
        if(!req.body.username || !req.body.password || result === null){
            return res.render('loginUser.pug', {title: "Login Admin", loginMessage: "Login Admin", error:"Incorrect username or password.", username:req.body.username})
        }

        let verified;
        const verifyPassword = async() => {
            verified = await verifyPasswordLogin(req.body.password, result.password);
        }

        verifyPassword().then(() => {
            if(verified){
                req.session.loggedInAs = req.body.username;
                res.render('accountPage.pug', {user:req.session.loggedInAs, isAdmin: true});
            }
            else{
                res.render('loginUser.pug', {title: "Login Admin", loginMessage: "Login Admin", error:"Incorrect username or password.", username:req.body.username})
            }
        })
    });
    
})

app.get('/createAccount', (req, res) => {
    if(req.session.loggedInAs){
        getUserType(req.session.loggedInAs).then((result) => {
            if(result === "User"){
                return res.render('accountPage.pug', {user:req.session.loggedInAs, isAdmin: false});
            }
            else{
                return res.render('accountPage.pug', {user:req.session.loggedInAs, isAdmin: true});
            }
        })
    }

    res.render('createAccount.pug', {title: "Create Account", errors:null, username:""})
})

app.post('/createAccount', (req, res) => {
    let errors=[]
    if(!req.body.username || !req.body.password || !req.body.passwordConfirm || !req.body.answer){
        errors.push("All fields must be filled out!");
    }

    if(req.body.secQuestion === 'Select a question...'){
        errors.push("A security question must be selected.")
    }

    let usernameCheck = isUserNameInvalid(req.body.username)

    if(usernameCheck){
        errors = errors.concat(usernameCheck);
    }

    let emailCheck = isEmailInvalid(req.body.email);
    if(emailCheck){
        errors = errors.concat(emailCheck);
    }

    let result;
    const checkUsernameUnique = async() => {
        result = await isUserNameUnique(req.body.username);
    }

    checkUsernameUnique().then(() => {
        if(result){
            errors = errors.concat("A user with that username already exists.");
        }

        let emailResult;
        const checkEmail = async() => {
            emailResult = await isEmailUnique(req.body.email);
        }

        checkEmail().then(() => {
            if(emailResult){
                errors = errors.concat("A user with that email already exists.");
            }

            let passwordResult;
            const checkPassword = async() => {
                passwordResult = await isPasswordInvalid(req.body.password, req.body.passwordConfirm)
            }

            checkPassword().then(()=>{
                if(passwordResult[0] !== '$'){
                    errors = errors.concat(passwordResult);
                }
                
                // Redirect to creation page with errors
                if(errors.length !== 0){
                    res.render('createAccount.pug', {title:"Create Account", errors:errors, username:req.body.username, email:req.body.email})
                }
                else{
                    let hashedAnswer;
                    const encryptedAnswer = async() => {
                        hashedAnswer = await encryptAnswer(req.body.answer);
                    }

                    encryptedAnswer().then(() => {
                        // Create account
                        insertUser(req.body.username, passwordResult, req.body.email, req.body.secQuestion, hashedAnswer, "User").catch(console.dir);
            
                        // Redirect to account homepage and login
                        req.session.loggedInAs = req.body.username;
                        res.render('accountPage.pug', {user:req.session.loggedInAs});
                    })
                }
            })
        })
    })
})

app.get('/accountPage', (req, res) => {
    if(!req.session.loggedInAs){
        res.render('index.pug', {title: "Games Database", loggedIn:req.session.loggedInAs})
    }
    else{
        getUserType(req.session.loggedInAs).then((result) => {
            if(result === "User"){
                return res.render('accountPage.pug', {user:req.session.loggedInAs, isAdmin: false});
            }
            else{
                return res.render('accountPage.pug', {user:req.session.loggedInAs, isAdmin: true});
            }
        })
    }
})

app.get('/logout', (req, res) => {
    if(!req.session.loggedInAs){
        res.render('index.pug', {title: "Games Database", loggedIn:req.session.loggedInAs})
    }
    else{
        req.session.destroy();
        res.render('index.pug', {title: "Games Database", loggedIn:null})
    }
})

app.get('/forgot', (req, res) => {
    if(req.session.loggedIn){
        return res.render('index.pug', {title: "Games Database", loggedIn:req.session.loggedInAs})
    }
    req.session.destroy();
    res.render('recovery.pug', {title:"Recover Password", errors:null, emailPhase:true})
})

app.post('/forgot', (req, res) => {
    let errors=[]

    // Empty will capture true on the respective phase (ie. not undefined)
    if(req.body.email === ''){
        errors.push("All fields must be filled in!");
        return res.render('recovery.pug', {title:"Recover Password", errors:errors, emailPhase:true})
    }
    else if(req.body.answer === ''){
        let user;
        const findQuestion = async() => {
            user = await findUserQuestion(req.session.emailRecovery);
        }

        findQuestion().then(() => {
            errors.push("All fields must be filled in!");
            return res.render('recovery.pug', {title:"Recover Password", errors:errors, answerPhase:true, question:user.question})
        })
    }
    else if(req.body.password === '' || req.body.passwordConfirm === ''){
        errors.push("All fields must be filled in!");
        return res.render('recovery.pug', {title:"Recover Password", errors:errors, passwordPhase:true})
    }

    if(req.body.email){
        req.session.emailRecovery = req.body.email;
        let user;
        const findUser = async() => {
            user = await isEmailUnique(req.body.email);
        }

        findUser().then(() => {
            if(!user){
                errors.push("The user with that email does not exist.");
                return res.render('recovery.pug', {title:"Recover Password", errors:errors, emailPhase:true})
            }
            else{
                let user;
                const findQuestion = async() => {
                    user = await findUserQuestion(req.body.email);
                }

                findQuestion().then(() => {
                    return res.render('recovery.pug', {title:"Recover Password", errors:null, answerPhase:true, question:user.question})
                })
            }
        })
    }
    else if(req.body.answer){
        let user;
        const findQuestion = async() => {
            user = await findUserQuestion(req.session.emailRecovery);
        }

        findQuestion().then(() => {
            let answerVerified;

            const verify = async() => {
                answerVerified = await verifyAnswer(req.body.answer, user.answer)
            }

            verify().then(() => {
                if(!answerVerified){
                    errors.push("The answer was incorrect.");
                    return res.render('recovery.pug', {title:"Recover Password", errors:errors, emailPhase:true})                       
                }
                return res.render('recovery.pug', {title:"Recover Password", errors:null, passwordPhase:true})
            })
        })        
    }
    else if(req.body.password){
        let passwordResult;
        const checkPassword = async() => {
            passwordResult = await isPasswordInvalid(req.body.password, req.body.passwordConfirm)
        }

        checkPassword().then(()=>{
            if(passwordResult[0] !== '$'){
                errors = errors.concat(passwordResult);
            }
            
            // Redirect to creation page with errors
            if(errors.length !== 0){
                return res.render('recovery.pug', {title:"Recover Password", errors:errors, passwordPhase:true})
            }
            else{
                let hashedPassword;
                const encryptedPassword = async() => {
                    hashedPassword = await encryptAnswer(req.body.password);
                }

                encryptedPassword().then(() => {
                    // Update password
                    updateUserPassword(req.session.emailRecovery, hashedPassword);
                    req.session.destroy();

                    // Redirect to homepage
                    res.render('index.pug', {title: "Games Database", loggedIn:null})
                })
            }
        })
    }
})

// Run the server
app.listen(port, (error) => {
    if(!error){
        console.log(`Server listening to port ${port}`);
    }
    else{
        console.log("Error occurred: " + error);
    }
    
})

// Errors
app.use((err, req, res, next) => {
    console.error(err.stack)
    res.render('error.pug', {title: "Error", message: "The requested page cannot be processed at this time. Please contact your local administrator or try again later."})
})

app.use((req, res, next) => {
    res.render('error.pug', {title: "Error", message: "The requested page cannot be found."})
})