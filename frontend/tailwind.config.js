/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Force dark mode
  theme: {
    extend: {
      colors: {
        // Dark mode color palette
        dark: {
          bg: {
            primary: '#0a0a0a',      // Main background
            secondary: '#111111',    // Card backgrounds
            tertiary: '#1a1a1a',     // Hover states, borders
            elevated: '#1f1f1f',     // Elevated surfaces
          },
          text: {
            primary: '#ffffff',      // Main text
            secondary: '#b3b3b3',    // Secondary text
            tertiary: '#808080',     // Tertiary text
            muted: '#666666',        // Muted text
          },
          accent: {
            primary: '#3b82f6',     // Blue accent
            secondary: '#8b5cf6',   // Purple accent
            success: '#10b981',     // Green for profits
            danger: '#ef4444',      // Red for losses
            warning: '#f59e0b',     // Orange warning
          },
          border: {
            primary: '#2a2a2a',     // Primary borders
            secondary: '#333333',   // Secondary borders
          },
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        'dark': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
        'dark-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
}
