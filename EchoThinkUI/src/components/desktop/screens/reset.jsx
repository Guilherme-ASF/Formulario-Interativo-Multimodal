import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BACKEND_URL, API_URL } from "../../../config";

export default function RedefinirSenha() {
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [token, setToken] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const [isValid, setIsValid] = useState(null);
  const navigate = useNavigate();
      useEffect(() => {
        const validateSession = async () => {
          try {
            // Primeiro: obter o CSRF token (o cookie será setado aqui)
            await fetch(`${API_URL}/csrf/`, {
              method: "GET",
              credentials: "include",
            })
            .then((res) => res.json())
            .then((data) => {
              console.log("Token do backend:", data.csrfToken);
              setCsrfToken(data.csrfToken);
            })
            .catch((err) => console.error("Erro ao buscar CSRF:", err));
          
            // Segundo: validar a sessão com CSRF
            const response = await fetch(`${BACKEND_URL}/me/`, {
              method: "GET",
              headers: {
                "X-CSRFToken": csrfToken,
              },
              credentials: "include",
            });
    
            if (response.ok) {
              setIsValid(true);
            } else {
              setIsValid(false);
            }
          } catch (error) {
            console.error("Erro na validação da sessão:", error);
            setIsValid(false);
          }
        };
    
        validateSession();
      }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setMensagem("⚠️ Token inválido ou ausente na URL.");
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!novaSenha || !confirmarSenha) {
      setMensagem("⚠️ Por favor, preencha todos os campos.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setMensagem("⚠️ As senhas não coincidem.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/redefinir-senha/`, {
        method: "POST",
        credentials: "include",
        headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken,
      },
        body: JSON.stringify({
          token: token,
          nova_senha: novaSenha
        })
      });

      const data = await response.json();
      if (response.ok) {
        setMensagem("✅ Senha redefinida com sucesso! Você já pode fazer login.");
        setNovaSenha("");
        setConfirmarSenha("");
        navigate("/login");
      } else {
        setMensagem(data.erro || "❌ Erro ao redefinir senha.");
      }
    } catch (error) {
      setMensagem("❌ Erro de conexão com o servidor.");
    }
  };

  return (
    <div className="w-screen flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="bg-white shadow-lg rounded-xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-4 text-gray-800">
          🔒 Redefinir Senha
        </h2>

        {mensagem && (
          <p className="text-center mb-4 text-sm text-gray-700">{mensagem}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nova senha
            </label>
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              className="mt-1 w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Digite a nova senha"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Confirmar senha
            </label>
            <input
              type="password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              className="mt-1 w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Confirme a nova senha"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition duration-200"
          >
            Redefinir Senha
          </button>
        </form>
      </div>
    </div>
  );
}
