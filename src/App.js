import express from "express";
import cors from "cors";
import pg from "pg";
import categoriesSchema from "../schema/categories.schema.js";

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

/* 
- Formato de uma categoria (tabela `categories`)

    ```jsx
    {
      id: 1,
      name: 'Estratégia',
    }


- Listar categorias
    - **Rota**: **GET** /categories
    - **Response**: lista de todas as categorias cada no formato acima:
        [
          {
            id: 1,
            name: 'Estratégia',
          },
          {
            id: 2,
            name: 'Investigação',
          }
        ]
*/

App.get("/categorias", async (req, res) => {
    const categories = await connection.query("SELECT * FROM categories");
    res.send(categories.rows);
});

App.post("/categorias", async (req, res) => {
    req.body.name = req.body.name.trim();
    const validation = categoriesSchema(req.body);

    //Validation if name value is not empty
    if (validation.error) {
        res.status(400).send("Campo 'name' não pode estar vazio.");
        return;
    }

    //Validation if categorie already axists
    const existCategorie = await connection.query("SELECT id FROM categories WHERE LOWER(name) = $1 LIMIT 1", [req.body.name.toLowerCase()]);
    if (existCategorie.rowCount) {
        res.status(409).send("Categoria já existente.");
        return;
    }

    try {
        await connection.query("INSERT INTO categories (name) VALUES ($1);", [req.body.name]);
        res.sendStatus(201);
    } catch (e) {
        console.log(e);
    }
});




App.listen(4000, () => { console.log("Running server on port 4000...") });