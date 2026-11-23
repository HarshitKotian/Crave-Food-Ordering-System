// @vitest-environment jsdom
import React from "react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  waitFor,
  within,
  cleanup,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { api } from "./api";
vi.mock("./api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  message: (e) => e.message,
  money: (n) => `₹${Number(n).toFixed(2)}`,
}));
const menu = [
  {
    id: 1,
    name: "Margherita Pizza",
    description: "Tomato and mozzarella.",
    category: "Pizza",
    price: 249,
    vegetarian: true,
    available: true,
    symbol: "🍕",
  },
  {
    id: 2,
    name: "Chicken Burger",
    description: "Crispy chicken and pickles.",
    category: "Burgers",
    price: 219,
    vegetarian: false,
    available: true,
    symbol: "🍔",
  },
  {
    id: 3,
    name: "Cold Coffee",
    description: "Smooth chilled coffee.",
    category: "Drinks",
    price: 129,
    vegetarian: true,
    available: false,
    symbol: "☕",
  },
];
const customer = {
  id: 1,
  name: "Test Customer",
  email: "customer@test.com",
  phone: "9876543210",
  role: "CUSTOMER",
};
function mount(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  localStorage.clear();
  api.get.mockImplementation(async (url) => ({
    data:
      url === "/menu"
        ? menu
        : url === "/auth/config"
          ? { googleEnabled: false }
          : url === "/auth/me"
            ? customer
            : [],
  }));
});
afterEach(() => cleanup());
describe("Customer ordering UI", () => {
  it("filters dishes by search, category and vegetarian choice", async () => {
    const user = userEvent.setup();
    mount();
    await screen.findByRole("heading", { name: "Margherita Pizza" });
    await user.click(screen.getByRole("button", { name: /Burgers/ }));
    expect(
      screen.queryByRole("heading", { name: "Margherita Pizza" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Chicken Burger" }),
    ).toBeInTheDocument();
    await user.click(screen.getByLabelText("Veg only"));
    expect(screen.getByText("No dishes found")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    await user.type(screen.getByLabelText("Search menu"), "mozzarella");
    expect(
      screen.getByRole("heading", { name: "Margherita Pizza" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Chicken Burger" }),
    ).not.toBeInTheDocument();
  });
  it("keeps cart quantities and sends an anonymous customer to login", async () => {
    const user = userEvent.setup();
    mount();
    await screen.findByRole("heading", { name: "Margherita Pizza" });
    const card = screen
      .getByRole("heading", { name: "Margherita Pizza" })
      .closest("article");
    await user.click(within(card).getByRole("button", { name: "Add" }));
    await user.click(within(card).getByLabelText("Increase quantity"));
    expect(JSON.parse(localStorage.getItem("crave-cart"))).toEqual([
      { id: 1, quantity: 2 },
    ]);
    await user.click(screen.getByLabelText("Open cart, 2 items"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      within(screen.getByRole("dialog")).getAllByText("₹498.00"),
    ).toHaveLength(2);
    await user.click(
      screen.getByRole("button", { name: "Sign in to checkout" }),
    );
    expect(
      screen.getByRole("heading", { name: "Welcome back." }),
    ).toBeInTheDocument();
  });
  it("prevents adding an unavailable dish", async () => {
    mount();
    await screen.findByRole("heading", { name: "Cold Coffee" });
    const card = screen
      .getByRole("heading", { name: "Cold Coffee" })
      .closest("article");
    expect(within(card).getByRole("button", { name: "Add" })).toBeDisabled();
  });
  it("places an order with IDs and quantities, then clears the bag", async () => {
    const user = userEvent.setup();
    sessionStorage.setItem("crave-token", "test");
    localStorage.setItem(
      "crave-cart",
      JSON.stringify([{ id: 1, quantity: 2 }]),
    );
    api.post.mockResolvedValue({ data: { id: 42 } });
    mount("/checkout");
    await screen.findByRole("heading", { name: "One last little detail." });
    await user.type(
      screen.getByLabelText("Delivery address"),
      "Flat 5, MG Road, Mumbai 400001",
    );
    await user.click(screen.getByRole("button", { name: /Place order/ }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/orders",
        {
          items: [{ menuItemId: 1, quantity: 2 }],
          address: "Flat 5, MG Road, Mumbai 400001",
          phone: "9876543210",
          notes: "",
        },
        { headers: { "Idempotency-Key": expect.any(String) } },
      ),
    );
    await screen.findByRole("heading", { name: "Your orders." });
    expect(JSON.parse(localStorage.getItem("crave-cart"))).toEqual([]);
  });
  it("preserves the bag when checkout fails", async () => {
    const user = userEvent.setup();
    sessionStorage.setItem("crave-token", "test");
    localStorage.setItem(
      "crave-cart",
      JSON.stringify([{ id: 1, quantity: 1 }]),
    );
    api.post.mockRejectedValue(new Error("This dish is unavailable."));
    mount("/checkout");
    await screen.findByRole("heading", { name: "One last little detail." });
    await user.type(
      screen.getByLabelText("Delivery address"),
      "Flat 5, MG Road, Mumbai 400001",
    );
    await user.click(screen.getByRole("button", { name: /Place order/ }));
    await screen.findByRole("alert");
    expect(JSON.parse(localStorage.getItem("crave-cart"))).toEqual([
      { id: 1, quantity: 1 },
    ]);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This dish is unavailable.",
    );
  });
  it("blocks a customer from the staff dashboard", async () => {
    sessionStorage.setItem("crave-token", "test");
    mount("/dashboard");
    await screen.findByRole("heading", {
      name: "This page is for restaurant staff.",
    });
    expect(api.get).not.toHaveBeenCalledWith("/staff/orders");
  });
});
