import express, { query } from "express";
import cors from "cors";
import pg from "pg";
import categoriesSchema from "../schema/categories.schema.js";
import gamesSchema from "../schema/games.schema.js";
import customersSchema from "../schema/customers.schema.js";
import DateFormatter from "./utils/DateFormatter.js";
import ArrayFormatter from "./utils/ArrayFormatter.js";

const { Pool } = pg;
const App = express();
App.use(cors());
App.use(express.json());
const connection = new Pool({
    user: 'bootcamp_role',
    password: 'senha_super_hiper_ultra_secreta_do_role_do_bootcamp',
    host: 'localhost',
    port: 5432,
    database: 'boardcamp'
});

App.get("/categorias", async (req, res) => {
    const { offset, limit } = req.query;
    try {
        const categories = await connection.query(`
            SELECT * 
            FROM categories 
            ${offset ? "OFFSET $1" : " "}
            ${limit ? offset ? "LIMIT $2" : "LIMIT $1" : ""}
        `, offset ? limit ? [offset, limit] : [offset] : limit ? [limit] : []);
        res.send(categories.rows);
    } catch (e) {
        console.error(e);
        res.sendStatus(500);
    }
});

App.post("/categorias", async (req, res) => {
    const validation = categoriesSchema(req.body);
    //Validation if name value is not empty
    if (validation.error) {
        res.status(400).send("Campo 'name' não pode estar vazio.");
        return;
    }

    req.body.name = req.body.name.trim();

    try {
        //Validation if categorie already axists
        const existCategorie = await connection.query("SELECT id FROM categories WHERE LOWER(name) = $1 LIMIT 1", [req.body.name.toLowerCase()]);
        if (existCategorie.rowCount) {
            res.status(409).send("Categoria já existente.");
            return;
        }
    } catch (e) {
        console.error(e);
        res.sendStatus(500);
        return;
    }

    try {
        await connection.query(`INSERT INTO categories (name) VALUES ($1);`, [req.body.name]);
        res.sendStatus(201);
    } catch (e) {
        console.error(e);
        res.sendStatus(500);
        return;
    }
});

App.get("/games", async (req, res) => {
    const { name, offset, limit } = req.query;
    const search = {
        query: `
            SELECT games.*, categories.name AS "category" 
            FROM games 
            JOIN categories 
            ON games."categoryId" = categories.id
            ${name ? "WHERE LOWER(games.name) LIKE '%'|| $1 ||'%'" : ""} 
        `,
        array: name ? [name.toLowerCase()] : []
    };

    if (offset && limit) {
        search.query += `${name ? "OFFSET $2 LIMIT $3" : "OFFSET $1 LIMIT $2"}`;
        search.array.push(offset);
        search.array.push(limit);
    } else if (offset) {
        search.query += `${name ? "OFFSET $2" : "OFFSET $1"}`;
        search.array.push(offset);
    } else if (limit) {
        search.query += `${name ? "LIMIT $2" : "LIMIT $1"}`;
        search.array.push(limit);
    }

    try {
        const games = await connection.query(search.query, search.array);
        res.send(games.rows);
    } catch (e) {
        console.error(e);
        res.sendStatus(500);
    }


});

App.post("/games", async (req, res) => {

    const validation = gamesSchema(req.body);

    if (validation.error) {
        res.status(400).send(validation.error.details[0].message);
        return;
    }

    req.body = {
        ...req.body,
        name: req.body.name.trim(),
    };

    try {
        const existGame = await connection.query("SELECT id FROM games WHERE LOWER(name) = $1 LIMIT 1", [req.body.name.toLowerCase()]);
        if (existGame.rowCount) {
            res.status(409).send("Jogo já existente");
            return;
        }
    } catch (e) {
        console.error(e);
        res.sendStatus(500);
        return;
    }

    try {
        const { name, image, stockTotal, categoryId, pricePerDay } = req.body;
        await connection.query(`
            INSERT INTO games ("name", "image", "stockTotal", "categoryId", "pricePerDay") 
            VALUES ($1, $2, $3, $4, $5);`,
            [name, image, stockTotal, categoryId, pricePerDay]
        );
        res.sendStatus(201);
    } catch (e) {
        console.error(e);
        res.sendStatus(500);
    }
});

