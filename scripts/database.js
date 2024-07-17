import pg from "pg"; 
import dotenv from "dotenv"; 

dotenv.config(); 

export const db = new pg.Client({ 
    user : process.env.DB_USER,
    database : process.env.DB_DATABASE,
    host : process.env.DB_HOST,
    password : process.env.DB_PASSWORD,
    port : process.env.DB_PORT
    
}
);

 try { 
    db.connect(); 
    console.log("Database Connected"); 
    }catch(err){ 
    console.log("Error while connecting to the database" , err.message);
    };  




