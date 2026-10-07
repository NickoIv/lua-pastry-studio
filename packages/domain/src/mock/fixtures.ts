import {
  asId,
  money,
  type Collection,
  type Customer,
  type CustomerProfile,
  type Location,
  type LoyaltyAccount,
  type LoyaltyTransaction,
  type Order,
  type Product,
  type ProductCategory,
  type Promotion,
  type Reward,
  type RewardRedemption,
  type StaffUser,
} from "@lua/types";
import { DEFAULT_LOYALTY_PROGRAM } from "../loyalty/earning";
import { balanceFromLedger, lifetimeEarnedFromLedger } from "../loyalty/ledger";

// -- Locations ---------------------------------------------------------

export const locations: Location[] = [
  {
    id: asId("loc_dostyk"),
    name: "Lua Pastry Studio — Достык",
    shortName: "Достык",
    address: "пр. Достык, 89",
    city: "Алматы",
    openHours: "08:00–22:00",
    phone: "+7 727 000 11 22",
    sortOrder: 1,
    isActive: true,
  },
  {
    id: asId("loc_kok_tobe"),
    name: "Lua Pastry Studio — Кок-Тобе",
    shortName: "Кок-Тобе",
    address: "ул. Достоевского, 1/1",
    city: "Алматы",
    openHours: "09:00–21:00",
    phone: "+7 727 000 33 44",
    sortOrder: 2,
    isActive: true,
  },
];

// -- Menu ----------------------------------------------------------------

export const categories: ProductCategory[] = [
  {
    id: asId("cat_coffee"),
    name: { ru: "Кофе", kk: "Кофе", en: "Coffee" },
    sortOrder: 1,
  },
  {
    id: asId("cat_pastry"),
    name: { ru: "Выпечка", kk: "Нан өнімдері", en: "Pastry" },
    sortOrder: 2,
  },
  {
    id: asId("cat_dessert"),
    name: { ru: "Десерты", kk: "Десерттер", en: "Desserts" },
    sortOrder: 3,
  },
];

const availableEverywhere = [
  { locationId: locations[0]!.id, inStock: true, dailyLimit: null },
  { locationId: locations[1]!.id, inStock: true, dailyLimit: null },
];

