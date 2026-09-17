import { createIcon } from "./Icon";

export const HomeIcon = createIcon(
  <>
    <path d="M4 11.5 12 4l8 7.5" />
    <path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" />
  </>,
);

export const MenuIcon = createIcon(
  <>
    <path d="M7 3c-1.4 2-1.8 5-1.8 7.5S5.6 16 7 17" />
    <path d="M7 3v18" />
    <path d="M13 3v7a2 2 0 0 0 2 2v9" />
    <path d="M17 3v6" />
  </>,
);

export const ClubIcon = createIcon(
  <>
    <path d="M12 20s-7-4.35-9.3-8.7C1.2 8.2 3 5 6.3 5c1.9 0 3.3 1 3.7 2.4C10.4 6 11.8 5 13.7 5 17 5 18.8 8.2 17.3 11.3 15 15.65 12 20 12 20Z" />
  </>,
);

export const QrIcon = createIcon(
  <>
    <rect x="3.5" y="3.5" width="6" height="6" rx="1" />
    <rect x="14.5" y="3.5" width="6" height="6" rx="1" />
    <rect x="3.5" y="14.5" width="6" height="6" rx="1" />
    <path d="M14.5 14.5h2.5v2.5" />
    <path d="M20.5 14.5v2.5" />
    <path d="M17.5 20.5h3" />
    <path d="M14.5 20.5v-2" />
  </>,
);

export const OrdersIcon = createIcon(
  <>
    <path d="M6 3h12v17.2c0 .6-.6 1-1.2.8l-1.8-.7-1.8.7a1 1 0 0 1-.7 0l-1.8-.7-1.8.7a1 1 0 0 1-.7 0l-1.8-.7-1.8.7C6.6 21.2 6 20.8 6 20.2Z" />
    <path d="M9 8h6" />
    <path d="M9 12h6" />
  </>,
);

export const ProfileIcon = createIcon(
  <>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4.5 20c1.4-3.6 4.3-5.5 7.5-5.5s6.1 1.9 7.5 5.5" />
  </>,
);

export const SearchIcon = createIcon(
  <>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m20 20-4.3-4.3" />
  </>,
);

export const ChevronRightIcon = createIcon(<path d="m9 5 7 7-7 7" />);
export const ChevronLeftIcon = createIcon(<path d="m15 5-7 7 7 7" />);

export const CheckIcon = createIcon(<path d="M5 12.5 10 17 19 7" />);

export const CloseIcon = createIcon(
  <>
    <path d="M6 6l12 12" />
    <path d="M18 6 6 18" />
  </>,
);

export const ScanIcon = createIcon(
  <>
    <path d="M4 8V6a2 2 0 0 1 2-2h2" />
    <path d="M16 4h2a2 2 0 0 1 2 2v2" />
    <path d="M20 16v2a2 2 0 0 1-2 2h-2" />
    <path d="M8 20H6a2 2 0 0 1-2-2v-2" />
    <path d="M4 12h16" />
  </>,
);

export const BellIcon = createIcon(
  <>
    <path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10Z" />
    <path d="M9.5 18.5a2.5 2.5 0 0 0 5 0" />
  </>,
);

export const StarIcon = createIcon(
  <path d="m12 3 2.6 5.9 6.4.6-4.8 4.3 1.4 6.3L12 16.9 6.4 20.1l1.4-6.3-4.8-4.3 6.4-.6Z" />,
);

export const ArrowLeftIcon = createIcon(
  <>
    <path d="M19 12H5" />
    <path d="m11 6-6 6 6 6" />
  </>,
);

export const GiftIcon = createIcon(
  <>
    <rect x="4" y="9" width="16" height="11" rx="1" />
    <path d="M4 9h16v3.5H4Z" />
    <path d="M12 9v11" />
    <path d="M12 9c-1-3-3.5-4.5-5-3-1.2 1.2 0 3 2.2 3Z" />
    <path d="M12 9c1-3 3.5-4.5 5-3 1.2 1.2 0 3-2.2 3Z" />
  </>,
);

export const ClockIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </>,
);

export const LocationIcon = createIcon(
  <>
    <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </>,
);

export const PlusIcon = createIcon(
  <>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </>,
);

export const LogOutIcon = createIcon(
  <>
    <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
    <path d="M15 16l4-4-4-4" />
    <path d="M19 12H9" />
  </>,
);

export const UsersIcon = createIcon(
  <>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 19c1.1-3.1 3.2-4.7 5.5-4.7s4.4 1.6 5.5 4.7" />
    <path d="M15.5 6.5a3 3 0 0 1 0 5.8" />
    <path d="M17.5 14.3c1.7.6 2.9 2 3.6 4.2" />
  </>,
);

export const SettingsIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.6V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.6 1H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1Z" />
  </>,
);

export const DashboardIcon = createIcon(
  <>
    <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.2" />
    <rect x="13" y="3.5" width="7.5" height="4.5" rx="1.2" />
    <rect x="13" y="10" width="7.5" height="10.5" rx="1.2" />
    <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.2" />
  </>,
);

export const GlobeIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17" />
    <path d="M12 3.5c2.4 2.3 3.7 5.3 3.7 8.5s-1.3 6.2-3.7 8.5c-2.4-2.3-3.7-5.3-3.7-8.5S9.6 5.8 12 3.5Z" />
  </>,
);

export const MoreIcon = createIcon(
  <>
    <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" />
  </>,
);
