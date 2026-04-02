import { AppRouter } from "@/app/router";
import { AppServicesProvider } from "@/app/providers/AppServicesProvider";
import { AuthProvider } from "@/features/auth/context/AuthContext";

function App() {
  return (
    <AuthProvider>
      <AppServicesProvider>
        <AppRouter />
      </AppServicesProvider>
    </AuthProvider>
  );
}

export default App;
