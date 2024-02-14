import express from 'express';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import bodyParser from 'body-parser';
import flash from 'express-flash';
import { insertUser, findUser, getUserType, findUserQuestion, updateUserPassword, insertGame, 
         getAllGames, getAllUsers, findGameById, updateGame, deleteGame, findUserById, deleteUser, updateUser, toggleMuting, updateLastLogin, insertComment, getGameComments, deleteAllPosts } from './src/db_functions.js';
import { isPasswordInvalid, isUserNameInvalid, verifyPasswordLogin, isEmailInvalid, isUserNameUnique, isEmailUnique, 
         encryptAnswer, verifyAnswer, isGameEntryInvalid, isGameNameUnique, escapeHtml } from './src/verification_functions.js';

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
app.use(flash());

// ROUTES
app.get('/', (req, res) => {
    res.render('index.pug', {title: "Games Database", loggedIn:req.session.loggedInAs, messages: req.flash('info')})
})

app.get('/games', (req, res) => {
    let results;
    const getResults = async() => {
        results = await getAllGames();
    }

    getResults().then(() => {
        if(req.session.loggedInAs){
            getUserType(req.session.loggedInAs).then((result) => {
                if(result.userType === "User"){
                    res.render('content.pug', {title: "Games", loggedIn:req.session.loggedInAs, isGame:true, isAdmin:false, rows:results})
                }
                else{
                    res.render('content.pug', {title: "Games", loggedIn:req.session.loggedInAs, isGame:true, isAdmin:true, rows:results, messages: req.flash('info')})
                }
            })
        }
        else{
            res.render('content.pug', {title: "Games", loggedIn:req.session.loggedInAs, isGame:true, rows:results})
        }
    })
})

app.get('/users', (req, res) => {
    let results;
    const getResults = async() => {
        results = await getAllUsers();
    }

    getResults().then(() => {
        if(req.session.loggedInAs){
            getUserType(req.session.loggedInAs).then((result) => {
                if(result === "User"){
                    res.redirect("/");
                }
                else{
                    res.render('content.pug', {title: "Users", loggedIn:req.session.loggedInAs, isOnUsers:true, isAdmin:true, rows:results, messages: req.flash('info')})
                }
            })
        }
        else{
            res.redirect("/");
        }
    })
})

app.get('/login', (req, res) => {
    if(req.session.loggedInAs){
        res.redirect("/accountPage")
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
                updateLastLogin(req.body.username);
                req.session.loggedInAs = req.body.username;
                req.session.admin = false;
                res.redirect('/accountPage');
            }
            else{
                res.render('loginUser.pug', {title: "Login User", loginMessage: "Login User", error:"Incorrect username or password.", username:req.body.username})
            }
        })
    });
    
})

app.get('/loginAdmin', (req, res) => {
    if(req.session.loggedInAs){
        res.redirect('/accountPage');
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
                updateLastLogin(req.body.username);
                req.session.loggedInAs = req.body.username;
                req.session.admin = true;
                res.redirect("/accountPage")
            }
            else{
                res.render('loginUser.pug', {title: "Login Admin", loginMessage: "Login Admin", error:"Incorrect username or password.", username:req.body.username})
            }
        })
    });
    
})

app.get('/createAccount', (req, res) => {
    if(req.session.loggedInAs){
        return res.redirect("/accountPage")
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
                        req.session.admin = false;
                        res.redirect("/accountPage")
                    })
                }
            })
        })
    })
})

app.get('/accountPage', (req, res) => {
    if(!req.session.loggedInAs){
        res.redirect("/");
    }
    else{
        res.render('accountPage.pug', {user:req.session.loggedInAs, isAdmin: req.session.admin, messages:req.flash('info')});
    }
})

app.get('/logout', (req, res) => {
    if(!req.session.loggedInAs){
        res.redirect("/");
    }
    else{
        req.session.loggedInAs = null;
        req.session.admin = null;
        
        req.flash('info', "Successfully logged out!");
        res.redirect("/");
    }
})

app.get('/forgot', (req, res) => {
    if(req.session.loggedIn){
        return res.redirect("/");
    }
    
    req.session.loggedInAs = null;
    req.session.admin = null;
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
                    
                    req.session.loggedInAs = null;
                    req.session.admin = null;
                    req.flash('info', "Successfully reset password!");
                    res.redirect("/");
                })
            }
        })
    }
})

