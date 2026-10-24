import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Facebook Automation Agent", description: "Secure assistant for official Facebook Page publishing and engagement" };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
