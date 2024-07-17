import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { db as database } from "./database.js";
import bcrypt from "bcrypt";
import  GoogleStrategy  from "passport-google-oauth20";
import dotenv from "dotenv"; 
import  OAuth  from "oauth";
dotenv.config();
passport.use(new LocalStrategy(async function verify(username, password, cb) {
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

        const isValidPassword = await bcrypt.compare(password, storedHashedPassword , (err , result)=>{ 
            if (err) {
                console.error('Error while comparing passwords:', err.stack);
                return cb(err);
            }else{
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
    userProfileURL : process.env.GOOGLE_USER_PROFILE_URL
}, 
async function verify(accessToken, refreshToken, profile, cb) {
  console.log(profile);

}       

));

passport.serializeUser((user, cb) => {
    cb(null, user);
});

passport.deserializeUser((user, cb) => {
    cb(null, user);
});

export const pauth = passport;
