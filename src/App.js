import express from "express";
import cors from "cors";
import pg from "pg";
import categoriesSchema from "../schema/categories.schema.js";
import gamesSchema from "../schema/games.schema.js";

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
    }

    try {
        await connection.query(`INSERT INTO categories (name) VALUES ($1);`, [req.body.name]);
        res.sendStatus(201);
    } catch (e) {
        console.error(e);
    }
});

App.get("/games", async (req, res) => {
    const { name } = req.query;
    if (name) {
        try {
            const games = await connection.query("SELECT * FROM games WHERE LOWER(name) LIKE '%'|| $1 ||'%'", [name.toLowerCase()]);
            res.send(games.rows);
        } catch (e) {
            console.error(e);
        }
    } else {
        try {
            const games = await connection.query("SELECT * FROM games");
            res.send(games.rows);
        } catch (e) {
            console.error(e);
        }
    }
});

App.post("/games", async (req, res) => {
    req.body = {
        ...req.body,
        name: req.body.name.trim(),
    }
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
    }
});



App.listen(4000, () => { console.log("Running server on port 4000...") });