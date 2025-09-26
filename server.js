// express - Används för att skapa ett rest-api.
import express from "express"
// pg-promise - Används för att kunna koppla upp sig till en PostgreSQL-databas.  
import pgPromise from "pg-promise"
// mysql

import session from "express-session"
import crypto from "crypto"

// Krypterings funktion
function hash(word) {
    const salt = "mitt-salt"
    return crypto.pbkdf2Sync(word, salt, 1000, 64, `sha512`).toString(`hex`)
}

// Databas konfiguration.
const connection = {
    host: "localhost",
    user: "",
    password: "",
    port: 5432,
    database: "rest-api"
} 

// Skapa ett pgPromise-objekt.
const pg = pgPromise()

// Använder databas konfigurationen och försöker kopplar upp oss till databasen. 
// "-c search_path=public" - Ser till att vi kör query's mot public-schemat i databasen.
const database = pg({
    ...connection,
  options: "-c search_path=public"
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

// Vår root-endpoint - gå till http://localhost:3000
app.get("/", (request, response) => {
    console.log("Du är på servern.")
    response.json({message: "Du kan prata med servern."})
})

// En annan endpoint - gå till http://localhost:3000/endpoint2
app.get("/endpoint2", async (request, response) => {
    console.log("Jag är endpoint2.")
    response.json({
        message: "Du kom åt endpoint2."
    })
})

// En endpoint som hämtar data från product-tabellen i databasen - gå till http://localhost:3000/products
app.get("/products", async (request, response) => {
    const result = await database.any("SELECT * FROM products")
    console.log(result)
    return response.json(result)
})

// En endpoint lägger till en ny produkt i product-tabellen - I Postman, POST - http://localhost:3000/products
app.post("/products", async (request, response) => {
    const {name, price} = request.body

    try {
        const result = await database.result("INSERT INTO products (name, price) VALUES ($1, $2)",
            [name, price])
        
        console.log(result)
        return response.status(201).json(result)
    } catch (error) {
        console.log(error)
        return response.status(409).json({message: "Server error."})
    }
})

// Kollar vår session
app.get("/check-session", async (request, response) => {
    console.log(request.session)
    return response.status(200).json({message: "session is here!"})
})

// Kollar om någon är inloggad
app.get("/login", async (request, response) => {
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
app.post("/login", async (request, response) => {
    if(request.session.user){
        return response.status(404).json({
            message: "Någon annan är redan inloggad."
        })
    } else {
        const {username, password} = request.body
        let result = null

        try{
            result = await database.one("SELECT * FROM users WHERE name = $1 AND password = $2", 
                [username, hash(password)])
        } catch (e){
            console.log(e)
        }

        console.log("result: ", result)

        if(!result){
            return response.status(404).json({
                message: "No user found! Wrong username or password."
            })
        } else {
            request.session.user = {
                id: result.id,
                username: result.name
            }

            return response.status(201).json({
                message: `Välkommen ${request.session.user.username}!`
            })
        }
 
    }
    
})

// Logga ut 
app.delete("/login", async (request, response) => {
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
app.post("/users", async (request, response) => {
    console.log("Trying to create user")
    const {username, password} = request.body

    try {
        const result = await database.result("INSERT INTO users (name, password) VALUES ($1, $2)",
            [username, hash(password)])
        
        console.log(result)
        return response.status(201).json(result)
    } catch (error) {
        console.log(error)
        return response.status(409).json({message: "Server error."})
    }
})

// Startar servern när vi kör server.js-filen.
app.listen(port, () => { console.log(`http://localhost:${port}`)})
