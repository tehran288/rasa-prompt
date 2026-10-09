import type {
  AnalyticsService,
  CatalogService,
  CreditService,
  EntitlementService,
  IntelStore,
  OrderService,
  Platform,
  ProductService,
  ReferralService,
  SettingsService,
  TicketService,
  UserService,
} from "@rasa/shared";
import type { Db } from "../db";
import { createAnalyticsService } from "./analytics";
import { createCatalogService } from "./catalog";
import { createCreditService } from "./credits";
import { createEntitlementService } from "./entitlements";
import { createIntelStore } from "./intel";
import { createOrderService } from "./orders";
import { createProductService } from "./products";
import { createReferralService } from "./referrals";
import { createSettingsService } from "./settings";
import { createTicketService } from "./tickets";
import { createUserService } from "./users";

export interface ServicesOptions {
  /** Credits given to BOTH referrer and referred user after the first paid order (env REFERRAL_REWARD_CREDITS). */
  referralRewardCredits?: number;
  /** Platform user ids treated as admins (env TELEGRAM_ADMIN_IDS / BALE_ADMIN_IDS). */
  adminIds?: Partial<Record<Platform, string[]>>;
}

export interface Services {
  catalog: CatalogService;
  users: UserService;
  entitlements: EntitlementService;
  credits: CreditService;
  products: ProductService;
  orders: OrderService;
  referrals: ReferralService;
  tickets: TicketService;
  analytics: AnalyticsService;
  settings: SettingsService;
  intel: IntelStore;
}

export function createServices(db: Db, opts: ServicesOptions = {}): Services {
  return {
    catalog: createCatalogService(db),
    users: createUserService(db, { adminIds: opts.adminIds ?? {} }),
    entitlements: createEntitlementService(db),
    credits: createCreditService(db),
    products: createProductService(db),
    orders: createOrderService(db),
    referrals: createReferralService(db, opts.referralRewardCredits ?? 50),
    tickets: createTicketService(db),
    analytics: createAnalyticsService(db),
    settings: createSettingsService(db),
    intel: createIntelStore(db),
  };
}
