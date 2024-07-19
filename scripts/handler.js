import bcrypt from "bcrypt";
import passport from "passport";
import { pauth } from "./authentication.js";
import {
    hashPasswordAndInsertUser,
    checkHashedPassword,
    getUserBudget,
    getUserData,
    insertBudgetData,
    get_transactions,
    renderTransactionData, 
    calculateTotalTransactionAmount,
    getHighestIncome,
    get_incomes,
} from "./functions.js";
import {db} from "./database.js";
// Middleware and route handlers

export const renderHomepage = (req, res) => {
    res.render("homepage.ejs");
};

export const renderRegister = (req, res) => {
    res.render("signup.ejs");
};

// OAuth routes

// Google routes
export const authGoogle = pauth.authenticate("google", { scope: ["profile", "email"] });
export const googleCallbackUrl = pauth.authenticate("google", { successRedirect: "/dashboard", failureRedirect: "/login" });

// GitHub routes
export const authGithub = pauth.authenticate("github");
export const githubCallbackUrl = pauth.authenticate("github", { successRedirect: "/dashboard", failureRedirect: "/login" });

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
        await hashPasswordAndInsertUser(req, res, registerusername, registeremail, registerpassword);
    } catch (err) {
        console.log(err);
    }
};

export const postLogin = passport.authenticate("local", {
    successRedirect: '/dashboard',
    failureRedirect: '/login?error=Incorrect+username+or+password',
    failureMessage: true,
    failWithError: true
});

export const renderDashboard = async (req, res) => {
    if (req.isAuthenticated()) {
        const user = req.user;
        try {
            const budget_information = await getUserBudget(user.id);
            const highest_income = await getHighestIncome(user.id);
            const transaction_data = await renderTransactionData(user.id);

            if (!budget_information) {
                console.log('No budget information found for user:', user.username);
                return res.render("dashboard.ejs", { user, budget_information: {}, transactions: [], highest_income });
            }

            console.log('Budget information:', budget_information);
            if (!transaction_data) {
                console.log('No transaction data found for user:', user.username);
            }
            res.render("dashboard.ejs", { user, budget_information, transactions: transaction_data, highest_income });

        } catch (error) {
            console.error('Error fetching budget data:', error);
            res.status(500).send('Internal server error');
        }
    } else {
        res.redirect("/login");
    }
};

export const renderTips = (req, res) => {
    res.render("tips.ejs");
};

export const renderBudgetUpdate = async(req, res) => {
try{
    const userid = req.user.id; 
    const income = await get_incomes(userid); 
    console.log(income); 
    // delete_amount = income[];
    // const delte_amount = await db.query("SELECT total_income FROM budgets WHERE user_id = $1 and total_income = $2 ", [userid , delete_amount]);
    const error = req.query.error ? req.query.error.replace(/\+/g, ' ') : null;
    res.render("budget-information.ejs", { error  , income , userid});
}catch(err){
    console.log(err);
}
};

export const renderSavedBudgetUpdate = (req, res) => {
    res.render("saved-budget-update.ejs");
};

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

export const postRenderBudgetUpdate = async (req, res) => {
    console.log(req.body);
    try {
        if (req.isAuthenticated()) {
            const { total_amount} = req.body;
            const net_balance = total_amount; 
            const user_id = req.user.id;

            const check_userid_limit = await db.query("SELECT * FROM budgets WHERE user_id = $1", [user_id]);
            if (check_userid_limit.rows.length > 5) {
                return res.redirect("/dashboard/budget-update?error=You+have+reached+the+maximum+limit+of+budget+updates.+Kindly+delete+some+of+them+to+add+more");
            }

            await insertBudgetData(user_id, total_amount , net_balance);
            console.log("Successfully inserted budget details");

            res.redirect("/dashboard");
        } else {
            res.redirect("/login");
        }
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal server error");
    }
};

export const renderHelpWithBudget = (req, res) => {
    res.render("help-with-budget.ejs");
};

export const renderSettings = (req, res) => {
    res.render("settings.ejs");
};

export const getTransactionData = async (req, res) => {
    const user_id = req.user.id;
    console.log("Transaction data:" + req.body);
    const {description , amount , date , category} = req.body;
    await get_transactions(req , res ,user_id , date , category , amount , description);
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


export const delete_route = async (req, res) => {
        const incomeId = req.query.id;
        
        try {
            await db.query("DELETE  FROM budgets WHERE user_id  = $1", [incomeId]);
            res.redirect("/dashboard/budget-update?success=true");
        } catch (err) {
            console.error("Error while deleting income:", err.stack);
            res.redirect("/dashboard/budget-update?error=Error+deleting+income");
        }
    }