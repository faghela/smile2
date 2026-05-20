const Order = require('./order.model');
const Product = require('../products/product.model');
const ShippingZone = require('../shipping/shippingZone.model');

const createOrder = async (req, res) => {
    const { items, customerName, customerPhone, customerAddress, city, notes } = req.body;
    let totalPrice = 0;
    let shippingPrice = 0;
    const itemsToUpdate = [];

    if (city && city.trim()) {
        const zone = await ShippingZone.findOne({ city: city.trim() });
        if (zone) shippingPrice = zone.price;
    }

    for (const item of items) {
        const product = await Product.findById(item.productId);
        if (!product)
            return res.status(404).json({ message: `المنتج "${item.name}" غير موجود` });
        if (product.stock < item.quantity)
            return res.status(400).json({
                message: `الكمية المطلوبة من "${product.name}" غير كافية. المتوفر: ${product.stock}`
            });
        
        totalPrice += product.price * item.quantity;
        itemsToUpdate.push({
            productId: item.productId,
            name: product.name,
            price: product.price,
            quantity: item.quantity,
            imageUrl: product.imageUrl
        });
    }

    const deductedProducts = [];
    try {
        for (const item of itemsToUpdate) {
            const updatedProduct = await Product.findOneAndUpdate(
                { _id: item.productId, stock: { $gte: item.quantity } },
                { $inc: { stock: -item.quantity } },
                { new: true }
            );

            if (!updatedProduct) {
                throw new Error(`لم نتمكن من حجز الكمية للمنتج "${item.name}" لتغير المخزون بشكل مفاجئ.`);
            }
            deductedProducts.push(item);
        }

        const order = new Order({ 
            items: itemsToUpdate, 
            customerName, customerPhone, customerAddress, city: city || '', 
            shippingPrice,
            notes, 
            totalPrice: totalPrice + shippingPrice
        });
        await order.save();
        
        res.status(201).json({ success: true, order, message: 'تم إرسال طلبك بنجاح! سنتواصل معك قريباً.' });

    } catch (err) {
        for (const item of deductedProducts) {
            await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } }).catch(e => {
                console.error(`[CRITICAL] Failed to rollback stock for product ${item.productId}:`, e);
            });
        }
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
                const date = new Date(o.createdAt).toLocaleDateString('ar-IQ');
                const name    = `"${(o.customerName    || '').replace(/"/g, '""')}"`;
                const phone   = `"${(o.customerPhone   || '').replace(/"/g, '""')}"`;
                const address = `"${(o.customerAddress || '').replace(/"/g, '""')}"`;
                const items   = `"${o.items.map(i => `${i.name} (${i.quantity})`).join(' - ')}"`;
                chunk += `"${o._id}",${name},${phone},${address},${o.totalPrice},${o.status},${date},${items}\n`;
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
        
        const query = { customerPhone: phone.trim(), _id: orderId.trim() };
        
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
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
        return res.status(400).json({
            message: `حالة غير صالحة. القيم المسموحة: ${VALID_STATUSES.join(', ')}`
        });
    }

    try {
        const order = await Order.findByIdAndUpdate(
            req.params.id, { status }, { new: true }
        );
        if (!order) return res.status(404).json({ message: 'الطلب غير موجود' });
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
