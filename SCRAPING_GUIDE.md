git add .
# E-Commerce Scraping Guide

## Overview

INTELOPS now supports intelligent scraping of major e-commerce platforms including:

- **Amazon** (amazon.com, amazon.in, amazon.co.uk, amazon.de)
- **Flipkart** (flipkart.com)
- **Walmart** (walmart.com)  
- **eBay** (ebay.com, ebay.in, ebay.co.uk)
- **Generic e-commerce sites** (automatic pattern detection)

## Features

### 1. **Product Listing Pages**
Scrape multiple products at once from category/search pages:
- Amazon search results: `https://www.amazon.com/s?k=laptop`
- Flipkart category: `https://www.flipkart.com/search?q=mobile`

### 2. **Individual Product Pages**
Scrape single product details:
- Amazon product: `https://www.amazon.com/dp/B08N5WRWNW`
- Flipkart product: `https://www.flipkart.com/product/p/itmxxxx`

### 3. **Automatic Detection**
- Platform auto-detection (Amazon, Flipkart, etc.)
- Smart selector switching based on platform
- Fallback to generic selectors for unknown sites

### 4. **Data Extracted**
- Product Name
- Price (supports $, €, ₹, £)
- Product URL  
- Image URL
- Description (when available)
- Category (when available)

## API Endpoints

### Test Scraper
**POST** `/api/v1/scraper/test-scrape`

Test a URL before adding it as a competitor.

```json
{
  "url": "https://www.amazon.com/s?k=laptop",
  "max_products": 20
}
```

**Response:**
```json
{
  "success": true,
  "platform": "Amazon",
  "is_listing": true,
  "products_found": 20,
  "products": [
    {
      "name": "Dell Inspiron 15 Laptop",
      "price": 599.99,
      "url": "https://www.amazon.com/dp/B08...",
      "image": "https://m.media-amazon.com/..."
    }
  ]
}
```

### Get Supported Platforms
**GET** `/api/v1/scraper/supported-platforms`

Returns list of all supported platforms with example URLs.

## Usage Guide

### Adding Amazon Competitor

1. **Product Page:**
   ```
   URL: https://www.amazon.com/dp/B08N5WRWNW
   Type: Single Product
   Result: 1 product with full details
   ```

2. **Search/Listing Page:**
   ```
   URL: https://www.amazon.com/s?k=wireless+headphones
   Type: Product Listing  
   Result: Up to 20 products from search results
   ```

### Adding Flipkart Competitor

1. **Category Page:**
   ```
   URL: https://www.flipkart.com/search?q=laptop
   Type: Product Listing
   Result: Multiple products from category
   ```

2. **Product Page:**
   ```
   URL: https://www.flipkart.com/product/p/itmfxxx
   Type: Single Product
   Result: 1 product with details
   ```

## Best Practices

### ✅ DO:
- Use specific product pages for focused tracking
- Use category/search pages to discover multiple products
- Test URLs using `/scraper/test-scrape` before adding
- Use search pages with specific keywords
- Add competitors from the same product category

### ❌ DON'T:
- Add homepage URLs (e.g., `amazon.com`)
- Use generic category pages without filters
- Expect all products from large search results
- Add URLs requiring login/authentication

## Technical Details

### User Agents
The scraper rotates between multiple realistic browser user agents to avoid detection:
- Chrome on Windows/Mac
- Firefox latest
- Safari latest

### Headers
Proper headers are sent with each request:
- Accept-Language: en-US
- Accept-Encoding: gzip, deflate, br
- DNT: 1 (Do Not Track)

### Rate Limiting
- Respects robots.txt (when possible)
- 30-second timeout per request
- Follows redirects automatically

### SSL Verification
Disabled by default in development to handle certificate issues.

## Troubleshooting

### "Failed to fetch HTML"
- **Cause:** Network issue, blocked by website, invalid URL
- **Solution:** 
  - Verify URL is accessible in browser
  - Check if page requires login (not supported)
  - Try different URL format

### "No products found"
- **Cause:** Page structure changed, JavaScript-only content
- **Solution:**
  - Try direct product URL instead of listing
  - Check if page loads properly in browser
  - Contact support to add new selectors

### "Platform: Unknown"  
- **Cause:** Website not in supported platforms list
- **Solution:**
  - Generic scraping will be attempted
  - Results may vary
  - Consider requesting platform support

## Future Enhancements

Coming soon:
- JavaScript rendering (Selenium/Playwright)
- Pagination support for listings
- Image scraping and storage
- Review/rating extraction
- Stock availability tracking
- Dynamic price alerts

## Example Workflow

1. **Test URL:**
   ```bash
   POST /api/v1/scraper/test-scrape
   { "url": "https://amazon.com/s?k=laptop" }
   ```

2. **Review Results:**
   - Platform: Amazon ✓
   - Products: 20 found ✓
   - Prices extracted: Yes ✓

3. **Add Competitor:**
   ```bash
   POST /api/v1/competitors/
   {
     "name": "Amazon Laptops",
     "domain_url": "https://amazon.com/s?k=laptop",
     "business_id": 1
   }
   ```

4. **Trigger Scrape:**
   - Automatic via Celery every 24h
   - Manual via competitors page
   - Webhook triggers (coming soon)

5. **View Results:**
   - Intelligence Hub → Alerts
   - Competitors Page → Product List
   - Product Insights → Price Comparison

## Support

For issues or feature requests:
- Check `/api/v1/scraper/supported-platforms` for platform status
- Use `/api/v1/scraper/test-scrape` to debug URLs
- Review logs in Intelligence Hub
