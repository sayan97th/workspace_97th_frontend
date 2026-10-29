import type { Metadata } from 'next';
import { Manrope, Roboto_Mono } from 'next/font/google';
import './globals.css';
import "flatpickr/dist/flatpickr.css";
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { APP_NAME } from '@/lib/page-title';
import { brand_palette_bootstrap_script } from '@/lib/brand-theme';

// Every static route exports a plain `metadata.title` ("Users") and this
// template appends the product name. Client-resolved routes (boards, views,
// items) set their own title through `useDocumentTitle` instead.
export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
};

// Brand typeface, the same Manrope 97thfloor.com uses. It is a variable font
// (200 to 800), so one self-hosted file covers every weight the app uses.
// See `src/styles/typography.css` for how `--font-manrope` maps to the
// `--font-brand-sans`, `--font-outfit` and `--font-heading` tokens. The
// variable class sits on <html> so it exists on `:root`, where Tailwind
// resolves its theme tokens.
const manrope_font = Manrope({
  subsets: ["latin", "latin-ext"],
  variable: "--font-manrope",
  display: "swap",
});

const roboto_mono_font = Roboto_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-roboto-mono",
  display: "swap",
});

// Runs before hydration so a returning visitor's saved "dark"/"system" choice
// paints immediately instead of flashing the light default first. Must stay in
// sync with THEME_STORAGE_KEY ("theme_mode") in `@/context/ThemeContext`.
const theme_bootstrap_script = `(function(){try{var saved_mode=localStorage.getItem("theme_mode");var prefers_dark=window.matchMedia("(prefers-color-scheme: dark)").matches;var is_dark=saved_mode==="dark"||(saved_mode==="system"&&prefers_dark);if(is_dark)document.documentElement.classList.add("dark");}catch(error){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope_font.variable} ${roboto_mono_font.variable}`} suppressHydrationWarning>
      <body className={`${manrope_font.className} antialiased dark:bg-gray-900`} suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: theme_bootstrap_script }} />
        {/* Repaints the organization's brand color before hydration, see `@/lib/brand-theme`. */}
        <script dangerouslySetInnerHTML={{ __html: brand_palette_bootstrap_script }} />
        <ThemeProvider>
          <AuthProvider>
            <SidebarProvider>{children}</SidebarProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
