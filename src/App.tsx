import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ClockIn from "./pages/ClockIn";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Documentation from "./pages/Documentation";
import Status from "./pages/Status";
import HelpCenter from "./pages/HelpCenter";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

import Plans from "./pages/Plans";

import Features from "./pages/Features";
import LGPD from "./pages/LGPD";
import Terms from "./pages/Terms";
import Ordinance671 from "./pages/Ordinance671";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/ponto" element={<ClockIn />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route path="/documentacao" element={<Documentation />} />
          <Route path="/status" element={<Status />} />
          <Route path="/ajuda" element={<HelpCenter />} />
          <Route path="/planos" element={<Plans />} />
          <Route path="/recursos" element={<Features />} />
          <Route path="/lgpd" element={<LGPD />} />
          <Route path="/termos" element={<Terms />} />
          <Route path="/portaria671" element={<Ordinance671 />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
