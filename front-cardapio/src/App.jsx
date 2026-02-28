import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Menu from "./pages/menu.jsx";
import Product from "./pages/Product.jsx";
import Cart from "./pages/Cart.jsx";
import OrderStatus from "./pages/OrderStatus.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/t/:slug" element={<Home />} />
        <Route path="/t/:slug/menu" element={<Menu />} />
        <Route path="/t/:slug/p/:id" element={<Product />} />
        <Route path="/t/:slug/cart" element={<Cart />} />
        <Route path="/t/:slug/order/:id" element={<OrderStatus />} />
        <Route path="*" element={<Navigate to="/t/minhapizzaria" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
