# Implementation Plan: Product-Centric Intelligence Platform v2.0

**Restore Point:** `v1.0-multi-page-dashboard` ✅  
**Target:** Complete product catalog, persona-based discovery, and AI-powered intelligence

---

## 📋 Module Breakdown & Implementation Order

### **PHASE 1: Foundation - Multi-Business Workspace Enhancement**
**Status:** Partially Complete (owner_id FK exists)  
**Remaining Work:**

#### Backend Tasks:
1. ✅ Business model already has `owner_id` (no change needed)
2. Update Business CRUD to filter by authenticated user
3. Add endpoint: `GET /api/v1/businesses/switch/{business_id}` for validation

#### Frontend Tasks:
1. Create React Context for `activeBusinessId` global state
2. Update sidebar business selector to trigger full data reload on switch
3. Add "Create New Workspace" button in Settings → redirects to `/onboarding`
4. Persist `activeBusinessId` in localStorage with user scope

**Files to Modify:**
- `frontend/src/contexts/BusinessContext.tsx` (new)
- `frontend/src/app/dashboard/layout.tsx` (integrate context)
- `frontend/src/app/dashboard/settings/page.tsx` (add button)
- `backend/app/api/endpoints/businesses.py` (add switch validation)

---

### **PHASE 2: Product Catalog Management**
**Status:** Not Started  
**Priority:** HIGH

#### Database Schema:
```python
class UserProduct(Base):
    __tablename__ = "user_products"
    
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    name = Column(String, nullable=False, index=True)
    sku = Column(String, unique=True, index=True)
    base_price = Column(Float)
    current_price = Column(Float)
    image_url = Column(String)
    url = Column(String)  # For self-scrape
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    business = relationship("Business", back_populates="products")
```

#### Backend Endpoints:
```
POST   /api/v1/products/                    # Create single product
GET    /api/v1/products/?business_id=X      # List products
PUT    /api/v1/products/{product_id}        # Update product
DELETE /api/v1/products/{product_id}        # Delete product
POST   /api/v1/products/bulk-upload         # CSV upload (FormData)
POST   /api/v1/products/self-scrape         # Trigger scrape of user's own site
```

#### Frontend UI Components:
1. **Products Tab in Settings Page:**
   - DataTable with columns: SKU, Name, Base Price, Current Price, Image, Actions
   - "Add Product" modal form
   - "Import CSV" button with file upload
   - "Scrape My Products" button → prompts for website URL, triggers scrape

2. **CSV Upload Format:**
   ```csv
   sku,name,base_price,current_price,url,image_url
   SKU001,Product A,100.00,95.00,https://...,https://...
   ```

**Files to Create:**
- `backend/app/models/user_product.py`
- `backend/app/schemas/user_product.py`
- `backend/app/crud/crud_user_product.py`
- `backend/app/api/endpoints/products.py`
- `backend/alembic/versions/XXXX_add_user_products_table.py`
- `frontend/src/app/dashboard/settings/components/ProductCatalog.tsx`

---

### **PHASE 3: Persona-Based Discovery Algorithm**
**Status:** Algorithm needs upgrade  
**Priority:** MEDIUM

#### Current State:
- `GET /competitors/discover/suggestions` uses basic business profile matching

#### Enhanced Logic:
```python
def get_persona_based_suggestions(business: Business, user_role: str):
    """
    Persona-based matching:
    - SELLER: Match by product URLs, SKU overlaps, price comparison
    - FOUNDER: Match by industry innovators, market leaders, business model
    """
    if user_role.lower() in ["seller", "operations", "manager"]:
        # Product-level matching
        competitors = match_by_product_overlap(business)
    elif user_role.lower() in ["founder", "growth"]:
        # Market-level matching
        competitors = match_by_market_innovation(business)
    
    # Apply market siloing
    competitors = filter_by_target_market(competitors, business.target_market_geo)
    
    return competitors
```

#### Implementation:
1. Update `competitor_discovery.py` with persona logic
2. Add `match_by_product_overlap()` → compares product URLs from catalog
3. Add `match_by_market_innovation()` → finds category leaders
4. Filter by `target_market_geo` (Local/Regional/Global)

**Files to Modify:**
- `backend/app/api/endpoints/competitors.py` (discovery endpoint)
- Create: `backend/app/services/persona_matcher.py`

---

### **PHASE 4: Product-Level Intelligence Engine**
**Status:** Not Started  
**Priority:** HIGH