app.get('/addGame', (req, res) => {
    if(req.session.loggedInAs && req.session.admin){
        res.render('addContent.pug', {title: "Add Game", isGame: true, loggedIn:req.session.loggedInAs})
    }
    else{
        res.redirect('/games');  
    }
})

app.post('/addGame', (req, res) => {
    let errors=[];
    let gameCheck = isGameEntryInvalid(req.body.name, req.body.genre, req.body.start, req.body.end);

    if(gameCheck){
        errors = errors.concat(gameCheck);
    }

    let result;
    const checkGame = async() => {
        result = await isGameNameUnique(req.body.name);
    }

    checkGame().then(() => {
        if(result){
            errors = errors.concat("A game with that name already exists.");
        }

        if(errors.length !== 0){
            res.render('addContent.pug', {title: "Add Game", loggedIn:req.session.loggedInAs, isGame: true, name:req.body.name, start:req.body.start, end:req.body.end, review:escapeHtml(req.body.review), genre:req.body.genre, rating:req.body.rating, errors:errors})        
        }
        else{
            // Create game
            insertGame(req.body.name, req.body.genre, req.body.rating, req.body.start, req.body.end, escapeHtml(req.body.review)).catch(console.dir);
            req.flash("Game successfully created!");
            res.redirect('/games'); 
        }
    })
})

app.get('/viewGame', (req, res) => {
    if(!req.query.gameId){
        let results;
        const getResults = async() => {
            results = await getAllGames();
        }
        getResults().then(() => {
            res.render('content.pug', {title: "Games", loggedIn:req.session.loggedInAs, isGame:true, rows:results})    
        })    
    }
    else{
        let game;
        const getResults = async() => {
            game = await findGameById(req.query.gameId);
        }

        getResults().then(() => {
            if(!game){
                return res.redirect("/games");
            }

            let user;
            const searchUser = async() =>{
                user = await findUser(req.session.loggedInAs);
            }

            searchUser().then(() => {
                getGameComments(req.query.gameId).then((result) => {
                    if(user){
                        res.render('viewGame.pug', {title: game.name, game:game, loggedIn:req.session.loggedInAs, posts: result, muted:user.isMuted, messages: req.flash('info')});
                    }
                    else{
                        res.render('viewGame.pug', {title: game.name, game:game, loggedIn:req.session.loggedInAs, posts: result, messages: req.flash('info')});
                    }
                })
            })
        })
    }
})

app.post('/viewGame', (req, res) => {
    if(!req.body.subject || !req.body.contentPost){
        let game;
        const getResults = async() => {
            game = await findGameById(req.query.gameId);
        }

        getResults().then(() => {
            if(!game){
                return res.redirect("/games");
            }
            let user;
            const searchUser = async() =>{
                user = await findUser(req.session.loggedInAs);
            }

            searchUser().then(() => {
                getGameComments(req.query.gameId).then((result) => {
                    if(user){
                        res.render('viewGame.pug', {title: game.name, game:game, loggedIn:req.session.loggedInAs, posts: result, muted:user.isMuted, error:"All fields must be filled out!"});
                    }
                    else{
                        res.render('viewGame.pug', {title: game.name, game:game, loggedIn:req.session.loggedInAs, posts: result, error:"All fields must be filled out!"});
                    }
                })
            })
        })
    }
    else{
        insertComment(req.session.loggedInAs, req.query.gameId, req.body.subject, req.body.contentPost)
        req.flash("info", "Message posted!");
        res.redirect('/viewGame?gameId=' + req.query.gameId);
    }
})

app.get('/editGame', (req, res) => {
    if(!req.query.gameId || !(req.session.loggedInAs && req.session.admin)){
        res.redirect('/games');
    }
    else{
        let result;
        const searchGame = async() => {
            result = await findGameById(req.query.gameId);
        }

        searchGame().then(() => {
            if(!result){
                return res.redirect('/games');
            }
            let start = result.timeline.slice(0, 7);
            let end = result.timeline.slice(10, 17);
            res.render('addContent.pug', {title: "Edit Game", loggedIn:req.session.loggedInAs, isGame:true, name:result.name, start:start, end:end, review:result.thoughts, genre:result.genre, rating:result.rating, errors:null, isEditing: true})
        })
    }
})

