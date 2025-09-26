# rest-setup

##Steg 1
Installera alla dependencies:
```bash
npm install
```

##Steg 2
Gå in i server.js och fixa till **connection**-variablen, så den innehåller rätt host, port, user, password och databas.

Ändra även i **database**-variblen's **search_path**, så att den navigerar till rätt schema i databasen. Den är satt till **public**-schemat.

 ```
 options: "-c search_path=public"
 ```



##Steg 3
Starta servern:
```bash
node server.js
```