#### Matching Algorithm:
```python
def fuzzy_match_products(user_product: UserProduct, competitor_data: CleanedData):
    """
    Match logic:
    1. Exact SKU match (if competitor has SKU)
    2. Fuzzy title match using difflib.SequenceMatcher (>80% similarity)
    3. Category + price range heuristic
    """
    score = 0
    if user_product.sku and user_product.sku == competitor_data.product_sku:
        score = 100
    else:
        title_similarity = SequenceMatcher(None, 
            normalize(user_product.name), 
            normalize(competitor_data.product_name)
        ).ratio()
        score = title_similarity * 100
    
    return score >= 80
```

#### Insight Generation:
```python
class ProfitInsight:
    PRICE_DROP_ALERT = "Competitor {name} undercut your {product} by {diff}%"
    PRICE_CEILING_OPPORTUNITY = "You're {diff}% cheaper than average. Consider raising price."
    MARKET_AVERAGE = "Your {product} is competitively priced vs market avg {avg_price}"
```

#### Celery Worker Task:
```python
@celery_app.task
def generate_product_insights(business_id: int):
    user_products = get_user_products(business_id)
    competitors = get_competitors(business_id)
    
    for product in user_products:
        competitor_matches = fuzzy_match_across_competitors(product, competitors)
        
        # Calculate insights
        avg_price = mean([m.price for m in competitor_matches])
        
        if product.current_price > avg_price * 1.1:
            create_alert("PRICE_DROP_ALERT", product, avg_price)
        elif product.current_price < avg_price * 0.9:
            create_insight("PRICE_CEILING_OPPORTUNITY", product, avg_price)
```

**Files to Create:**
- `backend/app/services/product_matcher.py`
- `backend/app/services/profit_insights.py`
- `backend/app/tasks.py` (add `generate_product_insights` task)
- Update: `backend/app/models/strategy_insight.py` (add product_id FK)

---

### **PHASE 5: Enhanced Scraping UX & Data Display**
**Status:** Not Started  
**Priority:** MEDIUM

#### Requirements:
1. **Last Scraped Time Display:**
   - Show timestamp in competitor table row
   - Format: "2 hours ago" or "Mar 10, 2026 3:45 PM"

2. **Detailed Scrape View (Click-through):**
   - Modal/Slide-over panel showing:
     - All products from last scrape
     - Price changes (previous → current with % diff)
     - Product images, descriptions
     - Scrape metadata (status, duration)

3. **Product Price Comparison Section:**
   - Replace "Change Diff" panel
   - New UI: Side-by-side product cards
   - User Product (left) vs Competitor Product (right)
   - Visual indicators: 🔴 Higher, 🟢 Lower, 🟡 Similar

#### Frontend Components:
```tsx
// Competitor row with last scraped time
<tr>
  <td>{competitor.name}</td>
  <td>{formatRelativeTime(competitor.last_scraped_at)}</td>
  <td>
    <button onClick={() => openScrapeDetails(competitor.id)}>
      View Details
    </button>
  </td>
</tr>

// Scrape details modal
<ScrapeDetailsModal>
  <ProductGrid>
    {products.map(p => (
      <ProductCard>
        <img src={p.image_url} />
        <h4>{p.name}</h4>
        <PriceChange previous={p.prev_price} current={p.price} />
      </ProductCard>
    ))}
  </ProductGrid>
</ScrapeDetailsModal>

// Product comparison section
<ComparisonSection>
  <div className="user-product">
    <h3>Your Product</h3>
    <ProductCard product={userProduct} />
  </div>
  <div className="vs-divider">VS</div>
  <div className="competitor-product">
    <h3>Competitor Average</h3>
    <ProductCard product={competitorAvg} showDiff />
  </div>
</ComparisonSection>
```

**Files to Modify:**
- `frontend/src/app/dashboard/competitors/page.tsx`
- Create: `frontend/src/app/dashboard/competitors/components/ScrapeDetailsModal.tsx`
- Create: `frontend/src/app/dashboard/competitors/components/ComparisonSection.tsx`

---

### **PHASE 6: AI-Powered Intelligence Hub**
**Status:** Not Started  
**Priority:** HIGH

#### Intelligence Generation:
```python
def generate_business_insights(business_id: int):
    """
    AI Strategy Generator:
    1. Analyze current vs previous scraped data
    2. Identify trends (price drops, new products, market shifts)
    3. Generate actionable recommendations
    """
    current_data = get_latest_scraped_data(business_id)
    previous_data = get_previous_scraped_data(business_id)
    
    insights = []
    
    # Trend 1: Competitor price movements
    if avg_competitor_price_dropped(current_data, previous_data):
        insights.append({
            "type": "MARKET_TREND",
            "title": "Market Prices Declining",
            "message": "3 competitors lowered prices by avg 8% in last week",
            "action": "Consider matching prices to maintain competitiveness"
        })
    
    # Trend 2: New competitor products
    new_products = detect_new_products(current_data, previous_data)
    if new_products:
        insights.append({
            "type": "PRODUCT_ALERT",
            "title": f"{len(new_products)} New Competitor Products",
            "message": "Your competitors expanded their catalog",
            "action": "Review new offerings for market gaps"
        })
    
    # Trend 3: Profit optimization
    underpriced = find_underpriced_products(business_id)
    if underpriced:
        total_profit = sum([p.potential_profit for p in underpriced])
        insights.append({
            "type": "PROFIT_OPPORTUNITY",
            "title": f"${total_profit:.2f} Potential Monthly Profit",
            "message": f"Raise prices on {len(underpriced)} products",
            "action": "Increase prices to market average"
        })
    
    return insights
```

