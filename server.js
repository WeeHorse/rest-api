// express - Används för att skapa ett rest-api.
import express from "express"
// mysql
import mysql from 'mysql2/promise';
import session from "express-session"
import crypto from "crypto"
import acl from "./acl.js"
import 'dotenv/config'


// Krypterings funktion
function hash(word) {
    const salt = process.env.HASH_SALT
    return crypto.pbkdf2Sync(word, salt, 1000, 64, `sha512`).toString(`hex`)
}

// Databas konfiguration.
const database = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE
}) 

// Skapar ett express-objekt.
const app = express()
// Vilken port vi ska lägga servern på.
const port = 3000

// En middleware som låter oss hantera json-data i våra request.
app.use(express.json())

//Lägger till session i vårt rest-api. 
app.use(session({
    secret: "min-hemlighet",
    resave: false,
    saveUninitialized: true
}))

// access control list middleware
app.use(acl)

// En endpoint som hämtar data från product-tabellen i databasen - gå till http://localhost:3000/products
app.get("/api/products", async (request, response) => {
    const [result] = await database.execute("SELECT * FROM products")
    return response.json(result)
})

// En endpoint lägger till en ny produkt i product-tabellen - I Postman, POST - http://localhost:3000/products
app.post("/api/products", async (request, response) => {
    const {name, price} = request.body

    try {
        const [result] = await database.execute("INSERT INTO products (name, price) VALUES (?, ?)",
            [name, price])
        
        return response.status(201).json(result)
    } catch (error) {
        return response.status(409).json({message: "Server error."})
    }
})

// Kollar om någon är inloggad
app.get("/api/login", async (request, response) => {
    if (request.session.user){
        return response.status(200).json({
            username: request.session.user.username
        }) 
    } else {
           return response.status(200).json({
            message: "Ingen är inloggad."
        })  
    }
})

// Logga in
app.post("/api/login", async (request, response) => {
    if(request.session.user){
        return response.status(404).json({
            message: "Någon annan är redan inloggad."
        })
    } else {
        const {username, password} = request.body
        let result = null

        try{
            [result] = await database.execute("SELECT * FROM users WHERE name = ? AND password = ?", 
                [username, hash(password)])
        } catch (e){
            console.log(e)
        }

        result = result[0]

        if(!result){
            return response.status(404).json({
                message: "No user found! Wrong username or password."
            })
        } else {
            request.session.user = {
                id: result.id,
                username: result.name,
                role: result.role
            }

            return response.status(201).json({
                message: `Välkommen ${request.session.user.username}!`
            })
        }
 
    }
    
})

// Logga ut 
app.delete("/api/login", async (request, response) => {
    if(!request.session.user) {
        return response.status(404).json({
            message: "Ingen är inloggad."
        })
    } else {
        request.session.destroy((err) => {
            if(err) {
                console.log(err)
                return response.status(500).json({
                    message: "Något blev fel när du skulle logga ut"
                })
            } else {
                return response.status(201).json({
                    message: "Du har loggat ut."
                })
            }
        })
    }
    return response.status(200)
})

// Lägg till en ny användare (user registration)
app.post("/api/users", async (request, response) => {
    const {username, password} = request.body

    try {
        const [result] = await database.execute("INSERT INTO users (name, password, role) VALUES (?, ?, ?)",
            [username, hash(password), 'user'])
        
        return response.status(201).json(result)
    } catch (error) {
        console.log(error)
        return response.status(409).json({message: "Server error."})
    }
})

// Startar servern när vi kör server.js-filen.
app.listen(port, () => { console.log(`http://localhost:${port}`)})
