"""
Utilities for interacting with AI services (Hugging Face) and extracting ingredients from subtitles.

Order of operations:
1) Try Hugging Face OpenAI-compatible Chat API (router.huggingface.co) to extract {"tags":[...]}.
2) If no tags, fall back to heuristics.
"""
from __future__ import annotations

import os
import re
import json
from typing import List, Set, Iterable, Optional

import httpx

# -------------------------
# Config
# -------------------------
HF_API_URL = "https://api-inference.huggingface.co/models"
HF_ROUTER_BASE = "https://router.huggingface.co/v1"

# Prefer an explicit override model via env, then a few defaults.
# IMPORTANT: Use HF repo IDs (e.g., "openai/gpt-oss-20b"), not provider suffixes.
CHAT_MODEL_CANDIDATES = [
    os.getenv("HF_CHAT_MODEL"),  # allow override via env var
    "openai/gpt-oss-120b",
]
CHAT_MODEL_CANDIDATES = [m for m in CHAT_MODEL_CANDIDATES if m]

USE_HF_CHAT = os.getenv("USE_HF_CHAT", "true").lower() in {"1", "true", "yes"}


# -------------------------
# Dictionaries for heuristic fallback
# -------------------------

# Expanded common ingredients (lowercase). Keep concise nouns only.
COMMON_INGREDIENTS = [
    # pantry basics
    "salt","pepper","sugar","brown sugar","flour","rice","pasta","water","yeast",
    "baking powder","baking soda","cornstarch","vinegar","rice vinegar","apple cider vinegar",
    "soy sauce","fish sauce","oyster sauce","hot sauce","ketchup","mustard","mayonnaise",
    "olive oil","vegetable oil","canola oil","sesame oil","butter","ghee",
    # aromatics
    "garlic","onion","shallot","ginger","scallion","green onion","leek","celery",
    # proteins
    "egg","eggs","chicken","chicken breast","chicken thigh","beef","ground beef","pork",
    "bacon","sausage","ham","tofu","tempeh","fish","salmon","tuna","shrimp",
    # dairy
    "milk","cream","heavy cream","sour cream","yogurt","cheese","parmesan","mozzarella","cheddar",
    # vegetables
    "tomato","tomatoes","potato","potatoes","carrot","carrots","cucumber","spinach","kale",
    "broccoli","cauliflower","zucchini","eggplant","mushroom","bell pepper","bell peppers",
    "corn","pea","peas","cabbage","lettuce","bok choy",
    # fruits
    "lemon","lime","orange","apple","banana","pineapple","mango","avocado",
    # legumes & grains
    "lentil","lentils","chickpea","chickpeas","bean","black beans","kidney beans",
    "quinoa","oat","oats","barley","bulgur",
    # spices & herbs
    "cinnamon","cumin","paprika","smoked paprika","turmeric","chili powder","cayenne",
    "black pepper","white pepper","nutmeg","clove","cardamom","allspice",
    "oregano","basil","thyme","rosemary","parsley","cilantro","dill","bay leaf","bay leaves",
    # sweeteners & baking
    "honey","maple syrup","molasses","vanilla","cocoa","chocolate",
    # Asian staples
    "miso","mirin","dashi","gochujang","kimchi","nori","wasabi","tamarind",
    # liquids & stocks
    "stock","chicken stock","beef stock","vegetable stock","broth","coconut milk",
    # nuts & seeds
    "peanut","peanuts","almond","almonds","walnut","walnuts","cashew","cashews",
    "sesame seed","sesame seeds","chia seed","chia seeds","sunflower seed","sunflower seeds",
]

# Multi-word ingredients to detect first so they aren't split.
MULTIWORD_INGREDIENTS = {
    "olive oil","vegetable oil","canola oil","sesame oil","coconut milk",
    "brown sugar","baking powder","baking soda","rice vinegar","apple cider vinegar",
    "soy sauce","fish sauce","oyster sauce","hot sauce",
    "green onion","scallion","bell pepper","bell peppers",
    "chili powder","smoked paprika","black pepper","white pepper",
    "heavy cream","sour cream","parmesan","mozzarella","chicken breast","chicken thigh",
    "ground beef","bay leaf","bay leaves","chicken stock","beef stock","vegetable stock",
    "red pepper flakes","garlic powder","onion powder",
    "maple syrup","sunflower seeds","sesame seeds","chia seeds",
}

# Lightweight stopwords/noise (verbs, adjectives, etc.) to avoid as ingredients.
STOPWORDS = {
    "a","an","the","and","or","of","with","to","for","on","in","at","by",
    "fresh","large","small","good","optional","taste","chopped","minced","sliced",
    "mix","mixed","mixing","cook","cooked","cooking","boil","boiled","fry","fried",
    "roast","roasted","bake","baked","add","added","stir","stirred","grilled","saute","sauteed",
    "season","seasoned","marinate","marinated","ground","crushed","diced","shredded",
}

# Quantity/unit words for simple pattern stripping.
QUANTITY_UNITS = [
    "cup","cups","tbsp","tablespoon","tablespoons","tsp","teaspoon","teaspoons",
    "gram","grams","g","kg","kilogram","kilograms",
    "ml","milliliter","milliliters","liter","liters","l",
    "lb","pound","pounds","oz","ounce","ounces",
    "pinch","dash","clove","cloves","slice","slices",
]

