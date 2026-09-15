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
    address: "пр. Достык, 89",
    city: "Алматы",
    openHours: "08:00–22:00",
    phone: "+7 727 000 11 22",
    isActive: true,
  },
  {
    id: asId("loc_kok_tobe"),
    name: "Lua Pastry Studio — Кок-Тобе",
    address: "ул. Достоевского, 1/1",
    city: "Алматы",
    openHours: "09:00–21:00",
    phone: "+7 727 000 33 44",
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
    availability: availableEverywhere,
  },
  {
    id: asId("prod_cappuccino"),
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
    availability: availableEverywhere,
  },
  {
    id: asId("prod_latte"),
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
    availability: availableEverywhere,
  },
  {
    id: asId("prod_croissant_almond"),
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
    availability: availableEverywhere,
  },
  {
    id: asId("prod_croissant_classic"),
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
    availability: availableEverywhere,
  },
  {
    id: asId("prod_mille_feuille"),
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
    availability: availableEverywhere,
  },
  {
    id: asId("prod_raspberry_tart"),
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
    availability: availableEverywhere,
  },
  {
    id: asId("prod_petit_prince"),
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
    availability: availableEverywhere,
  },
];

export const collections: Collection[] = [
  {
    id: asId("col_book"),
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
    active: true,
    createdAt: "2026-02-01T08:00:00.000Z",
  },
  {
    id: asId("staff_yerlan"),
    displayName: "Ерлан",
    role: "SHIFT_MANAGER",
    locationId: locations[0]!.id,
    active: true,
    createdAt: "2026-01-15T08:00:00.000Z",
  },
  {
    id: asId("staff_dana"),
    displayName: "Дана",
    role: "ADMIN",
    locationId: locations[0]!.id,
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
