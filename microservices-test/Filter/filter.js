const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const session = require('express-session');
const bodyParser = require('body-parser');

const config = {
    user: 'sa',
    password: '123456',
    server: 'localhost',
    database: 'WebCSDL',
};

sql.connect(config, (err, pool) => {
    if (err) console.log(err);
    else {
        console.log("SQL Server Connected...");

        const app = express();

        app.use(express.static('public'));
        app.use(cors({
            origin: 'http://localhost:3000',
            credentials: true
        }));
        app.use(bodyParser.json());
        app.use(session({
            secret: 'keyboard cat',
            resave: true,
            saveUninitialized: false
        }));

        app.get('/price', async (req, res) => {
            try {
                const query = `
                    SELECT * FROM Product
                    WHERE Price BETWEEN ${req.query.from} AND ${req.query.to} 
                    AND Category LIKE N'${req.query.category}'
                    ORDER BY ${req.query.sortField ? req.query.sortField : 'Sold'} ${req.query.sortDirection > 0 ? 'ASC' : 'DESC'}
                    OFFSET ${(req.query.pageNumber - 1) * req.query.pageSize} ROWS  
                    FETCH NEXT ${req.query.pageSize} ROWS ONLY
                `;
                console.log(query);
                const result = await new sql.Request().query(query);
                const total = await new sql.Request().query(
                    `
                    SELECT COUNT(*) AS Total FROM Product
                    WHERE Price BETWEEN ${req.query.from} AND ${req.query.to}
                    AND Category LIKE N'${req.query.category}'
                    `
                );
                // console.log(total);
                res.status(200).json({
                    success: true,
                    data: {
                        total: total.recordset[0].Total,
                        recordset: result.recordset
                    }
                });
            } catch (err) {
                res.status(500).json({
                    success: false,
                    message: err.message
                });
            }
        });
        
        app.get('/category', async (req, res) => {
            try {
                const query = `
                    SELECT * FROM [Product]
                    WHERE Category LIKE N'${req.query.category}'
                    ORDER BY ${req.query.sortField ? req.query.sortField : 'Sold'} ${req.query.sortDirection > 0 ? 'ASC' : 'DESC'}
                    OFFSET ${(req.query.pageNumber - 1) * req.query.pageSize} ROWS  
                    FETCH NEXT ${req.query.pageSize} ROWS ONLY
                `;
                // console.log(query);
                const result = await new sql.Request().query(query);
                const total = await new sql.Request().query(
                    `
                    SELECT COUNT(*) AS Total FROM Product
                    WHERE Category LIKE N'${req.query.category}'
                    `
                );
                // console.log(total);
                res.status(200).json({
                    success: true,
                    data: {
                        total: total.recordset[0].Total,
                        recordset: result.recordset
                    }
                });
            } catch (err) {
                res.status(500).json({
                    success: false,
                    message: err.message
                });
            }
        });
        app.listen(process.env.PORT || 5007, (err) => {
            if (err) throw err;
            else console.log("Filter service listen on port 5007...");
        });
    }
});