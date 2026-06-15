import { useState } from "react";
import { Link, useLocation } from "wouter";
import { authClient } from "../lib/auth";
import { useSession } from "../hooks/useSession";

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

function Icon({ path }: { path: string }) {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={path} />
    </svg>
  );
}

const ICONS = {
  dashboard: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  marketplace: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",
  leads: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  earnings: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  referrals: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  learn: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  offers: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
  incoming: "M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4",
  analytics: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  admin: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <Layout>{children}</Layout>;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { user } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = (user as any)?.role as string | undefined;

  const affiliateNav: NavItem[] = [
    { path: "/dashboard", label: "Dashboard", icon: <Icon path={ICONS.dashboard} /> },
    { path: "/marketplace", label: "Marketplace", icon: <Icon path={ICONS.marketplace} /> },
    { path: "/submissions", label: "My Leads", icon: <Icon path={ICONS.leads} /> },
    { path: "/earnings", label: "Earnings", icon: <Icon path={ICONS.earnings} /> },
    { path: "/referrals", label: "Referrals", icon: <Icon path={ICONS.referrals} /> },
    { path: "/learning", label: "Learn", icon: <Icon path={ICONS.learn} /> },
  ];

  const businessNav: NavItem[] = [
    { path: "/dashboard", label: "Dashboard", icon: <Icon path={ICONS.dashboard} /> },
    { path: "/listings", label: "My Offers", icon: <Icon path={ICONS.offers} /> },
    { path: "/submissions", label: "Incoming Leads", icon: <Icon path={ICONS.incoming} /> },
    { path: "/analytics", label: "Analytics", icon: <Icon path={ICONS.analytics} /> },
  ];

  const adminNav: NavItem[] = [
    { path: "/dashboard", label: "Dashboard", icon: <Icon path={ICONS.dashboard} /> },
    { path: "/admin", label: "Admin Panel", icon: <Icon path={ICONS.admin} /> },
  ];

  let navItems: NavItem[] = [];
  if (role === "admin") navItems = adminNav;
  else if (role === "business") navItems = businessNav;
  else navItems = affiliateNav; // default affiliate

  const isActive = (path: string) => location === path;

  async function handleSignOut() {
    await authClient.signOut();
    navigate("/sign-in");
  }

  const NavLinks = () => (
    <>
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            isActive(item.path)
              ? "bg-sky-500 text-white shadow-sm"
              : "text-gray-600 hover:bg-sky-50 hover:text-sky-600"
          }`}
        >
          {item.icon}
          {item.label}
        </Link>
      ))}
      {role === "admin" && !navItems.find((n) => n.path === "/admin") && (
        <Link
          to="/admin"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            isActive("/admin")
              ? "bg-sky-500 text-white shadow-sm"
              : "text-gray-600 hover:bg-sky-50 hover:text-sky-600"
          }`}
        >
          <Icon path={ICONS.admin} />
          Admin Panel
        </Link>
      )}
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-100 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-sky-500 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white font-bold">S</span>
            </div>
            <span className="font-bold text-gray-800 text-lg">Safe Refer</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavLinks />
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sky-600 font-semibold text-sm">
                {(user?.name || user?.email || "U")[0].toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{user?.name || "User"}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-100 flex items-center justify-between px-4 py-3">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="font-bold text-gray-800">Safe Refer</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            }
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-20 flex">
          <div className="fixed inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="relative z-30 w-64 bg-white h-full flex flex-col shadow-xl mt-14">
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              <NavLinks />
            </nav>
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto lg:ml-0 mt-14 lg:mt-0">
        <div className="max-w-7xl mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
