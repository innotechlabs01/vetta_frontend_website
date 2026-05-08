---
name: vetta-frontend-styles
version: 1.0.0
target: stitch
---

# Vetta Frontend Style Guide for Stitch

## Global Configuration
- Framework: Next.js 14 (App Router)
- UI Library: shadcn/ui (New York style, Gray base)
- CSS Framework: Tailwind CSS v3
- Dark Mode: Class-based (`darkMode: ["class"]`)
- Icon Set: Lucide
- Typography: Inter (implied by shadcn New York style)

---

## Design Tokens

### Color Tokens
All colors use HSL format via CSS variables, mapped to Tailwind classes.

#### Light Mode
| Token | CSS Variable | HSL Value | Tailwind Class | Usage |
|-------|--------------|-----------|----------------|-------|
| Primary | `--primary` | 215.06deg 100% 50% | `bg-primary` | Buttons, interactive elements |
| Primary Foreground | `--primary-foreground` | 210 40% 98% | `text-primary-foreground` | Text on primary surfaces |
| Background | `--background` | 0 0% 100% | `bg-background` | Page/app background |
| Foreground | `--foreground` | 224 71.4% 4.1% | `text-foreground` | Body text |
| Card | `--card` | 0 0% 100% | `bg-card` | Card containers |
| Card Foreground | `--card-foreground` | 224 71.4% 4.1% | `text-card-foreground` | Card text |
| Popover | `--popover` | 0 0% 100% | `bg-popover` | Popover/dropdown backgrounds |
| Popover Foreground | `--popover-foreground` | 224 71.4% 4.1% | `text-popover-foreground` | Popover text |
| Secondary | `--secondary` | 210 40% 96% | `bg-secondary` | Secondary surfaces |
| Secondary Foreground | `--secondary-foreground` | 222.2 84% 4.9% | `text-secondary-foreground` | Secondary text |
| Muted | `--muted` | 210 40% 96% | `bg-muted` | Muted/disabled surfaces |
| Muted Foreground | `--muted-foreground` | 215.4 16.3% 46.9% | `text-muted-foreground` | Secondary text |
| Accent | `--accent` | 210 40% 96% | `bg-accent` | Hover/active states |
| Accent Foreground | `--accent-foreground` | 222.2 84% 4.9% | `text-accent-foreground` | Accent text |
| Destructive | `--destructive` | 0 84.2% 60.2% | `bg-destructive` | Error/danger states |
| Destructive Foreground | `--destructive-foreground` | 210 40% 98% | `text-destructive-foreground` | Text on destructive |
| Border | `--border` | 214.3 31.8% 91.4% | `border-border` | Borders, dividers |
| Input | `--input` | 214.3 31.8% 91.4% | `border-input` | Form input borders |
| Ring | `--ring` | 221.2 83.2% 53.3% | `focus:ring-ring` | Focus outlines |
| Chart 1 | `--chart-1` | 12 76% 61% | `fill-chart-1` | Chart series 1 |
| Chart 2 | `--chart-2` | 173 58% 39% | `fill-chart-2` | Chart series 2 |
| Chart 3 | `--chart-3` | 197 37% 24% | `fill-chart-3` | Chart series 3 |
| Chart 4 | `--chart-4` | 43 74% 66% | `fill-chart-4` | Chart series 4 |
| Chart 5 | `--chart-5` | 27 87% 67% | `fill-chart-5` | Chart series 5 |

