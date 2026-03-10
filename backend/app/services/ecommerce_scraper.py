"""
E-commerce Scraper Service
Specialized scraping for major e-commerce platforms like Amazon, Flipkart, etc.
"""
import re
from typing import List, Dict, Optional, Tuple
from urllib.parse import urlparse
from bs4 import BeautifulSoup
import httpx


class PlatformConfig:
    """Configuration for specific e-commerce platforms"""
    
    AMAZON = {
        "name": "Amazon",
        "domains": ["amazon.com", "amazon.in", "amazon.co.uk", "amazon.de"],
        "product_selectors": {
            "title": [
                "#productTitle",
                "h1.product-title",
                "#title",
            ],
            "price": [
                ".a-price .a-offscreen",
                "#priceblock_ourprice",
                "#priceblock_dealprice",
                ".a-price-whole",
                "span.priceToPay",
            ],
            "image": [
                "#landingImage",
                "#imgBlkFront",
                ".imgTagWrapper img",
            ],
            "description": [
                "#feature-bullets",
                "#productDescription",
            ],
        },
        "listing_selectors": {
            "products": [
                "div[data-component-type='s-search-result']",
                ".s-result-item",
            ],
            "title": [
                "h2 a span",
                ".a-size-medium.a-text-normal",
            ],
            "price": [
                ".a-price .a-offscreen",
                ".a-price-whole",
            ],
            "link": [
                "h2 a",
                ".a-link-normal",
            ],
        }
    }
    
    FLIPKART = {
        "name": "Flipkart",
        "domains": ["flipkart.com"],
        "product_selectors": {
            "title": [
                "span.B_NuCI",
                ".title",
                "h1 span",
            ],
            "price": [
                "._30jeq3._16Jk6d",
                "._25b18c div",
                "._30jeq3",
            ],
            "image": [
                "._396cs4 img",
                "._2r_T1I img",
            ],
            "description": [
                "._1mXcCf",
                "div._3eAQiD",
            ],
        },
        "listing_selectors": {
            "products": [
                "._1AtVbE",
                "._13oc-S",
            ],
            "title": [
                "._4rR01T",
                ".s1Q9rs",
            ],
            "price": [
                "._30jeq3",
                "._1_8RwH",
            ],
            "link": [
                "a._1fQZEK",
                "a",
            ],
        }
    }
    
    WALMART = {
        "name": "Walmart",
        "domains": ["walmart.com"],
        "product_selectors": {
            "title": [
                "h1[itemprop='name']",
                ".prod-ProductTitle",
            ],
            "price": [
                "span[itemprop='price']",
                ".price-characteristic",
            ],
            "image": [
                ".prod-hero-image img",
            ],
        }
    }
    
    EBAY = {
        "name": "eBay",
        "domains": ["ebay.com", "ebay.in", "ebay.co.uk"],
        "product_selectors": {
            "title": [
                "h1.x-item-title",
                ".it-ttl",
            ],
            "price": [
                ".x-price-primary",
                "#prcIsum",
            ],
            "image": [
                "#icImg",
            ],
        }
    }
    
    @classmethod
    def get_platform(cls, url: str) -> Optional[Dict]:
        """Identify platform from URL"""
        domain = urlparse(url).netloc.lower()
        
        for platform in [cls.AMAZON, cls.FLIPKART, cls.WALMART, cls.EBAY]:
            if any(d in domain for d in platform["domains"]):
                return platform
        
        return None


