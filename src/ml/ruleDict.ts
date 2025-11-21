// src/ml/ruleDict.ts

export const RULE_KEYWORDS: Record<string, string[]> = {
  food: [
    "zomato","swiggy","dominos","pizza","kfc","mcdonalds","burger","cafe","restaurant",
    "meal","lunch","dinner","biryani","subway","starbucks","barbeque nation","haldiram",
    "bikanervala","chaayos","ccd","coffee","tea","food court","eatery","waffle",
    "ice cream","dessert","pastry","bakery","kebab","rolls","shawarma","idli","dosa",
    "paratha","thali","snacks","chai","sweet shop","pizzeria","mojo pizza","ovenstory",
    "faasos","behrouz biryani","eatfit","wow momo","burger king","taco bell","momos",
    "samosa","sandwich","noodles","ramen","fried rice","pulao","veg food","non veg",
    "grill","bar","pub","dhaba","canteen","catering","food delivery","freshmenu",
    "box8","dineout","eatclub","ubereats","milkshake","smoothie","juice center",
    "salad","chaat","kulfi","kheer","halwa","namkeen","chips","drinks","tiffin",
    "tiffin service","homemade food","cloud kitchen","takeaway"
  ],

  transport: [
    "uber","ola","rapido","taxi","cab","bus","metro","fuel","petrol","diesel","bike",
    "train","auto","rickshaw","shuttle","volvo","redbus","meru","fastag","toll",
    "parking","uberauto","uber moto","rapido bike","rapido auto","flight","air india",
    "indigo","vistara","spicejet","airasia","goair","airport","ola electric",
    "ev charging","charging station","hp petrol","iocl","bpcl","bike servicing","car wash",
    "tyres","puncture","bus pass","metro token","train ticket","suburban train",
    "local train","ola prime","ola micro","parking fee","traffic fine","toll plaza",
    "petrol pump","indian oil","ola outstation","uber rental","car pool","scooter",
    "bike rental","bounce","yulu","viron","electric scooter","uber intercity",
    "ola outstation","ola rental","uber rental"
  ],

  shopping: [
    "amazon","flipkart","myntra","ajio","meesho","dmart","bigbasket","nykaa","zara","h&m",
    "lifestyle","pantaloons","max fashion","reliance trends","tatacliq","snapdeal","croma",
    "vijay sales","poorvika","jiomart","reliance digital","pepperfry","ikea","home centre",
    "decathlon","nike","adidas","puma","sketchers","titan","fastrack","boat","noise",
    "apple store","mi store","oneplus store","samsung store","vivo store","oppo store",
    "redmi store","fine jewellery","tanishq","caratlane","blue stone","watch store",
    "beauty store","makeup","cosmetics","perfume","footwear","bags","accessories",
    "luggage","trolley","electronics","mobile","headphones","earbuds","smartwatch",
    "kitchen items","utensils","furniture","sofa","table","chair","bedding","mattress",
    "curtains","decor","toys","kids store","pet supplies","sportswear","gym wear","books",
    "stationery","grocery delivery","appliances","TV","AC","fridge","washing machine",
    "cleaning supplies","gift shop","handbag","wallet","clothing","dress","shirt","jeans",
    "kurti","lehenga","saree","sneakers","heels","shoes","fashion accessories"
  ],

  bills: [
   "electricity","water","gas","recharge","airtel","jio","vi","broadband","wifi","dth",
   "bill","rent","property tax","mobile recharge","internet bill","tv bill","postpaid",
   "prepaid","gas cylinder","png","indane","bharat gas","hp gas","mtnl","bsnl",
   "tatasky","airtel xtreme","jiofiber","act fiber","hathway","spectra","you broadband",
   "rent payment","society maintenance","utility charges","electric bill","power bill",
   "water tax","waste management","garbage bill","sewage bill","solar bill",
   "municipal bill","broadband renewal","wifi recharge","mobile bill","booster pack",
   "top up","electric company","torrent power","tneb","bescom","djb","pwd","gas booking",
   "online rent","housing society","maintenance charge","mobile plan","family pack",
   "apartment fees","cable tv","streaming box","router rental","set top box bill",
   "electricity surcharge","late fee","fixed charges","commercial bill"
  ],

  health: [
    "pharmacy","medical","chemist","hospital","clinic","medlife","1mg","apollo",
    "practo","medplus","pharmeasy","healthians","thyrocare","diagnostics","lab test",
    "medicine","tablet","syrup","vaccination","doctor","dentist","therapy",
    "dermatologist","physiotherapy","blood test","scan","x-ray","mri","ultrasound",
    "eyecare","lenskart","glasses","sanitizer","mask","vitamins","supplements",
    "bandage","antiseptic","protein","nutrition","health drink","vicks","dettol",
    "savlon","cough syrup","antibiotic","pain relief","bandage","injection",
    "med store","drug store","antiseptic","fever medicine","healthcare app",
    "vital check","blood pressure check","sugar test","diabetic supplies",
    "asthma inhaler","covid test","covid vaccine"
  ],

  subscriptions: [
    "spotify","netflix","prime","hotstar","youtube","apple","google","itunes","sony liv",
    "zee5","voot","aha","sun nxt","gaana","wynk","youtube premium","prime video","audible",
    "amazon music","shemaroo","jio saavn","hbo","disney plus","vpn","nordvpn","surfshark",
    "expressvpn","icloud","google drive","onedrive","office 365","canva","notion",
    "chatgpt","midjourney","adobe","photoshop","illustrator","lightroom","zoom","slack",
    "github","jetbrains","domain renewal","web hosting","wordpress","shopify",
    "google workspace","netflix India","sony liv premium","gaming subscription",
    "playstation plus","xbox game pass","steam","epic games","udemy","coursera",
    "skillshare","byjus","unacademy","vedantu","coding ninjas","jio cinema premium",
    "amazon audible membership","news subscription","economist","nyt","toffee tv",
    "language learning","duolingo","spotify family","apple music family",
    "kuku fm","storytel","blinkist"
  ],

  groceries: [
    "bigbasket","blinkit","dmart","jiomart","reliance fresh","nature’s basket","grofers",
    "milk","bread","eggs","vegetables","fruits","rice","atta","dal","oil","sugar","salt",
    "cookies","biscuits","chips","chocolate","noodles","pasta","frozen food","cold drinks",
    "juice","tea","coffee","spices","butter","cheese","paneer","curd","yogurt","milk basket",
    "dry fruits","snacks","namkeen","flour","cereal","breakfast","oats","honey","jaggery",
    "fresh produce","toiletries","soap","shampoo","toothpaste","cleaning supplies",
    "mop","phenyl","detergent","dishwash","tissues","handwash","sanitary pads",
    "diapers","baby food","ghee","jam","pickles","sauces","condiments","baking items",
    "bottle water","packaged food","ready to eat","grocery app","biscuit packet",
    "grocery shop","supermarket","hypermarket","kirana store","local shop"
  ],

  travel: [
    "air ticket","flight","air india","indigo","vistara","spicejet","airasia",
    "irctc","train ticket","hotel","oyo","booking.com","makemytrip","goibibo","agoda",
    "tripadvisor","resort","homestay","airbnb","visa fee","passport fee","tour package",
    "travel insurance","bus ticket","volvo bus","road trip","car rental","zoomcar",
    "self drive","bike rental","yulu","hostel","zostel","stayzilla","trip cost","luggage",
    "travel accessories","tickets","travel card","forex card","currency exchange",
    "airport cab","airport fastag","travel snacks","travel shopping","guide fee",
    "local sightseeing","tour guide","travel tax","travel booking fee","map service",
    "cruise ticket","ferry","mountain trip","trekking","hiking","camping","holiday package",
    "international roaming","travel sim","travel food","train pantry","travel pass",
    "metro pass","city card","tourist bus","travel gear","travel shoes","travel bag"
  ],

  education: [
    "air ticket","flight","air india","indigo","vistara","spicejet","airasia",
    "irctc","train ticket","hotel","oyo","booking.com","makemytrip","goibibo","agoda",
    "tripadvisor","resort","homestay","airbnb","visa fee","passport fee","tour package",
    "travel insurance","bus ticket","volvo bus","road trip","car rental","zoomcar",
    "self drive","bike rental","yulu","hostel","zostel","stayzilla","trip cost","luggage",
    "travel accessories","tickets","travel card","forex card","currency exchange",
    "airport cab","airport fastag","travel snacks","travel shopping","guide fee",
    "local sightseeing","tour guide","travel tax","travel booking fee","map service",
    "cruise ticket","ferry","mountain trip","trekking","hiking","camping","holiday package",
    "international roaming","travel sim","travel food","train pantry","travel pass",
    "metro pass","city card","tourist bus","travel gear","travel shoes","travel bag"
  ],

  finance: [
    "atm withdrawal","upi payment","gpay","paytm","phonepe","bank charge","maintenance fee",
    "late fee","interest","emi","loan payment","credit card bill","debit card","insurance",
    "sip","mutual fund","stocks","zerodha","groww","upstox","brokerage","demat","ipo",
    "tax","tds","gst","income tax","fine","penalty","wallet recharge","gift card",
    "account opening","bank transfer","wire transfer","swift","rtgs","imps","neft",
    "branch banking","mobile banking","card replacement","fraud alert","chargeback",
    "fund transfer","upi id","upi collect","wallet transfer","investment","gold investment",
    "digital gold","crypto","binance","wazirx","coinbase","wealth management",
    "credit score","cibil","payment gateway","stripe","razorpay","cashfree"
  ],

  home: [
    "furniture","ikea","pepperfry","home centre","painting","repairs","electrician",
    "plumber","carpenter","cleaning service","urban company","pest control","renovation",
    "tiles","plumbing","tap","pipes","cement","contractor","gardening","plants",
    "decor","curtains","bedsheet","mattress","lights","wiring","home upgrade","tv repair",
    "ac repair","fridge repair","water purifier","ro service","geyser","fan","cooler",
    "household items","kitchenware","utensils","appliance repair","home deep cleaning",
    "sofa repair","laundry","dry cleaning","dustbin","broom","mop","storage box",
    "home construction","interior design","modular kitchen","wardrobe","bed",
    "shoe rack","home improvement","property service","painter","wall decor","wallpaper",
    "flooring","home repair","carpet","rugs","locks","keys","security system",
    "cctv installation","home safety","maintenance charge"
  ]
};