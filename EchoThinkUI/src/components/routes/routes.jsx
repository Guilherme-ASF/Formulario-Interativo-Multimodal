import React, { useState, useEffect } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { isMobile } from "react-device-detect";

import LoginScreen from "../desktop/auth/loginDefault";
import LoadingScreen from "../desktop/screens/loading";
import QuestionsScreen from "../desktop/screens/questions";
import AdminScreen from "../desktop/screens/admin";
import ResetPasswordScreen from "../desktop/screens/reset";
import Unauthorized from "../desktop/screens/Unauthorized";
import { getCookie } from "../CSRF/csrf";
import PrivateRouteAdmin from "./PrivateRouteAdmin";
import { BACKEND_URL, API_URL } from "../../config";

const PrivateRoute = ({ element: Element }) => {
  const [isValid, setIsValid] = useState(null);
  const [csrfToken, setCsrfToken] = useState("");

  useEffect(() => {
    const validateSession = async () => {
      try {
        const csrfRes = await fetch(`${API_URL}/csrf/`, {
          method: "GET",
          credentials: "include",
        });

        const csrfData = await csrfRes.json();
        console.log("Token do backend:", csrfData.csrfToken);
        setCsrfToken(csrfData.csrfToken);

        const response = await fetch(`${BACKEND_URL}/me/`, {
          method: "GET",
          headers: {
            "X-CSRFToken": csrfData.csrfToken,
          },
          credentials: "include",
        });

        setIsValid(response.ok);
      } catch (error) {
        console.error("Erro na validação da sessão:", error);
        setIsValid(false);
      }
    };

    validateSession();
  }, []);

  if (isValid === null) {
    return <LoadingScreen />;
  }

  return isValid ? <Element /> : <Unauthorized />;
};
function RoutesComponent() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/loading" element={<LoadingScreen />} />
        <Route
          path="/questions"
          element={<PrivateRoute element={QuestionsScreen} />}
        />
        <Route path="/questions777" element={<QuestionsScreen />} />
        <Route path="/admin777" element={<AdminScreen />} />
        <Route
          path="/admin"
          element={<PrivateRouteAdmin element={AdminScreen} />}
        />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/redefinir-senha" element={<ResetPasswordScreen />} />
      </Routes>
    </BrowserRouter>
  );
}

export default RoutesComponent;
