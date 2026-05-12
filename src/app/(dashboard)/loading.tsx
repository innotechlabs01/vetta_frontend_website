export default function DashboardLoading() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-800" />
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    </main>
  );
}
