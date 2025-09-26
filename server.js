// express - Används för att skapa ett rest-api.
import express from "express"
// mysql
import mysql from 'mysql2/promise';
import session from "express-session"
import crypto from "crypto"
import acl from "./acl.js"


// Krypterings funktion
function hash(word) {
    const salt = "mitt-salt"
    return crypto.pbkdf2Sync(word, salt, 1000, 64, `sha512`).toString(`hex`)
}

// Databas konfiguration.
const database = await mysql.createConnection({
    host: "hostname",
    user: "username",
    password: "password",
    port: 0,
    database: "dbname"
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
    console.log(result)
    return response.json(result)
})

// En endpoint lägger till en ny produkt i product-tabellen - I Postman, POST - http://localhost:3000/products
app.post("/api/products", async (request, response) => {
    const {name, price} = request.body

    try {
        const [result] = await database.execute("INSERT INTO products (name, price) VALUES (?, ?)",
            [name, price])
        
        console.log(result)
        return response.status(201).json(result)
    } catch (error) {
        console.log(error)
        return response.status(409).json({message: "Server error."})
    }
})

// Kollar vår session
app.get("/api/check-session", async (request, response) => {
    console.log(request.session)
    return response.status(200).json({message: "session is here!"})
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

        console.log("result: ", result)

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

// Lägg till en ny användare
app.post("/api/users", async (request, response) => {
    console.log("Trying to create user")
    const {username, password} = request.body

    try {
        const [result] = await database.execute("INSERT INTO users (name, password, role) VALUES (?, ?, ?)",
            [username, hash(password), 'user'])
        
        console.log(result)
        return response.status(201).json(result)
    } catch (error) {
        console.log(error)
        return response.status(409).json({message: "Server error."})
    }
})

// Startar servern när vi kör server.js-filen.
app.listen(port, () => { console.log(`http://localhost:${port}`)})