# -------------------------
# Helpers
# -------------------------
def _normalize_tag(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r"\s+", " ", s)
    s = s.strip(" ,.;:\n\t\r")
    return s

def _dedupe_keep_order(items: Iterable[str]) -> List[str]:
    seen: Set[str] = set()
    out: List[str] = []
    for it in items:
        if it not in seen:
            seen.add(it)
            out.append(it)
    return out

def _get_hf_token() -> Optional[str]:
    return os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_API_TOKEN")


# -------------------------
# HF Chat (router) extractor
# -------------------------
def call_hf_chat_extract(text: str, timeout: float = 12.0) -> List[str]:
    token = _get_hf_token()
    if not token:
        return []
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    url = f"{HF_ROUTER_BASE}/chat/completions"
    system_prompt = (
        'You are an information extraction system. '
        'Extract cooking ingredients from the user text. '
        'Return ONLY a minified JSON object exactly like {"tags":["..."]}. '
        'Rules: lowercase; deduplicate; exclude verbs, adjectives, quantities and units; '
        'keep short food terms (<=3 words each).'
    )

    for model in CHAT_MODEL_CANDIDATES:
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text},
            ],
            "temperature": 0,
        }
        try:
            with httpx.Client(timeout=timeout) as client:
                res = client.post(url, headers=headers, json=payload)
            print(f"[DEBUG] HF Chat status: {res.status_code} model={model}")
            if res.status_code != 200:
                body = res.text[:300]
                print(f"[DEBUG] HF Chat resp: {body}")
                # Try next model if model is not supported/found
                if any(k in body for k in ("model_not_supported", "model_not_found")):
                    continue
                # Otherwise, bail out of chat path
                return []
            data = res.json()
            content = (data.get("choices") or [{}])[0].get("message", {}).get("content", "") or ""
            content = content.strip()
            m = re.search(r"\{.*\}", content, flags=re.DOTALL)
            if m:
                content = m.group(0)
            obj = json.loads(content)
            tags = obj.get("tags", [])
            if isinstance(tags, list):
                return [_normalize_tag(t) for t in tags if isinstance(t, str) and t.strip()]
        except Exception as e:
            print(f"[DEBUG] HF Chat error on {model}: {e}")
            continue
    return []


# -------------------------
# Heuristic Fallback
# -------------------------
def heuristic_extract(text: str) -> List[str]:
    """
    Simple rule-based extraction:
    1) Grab multi-word ingredients first (to avoid splitting them).
    2) Look up single-word/common items.
    3) If still empty, try to parse lines stripping quantities/units and pick plausible nouns.
    """
    found: Set[str] = set()
    lower_text = text.lower()

    # 1) Multi-word first
    for phrase in MULTIWORD_INGREDIENTS:
        if phrase in lower_text:
            found.add(phrase)

    # 2) Whitelist lookups (both single and multi may appear here)
    for ing in COMMON_INGREDIENTS:
        if ing in lower_text:
            found.add(_normalize_tag(ing))

    # 3) Very light fallback line parsing
    if not found:
        for line in text.splitlines():
            l = line.strip().lower()
            if not l:
                continue
            m = re.match(r"^\s*(\d+[\/\.]?\d*)?\s*(" + "|".join(map(re.escape, QUANTITY_UNITS)) + r")?\s*(.*)$", l)
            if not m:
                continue
            rest = m.group(3) or ""
            words = [w for w in re.split(r"[^a-zA-Z]+", rest) if w]
            words = [w for w in words if w not in STOPWORDS]
            if not words:
                continue

            # Prefer known multi-words; else take the first plausible token
            candidate2 = " ".join(words[:2]) if len(words) >= 2 else ""
            if candidate2 in MULTIWORD_INGREDIENTS:
                found.add(candidate2)
            elif words[0] in COMMON_INGREDIENTS:
                found.add(words[0])
            elif len(words[0]) >= 2:
                found.add(words[0])

    # Keep original order of appearance when possible
    return sorted(found, key=lambda t: lower_text.find(t) if t in lower_text else 10**9)


# -------------------------
# Public API
# -------------------------
def extract_ingredients_from_text(text: str, max_items: int = 20) -> List[str]:
    """
    Extract ingredient-like tags from subtitle text.
    Order: HF Chat -> Heuristic.
    """
    if not text or not text.strip():
        return []
    text = text.strip()

    # 1) HF Chat (router)
    tags: List[str] = []
    if USE_HF_CHAT:
        tags = call_hf_chat_extract(text)
        if tags:
            print(f"[DEBUG] HF Chat extracted: {tags}")

    # 2) Heuristic
    if not tags:
        tags = heuristic_extract(text)
        print(f"[DEBUG] Heuristic extracted: {tags}")

    # Final cleanup: alpha + spaces only; <=3 words; reasonable length; dedupe
    clean: List[str] = []
    for t in tags:
        t2 = _normalize_tag(t)
        if not t2:
            continue
        if not re.fullmatch(r"[a-z ]+", t2):
            continue
        if len(t2.split()) > 3:
            continue
        if 2 <= len(t2) <= 30:
            clean.append(t2)

    clean = _dedupe_keep_order(clean)[:max_items]
    return clean
