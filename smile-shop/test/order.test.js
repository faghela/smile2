const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const Product = require('../src/features/products/product.model');
const Order = require('../src/features/orders/order.model');
const { createOrder } = require('../src/features/orders/order.controller');

const MONGO_URI = 'mongodb://127.0.0.1:27017/smile_shop_test?retryWrites=false';

describe('Order Creation & Stock Rollback Tests', () => {
    let p1, p2;

    before(async () => {
        // Connect to the test database
        await mongoose.connect(MONGO_URI);
        // Clear collections
        await Product.deleteMany({});
        await Order.deleteMany({});

        // Create test products
        p1 = new Product({
            name: 'Test Product 1',
            description: 'Description 1',
            price: 100,
            stock: 10
        });
        await p1.save();

        p2 = new Product({
            name: 'Test Product 2',
            description: 'Description 2',
            price: 50,
            stock: 5
        });
        await p2.save();
    });

    after(async () => {
        // Clean up and disconnect
        await Product.deleteMany({});
        await Order.deleteMany({});
        await mongoose.disconnect();
    });

    test('1. Valid order succeeds and deducts stock', async () => {
        const req = {
            body: {
                customerName: 'Test Customer',
                customerPhone: '0912345678',
                customerAddress: 'Tripoli',
                city: 'Tripoli',
                items: [
                    { productId: p1._id.toString(), quantity: 2 },
                    { productId: p2._id.toString(), quantity: 1 }
                ]
            }
        };

        let statusCode = 0;
        let responseData = null;

        const res = {
            status(code) {
                statusCode = code;
                return this;
            },
            json(data) {
                responseData = data;
                return this;
            }
        };

        await createOrder(req, res);

        assert.strictEqual(statusCode, 201);
        assert.ok(responseData.success);
        assert.ok(responseData.order);

        // Verify stock updated in DB
        const updatedP1 = await Product.findById(p1._id);
        const updatedP2 = await Product.findById(p2._id);

        assert.strictEqual(updatedP1.stock, 8);
        assert.strictEqual(updatedP2.stock, 4);

        // Update local variables for subsequent tests
        p1.stock = 8;
        p2.stock = 4;
    });

    test('2. Order exceeding stock fails, hides exact stock level, and rolls back stock changes', async () => {
        const req = {
            body: {
                customerName: 'Failing Customer',
                customerPhone: '0912345679',
                customerAddress: 'Tripoli',
                city: 'Tripoli',
                items: [
                    { productId: p1._id.toString(), quantity: 3 }, // valid quantity (8 available)
                    { productId: p2._id.toString(), quantity: 10 } // invalid quantity (4 available)
                ]
            }
        };

        let statusCode = 0;
        let responseData = null;

        const res = {
            status(code) {
                statusCode = code;
                return this;
            },
            json(data) {
                responseData = data;
                return this;
            }
        };

        await createOrder(req, res);

        assert.strictEqual(statusCode, 400);
        assert.ok(responseData.message);
        
        // Error message shouldn't leak the exact stock levels (4 or 10)
        assert.ok(!responseData.message.includes('4'));
        assert.ok(!responseData.message.includes('10'));

        // Verify stock of p1 was rolled back and p2 remained unchanged
        const updatedP1 = await Product.findById(p1._id);
        const updatedP2 = await Product.findById(p2._id);

        assert.strictEqual(updatedP1.stock, 8);
        assert.strictEqual(updatedP2.stock, 4);
    });
});
