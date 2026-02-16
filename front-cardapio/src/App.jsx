import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Menu from "./pages/Menu.jsx";
import Product from "./pages/Product.jsx";
import Cart from "./pages/Cart.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/t/:slug" element={<Menu />} />
        <Route path="/t/:slug/p/:id" element={<Product />} />
        <Route path="/t/:slug/cart" element={<Cart />} />
        <Route path="*" element={<Navigate to="/t/minhapizzaria" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
