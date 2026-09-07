import { Figtree, Poppins, Roboto_Mono } from 'next/font/google';
import './globals.css';
import "flatpickr/dist/flatpickr.css";
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';

// Body/UI typeface — see `src/styles/typography.css` for how these map to
// the `--font-outfit`/`--font-heading` theme tokens (monday.com-style pairing:
// Figtree for copy, Poppins for headings).
const figtree_font = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

const poppins_font = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${figtree_font.variable} ${poppins_font.variable} ${roboto_mono_font.variable} ${figtree_font.className} antialiased dark:bg-gray-900`}>
        <script dangerouslySetInnerHTML={{ __html: theme_bootstrap_script }} />
        <ThemeProvider>
          <AuthProvider>
            <SidebarProvider>{children}</SidebarProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
