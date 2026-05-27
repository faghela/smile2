const mongoose = require('mongoose');
const Order = require('./order.model');
const Product = require('../products/product.model');
const ShippingZone = require('../shipping/shippingZone.model');

// دالة إرسال إشعار واتساب تلقائي للأدمن عند استلام طلب جديد (باستخدام CallMeBot)
const sendWhatsAppNotification = async (order) => {
    try {
        const apikey = process.env.CALLMEBOT_API_KEY;
        const phone = process.env.WHATSAPP_NUMBER || '218910000000';
        
        if (!apikey) {
            console.log('ℹ️ [WhatsApp Notification]: تم تخطي إرسال إشعار واتساب لعدم توفر مفتاح البيئة CALLMEBOT_API_KEY');
            return;
        }
        
        const itemsList = order.items.map(item => `- ${item.name} (${item.quantity})`).join('\n');
        
        const text = `🛍️ *طلب جديد في متجر Smile Shop!*\n` +
                     `━━━━━━━━━━━━━━━━━━━━\n` +
                     `📦 *رقم الطلب:* #${order.orderNumber || order._id}\n` +
                     `👤 *العميل:* ${order.customerName}\n` +
                     `📞 *الهاتف:* ${order.customerPhone}\n` +
                     `📍 *العنوان:* ${order.city} - ${order.customerAddress}\n` +
                     `💰 *إجمالي السعر:* ${order.totalPrice} د.ل\n\n` +
                     `📋 *المنتجات المطلوبة:* \n${itemsList}\n` +
                     `━━━━━━━━━━━━━━━━━━━━\n` +
                     `يرجى مراجعة لوحة التحكم لتأكيد الطلب.`;
        
        const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apikey)}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            const respText = await response.text();
            console.error(`[CallMeBot Error]: Status ${response.status} - ${respText}`);
        } else {
            console.log(`[WhatsApp Notification]: Sent successfully to admin for order #${order.orderNumber}`);
        }
    } catch (err) {
        console.error('[WhatsApp Notification Error]:', err.message);
    }
};

// دالة إرسال إشعار تليجرام تلقائي للأدمن عند استلام طلب جديد
const sendTelegramNotification = async (order) => {
    try {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        
        if (!token || !chatId) {
            console.log('ℹ️ [Telegram Notification]: تم تخطي إرسال إشعار تليجرام لعدم توفر TELEGRAM_BOT_TOKEN أو TELEGRAM_CHAT_ID');
            return;
        }
        
        const itemsList = order.items.map(item => `• <b>${item.name}</b> (${item.quantity})`).join('\n');
        
        const text = `🛍️ <b>طلب جديد في متجر Smile Shop!</b>\n` +
                     `━━━━━━━━━━━━━━━━━━━━\n` +
                     `📦 <b>رقم الطلب:</b> #${order.orderNumber || order._id}\n` +
                     `👤 <b>العميل:</b> ${order.customerName}\n` +
                     `📞 <b>الهاتف:</b> ${order.customerPhone}\n` +
                     `📍 <b>العنوان:</b> ${order.city} - ${order.customerAddress}\n` +
                     `💰 <b>إجمالي السعر:</b> ${order.totalPrice} د.ل\n\n` +
                     `📋 <b>المنتجات المطلوبة:</b>\n${itemsList}\n` +
                     `━━━━━━━━━━━━━━━━━━━━\n` +
                     `<i>يرجى مراجعة لوحة التحكم لتأكيد الطلب.</i>`;
        
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML'
            })
        });
        
        if (!response.ok) {
            const respText = await response.text();
            console.error(`[Telegram Error]: Status ${response.status} - ${respText}`);
        } else {
            console.log(`[Telegram Notification]: Sent successfully to admin for order #${order.orderNumber}`);
        }
    } catch (err) {
        console.error('[Telegram Notification Error]:', err.message);
    }
};

