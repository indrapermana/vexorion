import {
  AccountBalanceRoundedIcon,
  AccountBalanceWalletRoundedIcon,
  AdminPanelSettingsRoundedIcon,
  BadgeRoundedIcon,
  CalendarMonthRoundedIcon,
  DarkModeRoundedIcon,
  DashboardRoundedIcon,
  Groups2RoundedIcon,
  InsightsRoundedIcon,
  Inventory2RoundedIcon,
  InventoryRoundedIcon,
  LightModeRoundedIcon,
  LocalShippingRoundedIcon,
  LogoutRoundedIcon,
  MenuBookRoundedIcon,
  MenuRoundedIcon,
  PaymentsRoundedIcon,
  PolicyRoundedIcon,
  ReceiptLongRoundedIcon,
  RequestQuoteRoundedIcon,
  RuleRoundedIcon,
  SellRoundedIcon,
  ShoppingBagRoundedIcon,
  StorefrontRoundedIcon,
  SwapHorizRoundedIcon,
  TuneRoundedIcon,
  WarehouseRoundedIcon,
} from "@vexorion/ui";
import {
  VxBox,
  VxButton,
  VxChip,
  VxDivider,
  VxDrawer,
  VxIconButton,
  VxList,
  VxListItemButton,
  VxListItemIcon,
  VxListItemText,
  VxMenuItem,
  VxPaper,
  VxSelect,
  VxStack,
  VxToolbar,
  VxTooltip,
  VxTypography,
} from "@vexorion/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../app/AuthContext";
import { getMainMenuAccess } from "../app/authorization";
import { useTenantModules } from "../app/TenantModuleContext";
import { useThemeMode } from "../app/ThemeModeContext";
import {
  type TranslationLanguage,
  LanguageOptions,
  normalizeTranslationLanguage,
} from "../i18n/translationConstant";
import { getTenantPreferences, trackPageVisit } from "../lib/api";
import {
  getHiddenMenuLinks,
  saveHiddenMenuLinks,
  subscribeToMenuConfigChange,
} from "../lib/menuConfig";

const drawerWidth = 280;
const collapsedDrawerWidth = 92;
const sidebarCollapsedStorageKey = "vexorion.sidebarCollapsed";

function getSectionAccentClass(titleKey: string) {
  if (titleKey === "nav.sections.overview") return "nav-accent-overview";
  if (titleKey === "nav.sections.sales") return "nav-accent-sales";
  if (titleKey === "nav.sections.procurement") return "nav-accent-procurement";
  if (titleKey === "nav.sections.inventory") return "nav-accent-inventory";
  if (titleKey === "nav.sections.finance") return "nav-accent-finance";
  if (titleKey === "nav.sections.projects") return "nav-accent-projects";
  if (titleKey === "nav.sections.configuration")
    return "nav-accent-configuration";
  return "nav-accent-default";
}

