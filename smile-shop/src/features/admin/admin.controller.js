const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Product = require('../products/product.model');
const Order = require('../orders/order.model');
const Admin = require('./admin.model');

const JWT_SECRET      = process.env.JWT_SECRET;
const ADMIN_USERNAME  = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD  = process.env.ADMIN_PASSWORD;

const seedDefaultAdmin = async () => {
    try {
        const count = await Admin.countDocuments();
        if (count === 0) {
            const username = ADMIN_USERNAME || 'admin';
            const password = ADMIN_PASSWORD || 'admin123';
            let hashedPassword;
            if (password.startsWith('$2')) {
                hashedPassword = password;
            } else {
                hashedPassword = await bcrypt.hash(password, 10);
            }
            await Admin.create({
                username,
                password: hashedPassword,
                role: 'owner'
            });
            console.log('✅ Default owner admin seeded successfully');
        }
    } catch (err) {
        console.error('❌ Failed to seed default admin:', err.message);
    }
};

const login = async (req, res) => {
    const { username, password } = req.body;
    try {
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'الرجاء إدخال اسم المستخدم وكلمة المرور' });
        }
        const admin = await Admin.findOne({ username: username.trim() });
        if (!admin) {
            return res.status(401).json({ success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
        }
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
        }
        const token = jwt.sign({ id: admin._id, username: admin.username, role: admin.role }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, token, role: admin.role, message: 'تم تسجيل الدخول بنجاح' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const getAdmins = async (req, res) => {
    try {
        const admins = await Admin.find().select('-password').sort({ createdAt: -1 });
        res.json(admins);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const createAdmin = async (req, res) => {
    try {
        const { username, password, role } = req.body;
        if (!username || username.trim().length < 3) {
            return res.status(400).json({ message: 'اسم المستخدم يجب أن يكون 3 حروف على الأقل' });
        }
        if (!password || password.trim().length < 6) {
            return res.status(400).json({ message: 'كلمة المرور يجب أن تكون 6 رموز على الأقل' });
        }
        const existing = await Admin.findOne({ username: username.trim() });
        if (existing) {
            return res.status(400).json({ message: 'اسم المستخدم هذا مستخدم بالفعل' });
        }
        const hashedPassword = await bcrypt.hash(password.trim(), 10);
        const admin = await Admin.create({
            username: username.trim(),
            password: hashedPassword,
            role: role || 'editor'
        });
        const result = admin.toObject();
        delete result.password;
        res.status(201).json(result);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

const updateAdmin = async (req, res) => {
    try {
        const { username, password, role } = req.body;
        const admin = await Admin.findById(req.params.id);
        if (!admin) {
            return res.status(404).json({ message: 'المشرف غير موجود' });
        }
        
        if (admin.role === 'owner' && role === 'editor') {
            const ownersCount = await Admin.countDocuments({ role: 'owner' });
            if (ownersCount <= 1) {
                return res.status(400).json({ message: 'لا يمكن تحويل حساب المالك الوحيد إلى محرر' });
            }
        }

        if (username && username.trim() !== admin.username) {
            const existing = await Admin.findOne({ username: username.trim() });
            if (existing) {
                return res.status(400).json({ message: 'اسم المستخدم هذا مستخدم بالفعل' });
            }
            admin.username = username.trim();
        }

        if (password && password.trim().length >= 6) {
            admin.password = await bcrypt.hash(password.trim(), 10);
        }

        if (role) {
            admin.role = role;
        }

        await admin.save();
        const result = admin.toObject();
        delete result.password;
        res.json(result);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

const deleteAdmin = async (req, res) => {
    try {
        const admin = await Admin.findById(req.params.id);
        if (!admin) {
            return res.status(404).json({ message: 'المشرف غير موجود' });
        }
        if (admin.role === 'owner') {
            const ownersCount = await Admin.countDocuments({ role: 'owner' });
            if (ownersCount <= 1) {
                return res.status(400).json({ message: 'لا يمكن حذف حساب المالك الوحيد للمتجر' });
            }
        }
        if (admin._id.toString() === req.admin.id) {
            return res.status(400).json({ message: 'لا يمكنك حذف حسابك الحالي بنفسك' });
        }

        await Admin.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: `تم حذف المشرف "${admin.username}" بنجاح` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const getStats = async (req, res) => {
    try {
        const [totalProducts, orderStats, dailyStats] = await Promise.all([
            Product.countDocuments(),
            Order.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        revenue: { 
                            $sum: { 
                                $cond: [{ $ne: ['$status', 'cancelled'] }, '$totalPrice', 0] 
                            } 
                        }
                    }
                }
            ]),
            Order.aggregate([
                {
                    $match: {
                        createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 6)) },
                        status: { $ne: 'cancelled' }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: { date: '$createdAt', timezone: 'Africa/Tripoli' } },
                            month: { $month: { date: '$createdAt', timezone: 'Africa/Tripoli' } },
                            day: { $dayOfMonth: { date: '$createdAt', timezone: 'Africa/Tripoli' } }
                        },
                        revenue: { $sum: '$totalPrice' }
                    }
                }
            ])
        ]);

        let totalOrders = 0;
        let totalRevenue = 0;
        let pendingOrders = 0;

        orderStats.forEach(stat => {
            totalOrders += stat.count;
            totalRevenue += stat.revenue;
            if (stat._id === 'pending') pendingOrders = stat.count;
        });

        const tz = 'Africa/Tripoli';
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const label = d.toLocaleDateString('ar-LY', { weekday: 'short', month: 'short', day: 'numeric', numberingSystem: 'latn', timeZone: tz });
            
            const year = parseInt(d.toLocaleDateString('en-US', { year: 'numeric', timeZone: tz }));
            const month = parseInt(d.toLocaleDateString('en-US', { month: 'numeric', timeZone: tz }));
            const day = parseInt(d.toLocaleDateString('en-US', { day: 'numeric', timeZone: tz }));
            
            const dayData = dailyStats.find(s => s._id.year === year && s._id.month === month && s._id.day === day);
            last7Days.push({ label, revenue: dayData ? dayData.revenue : 0 });
        }

        res.json({ totalProducts, totalOrders, totalRevenue, pendingOrders, last7Days });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const getTopProducts = async (req, res) => {
    try {
        const results = await Order.aggregate([
            { $match: { status: { $ne: 'cancelled' } } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.productId',
                    name: { $first: '$items.name' },
                    imageUrl: { $first: '$items.imageUrl' },
                    totalQty: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
                }
            },
            { $sort: { totalQty: -1 } },
            { $limit: 5 }
        ]);
        res.json(results);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const getMonthlyStats = async (req, res) => {
    try {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const results = await Order.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo }, status: { $ne: 'cancelled' } } },
            {
                $group: {
                    _id: { 
                        year: { $year: { date: '$createdAt', timezone: 'Africa/Tripoli' } }, 
                        month: { $month: { date: '$createdAt', timezone: 'Africa/Tripoli' } } 
                    },
                    revenue: { $sum: '$totalPrice' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
        const formatted = results.map(r => ({
            label: `${months[r._id.month - 1]} ${r._id.year}`,
            revenue: r.revenue,
            count: r.count
        }));

        res.json(formatted);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    login,
    getStats,
    getTopProducts,
    getMonthlyStats,
    seedDefaultAdmin,
    getAdmins,
    createAdmin,
    updateAdmin,
    deleteAdmin
};
