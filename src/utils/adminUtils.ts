// Admin & Role utility functions
export type UserRole = 'admin' | 'employee' | 'artist' | 'customer';

export const ADMIN_EMAILS = [
  'arpitkanotra@ymail.com'
];

/**
 * Sections/tabs permitted for the "Employee" role in Admin.
 * Employees handle daily operational tasks like fulfillment, products, returns, shipping, and support.
 * Restricted sections: users, settings, database, email, marketing, analytics, homepage, blog, social-posting.
 */
export const EMPLOYEE_ALLOWED_SECTIONS = [
  'dashboard',     // /admin
  'orders',        // /admin/orders
  'products',      // /admin/products
  'normal',        // /admin/normal
  'gifts',         // /admin/gifts
  'shipping',      // /admin/shipping
  'returns',       // /admin/returns
  'customer-care', // /admin/customer-care
  'tasks',         // /admin/tasks
] as const;

export type EmployeeSection = typeof EMPLOYEE_ALLOWED_SECTIONS[number];

/**
 * Admin-only tabs that can NEVER be granted to employees.
 * These are strictly preserved for super-administrators.
 */
export const ADMIN_ONLY_SECTIONS = [
  'users',
  'analytics',
  'email',
  'newsletter',
  'marketing',
  'social-posting',
  'homepage',
  'blog'
] as const;

export interface TabDefinition {
  id: string;
  name: string;
  path: string;
  desc: string;
}

export const EMPLOYEE_TAB_DEFINITIONS: TabDefinition[] = [
  { id: 'dashboard', name: 'Dashboard', path: '/admin/dashboard', desc: 'KPI metrics, revenue overview, and recent order pulse' },
  { id: 'orders', name: 'Orders', path: '/admin/orders', desc: 'View, process, track customer orders, and print invoices' },
  { id: 'products', name: 'Products', path: '/admin/products', desc: 'Catalog management, stock levels, artwork uploads, pricing' },
  { id: 'normal', name: 'Normal', path: '/admin/normal', desc: 'Standard category products and item management' },
  { id: 'gifts', name: 'Gifts', path: '/admin/gifts', desc: 'Gift collections, special packages, and gifting items' },
  { id: 'shipping', name: 'Shipping', path: '/admin/shipping', desc: 'Courier dispatch, Delhivery shipment tracking, and manifests' },
  { id: 'returns', name: 'Returns', path: '/admin/returns', desc: 'Process customer returns, review requests, issue exchanges' },
  { id: 'customer-care', name: 'Customer Care', path: '/admin/customer-care', desc: 'Read customer support messages and send direct email replies' },
  { id: 'tasks', name: 'Tasks', path: '/admin/dashboard?tab=tasks', desc: 'Daily operational checklist, team milestones, and task updates' },
];

export const ADMIN_ONLY_TAB_DEFINITIONS: TabDefinition[] = [
  { id: 'users', name: 'Users', path: '/admin/users', desc: 'Protected (Admin only) — Account roles, credentials, and store credit' },
  { id: 'analytics', name: 'Analytics', path: '/admin/dashboard?tab=analytics', desc: 'Protected (Admin only) — Confidential financial figures and visitor telemetry' },
  { id: 'marketing', name: 'Marketing', path: '/admin/marketing', desc: 'Protected (Admin only) — Discount engines, coupon creation, and sales rules' },
  { id: 'social-posting', name: 'Social Posting', path: '/admin/marketing?tab=social-posting', desc: 'Protected (Admin only) — Brand social account connections and publishing' },
  { id: 'newsletter', name: 'Newsletter', path: '/admin/marketing?tab=newsletter', desc: 'Protected (Admin only) — Marketing subscriber email lists and campaigns' },
  { id: 'email', name: 'Email Management', path: '/admin/marketing?tab=email', desc: 'Protected (Admin only) — SMTP credentials and transactional mail templates' },
  { id: 'homepage', name: 'Homepage', path: '/admin/homepage', desc: 'Protected (Admin only) — Storefront layout editor and hero marketing banners' },
  { id: 'blog', name: 'Blog', path: '/admin/blog', desc: 'Protected (Admin only) — Blog publication, SEO, and editorial articles' },
];

