// app/app/page.tsx - Landing page en blanco
// El dashboard real está en /home
export default function AppHome() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-semibold text-muted-foreground">
          Bienvenido a Vetta
        </h1>
        <p className="text-sm text-muted-foreground">
          Selecciona una opción del menú para comenzar
        </p>
      </div>
    </div>
  );
}
