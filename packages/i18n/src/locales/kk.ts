import type ruDict from "./ru";

type Dictionary = Record<keyof typeof ruDict, string>;

/**
 * Kazakh translations for the foundation UI chrome. Good enough to
 * prove the i18n plumbing end-to-end; not yet reviewed by a native
 * copywriter — flagged as a known limitation in docs/ARCHITECTURE.md.
 */
const kk: Dictionary = {
  "common.appName": "Lua",
  "common.loading": "Жүктелуде…",
  "common.error": "Бірдеңе дұрыс болмады",
  "common.retry": "Қайталау",
  "common.save": "Сақтау",
  "common.cancel": "Бас тарту",
  "common.confirm": "Растау",
  "common.back": "Артқа",
  "common.seeAll": "Барлығын көру",
  "common.comingSoon": "Жақында",
  "common.close": "Жабу",

  "nav.home": "Басты бет",
  "nav.menu": "Мәзір",
  "nav.club": "Lua Club",
  "nav.qr": "QR",
  "nav.orders": "Тапсырыстар",
  "nav.profile": "Профиль",

  "guest.home.heroEyebrow": "Lua Pastry Studio",
  "guest.home.heroTitle": "Қайта оралғың келетін кофе мен десерттер",
  "guest.home.heroSubtitle":
    "Алматыдағы студияларымызда әр таңертең дайындалатын жаңа өнім",
  "guest.home.mustTryTitle": "Міндетті түрде көру керек",
  "guest.home.collectionsTitle": "Коллекциялар",
  "guest.home.newTitle": "Жаңалықтар",
  "guest.home.clubCardTitle": "Lua Club",
  "guest.home.clubBalanceLabel": "Балл балансы",
  "guest.home.clubCta": "QR көрсету",

  "guest.menu.title": "Мәзір",
  "guest.menu.searchPlaceholder": "Сусын немесе десертті іздеу",
  "guest.menu.mustTry": "Міндетті түрде көру керек",
  "guest.menu.new": "Жаңа",
  "guest.menu.seasonal": "Маусымдық",
  "guest.menu.outOfStock": "Қоймада жоқ",
  "guest.menu.allergens": "Аллергендер",
  "guest.menu.empty": "Бұл санатта әзірге бос",

  "guest.club.title": "Lua Club",
  "guest.club.balanceLabel": "балл шотта",
  "guest.club.tierLabel": "Деңгей",
  "guest.club.rewardsTitle": "Баллға сыйлықтар",
  "guest.club.redeemButton": "Баллға алу",
  "guest.club.notEnoughPoints": "Балл жеткіліксіз",
  "guest.club.historyTitle": "Балл тарихы",
  "guest.club.birthdayBanner": "Туған күн айында — +1000 балл бонус",

  "guest.qr.title": "Менің QR-ым",
  "guest.qr.subtitle": "Балл алу үшін кассада осы кодты көрсетіңіз",
  "guest.qr.expiresIn": "Жаңарту уақыты",
  "guest.qr.refresh": "Кодты жаңарту",
  "guest.qr.expired": "Код мерзімі өтті",
  "guest.qr.rewardTitle": "Сыйлықты алуға арналған QR",
  "guest.qr.rewardSubtitle": "Алу үшін қызметкерге көрсетіңіз",

  "guest.orders.title": "Тапсырыстар тарихы",
  "guest.orders.empty": "Әзірге тапсырыс жоқ",
  "guest.orders.itemsLabel": "Тапсырыс құрамы",
  "guest.orders.totalLabel": "Барлығы",
  "guest.orders.earnedLabel": "Есептелді",
  "guest.orders.redeemedLabel": "Есептен шығарылды",
  "guest.orders.detailsTitle": "Тапсырыс мәліметтері",
  "guest.orders.locationLabel": "Нүкте",

  "guest.profile.title": "Профиль",
  "guest.profile.editButton": "Өзгерту",
  "guest.profile.addresses": "Кофехана мекенжайлары",
  "guest.profile.notifications": "Хабарландырулар",
  "guest.profile.language": "Тіл",
  "guest.profile.feedback": "Кері байланыс",
  "guest.profile.logout": "Шығу",
  "guest.profile.birthday": "Туған күні",
  "guest.profile.homeLocation": "Сүйікті кофехана",

  "staff.login.title": "Lua Staff",
  "staff.login.subtitle": "Ауысымды бастау үшін қызметкерді таңдаңыз",
  "staff.login.signIn": "Ауысымды бастау",

  "staff.home.greeting": "Ауысым басталды",
  "staff.home.scanButton": "QR сканерлеу",
  "staff.home.shiftLogButton": "Ауысым журналы",
  "staff.home.locationLabel": "Нүкте",

  "staff.scan.title": "Сканерлеу",
  "staff.scan.subtitle": "Камераны қонақтың QR-коды үшінен бағыттаңыз",
  "staff.scan.simulateButton": "Сканерлеуді симуляциялау (dev)",
  "staff.scan.customerBalance": "Баланс",
  "staff.scan.earnTitle": "Балл есептеу",
  "staff.scan.earnConfirm": "Сатып алуды растау",
  "staff.scan.redeemTitle": "Баллға сыйлық",
  "staff.scan.redeemCost": "Құны",
  "staff.scan.redeemConfirm": "Беруді растау",
  "staff.scan.success": "Дайын",
  "staff.scan.newScan": "Жаңа сканерлеу",

  "admin.nav.dashboard": "Дашборд",
  "admin.nav.menu": "Мәзір",
  "admin.nav.rewards": "Сыйлықтар",
  "admin.nav.loyalty": "Адалдық бағдарламасы",
  "admin.nav.customers": "Клиенттер",
  "admin.nav.orders": "Тапсырыстар",
  "admin.nav.staff": "Қызметкерлер",
  "admin.nav.settings": "Баптаулар",

  "admin.dashboard.title": "Дашборд",
  "admin.dashboard.revenueToday": "Бүгінгі түсім",
  "admin.dashboard.ordersToday": "Бүгінгі тапсырыстар",
  "admin.dashboard.activeMembers": "Белсенді Lua Club мүшелері",
  "admin.dashboard.pointsIssued": "Есептелген балл (30 күн)",
  "admin.dashboard.pointsRedeemed": "Есептен шығарылған балл (30 күн)",
  "admin.dashboard.recentOrders": "Соңғы тапсырыстар",

  "admin.menu.title": "Мәзір",
  "admin.rewards.title": "Сыйлықтар",
  "admin.loyalty.title": "Адалдық бағдарламасы",
  "admin.loyalty.earnRate": "Есептеу мөлшерлемесі",
  "admin.customers.title": "Клиенттер",
  "admin.orders.title": "Тапсырыстар",
  "admin.staff.title": "Қызметкерлер",
  "admin.settings.title": "Баптаулар",
};

export default kk;