export const products: Product[] = [
  {
    id: asId("prod_espresso"),
    imageUrl:
      "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20200%20150%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22m1%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23f6e9da%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23e3c6a2%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%22200%22%20height%3D%22150%22%20fill%3D%22url%28%23m1%29%22%2F%3E%3Cpath%20d%3D%22M72%2058%20L78%20105%20Q79%20114%2088%20114%20L112%20114%20Q121%20114%20122%20105%20L128%2058%20Z%22%20fill%3D%22none%22%20stroke%3D%22%234a3222%22%20stroke-width%3D%222.4%22%2F%3E%3Cpath%20d%3D%22M126%2068%20Q145%2068%20145%2085%20Q145%20100%20126%2099%22%20fill%3D%22none%22%20stroke%3D%22%234a3222%22%20stroke-width%3D%222.4%22%2F%3E%3Cellipse%20cx%3D%22100%22%20cy%3D%22120%22%20rx%3D%2242%22%20ry%3D%227%22%20fill%3D%22none%22%20stroke%3D%22%234a3222%22%20stroke-width%3D%222.4%22%2F%3E%3Cpath%20d%3D%22M88%2042%20Q84%2034%2090%2028%22%20fill%3D%22none%22%20stroke%3D%22%234a3222%22%20stroke-width%3D%221.6%22%20opacity%3D%220.6%22%2F%3E%3Cpath%20d%3D%22M100%2042%20Q96%2032%20102%2024%22%20fill%3D%22none%22%20stroke%3D%22%234a3222%22%20stroke-width%3D%221.6%22%20opacity%3D%220.6%22%2F%3E%3Cpath%20d%3D%22M112%2042%20Q108%2034%20114%2028%22%20fill%3D%22none%22%20stroke%3D%22%234a3222%22%20stroke-width%3D%221.6%22%20opacity%3D%220.6%22%2F%3E%3C%2Fsvg%3E",
    categoryId: asId("cat_coffee"),
    name: { ru: "Эспрессо", kk: "Эспрессо", en: "Espresso" },
    description: {
      ru: "Классический двойной эспрессо из сезонного бленда.",
      kk: "Маусымдық бленден дайындалған классикалық қос эспрессо.",
      en: "Classic double espresso from our seasonal blend.",
    },
    price: money(1200),
    allergens: [],
    isSeasonal: false,
    isNew: false,
    isMustTry: false,
    sortOrder: 1,
    availability: availableEverywhere,
  },
  {
    id: asId("prod_cappuccino"),
    imageUrl:
      "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20200%20150%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22m2%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23f6e9da%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23e3c6a2%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%22200%22%20height%3D%22150%22%20fill%3D%22url%28%23m2%29%22%2F%3E%3Cpath%20d%3D%22M72%2058%20L78%20105%20Q79%20114%2088%20114%20L112%20114%20Q121%20114%20122%20105%20L128%2058%20Z%22%20fill%3D%22none%22%20stroke%3D%22%234a3222%22%20stroke-width%3D%222.4%22%2F%3E%3Cpath%20d%3D%22M126%2068%20Q145%2068%20145%2085%20Q145%20100%20126%2099%22%20fill%3D%22none%22%20stroke%3D%22%234a3222%22%20stroke-width%3D%222.4%22%2F%3E%3Cellipse%20cx%3D%22100%22%20cy%3D%22120%22%20rx%3D%2242%22%20ry%3D%227%22%20fill%3D%22none%22%20stroke%3D%22%234a3222%22%20stroke-width%3D%222.4%22%2F%3E%3Ccircle%20cx%3D%22100%22%20cy%3D%2268%22%20r%3D%2214%22%20fill%3D%22none%22%20stroke%3D%22%234a3222%22%20stroke-width%3D%222%22%2F%3E%3Cpath%20d%3D%22M100%2060%20Q106%2068%20100%2076%20Q94%2068%20100%2060%20Z%22%20fill%3D%22%234a3222%22%2F%3E%3Cpath%20d%3D%22M88%2042%20Q84%2034%2090%2028%22%20fill%3D%22none%22%20stroke%3D%22%234a3222%22%20stroke-width%3D%221.6%22%20opacity%3D%220.6%22%2F%3E%3Cpath%20d%3D%22M100%2042%20Q96%2032%20102%2024%22%20fill%3D%22none%22%20stroke%3D%22%234a3222%22%20stroke-width%3D%221.6%22%20opacity%3D%220.6%22%2F%3E%3Cpath%20d%3D%22M112%2042%20Q108%2034%20114%2028%22%20fill%3D%22none%22%20stroke%3D%22%234a3222%22%20stroke-width%3D%221.6%22%20opacity%3D%220.6%22%2F%3E%3C%2Fsvg%3E",
    categoryId: asId("cat_coffee"),
    name: { ru: "Капучино", kk: "Капучино", en: "Cappuccino" },
    description: {
      ru: "Эспрессо с бархатной молочной пенкой.",
      kk: "Барқыт сүт көбігі бар эспрессо.",
      en: "Espresso with velvety steamed milk foam.",
    },
    price: money(1900),
    allergens: ["milk"],
    isSeasonal: false,
    isNew: false,
    isMustTry: true,
    sortOrder: 2,
    availability: availableEverywhere,
  },
  {
    id: asId("prod_latte"),
    imageUrl:
      "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20200%20150%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22m3%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23f6e9da%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23e3c6a2%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%22200%22%20height%3D%22150%22%20fill%3D%22url%28%23m3%29%22%2F%3E%3Cpath%20d%3D%22M84%2044%20L80%20112%20Q80%20119%2087%20119%20L113%20119%20Q120%20119%20120%20112%20L116%2044%20Z%22%20fill%3D%22none%22%20stroke%3D%22%234a3222%22%20stroke-width%3D%222.4%22%2F%3E%3Cellipse%20cx%3D%22100%22%20cy%3D%2244%22%20rx%3D%2216%22%20ry%3D%224.5%22%20fill%3D%22none%22%20stroke%3D%22%234a3222%22%20stroke-width%3D%222.4%22%2F%3E%3Cellipse%20cx%3D%22100%22%20cy%3D%22120%22%20rx%3D%2242%22%20ry%3D%227%22%20fill%3D%22none%22%20stroke%3D%22%234a3222%22%20stroke-width%3D%222.4%22%2F%3E%3Cpath%20d%3D%22M85%20100%20Q100%20106%20115%20100%22%20fill%3D%22none%22%20stroke%3D%22%234a3222%22%20stroke-width%3D%223%22%2F%3E%3Cpath%20d%3D%22M83%2085%20Q100%2092%20117%2085%22%20fill%3D%22none%22%20stroke%3D%22%234a3222%22%20stroke-width%3D%223%22%2F%3E%3Cpath%20d%3D%22M86%2070%20Q100%2076%20114%2070%22%20fill%3D%22none%22%20stroke%3D%22%234a3222%22%20stroke-width%3D%222.4%22%20opacity%3D%220.8%22%2F%3E%3Cpath%20d%3D%22M88%2042%20Q84%2034%2090%2028%22%20fill%3D%22none%22%20stroke%3D%22%234a3222%22%20stroke-width%3D%221.6%22%20opacity%3D%220.6%22%2F%3E%3Cpath%20d%3D%22M100%2042%20Q96%2032%20102%2024%22%20fill%3D%22none%22%20stroke%3D%22%234a3222%22%20stroke-width%3D%221.6%22%20opacity%3D%220.6%22%2F%3E%3Cpath%20d%3D%22M112%2042%20Q108%2034%20114%2028%22%20fill%3D%22none%22%20stroke%3D%22%234a3222%22%20stroke-width%3D%221.6%22%20opacity%3D%220.6%22%2F%3E%3C%2Fsvg%3E",
    categoryId: asId("cat_coffee"),
    name: { ru: "Латте", kk: "Латте", en: "Latte" },
    description: {
      ru: "Мягкий кофе с молоком, наш самый популярный выбор.",
      kk: "Сүтті жұмсақ кофе, ең танымал таңдау.",
      en: "Smooth milk coffee, our most popular choice.",
    },
    price: money(2100),
    allergens: ["milk"],
    isSeasonal: false,
    isNew: false,
    isMustTry: false,
    sortOrder: 3,
    availability: availableEverywhere,
  },
  {
    id: asId("prod_croissant_almond"),
    imageUrl:
      "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20200%20150%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22m4%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23f8edd6%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23ecd49e%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%22200%22%20height%3D%22150%22%20fill%3D%22url%28%23m4%29%22%2F%3E%3Cpath%20d%3D%22M50%2095%20Q60%2045%20100%2042%20Q140%2045%20150%2095%20Q130%2080%20112%2086%20Q122%2070%20108%2060%20Q104%2078%2090%2080%20Q94%2062%2080%2058%20Q78%2076%2066%2082%20Q68%2066%2058%2064%20Q56%2080%2050%2095%20Z%22%20fill%3D%22none%22%20stroke%3D%22%235c4420%22%20stroke-width%3D%222.4%22%20stroke-linejoin%3D%22round%22%2F%3E%3Ccircle%20cx%3D%2278%22%20cy%3D%2270%22%20r%3D%223%22%20fill%3D%22%238a5a26%22%2F%3E%3Ccircle%20cx%3D%2296%22%20cy%3D%2264%22%20r%3D%223%22%20fill%3D%22%238a5a26%22%2F%3E%3Ccircle%20cx%3D%22114%22%20cy%3D%2272%22%20r%3D%223%22%20fill%3D%22%238a5a26%22%2F%3E%3Ccircle%20cx%3D%2288%22%20cy%3D%2288%22%20r%3D%223%22%20fill%3D%22%238a5a26%22%2F%3E%3Ccircle%20cx%3D%22106%22%20cy%3D%2286%22%20r%3D%223%22%20fill%3D%22%238a5a26%22%2F%3E%3C%2Fsvg%3E",
    categoryId: asId("cat_pastry"),
    name: { ru: "Круассан миндальный", kk: "Бадам круассаны", en: "Almond croissant" },
    description: {
      ru: "Слоёное тесто, миндальный крем и хрустящая корочка.",
      kk: "Қабатты қамыр, бадам кремі және қытырлақ қабық.",
      en: "Laminated dough, almond cream and a crisp shell.",
    },
    price: money(2700),
    allergens: ["gluten", "nuts", "milk", "egg"],
    isSeasonal: false,
    isNew: false,
    isMustTry: true,
    sortOrder: 1,
    availability: availableEverywhere,
  },
  {
    id: asId("prod_croissant_classic"),
    imageUrl:
      "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20200%20150%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22m5%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23f8edd6%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23ecd49e%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%22200%22%20height%3D%22150%22%20fill%3D%22url%28%23m5%29%22%2F%3E%3Cpath%20d%3D%22M50%2095%20Q60%2045%20100%2042%20Q140%2045%20150%2095%20Q130%2080%20112%2086%20Q122%2070%20108%2060%20Q104%2078%2090%2080%20Q94%2062%2080%2058%20Q78%2076%2066%2082%20Q68%2066%2058%2064%20Q56%2080%2050%2095%20Z%22%20fill%3D%22none%22%20stroke%3D%22%235c4420%22%20stroke-width%3D%222.4%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E",
    categoryId: asId("cat_pastry"),
    name: {
      ru: "Круассан классический",
      kk: "Классикалық круассан",
      en: "Classic croissant",
    },
    description: {
      ru: "Французский рецепт, 27 слоёв масляного теста.",
      kk: "Француз рецепті, майлы қамырдың 27 қабаты.",
      en: "French recipe, 27 layers of butter dough.",
    },
    price: money(2200),
    allergens: ["gluten", "milk", "egg"],
    isSeasonal: false,
    isNew: false,
    isMustTry: false,
    sortOrder: 2,
    availability: availableEverywhere,
  },
  {
    id: asId("prod_mille_feuille"),
    imageUrl:
      "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20200%20150%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22m6%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23f3e1e6%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23dcb8c4%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%22200%22%20height%3D%22150%22%20fill%3D%22url%28%23m6%29%22%2F%3E%3Cpath%20d%3D%22M100%2038%20L145%20108%20Q100%20122%2055%20108%20Z%22%20fill%3D%22none%22%20stroke%3D%22%235a2f3d%22%20stroke-width%3D%222.4%22%20stroke-linejoin%3D%22round%22%2F%3E%3Cpath%20d%3D%22M92.65%2055.5%20Q100%2061.5%20107.35%2055.5%22%20fill%3D%22none%22%20stroke%3D%22%235a2f3d%22%20stroke-width%3D%222%22%2F%3E%3Cpath%20d%3D%22M85.3%2073.0%20Q100%2079.0%20114.7%2073.0%22%20fill%3D%22none%22%20stroke%3D%22%235a2f3d%22%20stroke-width%3D%222%22%2F%3E%3Cpath%20d%3D%22M77.95%2090.5%20Q100%2096.5%20122.05%2090.5%22%20fill%3D%22none%22%20stroke%3D%22%235a2f3d%22%20stroke-width%3D%222%22%2F%3E%3C%2Fsvg%3E",
    categoryId: asId("cat_dessert"),
    name: { ru: "Мильфей", kk: "Мильфей", en: "Mille-feuille" },
    description: {
      ru: "Хрустящие слои теста и ванильный заварной крем.",
      kk: "Қытырлақ қамыр қабаттары мен ванильді крем.",
      en: "Crisp pastry layers and vanilla pastry cream.",
    },
    price: money(3200),
    allergens: ["gluten", "milk", "egg"],
    isSeasonal: false,
    isNew: true,
    isMustTry: false,
    sortOrder: 1,
    availability: availableEverywhere,
  },
  {
    id: asId("prod_raspberry_tart"),
    imageUrl:
      "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20200%20150%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22m7%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23f3e1e6%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23dcb8c4%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%22200%22%20height%3D%22150%22%20fill%3D%22url%28%23m7%29%22%2F%3E%3Cpath%20d%3D%22M48%2092%20Q48%20108%20100%20108%20Q152%20108%20152%2092%20L146%2060%20Q100%2048%2054%2060%20Z%22%20fill%3D%22none%22%20stroke%3D%22%235a2f3d%22%20stroke-width%3D%222.4%22%2F%3E%3Cpath%20d%3D%22M54%2060%20Q100%2048%20146%2060%22%20fill%3D%22none%22%20stroke%3D%22%235a2f3d%22%20stroke-width%3D%222.4%22%2F%3E%3Ccircle%20cx%3D%2278%22%20cy%3D%2274%22%20r%3D%225%22%20fill%3D%22%23a23b52%22%2F%3E%3Ccircle%20cx%3D%22100%22%20cy%3D%2268%22%20r%3D%225%22%20fill%3D%22%23a23b52%22%2F%3E%3Ccircle%20cx%3D%22122%22%20cy%3D%2274%22%20r%3D%225%22%20fill%3D%22%23a23b52%22%2F%3E%3Ccircle%20cx%3D%2290%22%20cy%3D%2286%22%20r%3D%225%22%20fill%3D%22%23a23b52%22%2F%3E%3Ccircle%20cx%3D%22112%22%20cy%3D%2286%22%20r%3D%225%22%20fill%3D%22%23a23b52%22%2F%3E%3C%2Fsvg%3E",
    categoryId: asId("cat_dessert"),
    name: { ru: "Тарт с малиной", kk: "Таңқурай тарты", en: "Raspberry tart" },
    description: {
      ru: "Песочная основа, миндальный крем и свежая малина.",
      kk: "Құмды негіз, бадам кремі және жаңа таңқурай.",
      en: "Sable base, almond cream and fresh raspberries.",
    },
    price: money(3400),
    allergens: ["gluten", "nuts", "milk", "egg"],
    isSeasonal: true,
    isNew: false,
    isMustTry: false,
    sortOrder: 2,
    availability: availableEverywhere,
  },
  {
    id: asId("prod_petit_prince"),
    imageUrl:
      "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20200%20150%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22m8%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23f3e1e6%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23dcb8c4%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%22200%22%20height%3D%22150%22%20fill%3D%22url%28%23m8%29%22%2F%3E%3Cpath%20d%3D%22M58%20108%20Q58%2058%20100%2055%20Q142%2058%20142%20108%20Z%22%20fill%3D%22none%22%20stroke%3D%22%235a2f3d%22%20stroke-width%3D%222.4%22%2F%3E%3Cellipse%20cx%3D%22100%22%20cy%3D%22110%22%20rx%3D%2252%22%20ry%3D%228%22%20fill%3D%22none%22%20stroke%3D%22%235a2f3d%22%20stroke-width%3D%222.4%22%2F%3E%3Cpath%20d%3D%22M78%2072%20Q84%2062%2096%2060%22%20fill%3D%22none%22%20stroke%3D%22%235a2f3d%22%20stroke-width%3D%221.4%22%20opacity%3D%220.5%22%2F%3E%3Ccircle%20cx%3D%22100%22%20cy%3D%2258%22%20r%3D%226%22%20fill%3D%22%238a5a26%22%2F%3E%3C%2Fsvg%3E",
    categoryId: asId("cat_dessert"),
    name: {
      ru: "Десерт «Маленький принц»",
      kk: "«Кіші ханзада» десерты",
      en: "“Le Petit Prince” dessert",
    },
    description: {
      ru: "Шоколадный мусс, карамелизированный лесной орех и хрустящий пралине.",
      kk: "Шоколад муссы, карамельдендірілген жаңғақ және қытырлақ пралине.",
      en: "Chocolate mousse, caramelized hazelnut and crisp praline.",
    },
    price: money(3500),
    allergens: ["gluten", "nuts", "milk", "egg"],
    isSeasonal: false,
    isNew: false,
    isMustTry: true,
    sortOrder: 3,
    availability: availableEverywhere,
  },
];

