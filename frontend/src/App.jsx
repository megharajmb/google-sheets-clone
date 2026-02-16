import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sheet from "./pages/Sheet";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/sheet/:id" element={<Sheet />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
