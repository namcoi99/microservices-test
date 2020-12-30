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

        app.post('/', async (req, res) => {
            try {
                console.log(req.body);
                const orderID = new Date().getTime();
                const createDate = `${new Date().getFullYear()}-${new Date().getMonth()+1}-${new Date().getDate()}`;
                console.log(createDate);
                // new orderinfo
                const newOrderQuery = `
                    INSERT INTO [Order]
                    VALUES (
                        '${orderID}',
                        '${req.body.username}',
                        '${createDate}',
                        '${req.body.total}',
                        N'${req.body.status}'
                    )
                `;
                const newOrderResult = await new sql.Request().query(newOrderQuery);
        
                // new orderlist
                for (const product of req.body.orderList) {
                    await new sql.Request().query(`
                        INSERT INTO OrderList
                        VALUES (
                            '${orderID}',
                            '${product.productID}',
                            '${product.quantity}'
                        )
                    `);
                }
                await new sql.Request().query(`
                    DELETE FROM [Cart]
                    WHERE Username = '${req.body.username}'
                `);
                res.status(201).json({ success: true });
            } catch (err) {
                res.status(500).json({
                    success: false,
                    message: err.message
                });
            }
        });
        
        app.delete('/:orderID', async (req, res) => {
            try {
                const checkResult = await new sql.Request().query(`
                    SELECT * FROM [Order]
                    WHERE OrderID = '${req.params.orderID}'
                `);
                if (!checkResult.rowsAffected[0]) {
                    res.json({
                        success: false,
                        message: "OrderID not exist"
                    });
                } else {
                    const delQuery = `
                        DELETE FROM [OrderList]
                        WHERE OrderID = '${req.params.orderID}'
                        DELETE FROM [Order]
                        WHERE OrderID = '${req.params.orderID}'
                    `;
                    await new sql.Request().query(delQuery);
                    res.status(200).json({ success: true });
                }
            } catch (err) {
                res.status(500).json({
                    success: false,
                    message: err.message
                });
            }
        });
        
        app.get('/', async (req, res) => {
            try {
                const result = await new sql.Request().query(`
                    SELECT * FROM [Order]
                    WHERE Username = '${req.query.username}'
                    ORDER BY CreateDate DESC 
                `);
                res.status(200).json({
                    success: true,
                    data: {
                        recordset: result.recordset,
                        total: result.rowsAffected[0]
                    }
                });
            } catch (err) {
                res.status(500).json({
                    success: false,
                    message: err.message
                });
            }
        });
        
        app.get('/:orderID', async (req, res) => {
            try {
                const checkResult = await new sql.Request().query(`
                    SELECT * FROM [Order]
                    WHERE OrderID = '${req.params.orderID}'
                `);
                if (!checkResult.rowsAffected[0]) {
                    res.json({
                        success: false,
                        message: "OrderID not exist"
                    });
                } else {
                    // orderlist
                    const orderList = await new sql.Request().query(`
                        SELECT OrderList.ProductID, Name, Image, Quantity, Price FROM [OrderList]
                        INNER JOIN [Product] ON OrderList.ProductID = Product.ProductID
                        WHERE OrderID = '${req.params.orderID}'
                    `);
                    res.status(200).json({
                        success: true,
                        data: {
                            detail: checkResult.recordset[0],
                            orderList: orderList.recordset
                        }
                    });
                }
            } catch (err) {
                res.status(500).json({
                    success: false,
                    message: err.message
                });
            }
        });
        
        app.listen(process.env.PORT || 5003, (err) => {
            if (err) throw err;
            else console.log("Order service listen on port 5003...");
        });
    }
});