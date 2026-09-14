import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = { title: "HAL CINEMA | 管理システム", robots: { index: false, follow: false } };
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="cinema-admin">{children}</div>;
}
