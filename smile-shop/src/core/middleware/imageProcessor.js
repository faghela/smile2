const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../../public/uploads');

const processImage = async (req, res, next) => {
    try {
        if (!req.file) {
            return next();
        }
        
        // التحقق الإضافي من نوع الملف للتأكد من أنه صورة
        const isImage = /jpeg|jpg|png|webp|gif/.test(req.file.mimetype) || 
                        /jpeg|jpg|png|webp|gif/.test(path.extname(req.file.originalname).toLowerCase());
        
        if (!isImage) {
            return res.status(400).json({ message: 'الملف المرفوع ليس صورة صالحة' });
        }

        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = `${uniqueSuffix}.webp`;
        const outputPath = path.join(uploadDir, filename);

        // التأكد من وجود مجلد الرفع
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // معالجة وضغط الصورة باستخدام Sharp
        await sharp(req.file.buffer)
            .resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(outputPath);

        // إرفاق بيانات الملف المعالج بالطلب
        req.processedFile = {
            filename: filename,
            path: outputPath
        };
        
        next();
    } catch (err) {
        console.error('[IMAGE PROCESSOR ERROR]:', err.message);
        res.status(400).json({ message: 'فشل ضغط ومعالجة الصورة، يرجى التأكد من صلاحية الملف المرفوع.' });
    }
};

module.exports = { processImage };
