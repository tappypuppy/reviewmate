"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

export default function Navigation() {
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

  return (
    <nav className="nav">
      <div className="nav__container">
        <Link href="/dashboard" className="nav__logo">
          ReviewMate
        </Link>

        <ul className="nav__links">
          <li>
            <Link
              href="/dashboard"
              className={isActive("/dashboard") ? "active" : ""}
            >
              Dashboard
            </Link>
          </li>
          <li>
            <Link
              href="/review/new"
              className={isActive("/review") ? "active" : ""}
            >
              新規添削
            </Link>
          </li>
          <li>
            <Link
              href="/policies"
              className={isActive("/policies") ? "active" : ""}
            >
              ポリシー管理
            </Link>
          </li>
        </ul>

        <div className="nav__actions">
          <button onClick={handleSignOut} className="btn btn--secondary btn--small">
            ログアウト
          </button>
        </div>
      </div>
    </nav>
  );
}