export const collections: Collection[] = [
  {
    id: asId("col_book"),
    imageUrl:
      "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20200%20150%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22m9%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23f3e1e6%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23dcb8c4%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%22200%22%20height%3D%22150%22%20fill%3D%22url%28%23m9%29%22%2F%3E%3Crect%20x%3D%2252%22%20y%3D%2292%22%20width%3D%2296%22%20height%3D%2214%22%20rx%3D%222%22%20fill%3D%22none%22%20stroke%3D%22%235a2f3d%22%20stroke-width%3D%222.4%22%2F%3E%3Crect%20x%3D%2262%22%20y%3D%2280%22%20width%3D%2276%22%20height%3D%2212%22%20rx%3D%222%22%20fill%3D%22none%22%20stroke%3D%22%235a2f3d%22%20stroke-width%3D%222.4%22%2F%3E%3Cpath%20d%3D%22M78%2080%20Q78%2052%20100%2050%20Q122%2052%20122%2080%20Z%22%20fill%3D%22none%22%20stroke%3D%22%235a2f3d%22%20stroke-width%3D%222.4%22%2F%3E%3Ccircle%20cx%3D%22100%22%20cy%3D%2248%22%20r%3D%225%22%20fill%3D%22%238a5a26%22%2F%3E%3C%2Fsvg%3E",
    name: {
      ru: "The Book Collection",
      kk: "The Book Collection",
      en: "The Book Collection",
    },
    description: {
      ru: "Десерты, вдохновлённые любимыми историями.",
      kk: "Сүйікті әңгімелерден шабыттанған десерттер.",
      en: "Desserts inspired by beloved stories.",
    },
    productIds: [asId("prod_petit_prince"), asId("prod_mille_feuille")],
    featured: true,
  },
  {
    id: asId("col_autumn"),
    imageUrl:
      "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20200%20150%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22m10%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23f8e3c9%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23eab676%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%22200%22%20height%3D%22150%22%20fill%3D%22url%28%23m10%29%22%2F%3E%3Cpath%20d%3D%22M48%2092%20Q48%20108%20100%20108%20Q152%20108%20152%2092%20L146%2060%20Q100%2048%2054%2060%20Z%22%20fill%3D%22none%22%20stroke%3D%22%237a3b12%22%20stroke-width%3D%222.4%22%2F%3E%3Cpath%20d%3D%22M54%2060%20Q100%2048%20146%2060%22%20fill%3D%22none%22%20stroke%3D%22%237a3b12%22%20stroke-width%3D%222.4%22%2F%3E%3Cpath%20d%3D%22M100%2044%20Q112%2030%20126%2038%20Q118%2050%20106%2050%20Q98%2050%20100%2044%20Z%22%20fill%3D%22%23c9601f%22%20stroke%3D%22%237a3b12%22%20stroke-width%3D%221.2%22%2F%3E%3Ccircle%20cx%3D%2282%22%20cy%3D%2278%22%20r%3D%225%22%20fill%3D%22%23c9601f%22%2F%3E%3Ccircle%20cx%3D%22100%22%20cy%3D%2278%22%20r%3D%225%22%20fill%3D%22%23c9601f%22%2F%3E%3Ccircle%20cx%3D%22118%22%20cy%3D%2278%22%20r%3D%225%22%20fill%3D%22%23c9601f%22%2F%3E%3C%2Fsvg%3E",
    name: { ru: "Осенняя коллекция", kk: "Күз коллекциясы", en: "Autumn collection" },
    description: {
      ru: "Сезонные вкусы: малина, орех и карамель.",
      kk: "Маусымдық дәмдер: таңқурай, жаңғақ және карамель.",
      en: "Seasonal flavors: raspberry, hazelnut and caramel.",
    },
    productIds: [asId("prod_raspberry_tart")],
    featured: true,
    startsAt: "2026-09-01T00:00:00.000Z",
    endsAt: "2026-11-30T23:59:59.000Z",
  },
  {
    id: asId("col_must_try"),
    imageUrl:
      "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20200%20150%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22m11%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23f3e1e6%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23dcb8c4%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%22200%22%20height%3D%22150%22%20fill%3D%22url%28%23m11%29%22%2F%3E%3Cpath%20d%3D%22M48%2092%20Q48%20108%20100%20108%20Q152%20108%20152%2092%20L146%2060%20Q100%2048%2054%2060%20Z%22%20fill%3D%22none%22%20stroke%3D%22%235a2f3d%22%20stroke-width%3D%222.4%22%2F%3E%3Cpath%20d%3D%22M54%2060%20Q100%2048%20146%2060%22%20fill%3D%22none%22%20stroke%3D%22%235a2f3d%22%20stroke-width%3D%222.4%22%2F%3E%3Ccircle%20cx%3D%2278%22%20cy%3D%2274%22%20r%3D%225%22%20fill%3D%22%23a23b52%22%2F%3E%3Ccircle%20cx%3D%22100%22%20cy%3D%2268%22%20r%3D%225%22%20fill%3D%22%23a23b52%22%2F%3E%3Ccircle%20cx%3D%22122%22%20cy%3D%2274%22%20r%3D%225%22%20fill%3D%22%23a23b52%22%2F%3E%3Ccircle%20cx%3D%2290%22%20cy%3D%2286%22%20r%3D%225%22%20fill%3D%22%23a23b52%22%2F%3E%3Ccircle%20cx%3D%22112%22%20cy%3D%2286%22%20r%3D%225%22%20fill%3D%22%23a23b52%22%2F%3E%3C%2Fsvg%3E",
    name: { ru: "Must Try", kk: "Міндетті түрде көру керек", en: "Must Try" },
    productIds: [
      asId("prod_cappuccino"),
      asId("prod_croissant_almond"),
      asId("prod_petit_prince"),
    ],
    featured: false,
  },
];