const navigationSections = [
  {
    titleKey: "nav.sections.overview",
    links: [
      {
        to: "/",
        labelKey: "nav.links.dashboard",
        icon: <DashboardRoundedIcon />,
      },
    ],
  },
  {
    titleKey: "nav.sections.sales",
    links: [
      {
        to: "/customers",
        labelKey: "nav.links.customers",
        icon: <BadgeRoundedIcon />,
      },
      {
        to: "/sales-orders",
        labelKey: "nav.links.salesOrders",
        icon: <SellRoundedIcon />,
      },
      {
        to: "/sales-shipments",
        labelKey: "nav.links.salesShipments",
        icon: <LocalShippingRoundedIcon />,
      },
      {
        to: "/sales-invoices",
        labelKey: "nav.links.salesInvoices",
        icon: <RequestQuoteRoundedIcon />,
      },
      {
        to: "/customer-payments",
        labelKey: "nav.links.customerPayments",
        icon: <PaymentsRoundedIcon />,
      },
    ],
  },
  {
    titleKey: "nav.sections.procurement",
    links: [
      {
        to: "/suppliers",
        labelKey: "nav.links.suppliers",
        icon: <StorefrontRoundedIcon />,
      },
      {
        to: "/purchase-orders",
        labelKey: "nav.links.purchaseOrders",
        icon: <ShoppingBagRoundedIcon />,
      },
      {
        to: "/purchase-receipts",
        labelKey: "nav.links.purchaseReceipts",
        icon: <InventoryRoundedIcon />,
      },
      {
        to: "/purchase-invoices",
        labelKey: "nav.links.purchaseInvoices",
        icon: <ReceiptLongRoundedIcon />,
      },
      {
        to: "/vendor-payments",
        labelKey: "nav.links.vendorPayments",
        icon: <AccountBalanceWalletRoundedIcon />,
      },
    ],
  },
  {
    titleKey: "nav.sections.inventory",
    links: [
      {
        to: "/products",
        labelKey: "nav.links.products",
        icon: <Inventory2RoundedIcon />,
      },
      {
        to: "/inventory-adjustments",
        labelKey: "nav.links.inventoryAdjustments",
        icon: <TuneRoundedIcon />,
      },
      {
        to: "/inventory-reports",
        labelKey: "nav.links.inventoryReports",
        icon: <InsightsRoundedIcon />,
      },
      {
        to: "/stock-counts",
        labelKey: "nav.links.stockCounts",
        icon: <RuleRoundedIcon />,
      },
      {
        to: "/stock-transfers",
        labelKey: "nav.links.stockTransfers",
        icon: <SwapHorizRoundedIcon />,
      },
      {
        to: "/warehouses",
        labelKey: "nav.links.warehouses",
        icon: <WarehouseRoundedIcon />,
      },
    ],
  },
  {
    titleKey: "nav.sections.finance",
    links: [
      {
        to: "/accounts",
        labelKey: "nav.links.accounts",
        icon: <AccountBalanceRoundedIcon />,
      },
      {
        to: "/audit-logs",
        labelKey: "nav.links.auditLogs",
        icon: <PolicyRoundedIcon />,
      },
      {
        to: "/fiscal-periods",
        labelKey: "nav.links.fiscalPeriods",
        icon: <CalendarMonthRoundedIcon />,
      },
      {
        to: "/journals",
        labelKey: "nav.links.journals",
        icon: <MenuBookRoundedIcon />,
      },
      {
        to: "/reports",
        labelKey: "nav.links.reports",
        icon: <InsightsRoundedIcon />,
      },
    ],
  },
  {
    titleKey: "nav.sections.projects",
    links: [
      {
        to: "/project-categories",
        labelKey: "nav.links.projectCategories",
        icon: <RuleRoundedIcon />,
      },
      {
        to: "/project-documents",
        labelKey: "nav.links.projectDocuments",
        icon: <PolicyRoundedIcon />,
      },
      {
        to: "/projects",
        labelKey: "nav.links.projects",
        icon: <BadgeRoundedIcon />,
      },
      {
        to: "/employees",
        labelKey: "nav.links.employees",
        icon: <Groups2RoundedIcon />,
      },
      {
        to: "/consultants",
        labelKey: "nav.links.consultants",
        icon: <BadgeRoundedIcon />,
      },
      {
        to: "/tenant-relationships",
        labelKey: "nav.links.tenantRelationships",
        icon: <SwapHorizRoundedIcon />,
      },
    ],
  },
  {
    titleKey: "nav.sections.configuration",
    links: [
      {
        to: "/config",
        labelKey: "nav.links.configCenter",
        icon: <AdminPanelSettingsRoundedIcon />,
      },
    ],
  },
] as const;

const routeTitleKeys: Record<string, string> = {
  "/": "nav.routeTitles.overview",
  "/customers": "nav.routeTitles.customers",
  "/customer-payments": "nav.routeTitles.customerPayments",
  "/accounts": "nav.routeTitles.accounts",
  "/audit-logs": "nav.routeTitles.auditLogs",
  "/config": "nav.routeTitles.config",
  "/config/company": "nav.routeTitles.configCompany",
  "/config/menu": "nav.routeTitles.configMenu",
  "/config/numbering": "nav.routeTitles.configNumbering",
  "/config/roles": "nav.routeTitles.configRoles",
  "/config/tax-discount": "nav.routeTitles.configTaxDiscount",
  "/config/import-data": "nav.routeTitles.configImportData",
  "/config/users": "nav.routeTitles.configUsers",
  "/fiscal-periods": "nav.routeTitles.fiscalPeriods",
  "/journals": "nav.routeTitles.journals",
  "/reports": "nav.routeTitles.reports",
  "/products": "nav.routeTitles.products",
  "/project-categories": "nav.routeTitles.projectCategories",
  "/project-documents": "nav.routeTitles.projectDocuments",
  "/projects": "nav.routeTitles.projects",
  "/employees": "nav.routeTitles.employees",
  "/consultants": "nav.routeTitles.consultants",
  "/tenant-relationships": "nav.routeTitles.tenantRelationships",
  "/inventory-adjustments": "nav.routeTitles.inventoryAdjustments",
  "/inventory-reports": "nav.routeTitles.inventoryReports",
  "/purchase-invoices": "nav.routeTitles.purchaseInvoices",
  "/purchase-orders": "nav.routeTitles.purchaseOrders",
  "/purchase-receipts": "nav.routeTitles.purchaseReceipts",
  "/sales-invoices": "nav.routeTitles.salesInvoices",
  "/sales-orders": "nav.routeTitles.salesOrders",
  "/sales-shipments": "nav.routeTitles.salesShipments",
  "/stock-counts": "nav.routeTitles.stockCounts",
  "/stock-transfers": "nav.routeTitles.stockTransfers",
  "/suppliers": "nav.routeTitles.suppliers",
  "/vendor-payments": "nav.routeTitles.vendorPayments",
  "/warehouses": "nav.routeTitles.warehouses",
};

