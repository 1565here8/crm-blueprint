import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { ThemeProvider } from "./context/ThemeContext";
import { SessionProvider } from "./context/SessionContext";
import { TradingHomePage } from "./trading/pages/TradingHomePage";
import { TradingDashboardPage } from "./trading/pages/TradingDashboardPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminPage } from "./pages/AdminPage";

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <SessionProvider>
      <AppErrorBoundary>
        <Routes>
          <Route path="/" element={<TradingHomePage />} />
          <Route path="/dashboard" element={<TradingDashboardPage />} />
          <Route path="/trading" element={<TradingDashboardPage />} />
          <Route path="/signals" element={<TradingDashboardPage />} />
          <Route path="/portfolio" element={<TradingDashboardPage />} />
          <Route path="/analytics" element={<TradingDashboardPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/overview" element={<AdminDashboardPage />} />
          <Route path="*" element={<TradingHomePage />} />
        </Routes>
      </AppErrorBoundary>
      </SessionProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
