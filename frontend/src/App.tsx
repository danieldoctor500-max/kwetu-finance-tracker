
import { lazy, Suspense, useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronDown,
  CircleHelp,
  CreditCard,
  Menu,
  ShieldCheck,
  Target,
  Wallet,
  X,
} from "lucide-react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminRoute from "./components/auth/AdminRoute";
import BrandMark from "./components/BrandMark";
import WorkspaceLayout from "./components/layout/WorkspaceLayout";
import AccountPage from "./pages/account/AccountPage";
import AuthPage from "./pages/auth/AuthPage";
import BudgetsPage from "./pages/budgets/BudgetsPage";
import CategoriesPage from "./pages/categories/CategoriesPage";
import SavingsGoalsPage from "./pages/savings-goals/SavingsGoalsPage";
import SettingsPage from "./pages/settings/SettingsPage";
import AccountsPage from "./pages/accounts/AccountsPage";
import DataQualityPage from "./pages/data-quality/DataQualityPage";
import "./App.css";

const ReportsPage = lazy(() => import("./pages/reports/ReportsPage"));
const ImportsPage = lazy(() => import("./pages/imports/ImportsPage"));
const AdminPage = lazy(() => import("./pages/admin/AdminPage"));
const SupportPage = lazy(() => import("./pages/support/SupportPage"));

const features = [
  {
    icon: Wallet,
    title: "Know where your money goes",
    description:
      "Record your income and spending in one place, and understand your financial habits.",
  },
  {
    icon: BarChart3,
    title: "Make a budget that works",
    description:
      "Set spending limits, monitor your progress, and make more informed everyday decisions.",
  },
  {
    icon: Target,
    title: "Make room for your goals",
    description:
      "Give your savings a purpose and track your progress towards the things that matter.",
  },
];

const transactions = [
  { name: "Salary", category: "Income", date: "01 Oct", amount: 65000, income: true },
  { name: "Groceries", category: "Food & shopping", date: "02 Oct", amount: 2450, income: false },
  { name: "Transport", category: "Getting around", date: "03 Oct", amount: 850, income: false },
];

const faqs = [
  {
    question: "What is Kwetu Finance Tracker?",
    answer:
      "Kwetu is a personal finance tool designed to help you record transactions, manage budgets, and monitor savings goals in one place.",
  },
  {
    question: "Does Kwetu use Kenyan shillings?",
    answer:
      "Yes. The interface is designed around KSh so that your financial summaries are familiar and easy to understand.",
  },
  {
    question: "Does Kwetu connect directly to M-Pesa?",
    answer:
      "Kwetu does not connect directly to M-Pesa yet. You can import a CSV or PDF statement, review each transaction, and confirm what to save. PDF reading happens locally in your browser, and Kwetu never asks for your M-Pesa PIN or password.",
  },
  {
    question: "Are the numbers shown on this page real?",
    answer:
      "No. The landing-page dashboard is a demonstration using illustrative figures. Your own financial information should only appear after you sign in and enter your data.",
  },
];

function Brand() {
  return (
    <a className="brand" href="#home" aria-label="Kwetu Finance Tracker home">
      <BrandMark />
    </a>
  );
}

