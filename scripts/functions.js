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
export async function insertBudgetData(user_id, total_amount ) {
    try {
        // Calculate total expenses from transactions
        const total_expenses = await get_total_transactions(user_id);
        console.log(total_expenses); 
        // Update total_income, net_balance, and current_savings
        const updated_net_balance = total_amount - total_expenses;
        const current_savings = updated_net_balance; // Savings are effectively the net balance after expenses

        const result = await db.query(
            "UPDATE budgets SET total_income = $1, total_expenses = $2, net_balance = $3, current_savings = $4 WHERE user_id = $5 RETURNING *",
            [total_amount, total_expenses, updated_net_balance, current_savings, user_id]
        );

        // If no existing record, insert a new one
        if (result.rowCount === 0) {
            const insertResult = await db.query(
                "INSERT INTO budgets (user_id, total_income, total_expenses, net_balance, current_savings) VALUES ($1, $2, $3, $4, $5) RETURNING *",
                [user_id, total_amount, total_expenses, updated_net_balance, current_savings]
            );
            return insertResult.rows[0];
        }

        return result.rows[0];
    } catch (err) {
        console.error("Error while inserting budget data:", err.stack);
        throw err;
    }
}

// Calculate Total Transaction Amount
// export async function calculateTotalTransactionAmount(user_id) {
//     try {
//         const transactions = await db.query(
//             "SELECT amount FROM transactions WHERE user_id = $1",
//             [user_id]
//         );

//         // Calculate the sum of transaction amounts
//         const total_amount = transactions.rows.reduce((sum, transaction) => {
//             return sum + (transaction.amount || 0);
//         }, 0);

//         console.log("Total Amount:", total_amount);
//         return total_amount;
//     } catch (err) {
//         console.error("Error while calculating total transaction amount:", err.stack);
//         throw err;
//     }
// };
export async function get_transactions(req, res, user_id, date, category, amount, description) {
    try {
        // Validate the input values
        if (isNaN(amount)) {
            throw new Error("Invalid amount value");
        }

        const result = await db.query(
            "INSERT INTO transactions (user_id, date, category, amount, description) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [user_id, date, category, amount, description]
        );

        // Fetch total expenses
        const total_expense_amount = await get_total_transactions(user_id);

        // Fetch total income
        const total_income_result = await db.query("SELECT total_income FROM budgets WHERE user_id = $1", [user_id]);
        const total_income = parseFloat(total_income_result.rows[0].total_income);

        // Calculate net balance and current savings
        const net_balance = total_income - total_expense_amount;
        const current_savings = total_income - net_balance;

        // Update budget information
        await db.query("UPDATE budgets SET total_expenses = $1 WHERE user_id = $2", [total_expense_amount, user_id]);
        await db.query("UPDATE budgets SET net_balance = $1 WHERE user_id = $2", [net_balance, user_id]);
        await db.query("UPDATE budgets SET current_savings = $1 WHERE user_id = $2", [current_savings, user_id]);
        // Log the transaction
        const transaction = result.rows[0];
        console.log("Transaction inserted successfully:", transaction);

        // Redirect to dashboard
        res.redirect("/dashboard");
    } catch (err) {
        console.error("Error while inserting transaction:", err.stack);
        res.status(500).send("Internal server error");
    }
}


// Fetch and return transactions

// Render and return transaction data
export async function renderTransactionData(user_id) {
    try {
        const transactions = await db.query(
            "SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC",
            [user_id]
        );

        return transactions.rows;
    } catch (err) {
        console.error("Error while fetching transaction data:", err.stack);
        throw err;
    }
}


// Fetch and return incomes
// Fetch and return the total sum of incomes
export async function get_total_transactions(user_id) {
    try {
        const result = await db.query(
            "SELECT SUM(amount) as total_transaction FROM transactions WHERE user_id = $1",
            [user_id]
        );

        const total_income = result.rows[0].total_transaction;
        return total_income;
    } catch (err) {
        console.error("Error while fetching total incomes:", err.stack);
        throw err;
    }
}

// Get users income 

export async function get_user_income(user_id) {
    try {   
 const result = await db.query("select total_income from budgets where user_id = $1", [user_id]);
 if(result.rows === 0) {
     return null;
 }else{ 
    const income = result.rows[0].total_income;
    return income;
 }
    }catch(err){ 
        console.log("Error while fetching user income:", err.stack);
    }}; 

// Update expenses on transaction add; 

export async function updateExpenses(user_id, total_expenses) {

}

// Delete total income
export async function deletetotalincome(incomeId) {
    try {
        await db.query("DELETE FROM incomes WHERE id = $1", [incomeId]);
        console.log("Income deleted successfully");
    } catch (err) {
        console.error("Error while deleting income:", err.stack);
        throw err;
    }
}


export async function renderbudgetsummary(user_id){ 
    try{ 
        const result = await db.query("select * from transactions where user_id = $1", [user_id])
        return result.rows; 
    }catch(err){
    console.log("Error while rendering budget summary:", err.stack);
    }
}