const { test } = require('node:test');
const assert = require('node:assert');
const { escapeHTML, sanitizeObject } = require('../src/core/middleware/validate');

test('escapeHTML escapes HTML tags and special characters', () => {
    assert.strictEqual(escapeHTML('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
    assert.strictEqual(escapeHTML('John\'s "Product" & Co'), 'John&#39;s &quot;Product&quot; &amp; Co');
    assert.strictEqual(escapeHTML(123), 123);
    assert.strictEqual(escapeHTML(null), null);
});

test('sanitizeObject recursively sanitizes string properties', () => {
    const obj = {
        name: '<b>Phone</b>',
        details: {
            brand: 'Apple & Samsung',
            rating: 5
        },
        tags: ['sale', '<i>hot</i>']
    };

    sanitizeObject(obj);

    assert.strictEqual(obj.name, '&lt;b&gt;Phone&lt;/b&gt;');
    assert.strictEqual(obj.details.brand, 'Apple &amp; Samsung');
    assert.strictEqual(obj.details.rating, 5);
    assert.strictEqual(obj.tags[0], 'sale');
    assert.strictEqual(obj.tags[1], '&lt;i&gt;hot&lt;/i&gt;');
});
