const Product = require('../products/product.model');

const getSitemap = async (req, res) => {
    try {
        const products = await Product.find({ stock: { $gt: 0 } }).select('_id updatedAt').lean();
        const clientUrl = process.env.CLIENT_URL || `http://${req.headers.host}`;
        
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${clientUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${clientUrl}/track.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`;

        products.forEach(p => {
            const dateStr = p.updatedAt ? p.updatedAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            xml += `
  <url>
    <loc>${clientUrl}/?product=${p._id}</loc>
    <lastmod>${dateStr}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
        });

        xml += `
</urlset>`;
        
        res.header('Content-Type', 'application/xml; charset=utf-8');
        res.send(xml);
    } catch (err) {
        console.error('Error generating sitemap:', err);
        res.status(500).send('Error generating sitemap');
    }
};

module.exports = { getSitemap };
