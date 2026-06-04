import { sql } from "drizzle-orm";
import { pgTable, varchar, timestamp, boolean, integer, numeric, text, index, pgEnum } from "drizzle-orm/pg-core";

// ==================== 枚举定义 ====================

// 用户角色枚举
export const userRoleEnum = pgEnum("user_role", ["admin", "provider", "member", "branch"]);

// 订单状态枚举
export const orderStatusEnum = pgEnum("order_status", ["pending", "paid", "completed", "cancelled"]);

// 产品状态枚举
export const productStatusEnum = pgEnum("product_status", ["available", "sold", "pending_sell", "unlisted", "pending_match"]);

// 用户产品状态枚举
export const userProductStatusEnum = pgEnum("user_product_status", ["holding", "sold", "pending_sell", "pending_confirm", "cancelled", "transferred"]);

// 交易类型枚举
export const transactionTypeEnum = pgEnum("transaction_type", [
  "recharge",
  "withdraw",
  "buy_product",
  "sell_product",
  "transfer_in",
  "transfer_out",
  "market_fee",
  "profit"
]);

// ==================== 系统表（必须保留） ====================

export const healthCheck = pgTable("health_check", {
  id: integer().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// ==================== 用户表 ====================

// @ts-expect-error: TypeScript cannot infer self-referencing table type in strict mode
export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    username: varchar("username", { length: 50 }).notNull().unique(),
    password: varchar("password", { length: 255 }).notNull(),
    role: userRoleEnum("role").notNull().default("member"),
    phone: varchar("phone", { length: 20 }),
    real_name: varchar("real_name", { length: 50 }),
    alipay_account: varchar("alipay_account", { length: 100 }),
    invite_code: varchar("invite_code", { length: 20 }).unique(),
    
    // 关联关系
    provider_id: varchar("provider_id", { length: 36 }).references(// @ts-expect-error: Self-referencing table
      () => users.id),
    inviter_id: varchar("inviter_id", { length: 36 }).references(
      () => users.id),
    branch_id: varchar("branch_id", { length: 36 }).references(
      () => users.id),
    
    // 资产
    energy_value: numeric("energy_value", { precision: 12, scale: 2 }).notNull().default("0"),
    balance: numeric("balance", { precision: 12, scale: 2 }).notNull().default("0"),
    points: numeric("points", { precision: 12, scale: 2 }).notNull().default("0"), // 积分
    
    // 状态
    is_active: boolean("is_active").notNull().default(true),
    
    // 时间戳
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("users_username_idx").on(table.username),
    index("users_role_idx").on(table.role),
    index("users_provider_id_idx").on(table.provider_id),
    index("users_inviter_id_idx").on(table.inviter_id),
    index("users_invite_code_idx").on(table.invite_code),
  ]
);

// ==================== 产品表 ====================

export const products = pgTable(
  "products",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    
    // 基本信息
    name: varchar("name", { length: 100 }).notNull(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    image_url: varchar("image_url", { length: 500 }),
    
    // 价格与收益
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    period: integer("period").notNull(), // 天数：3/7/15/30/90
    total_rate: numeric("total_rate", { precision: 5, scale: 2 }).notNull(), // 总收益率百分比
    market_rate: numeric("market_rate", { precision: 5, scale: 2 }).notNull(), // 释放费率
    profit_rate: numeric("profit_rate", { precision: 5, scale: 2 }).notNull(), // 收益率
    
    // 所属服务商（NULL 表示平台产品）
    provider_id: varchar("provider_id", { length: 36 }).references(() => users.id),
    
    // 状态
    status: productStatusEnum("status").notNull().default("available"),
    
    // 时间戳
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("products_code_idx").on(table.code),
    index("products_provider_id_idx").on(table.provider_id),
    index("products_status_idx").on(table.status),
  ]
);

// ==================== 用户产品表（会员持有的产品） ====================

