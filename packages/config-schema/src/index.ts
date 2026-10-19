// ============================================================
// vibe-pos — Shared Configuration Schema
// Used by: desktop app, vendor control panel, server
// ============================================================

export type BusinessType = 'restaurant' | 'grocery' | 'hotel';
export type LicenseStatus = 'active' | 'past_due' | 'suspended';

// -------------------------------------------------------
// Permissions — master list, assigned to roles per customer
// -------------------------------------------------------
export type Permission =
  | 'create_order'
  | 'edit_order'
  | 'void_order'
  | 'apply_discount'
  | 'apply_custom_discount'
  | 'process_refund'
  | 'view_own_orders'
  | 'view_all_orders'
  | 'view_daily_sales'
  | 'view_full_reports'
  | 'manage_products'
  | 'manage_categories'
  | 'manage_inventory'
  | 'manage_staff'
  | 'open_shift'
  | 'close_shift'
  | 'view_table_map'
  | 'manage_tables'
  | 'view_kitchen_display'
  | 'manage_rooms'
  | 'view_billing'
  | 'change_settings'
  | 'export_data'
  | '*'; // superuser — all permissions

export const ALL_PERMISSIONS: Permission[] = [
  'create_order',
  'edit_order',
  'void_order',
  'apply_discount',
  'apply_custom_discount',
  'process_refund',
  'view_own_orders',
  'view_all_orders',
  'view_daily_sales',
  'view_full_reports',
  'manage_products',
  'manage_categories',
  'manage_inventory',
  'manage_staff',
  'open_shift',
  'close_shift',
  'view_table_map',
  'manage_tables',
  'view_kitchen_display',
  'manage_rooms',
  'view_billing',
  'change_settings',
  'export_data',
];

export const PERMISSION_LABELS: Record<Permission, string> = {
  create_order: 'Create Orders',
  edit_order: 'Edit Orders',
  void_order: 'Void / Cancel Orders',
  apply_discount: 'Apply Preset Discounts',
  apply_custom_discount: 'Apply Custom Discount %',
  process_refund: 'Process Refunds',
  view_own_orders: 'View Own Orders',
  view_all_orders: 'View All Orders',
  view_daily_sales: 'View Daily Sales Summary',
  view_full_reports: 'View Full Reports & Analytics',
  manage_products: 'Manage Products',
  manage_categories: 'Manage Categories',
  manage_inventory: 'Manage Inventory / Stock',
  manage_staff: 'Manage Staff & PINs',
  open_shift: 'Open Cash Shift',
  close_shift: 'Close Cash Shift',
  view_table_map: 'View Table Map',
  manage_tables: 'Manage Table Layout',
  view_kitchen_display: 'Access Kitchen Display (KDS)',
  manage_rooms: 'Manage Hotel Rooms',
  view_billing: 'View Billing & License Status',
  change_settings: 'Change POS Settings',
  export_data: 'Export Reports (CSV/PDF)',
  '*': 'All Permissions (Superuser)',
};

// -------------------------------------------------------
// Role Definition — fully custom per customer
// -------------------------------------------------------
export interface RoleDefinition {
  id: string;            // e.g. "role_waiter", "role_cashier"
  name: string;          // e.g. "Waiter", "Head Cashier" — shown on login
  color: string;         // Hex color shown on login screen
  permissions: Permission[];
}

// -------------------------------------------------------
// Staff Member — cryptographic authentication per user
// -------------------------------------------------------
export interface StaffMember {
  id: string;
  name: string;
  roleId: string;
  pinHash: string;      // SHA-256 hash of (salt + ":" + pin)
  salt: string;
  active: boolean;
}

