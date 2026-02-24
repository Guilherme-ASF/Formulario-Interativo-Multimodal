import React, { useState, useEffect } from "react";
import Unauthorized from "../desktop/screens/Unauthorized"; // ou uma tela específica de "sem acesso"
import LoadingScreen from "../desktop/screens/loading"; // ou uma tela específica de "sem acesso"
import { BACKEND_URL } from "../../config";

const PrivateRouteAdmin = ({ element: Element }) => {
  const [isValid, setIsValid] = useState(null);

  useEffect(() => {
    const validateAdmin = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/me/`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          setIsValid(false);
          return;
        }

        const data = await response.json();
        // Verifica se está logado e se é admin
        if (data.tipo === true) {
          setIsValid(true);
        } else {
          setIsValid(false);
        }
      } catch (error) {
        console.error("Erro ao validar admin:", error);
        setIsValid(false);
      }
    };

    validateAdmin();
  }, []);

  if (isValid === null) return <LoadingScreen />;

  return isValid ? <Element /> : <Unauthorized />;
};

export default PrivateRouteAdmin;
