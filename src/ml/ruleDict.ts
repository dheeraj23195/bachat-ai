// src/ml/ruleDict.ts

export const RULE_KEYWORDS: Record<string, string[]> = {
  food: [
    "zomato", "swiggy", "dominos", "pizza", "kfc", "mcdonalds",
    "burger", "cafe", "restaurant", "meal", "lunch", "dinner", "biryani"
  ],

  transport: [
    "uber", "ola", "rapido", "taxi", "cab", "bus", "metro",
    "fuel", "petrol", "diesel", "bike", "train"
  ],

  shopping: [
    "amazon", "flipkart", "myntra", "ajio", "meesho", "dmart",
    "bigbasket", "nykaa", "zara", "h&m"
  ],

  bills: [
    "electricity", "water", "gas", "recharge", "airtel",
    "jio", "vi", "broadband", "wifi", "dth", "bill", "rent"
  ],

  health: [
    "pharmacy", "medical", "chemist", "hospital", "clinic",
    "medlife", "1mg", "apollo"
  ],

  subscriptions: [
    "spotify", "netflix", "prime", "hotstar", "youtube",
    "apple", "google", "itunes"
  ]
};
