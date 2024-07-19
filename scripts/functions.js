import bcrypt from "bcrypt";
import { db } from "./database.js";

// Helper Function for Hashing Password and Inserting User
export async function hashPasswordAndInsertUser(req, res, registerusername, registeremail, registerpassword) {
    const saltRounds = 10;
    try {
        const hashedPassword = await bcrypt.hash(registerpassword, saltRounds);
        const result = await db.query(
            "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *",
            [registerusername, registeremail, hashedPassword]
        );

        const user = result.rows[0];
        if (user) {
            console.log("User data inserted successfully");
            req.login(user, (err) => {
                if (err) {
                    console.error("Error while logging in the user", err);
                    return res.status(500).send("Internal server error");
                }
                res.redirect("/dashboard");
            });
        } else {
            console.error("Error while inserting user data");
            res.status(500).send("Internal server error");
        }
    } catch (err) {
        console.error("Error during password hashing or user insertion", err);
        res.status(500).send("Internal server error");
    }
}

// Check Hashed Password
export async function checkHashedPassword(email, password) {
    try {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        const isValidPassword = await bcrypt.compare(password, storedHashedPassword);
        return isValidPassword;
    } catch (error) {
        console.error("Error while comparing passwords:", error.stack);
        return false;
    }
}

// Get User Data
export async function getUserData(user_id) {
    try {
        const result = await db.query('SELECT * FROM users WHERE id = $1', [user_id]);
        if (result.rows.length === 0) {
            return "User data not found in database";
        }
        return result.rows[0];
    } catch (err) {
        console.error("Error while fetching user data:", err.stack);
        return null;
    }
}

// Get User's Budget
export async function getUserBudget(user_id) {
    try {
        const result = await db.query(
            `SELECT users.id, users.username, users.email, budgets.total_income, budgets.total_expenses, budgets.net_balance, budgets.current_savings 
             FROM users 
             JOIN budgets ON users.id = budgets.user_id 
             WHERE users.id = $1`,
            [user_id]
        );
       
        if (result.rows.length === 0) {
            return null;
        }
        return result.rows[0];
    } catch (err) {
        console.error("Error while fetching user budget:", err.stack);
        return null;
    }
}

// Insert Budget Data
// Function to insert budget data and fetch transactions for the user
export async function insertBudgetData(user_id, total_amount, net_balance) {
    try {
        // Insert the new budget data into the database
        const result = await db.query(
            "INSERT INTO budgets (user_id, total_income, net_balance) VALUES ($1, $2, $3) RETURNING *",
            [user_id, total_amount, net_balance]
        );

            // Get latest income from the database 
const income_latest  = await db.query(
    "SELECT total_income FROM budgets WHERE user_id = $1 ORDER BY id DESC LIMIT 1",
    [user_id]
); 
const latest_income = income_latest.rows[0].total_income;
        // Calculate the total transaction amount for the user
        const total_transaction_amount = await calculateTotalTransactionAmount(user_id);
        const total_expenses = total_transaction_amount;

        console.log("Total Expenses:", total_expenses); 

        // Calculate net balance and current savings
        const updated_net_balance = (latest_income) - (total_expenses);
        const current_savings = latest_income - updated_net_balance;

        // Update the budget with calculated values
        const update_budget = await db.query(
            "UPDATE budgets SET total_expenses = $1, net_balance = $2, current_savings = $3 WHERE user_id = $4",
            [total_expenses, updated_net_balance, current_savings, user_id]
        );

        if (update_budget.rowCount === 0) {
            console.log("Budget update failed");
        } else {
            console.log("Budget updated successfully");
        }

        return result.rows[0];
    } catch (err) {
        console.error("Error while inserting budget data:", err.stack);
        throw err;
    }
}

export async function getHighestIncome(user_id) {
    try {
        const result = await db.query(
            "SELECT MAX(total_income) as highest_income FROM budgets WHERE user_id = $1",
            [user_id]
        );
        return result.rows[0].highest_income || 0;
    } catch (err) {
        console.error("Error while fetching highest income:", err.stack);
        throw err;
    }
}


// Function to fetch transaction data for a user
export async function renderTransactionData(user_id) {
    try {
        const result = await db.query(`
            SELECT users.id, users.username, users.email, transactions.date, transactions.category, transactions.amount, transactions.description
            FROM users
            JOIN transactions ON users.id = transactions.user_id
            WHERE users.id = $1
        `, [user_id]);

        return result.rows;
    } catch (err) {
        console.error("Error while fetching transaction data:", err.stack);
        throw err;
    }
}

// Function to insert transaction data
export async function get_transactions(req, res, user_id, date, category, amount, description) {
    try {
        const result = await db.query(`
            INSERT INTO transactions (user_id, date, category, amount, description)
            VALUES ($1, $2, $3, $4, $5) RETURNING *
        `, [user_id, date, category, amount, description]);

        if (result.rows.length > 0) {
            console.log("Transaction data inserted successfully:", result.rows[0]);
            res.redirect("/dashboard?success=true");
        } else {
            console.log("Error while inserting transaction data");
            res.redirect("/dashboard?error=Insertion+failed");
        }
    } catch (err) {
        console.error("Error while inserting transaction data:", err.stack);
        res.redirect("/dashboard?error=Internal+server+error");
    }
}

export async function calculateTotalTransactionAmount(user_id) {
    try {
        const transactions = await renderTransactionData(user_id);

        // Calculate the sum of transaction amounts
        const total_amount = transactions.reduce((sum, transaction) => {
            return sum + (transaction.amount || 0);
        }, 0);

        console.log("Total Amount:", total_amount);
        return total_amount;
    } catch (err) {
        console.error("Error while calculating total transaction amount:", err.stack);
        throw err;
    }
}



export async function get_incomes(user_id) {
    try {
        const result = await db.query(
            "SELECT total_income FROM budgets WHERE user_id = $1",
            [user_id]
        );
        const incomes = result.rows.map((row) => row.total_income);
        return incomes;
    } catch (err) {
        console.log("Error while fetching income data:", err.stack);
    }}; 

    