import { FlaskConical } from "lucide-react";

function App() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-surface-base">
      <div className="flex flex-col items-center gap-3 text-center">
        <FlaskConical className="w-10 h-10 text-accent-primary" />
        <h1 className="text-2xl font-semibold text-text-primary">Queriously</h1>
        <p className="text-text-secondary max-w-sm">
          Your papers, but alive. Scaffold ready — wiring up the reading canvas
          next.
        </p>
      </div>
    </div>
  );
}

export default App;