function Money({ amount }: { amount: number }) {
  return (
    <>
      KSh{" "}
      {amount.toLocaleString("en-KE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
    </>
  );
}

function DashboardPreview() {
  return (
    <div className="dashboard-preview" aria-label="Illustrative finance dashboard preview">
      <div className="preview-topbar">
        <div className="preview-brand">
          <span className="preview-brand-icon">
            <Wallet size={17} />
          </span>
          <span>My finances</span>
        </div>
        <span className="demo-label">DEMO DATA</span>
      </div>

      <div className="preview-heading">
        <div>
          <p className="eyebrow">YOUR OVERVIEW</p>
          <h3>A clearer financial picture.</h3>
        </div>
        <span className="month-chip">October 2026 <ChevronDown size={13} /></span>
      </div>

      <div className="balance-card">
        <div className="balance-card-top">
          <span>Total balance</span>
          <span className="balance-icon"><Wallet size={18} /></span>
        </div>
        <strong className="balance-amount">KSh 124,850.00</strong>
        <span className="balance-caption">Illustrative balance · not linked to an account</span>
        <div className="balance-footer">
          <span><ArrowUpRight size={15} /> Income <b>KSh 85,000</b></span>
          <span><ArrowDownRight size={15} /> Expenses <b>KSh 32,450</b></span>
        </div>
      </div>

      <div className="preview-content-grid">
        <div className="preview-panel spending-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-label">MONTHLY SPENDING</span>
              <h4>KSh 32,450</h4>
            </div>
            <span className="panel-trend"><ArrowDownRight size={14} /> Spending</span>
          </div>

          <div className="chart-bars" aria-label="Illustrative weekly spending chart">
            {[35, 55, 42, 72, 48, 88, 60, 45, 75, 52, 65, 40].map(
              (height, index) => (
                <span
                  className={index === 5 ? "chart-bar highlighted" : "chart-bar"}
                  style={{ height: `${height}%` }}
                  key={index}
                />
              ),
            )}
          </div>
          <div className="chart-labels">
            <span>Week 1</span><span>Week 2</span><span>Week 3</span><span>Week 4</span>
          </div>
        </div>

        <div className="preview-panel budget-panel">
          <span className="panel-label">BUDGET PROGRESS</span>
          <h4>Monthly plan</h4>
          <div className="budget-ring">
            <div className="budget-ring-inner">
              <strong>65%</strong>
              <span>used</span>
            </div>
          </div>
          <p className="budget-remaining">KSh 17,550 left</p>
          <span className="budget-caption">of KSh 50,000 planned</span>
        </div>
      </div>

      <div className="preview-panel recent-panel">
        <div className="panel-heading recent-heading">
          <div>
            <span className="panel-label">RECENT ACTIVITY</span>
            <h4>Your latest transactions</h4>
          </div>
          <span className="sample-note">Sample</span>
        </div>
        {transactions.map((transaction) => (
          <div className="transaction-row" key={transaction.name}>
            <span className={`transaction-icon ${transaction.income ? "income-icon" : ""}`}>
              {transaction.income ? <ArrowDownRight size={17} /> : <CreditCard size={17} />}
            </span>
            <span className="transaction-name">
              <strong>{transaction.name}</strong>
              <small>{transaction.category} · {transaction.date}</small>
            </span>
            <strong className={transaction.income ? "income-amount" : "expense-amount"}>
              {transaction.income ? "+" : "−"}<Money amount={transaction.amount} />
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    const updateBackToTopVisibility = () => {
      setShowBackToTop(window.scrollY > 480);
    };
    updateBackToTopVisibility();
    window.addEventListener("scroll", updateBackToTopVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateBackToTopVisibility);
  }, []);

  return (
    <>
      <div className="site-shell">
        <header className="site-header">
          <div className="container nav-container">
            <Brand />

            <button
              className="mobile-menu-toggle"
              type="button"
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
              aria-controls="primary-navigation"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={23} /> : <Menu size={23} />}
            </button>

            <nav
              id="primary-navigation"
              className={`main-nav ${menuOpen ? "nav-open" : ""}`}
              aria-label="Main navigation"
            >
              <a href="#features" onClick={closeMenu}>Features</a>
              <a href="#how-it-works" onClick={closeMenu}>How it works</a>
              <a href="#faq" onClick={closeMenu}>FAQs</a>
              <div className="nav-actions">
                <Link className="nav-login" to="/login">Log in</Link>
                <Link className="button button-primary nav-cta" to="/register">
                  Get started <ArrowRight size={16} />
                </Link>
              </div>
            </nav>
          </div>
        </header>

        <main>
        <section className="hero-section" id="home">
          <div className="hero-photo" aria-hidden="true" />
          <div className="hero-overlay" aria-hidden="true" />
          <div className="container hero-layout">
            <div className="hero-copy">
              <div className="hero-kicker">
                <Wallet size={15} />
                <span>Made for everyday life in Kenya</span>
              </div>

              <h1>
                Your money.
                <br />
                Your plans.
                <br />
                <span>Your future.</span>
              </h1>

              <p className="hero-description">
                Take the guesswork out of your finances. Track your spending,
                build a budget, and make progress towards what matters to you.
              </p>

              <div className="hero-actions">
                <Link className="button button-primary button-large" to="/register">
                  Get started free <ArrowRight size={18} />
                </Link>
                <a className="button button-glass button-large" href="#features">
                  Explore features
                </a>
              </div>

              <div className="hero-trust">
                <span><ShieldCheck size={17} /> Your finances, organised</span>
                <span><Check size={17} /> Built around KSh</span>
              </div>
            </div>

            <div className="hero-product">
              <DashboardPreview />
              <div className="floating-note">
                <span className="floating-note-icon"><Target size={19} /></span>
                <span>
                  <strong>Small steps add up.</strong>
                  <small>Give your next goal a plan.</small>
                </span>
              </div>
            </div>
          </div>
          <a className="scroll-cue" href="#features">Discover Kwetu <span>↓</span></a>
        </section>

        <section className="trust-strip" aria-label="Product principles">
          <div className="container trust-strip-inner">
            <span>MADE FOR EVERYDAY FINANCES</span>
            <span><Check size={15} /> Clear spending insights</span>
            <span><Check size={15} /> Practical budgets</span>
            <span><Check size={15} /> Purposeful savings</span>
          </div>
        </section>

        <section className="section features-section" id="features">
          <div className="container">
            <div className="section-intro">
              <span className="section-kicker">MONEY, MADE CLEARER</span>
              <h2>Feel more in control of your money.</h2>
              <p>
                You don't need complicated spreadsheets to make better financial
                decisions. Start with a clear picture of where you stand.
              </p>
            </div>

            <div className="feature-grid">
              {features.map(({ icon: Icon, title, description }, index) => (
                <article className="feature-card" key={title}>
                  <span className="feature-icon"><Icon size={23} strokeWidth={1.8} /></span>
                  <span className="feature-number">0{index + 1}</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <Link to="/register" aria-label={`Get started: ${title}`}>
                    Get started <ArrowRight size={16} />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section how-section" id="how-it-works">
          <div className="container how-layout">
            <div className="how-copy">
              <span className="section-kicker">SIMPLE BY DESIGN</span>
              <h2>A good money habit starts with one small step.</h2>
              <p>
                Keep things manageable. Build a clearer picture of your finances
                one transaction at a time.
              </p>
              <Link className="button button-primary" to="/register">
                Start your journey <ArrowRight size={17} />
              </Link>
            </div>

            <div className="steps-list">
              <article className="step-item">
                <span className="step-number">01</span>
                <div><h3>Record what comes in and goes out</h3><p>Add your income and expenses so you can see your money more clearly.</p></div>
              </article>
              <article className="step-item">
                <span className="step-number">02</span>
                <div><h3>Make a plan for your spending</h3><p>Set budgets that reflect your priorities and keep an eye on progress.</p></div>
              </article>
              <article className="step-item">
                <span className="step-number">03</span>
                <div><h3>Keep moving towards your goals</h3><p>Track your savings progress and adjust your plan as life changes.</p></div>
              </article>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="container cta-inner">
            <div>
              <span className="section-kicker">YOUR NEXT CHAPTER</span>
              <h2>Make a little more room for what matters.</h2>
              <p>Start building a clearer picture of your finances today.</p>
            </div>
            <Link className="button button-light button-large" to="/register">
              Get started with Kwetu <ArrowRight size={18} />
            </Link>
          </div>
        </section>

        <section className="section faq-section" id="faq">
          <div className="container faq-layout">
            <div className="faq-intro">
              <span className="section-kicker">GOOD TO KNOW</span>
              <h2>Questions, answered.</h2>
              <p>Some useful details about how Kwetu works.</p>
              <CircleHelp size={34} strokeWidth={1.4} />
            </div>
            <div className="faq-list">
              {faqs.map((faq, index) => (
                <article className={`faq-item ${openFaq === index ? "faq-open" : ""}`} key={faq.question}>
                  <button
                    className="faq-question"
                    aria-expanded={openFaq === index}
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  >
                    <span>{faq.question}</span>
                    <ChevronDown size={19} />
                  </button>
                  {openFaq === index && <p className="faq-answer">{faq.answer}</p>}
                </article>
              ))}
            </div>
          </div>
        </section>
        </main>

        <footer className="site-footer">
        <div className="container footer-main">
          <div className="footer-brand-block">
            <Brand />
            <p>A clearer relationship with money starts here.</p>
          </div>
          <div className="footer-links">
            <div><strong>Explore</strong><a href="#features">Features</a><a href="#how-it-works">How it works</a><a href="#faq">FAQs</a></div>
            <div><strong>Your account</strong><Link to="/login">Log in</Link><Link to="/register">Get started</Link></div>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} Kwetu Finance Tracker</span>
          <span>Built with care for everyday money management.</span>
        </div>
        </footer>
      </div>
      {showBackToTop && (
        <button
          className="back-to-top"
          type="button"
          aria-label="Back to top"
          title="Back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <ArrowUp size={20} aria-hidden="true" />
        </button>
      )}
    </>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <WorkspaceLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AccountPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="data-quality" element={<DataQualityPage />} />
        <Route path="budgets" element={<BudgetsPage />} />
        <Route path="savings-goals" element={<SavingsGoalsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route
          path="support"
          element={
            <Suspense fallback={<p className="dashboard-card">Loading support…</p>}>
              <SupportPage />
            </Suspense>
          }
        />
        <Route
          path="admin"
          element={
            <AdminRoute>
              <Suspense fallback={<p className="dashboard-card">Loading administrator console…</p>}>
                <AdminPage />
              </Suspense>
            </AdminRoute>
          }
        />
        <Route
          path="imports"
          element={
            <Suspense fallback={<p className="dashboard-card">Loading imports…</p>}>
              <ImportsPage />
            </Suspense>
          }
        />
        <Route
          path="reports"
          element={
            <Suspense fallback={<p className="dashboard-card">Loading reports…</p>}>
              <ReportsPage />
            </Suspense>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
