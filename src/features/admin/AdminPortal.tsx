import { useState } from "react";
import {
  BarChartOutlined,
  LineChartOutlined,
  AppstoreOutlined,
  TableOutlined,
  TeamOutlined,
  InboxOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { AnalyticsScreen } from "./screens/AnalyticsScreen";
import { RevenueScreen } from "./screens/RevenueScreen";
import { MenuScreen } from "./screens/MenuScreen";
import { TablesScreen } from "./screens/TablesScreen";
import { StaffScreen } from "./screens/StaffScreen";
import { InventoryScreen } from "./screens/InventoryScreen";
import { AIScreen } from "./screens/AIScreen";

type AdminTab = "analytics" | "revenue" | "menu" | "tables" | "staff" | "inventory" | "ai";

export function AdminPortal() {
  const [tab, setTab] = useState<AdminTab>("analytics");

  const navItems = [
    { id: "analytics", label: "Thống kê",      icon: <BarChartOutlined /> },
    { id: "revenue",   label: "Báo cáo DT",     icon: <LineChartOutlined /> },
    { id: "menu",      label: "Quản lý Menu",   icon: <AppstoreOutlined /> },
    { id: "tables",    label: "Bàn & QR",       icon: <TableOutlined /> },
    { id: "staff",     label: "Nhân viên",      icon: <TeamOutlined /> },
    { id: "inventory", label: "Kho hàng",       icon: <InboxOutlined /> },
    { id: "ai",        label: "AI Dashboard",   icon: <RobotOutlined /> },
  ];

  return (
    <PortalLayout
      title="QUẢN TRỊ HỆ THỐNG"
      subtitle="MANAGER"
      navItems={navItems}
      activeTab={tab}
      onTabChange={(t) => setTab(t as AdminTab)}
    >
      {tab === "analytics" && <AnalyticsScreen />}
      {tab === "revenue"   && <RevenueScreen />}
      {tab === "menu"      && <MenuScreen />}
      {tab === "tables"    && <TablesScreen />}
      {tab === "staff"     && <StaffScreen />}
      {tab === "inventory" && <InventoryScreen />}
      {tab === "ai"        && <AIScreen />}
    </PortalLayout>
  );
}