App.get("/customers", async (req, res) => {
    const { cpf, offset, limit } = req.query;
    if (cpf && isNaN(cpf)) {
        res.status(400).send("O campo CPF só aceita números.");
        return;
    }
    const search = {
        query: `
            SELECT *
            FROM customers
            ${cpf ? "WHERE cpf LIKE '%' || $1 || '%'" : ""}
        `,
        array: cpf ? [cpf] : []
    };

    if (offset && limit) {
        search.query += `${cpf ? "OFFSET $2 LIMIT $3" : "OFFSET $1 LIMIT $2"}`;
        search.array.push(offset);
        search.array.push(limit);
    } else if (offset) {
        search.query += `${cpf ? "OFFSET $2" : "OFFSET $1"}`;
        search.array.push(offset);
    } else if (limit) {
        search.query += `${cpf ? "LIMIT $2" : "LIMIT $1"}`;
        search.array.push(limit);
    }

    try {
        const customers = await connection.query(search.query, search.array);
        customers.rows.forEach(customer => customer.birthday = DateFormatter(new Date(customer.birthday)));
        res.send(customers.rows);
    } catch (e) {
        console.error(e);
        res.sendStatus(500);
        return;
    }
});

App.get("/customers/:id", async (req, res) => {
    try {
        const customer = await connection.query(`SELECT * FROM customers WHERE id = $1 LIMIT 1`, [req.params.id]);
        if (!customer.rowCount) res.sendStatus(404);
        else res.send({ ...customer.rows[0], birthday: DateFormatter(new Date(customer.rows[0].birthday)) });
    } catch (e) {
        console.error(e);
        res.sendStatus(500);
    }
});

App.post("/customers", async (req, res) => {
    const validation = customersSchema(req.body);

    if (validation.error) {
        res.status(400).send(validation.error.details[0].message);
        return;
    }

    Object.keys(req.body).forEach(key => req.body[key] = req.body[key].trim());
    const { name, phone, cpf, birthday } = req.body;

    const existCpf = await connection.query(`SELECT id FROM customers WHERE cpf = $1 LIMIT 1`, [cpf]);
    if (existCpf.rowCount) {
        res.status(409).send("Cliente já cadastrado.");
        return;
    }

    try {
        await connection.query(
            `INSERT INTO customers (name, phone, cpf, birthday) VALUES ($1,$2,$3,$4)`,
            [name, phone, cpf, birthday]
        );
        res.sendStatus(201);
    } catch (e) {
        console.error(e);
        res.sendStatus(500);
    }

});

App.put("/customers/:id", async (req, res) => {
    const validation = customersSchema(req.body);

    if (validation.error) {
        res.status(400).send(validation.error.details[0].message);
        return;
    }
    Object.keys(req.body).forEach(key => req.body[key] = req.body[key].trim());
    const { name, phone, cpf, birthday } = req.body;

    const existCustomer = await connection.query(`
        SELECT id 
        FROM customers 
        WHERE cpf = $1 
        LIMIT 1`,
        [cpf]);
    if (existCustomer.rowCount) {

        res.status(409).send("Cliente já cadastrado.");
        return;
    }

    try {
        const response = await connection.query(`
            UPDATE customers 
            SET name = $1, 
                phone = $2, 
                cpf = $3, 
                birthday = $4 
            WHERE id = $5`,
            [name, phone, cpf, birthday, req.params.id]
        );
        if (!response.rowCount) {
            res.status(400).send("ID não reconhecido na base de dados");
            return;
        }
        res.sendStatus(200);
    } catch (e) {
        console.error(e);
        res.sendStatus(500);
    }
});

App.post("/rentals", async (req, res) => {
    const { customerId, gameId, daysRented } = req.body;
    if (daysRented && (isNaN(daysRented) || daysRented <= 0)) {
        res.status(400).send("Dias alugado deve ser um número válido e/ou maior que 0.");
        return;
    }

    if (customerId && isNaN(customerId) || gameId && isNaN(gameId) || !customerId || !gameId) {
        res.status(400).send("Os campos ID's devem conter apenas números.");
        return;
    }

    try {
        const verification = await connection.query(`
            SELECT customers.id AS "customerId", games."pricePerDay", games."stockTotal"
            FROM customers 
            CROSS JOIN games 
            WHERE customers.id = $1 AND games.id = $2 
            LIMIT 1
        `, [customerId, gameId]);

        if (!verification.rowCount) {
            res.status(400).send("CustomerID ou GameID não existem.");
            return;
        }

        const totalRentalsOfGame = await connection.query(`SELECT id FROM rentals WHERE "gameId" = $1 AND "returnDate" IS NULL`, [gameId]);
        if (verification.rows[0].stockTotal < totalRentalsOfGame.rowCount) {
            res.status(400).send("Todos os jogos deste título já foram alugados.");
            return;
        }

        await connection.query(`
            INSERT INTO rentals 
            ("customerId","gameId","rentDate","daysRented","returnDate","originalPrice","delayFee")
            VALUES ($1,$2,$3,$4,$5,$6,$7)
        `, [
            customerId,
            gameId,
            new Date,
            daysRented,
            null,
            verification.rows[0].pricePerDay * daysRented,
            null
        ]);

        res.sendStatus(201);
    } catch (e) {
        console.error(e);
        res.sendStatus(500);
    }

});

