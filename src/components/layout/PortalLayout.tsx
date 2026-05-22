import { ReactNode, useCallback } from "react";
import { authAPI } from "@/api/endpoints";
import { useAdminStore } from "@/store/adminStore";

export interface NavItem {
  id: string;
  label: string;
  icon?: ReactNode;
  /** Optional red dot count rendered next to the label (e.g. low-stock alerts). 0 = hidden. */
  badge?: number;
}

interface PortalLayoutProps {
  title: string;
  subtitle: string;
  navItems: NavItem[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: ReactNode;
  /** Return false to cancel logout (e.g. cashier must close shift first) */
  onBeforeLogout?: () => boolean;
}

function LogoutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden
      style={{ display: 'inline', marginRight: 7, verticalAlign: 'middle', flexShrink: 0 }}
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export function PortalLayout({ subtitle, navItems, activeTab, onTabChange, children, onBeforeLogout }: PortalLayoutProps) {
  const { staff, logout } = useAdminStore();

  const handleLogout = useCallback(() => {
    if (onBeforeLogout && !onBeforeLogout()) return;
    void (async () => {
      try {
        await authAPI.logout();
      } catch {
        /* still clear session locally */
      }
      logout();
    })();
  }, [logout, onBeforeLogout]);

  return (
    <section className="portal-layout">
      <aside className="sidebar">
        <div>
          <div className="sidebar-brand">
            <h1>LUMIÈRE</h1>
            <span className="role-tag">{subtitle}</span>
            <span className="staff-name">{staff?.name || staff?.fullName || staff?.username}</span>
          </div>
          <nav>
            {navItems.map(item => (
              <button
                key={item.id}
                className={activeTab === item.id ? "active" : ""}
                onClick={() => onTabChange(item.id)}
              >
                {item.icon && (
                  <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                )}
                {item.label}
                {item.badge != null && item.badge > 0 && (
                  <span
                    aria-label={`${item.badge} cảnh báo`}
                    style={{
                      marginLeft: 8,
                      background: "#ef4444",
                      color: "#fff",
                      borderRadius: 10,
                      padding: "1px 7px",
                      fontSize: 11,
                      fontWeight: 700,
                      lineHeight: 1.4,
                    }}
                  >
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <LogoutIcon />
          Đăng xuất
        </button>
      </aside>

      <article className="portal-content">
        {children}
      </article>
    </section>
  );
}
