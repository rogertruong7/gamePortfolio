import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "./tracker.js";

const RouteTracker = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  return null;
};

export default RouteTracker;
