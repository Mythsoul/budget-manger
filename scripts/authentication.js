import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { db as database } from "./database.js";
import bcrypt from "bcrypt";
import GoogleStrategy from "passport-google-oauth20";
import dotenv from "dotenv";
import OAuth from "oauth";
import GitHubStrategy from "passport-github2"
dotenv.config();

// FOr authentication 

passport.use("local" , new LocalStrategy(async function verify(username, password, cb) {
    try {
        // Log the username for debugging
        console.log('Username:', username, 'Password:', password);

        const result = await database.query('SELECT * FROM users WHERE email = $1', [username]);

        // If user is not found
        if (result.rows.length === 0) {
            return cb(null, false, { message: 'Incorrect username or password.' });
        }

        const user = result.rows[0];
        const storedHashedPassword = user.password;

        const isValidPassword = await bcrypt.compare(password, storedHashedPassword, (err, result) => {
            if (err) {
                console.error('Error while comparing passwords:', err.stack);
                return cb(err);
            } else {
                console.log("password comparing sucessfull ");
                return cb(null, user);
            }


        });
    } catch (err) {
        console.error('Error while logging user:', err.stack);
        return cb(err);
    }
}));


passport.use("google",
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
            userProfileURL: process.env.GOOGLE_USER_PROFILE_URL
        },
        async function verify(accessToken, refreshToken, profile, cb) {
            console.log(profile.emails[0].value + " \n" + profile.displayName);
            try {
                const result = await database.query("select * from users where email = $1", [profile.emails[0].value]);
                if (result.rows.length === 0) {
                    const hashid = await bcrypt.hash(profile.id, 10);
                    const newUser = await database.query("INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *", [profile.displayName, profile.emails[0].value, hashid]);
                    cb(null, newUser.rows[0])
                } else {
                    cb(null, result.rows[0]);
                }
            } catch (err) {
                console.error(err);
            }

        }

    ));

    passport.use("github", new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL 
    }, async function (accessToken, refreshToken, profile, cb) {
        try {
            const email = profile._json.email || `${profile._json.login}@github.com`;
            const username = profile._json.login;
    
            console.log("Profile Email: " + email + "\n" + "Profile Username: " + username + "\n" + "Profile ID: " + profile.id);
            
            const emailResult = await database.query("SELECT * FROM users WHERE email = $1", [email]);
            if (emailResult.rows.length === 0) {
                const usernameResult = await database.query("SELECT * FROM users WHERE username = $1", [username]);
                if (usernameResult.rows.length === 0) {
                    const hashid = await bcrypt.hash(profile.id.toString(), 10);
                    const newUser = await database.query(
                        "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *",
                        [username, email, hashid]
                    );
                    return cb(null, newUser.rows[0]);
                } else {
                    return cb(null, false, { message: "Username already exists" });
                }
            } else {
                return cb(null, emailResult.rows[0]);
            }
        } catch (err) {
            console.log(err);
            return cb(err);
        }
    }));
    

passport.serializeUser((user, cb) => {
    cb(null, user);
});

passport.deserializeUser((user, cb) => {
    cb(null, user);
});


async function bcrypthash(password, email, username, saltRounds) {
    try {

        bcrypt.hash(password, saltRounds, function (err, hash) {
            if (err) {
                console.log(err);
            } else {
                const hashedpassword = hash;
                console.log(hashedpassword);
                database.query("INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *", [username, email, hashedpassword]);
            }
        })
    } catch (err) {
        console.log(err);
    }

}

async function bcryptcompare(password, email, username, saltRounds) {

    try {
        const result = await database.query("select * from users where email = $1", [email]);
        if (result.length === 0) {
            console.log('user not found');
            return cb("null , false");
        } else {
            const storedHashedPassword = result.rows[0].password;
            const isValidPassword = await bcrypt.compare(password, storedHashedPassword, (err, result) => {
                if (err) {
                    console.error('Error while comparing passwords:', err.stack);
                    return cb(err);
                } else {
                    console.log("password comparing sucessfull ");
                    return cb(null, result);
                }
            }
            )
        }
    } catch (err) {
        console.log("Error while logging user:", err.stack);
        return cb(err);
    }



}
export const pauth = passport;