#### Dark Mode
| Token | CSS Variable | HSL Value | Tailwind Class | Usage |
|-------|--------------|-----------|----------------|-------|
| Primary | `--primary` | 210 20% 98% | `dark:bg-primary` | Buttons, interactive elements |
| Primary Foreground | `--primary-foreground` | 220.9 39.3% 11% | `dark:text-primary-foreground` | Text on primary surfaces |
| Background | `--background` | 224 71.4% 4.1% | `dark:bg-background` | Page/app background |
| Foreground | `--foreground` | 210 20% 98% | `dark:text-foreground` | Body text |
| Card | `--card` | 224 71.4% 4.1% | `dark:bg-card` | Card containers |
| Card Foreground | `--card-foreground` | 210 20% 98% | `dark:text-card-foreground` | Card text |
| Popover | `--popover` | 224 71.4% 4.1% | `dark:bg-popover` | Popover/dropdown backgrounds |
| Popover Foreground | `--popover-foreground` | 210 20% 98% | `dark:text-popover-foreground` | Popover text |
| Secondary | `--secondary` | 215 27.9% 16.9% | `dark:bg-secondary` | Secondary surfaces |
| Secondary Foreground | `--secondary-foreground` | 210 20% 98% | `dark:text-secondary-foreground` | Secondary text |
| Muted | `--muted` | 215 27.9% 16.9% | `dark:bg-muted` | Muted/disabled surfaces |
| Muted Foreground | `--muted-foreground` | 217.9 10.6% 64.9% | `dark:text-muted-foreground` | Secondary text |
| Accent | `--accent` | 215 27.9% 16.9% | `dark:bg-accent` | Hover/active states |
| Accent Foreground | `--accent-foreground` | 210 20% 98% | `dark:text-accent-foreground` | Accent text |
| Destructive | `--destructive` | 0 62.8% 30.6% | `dark:bg-destructive` | Error/danger states |
| Destructive Foreground | `--destructive-foreground` | 210 20% 98% | `dark:text-destructive-foreground` | Text on destructive |
| Border | `--border` | 215 27.9% 16.9% | `dark:border-border` | Borders, dividers |
| Input | `--input` | 215 27.9% 16.9% | `dark:border-input` | Form input borders |
| Ring | `--ring` | 216 12.2% 83.9% | `dark:focus:ring-ring` | Focus outlines |
| Chart 1 | `--chart-1` | 220 70% 50% | `dark:fill-chart-1` | Chart series 1 |
| Chart 2 | `--chart-2` | 160 60% 45% | `dark:fill-chart-2` | Chart series 2 |
| Chart 3 | `--chart-3` | 30 80% 55% | `dark:fill-chart-3` | Chart series 3 |
| Chart 4 | `--chart-4` | 280 65% 60% | `dark:fill-chart-4` | Chart series 4 |
| Chart 5 | `--chart-5` | 340 75% 55% | `dark:fill-chart-5` | Chart series 5 |

### Spacing & Layout Tokens
| Token | CSS Variable | Value | Usage |
|-------|--------------|-------|-------|
| Mobile Header Height | `--app-mobile-header-height` | 56px | Mobile header component height |
| Content Height | `--app-content-height` | 100svh | Main dashboard content height |
| Content Min Height | `--app-content-min-height` | 100svh | Minimum content height |
| Deep Background | `--deep-background` | #F5F5F8 | Body background color (fallback) |
| Foreground RGB | `--foreground-rgb` | #333 | Body text color (fallback) |
| Background Start | `--background-start-rgb` | #F4F3EC | Gradient start (unused) |
| Background End | `--background-end-rgb` | #F4F3EC | Gradient end (unused) |

### Border Radius Tokens
| Token | CSS Variable | Value | Tailwind Class |
|-------|--------------|-------|----------------|
| Default Radius | `--radius` | 0.5rem | `rounded-md` (default) |
| Large Radius | `lg` | var(--radius) | `rounded-lg` |
| Medium Radius | `md` | calc(var(--radius) - 2px) | `rounded-md` |
| Small Radius | `sm` | calc(var(--radius) - 4px) | `rounded-sm` |

---

## Custom Utility Classes
| Class | Description | CSS Properties |
|-------|-------------|----------------|
| `.no-scrollbar` | Hides scrollbars in all browsers | `scrollbar-width: none; -ms-overflow-style: none;` + `-webkit-scrollbar { display: none }` |
| `.text-balance` | Balanced text wrapping | `text-wrap: balance` |
| `.two-lines-ellipsis` | 2-line text clamp with visible ellipsis | Fixed 2-line height, `overflow: hidden`, absolute `…` pseudo-element |
| `.clamp-2` | 2-line text clamp (webkit) | `-webkit-line-clamp: 2; display: -webkit-box` |
| `.clamp-5` | 5-line text clamp (webkit) | `-webkit-line-clamp: 5; display: -webkit-box` |

---

## Component-Specific Styles

### Scrollbars
- **Webkit (Chrome, Edge, Opera)**:
  - Width: 8px (horizontal/vertical)
  - Track: Transparent, rounded 9999px
  - Thumb: `#d1d5db` (Tailwind gray-300), hover `#9ca3af` (gray-400), rounded 9999px
- **Firefox**:
  - `scrollbar-width: thin`
  - `scrollbar-color: #d1d5db transparent`

### NProgress
- Bar color: `#4f46e5` (Indigo)
- Bar height: 3px
- Spinner: Disabled

### Toast Notifications
- Custom class: `.toast-custom` with `font-size: 14px`

---

## Dark Mode Configuration
- Strategy: Class-based (`dark` class on `html` element)
- All shadcn/ui components inherit dark mode via CSS variable overrides
- Mobile breakpoint (< 767px) adjusts content height by subtracting mobile header height from viewport height

---

## Tailwind Plugins
- `tailwindcss-animate`: For animation utilities
- Built-in gradient utilities: `gradient-radial`, `gradient-conic`
