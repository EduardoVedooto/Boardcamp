import express from "express";
import cors from "cors";
import pg from "pg";
import categoriesSchema from "../schema/categories.schema.js";
import gamesSchema from "../schema/games.schema.js";
import customersSchema from "../schema/customers.schema.js";
import DateFormatter from "./utils/DateFormatter.js";

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
    try {
        const categories = await connection.query(`SELECT * FROM categories`);
        res.send(categories.rows);
    } catch (e) {
        console.error(e);
        res.sendStatus(500);
        return;
    }
});

App.post("/categorias", async (req, res) => {
    req.body.name = req.body.name.trim();
    const validation = categoriesSchema(req.body);

    //Validation if name value is not empty
    if (validation.error) {
        res.status(400).send("Campo 'name' não pode estar vazio.");
        return;
    }

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
    const { name } = req.query;
    if (name) {
        try {
            const games = await connection.query(`
                SELECT games.*, categories.name AS "category" 
                FROM games 
                JOIN categories 
                ON games."categoryId" = categories.id
                WHERE LOWER(games.name) LIKE '%'|| $1 ||'%' 
            `, [name.toLowerCase()]);
            console.log(games.rows);
            res.send(games.rows);
        } catch (e) {
            console.error(e);
            res.sendStatus(500);
            return;
        }
    } else {
        try {
            const games = await connection.query("SELECT * FROM games");
            games.rows.forEach(async game => {
                const categoryName = await connection.query("SELECT name from categories WHERE id = $1 LIMIT 1", [game.categoryId]);
                game = {
                    ...game,
                    categoryName: categoryName.rows[0].name
                }
                console.log(game);
            });
            res.send(games.rows);
        } catch (e) {
            console.error(e);
            res.sendStatus(500);
        }
    }
});

App.post("/games", async (req, res) => {
    req.body = {
        ...req.body,
        name: req.body.name.trim(),
    };
    const validation = gamesSchema(req.body);

    if (validation.error) {
        res.status(400).send(validation.error.details[0].message);
        return;
    }

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
    if (req.query.cpf) {
        const cpf = req.query.cpf.trim();
        if (isNaN(cpf)) {
            res.status(400).send("O campo CPF só aceita números.");
            return;
        }
        try {
            const customers = await connection.query(`
                SELECT *
                FROM customers
                WHERE cpf LIKE '%' || $1 || '%';
            `, [cpf]);
            customers.rows.forEach(customer => customer.birthday = DateFormatter(new Date(customer.birthday)));
            res.send(customers.rows);
        } catch (e) {
            console.error(e);
            res.sendStatus(500);
            return;
        }
    } else {
        try {
            const customers = await connection.query(`SELECT * FROM customers;`);
            console.log(customers.fields);
            customers.rows.forEach(customer => customer.birthday = DateFormatter(new Date(customer.birthday)));
            res.send(customers.rows);
        } catch (e) {
            console.error(e);
            res.sendStatus(500);
        }
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
    Object.keys(req.body).forEach(key => req.body[key] = req.body[key].trim());
    const { name, phone, cpf, birthday } = req.body;
    const validation = customersSchema(req.body);

    if (validation.error) {
        res.status(400).send(validation.error.details[0].message);
        return;
    }

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
    Object.keys(req.body).forEach(key => req.body[key] = req.body[key].trim());
    const { name, phone, cpf, birthday } = req.body;
    const validation = customersSchema(req.body);

    if (validation.error) {
        res.status(400).send(validation.error.details[0].message);
        return;
    }

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

App.listen(4000, () => { console.log("Running server on port 4000...") });