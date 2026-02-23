import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getCSRFToken } from "../../CSRF/csrf";
import { GetIMG } from "../../scripts/GetIMG";
import { BACKEND_URL, API_URL } from "../../../config";
import "../styles/global.css";
import "../styles/loginDefault.css";

const LoginDefault = () => {
  const [Error, setError] = useState(true);
  const [Icon, setIcon] = useState("");
  const [Logo, setLogo] = useState("");
  const [Login, setLogin] = useState(true);
  const [Register, setRegister] = useState(false);
  const [Esqueceu, setEsqueceu] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");
  const [formData, setFormData] = useState({ field1: "", field2: "" });
  const navigate = useNavigate();
  const [isValid, setIsValid] = useState(null);

  const handleTelefoneChange = (e) => {
    let v = e.target.value;

    // remove tudo que não for número
    v = v.replace(/\D/g, "");

    // limita a 11 dígitos
    v = v.slice(0, 11);

    // formatação dinâmica
    if (v.length > 2 && v.length <= 7) {
      v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    } else if (v.length > 7) {
      v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
    }

    setForm((prev) => ({
      ...prev,
      telefone: v,
    }));
  };

  useEffect(() => {
    const validateSession = async () => {
      try {
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

  if (isValid === true) {
    navigate("/questions");
  }

  const [form, setForm] = useState({
    nome: "",
    username: "",
    telefone: "",
    endereco: "",
    idade: "",
    genero: "",
    email: "",
    password: "",
    consentimento: "", // novo campo
  });

  const [ErrorText, setErrorText] = useState({
    Text: "",
  });

  useEffect(() => {
    fetch(`${API_URL}/csrf/`, {
      method: "GET",
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Token do backend:", data.csrfToken);
        setCsrfToken(data.csrfToken);
      })
      .catch((err) => console.error("Erro ao buscar CSRF:", err));
  }, []);

  useEffect(() => {
    document.title = "Gelinc";
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = Icon;
    document.head.appendChild(link);
    const loadImages = async () => {
      const Icon = GetIMG("EchoThink.ico");
      const Logo = GetIMG("Logo.png");
      setIcon(Icon);
      setLogo(Logo);
    };
    loadImages();
  }, []);

  const [email, setEmail] = useState("");

  const handleSubmitReset = (e) => {
    e.preventDefault();
    solicitarRedefinicaoSenha(email);
  };

  async function solicitarRedefinicaoSenha(email) {
    try {
      const response = await fetch(
        `${API_URL}/auth/solicitar-redefinicao/`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken,
          },
          body: JSON.stringify({ email: email }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert(
          data.mensagem || "Se este email existir, você receberá instruções."
        );
      } else {
        alert(data.erro || "Erro ao solicitar redefinição de senha.");
      }
    } catch (error) {
      alert("❌ Erro de conexão com o servidor.");
    }
  }

  const ShowLogin = (event) => {
    event.preventDefault();
    setLogin(true);
    setRegister(false);
    setEsqueceu(false);
  };

  const ShowRegister = (event) => {
    event.preventDefault();
    setLogin(false);
    setEsqueceu(false);
    setRegister(true);
  };

  const ShowEsqueceu = (event) => {
    event.preventDefault();
    setLogin(false);
    setEsqueceu(true);
    setRegister(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    RegisterSubmit(e);
  };

  const LoginSubmit = (event) => {
    event.preventDefault();
    // Verifica se o CSRF token está disponível
    if (!csrfToken) {
      console.error("CSRF token is not available");
      return;
    }
    fetch(`${API_URL}/auth/login/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken,
      },
      body: JSON.stringify({
        username: form.username,
        password: form.password,
      }),
      credentials: "include", // importante para manter sessão e cookie CSRF
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        console.log("Success:", data);
        // você pode redirecionar ou mostrar mensagem aqui
        navigate("/questions"); // Redireciona para a página de dashboard após login
      })
      .catch((error) => {
        console.error("Error:", error);
        setErrorText({
          Text: "Erro ao fazer login. Verifique suas credenciais.",
        });
      });
  };

  const RegisterSubmit = (event) => {
    event.preventDefault();

    if (!csrfToken) {
      console.error("CSRF token is not available");
      return;
    }
    if (
      !form.nome ||
      !form.telefone ||
      !form.endereco ||
      !form.idade ||
      !form.genero ||
      !form.email ||
      !form.password ||
      !form.username
    ) {
      console.error("Todos os campos são obrigatórios.");
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(form.email)) {
      console.error("Email inválido.");
      return;
    }
    fetch(`${API_URL}/auth/register/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken,
      },
      body: JSON.stringify(form),
      credentials: "include", // importante para manter sessão e cookie CSRF
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Success:", data);
        alert("Cadastro realizado com sucesso! Você já pode fazer login.");
        reload(); // recarrega a página para limpar o formulário
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  const reload = () => {
    setForm({
      username: "",
      nome: "",
      telefone: "",
      endereco: "",
      idade: "",
      genero: "",
      email: "",
      password: "",
    });
    setErrorText({ Text: "" });
    setLogin(true);
    setRegister(false);
    setEsqueceu(false);
    window.location.reload();
  };

  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/hello/`)
      .then((res) => res.json())
      .then((data) => setMensagem(data.message))
      .catch((err) => console.error(err));
  }, []);

  return (
    <section className="w-full h-full flex flex-col bg-Primary justify-center items-center">
      <section className="w-screen h-full flex items-center justify-center">
        {Login && (
          <div className="w-full flex justify-center items-center min-h-screen p-4 shadow-lg">
            <div className="responsive-container shadow-lg">
              <div className="w-full items-center justify-center p-6 resposive-containerblack shadow-lg">
                <h1 className="text-center">Login</h1>
                <form onSubmit={LoginSubmit}>
                  <h2>Insira seu Username</h2>
                  <input
                    type="text"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    required
                  />
                  <h2>Insira sua senha</h2>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                  />
                  <button type="submit">Logar</button>
                </form>
                <div className="flex flex-col items-center justify-center text-white gap-2 mt-4">
                  <a href="#" onClick={ShowEsqueceu}>
                    Esqueceu sua senha?
                  </a>
                  <a href="#" onClick={ShowRegister}>
                    Não tem uma conta? Clique aqui
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
        {Register && (
          <div className="bg-Primary w-full flex justify-center items-center min-h-screen p-4">
            <div className="border-Config w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden">
              {/* CONTAINER COM SCROLL INTERNO */}
              <div className="bg-Secundary p-8 max-h-[90vh] overflow-y-auto rounded-2xl custom-scrollbar space-y-5">
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                  <h1 className="text-3xl font-bold text-center text-white drop-shadow mb-2">
                    Cadastro
                  </h1>

                  {/* Nome completo */}
                  <div className="flex flex-col gap-1">
                    <label className="text-white font-medium">
                      Nome completo
                    </label>
                    <input
                      type="text"
                      name="nome"
                      placeholder="Digite seu nome completo"
                      required
                      minLength={3}
                      className="w-full p-3 rounded-xl bg-white text-black shadow focus:outline-none focus:ring-2 focus:ring-green-400"
                      value={form.nome}
                      onChange={handleChange}
                    />
                  </div>

                  {/* Username */}
                  <div className="flex flex-col gap-1">
                    <label className="text-white font-medium">Username</label>
                    <input
                      type="text"
                      name="username"
                      placeholder="Escolha um nome de usuário"
                      required
                      minLength={3}
                      className="w-full p-3 rounded-xl bg-white text-black shadow focus:outline-none focus:ring-2 focus:ring-green-400"
                      value={form.username}
                      onChange={handleChange}
                    />
                  </div>

                  {/* Telefone */}
                  <div className="flex flex-col gap-1">
                    <label className="text-white font-medium">Telefone</label>
                    <input
                      type="text"
                      name="telefone"
                      placeholder="(XX) XXXXX-XXXX"
                      required
                      inputMode="numeric"
                      autoComplete="tel"
                      className="w-full p-3 rounded-xl bg-white text-black shadow focus:outline-none focus:ring-2 focus:ring-green-400"
                      value={form.telefone}
                      onChange={handleTelefoneChange} // <=== AGORA USA ESTA FUNÇÃO
                    />
                  </div>

                  {/* Endereço */}
                  <div className="flex flex-col gap-1">
                    <label className="text-white font-medium">Endereço</label>
                    <input
                      type="text"
                      name="endereco"
                      placeholder="Rua, número, bairro"
                      required
                      className="w-full p-3 rounded-xl bg-white text-black shadow focus:outline-none focus:ring-2 focus:ring-green-400"
                      value={form.endereco}
                      onChange={handleChange}
                    />
                  </div>

                  {/* Idade + Gênero */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex flex-col gap-1 flex-1">
                      <label className="text-white font-medium">Idade</label>
                      <input
                        type="number"
                        name="idade"
                        placeholder="Ex: 25"
                        required
                        min={10}
                        max={120}
                        className="w-full p-3 rounded-xl bg-white text-black shadow focus:outline-none focus:ring-2 focus:ring-green-400"
                        value={form.idade}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="flex flex-col gap-1 flex-1">
                      <label className="text-white font-medium">Gênero</label>
                      <select
                        name="genero"
                        required
                        className="w-full p-3 rounded-xl bg-white text-black shadow focus:outline-none focus:ring-2 focus:ring-green-400 appearance-none"
                        value={form.genero}
                        onChange={handleChange}
                      >
                        <option value="">Selecione</option>
                        <option value="masculino">Masculino</option>
                        <option value="feminino">Feminino</option>
                        <option value="outro">Outro</option>
                      </select>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex flex-col gap-1">
                    <label className="text-white font-medium">Email</label>
                    <input
                      type="email"
                      name="email"
                      placeholder="exemplo@email.com"
                      required
                      className="w-full p-3 rounded-xl bg-white text-black shadow focus:outline-none focus:ring-2 focus:ring-green-400"
                      value={form.email}
                      onChange={handleChange}
                    />
                  </div>

                  {/* Senha com olhinho */}
                  <div className="flex flex-col gap-1">
                    <label className="text-white font-medium">Senha</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        placeholder="Digite sua senha"
                        required
                        minLength={6}
                        className="w-full p-3 pr-12 rounded-xl bg-white text-black shadow focus:outline-none focus:ring-2 focus:ring-green-400"
                        value={form.password}
                        onChange={handleChange}
                      />
                      <span
                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-600"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? "🙈" : "👁️"}
                      </span>
                    </div>
                  </div>

                  {/* Consentimento - TCLE */}
                  <div className="flex flex-col gap-1">
                    <label className="text-white font-medium">
                      Você aceita os termos do TCLE enviado ao seu e-mail?
                    </label>
                    <select
                      name="consentimento"
                      required
                      className="w-full p-3 rounded-xl bg-white text-black shadow focus:outline-none focus:ring-2 focus:ring-green-400 appearance-none"
                      value={form.consentimento}
                      onChange={(e) => {
                        handleChange(e);
                        if (e.target.value === "nao") {
                          setTimeout(() => window.close(), 500);
                        }
                      }}
                    >
                      <option value="">Selecione</option>
                      <option value="sim">Sim</option>
                      <option value="nao">Não</option>
                    </select>
                  </div>

                  {/* Botão */}
                  <button
                    type="submit"
                    className={`w-full text-lg text-white font-bold p-4 rounded-xl transition shadow-lg ${
                      form.consentimento === "sim"
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-gray-400 cursor-not-allowed"
                    }`}
                    disabled={form.consentimento !== "sim"}
                  >
                    Cadastrar
                  </button>

                  {/* Link Login */}
                  <p className="text-center text-sm text-white pb-2">
                    Já tem uma conta?{" "}
                    <a
                      href="#"
                      onClick={ShowLogin}
                      className="text-green-300 font-semibold hover:underline text-base"
                    >
                      ENTRAR
                    </a>
                  </p>
                </form>
              </div>
            </div>
          </div>
        )}

        {Esqueceu && (
          <div className="bg-Primary w-full min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="border-Config w-full max-w-md rounded-lg shadow-lg">
              <div className="bg-Secundary w-full max-w-md bg-white rounded-xl shadow-lg p-6 flex flex-col items-center">
                {/* Logo */}
                <img src={Logo} alt="Logo" className="w-24 h-24 mb-4" />

                <h1 className="text-2xl font-bold text-white mb-6">
                  Esqueci a senha
                </h1>

                {/* Formulário */}
                <form
                  onSubmit={handleSubmitReset}
                  className="w-full flex flex-col gap-4 items-center"
                >
                  <div className="w-full">
                    <label className="block text-white font-medium mb-1">
                      Email
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Digite seu email"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-green-600 text-white font-semibold p-2 rounded-lg hover:bg-green-700 transition"
                  >
                    Recuperar
                  </button>
                </form>

                {/* Links */}
                <div className="flex flex-col gap-2 mt-6 text-sm text-white">
                  <a
                    href="#"
                    onClick={ShowLogin}
                    className="hover:text-green-600 hover:underline text-center text-white"
                  >
                    Já possui uma conta? Clique aqui
                  </a>
                  <a
                    href="#"
                    onClick={ShowRegister}
                    className="hover:text-green-600 hover:underline text-center text-white"
                  >
                    Não tem uma conta? Clique aqui
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </section>
  );
};

export default LoginDefault;