// دالة إرسال إشعار تليجرام عند قرب نفاد المخزون (3 قطع أو أقل)
const sendTelegramLowStockAlert = async (productName, remainingStock) => {
    try {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        
        if (!token || !chatId) {
            console.log('ℹ️ [Telegram Low Stock Alert]: تم تخطي إرسال إشعار تليجرام لعدم توفر TELEGRAM_BOT_TOKEN أو TELEGRAM_CHAT_ID');
            return;
        }
        
        const text = `⚠️ <b>تنبيه مخزون منخفض! 📉</b>\n` +
                     `━━━━━━━━━━━━━━━━━━━━\n` +
                     `📦 <b>المنتج:</b> ${productName}\n` +
                     `📉 <b>المخزون المتبقي:</b> ${remainingStock} قطع فقط!\n` +
                     `━━━━━━━━━━━━━━━━━━━━\n` +
                     `<i>يرجى مراجعة وتجديد المخزون لتفادي نفاده بالكامل.</i>`;
        
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML'
            })
        });
        
        if (!response.ok) {
            const respText = await response.text();
            console.error(`[Telegram Low Stock Error]: Status ${response.status} - ${respText}`);
        } else {
            console.log(`[Telegram Low Stock Alert]: Sent alert successfully for ${productName} (${remainingStock} left)`);
        }
    } catch (err) {
        console.error('[Telegram Low Stock Alert Error]:', err.message);
    }
};

// دالة احتساب السعر الفعلي للمنتج بناءً على العروض النشطة
const getActivePrice = (product) => {
    if (product.salePrice !== undefined && product.salePrice !== null && product.discountEndsAt && new Date(product.discountEndsAt) > new Date()) {
        return product.salePrice;
    }
    return product.price;
};

const rollbackStock = async (deductedProducts) => {
    for (const item of deductedProducts) {
        await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } }).catch(e => {
            console.error(`[CRITICAL] Failed to rollback stock for product ${item.productId}:`, e);
        });
    }
};

let transactionsSupported = true;

