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

export const renderDashboard = (req, res) => {
    res.render("dashboard.ejs");
};

export const postRenderDashboard = (req, res) => {
    console.log(req.body);
    try {
        const user = req.body;
        res.render("dashboard.ejs", { user });
    } catch (err) {
        console.error("Error while passing budget data to the dashboard:", err.message);
    }
};

export const renderTips = (req, res) => {
    res.render("tips.ejs");
};

export const renderBudgetUpdate = (req, res) => {
    res.render("budget-information.ejs");
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

export const renderSavedBudgetUpdate = (req, res) => {
    res.render("saved-budget-update.ejs");
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
