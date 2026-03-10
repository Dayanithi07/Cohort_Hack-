"""
Product Matching Service
Implements fuzzy matching between user products and competitor scraped data.
"""
from difflib import SequenceMatcher
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.user_product import UserProduct
from app.models.cleaned_data import CleanedData


def normalize_text(text: str) -> str:
    """
    Normalize text for comparison by removing special characters,
    converting to lowercase, and stripping whitespace.
    """
    if not text:
        return ""
    
    # Convert to lowercase and strip
    normalized = text.lower().strip()
    
    # Remove common special characters
    for char in ["-", "_", ".", ",", "!", "?"]:
        normalized = normalized.replace(char, " ")
    
    # Collapse multiple spaces
    normalized = " ".join(normalized.split())
    
    return normalized


def calculate_title_similarity(title1: str, title2: str) -> float:
    """
    Calculate similarity score between two product titles using SequenceMatcher.
    Returns a score between 0 and 100.
    """
    normalized1 = normalize_text(title1)
    normalized2 = normalize_text(title2)
    
    if not normalized1 or not normalized2:
        return 0.0
    
    similarity = SequenceMatcher(None, normalized1, normalized2).ratio()
    return similarity * 100


def match_by_sku(
    user_product: UserProduct,
    competitor_data: CleanedData
) -> Tuple[bool, float]:
    """
    Attempt exact SKU matching.
    Returns (matched, confidence_score)
    """
    if not user_product.sku or not hasattr(competitor_data, 'product_sku'):
        return False, 0.0
    
    if not competitor_data.product_sku:
        return False, 0.0
    
    # Exact SKU match
    if user_product.sku.lower().strip() == competitor_data.product_sku.lower().strip():
        return True, 100.0
    
    return False, 0.0


def match_by_title(
    user_product: UserProduct,
    competitor_data: CleanedData,
    threshold: float = 80.0
) -> Tuple[bool, float]:
    """
    Fuzzy match by product title.
    Returns (matched, confidence_score)
    """
    if not user_product.name or not competitor_data.product_name:
        return False, 0.0
    
    similarity_score = calculate_title_similarity(
        user_product.name,
        competitor_data.product_name
    )
    
    return similarity_score >= threshold, similarity_score


def match_by_category_and_price(
    user_product: UserProduct,
    competitor_data: CleanedData,
    price_tolerance: float = 0.3  # 30% tolerance
) -> Tuple[bool, float]:
    """
    Match by category and price range as a fallback.
    Returns (matched, confidence_score)
    """
    if not user_product.category or not hasattr(competitor_data, 'category'):
        return False, 0.0
    
    # Category match
    category_match = (
        user_product.category and
        competitor_data.category and
        user_product.category.lower() == competitor_data.category.lower()
    )
    
    if not category_match:
        return False, 0.0
    
    # Price range match
    if user_product.current_price and competitor_data.price:
        price_diff_ratio = abs(
            user_product.current_price - competitor_data.price
        ) / user_product.current_price
        
        if price_diff_ratio <= price_tolerance:
            # Calculate confidence based on price proximity
            confidence = (1 - price_diff_ratio) * 60  # Max 60% confidence
            return True, confidence
    
    return False, 40.0  # Category match only


def fuzzy_match_product(
    user_product: UserProduct,
    competitor_data: CleanedData
) -> Tuple[bool, float, str]:
    """
    Comprehensive fuzzy matching using multiple strategies.
    Returns (matched, confidence_score, match_method)
    
    Matching hierarchy:
    1. Exact SKU match (100% confidence)
    2. Fuzzy title match (>80% similarity)
    3. Category + price range (fallback)
    """
    # Try SKU match first
    sku_matched, sku_score = match_by_sku(user_product, competitor_data)
    if sku_matched:
        return True, sku_score, "sku_exact"
    
    # Try title fuzzy match
    title_matched, title_score = match_by_title(user_product, competitor_data)
    if title_matched:
        return True, title_score, "title_fuzzy"
    
    # Fallback to category + price
    category_matched, category_score = match_by_category_and_price(
        user_product, competitor_data
    )
    if category_matched:
        return True, category_score, "category_price_range"
    
    return False, 0.0, "no_match"


def find_matches_for_product(
    db: Session,
    user_product: UserProduct,
    competitor_data_list: List[CleanedData],
    min_confidence: float = 80.0
) -> List[Tuple[CleanedData, float, str]]:
    """
    Find all matching competitor products for a given user product.
    Returns list of (matched_data, confidence_score, match_method)
    sorted by confidence descending.
    """
    matches = []
    
    for data in competitor_data_list:
        matched, confidence, method = fuzzy_match_product(user_product, data)
        
        if matched and confidence >= min_confidence:
            matches.append((data, confidence, method))
    
    # Sort by confidence descending
    matches.sort(key=lambda x: x[1], reverse=True)
    
    return matches


def find_best_match(
    db: Session,
    user_product: UserProduct,
    competitor_data_list: List[CleanedData]
) -> Optional[Tuple[CleanedData, float, str]]:
    """
    Find the single best match for a user product.
    Returns (matched_data, confidence_score, match_method) or None if no match found.
    """
    matches = find_matches_for_product(db, user_product, competitor_data_list)
    
    return matches[0] if matches else None
