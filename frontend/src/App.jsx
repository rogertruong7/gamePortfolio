import "./App.css";

import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainPage from "./MainPage.jsx";
import RouteTracker from "./Analytics/RouteTracker.jsx";
import DocumentPage from "./Pages/DocumentPage.jsx";
import { allEntries } from "./Pages/catalog.js";
import RedirectToHome from "./Helpers/Redirect.jsx";
import ErrorBoundary from "./Helpers/ErrorBoundary.jsx";

// Loaded on demand so that none of the admin code ships to normal visitors.
const AdminPage = lazy(() => import("./Admin/AdminPage.jsx"));

// Standalone routes fill the window; the page scrolls inside itself.
const FullPage = ({ children }) => (
  <div style={{ display: "flex", height: "100vh" }}>{children}</div>
);

const App = () => {
  return (
    <BrowserRouter>
      <RouteTracker />
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route
            path="/admin"
            element={
              <Suspense fallback={null}>
                <AdminPage />
              </Suspense>
            }
          />
          {allEntries.map((entry) => (
            <Route
              key={entry.path}
              path={entry.path}
              element={
                <FullPage>
                  <DocumentPage entry={entry} />
                </FullPage>
              }
            />
          ))}
          <Route path="*" element={<RedirectToHome />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default App;