export const userProducts = pgTable(
  "user_products",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    
    // 关联
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
    product_id: varchar("product_id", { length: 36 }).notNull().references(() => products.id),
    
    // 购买信息
    purchase_price: numeric("purchase_price", { precision: 12, scale: 2 }).notNull(),
    purchase_date: timestamp("purchase_date", { withTimezone: true }).notNull(),
    expire_date: timestamp("expire_date", { withTimezone: true }).notNull(),
    
    // 收益信息
    expected_profit: numeric("expected_profit", { precision: 12, scale: 2 }).notNull(),
    market_fee: numeric("market_fee", { precision: 12, scale: 2 }).notNull(),
    
    // 状态：holding(持有中), sold(已卖出), pending_sell(待审核卖出)
    status: userProductStatusEnum("status").notNull().default("holding"),
    
    // 卖出信息
    sell_price: numeric("sell_price", { precision: 12, scale: 2 }),
    sell_date: timestamp("sell_date", { withTimezone: true }),
    
    // 时间戳
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("user_products_user_id_idx").on(table.user_id),
    index("user_products_product_id_idx").on(table.product_id),
    index("user_products_status_idx").on(table.status),
    index("user_products_expire_date_idx").on(table.expire_date),
  ]
);

// ==================== 订单表 ====================

export const orders = pgTable(
  "orders",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    
    // 关联
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
    user_product_id: varchar("user_product_id", { length: 36 }).references(() => userProducts.id),
    
    // 订单信息
    order_type: varchar("order_type", { length: 20 }).notNull(), // buy/sell
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    
    // 状态：pending(待支付), paid(已支付), completed(已完成), cancelled(已取消)
    status: orderStatusEnum("status").notNull().default("pending"),
    
    // 审核信息（卖出订单）
    reviewed_by: varchar("reviewed_by", { length: 36 }).references(() => users.id),
    reviewed_at: timestamp("reviewed_at", { withTimezone: true }),
    review_note: text("review_note"),
    
    // 时间戳
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("orders_user_id_idx").on(table.user_id),
    index("orders_status_idx").on(table.status),
    index("orders_order_type_idx").on(table.order_type),
    index("orders_created_at_idx").on(table.created_at),
  ]
);

// ==================== 服务商配置表 ====================

export const providers = pgTable(
  "providers",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    
    // 关联用户
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id).unique(),
    
    // 额度管理
    quota: numeric("quota", { precision: 12, scale: 2 }).notNull().default("0"), // 总额度
    used_quota: numeric("used_quota", { precision: 12, scale: 2 }).notNull().default("0"), // 已用额度
    
    // 销售统计
    total_sales: numeric("total_sales", { precision: 12, scale: 2 }).notNull().default("0"), // 累计销售额
    
    // 拆分次数
    split_count: integer("split_count").notNull().default(0),
    
    // 状态
    is_active: boolean("is_active").notNull().default(true),
    
    // 时间戳
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("providers_user_id_idx").on(table.user_id),
  ]
);

// ==================== 交易记录表 ====================

export const transactions = pgTable(
  "transactions",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    
    // 关联
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
    order_id: varchar("order_id", { length: 36 }).references(() => orders.id),
    
    // 交易信息
    type: transactionTypeEnum("type").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    balance_before: numeric("balance_before", { precision: 12, scale: 2 }),
    balance_after: numeric("balance_after", { precision: 12, scale: 2 }),
    
    // 描述
    description: text("description"),
    
    // 时间戳
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("transactions_user_id_idx").on(table.user_id),
    index("transactions_type_idx").on(table.type),
    index("transactions_created_at_idx").on(table.created_at),
  ]
);

// ==================== 提现记录表 ====================

export const withdrawals = pgTable(
  "withdrawals",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    
    // 关联
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
    
    // 提现信息
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    alipay_account: varchar("alipay_account", { length: 100 }).notNull(),
    real_name: varchar("real_name", { length: 50 }).notNull(),
    
    // 状态
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending/approved/rejected/completed
    
    // 审核信息
    reviewed_by: varchar("reviewed_by", { length: 36 }).references(() => users.id),
    reviewed_at: timestamp("reviewed_at", { withTimezone: true }),
    review_note: text("review_note"),
    
    // 时间戳
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("withdrawals_user_id_idx").on(table.user_id),
    index("withdrawals_status_idx").on(table.status),
    index("withdrawals_created_at_idx").on(table.created_at),
  ]
);

