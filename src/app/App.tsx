import { AppRouter } from "@/app/router";
import { AuthProvider } from "@/features/auth/context/AuthContext";

function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

export default App;