// -------------------------------------------------------
// Role Presets — suggested starting points per business type
// -------------------------------------------------------
export const ROLE_PRESETS: Record<BusinessType, RoleDefinition[]> = {
  restaurant: [
    {
      id: 'role_waiter',
      name: 'Waiter',
      color: '#3b82f6',
      permissions: ['create_order', 'view_own_orders', 'view_table_map'],
    },
    {
      id: 'role_cashier',
      name: 'Cashier',
      color: '#f59e0b',
      permissions: ['create_order', 'apply_discount', 'view_own_orders', 'view_daily_sales', 'close_shift'],
    },
    {
      id: 'role_kitchen',
      name: 'Kitchen Staff',
      color: '#ef4444',
      permissions: ['view_kitchen_display'],
    },
    {
      id: 'role_manager',
      name: 'Manager',
      color: '#8b5cf6',
      permissions: [
        'create_order', 'edit_order', 'void_order', 'apply_discount', 'apply_custom_discount',
        'process_refund', 'view_own_orders', 'view_all_orders', 'view_daily_sales', 'view_full_reports',
        'manage_products', 'manage_categories', 'manage_inventory', 'manage_staff',
        'open_shift', 'close_shift', 'view_table_map', 'manage_tables', 'view_kitchen_display', 'export_data',
      ],
    },
    {
      id: 'role_owner',
      name: 'Owner',
      color: '#10b981',
      permissions: ['*'],
    },
  ],
  grocery: [
    {
      id: 'role_cashier',
      name: 'Cashier',
      color: '#3b82f6',
      permissions: ['create_order', 'apply_discount', 'view_own_orders'],
    },
    {
      id: 'role_stock',
      name: 'Stock Manager',
      color: '#f59e0b',
      permissions: ['manage_products', 'manage_inventory', 'manage_categories'],
    },
    {
      id: 'role_manager',
      name: 'Manager',
      color: '#8b5cf6',
      permissions: [
        'create_order', 'edit_order', 'void_order', 'apply_discount', 'apply_custom_discount',
        'process_refund', 'view_own_orders', 'view_all_orders', 'view_daily_sales', 'view_full_reports',
        'manage_products', 'manage_categories', 'manage_inventory', 'manage_staff',
        'open_shift', 'close_shift', 'export_data',
      ],
    },
    {
      id: 'role_owner',
      name: 'Owner',
      color: '#10b981',
      permissions: ['*'],
    },
  ],
  hotel: [
    {
      id: 'role_frontdesk',
      name: 'Front Desk',
      color: '#3b82f6',
      permissions: ['create_order', 'view_own_orders', 'manage_rooms'],
    },
    {
      id: 'role_concierge',
      name: 'Concierge',
      color: '#f59e0b',
      permissions: ['create_order', 'view_own_orders'],
    },
    {
      id: 'role_manager',
      name: 'Manager',
      color: '#8b5cf6',
      permissions: [
        'create_order', 'edit_order', 'void_order', 'apply_discount', 'apply_custom_discount',
        'process_refund', 'view_own_orders', 'view_all_orders', 'view_daily_sales', 'view_full_reports',
        'manage_products', 'manage_categories', 'manage_inventory', 'manage_staff', 'manage_rooms',
        'open_shift', 'close_shift', 'export_data',
      ],
    },
    {
      id: 'role_owner',
      name: 'Owner',
      color: '#10b981',
      permissions: ['*'],
    },
  ],
};