function getRouteTitleKey(pathname: string) {
  if (routeTitleKeys[pathname]) {
    return routeTitleKeys[pathname];
  }

  if (pathname.startsWith("/projects/")) {
    return "nav.routeTitles.projectDetails";
  }

  return "app.workspaceTitle";
}

export default function AppLayout() {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();
  const tenantModules = useTenantModules();
  const { mode: themeMode, setMode: setThemeMode } = useThemeMode();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => localStorage.getItem(sidebarCollapsedStorageKey) === "true",
  );
  const [hiddenMenuLinks, setHiddenMenuLinks] = useState<string[]>(() =>
    getHiddenMenuLinks(),
  );

  const currentLanguage = normalizeTranslationLanguage(i18n.language);

  const isLinkVisible = useCallback((path: string) => {
    return getMainMenuAccess(user?.permissions, path, hiddenMenuLinks, tenantModules).visible;
  }, [hiddenMenuLinks, tenantModules, user?.permissions]);

  const handleLanguageChange = (nextLanguage: TranslationLanguage) => {
    void i18n.changeLanguage(nextLanguage);
  };

  const handleThemeModeChange = (nextMode: "light" | "dark") => {
    setThemeMode(nextMode);
  };

  const toggleThemeMode = () => {
    setThemeMode(themeMode === "light" ? "dark" : "light");
  };

  const toggleSidebarCollapsed = () => {
    setIsSidebarCollapsed((current) => {
      const next = !current;
      localStorage.setItem(sidebarCollapsedStorageKey, String(next));
      return next;
    });
  };

  useEffect(() => {
    return subscribeToMenuConfigChange(() => {
      setHiddenMenuLinks(getHiddenMenuLinks());
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void trackPageVisit(location.pathname).catch(() => {
      // Page telemetry must not block navigation rendering.
    });
  }, [isAuthenticated, location.pathname]);

  useEffect(() => {
    if (!isAuthenticated) {
      saveHiddenMenuLinks([]);
      return;
    }

    let cancelled = false;

    const loadPreference = async () => {
      try {
        const preference = await getTenantPreferences();
        if (!cancelled) {
          setHiddenMenuLinks(preference.hiddenMenuLinks);
          saveHiddenMenuLinks(preference.hiddenMenuLinks);
        }
      } catch {
        if (!cancelled) {
          setHiddenMenuLinks([]);
          saveHiddenMenuLinks([]);
        }
      }
    };

    void loadPreference();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const visibleNavigationSections = useMemo(
    () =>
      navigationSections
        .map((section) => ({
          ...section,
          links: section.links.filter(
            (link) => isLinkVisible(link.to),
          ),
        }))
        .filter((section) => section.links.length > 0),
    [isLinkVisible],
  );

  const handleLogout = async () => {
    await logout();
  };

  const pageTitle = t(getRouteTitleKey(location.pathname));

  const desktopDrawerWidth = isSidebarCollapsed
    ? collapsedDrawerWidth
    : drawerWidth;

  const sidebar = (collapsed: boolean) => (
    <VxBox
      className={
        collapsed
          ? "dashboard-sidebar-shell dashboard-sidebar-shell-collapsed"
          : "dashboard-sidebar-shell"
      }
    >
      <VxStack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          px: collapsed ? 1.25 : 2.5,
          py: 2.5,
        }}
      >
        <VxBox className="brand-mark">
          <VxBox
            component="img"
            src="/favicon.svg"
            alt={t("app.brand")}
            sx={{ width: 28, height: 28 }}
          />
        </VxBox>
        {!collapsed ? (
          <VxBox sx={{ minWidth: 0, flex: 1 }}>
            <VxTypography
              variant="overline"
              sx={{ color: "text.secondary", letterSpacing: "0.18em" }}
            >
              {t("app.brand")}
            </VxTypography>
          </VxBox>
        ) : null}
      </VxStack>

      <VxDivider />

      <VxBox
        component="nav"
        aria-label={t("app.navigation")}
        sx={{ px: collapsed ? 1 : 1.5, py: 1.5 }}
      >
        {!collapsed ? (
          <VxTypography className="sidebar-caption">
            {t("app.navigation")}
          </VxTypography>
        ) : null}
        <VxStack spacing={1.5}>
          {visibleNavigationSections.map((section) => (
            <VxBox key={section.titleKey}>
              {!collapsed ? (
                <VxTypography
                  variant="overline"
                  sx={{
                    px: 1.5,
                    color: "text.secondary",
                    letterSpacing: "0.12em",
                  }}
                >
                  {t(section.titleKey)}
                </VxTypography>
              ) : null}
              <VxList disablePadding>
                {section.links.map((link) => {
                  const sectionAccentClass = getSectionAccentClass(
                    section.titleKey,
                  );
                  const navItem = (
                    <VxListItemButton
                      key={link.to}
                      component={NavLink}
                      to={link.to}
                      selected={location.pathname === link.to}
                      onClick={() => setMobileOpen(false)}
                      className={
                        location.pathname === link.to
                          ? `dashboard-nav-item dashboard-nav-item-active ${sectionAccentClass}`
                          : `dashboard-nav-item ${sectionAccentClass}`
                      }
                      sx={{
                        justifyContent: collapsed ? "center" : "flex-start",
                        px: collapsed ? 1.25 : 2,
                      }}
                    >
                      <VxListItemIcon
                        className={
                          collapsed
                            ? "dashboard-nav-icon-slot dashboard-nav-icon-slot-collapsed"
                            : "dashboard-nav-icon-slot"
                        }
                        sx={{ justifyContent: "center" }}
                      >
                        {link.icon}
                      </VxListItemIcon>
                      {!collapsed ? (
                        <VxListItemText primary={t(link.labelKey)} />
                      ) : null}
                    </VxListItemButton>
                  );

                  if (!collapsed) {
                    return navItem;
                  }

                  return (
                    <VxTooltip
                      key={link.to}
                      title={t(link.labelKey)}
                      placement="right"
                      arrow
                    >
                      {navItem}
                    </VxTooltip>
                  );
                })}
              </VxList>
            </VxBox>
          ))}
        </VxStack>
      </VxBox>

      <VxBox sx={{ mt: "auto", px: collapsed ? 1 : 2, pb: 2 }}>
        <VxPaper elevation={0} className="sidebar-footer-card">
          {!collapsed ? (
            <>
              <VxTypography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                {isAuthenticated && user
                  ? (user.firstName ?? user.userName)
                  : t("app.anonymousMode")}
              </VxTypography>
              <VxTypography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 1.5 }}
              >
                {isAuthenticated && user ? user.email : t("app.signInHint")}
              </VxTypography>
            </>
          ) : null}
          {isAuthenticated ? (
            collapsed ? (
              <VxIconButton
                color="primary"
                onClick={() => void handleLogout()}
                aria-label={t("app.logout")}
                sx={{ width: "100%" }}
              >
                <LogoutRoundedIcon />
              </VxIconButton>
            ) : (
              <VxButton
                fullWidth
                variant="contained"
                startIcon={<LogoutRoundedIcon />}
                onClick={() => void handleLogout()}
              >
                {t("app.logout")}
              </VxButton>
            )
          ) : collapsed ? (
            <VxChip size="small" label="P" variant="outlined" />
          ) : (
            <VxChip label={t("app.publicAccessOnly")} variant="outlined" />
          )}
        </VxPaper>
      </VxBox>
    </VxBox>
  );

  return (
    <VxBox className="dashboard-shell">
      <VxDrawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        slotProps={{ paper: { "aria-label": t("app.navigation") } }}
        sx={{
          display: { xs: "block", lg: "none" },
          "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box" },
        }}
      >
        {sidebar(false)}
      </VxDrawer>

      <VxDrawer
        variant="permanent"
        open
        sx={{
          display: { xs: "none", lg: "block" },
          "& .MuiDrawer-paper": {
            width: desktopDrawerWidth,
            boxSizing: "border-box",
            border: "none",
            transition: "width 180ms ease",
          },
        }}
      >
        {sidebar(isSidebarCollapsed)}
      </VxDrawer>

      <VxBox
        className="dashboard-main"
        sx={{
          ml: { lg: `${desktopDrawerWidth}px` },
          transition: "margin-left 180ms ease",
        }}
      >
        <VxToolbar
          className="dashboard-topbar"
          sx={{
            position: "relative",
            alignItems: { xs: "stretch", lg: "center" },
            flexDirection: { xs: "column", lg: "row" },
            gap: { xs: 1, lg: 0 },
            minHeight: { xs: "auto", lg: 64 },
            py: { xs: 1, lg: 0 },
          }}
        >
          <VxStack
            direction="row"
            spacing={1}
            sx={{
              position: { xs: "static", lg: "absolute" },
              top: 8,
              right: 16,
              width: { xs: "100%", lg: "auto" },
              justifyContent: { xs: "flex-end", lg: "initial" },
              flexWrap: { xs: "wrap", lg: "nowrap" },
            }}
          >
            <VxSelect
              size="small"
              value={themeMode}
              onChange={(event) =>
                handleThemeModeChange(event.target.value as "light" | "dark")
              }
              aria-label={t("app.themeSelectorAria")}
              sx={{ minWidth: 120, display: { xs: "none", sm: "inline-flex" } }}
            >
              <VxMenuItem value="light">
                <VxStack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center" }}
                >
                  <LightModeRoundedIcon fontSize="small" />
                  <span>{t("app.themeLight")}</span>
                </VxStack>
              </VxMenuItem>
              <VxMenuItem value="dark">
                <VxStack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center" }}
                >
                  <DarkModeRoundedIcon fontSize="small" />
                  <span>{t("app.themeDark")}</span>
                </VxStack>
              </VxMenuItem>
            </VxSelect>
            <VxIconButton
              size="small"
              onClick={toggleThemeMode}
              aria-label={
                themeMode === "light"
                  ? `${t("app.themeSelectorAria")}: ${t("app.themeDark")}`
                  : `${t("app.themeSelectorAria")}: ${t("app.themeLight")}`
              }
              sx={{ display: { xs: "inline-flex", sm: "none" } }}
            >
              {themeMode === "light" ? (
                <DarkModeRoundedIcon fontSize="small" />
              ) : (
                <LightModeRoundedIcon fontSize="small" />
              )}
            </VxIconButton>
            <VxSelect
              size="small"
              value={currentLanguage}
              onChange={(event) =>
                handleLanguageChange(event.target.value as TranslationLanguage)
              }
              aria-label={t("app.languageSelectorAria")}
              sx={{ minWidth: 132 }}
            >
              {LanguageOptions.map((option) => (
                <VxMenuItem key={option.code} value={option.code}>
                  {t(option.translationKey)}
                </VxMenuItem>
              ))}
            </VxSelect>
            {isAuthenticated ? (
              <VxChip
                color="secondary"
                label={
                  user
                    ? `${user.firstName ?? user.userName} · ${user.roles[0] ?? t("app.userRoleFallback")}`
                    : t("app.signedIn")
                }
                sx={{
                  maxWidth: { xs: 180, lg: "none" },
                  "& .MuiChip-label": {
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  },
                }}
              />
            ) : (
              <VxChip label={t("app.publicRoute")} variant="outlined" />
            )}
          </VxStack>
          <VxStack
            direction="row"
            spacing={2}
            sx={{ alignItems: "center", width: "100%", minWidth: 0 }}
          >
            <VxIconButton
              sx={{ display: { lg: "none" } }}
              onClick={() => setMobileOpen(true)}
              aria-label={t("app.navigation")}
              aria-expanded={mobileOpen}
            >
              <MenuRoundedIcon />
            </VxIconButton>
            <VxIconButton
              sx={{ display: { xs: "none", lg: "inline-flex" } }}
              onClick={toggleSidebarCollapsed}
              aria-label={
                isSidebarCollapsed ? t("app.expandNavigation") : t("app.collapseNavigation")
              }
            >
              <MenuRoundedIcon />
            </VxIconButton>
            <VxBox sx={{ mr: "auto", minWidth: 0 }}>
              <VxTypography
                variant="overline"
                sx={{ color: "text.secondary", letterSpacing: "0.18em" }}
              >
                {t("app.adminConsole")}
              </VxTypography>
              <VxTypography component="div" variant="h5" noWrap>
                {pageTitle}
              </VxTypography>
            </VxBox>
          </VxStack>
        </VxToolbar>

        <VxBox component="main" className="dashboard-content">
          <Outlet />
        </VxBox>
      </VxBox>
    </VxBox>
  );
}