app.post('/editGame', (req, res) => {
    let errors=[];
    let gameCheck = isGameEntryInvalid(req.body.name, req.body.genre, req.body.start, req.body.end);

    if(gameCheck){
        errors = errors.concat(gameCheck);
    }

    let result;
    const checkGame = async() => {
        result = await isGameNameUnique(req.body.name);
    }

    checkGame().then(() => {
        if(result && result.name !== req.body.name){
            errors = errors.concat("A game with that name already exists.");
        }

        if(errors.length !== 0){
            return res.render('addContent.pug', {title: "Edit Game", loggedIn:req.session.loggedInAs, isGame:true, name:req.body.name, start:req.body.start, end:req.body.end, review:escapeHtml(req.body.review), genre:req.body.genre, rating:req.body.rating, errors:errors})        
        }
        else{
            // Update and view game
            updateGame(req.query.gameId, req.body.name, req.body.genre, req.body.rating, req.body.start, req.body.end, escapeHtml(req.body.review)).catch(console.dir);
            req.flash('info', "Game successfully edited!")
            res.redirect('/viewGame?gameId=' + req.query.gameId)
        }
    })
})

app.get('/deleteGame', (req, res) => {
    if(!req.query.gameId || !(req.session.loggedInAs && req.session.admin)){
        res.redirect("/games");
    }
    else{
        let result;
        const searchGame = async() => {
            result = await findGameById(req.query.gameId);
        }

        searchGame().then(() => {
            if(!result){
                return res.redirect('/games');
            }
            res.render('deleteContent.pug', {title: "Delete Game", isGame: true, loggedIn:req.session.loggedInAs, name:result.name, result: result})
        })
    }
})

app.post('/deleteGame', (req, res) => {
    let result;
    const searchGame = async() => {
        result = await findGameById(req.query.gameId);
    }

    searchGame().then(() => {
        deleteAllPosts(req.query.gameId);
        deleteGame(req.query.gameId)
        req.flash("info", "Game successfully deleted!");
        res.redirect("/games")
    })
})

app.get('/addUser', (req, res) => {
    if(req.session.loggedInAs && req.session.admin){
        res.render('addContent.pug', {title: "Add User", loggedIn:req.session.loggedInAs})
    }
    else if(req.session.admin){
        res.redirect('/users');  
    }
    else{
        res.redirect("/");
    }
})

app.post('/addUser', (req, res) => {
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
                    res.render('addContent.pug', {title: "Add User", errors:errors, loggedIn:req.session.loggedInAs, username:req.body.username, email:req.body.email})
                }
                else{
                    let hashedAnswer;
                    const encryptedAnswer = async() => {
                        hashedAnswer = await encryptAnswer(req.body.answer);
                    }

                    encryptedAnswer().then(() => {
                        // Create account
                        insertUser(req.body.username, passwordResult, req.body.email, req.body.secQuestion, hashedAnswer, "User").catch(console.dir);
            
                        req.flash("info", "User successfully created!");
                        // Redirect to users
                        res.redirect("/users")
                    })
                }
            })
        })
    })
})

app.get('/resetUser', (req, res) => {
    if(!req.query.userId && req.session.admin){
        return res.redirect("/users");
    }
    else if(!req.session.admin){
        return res.redirect("/");
    }
    else{
        let result;
        const searchUser = async() => {
            result = await findUserById(req.query.userId);
        }

        searchUser().then(() => {
            if(!result){
                return res.redirect('/users');
            }
            res.render('deleteContent.pug', {title: "Reset User", isReset: true, loggedIn:req.session.loggedInAs, name:result.username, result: result})
        })
    }        
})

app.post('/resetUser', (req, res) => {
    let hashedPassword;
    const encryptedPassword = async() => {
        hashedPassword = await encryptAnswer("defaultPassword123!");
    }

    encryptedPassword().then(() => {
        let result;
        const searchUser = async() => {
            result = await findUserById(req.query.userId);
        }

        searchUser().then(() => {
            if(result.username === req.session.loggedInAs){
                return res.render('deleteContent.pug', {title: "Reset User", isReset: true, loggedIn:req.session.loggedInAs, name:result.username, result: result, errors:"You cannot reset an account while you are logged in!"})
            }

            // Update password
            updateUserPassword(result.email, hashedPassword);
            req.flash('info', 'User reset!');
            res.redirect("/users");
        })
    })
})

