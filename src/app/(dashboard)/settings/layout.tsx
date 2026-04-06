// app/loyalty/settings/layout.tsx
import SettingsSidebar from './settings-sidebar'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[var(--app-content-height)] md:h-[100svh] overflow-auto">
      <SettingsSidebar />
      <main className="flex-1 bg-gray-50 px-5 h-[fit-content] min-h-[var(--app-content-min-height)] md:min-h-[100svh]">
        {children}
      </main>
    </div>
  )
}
