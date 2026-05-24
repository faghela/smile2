const express = require('express');
const router = express.Router();
const orderController = require('./order.controller');
const adminAuth = require('../../core/middleware/auth');
const { validateOrder } = require('../../core/middleware/validate');
const rateLimit = require('express-rate-limit');

const orderLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { message: 'لقد أرسلت طلبات كثيرة، يرجى الانتظار قبل إرسال طلب جديد.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const trackLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 20, // 20 محاولة كحد أقصى لكل IP
    message: { message: 'محاولات تتبع كثيرة جداً، يرجى المحاولة بعد 15 دقيقة.' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/', orderLimiter, validateOrder, orderController.createOrder);
router.get('/track', trackLimiter, orderController.trackOrders);

const { ownerOnly } = adminAuth;

router.get('/check-new', adminAuth, orderController.checkNewOrders);
router.get('/export', adminAuth, orderController.exportOrders);
router.get('/', adminAuth, orderController.getOrders);
router.put('/:id/status', adminAuth, orderController.updateOrderStatus);
router.delete('/:id', adminAuth, ownerOnly, orderController.deleteOrder);

module.exports = router;
