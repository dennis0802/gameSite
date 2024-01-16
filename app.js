import express from 'express';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import bodyParser from 'body-parser';
import { insertUser, findUser, getUserType } from './src/db_functions.js';
import { isPasswordInvalid, isUserNameInvalid, verifyPasswordLogin } from './src/verification_functions.js';

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

        let verified = verifyPasswordLogin(req.body.password, result.password);

        if(verified){
            req.session.loggedInAs = req.body.username;
            res.render('accountPage.pug', {user:req.session.loggedInAs, isAdmin:false});
        }
        else{
            res.render('loginUser.pug', {title: "Login User", loginMessage: "Login User", error:"Incorrect username or password.", username:req.body.username})
        }
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

        let verified = verifyPasswordLogin(req.body.password, result.password);

        if(verified){
            req.session.loggedInAs = req.body.username;
            res.render('accountPage.pug', {user:req.session.loggedInAs, isAdmin: true});
        }
        else{
            res.render('loginUser.pug', {title: "Login Admin", loginMessage: "Login Admin", error:"Incorrect username or password.", username:req.body.username})
        }
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
    if(!req.body.username || !req.body.password || !req.body.passwordConfirm){
        errors.push("All fields must be filled out!");
    }

    let usernameCheck = isUserNameInvalid(req.body.username)
    if(usernameCheck){
        errors = errors.concat(usernameCheck);
    }

    let passwordResult;
    const a = async() => {
        passwordResult = await isPasswordInvalid(req.body.password, req.body.passwordConfirm)
    }

    a().then(()=>{
        if(passwordResult[0] !== '$'){
            errors = errors.concat(passwordResult);
        }
        
        // Redirect to creation page with errors
        if(errors.length !== 0){
            res.render('createAccount.pug', {title:"Create Account", errors:errors, username:req.body.username})
        }
        else{
            // Create account
            insertUser(req.body.username, passwordResult, "User").catch(console.dir);

            // Redirect to account homepage and login
            req.session.loggedInAs = req.body.username;
            res.render('accountPage.pug', {user:req.session.loggedInAs});
        }
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
    res.send("Under construction");
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