const createOrder = async (req, res) => {
    const { items, customerName, customerPhone, customerAddress, city, notes } = req.body;
    let shippingPrice = 0;

    if (city && city.trim()) {
        try {
            const zone = await ShippingZone.findOne({ city: city.trim() });
            if (zone) shippingPrice = zone.price;
        } catch (e) {
            console.warn('Failed to fetch shipping price:', e);
        }
    }

    // دالة داخلية تقوم بتنفيذ عملية الخصم وإنشاء الطلب بالكامل
    // معامل useTx يحدد ما إذا كنا سنستخدم MongoDB Session & Transaction أم لا
    const executeOrderCreation = async (useTx) => {
        let session = null;
        if (useTx) {
            session = await mongoose.startSession();
            session.startTransaction();
        }
        
        const deductedProducts = [];
        const lowStockAlerts = [];
        try {
            let totalPrice = 0;
            for (const item of items) {
                // الخصم الذري الفردي للمخزون
                const updatedProduct = await Product.findOneAndUpdate(
                    { _id: item.productId, stock: { $gte: item.quantity } },
                    { $inc: { stock: -item.quantity } },
                    useTx ? { new: true, session } : { new: true }
                );

                if (!updatedProduct) {
                    if (useTx) {
                        await session.abortTransaction();
                        session.endSession();
                    } else {
                        await rollbackStock(deductedProducts);
                    }
                    const exists = await Product.exists({ _id: item.productId });
                    if (!exists) {
                        return { status: 404, message: 'المنتج غير موجود' };
                    }
                    return { status: 400, message: 'عذراً، الكمية المطلوبة من بعض المنتجات غير متوفرة حالياً' };
                }

                const activePrice = getActivePrice(updatedProduct);
                totalPrice += activePrice * item.quantity;
                deductedProducts.push({
                    productId: item.productId,
                    name: updatedProduct.name,
                    price: activePrice,
                    quantity: item.quantity,
                    imageUrl: updatedProduct.imageUrl
                });

                // تجميع تنبيهات المخزون المنخفض
                if (updatedProduct.stock <= 3) {
                    lowStockAlerts.push({
                        name: updatedProduct.name,
                        stock: updatedProduct.stock
                    });
                }
            }

            // توليد رقم طلب عشوائي فريد من 6 أرقام
            let orderNumber;
            let attempts = 0;
            const MAX_ATTEMPTS = 20;
            do {
                if (++attempts > MAX_ATTEMPTS) {
                    throw new Error('فشل توليد رقم طلب فريد، يرجى المحاولة مرة أخرى');
                }
                orderNumber = Math.floor(100000 + Math.random() * 900000).toString();
            } while (await Order.exists({ orderNumber }).session(useTx ? session : null));

            const order = new Order({ 
                orderNumber,
                items: deductedProducts, 
                customerName, customerPhone, customerAddress, city: city || '', 
                shippingPrice,
                notes, 
                totalPrice: totalPrice + shippingPrice
            });
            
            await order.save(useTx ? { session } : undefined);
            
            if (useTx) {
                await session.commitTransaction();
                session.endSession();
            }
            return { success: true, order, lowStockAlerts };
        } catch (err) {
            if (useTx) {
                try { await session.abortTransaction(); } catch (e) {}
                session.endSession();
            } else {
                await rollbackStock(deductedProducts);
            }
            throw err;
        }
    };

    try {
        let result;
        if (transactionsSupported) {
            try {
                result = await executeOrderCreation(true);
            } catch (err) {
                const errMsg = err.message || '';
                // [توثيق أمني وهيكلي]: 
                // معاملات MongoDB (Transactions) تتطلب وجود Replica Set أو Sharded Cluster.
                // في بيئات التطوير المحلية، غالباً ما يعمل المطورون بنسخة MongoDB منفردة (Standalone)
                // والتي لا تدعم المعاملات وتطلق خطأ يحتوي على "Transaction numbers are only allowed on a replica set member" أو الرمز 20.
                // لذا نقوم بالتقاط هذا الخطأ بالذات وتعيين transactionsSupported لـ false لعدم المحاولة مجدداً،
                // والرجوع التلقائي (Fallback) للآلية السابقة (Loop-with-Rollback) لضمان عمل المتجر محلياً ولدى المطورين.
                if (errMsg.includes('Transaction numbers are only allowed') || 
                    errMsg.includes('replica set') || 
                    errMsg.includes('retryable writes') || 
                    err.codeName === 'IllegalOperation' ||
                    (err.name === 'MongoServerError' && err.code === 20)) {
                    console.warn('⚠️ [MongoDB Transactions Fallback]: Standalone MongoDB detected (no replica set support). Falling back to sequential atomic loops with manual rollbacks.');
                    transactionsSupported = false;
                    result = await executeOrderCreation(false);
                } else {
                    throw err;
                }
            }
        } else {
            result = await executeOrderCreation(false);
        }

        if (result.success) {
            // إرسال إشعارات تلقائية للأدمن بالخلفية دون تأخير الاستجابة للمستخدم
            const notifications = [
                sendWhatsAppNotification(result.order),
                sendTelegramNotification(result.order)
            ];

            if (result.lowStockAlerts && result.lowStockAlerts.length > 0) {
                result.lowStockAlerts.forEach(alert => {
                    notifications.push(sendTelegramLowStockAlert(alert.name, alert.stock));
                });
            }

            Promise.all(notifications).catch(err => {
                console.error('[Notifications Background Error]:', err.message);
            });
            return res.status(201).json({ success: true, order: result.order, message: 'تم إرسال طلبك بنجاح! سنتواصل معك قريباً.' });
        } else {
            return res.status(result.status).json({ message: result.message });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const checkNewOrders = async (req, res) => {
    try {
        const { lastCheck } = req.query;
        if (!lastCheck) return res.json({ newOrders: 0 });
        const date = new Date(parseInt(lastCheck));
        const newOrders = await Order.countDocuments({ createdAt: { $gt: date } });
        res.json({ newOrders });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const exportOrders = async (req, res) => {
    try {
        const { status, from, to } = req.query;
        const query = {};

        if (status && status !== 'all') query.status = status;
        if (from || to) {
            query.createdAt = {};
            if (from) query.createdAt.$gte = new Date(from);
            if (to)   query.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
        }

        res.header('Content-Type', 'text/csv; charset=utf-8');
        res.attachment(`orders_${new Date().toISOString().slice(0,10)}.csv`);
        
        // Write BOM and headers directly to the response stream
        res.write('\uFEFFرقم الطلب,العميل,رقم الهاتف,العنوان,إجمالي السعر,الحالة,تاريخ الطلب,المنتجات\n');

        const BATCH = 500;
        let skip = 0;

        while (true) {
            const orders = await Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(BATCH).lean();
            if (!orders.length) break;

            let chunk = '';
            orders.forEach(o => {
                const date = new Date(o.createdAt).toLocaleDateString('en-US');
                const name    = `"${(o.customerName    || '').replace(/"/g, '""').replace(/\r?\n|\r/g, ' ')}"`;
                const phone   = `"${(o.customerPhone   || '').replace(/"/g, '""').replace(/\r?\n|\r/g, ' ')}"`;
                const address = `"${(o.customerAddress || '').replace(/"/g, '""').replace(/\r?\n|\r/g, ' ')}"`;
                const itemsStr = o.items.map(i => `${i.name} (${i.quantity})`).join(' - ');
                const items    = `"${itemsStr.replace(/"/g, '""').replace(/\r?\n|\r/g, ' ')}"`;
                chunk += `"${o.orderNumber || o._id}",${name},${phone},${address},${o.totalPrice},${o.status},${date},${items}\n`;
            });
            
            res.write(chunk);

            skip += BATCH;
            if (orders.length < BATCH) break;
        }

        return res.end();
    } catch (err) {
        if (!res.headersSent) {
            res.status(500).json({ message: err.message });
        } else {
            res.end(); // End stream if headers already sent
        }
    }
};

const trackOrders = async (req, res) => {
    try {
        const { phone, orderId } = req.query;
        if (!phone || phone.trim().length < 7 || !orderId) {
            return res.status(400).json({ message: 'يرجى إدخال رقم هاتف صالح ورقم الطلب' });
        }
        
        const trimmedOrderId = orderId.trim();
        const query = { customerPhone: phone.trim() };
        if (mongoose.isValidObjectId(trimmedOrderId)) {
            query._id = trimmedOrderId;
        } else {
            query.orderNumber = trimmedOrderId;
        }
        
        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .select('-__v')
            .lean();
            
        if (!orders.length) {
            return res.status(404).json({ message: 'لم يتم العثور على طلب بهذا الرقم المرتبط برقم الهاتف المذكور' });
        }
        
        res.json({ orders });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'رقم الطلب غير صالح' });
        }
        res.status(500).json({ message: err.message });
    }
};

const getOrders = async (req, res) => {
    try {
        const { page = 1, limit = 15, status } = req.query;
        const query = {};
        if (status && status !== 'all') query.status = status;

        const pageNum = parseInt(page) || 1;
        const limitNum = Math.min(parseInt(limit) || 15, 100);
        const skip = (pageNum - 1) * limitNum;

        const [orders, totalItems] = await Promise.all([
            Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
            Order.countDocuments(query)
        ]);

        res.json({
            data: orders,
            pagination: {
                currentPage: pageNum,
                totalPages: Math.ceil(totalItems / limitNum),
                totalItems,
                limit: limitNum
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const updateOrderStatus = async (req, res) => {
    const VALID_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    const REFUNDABLE     = ['pending', 'processing'];
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
        return res.status(400).json({
            message: `حالة غير صالحة. القيم المسموحة: ${VALID_STATUSES.join(', ')}`
        });
    }

    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'الطلب غير موجود' });

        const previousStatus = order.status;
        order.status = status;
        await order.save();

        // استرجاع المخزون عند إلغاء طلب لم يُشحن أو يُسلَّم بعد
        if (status === 'cancelled' && previousStatus !== 'cancelled' && REFUNDABLE.includes(previousStatus)) {
            for (const item of order.items) {
                await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } }).catch(e => {
                    console.error(`[WARN] Failed to refund stock for product ${item.productId}:`, e);
                });
            }
        }

        res.json({ success: true, order });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

const deleteOrder = async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);
        if (!order) return res.status(404).json({ message: 'الطلب غير موجود' });

        if (order.status === 'pending' || order.status === 'processing') {
            for (const item of order.items) {
                await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } }).catch(e => {
                    console.error(`[WARN] Failed to refund stock for product ${item.productId}:`, e);
                });
            }
        }

        res.json({ success: true, message: 'تم حذف الطلب وإرجاع المخزون (إن لزم الأمر)' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    createOrder,
    checkNewOrders,
    exportOrders,
    trackOrders,
    getOrders,
    updateOrderStatus,
    deleteOrder
};