export const promotions: Promotion[] = [
  {
    id: asId("promo_book_launch"),
    title: {
      ru: "Запуск The Book Collection",
      kk: "The Book Collection іске қосылуы",
      en: "The Book Collection launch",
    },
    description: {
      ru: "Двойные баллы за любой десерт из коллекции — весь сентябрь.",
      kk: "Коллекциядан кез келген десертке қос балл — қыркүйек бойы.",
      en: "Double points on any collection dessert — all September.",
    },
    discountKind: "bonus_points_multiplier",
    discountValue: 2,
    applicableProductIds: [asId("prod_petit_prince"), asId("prod_mille_feuille")],
    startsAt: "2026-09-01T00:00:00.000Z",
    endsAt: "2026-09-30T23:59:59.000Z",
    isActive: true,
  },
];

// -- Rewards ---------------------------------------------------------------

export const rewards: Reward[] = [
  {
    id: asId("rwd_cappuccino"),
    title: { ru: "Капучино", kk: "Капучино", en: "Cappuccino" },
    linkedProductId: asId("prod_cappuccino"),
    pointsCost: 1000,
    isActive: true,
    perCustomerLimit: 1,
    perCustomerLimitWindowDays: 1,
    stock: null,
  },
  {
    id: asId("rwd_croissant"),
    title: { ru: "Круассан", kk: "Круассан", en: "Croissant" },
    linkedProductId: asId("prod_croissant_classic"),
    pointsCost: 1800,
    isActive: true,
    perCustomerLimit: 1,
    perCustomerLimitWindowDays: 1,
    stock: null,
  },
  {
    id: asId("rwd_petit_prince"),
    title: {
      ru: "Десерт «Маленький принц»",
      kk: "«Кіші ханзада» десерты",
      en: "“Le Petit Prince” dessert",
    },
    linkedProductId: asId("prod_petit_prince"),
    pointsCost: 2500,
    isActive: true,
    perCustomerLimit: 1,
    perCustomerLimitWindowDays: 7,
    stock: null,
  },
];