// ==================== 系统配置表 ====================

export const systemConfig = pgTable(
  "system_config",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    
    // 配置键值
    key: varchar("key", { length: 100 }).notNull().unique(),
    value: text("value").notNull(),
    description: text("description"),
    
    // 时间戳
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("system_config_key_idx").on(table.key),
  ]
);

// ==================== 服务网点配置表 ====================

export const branches = pgTable(
  "branches",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id).unique(),
    quota: numeric("quota", { precision: 12, scale: 2 }).notNull().default("0"),
    used_quota: numeric("used_quota", { precision: 12, scale: 2 }).notNull().default("0"),
    total_sales: numeric("total_sales", { precision: 12, scale: 2 }).notNull().default("0"),
    is_active: boolean("is_active").notNull().default(true),
  },
  (table) => [
    index("branches_user_id_idx").on(table.user_id),
  ]
);

// ==================== 额度申请表 ====================

export const quotaApplications = pgTable(
  "quota_applications",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
    apply_type: varchar("apply_type", { length: 20 }).notNull(),
    quota_request: numeric("quota_request", { precision: 12, scale: 2 }).notNull(),
    quota_approved: numeric("quota_approved", { precision: 12, scale: 2 }).notNull().default("0"),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    reviewed_by: varchar("reviewed_by", { length: 36 }).references(() => users.id),
    reviewed_at: timestamp("reviewed_at", { withTimezone: true }),
    review_note: text("review_note"),
  },
  (table) => [
    index("quota_applications_user_id_idx").on(table.user_id),
    index("quota_applications_status_idx").on(table.status),
  ]
);

// ==================== 升级申请表 ====================

export const upgradeApplications = pgTable(
  "upgrade_applications",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
    apply_type: varchar("apply_type", { length: 20 }).notNull(),
    branch_review: varchar("branch_review", { length: 20 }).notNull().default("pending"),
    branch_reviewed_by: varchar("branch_reviewed_by", { length: 36 }).references(() => users.id),
    branch_reviewed_at: timestamp("branch_reviewed_at", { withTimezone: true }),
    admin_review: varchar("admin_review", { length: 20 }).notNull().default("pending"),
    admin_reviewed_by: varchar("admin_reviewed_by", { length: 36 }).references(() => users.id),
    admin_reviewed_at: timestamp("admin_reviewed_at", { withTimezone: true }),
    review_note: text("review_note"),
  },
  (table) => [
    index("upgrade_applications_user_id_idx").on(table.user_id),
    index("upgrade_applications_branch_review_idx").on(table.branch_review),
    index("upgrade_applications_admin_review_idx").on(table.admin_review),
  ]
);

// ==================== 消息通知表 ====================

export const notifications = pgTable(
  "notifications",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
    type: varchar("type", { length: 20 }).notNull(),
    title: varchar("title", { length: 100 }).notNull(),
    content: text("content").notNull(),
    is_read: boolean("is_read").notNull().default(false),
  },
  (table) => [
    index("notifications_user_id_idx").on(table.user_id),
    index("notifications_is_read_idx").on(table.is_read),
  ]
);

// ==================== 类型导出 ====================

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

export type UserProduct = typeof userProducts.$inferSelect;
export type InsertUserProduct = typeof userProducts.$inferInsert;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

export type Provider = typeof providers.$inferSelect;
export type InsertProvider = typeof providers.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

export type Withdrawal = typeof withdrawals.$inferSelect;
export type InsertWithdrawal = typeof withdrawals.$inferInsert;

export type SystemConfig = typeof systemConfig.$inferSelect;
export type InsertSystemConfig = typeof systemConfig.$inferInsert;

export type Branch = typeof branches.$inferSelect;
export type InsertBranch = typeof branches.$inferInsert;

export type QuotaApplication = typeof quotaApplications.$inferSelect;
export type InsertQuotaApplication = typeof quotaApplications.$inferInsert;

export type UpgradeApplication = typeof upgradeApplications.$inferSelect;
export type InsertUpgradeApplication = typeof upgradeApplications.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
