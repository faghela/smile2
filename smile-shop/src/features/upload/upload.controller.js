const uploadImage = (req, res) => {
    try {
        if (!req.processedFile) {
            return res.status(400).json({ message: 'الرجاء اختيار صورة لرفعها' });
        }
        
        const imageUrl = `/uploads/${req.processedFile.filename}`;
        res.status(201).json({ success: true, imageUrl, message: 'تم رفع الصورة بنجاح ومعالجتها' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { uploadImage };