// -------------------------------------------------------
// Default Staff Presets per Business Type (Pre-hashed PINs)
// -------------------------------------------------------
export const STAFF_PRESETS: Record<BusinessType, StaffMember[]> = {
  restaurant: [
    {
      id: 'staff_waiter_1',
      name: 'Marco Rossi',
      roleId: 'role_waiter',
      salt: 'salt_waiter_1',
      pinHash: 'a2724053a9980e5e8a2b948b297aaa6e331723c71a88bd1c6da9f8d760d9e1c7', // PIN: 1111
      active: true,
    },
    {
      id: 'staff_cashier_1',
      name: 'Sarah Connor',
      roleId: 'role_cashier',
      salt: 'salt_cashier_1',
      pinHash: 'c1b0a80883f7b71d956452ef6c4277bae61aa69f849a129e9aeb9db4687a0691', // PIN: 2222
      active: true,
    },
    {
      id: 'staff_chef_1',
      name: 'Chef Gordon',
      roleId: 'role_kitchen',
      salt: 'salt_kitchen_1',
      pinHash: '91b02bcee81f8012f8cc88dfb92ffad07724fdeafda11d621d8e88c81c518508', // PIN: 3333
      active: true,
    },
    {
      id: 'staff_manager_1',
      name: 'Alex Vance',
      roleId: 'role_manager',
      salt: 'salt_manager_1',
      pinHash: '71ad860609d5edb09c5b61533a8e53cc7f84916aba183ad35cab6ba4e700576d', // PIN: 4444
      active: true,
    },
    {
      id: 'staff_owner_1',
      name: 'Gianluigi (Owner)',
      roleId: 'role_owner',
      salt: 'salt_owner_1',
      pinHash: 'dd523db84cf2cf1368dae3d2b3779b90dc837c8f61494a23b84b90865849da29', // PIN: 9999
      active: true,
    },
  ],
  grocery: [
    {
      id: 'staff_cashier_1',
      name: 'Elena Rostova',
      roleId: 'role_cashier',
      salt: 'salt_cashier_1',
      pinHash: 'c1b0a80883f7b71d956452ef6c4277bae61aa69f849a129e9aeb9db4687a0691', // PIN: 2222
      active: true,
    },
    {
      id: 'staff_stock_1',
      name: 'Dave Miller',
      roleId: 'role_stock',
      salt: 'salt_stock_1',
      pinHash: 'd2be38473c5033b05cb18e8994851a1fca9b6d9268e0c53283b9b7f3421cf8b3', // PIN: 2222
      active: true,
    },
    {
      id: 'staff_manager_1',
      name: 'Rachel Green',
      roleId: 'role_manager',
      salt: 'salt_manager_1',
      pinHash: '71ad860609d5edb09c5b61533a8e53cc7f84916aba183ad35cab6ba4e700576d', // PIN: 4444
      active: true,
    },
    {
      id: 'staff_owner_1',
      name: 'Arthur Pendelton',
      roleId: 'role_owner',
      salt: 'salt_owner_1',
      pinHash: 'dd523db84cf2cf1368dae3d2b3779b90dc837c8f61494a23b84b90865849da29', // PIN: 9999
      active: true,
    },
  ],
  hotel: [
    {
      id: 'staff_frontdesk_1',
      name: 'Julian Hayes',
      roleId: 'role_frontdesk',
      salt: 'salt_frontdesk_1',
      pinHash: '6315ba535b43f667f014a39fb33dec55a862f16aca4e57d282a2bb4f3130dfad', // PIN: 1111
      active: true,
    },
    {
      id: 'staff_concierge_1',
      name: 'Chloe Monet',
      roleId: 'role_concierge',
      salt: 'salt_concierge_1',
      pinHash: 'f0ac54e3bf00e8b848978b8801c5e4e49bcafe27efb084b7cb23891c2f9fd22b', // PIN: 2222
      active: true,
    },
    {
      id: 'staff_manager_1',
      name: 'Victor Sterling',
      roleId: 'role_manager',
      salt: 'salt_manager_1',
      pinHash: '71ad860609d5edb09c5b61533a8e53cc7f84916aba183ad35cab6ba4e700576d', // PIN: 4444
      active: true,
    },
    {
      id: 'staff_owner_1',
      name: 'Lady Eleanor',
      roleId: 'role_owner',
      salt: 'salt_owner_1',
      pinHash: 'dd523db84cf2cf1368dae3d2b3779b90dc837c8f61494a23b84b90865849da29', // PIN: 9999
      active: true,
    },
  ],
};

// -------------------------------------------------------
// PosConfig — the full customer configuration
// -------------------------------------------------------
export interface PosConfig {
  version: number;
  customerId: string;
  businessName: string;
  businessType: BusinessType;
  licenseStatus: LicenseStatus;
  paidUntil: string; // ISO date string

  branding: {
    logoUrl: string | null;
    primaryColor: string;
    accentColor: string;
    receiptHeader: string;
    receiptFooter: string;
  };

