import express from "express";
import bodyParser from "body-parser";
import session from "express-session";
import dotenv from "dotenv";

import { pauth } from "./scripts/authentication.js";
import {
    renderHomepage,
    renderRegister,
    renderLogin,
    renderDashboard,
    renderTips,
    renderBudgetUpdate,
    renderHelp,
    renderIntegrations,
    renderCurrentMonthExpenses,
    renderLastMonthExpenses,
    renderSavedBudgetUpdate,
    renderHelpWithBudget,
    renderSettings,
    renderSignOut,
    postRenderRegister,
    postLogin,
    postRenderDashboard,
} from "./scripts/handler.js";
dotenv.config();

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 203093039 },
}));

app.use(pauth.initialize());
app.use(pauth.session());


// Routes
app.get("/", renderHomepage);
app.get("/register", renderRegister);
app.post("/register", postRenderRegister);
app.get("/login", renderLogin);
app.post("/login", postLogin);

// Protected Routes
app.get("/dashboard", ensureAuthenticated, renderDashboard);
app.post("/dashboard", ensureAuthenticated, postRenderDashboard);
app.get("/dashboard/tips", ensureAuthenticated, renderTips);
app.get("/dashboard/budget-update", ensureAuthenticated, renderBudgetUpdate);
app.get("/dashboard/help", ensureAuthenticated, renderHelp);
app.get("/dashboard/integrations", ensureAuthenticated, renderIntegrations);
app.get("/dashboard/saved-reports/current-month-expenses", ensureAuthenticated, renderCurrentMonthExpenses);
app.get("/dashboard/saved-reports/last-month-expenses", ensureAuthenticated, renderLastMonthExpenses);
app.get("/dashboard/saved-reports/budget-update", ensureAuthenticated, renderSavedBudgetUpdate);
app.get("/dashboard/saved-reports/help-with-budget", ensureAuthenticated, renderHelpWithBudget);
app.get("/dashboard/settings", ensureAuthenticated, renderSettings);
app.get("/signout", ensureAuthenticated, renderSignOut);
app.get("/auth/google", pauth.authenticate("google", { scope: ["profile", "email"] }));
app.get("/auth/google/dashboard", pauth.authenticate("google", 
    { successRedirect: "/dashboard",
     failureRedirect: "/login" 
    }));



// Function to check if the user is authenticated
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        res.redirect('/login');
    }
}


// Start server
app.listen(port, () => {
    console.log(`App running successfully on http://localhost:${port}`);
});