/**
 * Resolves the specific allowed sections for an individual employee user.
 * If user has customized allowed_tabs in metadata, returns those filtered strictly by EMPLOYEE_ALLOWED_SECTIONS.
 * Admin-only sections are NEVER returned here.
 * If no custom allowed_tabs configured, defaults to all EMPLOYEE_ALLOWED_SECTIONS.
 */
export const getEmployeeAllowedSections = (userOrEmail: any): string[] => {
  if (!userOrEmail || typeof userOrEmail === 'string') {
    return [...EMPLOYEE_ALLOWED_SECTIONS];
  }

  const customAllowed =
    userOrEmail.app_metadata?.allowed_tabs ||
    userOrEmail.user_metadata?.allowed_tabs ||
    userOrEmail.raw_app_meta_data?.allowed_tabs ||
    userOrEmail.raw_user_meta_data?.allowed_tabs ||
    userOrEmail.allowed_tabs;

  if (Array.isArray(customAllowed) && customAllowed.length > 0) {
    // Strictly filter against operational sections: Admin-only sections are NEVER allowed
    const validSections = customAllowed.filter((sectionId: string) =>
      (EMPLOYEE_ALLOWED_SECTIONS as readonly string[]).includes(sectionId as any)
    );
    return validSections;
  }

  return [...EMPLOYEE_ALLOWED_SECTIONS];
};

/**
 * Resolves a user's role from their email or user object.
 */
export const getUserRole = (userOrEmail: any): UserRole => {
  if (!userOrEmail) return 'customer';

  // If a string (email) is provided
  if (typeof userOrEmail === 'string') {
    return ADMIN_EMAILS.includes(userOrEmail.toLowerCase()) ? 'admin' : 'customer';
  }

  // Email check for super-admin
  const email = (userOrEmail.email || '').toLowerCase();
  if (ADMIN_EMAILS.includes(email)) return 'admin';

  // Metadata check (Supabase app_metadata or user_metadata)
  const metaRole = (
    userOrEmail.app_metadata?.role ||
    userOrEmail.user_metadata?.role ||
    userOrEmail.role ||
    ''
  ).toLowerCase();

  if (metaRole === 'admin') return 'admin';
  if (metaRole === 'employee' || metaRole === 'staff') return 'employee';
  if (metaRole === 'artist') return 'artist';

  return 'customer';
};

/**
 * Check if user is an Administrator (full access)
 */
export const isAdmin = (userOrEmail: any): boolean => {
  if (!userOrEmail) return false;
  return getUserRole(userOrEmail) === 'admin';
};

/**
 * Check if user is an Employee
 */
export const isEmployee = (userOrEmail: any): boolean => {
  if (!userOrEmail) return false;
  return getUserRole(userOrEmail) === 'employee';
};

/**
 * Check if user has staff access to the Admin panel (admin or employee)
 */
export const canAccessAdmin = (userOrEmail: any): boolean => {
  if (!userOrEmail) return false;
  const role = getUserRole(userOrEmail);
  return role === 'admin' || role === 'employee';
};

/**
 * Check whether a user has permission to view a specific section/path in admin
 */
export const canAccessAdminPath = (userOrEmail: any, pathname: string): boolean => {
  const role = getUserRole(userOrEmail);
  if (role === 'admin') return true;
  if (role !== 'employee') return false;

  // Normalize pathname: /admin/orders -> orders, /admin/dashboard -> dashboard, /admin or /admin/ -> ''
  const cleanPath = (pathname || '').split('?')[0].replace(/^\/admin\/?/, '').split('/')[0];
  
  // If accessing the admin root /admin, permit if they have any allowed section (so they can be redirected to their permitted tab)
  if (cleanPath === '') {
    const allowed = getEmployeeAllowedSections(userOrEmail);
    return allowed.length > 0;
  }

  const sectionId = cleanPath;
  const allowedSections = getEmployeeAllowedSections(userOrEmail);

  // 'dashboard' or 'tasks' allows access to the dashboard page (since tasks is now a tab inside dashboard)
  if (sectionId === 'dashboard' || sectionId === 'tasks') {
    return allowedSections.includes('dashboard') || allowedSections.includes('tasks');
  }

  return allowedSections.includes(sectionId);
};

export const getAdminEmails = (): string[] => {
  return ADMIN_EMAILS;
};