class EcommerceScraper:
    """Enhanced scraper for e-commerce platforms"""
    
    USER_AGENTS = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
    ]
    
    def __init__(self, url: str, user_agent: str = None):
        self.url = url
        self.platform = PlatformConfig.get_platform(url)
        self.user_agent = user_agent or self.USER_AGENTS[0]
    
    def fetch_html(self, verify_ssl: bool = False) -> Optional[str]:
        """Fetch HTML content with proper headers"""
        headers = {
            "User-Agent": self.user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        }
        
        try:
            response = httpx.get(
                self.url,
                headers=headers,
                timeout=30,
                verify=verify_ssl,
                follow_redirects=True,
            )
            response.raise_for_status()
            return response.text
        except Exception as e:
            print(f"Failed to fetch {self.url}: {e}")
            return None
    
    def extract_price(self, text: str) -> Optional[float]:
        """Extract price from text with multiple currency support"""
        if not text:
            return None
        
        # Remove common price symbols and whitespace
        text = text.strip()
        
        # Try to find price patterns
        patterns = [
            r"[\$€₹£]\s*([0-9]{1,3}(?:[,\s][0-9]{3})*(?:\.[0-9]{2})?)",  # $1,234.56
            r"([0-9]{1,3}(?:[,\s][0-9]{3})*(?:\.[0-9]{2})?)\s*[\$€₹£]",  # 1,234.56$
            r"([0-9]{1,3}(?:[,\s][0-9]{3})*(?:\.[0-9]{2})?)",  # 1,234.56
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                price_str = match.group(1).replace(",", "").replace(" ", "")
                try:
                    return float(price_str)
                except ValueError:
                    continue
        
        return None
    
    def extract_from_element(self, soup: BeautifulSoup, selectors: List[str]) -> Optional[str]:
        """Try multiple selectors and return first match"""
        for selector in selectors:
            try:
                element = soup.select_one(selector)
                if element:
                    text = element.get_text(strip=True)
                    if text:
                        return text
            except Exception:
                continue
        return None
    
    def extract_product(self, html: str) -> Dict[str, any]:
        """Extract product information from HTML"""
        soup = BeautifulSoup(html, "html.parser")
        
        product_data = {
            "product_name": None,
            "price": None,
            "image_url": None,
            "description": None,
            "category": None,
            "url": self.url,
        }
        
        # Platform-specific extraction
        if self.platform:
            selectors = self.platform["product_selectors"]
            
            # Extract title
            product_data["product_name"] = self.extract_from_element(
                soup, selectors.get("title", [])
            )
            
            # Extract price
            price_text = self.extract_from_element(
                soup, selectors.get("price", [])
            )
            if price_text:
                product_data["price"] = self.extract_price(price_text)
            
            # Extract image URL
            if "image" in selectors:
                for img_selector in selectors["image"]:
                    try:
                        img = soup.select_one(img_selector)
                        if img:
                            product_data["image_url"] = img.get("src") or img.get("data-src")
                            if product_data["image_url"]:
                                break
                    except Exception:
                        continue
            
            # Extract description
            product_data["description"] = self.extract_from_element(
                soup, selectors.get("description", [])
            )
        
        else:
            # Generic extraction for unknown platforms
            product_data["product_name"] = self.extract_from_element(
                soup, ["h1", ".product-title", "#product-title", ".title"]
            )
            
            price_text = self.extract_from_element(
                soup, [".price", ".product-price", "[class*=price]", "[id*=price]"]
            )
            if price_text:
                product_data["price"] = self.extract_price(price_text)
        
        return product_data
    
    def extract_product_listing(self, html: str, max_products: int = 20) -> List[Dict[str, any]]:
        """Extract multiple products from a listing/search page"""
        soup = BeautifulSoup(html, "html.parser")
        products = []
        
        if not self.platform or "listing_selectors" not in self.platform:
            # Try to identify if this is a listing page
            product_data = self.extract_product(html)
            if product_data["product_name"]:
                return [product_data]
            return []
        
        selectors = self.platform["listing_selectors"]
        
        # Find all product containers
        product_containers = []
        for container_selector in selectors.get("products", []):
            try:
                containers = soup.select(container_selector)
                if containers:
                    product_containers = containers
                    break
            except Exception:
                continue
        
        if not product_containers:
            # Fallback to single product extraction
            product_data = self.extract_product(html)
            if product_data["product_name"]:
                return [product_data]
            return []
        
        # Extract data from each container
        for container in product_containers[:max_products]:
            try:
                product = {
                    "product_name": None,
                    "price": None,
                    "url": None,
                    "image_url": None,
                }
                
                # Extract title
                product["product_name"] = self.extract_from_element(
                    container, selectors.get("title", [])
                )
                
                # Extract price
                price_text = self.extract_from_element(
                    container, selectors.get("price", [])
                )
                if price_text:
                    product["price"] = self.extract_price(price_text)
                
                # Extract product URL
                for link_selector in selectors.get("link", []):
                    try:
                        link = container.select_one(link_selector)
                        if link and link.get("href"):
                            href = link.get("href")
                            # Make absolute URL
                            if href.startswith("/"):
                                parsed = urlparse(self.url)
                                product["url"] = f"{parsed.scheme}://{parsed.netloc}{href}"
                            elif not href.startswith("http"):
                                product["url"] = f"{self.url.rstrip('/')}/{href}"
                            else:
                                product["url"] = href
                            break
                    except Exception:
                        continue
                
                # Only add if we have at least a name
                if product["product_name"]:
                    products.append(product)
                    
            except Exception as e:
                print(f"Error extracting product from container: {e}")
                continue
        
        return products
    
    def scrape(self, verify_ssl: bool = False) -> Tuple[bool, Dict[str, any]]:
        """Main scrape method - returns (is_listing, data)"""
        html = self.fetch_html(verify_ssl)
        
        if not html:
            return False, {"error": "Failed to fetch HTML"}
        
        # Try extracting as product listing first
        products = self.extract_product_listing(html)
        
        if len(products) > 1:
            # This is a listing page
            return True, {
                "is_listing": True,
                "products": products,
                "total_found": len(products),
            }
        elif len(products) == 1:
            # Single product page
            return False, {
                "is_listing": False,
                **products[0]
            }
        else:
            # Fallback to single product extraction
            product_data = self.extract_product(html)
            return False, {
                "is_listing": False,
                **product_data
            }