// Admin-initiated deletion
app.get('/deleteUser', (req, res) => {
    if(!req.query.userId && req.session.admin){
        return res.redirect("/users");
    }
    else if(!req.session.admin){
        return res.redirect("/");
    }
    else{
        let result;
        const searchUser = async() => {
            result = await findUserById(req.query.userId);
        }

        searchUser().then(() => {
            if(!result){
                return res.redirect('/users');
            }
            res.render('deleteContent.pug', {title: "Delete User", isOnUser:true, loggedIn:req.session.loggedInAs, name:result.username, result: result})
        })
    }        
})

app.post('/deleteUser', (req, res) => {
    let result;
    const searchUser = async() => {
        result = await findUserById(req.query.userId);
    }

    searchUser().then(() => {
        if(result.username === req.session.loggedInAs){
            return res.render('deleteContent.pug', {title: "Reset User", isReset: true, loggedIn:req.session.loggedInAs, name:result.username, result: result, errors:"You cannot reset an account while you are logged in!"})
        }

        // Delete user
        deleteUser(req.query.userId);
        req.flash('info', 'User successfully deleted!')
        res.redirect("/users");
    })
})

// User-initiated deletion
app.get('/deleteAccount', (req, res) => {
    if(!req.session.loggedInAs){
        return res.redirect("/");
    }
    else{
        res.render('deleteContent.pug', {title: "Delete Your Account", selfRequest:true})
    }
})

app.post('/deleteAccount', (req, res) => {
    let result;
    const searchUser = async() => {
        result = await findUser(req.session.loggedInAs);
    }

    searchUser().then(() => {
        // Delete user
        deleteUser(result._id);
        req.session.loggedInAs = null;
        req.session.admin = null;
        req.flash('info', "Successfully deleted account!");
        
        res.redirect("/");
    })
})

app.get('/editAccount', (req, res) => {
    if(req.session.loggedInAs === req.query.user){
        let result;
        const searchUser = async() => {
            result = await findUser(req.session.loggedInAs);
        }
    
        searchUser().then(() => {
            res.render('createAccount.pug', {title:"Edit Account", isEdit: true, loggedIn:req.session.loggedInAs, username:result.username, email:result.email})
        })
    }
    else if(req.session.loggedInAs){
        res.redirect("/accountPage");
    }
    else{
        res.redirect("/");
    }
})

app.post("/editAccount", (req, res) => {
    let errors=[]
    let passwordFlag = req.body.password && req.body.passwordConfirm, questionFlag = req.body.secQuestion !== 'Select a question...' && req.body.answer;
    let userType = req.session.admin ? "Admin" : "User";

    if(!req.body.username || (!req.body.password && req.body.passwordConfirm) || (req.body.password && !req.body.passwordConfirm)){
        errors.push("All fields must be filled out! Both password fields must be filled if changing your password");
    }

    if((req.body.secQuestion !== 'Select a question...' && !req.body.answer) || (req.body.secQuestion === 'Select a question...' && req.body.answer) ){
        errors.push("A security question must be selected with a corresponding answer OR be left as defaults.")
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
        if(result && result.username !== req.body.username){
            errors = errors.concat("A user with that username already exists.");
        }

        let emailResult;
        const checkEmail = async() => {
            emailResult = await isEmailUnique(req.body.email);
        }

        checkEmail().then(() => {
            if(emailResult && result.email !== req.body.email){
                errors = errors.concat("A user with that email already exists.");
            }

            let passwordResult;
            const checkPassword = async() => {
                passwordResult = await isPasswordInvalid(req.body.password, req.body.passwordConfirm)
            }

            checkPassword().then(()=>{
                if(passwordResult[0] !== '$' && passwordFlag){
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
                        // Update account
                        updateUser(result._id, req.body.username, passwordResult, req.body.email, req.body.secQuestion, hashedAnswer, userType, passwordFlag, questionFlag).catch(console.dir);
            
                        // Redirect to account homepage
                        req.flash('info', "Account info successfully updated!");
                        res.redirect("/accountPage")
                    })
                }
            })
        })
    })    
})

app.get('/muteUser', (req, res) => {
    if(!req.query.userId && req.session.admin){
        return res.redirect("/users");
    }
    else if(!req.session.admin){
        return res.redirect("/");
    }
    else{
        let result;
        const searchUser = async() => {
            result = await findUserById(req.query.userId);
        }

        searchUser().then(() => {
            if(!result){
                return res.redirect('/users');
            }
           toggleMuting(req.query.userId, !result.isMuted);
           req.flash('info', 'User muting toggled!')
           res.redirect("/users");
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