// -- Staff -------------------------------------------------------------

export const staffUsers: StaffUser[] = [
  {
    id: asId("staff_aigerim"),
    displayName: "Айгерим",
    role: "BARISTA",
    locationId: locations[0]!.id,
    locationIds: [locations[0]!.id, locations[1]!.id],
    staffCode: "AIGERIM",
    active: true,
    createdAt: "2026-02-01T08:00:00.000Z",
  },
  {
    id: asId("staff_yerlan"),
    displayName: "Ерлан",
    role: "SHIFT_MANAGER",
    locationId: locations[0]!.id,
    locationIds: [locations[0]!.id],
    staffCode: "YERLAN",
    active: true,
    createdAt: "2026-01-15T08:00:00.000Z",
  },
  {
    id: asId("staff_dana"),
    displayName: "Дана",
    role: "ADMIN",
    locationId: locations[0]!.id,
    locationIds: [locations[0]!.id, locations[1]!.id],
    staffCode: "DANA01",
    email: "dana@lua.dev",
    active: true,
    createdAt: "2025-11-01T08:00:00.000Z",
  },
];

// -- Customers ---------------------------------------------------------

export const customers: CustomerProfile[] = [
  {
    id: asId("cust_nikolay"),
    firstName: "Николай",
    phone: "+7 701 234 56 78",
    email: "nikolay@example.com",
    birthDate: "1993-06-18",
    preferredLocale: "ru",
    homeLocationId: locations[0]!.id,
    createdAt: "2026-01-05T09:00:00.000Z",
    favoriteProductIds: [asId("prod_cappuccino"), asId("prod_petit_prince")],
    marketingOptIn: true,
  },
  {
    id: asId("cust_aizhan"),
    firstName: "Айжан",
    lastName: "Сатпаева",
    phone: "+7 707 555 12 34",
    preferredLocale: "kk",
    homeLocationId: locations[1]!.id,
    createdAt: "2026-02-11T09:00:00.000Z",
    favoriteProductIds: [asId("prod_latte")],
    marketingOptIn: true,
  },
  {
    id: asId("cust_maria"),
    firstName: "Мария",
    lastName: "Ким",
    phone: "+7 702 888 90 12",
    preferredLocale: "ru",
    homeLocationId: locations[0]!.id,
    createdAt: "2026-03-22T09:00:00.000Z",
    favoriteProductIds: [],
    marketingOptIn: false,
  },
];

