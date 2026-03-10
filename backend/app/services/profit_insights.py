"""
Profit Insights Service
Generates actionable profit optimization insights based on product matching.
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from statistics import mean

from app.models.user_product import UserProduct
from app.models.cleaned_data import CleanedData
from app.models.strategy_insight import StrategyInsight
from app.models.alert import Alert
from app.models.competitor import Competitor
from app.services.product_matcher import find_matches_for_product
from app import crud


class InsightType:
    PRICE_DROP_ALERT = "price_drop_alert"
    PRICE_CEILING_OPPORTUNITY = "price_ceiling_opportunity"
    COMPETITIVE_PRICING = "competitive_pricing"
    UNDERPRICED_PRODUCT = "underpriced_product"
    OVERPRICED_PRODUCT = "overpriced_product"


def calculate_price_statistics(
    competitor_prices: List[float]
) -> Dict[str, float]:
    """Calculate price statistics from competitor data."""
    if not competitor_prices:
        return {
            "average": 0.0,
            "min": 0.0,
            "max": 0.0,
            "count": 0
        }
    
    return {
        "average": mean(competitor_prices),
        "min": min(competitor_prices),
        "max": max(competitor_prices),
        "count": len(competitor_prices)
    }


def generate_price_drop_alert(
    db: Session,
    user_product: UserProduct,
    competitor_data: CleanedData,
    price_diff_percent: float
) -> Optional[Alert]:
    """
    Generate alert when competitor undercuts user's price.
    """
    if not competitor_data.competitor_id:
        return None
    
    competitor = crud.competitor.get(db=db, id=competitor_data.competitor_id)
    if not competitor:
        return None
    
    message = (
        f"⚠️ {competitor.name} undercut your product '{user_product.name}' "
        f"by {abs(price_diff_percent):.1f}%. "
        f"Your price: ${user_product.current_price:.2f}, "
        f"Their price: ${competitor_data.price:.2f}"
    )
    
    alert_data = {
        "business_id": user_product.business_id,
        "competitor_id": competitor_data.competitor_id,
        "alert_type": InsightType.PRICE_DROP_ALERT,
        "message": message,
        "severity": "high" if abs(price_diff_percent) > 10 else "medium"
    }
    
    return crud.alert.create(db=db, obj_in=alert_data)


def generate_price_ceiling_insight(
    db: Session,
    user_product: UserProduct,
    avg_competitor_price: float,
    price_diff_percent: float,
    potential_profit: float
) -> Optional[StrategyInsight]:
    """
    Generate insight when user can raise prices for profit optimization.
    """
    insight_text = (
        f"💡 Profit Opportunity: Your product '{user_product.name}' is "
        f"{abs(price_diff_percent):.1f}% cheaper than the market average "
        f"(${avg_competitor_price:.2f}). "
        f"Consider raising your price to ${avg_competitor_price * 0.95:.2f} "
        f"for an estimated ${potential_profit:.2f} profit increase per unit."
    )
    
    insight_data = {
        "business_id": user_product.business_id,
        "insight_type": InsightType.PRICE_CEILING_OPPORTUNITY,
        "insight_text": insight_text,
        "confidence_score": 85.0,
        "action_recommended": f"Raise price to ${avg_competitor_price * 0.95:.2f}"
    }
    
    return crud.strategy_insight.create(db=db, obj_in=insight_data)


def generate_competitive_pricing_insight(
    db: Session,
    user_product: UserProduct,
    price_stats: Dict[str, float]
) -> Optional[StrategyInsight]:
    """
    Generate insight when user's pricing is competitive.
    """
    insight_text = (
        f"✅ Competitive Pricing: Your product '{user_product.name}' "
        f"at ${user_product.current_price:.2f} is well-positioned. "
        f"Market range: ${price_stats['min']:.2f} - ${price_stats['max']:.2f}, "
        f"Average: ${price_stats['average']:.2f}"
    )
    
    insight_data = {
        "business_id": user_product.business_id,
        "insight_type": InsightType.COMPETITIVE_PRICING,
        "insight_text": insight_text,
        "confidence_score": 90.0,
        "action_recommended": "Maintain current pricing strategy"
    }
    
    return crud.strategy_insight.create(db=db, obj_in=insight_data)


def analyze_product_pricing(
    db: Session,
    user_product: UserProduct,
    business_id: int
) -> List[Any]:
    """
    Analyze a single user product against all competitor data
    and generate insights/alerts.
    
    Returns list of generated insights and alerts.
    """
    if not user_product.current_price:
        return []
    
    # Get all competitor cleaned data for this business
    competitors = crud.competitor.get_by_business(db=db, business_id=business_id)
    
    all_competitor_data = []
    for competitor in competitors:
        competitor_data = crud.cleaned_data.get_by_competitor(
            db=db, competitor_id=competitor.id
        )
        all_competitor_data.extend(competitor_data)
    
    if not all_competitor_data:
        return []
    
    # Find matching competitor products
    matches = find_matches_for_product(
        db=db,
        user_product=user_product,
        competitor_data_list=all_competitor_data,
        min_confidence=75.0
    )
    
    if not matches:
        return []
    
    # Extract prices from matches
    competitor_prices = [
        data.price for data, _, _ in matches
        if data.price is not None
    ]
    
    if not competitor_prices:
        return []
    
    # Calculate statistics
    price_stats = calculate_price_statistics(competitor_prices)
    avg_price = price_stats["average"]
    
    # Calculate price difference percentage
    price_diff_percent = (
        (user_product.current_price - avg_price) / avg_price * 100
    )
    
    results = []
    
    # Check for price drop alerts (competitor undercut by >5%)
    for data, confidence, method in matches:
        if data.price and data.price < user_product.current_price:
            undercut_percent = (
                (user_product.current_price - data.price) / user_product.current_price * 100
            )
            
            if undercut_percent > 5:
                alert = generate_price_drop_alert(
                    db=db,
                    user_product=user_product,
                    competitor_data=data,
                    price_diff_percent=undercut_percent
                )
                if alert:
                    results.append(alert)
    
    # Check for price ceiling opportunity (user is >10% cheaper than average)
    if price_diff_percent < -10:
        potential_profit = (avg_price * 0.95) - user_product.current_price
        insight = generate_price_ceiling_insight(
            db=db,
            user_product=user_product,
            avg_competitor_price=avg_price,
            price_diff_percent=price_diff_percent,
            potential_profit=potential_profit
        )
        if insight:
            results.append(insight)
    
    # Check for competitive pricing (within ±10% of average)
    elif -10 <= price_diff_percent <= 10:
        insight = generate_competitive_pricing_insight(
            db=db,
            user_product=user_product,
            price_stats=price_stats
        )
        if insight:
            results.append(insight)
    
    return results


def bulk_analyze_products(
    db: Session,
    business_id: int
) -> Dict[str, Any]:
    """
    Analyze all products for a business and generate insights.
    
    Returns summary statistics and list of insights/alerts.
    """
    # Get all user products for this business
    products = crud.user_product.get_by_business(db=db, business_id=business_id)
    
    if not products:
        return {
            "total_products": 0,
            "analyzed": 0,
            "insights_generated": 0,
            "alerts_generated": 0,
            "results": []
        }
    
    all_results = []
    insights_count = 0
    alerts_count = 0
    
    for product in products:
        results = analyze_product_pricing(db=db, user_product=product, business_id=business_id)
        
        for result in results:
            if isinstance(result, StrategyInsight):
                insights_count += 1
            elif isinstance(result, Alert):
                alerts_count += 1
            
            all_results.append(result)
    
    return {
        "total_products": len(products),
        "analyzed": len([p for p in products if p.current_price]),
        "insights_generated": insights_count,
        "alerts_generated": alerts_count,
        "results": all_results
    }
