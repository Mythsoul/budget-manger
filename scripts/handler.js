import bcrypt from "bcrypt";
import { db } from "./database.js";
import passport from "passport";
import { Strategy } from "passport-local";
import { pauth } from "./authentication.js";
const saltRounds = 10;

// Middleware and route handlers




export const renderHomepage = (req, res) => {
    res.render("homepage.ejs");
};

export const renderRegister = (req, res) => {
    res.render("signup.ejs");
};

// oauth routes /////////////////

//google routes
export const authgoogle = pauth.authenticate("google" , {scope : ["profile", "email"]});
export const googlecallbackurl = pauth.authenticate("google", { successRedirect: "/dashboard", failureRedirect: "/login" });

// github routes 

export const authgithub = pauth.authenticate("github");
export const githubcallbackurl = pauth.authenticate("github", { successRedirect: "/dashboard", failureRedirect: "/login" });


export const renderLogin = (req, res) => {
    const errorMessage = req.query.error ? req.query.error.replace(/\+/g, ' ') : null;
    res.render("login.ejs", { errorMessage });
};

export const postRenderRegister = async (req, res) => {
    const { registerusername, registeremail, registerpassword, registercpassword } = req.body;

    console.log("Received registration data:", {
        registerusername,
        registeremail,
        registerpassword,
        registercpassword
    });

    if (registercpassword !== registerpassword) {
        return res.status(400).send("Passwords do not match");
    }

    try {
        const hashpassword = await bcrypt.hash(registerpassword, saltRounds);
        console.log("Successfully hashed the password");

        const result = await db.query(
            "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *",
            [registerusername, registeremail, hashpassword]
        );

        const user = result.rows[0];

        req.login(user, (err) => {
            if (err) {
                console.error("Error while registering:", err);
                return res.status(500).send("Internal server error");
            }
            res.redirect("/dashboard");
        });
    } catch (error) {
        console.error("Error during registration:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const postLogin = passport.authenticate("local", {
    successRedirect: '/dashboard',
    failureRedirect: '/login?error=Incorrect+username+or+password',
    failureMessage: true,
    failWithError: true
});




export const renderDashboard = async(req, res) => {
   if(req.isAuthenticated()){
       const user = req.user;
       const get_budget_data = await db.query("SELECT * from budgets WHERE user_id = $1" , [req.user.id]); ; 
       const budget_information = await get_budget_data.rows[0];
       console.log(budget_information); 
       res.render("dashboard.ejs" , { user  , budget_information });

   }else{
       res.redirect("/login");
   }
   
};



export const renderTips = (req, res) => {
    res.render("tips.ejs");
};

export const renderBudgetUpdate = (req, res) => {
    const error = req.query.error ? req.query.error.replace(/\+/g, ' ') : null;

    res.render("budget-information.ejs" , {error});
};

export const renderSavedBudgetUpdate = (req, res) => {
       res.render("saved-budget-update.ejs");
} 

export const renderHelp = (req, res) => {
    res.render("help.ejs");
};

export const renderIntegrations = (req, res) => {
    res.render("integrations.ejs");
};

export const renderCurrentMonthExpenses = (req, res) => {
    res.render("current-month-expenses.ejs");
};

export const renderLastMonthExpenses = (req, res) => {
    res.render("last-month-expenses.ejs");
};

export const postrenderbudgetupdate=async(req, res) => {
    console.log(req.body); 
    try{ 
        if(req.isAuthenticated()){
        
        const {total_amount , amount_to_save , weekly_limit , monthly_limit } = req.body;
        const result = await db.query("select * from users where username = $1" , [req.user.username.trim()]); 

        const user_id = result.rows[0].id; 
        console.log("user id "  + user_id); 
    
        const check_userid_limit = await db.query("select * from budgets where user_id = $1" , [user_id]);
        if(check_userid_limit.rows.length >5){
           return res.redirect("/dashboard/budget-update?error=You+have+reached+the+maximum+limit+of+budget+updates. Kindly+delete+some+of+them+to+add+more+")
        }
        const insert_budget = await db.query("INSERT INTO budgets (user_id , total_income , total_expenses, net_balance , current_savings ) VALUES ($1 , $2 , $3 , $4 , $5) RETURNING * ",[user_id , total_amount , amount_to_save , weekly_limit , monthly_limit]); 
        await console.log("SUCESSFULLY INSERTED BUDGET DETAILS");    
 
        res.redirect("/dashboard");
    }else{
res.redirect("/login")
        }
    }catch(err){
        console.log(err)
    }
};

export const renderHelpWithBudget = (req, res) => {
    res.render("help-with-budget.ejs");
}; 
export const renderSettings = (req, res) => {
    res.render("settings.ejs");
};




export const renderSignOut = (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error("Error during logout:", err);
            return res.status(500).send("Internal server error");
        }
        res.redirect("/");
    });
};