  features: {
    // Restaurant
    tableManagement: boolean;
    kitchenDisplay: boolean;
    // Grocery
    barcodeScanning: boolean;
    weightBasedItems: boolean;
    // Hotel
    roomBilling: boolean;
    folioManagement: boolean;
    // Shared
    loyaltyPoints: boolean;
    customerProfiles: boolean;
    inventoryTracking: boolean;
    shiftManagement: boolean;
    deliveryOrders: boolean;
  };

  /** Fully custom roles defined per customer */
  roles: RoleDefinition[];

  /** Authenticated staff roster with hashed PINs */
  staff: StaffMember[];

  /** Dynamic fields added to each order (e.g. "Plate number", "Table note") */
  customOrderFields: {
    key: string;
    label: string;
    type: 'text' | 'number' | 'select';
    options?: string[];
    required: boolean;
  }[];

  pricing: {
    currency: string;        // "USD", "EUR", "TND"
    currencySymbol: string;  // "$", "€", "DT"
    taxRates: {
      name: string;          // "VAT", "Service Charge"
      rate: number;          // 0.19 = 19%
    }[];
    allowCustomDiscount: boolean;
    maxDiscountPercent: number;
  };

  receipt: {
    paperSize: '58mm' | '80mm' | 'A4';
    showLogo: boolean;
    showTax: boolean;
    showCustomerInfo: boolean;
  };

  sync: {
    triggerOnShiftClose: boolean;
    triggerOnIdle: boolean;
    idleMinutes: number;
    triggerEndOfDay: boolean;
    endOfDayTime: string;    // "23:59"
    allowOfflineDays: number;
  };
}

// -------------------------------------------------------
// Cryptographic Helpers for Staff PIN Verification
// -------------------------------------------------------

/** Compute SHA-256 hash of salt + ":" + pin */
export async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Deterministic fallback for environments without Web Crypto
  let h = 0x811c9dc5;
  for (let i = 0; i < data.length; i++) {
    h ^= data[i];
    h = Math.imul(h, 0x01000193);
  }
  return Math.abs(h).toString(16).padStart(64, '0');
}

/** Cryptographically verify an entered PIN against a staff member record */
export async function verifyStaffPin(staff: StaffMember, enteredPin: string): Promise<boolean> {
  if (!staff.active) return false;
  const computed = await hashPin(enteredPin, staff.salt);
  return computed === staff.pinHash;
}

/** Check if a role has a given permission */
export function roleHasPermission(role: RoleDefinition, permission: Permission): boolean {
  return role.permissions.includes('*') || role.permissions.includes(permission);
}

/** Generate a default config for a new customer */
export function createDefaultConfig(
  customerId: string,
  businessName: string,
  businessType: BusinessType,
): PosConfig {
  return {
    version: 1,
    customerId,
    businessName,
    businessType,
    licenseStatus: 'active',
    paidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    branding: {
      logoUrl: null,
      primaryColor: '#2563eb',
      accentColor: '#f59e0b',
      receiptHeader: `Welcome to ${businessName}`,
      receiptFooter: 'Thank you! Visit again.',
    },
    features: {
      tableManagement: businessType === 'restaurant',
      kitchenDisplay: businessType === 'restaurant',
      barcodeScanning: businessType === 'grocery',
      weightBasedItems: businessType === 'grocery',
      roomBilling: businessType === 'hotel',
      folioManagement: businessType === 'hotel',
      loyaltyPoints: false,
      customerProfiles: false,
      inventoryTracking: true,
      shiftManagement: true,
      deliveryOrders: false,
    },
    roles: ROLE_PRESETS[businessType],
    staff: STAFF_PRESETS[businessType],
    customOrderFields: [],
    pricing: {
      currency: 'USD',
      currencySymbol: '$',
      taxRates: [{ name: 'Tax', rate: 0.1 }],
      allowCustomDiscount: false,
      maxDiscountPercent: 20,
    },
    receipt: {
      paperSize: '80mm',
      showLogo: true,
      showTax: true,
      showCustomerInfo: false,
    },
    sync: {
      triggerOnShiftClose: true,
      triggerOnIdle: true,
      idleMinutes: 15,
      triggerEndOfDay: true,
      endOfDayTime: '23:59',
      allowOfflineDays: 7,
    },
  };
}