App.post("/rentals/:id/return", async (req, res) => {
    try {
        const rentalInformation = await connection.query(`
            SELECT rentals."rentDate", rentals."daysRented", rentals."returnDate", games."pricePerDay"
            FROM rentals
            JOIN games
            ON rentals."gameId" = games.id
            WHERE rentals.id = $1
            LIMIT 1
        `, [req.params.id]);

        if (!rentalInformation.rowCount || rentalInformation.rows[0].returnDate !== null) {
            res.status(400).send(`ID: ${req.params.id} não corresponde a nenhum aluguel ativo.`);
            return;
        }

        const { rentDate, daysRented, pricePerDay } = rentalInformation.rows[0];
        const daysReallyRented = parseInt((new Date - new Date(rentDate)) / 86400000);
        const delayedDays = daysReallyRented - daysRented;
        const delayFee = delayedDays > 0 ? delayedDays * pricePerDay : 0;

        await connection.query(`
            UPDATE rentals 
            SET "returnDate" = 'NOW()',
                "delayFee" = $1
            WHERE id = $2
        `, [delayFee, req.params.id]);

        res.sendStatus(200);
    } catch (e) {
        console.error(e);
        res.sendStatus(500);
    }
});

App.delete("/rentals/:id", async (req, res) => {
    try {
        const verification = await connection.query(`
            SELECT "returnDate"
            FROM rentals
            WHERE id = $1
        `, [req.params.id]);

        if (!verification.rowCount) {
            res.status(404).send(`ID: ${req.params.id} não corresponde a nenhum aluguel.`);
            return;
        }
        if (verification.rows[0].rentDate !== null) {
            res.status(400).send(`Aluguel já finalizado`);
            return;
        }

        await connection.query(`DELETE FROM rentals WHERE id = $1`, [req.params.id]);
        res.sendStatus(200);
    } catch (e) {
        console.error(e);
        res.sendStatus(500);
    }
});

App.get("/rentals", async (req, res) => {
    const { customerId, gameId } = req.body;

    if (customerId || gameId) {
        try {
            const rentals = await connection.query(`
                SELECT 
                    r.*,
                    c.id AS "customerId",
                    c.name AS "customerName",
                    g.id AS "gameId",
                    g.name AS "gameName",
                    g."categoryId",
                    cat.name AS "categoryName"
                FROM rentals r 
                JOIN customers c ON r."customerId" = c.id
                JOIN games g ON r."gameId" = g.id
                JOIN categories cat ON g."categoryId" = cat.id
                WHERE ${customerId ? "c.id = $1" : "g.id = $1"} ${gameId ? customerId ? "AND g.id = $2" : "" : ""}
            `, customerId ? gameId ? [customerId, gameId] : [customerId] : gameId ? [gameId] : []);

            const formattedArray = rentals.rows.map(rental => ArrayFormatter(rental));
            res.status(200).send(formattedArray);

        } catch (e) {
            console.error(e);
            res.sendStatus(500);
        }
    } else {
        try {
            const rentals = await connection.query(`
                SELECT 
                    r.*,
                    c.id AS "customerId",
                    c.name AS "customerName",
                    g.id AS "gameId",
                    g.name AS "gameName",
                    g."categoryId",
                    cat.name AS "categoryName"
                FROM rentals r 
                JOIN customers c ON r."customerId" = c.id
                JOIN games g ON r."gameId" = g.id
                JOIN categories cat ON g."categoryId" = cat.id
            `);

            const formattedArray = rentals.rows.map(rental => ArrayFormatter(rental));

            res.status(200).send(formattedArray);
        } catch (e) {
            console.error(e);
            res.sendStatus(500);
        }
    }
});

App.listen(4000, () => { console.info("Running server on port 4000...") });