#### UI Enhancements:
```tsx
// Intelligence Hub with AI insights
<IntelligenceHub>
  <InsightCard type="market_trend">
    <Icon name="trending-down" />
    <h3>Market Prices Declining</h3>
    <p>3 competitors lowered prices by avg 8% in last week</p>
    <ActionButton>Review Pricing Strategy</ActionButton>
  </InsightCard>
  
  <InsightCard type="profit_opportunity" highlight>
    <Icon name="dollar-sign" />
    <h3>$2,450 Potential Monthly Profit</h3>
    <p>Raise prices on 12 products to market average</p>
    <ActionButton primary>View Products</ActionButton>
  </InsightCard>
  
  <ComparisonChart>
    <TimeSeriesGraph 
      data={priceHistory} 
      lines={['Your Avg', 'Competitor Avg', 'Market Leader']}
    />
  </ComparisonChart>
</IntelligenceHub>
```

**Files to Create:**
- `backend/app/services/ai_insights_generator.py`
- `backend/app/tasks.py` (add `generate_ai_insights` periodic task)
- `frontend/src/app/dashboard/intelligence/components/InsightCard.tsx`
- `frontend/src/app/dashboard/intelligence/components/ComparisonChart.tsx`

---

## 🗂️ Database Migrations Required

1. **Migration 1:** `add_user_products_table.py`
   - Create `user_products` table
   - Add `products` relationship to Business model

2. **Migration 2:** `add_last_scraped_fields.py`
   - Add `last_scraped_at` to Competitor model
   - Add `scrape_status` enum field

3. **Migration 3:** `add_product_matching_fields.py`
   - Add `product_id` FK to StrategyInsight
   - Add `matched_user_product_id` FK to CleanedData
   - Add `previous_price` to CleanedData for historical tracking

---

## 🔄 Implementation Sequence (Priority Order)

### **Week 1: Product Foundation**
- [ ] Phase 2.1: Create UserProduct model + migration
- [ ] Phase 2.2: Build CRUD endpoints for products
- [ ] Phase 2.3: Frontend Product Catalog UI in Settings
- [ ] Phase 2.4: CSV bulk upload + validation

### **Week 2: Intelligence Core**
- [ ] Phase 4.1: Implement fuzzy matching algorithm
- [ ] Phase 4.2: Build profit insights generator
- [ ] Phase 4.3: Create Celery task for auto-insights
- [ ] Phase 5.1: Add last_scraped_at tracking

### **Week 3: UX Enhancements**
- [ ] Phase 5.2: Build scrape details modal
- [ ] Phase 5.3: Implement product comparison section
- [ ] Phase 1: Multi-workspace switching in sidebar
- [ ] Phase 3: Upgrade discovery with persona logic

### **Week 4: AI & Polish**
- [ ] Phase 6.1: AI insights generation service
- [ ] Phase 6.2: Intelligence Hub UI redesign
- [ ] Phase 6.3: Time-series charts for trends
- [ ] Testing, bug fixes, performance optimization

---

## 📊 Success Metrics

1. **User can manage 50+ products** via catalog
2. **Fuzzy matching achieves >90% accuracy** on test dataset
3. **AI generates 3-5 actionable insights** per business per week
4. **Scrape details load in <500ms** for typical competitor
5. **Price comparison shows visual diff** in real-time

---

## 🚨 Critical Dependencies

- **Python Libraries:** `python-Levenshtein`, `fuzzywuzzy`, `pandas` (CSV), `Pillow` (images)
- **Frontend:** Chart.js or Recharts for time-series graphs
- **Celery Beat:** For periodic insight generation
- **Storage:** S3/Cloudinary for product images (optional)

---

## 🔐 Data Privacy & Security

- Products are **business-scoped** (can't access other workspaces)
- CSV uploads **sanitized** and validated (prevent injection)
- Scraping respects **robots.txt** and rate limits
- AI insights are **non-PII** and anonymized

---

**Ready to implement?** Start with Phase 2 (Product Catalog) as it's the foundation for all intelligence features.
