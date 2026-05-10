import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { BarChartOutlined, AppstoreOutlined, TableOutlined, TeamOutlined, InboxOutlined, RobotOutlined, } from "@ant-design/icons";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { AnalyticsScreen } from "./screens/AnalyticsScreen";
import { MenuScreen } from "./screens/MenuScreen";
import { TablesScreen } from "./screens/TablesScreen";
import { StaffScreen } from "./screens/StaffScreen";
import { InventoryScreen } from "./screens/InventoryScreen";
import { AIScreen } from "./screens/AIScreen";
export function AdminPortal() {
    const [tab, setTab] = useState("analytics");
    const navItems = [
        { id: "analytics", label: "Thống kê", icon: _jsx(BarChartOutlined, {}) },
        { id: "menu", label: "Quản lý Menu", icon: _jsx(AppstoreOutlined, {}) },
        { id: "tables", label: "Bàn & QR", icon: _jsx(TableOutlined, {}) },
        { id: "staff", label: "Nhân viên", icon: _jsx(TeamOutlined, {}) },
        { id: "inventory", label: "Kho hàng", icon: _jsx(InboxOutlined, {}) },
        { id: "ai", label: "AI Dashboard", icon: _jsx(RobotOutlined, {}) },
    ];
    return (_jsxs(PortalLayout, { title: "QU\u1EA2N TR\u1ECA H\u1EC6 TH\u1ED0NG", subtitle: "MANAGER", navItems: navItems, activeTab: tab, onTabChange: (t) => setTab(t), children: [tab === "analytics" && _jsx(AnalyticsScreen, {}), tab === "menu" && _jsx(MenuScreen, {}), tab === "tables" && _jsx(TablesScreen, {}), tab === "staff" && _jsx(StaffScreen, {}), tab === "inventory" && _jsx(InventoryScreen, {}), tab === "ai" && _jsx(AIScreen, {})] }));
}
