import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { Header } from "./components/Header";
import Dashboard from "./pages/Dashboard";
import NewEvaluation from "./pages/NewEvaluation";
import EvaluationResult from "./pages/EvaluationResult";

function App() {
  return (
    <div className="App min-h-screen bg-slate-50 text-slate-950 font-body">
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new" element={<NewEvaluation />} />
          <Route path="/evaluation/:id" element={<EvaluationResult />} />
        </Routes>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              borderRadius: 0,
              border: "1px solid #0A0A0A",
              fontFamily: "Manrope, sans-serif",
            },
          }}
        />
      </BrowserRouter>
    </div>
  );
}

export default App;
