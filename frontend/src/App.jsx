import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  Search,
  Plus,
  Minus,
  X,
  Clock3,
  Leaf,
  Truck,
  Check,
  LogOut,
  UserRound,
  LayoutDashboard,
  UtensilsCrossed,
  Package,
  SlidersHorizontal,
  MapPin,
  ShieldCheck,
  Pencil,
  Trash2,
  RefreshCw,
} from "lucide-react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles.css";
import { api, message, money } from "./api";

const AppContext = createContext(null);
const useApp = () => useContext(AppContext);
const categories = [
  "All dishes",
  "Pizza",
  "Burgers",
  "Indian",
  "Sides",
  "Desserts",
  "Drinks",
];
const symbols = ["🍽️", "🍕", "🍔", "🍛", "🍟", "🍰", "🍋"];
const labels = {
  PLACED: "Order placed",
  CONFIRMED: "Confirmed",
  PREPARING: "In the kitchen",
  OUT_FOR_DELIVERY: "On the way",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};
const nextStatus = {
  PLACED: "CONFIRMED",
  CONFIRMED: "PREPARING",
  PREPARING: "OUT_FOR_DELIVERY",
  OUT_FOR_DELIVERY: "DELIVERED",
};
function readCart() {
  try {
    return JSON.parse(localStorage.getItem("crave-cart") || "[]").filter(
      (x) =>
        Number.isInteger(x.id) &&
        Number.isInteger(x.quantity) &&
        x.quantity > 0 &&
        x.quantity <= 20,
    );
  } catch {
    return [];
  }
}
export default function App() {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [cart, setCart] = useState(readCart),
    [menu, setMenu] = useState([]),
    [menuLoading, setMenuLoading] = useState(true),
    [menuError, setMenuError] = useState(""),
    [cartOpen, setCartOpen] = useState(false),
    [toast, setToast] = useState("");
  const notify = (text) => setToast(text);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const reloadMenu = async () => {
    setMenuLoading(true);
    setMenuError("");
    try {
      setMenu((await api.get("/menu")).data);
    } catch (e) {
      setMenuError(message(e));
    } finally {
      setMenuLoading(false);
    }
  };
  useEffect(() => {
    reloadMenu();
    if (sessionStorage.getItem("crave-token"))
      api
        .get("/auth/me")
        .then((r) => setUser(r.data))
        .catch(() => sessionStorage.removeItem("crave-token"))
        .finally(() => setLoading(false));
    else setLoading(false);
  }, []);
  useEffect(() => {
    localStorage.setItem("crave-cart", JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    const expire = () => {
      setUser(null);
      sessionStorage.removeItem("crave-token");
      notify("Your session ended. Please sign in again.");
    };
    window.addEventListener("crave-session-expired", expire);
    return () => window.removeEventListener("crave-session-expired", expire);
  }, []);
  const authenticate = (data) => {
    sessionStorage.setItem("crave-token", data.token);
    setUser(data.user);
  };
  const logout = () => {
    sessionStorage.removeItem("crave-token");
    setUser(null);
    setCartOpen(false);
    notify("You have signed out.");
  };
  const changeQty = (id, delta) =>
    setCart((old) => {
      const item = old.find((x) => x.id === id);
      if (item)
        return old
          .map((x) =>
            x.id === id
              ? { ...x, quantity: Math.min(20, x.quantity + delta) }
              : x,
          )
          .filter((x) => x.quantity > 0);
      return delta > 0 ? [...old, { id, quantity: 1 }] : old;
    });
  const lines = cart.map((c) => ({
    ...c,
    item: menu.find((m) => m.id === c.id),
  }));
  const subtotal = lines.reduce(
    (sum, c) => sum + (c.item?.price || 0) * c.quantity,
    0,
  );
  const count = cart.reduce((sum, c) => sum + c.quantity, 0);
  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        loading,
        cart,
        setCart,
        menu,
        menuLoading,
        menuError,
        reloadMenu,
        cartOpen,
        setCartOpen,
        changeQty,
        lines,
        subtotal,
        count,
        authenticate,
        logout,
        notify,
      }}
    >
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Menu />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/signup" element={<Auth signup />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />
          <Route
            path="/checkout"
            element={
              <Protected customer>
                <Checkout />
              </Protected>
            }
          />
          <Route
            path="/orders"
            element={
              <Protected>
                <Orders />
              </Protected>
            }
          />
          <Route
            path="/profile"
            element={
              <Protected>
                <Profile />
              </Protected>
            }
          />
          <Route
            path="/dashboard"
            element={
              <Protected staff>
                <Dashboard />
              </Protected>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      {cartOpen && <Cart />}
      {toast && (
        <div role="status" className="toast-note">
          <Check size={18} />
          {toast}
        </div>
      )}
    </AppContext.Provider>
  );
}
function Header() {
  const { user, count, setCartOpen, logout } = useApp();
  return (
    <header className="header">
      <div className="container-xl d-flex align-items-center justify-content-between gap-3">
        <Link to="/" className="brand">
          <span className="brand-icon">
            <UtensilsCrossed size={20} />
          </span>
          crave<span className="brand-dot">.</span>
        </Link>
        <nav className="main-nav">
          <NavLink to="/">Our menu</NavLink>
          {user && <NavLink to="/orders">My orders</NavLink>}
          {user && user.role !== "CUSTOMER" && (
            <NavLink to="/dashboard">Dashboard</NavLink>
          )}
        </nav>
        <div className="d-flex align-items-center gap-3">
          {user ? (
            <>
              <Link className="profile-link" to="/profile">
                <UserRound size={18} />
                <span>{user.name.split(" ")[0]}</span>
              </Link>
              <button
                className="icon-btn logout"
                title="Sign out"
                onClick={logout}
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <Link className="sign-in" to="/login">
              Sign in <ArrowRight size={15} />
            </Link>
          )}
          <button
            onClick={() => setCartOpen(true)}
            className="bag-button"
            aria-label={`Open cart, ${count} items`}
          >
            <ShoppingBag size={19} />
            <span className="bag-text">Your bag</span>
            <b>{count}</b>
          </button>
        </div>
      </div>
    </header>
  );
}
function Footer() {
  return (
    <footer className="container-xl footer">
      <Link className="brand small-brand" to="/">
        crave<span className="brand-dot">.</span>
      </Link>
      <span>Good food. Made with care.</span>
      <span>Freshly prepared · Cash on delivery</span>
    </footer>
  );
}
function Protected({ children, staff, customer }) {
  const { loading, user } = useApp();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (
    (staff && user.role === "CUSTOMER") ||
    (customer && user.role !== "CUSTOMER")
  )
    return (
      <div className="container-xl page">
        <h1>This page is for {staff ? "restaurant staff" : "customers"}.</h1>
        <Link to="/">Back to menu</Link>
      </div>
    );
  return children;
}
function Loading() {
  return (
    <div className="loading" role="status">
      <span className="spinner-border spinner-border-sm" /> Just a moment…
    </div>
  );
}
function ErrorBox({ text }) {
  return (
    text && (
      <div className="error-box" role="alert">
        {text}
      </div>
    )
  );
}
function Menu() {
  const { menu, menuLoading, menuError, reloadMenu, changeQty, cart, user } =
    useApp();
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("All dishes"),
    [veg, setVeg] = useState(false);
  const shown = menu.filter(
    (m) =>
      (category === "All dishes" || m.category === category) &&
      (!veg || m.vegetarian) &&
      `${m.name} ${m.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <section className="container-xl hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span /> FRESH FROM OUR KITCHEN
          </div>
          <h1>
            Your next
            <br />
            happy <em>meal.</em>
          </h1>
          <p>
            Big cravings. Fresh ingredients. Food that feels good,
            <br className="desktop-break" /> delivered straight to your door.
          </p>
          <a href="#menu" className="primary-btn">
            Explore the menu <ArrowRight size={18} />
          </a>
          <div className="hero-perks">
            <span>
              <Clock3 size={16} /> Made to order
            </span>
            <span>
              <Leaf size={16} /> Fresh ingredients
            </span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="art-spark spark-one">✳</div>
          <div className="art-spark spark-two">✧</div>
          <div className="food-plate">
            <div className="plate-inner">
              <span>🍔</span>
            </div>
          </div>
          <div className="floating-note note-one">
            <span>🔥</span>
            <div>
              <b>Big on flavour</b>
              <small>Made fresh, every time.</small>
            </div>
          </div>
          <div className="floating-note note-two">
            <span>🥬</span>
            <div>
              <b>A little fresh goes far.</b>
              <small>Good ingredients. Great food.</small>
            </div>
          </div>
          <div className="art-caption">a little bite of happiness ↗</div>
        </div>
      </section>
      <section className="service-strip container-xl">
        <div>
          <Truck size={23} />
          <span>
            <b>A little closer to delicious</b>
            <small>₹35 delivery · Free on orders ₹499+</small>
          </span>
        </div>
        <div>
          <UtensilsCrossed size={23} />
          <span>
            <b>Something for every craving</b>
            <small>Comfort classics & fresh favourites</small>
          </span>
        </div>
        <div>
          <ShieldCheck size={23} />
          <span>
            <b>Order with confidence</b>
            <small>Pay cash when your food arrives</small>
          </span>
        </div>
      </section>
      <section className="container-xl menu-section" id="menu">
        <div className="section-heading">
          <div>
            <div className="eyebrow muted">THE GOOD STUFF</div>
            <h2>What are you craving?</h2>
          </div>
          <label className="search-box">
            <Search size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your favourites…"
              aria-label="Search menu"
            />
          </label>
        </div>
        <div className="filter-row">
          <div className="category-list">
            {categories.map((c, i) => (
              <button
                key={c}
                className={`category-btn ${category === c ? "selected" : ""}`}
                onClick={() => setCategory(c)}
              >
                <span>{symbols[i]}</span>
                {c}
              </button>
            ))}
          </div>
          <label className="veg-toggle">
            <input
              type="checkbox"
              checked={veg}
              onChange={(e) => setVeg(e.target.checked)}
            />
            <Leaf size={15} /> Veg only
          </label>
        </div>
        <div className="results-heading">
          <span>{shown.length} dishes to brighten your day</span>
          <span>
            <SlidersHorizontal size={14} /> Freshly prepared
          </span>
        </div>
        <ErrorBox text={menuError} />
        {menuError && (
          <button className="outline-btn" onClick={reloadMenu}>
            Try again
          </button>
        )}
        {menuLoading ? (
          <Loading />
        ) : shown.length === 0 && !menuError ? (
          <div className="empty-state">
            <Search size={32} />
            <h3>No dishes found</h3>
            <p>Try another search or category.</p>
            <button
              className="outline-btn"
              onClick={() => {
                setQuery("");
                setCategory("All dishes");
                setVeg(false);
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="menu-grid">
            {shown.map((item) => {
              const qty = cart.find((c) => c.id === item.id)?.quantity || 0;
              return (
                <article
                  key={item.id}
                  className={`dish-card ${!item.available ? "unavailable" : ""}`}
                >
                  <div
                    className={`dish-art art-${item.category.toLowerCase()}`}
                  >
                    <span className="dish-symbol" aria-hidden="true">
                      {item.symbol}
                    </span>
                    <span className="dish-category">{item.category}</span>
                    {!item.available && (
                      <span className="sold-out">Currently unavailable</span>
                    )}
                  </div>
                  <div className="dish-info">
                    <div className="dish-title">
                      <h3>{item.name}</h3>
                      <span
                        className={`diet-dot ${item.vegetarian ? "veg" : "nonveg"}`}
                        title={
                          item.vegetarian ? "Vegetarian" : "Non-vegetarian"
                        }
                      />
                    </div>
                    <p>{item.description}</p>
                    <div className="dish-bottom">
                      <strong>{money(item.price)}</strong>
                      {qty ? (
                        <Quantity
                          qty={qty}
                          onMinus={() => changeQty(item.id, -1)}
                          onPlus={() => changeQty(item.id, 1)}
                        />
                      ) : (
                        <button
                          disabled={
                            !item.available ||
                            (user && user.role !== "CUSTOMER")
                          }
                          className="add-btn"
                          onClick={() => changeQty(item.id, 1)}
                        >
                          Add <Plus size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <section className="container-xl closing-banner">
        <span>✳</span>
        <div>
          <h3>Good food is a good mood.</h3>
          <p>Find your favourite. We’ll take care of the rest.</p>
        </div>
        <span>☺</span>
      </section>
    </>
  );
}
function Quantity({ qty, onMinus, onPlus }) {
  return (
    <div className="quantity">
      <button onClick={onMinus} aria-label="Decrease quantity">
        <Minus size={13} />
      </button>
      <span>{qty}</span>
      <button
        onClick={onPlus}
        disabled={qty >= 20}
        aria-label="Increase quantity"
      >
        <Plus size={13} />
      </button>
    </div>
  );
}
function Cart() {
  const { setCartOpen, lines, subtotal, changeQty, user } = useApp();
  const navigate = useNavigate();
  useEffect(() => {
    const key = (e) => {
      if (e.key === "Escape") setCartOpen(false);
    };
    document.addEventListener("keydown", key);
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", key);
    };
  }, []);
  const blocked = lines.some((x) => !x.item?.available);
  return (
    <div className="drawer-backdrop" onClick={() => setCartOpen(false)}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        className="cart-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-head">
          <h2 id="cart-title">
            Your happy bag <ShoppingBag size={23} />
          </h2>
          <button
            autoFocus
            className="icon-btn"
            onClick={() => setCartOpen(false)}
            aria-label="Close cart"
          >
            <X />
          </button>
        </div>
        {!lines.length ? (
          <div className="empty-state">
            <ShoppingBag size={42} />
            <h3>Your next meal starts here.</h3>
            <p>Add something delicious from our menu.</p>
            <button className="primary-btn" onClick={() => setCartOpen(false)}>
              Explore the menu
            </button>
          </div>
        ) : (
          <>
            <p className="muted small">Freshly prepared, just for you.</p>
            <div className="cart-items">
              {lines.map((c) => (
                <div className="cart-line" key={c.id}>
                  <div className="cart-symbol">{c.item?.symbol || "🍽️"}</div>
                  <div className="flex-grow-1">
                    <b>{c.item?.name || "Removed menu item"}</b>
                    <small>
                      {c.item ? money(c.item.price) : "Remove to continue"}
                      {c.item && !c.item.available && " · Unavailable"}
                    </small>
                    <Quantity
                      qty={c.quantity}
                      onMinus={() => changeQty(c.id, -1)}
                      onPlus={() => changeQty(c.id, 1)}
                    />
                  </div>
                  <strong>{money((c.item?.price || 0) * c.quantity)}</strong>
                </div>
              ))}
            </div>
            <div className="cart-summary">
              <Totals subtotal={subtotal} />
              <p className="small muted">
                Final prices and availability are checked at checkout.
              </p>
              <ErrorBox
                text={
                  blocked ? "Remove unavailable items before continuing." : ""
                }
              />
              <button
                className="primary-btn w-100 justify-content-between"
                disabled={blocked || (user && user.role !== "CUSTOMER")}
                onClick={() => {
                  setCartOpen(false);
                  navigate(user ? "/checkout" : "/login?next=checkout");
                }}
              >
                {user ? "Continue to checkout" : "Sign in to checkout"}
                <ArrowRight size={18} />
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
function Totals({ subtotal }) {
  const delivery = subtotal >= 499 ? 0 : 35;
  return (
    <div className="totals">
      <div>
        <span>Subtotal</span>
        <span>{money(subtotal)}</span>
      </div>
      <div>
        <span>Delivery</span>
        <span>
          {delivery === 0 ? (
            <span className="green">FREE</span>
          ) : (
            money(delivery)
          )}
        </span>
      </div>
      <div className="grand-total">
        <b>Total</b>
        <b>{money(subtotal + delivery)}</b>
      </div>
      {subtotal < 499 && (
        <small className="muted">
          Add {money(499 - subtotal)} more for free delivery.
        </small>
      )}
    </div>
  );
}
function Auth({ signup = false }) {
  const { authenticate, user } = useApp(),
    navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState(
      params.has("error")
        ? "Google sign-in failed. An existing email/password account must use password login."
        : "",
    ),
    [busy, setBusy] = useState(false),
    [google, setGoogle] = useState(false);
  useEffect(() => {
    api
      .get("/auth/config")
      .then((r) => setGoogle(r.data.googleEnabled))
      .catch(() => {});
  }, []);
  if (user)
    return (
      <Navigate
        to={
          params.get("next") === "checkout" && user.role === "CUSTOMER"
            ? "/checkout"
            : user.role === "CUSTOMER"
              ? "/"
              : "/dashboard"
        }
        replace
      />
    );
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const payload = {
      email: form.get("email"),
      password: form.get("password"),
    };
    if (signup) payload.name = form.get("name");
    try {
      const r = await api.post(
        signup ? "/auth/register" : "/auth/login",
        payload,
      );
      authenticate(r.data);
      navigate(
        params.get("next") === "checkout" && r.data.user.role === "CUSTOMER"
          ? "/checkout"
          : r.data.user.role === "CUSTOMER"
            ? "/"
            : "/dashboard",
        { replace: true },
      );
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="container-xl auth-page">
      <div className="auth-story">
        <div className="eyebrow">A SEAT AT OUR TABLE</div>
        <h1>
          Good food.
          <br />
          Great to
          <br />
          <em>see you.</em>
        </h1>
        <span className="auth-food" aria-hidden="true">
          🍜
        </span>
        <p>Your favourites are only a few clicks away.</p>
      </div>
      <div className="form-card">
        <Link className="back-link" to="/">
          <ArrowLeft size={16} /> Back to menu
        </Link>
        <h2>{signup ? "Join the table." : "Welcome back."}</h2>
        <p className="muted">
          {signup
            ? "Create your account and find your next favourite."
            : "Sign in for something delicious."}
        </p>
        <ErrorBox text={error} />
        <form onSubmit={submit}>
          {signup && (
            <label className="field-label">
              Full name
              <input name="name" required maxLength={80} autoComplete="name" />
            </label>
          )}
          <label className="field-label">
            Email address
            <input
              name="email"
              type="email"
              required
              maxLength={160}
              autoComplete="email"
            />
          </label>
          <label className="field-label">
            Password
            <input
              name="password"
              type="password"
              required
              minLength={signup ? 8 : undefined}
              maxLength={72}
              autoComplete={signup ? "new-password" : "current-password"}
            />
          </label>
          {signup && (
            <small className="muted">Use at least 8 characters.</small>
          )}
          <button
            disabled={busy}
            className="primary-btn w-100 justify-content-center mt-4"
          >
            {busy ? "Please wait…" : signup ? "Create account" : "Sign in"}
            <ArrowRight size={17} />
          </button>
        </form>
        {google && (
          <>
            <div className="or-divider">or</div>
            <a
              className="outline-btn w-100 justify-content-center"
              href="/oauth2/authorization/google"
            >
              Continue with Google
            </a>
          </>
        )}
        <p className="auth-switch">
          {signup ? "Already have an account?" : "New around here?"}{" "}
          <Link
            to={`${signup ? "/login" : "/signup"}${params.get("next") === "checkout" ? "?next=checkout" : ""}`}
          >
            {signup ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </div>
    </section>
  );
}
function OAuthCallback() {
  const { authenticate } = useApp(),
    navigate = useNavigate(),
    [error, setError] = useState("");
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const code = new URLSearchParams(window.location.hash.slice(1)).get("code");
    window.history.replaceState(null, "", "/oauth/callback");
    if (!code) {
      setError("Missing login code. Please try again.");
      return;
    }
    api
      .post("/auth/google/exchange", { code })
      .then((r) => {
        authenticate(r.data);
        navigate(r.data.user.role === "CUSTOMER" ? "/" : "/dashboard", {
          replace: true,
        });
      })
      .catch((e) => setError(message(e)));
  }, []);
  return (
    <section className="container-xl page">
      {error ? (
        <>
          <ErrorBox text={error} />
          <Link to="/login">Back to sign in</Link>
        </>
      ) : (
        <Loading />
      )}
    </section>
  );
}
function Checkout() {
  const {
      lines,
      subtotal,
      cart,
      setCart,
      user,
      notify,
      menuLoading,
      menuError,
    } = useApp(),
    navigate = useNavigate();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [placed, setPlaced] = useState(false),
    key = useRef(crypto.randomUUID());
  if (menuLoading) return <Loading />;
  if (menuError)
    return (
      <section className="container-xl page">
        <ErrorBox text={menuError} />
        <Link to="/">Return to menu</Link>
      </section>
    );
  if (placed) return <Navigate to="/orders" replace />;
  if (!cart.length) return <Navigate to="/" replace />;
  const blocked = lines.some((c) => !c.item?.available);
  async function submit(e) {
    e.preventDefault();
    if (blocked) return;
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      await api.post(
        "/orders",
        {
          items: cart.map((c) => ({ menuItemId: c.id, quantity: c.quantity })),
          address: f.get("address"),
          phone: f.get("phone"),
          notes: f.get("notes"),
        },
        { headers: { "Idempotency-Key": key.current } },
      );
      setPlaced(true);
      setCart([]);
      notify("Order placed! Our kitchen will take it from here.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="container-xl page">
      <Link to="/" className="back-link">
        <ArrowLeft size={16} /> Back to menu
      </Link>
      <div className="eyebrow mt-4">ALMOST AT YOUR DOOR</div>
      <h1 className="page-title">One last little detail.</h1>
      <div className="checkout-grid">
        <form className="panel" onSubmit={submit}>
          <h3>
            <MapPin size={22} /> Delivery details
          </h3>
          <ErrorBox text={error} />
          <ErrorBox
            text={
              blocked
                ? "Your bag contains unavailable items. Open your bag and remove them."
                : ""
            }
          />
          <label className="field-label">
            Delivery address
            <textarea
              name="address"
              required
              minLength={10}
              maxLength={500}
              rows={3}
              placeholder="Flat / building, street, area, city and PIN code"
              autoComplete="street-address"
            />
          </label>
          <label className="field-label">
            Phone number
            <input
              name="phone"
              type="tel"
              required
              maxLength={20}
              defaultValue={user.phone}
              autoComplete="tel"
              placeholder="Your contact number"
            />
          </label>
          <label className="field-label">
            Kitchen notes <span className="muted">(optional)</span>
            <textarea
              name="notes"
              maxLength={300}
              rows={2}
              placeholder="Anything you’d like us to know?"
            />
          </label>
          <div className="payment-note">
            <ShieldCheck size={22} />
            <div>
              <b>Cash on delivery</b>
              <small>Pay when your food arrives.</small>
            </div>
          </div>
          <button
            disabled={busy || blocked}
            className="primary-btn w-100 justify-content-between"
          >
            {busy ? "Placing your order…" : "Place order"}
            <span>
              {money(subtotal + (subtotal >= 499 ? 0 : 35))}{" "}
              <ArrowRight size={17} />
            </span>
          </button>
        </form>
        <aside className="panel">
          <h3>Your order</h3>
          {lines.map((c) => (
            <div className="checkout-line" key={c.id}>
              <span>
                {c.item?.symbol} {c.quantity} ×{" "}
                {c.item?.name || "Unavailable item"}
              </span>
              <b>{money((c.item?.price || 0) * c.quantity)}</b>
            </div>
          ))}
          <Totals subtotal={subtotal} />
          <p className="muted small mt-3">
            Your order total is verified by the restaurant server.
          </p>
        </aside>
      </div>
    </section>
  );
}
function OrderCard({ order, staff = false, onUpdate }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function action(status) {
    setBusy(true);
    setError("");
    try {
      if (staff)
        await api.patch(`/staff/orders/${order.id}/status`, { status });
      else await api.post(`/orders/${order.id}/cancel`);
      await onUpdate();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  const steps = [
    "PLACED",
    "CONFIRMED",
    "PREPARING",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
  ];
  const active = steps.indexOf(order.status);
  return (
    <article className="panel order-card">
      <div className="order-top">
        <div>
          <b>Order #{String(order.id).padStart(4, "0")}</b>
          <small>{new Date(order.createdAt).toLocaleString("en-IN")}</small>
        </div>
        <span className={`status-badge status-${order.status}`}>
          {labels[order.status]}
        </span>
      </div>
      {order.status !== "CANCELLED" && (
        <div className="order-progress">
          {steps.map((s, i) => (
            <div key={s} className={i <= active ? "complete" : ""}>
              <span>{i < active ? <Check size={12} /> : i + 1}</span>
              <small>{labels[s]}</small>
            </div>
          ))}
        </div>
      )}
      <div className="order-lines">
        {order.items.map((i) => (
          <div key={i.menuItemId}>
            <span>
              {i.quantity} × {i.name}
            </span>
            <span>{money(i.unitPrice * i.quantity)}</span>
          </div>
        ))}
      </div>
      <div className="order-total">
        <span>Cash on delivery · Delivery {money(order.deliveryFee)}</span>
        <b>{money(order.total)}</b>
      </div>
      <div className="order-address">
        <MapPin size={16} />
        <span>
          {staff && (
            <b>
              {order.customerName} · {order.phone}
              <br />
            </b>
          )}
          {order.address}
          {order.notes && (
            <>
              <br />
              <i>Kitchen note: {order.notes}</i>
            </>
          )}
        </span>
      </div>
      <ErrorBox text={error} />
      {staff ? (
        <div className="d-flex gap-2 mt-3">
          {nextStatus[order.status] && (
            <button
              className="primary-btn compact"
              disabled={busy}
              onClick={() => action(nextStatus[order.status])}
            >
              {busy ? "Updating…" : `Mark: ${labels[nextStatus[order.status]]}`}
            </button>
          )}
          {["PLACED", "CONFIRMED"].includes(order.status) && (
            <button
              disabled={busy}
              className="outline-btn compact"
              onClick={() => action("CANCELLED")}
            >
              Cancel order
            </button>
          )}
        </div>
      ) : (
        order.status === "PLACED" && (
          <button
            className="text-btn mt-2"
            disabled={busy}
            onClick={() => action("CANCELLED")}
          >
            {busy ? "Cancelling…" : "Cancel order"}
          </button>
        )
      )}
    </article>
  );
}
function useOrders(staff) {
  const [orders, setOrders] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  async function load() {
    try {
      setOrders((await api.get(staff ? "/staff/orders" : "/orders")).data);
      setError("");
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 12000);
    return () => clearInterval(t);
  }, [staff]);
  return { orders, loading, error, load };
}
function Orders() {
  const { orders, loading, error, load } = useOrders(false);
  return (
    <section className="container-xl page">
      <div className="section-heading">
        <div>
          <div className="eyebrow">FROM OUR KITCHEN TO YOU</div>
          <h1 className="page-title">Your orders.</h1>
        </div>
        <button className="outline-btn compact" onClick={load}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>
      <p className="muted">
        Follow every delicious step. Status refreshes every 12 seconds.
      </p>
      <ErrorBox text={error} />
      {loading ? (
        <Loading />
      ) : !orders.length ? (
        <div className="empty-state panel">
          <Package size={40} />
          <h3>No orders yet.</h3>
          <p>Your first favourite is waiting on the menu.</p>
          <Link className="primary-btn" to="/">
            Find something delicious <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="orders-grid">
          {orders.map((o) => (
            <OrderCard key={o.id} order={o} onUpdate={load} />
          ))}
        </div>
      )}
    </section>
  );
}
function Profile() {
  const { user, setUser, notify } = useApp(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      setUser(
        (
          await api.put("/auth/me", {
            name: f.get("name"),
            phone: f.get("phone"),
          })
        ).data,
      );
      notify("Profile updated.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="container-xl page profile-page">
      <div className="eyebrow">A LITTLE ABOUT YOU</div>
      <h1 className="page-title">Your profile.</h1>
      <form className="panel" onSubmit={submit}>
        <span className="status-badge">{user.role}</span>
        <ErrorBox text={error} />
        <label className="field-label">
          Full name
          <input
            name="name"
            required
            maxLength={80}
            defaultValue={user.name}
            autoComplete="name"
          />
        </label>
        <label className="field-label">
          Email address
          <input value={user.email} disabled />
        </label>
        <label className="field-label">
          Phone number
          <input
            name="phone"
            type="tel"
            maxLength={20}
            defaultValue={user.phone}
            autoComplete="tel"
          />
        </label>
        <button className="primary-btn mt-3" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
          <Check size={16} />
        </button>
      </form>
    </section>
  );
}
function Dashboard() {
  const { user } = useApp(),
    { orders, loading, error, load } = useOrders(true);
  const [tab, setTab] = useState("orders"),
    [filter, setFilter] = useState("ACTIVE");
  const shown = orders.filter(
    (o) =>
      filter === "ALL" ||
      (filter === "ACTIVE" && !["DELIVERED", "CANCELLED"].includes(o.status)) ||
      filter === o.status,
  );
  return (
    <section className="container-xl page">
      <div className="section-heading">
        <div>
          <div className="eyebrow">BEHIND THE GOOD FOOD</div>
          <h1 className="page-title">Kitchen dashboard.</h1>
        </div>
        <button className="outline-btn compact" onClick={load}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <Package />
          <small>Active orders</small>
          <b>
            {
              orders.filter(
                (o) => !["DELIVERED", "CANCELLED"].includes(o.status),
              ).length
            }
          </b>
        </div>
        <div className="stat-card">
          <Check />
          <small>Delivered orders</small>
          <b>{orders.filter((o) => o.status === "DELIVERED").length}</b>
        </div>
        <div className="stat-card">
          <ShoppingBag />
          <small>Delivered sales</small>
          <b>
            {money(
              orders
                .filter((o) => o.status === "DELIVERED")
                .reduce((s, o) => s + o.total, 0),
            )}
          </b>
        </div>
      </div>
      <p className="small muted">Figures cover the latest 200 orders.</p>
      <div className="dashboard-tabs">
        <button
          className={tab === "orders" ? "active" : ""}
          onClick={() => setTab("orders")}
        >
          Orders
        </button>
        {user.role === "ADMIN" && (
          <>
            <button
              className={tab === "menu" ? "active" : ""}
              onClick={() => setTab("menu")}
            >
              Manage menu
            </button>
            <button
              className={tab === "users" ? "active" : ""}
              onClick={() => setTab("users")}
            >
              User roles
            </button>
          </>
        )}
      </div>
      {tab === "orders" ? (
        <>
          <div className="d-flex align-items-center justify-content-between mb-3">
            <span className="muted">Orders update every 12 seconds.</span>
            <select
              className="select-control"
              aria-label="Filter orders"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="ACTIVE">Active orders</option>
              <option value="ALL">All orders</option>
              {Object.entries(labels).map(([v, l]) => (
                <option value={v} key={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <ErrorBox text={error} />
          {loading ? (
            <Loading />
          ) : shown.length ? (
            <div className="orders-grid">
              {shown.map((o) => (
                <OrderCard key={o.id} order={o} staff onUpdate={load} />
              ))}
            </div>
          ) : (
            <div className="empty-state panel">
              <Check size={40} />
              <h3>All caught up.</h3>
              <p>No orders match this filter.</p>
            </div>
          )}
        </>
      ) : tab === "menu" ? (
        <ManageMenu />
      ) : (
        <ManageUsers />
      )}
    </section>
  );
}
const blankItem = {
  name: "",
  description: "",
  category: "Pizza",
  price: "",
  vegetarian: true,
  available: true,
  symbol: "🍕",
};
function ManageMenu() {
  const { menu, reloadMenu, notify } = useApp();
  const [editing, setEditing] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [deleting, setDeleting] = useState(null);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { id, ...data } = editing;
    try {
      if (id)
        await api.put(`/menu/${id}`, { ...data, price: Number(data.price) });
      else await api.post("/menu", { ...data, price: Number(data.price) });
      setEditing(null);
      await reloadMenu();
      notify("Menu saved.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(id) {
    setBusy(true);
    setError("");
    try {
      await api.delete(`/menu/${id}`);
      setDeleting(null);
      await reloadMenu();
      notify("Menu item removed. Past orders are preserved.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="section-heading">
        <h3>Made for the menu.</h3>
        <button
          className="primary-btn compact"
          onClick={() => {
            setEditing({ ...blankItem });
            setError("");
          }}
        >
          <Plus size={16} /> Add dish
        </button>
      </div>
      <ErrorBox text={error} />
      {editing && (
        <form className="panel menu-form" onSubmit={save}>
          <div className="section-heading">
            <h3>{editing.id ? "Edit dish" : "New dish"}</h3>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setEditing(null)}
              aria-label="Close editor"
            >
              <X />
            </button>
          </div>
          <div className="row g-3">
            {[
              ["name", "Dish name", 100],
              ["symbol", "Food emoji", 20],
              ["description", "Description", 400],
            ].map(([field, label, max]) => (
              <label
                key={field}
                className={`field-label ${field === "description" ? "col-12" : "col-md-6"}`}
              >
                {label}
                <input
                  required
                  maxLength={max}
                  value={editing[field]}
                  onChange={(e) =>
                    setEditing({ ...editing, [field]: e.target.value })
                  }
                />
              </label>
            ))}
            <label className="field-label col-md-6">
              Category
              <select
                value={editing.category}
                onChange={(e) =>
                  setEditing({ ...editing, category: e.target.value })
                }
              >
                {categories.slice(1).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="field-label col-md-6">
              Price (₹)
              <input
                type="number"
                min="1"
                max="99999"
                step="0.01"
                required
                value={editing.price}
                onChange={(e) =>
                  setEditing({ ...editing, price: e.target.value })
                }
              />
            </label>
          </div>
          <div className="d-flex gap-4 my-3">
            <label>
              <input
                type="checkbox"
                checked={editing.vegetarian}
                onChange={(e) =>
                  setEditing({ ...editing, vegetarian: e.target.checked })
                }
              />{" "}
              Vegetarian
            </label>
            <label>
              <input
                type="checkbox"
                checked={editing.available}
                onChange={(e) =>
                  setEditing({ ...editing, available: e.target.checked })
                }
              />{" "}
              Available
            </label>
          </div>
          <button disabled={busy} className="primary-btn compact">
            {busy ? "Saving…" : "Save dish"}
          </button>
        </form>
      )}
      <div className="panel table-responsive">
        <table className="table align-middle">
          <thead>
            <tr>
              <th>Dish</th>
              <th>Category</th>
              <th>Price</th>
              <th>Availability</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {menu.map((m) => (
              <tr key={m.id}>
                <td>
                  {m.symbol} <b>{m.name}</b>
                </td>
                <td>{m.category}</td>
                <td>{money(m.price)}</td>
                <td>
                  <span
                    className={`status-badge ${m.available ? "status-DELIVERED" : "status-CANCELLED"}`}
                  >
                    {m.available ? "Available" : "Unavailable"}
                  </span>
                </td>
                <td>
                  <button
                    className="icon-btn"
                    aria-label={`Edit ${m.name}`}
                    onClick={() => {
                      const {
                        id,
                        name,
                        description,
                        category,
                        price,
                        vegetarian,
                        available,
                        symbol,
                      } = m;
                      setEditing({
                        id,
                        name,
                        description,
                        category,
                        price,
                        vegetarian,
                        available,
                        symbol,
                      });
                      setError("");
                    }}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="icon-btn danger"
                    aria-label={`Delete ${m.name}`}
                    onClick={() => setDeleting(m.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                  {deleting === m.id && (
                    <div className="delete-confirm">
                      Remove this dish?{" "}
                      <button
                        disabled={busy}
                        className="text-btn"
                        onClick={() => remove(m.id)}
                      >
                        Yes, remove
                      </button>{" "}
                      <button
                        className="text-btn"
                        onClick={() => setDeleting(null)}
                      >
                        Keep
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function ManageUsers() {
  const { user, notify } = useApp(),
    [users, setUsers] = useState([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(null);
  async function load() {
    try {
      setUsers((await api.get("/admin/users")).data);
      setError("");
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function role(id, role) {
    setBusy(id);
    setError("");
    try {
      await api.patch(`/admin/users/${id}/role`, { role });
      await load();
      notify("User role updated.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      <h3>User access</h3>
      <p className="muted">
        New accounts are customers. Assign staff access here. You cannot change
        your own role.
      </p>
      <ErrorBox text={error} />
      {loading ? (
        <Loading />
      ) : (
        <div className="panel table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <select
                      aria-label={`Role for ${u.name}`}
                      className="select-control"
                      value={u.role}
                      disabled={u.id === user.id || busy === u.id}
                      onChange={(e) => role(u.id, e.target.value)}
                    >
                      {["CUSTOMER", "STAFF", "ADMIN"].map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
function NotFound() {
  return (
    <section className="container-xl page empty-state">
      <h1>This table is empty.</h1>
      <p>The page you’re looking for doesn’t exist.</p>
      <Link className="primary-btn" to="/">
        Back to menu
      </Link>
    </section>
  );
}
