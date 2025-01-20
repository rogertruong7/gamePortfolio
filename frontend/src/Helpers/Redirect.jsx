import React from "react";
import { Navigate } from "react-router-dom";

const RedirectToHome = () => {
  return <Navigate to="/" />;
};

export default RedirectToHome;