function customerById(id: string): Customer {
  const found = customers.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown fixture customer: ${id}`);
  return found;
}

// -- Orders --------------------------------------------------------------
// Николай's order history. Each order's `pointsEarned` matches the
// "earn" ledger entry with the same orderId below — see loyaltyTransactions.

export const orders: Order[] = [
  {
    id: asId("ord_1"),
    customerId: customerById("cust_nikolay").id,
    locationId: locations[0]!.id,
    staffUserId: staffUsers[0]!.id,
    items: [
      {
        id: asId("item_1a"),
        productId: asId("prod_latte"),
        productName: "Латте",
        quantity: 1,
        unitPrice: money(2100),
        lineTotal: money(2100),
      },
      {
        id: asId("item_1b"),
        productId: asId("prod_mille_feuille"),
        productName: "Мильфей",
        quantity: 1,
        unitPrice: money(3200),
        lineTotal: money(3200),
      },
    ],
    subtotal: money(5300),
    discount: money(0),
    total: money(5300),
    status: "COMPLETED",
    pointsEarned: 265,
    createdAt: "2026-03-20T05:12:00.000Z",
    completedAt: "2026-03-20T05:15:00.000Z",
  },
  {
    id: asId("ord_2"),
    customerId: customerById("cust_nikolay").id,
    locationId: locations[0]!.id,
    staffUserId: staffUsers[0]!.id,
    items: [
      {
        id: asId("item_2a"),
        productId: asId("prod_espresso"),
        productName: "Эспрессо",
        quantity: 1,
        unitPrice: money(1200),
        lineTotal: money(1200),
      },
      {
        id: asId("item_2b"),
        productId: asId("prod_raspberry_tart"),
        productName: "Тарт с малиной",
        quantity: 1,
        unitPrice: money(3400),
        lineTotal: money(3400),
      },
      {
        id: asId("item_2c"),
        productId: asId("prod_croissant_classic"),
        productName: "Круассан классический",
        quantity: 1,
        unitPrice: money(2200),
        lineTotal: money(2200),
      },
    ],
    subtotal: money(6800),
    discount: money(0),
    total: money(6800),
    status: "COMPLETED",
    pointsEarned: 340,
    createdAt: "2026-05-30T12:40:00.000Z",
    completedAt: "2026-05-30T12:43:00.000Z",
  },
  {
    id: asId("ord_3"),
    customerId: customerById("cust_nikolay").id,
    locationId: locations[1]!.id,
    staffUserId: staffUsers[1]!.id,
    items: [
      {
        id: asId("item_3a"),
        productId: asId("prod_raspberry_tart"),
        productName: "Тарт с малиной",
        quantity: 1,
        unitPrice: money(3400),
        lineTotal: money(3400),
      },
      {
        id: asId("item_3b"),
        productId: asId("prod_mille_feuille"),
        productName: "Мильфей",
        quantity: 1,
        unitPrice: money(3200),
        lineTotal: money(3200),
      },
      {
        id: asId("item_3c"),
        productId: asId("prod_cappuccino"),
        productName: "Капучино",
        quantity: 1,
        unitPrice: money(1900),
        lineTotal: money(1900),
      },
    ],
    subtotal: money(8500),
    discount: money(0),
    total: money(8500),
    status: "COMPLETED",
    pointsEarned: 425,
    createdAt: "2026-08-10T07:05:00.000Z",
    completedAt: "2026-08-10T07:08:00.000Z",
  },
  {
    id: asId("ord_4"),
    customerId: customerById("cust_nikolay").id,
    locationId: locations[0]!.id,
    staffUserId: staffUsers[0]!.id,
    items: [
      {
        id: asId("item_4a"),
        productId: asId("prod_cappuccino"),
        productName: "Капучино",
        quantity: 1,
        unitPrice: money(1900),
        lineTotal: money(1900),
      },
      {
        id: asId("item_4b"),
        productId: asId("prod_croissant_almond"),
        productName: "Круассан миндальный",
        quantity: 1,
        unitPrice: money(2700),
        lineTotal: money(2700),
      },
      {
        id: asId("item_4c"),
        productId: asId("prod_petit_prince"),
        productName: "Десерт «Маленький принц»",
        quantity: 1,
        unitPrice: money(3500),
        lineTotal: money(3500),
      },
    ],
    subtotal: money(8100),
    discount: money(0),
    total: money(8100),
    status: "COMPLETED",
    pointsEarned: 405,
    createdAt: "2026-09-14T11:42:00.000Z",
    completedAt: "2026-09-14T11:45:00.000Z",
  },
];

// -- Reward redemptions --------------------------------------------------

export const rewardRedemptions: RewardRedemption[] = [
  {
    id: asId("redm_1"),
    rewardId: asId("rwd_petit_prince"),
    customerId: customerById("cust_nikolay").id,
    pointsCost: 2500,
    status: "FULFILLED",
    fulfilledByStaffId: staffUsers[0]!.id,
    fulfilledAt: "2026-07-22T09:31:00.000Z",
    loyaltyTransactionId: "ltx_redeem_1",
    createdAt: "2026-07-22T09:29:00.000Z",
    expiresAt: "2026-07-22T09:31:00.000Z",
  },
];

// -- Loyalty ledger --------------------------------------------------------
// Николай's full history. Balance is derived (never stored as the only
// number) — see balanceFromLedger. The line amounts below are the ones
// referenced throughout the product spec's example screens.

export const loyaltyTransactions: LoyaltyTransaction[] = [
  {
    id: asId("ltx_migration"),
    accountId: asId("acct_nikolay"),
    customerId: customerById("cust_nikolay").id,
    type: "manual_adjustment",
    points: 3353,
    reason: "Перенос баллов из предыдущей программы лояльности при запуске Lua Club",
    performedByStaffId: staffUsers[2]!.id,
    createdAt: "2026-01-05T04:05:00.000Z",
  },
  {
    id: asId("ltx_earn_1"),
    accountId: asId("acct_nikolay"),
    customerId: customerById("cust_nikolay").id,
    type: "earn",
    points: 265,
    orderId: asId("ord_1"),
    reason: "Покупка ord_1",
    idempotencyKey: "earn:ord_1",
    createdAt: "2026-03-20T05:15:00.000Z",
  },
  {
    id: asId("ltx_earn_2"),
    accountId: asId("acct_nikolay"),
    customerId: customerById("cust_nikolay").id,
    type: "earn",
    points: 340,
    orderId: asId("ord_2"),
    reason: "Покупка ord_2",
    idempotencyKey: "earn:ord_2",
    createdAt: "2026-05-30T12:43:00.000Z",
  },
  {
    id: asId("ltx_birthday"),
    accountId: asId("acct_nikolay"),
    customerId: customerById("cust_nikolay").id,
    type: "birthday_bonus",
    points: 1000,
    reason: "С днём рождения! Бонус Lua Club",
    createdAt: "2026-06-18T04:00:00.000Z",
  },
  {
    id: asId("ltx_redeem_1"),
    accountId: asId("acct_nikolay"),
    customerId: customerById("cust_nikolay").id,
    type: "redeem",
    points: -2500,
    rewardRedemptionId: asId("redm_1"),
    performedByStaffId: staffUsers[0]!.id,
    reason: "Списание: Десерт «Маленький принц»",
    idempotencyKey: "redemption:redm_1",
    createdAt: "2026-07-22T09:31:00.000Z",
  },
  {
    id: asId("ltx_earn_3"),
    accountId: asId("acct_nikolay"),
    customerId: customerById("cust_nikolay").id,
    type: "earn",
    points: 425,
    orderId: asId("ord_3"),
    reason: "Покупка ord_3",
    idempotencyKey: "earn:ord_3",
    createdAt: "2026-08-10T07:08:00.000Z",
  },
  {
    id: asId("ltx_earn_4"),
    accountId: asId("acct_nikolay"),
    customerId: customerById("cust_nikolay").id,
    type: "earn",
    points: 405,
    orderId: asId("ord_4"),
    reason: "Покупка ord_4",
    idempotencyKey: "earn:ord_4",
    createdAt: "2026-09-14T11:45:00.000Z",
  },
];

export function buildLoyaltyAccount(customerId: string): LoyaltyAccount {
  const txs = loyaltyTransactions.filter((t) => t.customerId === customerId);
  return {
    id: asId("acct_nikolay"),
    customerId: customerById(customerId).id,
    pointsBalance: balanceFromLedger(txs),
    lifetimePointsEarned: lifetimeEarnedFromLedger(txs),
    tier: "Lua",
    updatedAt: txs.at(-1)?.createdAt ?? new Date().toISOString(),
  };
}

export const loyaltyProgram = DEFAULT_LOYALTY_PROGRAM;
