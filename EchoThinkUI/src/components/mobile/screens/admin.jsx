import React, { useEffect, useState } from "react";
import { getCSRFToken } from "../../CSRF/csrf";
import { GetIMG } from "../../scripts/GetIMG";
import "../styles/global.css";
import "../styles/loginDefault.css";

const LoginDefault = () => {
  const [Error, setError] = useState(true);
  const [Icon, setIcon] = useState("");
  const [Logo, setLogo] = useState("");
  const [home, setHome] = useState(true);
  const [relatorio, setrelatorio] = useState(false);
  const [addPerguntas, setaddPerguntas] = useState(false);
  const [listarPerguntas, setlistarPerguntas] = useState(false);
  const [listarParticipantes, setlistarParticipantes] = useState(false);
  const [listarGrupos, setlistarGrupos] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");

  useEffect(() => {
    document.title = "Gelinc";
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = Icon;
    document.head.appendChild(link);
    const fetchCsrfToken = async () => {
      getCSRFToken();
    };
    fetchCsrfToken();

    const loadImages = async () => {
      const Icon = GetIMG("EchoThink.ico");
      const Logo = GetIMG("Logo.png");
      setIcon(Icon);
      setLogo(Logo);
    };
    loadImages();
  }, []);

  // funções de navegação
  const resetViews = () => {
    setHome(false);
    setrelatorio(false);
    setaddPerguntas(false);
    setlistarPerguntas(false);
    setlistarParticipantes(false);
    setlistarGrupos(false);
  };

  const ShowHome = (e) => {
    e.preventDefault();
    resetViews();
    setHome(true);
  };

  const ShowRelatorio = (e) => {
    e.preventDefault();
    resetViews();
    setrelatorio(true);
  };

  const ShowAddPerguntas = (e) => {
    e.preventDefault();
    resetViews();
    setaddPerguntas(true);
  };

  const ShowListarPerguntas = (e) => {
    e.preventDefault();
    resetViews();
    setlistarPerguntas(true);
  };

  const ShowListarParticipantes = (e) => {
    e.preventDefault();
    resetViews();
    setlistarParticipantes(true);
  };

  const ShowListarGrupos = (e) => {
    e.preventDefault();
    resetViews();
    setlistarGrupos(true);
  };

  return (
    <section className="w-full h-screen flex flex-col bg-Primary">
      <section className="w-screen flex items-center justify-center">
        {(home || relatorio || addPerguntas || listarPerguntas || listarParticipantes || listarGrupos) && (
          <div className="w-6/12 h-screen flex items-center justify-center">
            <div className="border w-full items-center justify-center flex flex-col border-Config">
              <div className="border w-full flex bg-Secundary justify-between">
                <div className="w-5/12 bg-New justify-center items-center flex flex-col gap-2 p-4">
                  <div className="border radius20px p-2 cursor-pointer" onClick={ShowHome}>
                    <h2>Home</h2>
                  </div>
                  <div className="border radius20px p-2 cursor-pointer" onClick={ShowAddPerguntas}>
                    <h2>Adicionar Perguntas</h2>
                  </div>
                  <div className="border radius20px p-2 cursor-pointer" onClick={ShowListarPerguntas}>
                    <h2>Listar Perguntas</h2>
                  </div>
                  <div className="border radius20px p-2 cursor-pointer" onClick={ShowListarParticipantes}>
                    <h2>Listar Participantes</h2>
                  </div>
                  <div className="border radius20px p-2 cursor-pointer" onClick={ShowRelatorio}>
                    <h2>Relatório</h2>
                  </div>
                  <div className="border radius20px p-2 cursor-pointer" onClick={ShowListarGrupos}>
                    <h2>Grupos</h2>
                  </div>
                </div>

                <div className="w-full bg-New2 justify-center items-center flex flex-col">
                  {home && <h1>Home</h1>}
                  {relatorio && (
                    <>
                      <img src={Logo} alt="Logo" />
                      <h1>Relatório</h1>
                      <p>Insira seu nome completo</p>
                      <input type="text" className="p-2 border mt-2" />
                    </>
                  )}
                  {addPerguntas && (
                    <>
                      <h1>Adicionar Perguntas</h1>
                      <input type="text" placeholder="Digite a pergunta..." className="p-2 border mt-2" />
                    </>
                  )}
                  {listarPerguntas && (
                    <>
                      <h1>Lista de Perguntas</h1>
                      <p>(aqui virá a tabela com perguntas...)</p>
                    </>
                  )}
                  {listarParticipantes && (
                    <>
                      <h1>Lista de Participantes</h1>
                      <p>(aqui virá a lista dos participantes...)</p>
                    </>
                  )}
                  {listarGrupos && (
                    <>
                      <h1>Grupos de Perguntas</h1>
                      <p>Funcionalidade de gerenciamento de grupos disponível na versão desktop do admin.</p>
                    </>
                  )}
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
