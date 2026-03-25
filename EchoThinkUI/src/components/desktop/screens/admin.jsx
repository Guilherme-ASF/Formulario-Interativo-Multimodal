import React, { useEffect, useState } from "react";
import { getCSRFToken } from "../../CSRF/csrf";
import { GetIMG } from "../../scripts/GetIMG";
import { BACKEND_URL, API_URL } from "../../../config";
import { MdHome, MdAddCircle, MdListAlt, MdPeople, MdInsertChart, MdGroup, MdImage, MdAudiotrack } from "react-icons/md";
import "../styles/global.css";
import "../styles/loginDefault.css";

const LoginDefault = () => {
  const [hasError, setHasError] = useState(true);
  const [Icon, setIcon] = useState("");
  const [Logo, setLogo] = useState("");
  const [AdicionarPergunta, setAdicionarPergunta] = useState("");
  const [Principal, setPrincipal] = useState("");
  const [Participantes, setParticipantes] = useState("");
  const [Perguntas, setPerguntas] = useState("");
  const [Relatorio, setRelatorio] = useState("");
  const [home, setHome] = useState(true);
  const [relatorio, setrelatorio] = useState(false);
  const [addPerguntas, setaddPerguntas] = useState(false);
  const [listarPerguntas, setlistarPerguntas] = useState(false);
  const [listarParticipantes, setlistarParticipantes] = useState(false);
  const [listarGrupos, setlistarGrupos] = useState(false);
  const [listarParticipantesArray, setlistarParticipantesArray] = useState([]);
  const [csrfToken, setCsrfToken] = useState("");

  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [image, setImage] = useState(null);
  const [audio, setAudio] = useState(null);
  const [options, setOptions] = useState(["", "", "", "", ""]);

  const [listaPerguntas, setListaPerguntas] = useState([]);
  const [loadingPerguntas, setLoadingPerguntas] = useState(false);
  const [loadingParticipantes, setLoadingParticipantes] = useState(false);
  const [isValid, setIsValid] = useState(null);

  // Grupos states
  const [grupos, setGrupos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loadingGrupos, setLoadingGrupos] = useState(false);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [showFormGrupo, setShowFormGrupo] = useState(false);
  const [editingGrupoId, setEditingGrupoId] = useState(null);
  const [expandedGrupoId, setExpandedGrupoId] = useState(null);
  const [formGrupo, setFormGrupo] = useState({
    name: "",
    description: "",
  });
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [selectedReportGroupId, setSelectedReportGroupId] = useState("");

  // --- util helpers ---
  const extrairNomeArquivo = (url) => {
    if (!url) return "";
    try {
      // remove query/hash
      const cleaned = url.split("?")[0].split("#")[0];
      const parts = cleaned.split("/");
      const last = parts.pop() || parts.pop(); // lida com trailing slash
      return decodeURIComponent(last || "");
    } catch (e) {
      return url;
    }
  };

  // --- participantes ---
  const fetchParticipantes = async () => {
    setLoadingParticipantes(true);
    try {
      const res = await fetch(`${API_URL}/auth/listar-participantes/`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao carregar participantes");
      const data = await res.json();
      // inverter para colocar o mais novo em cima
      setlistarParticipantesArray([...data].reverse());
    } catch (error) {
      console.error(error);
      alert("Erro ao carregar participantes");
    } finally {
      setLoadingParticipantes(false);
    }
  };

  const deleteParticipante = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este participante?"))
      return;

    try {
      const response = await fetch(
        `${API_URL}/auth/deletar-participante/${id}/`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "X-CSRFToken": csrfToken,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const err = await response.text();
        throw new Error(err);
      }

      alert("Participante excluído com sucesso!");
      fetchParticipantes(); // recarrega lista
    } catch (error) {
      console.error(error);
      alert("Erro ao excluir participante");
    }
  };

  // --- GRUPOS ---
  const fetchGrupos = async () => {
    try {
      setLoadingGrupos(true);
      const response = await fetch(
        `${API_URL}/questions/grupos/`,
        {
          method: "GET",
          credentials: "include",
        }
      );
      if (!response.ok) throw new Error("Erro ao carregar grupos");
      const data = await response.json();
      setGrupos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert("Erro ao carregar grupos");
    } finally {
      setLoadingGrupos(false);
    }
  };

  const fetchUsuarios = async () => {
    try {
      setLoadingUsuarios(true);
      const response = await fetch(
        `${API_URL}/auth/listar-participantes/`,
        {
          method: "GET",
          credentials: "include",
        }
      );
      if (response.ok) {
        const data = await response.json();
        // Converter participantes para formato de usuários
        const usuariosFormatados = data.map(p => ({
          id: p.user?.id || p.id,
          username: p.user?.username || p.nome,
          email: p.user?.email || ""
        }));
        setUsuarios(usuariosFormatados);
      }
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    } finally {
      setLoadingUsuarios(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!formGrupo.name.trim()) {
      alert("Nome do grupo é obrigatório");
      return;
    }

    try {
      const payload = {
        name: formGrupo.name,
        description: formGrupo.description,
        question_ids: selectedQuestions,
        user_ids: selectedUsers,
      };

      const response = await fetch(
        `${API_URL}/questions/grupos/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken,
          },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        let errBody = null;
        try {
          errBody = await response.json();
        } catch (e) {
          try {
            errBody = await response.text();
          } catch (_) {
            errBody = null;
          }
        }
        try {
          console.error("Erro ao criar grupo - resposta do servidor:", JSON.stringify(errBody));
        } catch (e) {
          console.error("Erro ao criar grupo - resposta do servidor:", errBody);
        }
        alert("Erro ao criar grupo. Veja console para detalhes.");
        return;
      }

      alert("Grupo criado com sucesso!");
      setFormGrupo({ name: "", description: "" });
      setSelectedUsers([]);
      setSelectedQuestions([]);
      setShowFormGrupo(false);
      fetchGrupos();
    } catch (error) {
      console.error(error);
      alert("Erro ao criar grupo");
    }
  };

  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    if (!formGrupo.name.trim()) {
      alert("Nome do grupo é obrigatório");
      return;
    }

    try {
      const payload = {
        name: formGrupo.name,
        description: formGrupo.description,
        question_ids: selectedQuestions,
        user_ids: selectedUsers,
      };

      const response = await fetch(
        `${API_URL}/questions/grupos/${editingGrupoId}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken,
          },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) throw new Error("Erro ao atualizar grupo");

      alert("Grupo atualizado com sucesso!");
      setFormGrupo({ name: "", description: "" });
      setSelectedUsers([]);
      setSelectedQuestions([]);
      setShowFormGrupo(false);
      setEditingGrupoId(null);
      fetchGrupos();
    } catch (error) {
      console.error(error);
      alert("Erro ao atualizar grupo");
    }
  };

  const handleDeleteGroup = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este grupo?")) return;

    try {
      const response = await fetch(
        `${API_URL}/questions/grupos/${id}/`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            "X-CSRFToken": csrfToken,
          },
        }
      );

      if (!response.ok) throw new Error("Erro ao excluir grupo");

      alert("Grupo excluído com sucesso!");
      fetchGrupos();
    } catch (error) {
      console.error(error);
      alert("Erro ao excluir grupo");
    }
  };

  const handleEditGroup = (grupo) => {
    setEditingGrupoId(grupo.id);
    setFormGrupo({
      name: grupo.name,
      description: grupo.description,
    });
    setSelectedUsers(grupo.users.map((u) => u.id));
    setSelectedQuestions(grupo.questions.map((q) => q.id));
    setShowFormGrupo(true);
  };

  const handleRemoveUserFromGroup = async (groupId, userId) => {
    if (!window.confirm("Tem certeza que deseja remover este usuário?"))
      return;

    try {
      const response = await fetch(
        `${API_URL}/questions/grupos/${groupId}/remover-usuario/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken,
          },
          credentials: "include",
          body: JSON.stringify({ user_ids: [userId] }),
        }
      );

      if (!response.ok) throw new Error("Erro ao remover usuário");

      alert("Usuário removido com sucesso!");
      fetchGrupos();
    } catch (error) {
      console.error(error);
      alert("Erro ao remover usuário");
    }
  };

  const handleRemoveQuestionFromGroup = async (groupId, questionId) => {
    if (
      !window.confirm("Tem certeza que deseja remover esta pergunta?")
    )
      return;

    try {
      const response = await fetch(
        `${API_URL}/questions/grupos/${groupId}/remover-pergunta/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken,
          },
          credentials: "include",
          body: JSON.stringify({ question_ids: [questionId] }),
        }
      );

      if (!response.ok) throw new Error("Erro ao remover pergunta");

      alert("Pergunta removida com sucesso!");
      fetchGrupos();
    } catch (error) {
      console.error(error);
      alert("Erro ao remover pergunta");
    }
  };

  const cancelFormGrupo = () => {
    setFormGrupo({ name: "", description: "" });
    setSelectedUsers([]);
    setSelectedQuestions([]);
    setShowFormGrupo(false);
    setEditingGrupoId(null);
  };

  const fetchPerguntas = async () => {
    try {
      setLoadingPerguntas(true);
      const response = await fetch(
        `${API_URL}/questions/listar-perguntas/`,
        {
          method: "GET",
          credentials: "include",
        },
      );
      if (!response.ok) throw new Error("Erro ao carregar perguntas");

      const data = await response.json();

      const ordenadas = [...data].sort((a, b) => Number(b.id) - Number(a.id));

      setListaPerguntas(ordenadas);
    } catch (error) {
      console.error(error);
      alert("Erro ao carregar perguntas");
    } finally {
      setLoadingPerguntas(false);
    }
  };

  const deletePergunta = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir esta pergunta?"))
      return;

    try {
      const response = await fetch(
        `${API_URL}/questions/deletar-pergunta/${id}/`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            "X-CSRFToken": csrfToken,
          },
        },
      );

      if (!response.ok) throw new Error("Erro ao excluir pergunta");

      alert("Pergunta excluída com sucesso!");
      fetchPerguntas(); // recarrega a lista após excluir
    } catch (error) {
      console.error(error);
      alert("Erro ao excluir pergunta");
    }
  };

  const marcarRelevante = async (id) => {
    try {
      const response = await fetch(
        `${API_URL}/questions/marcar-relevante/${id}/`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken,
          },
          body: JSON.stringify({ is_relevant: true }),
        },
      );

      if (!response.ok)
        throw new Error("Erro ao marcar pergunta como relevante");

      alert("Pergunta marcada como relevante!");
      // Atualiza lista corretamente
      fetchPerguntas();
    } catch (error) {
      console.error(error);
      alert("Erro ao marcar pergunta como relevante");
    }
  };

  const baixarRelatorio = async (formato) => {
    if (!selectedReportGroupId) {
      alert("Selecione um grupo antes de gerar o relatório.");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/questions/grupos/${selectedReportGroupId}/relatorio-respostas/${formato}/`,
        {
          method: "GET",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const text = await response.text();
        alert(`Erro ao gerar relatório: ${text}`);
        return;
      }

      const blob = await response.blob();

      const grupoSelecionado = grupos.find(
        (g) => String(g.id) === String(selectedReportGroupId),
      );
      const grupoSlug = (grupoSelecionado?.name || `grupo_${selectedReportGroupId}`)
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_\-]/g, "");

      const nomeArquivo =
        formato === "excel"
          ? `relatorio_respostas_${grupoSlug}.xlsx`
          : `relatorio_respostas_${grupoSlug}.csv`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nomeArquivo;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert("Erro ao baixar relatório: " + error.message);
    }
  };

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
      const Home = GetIMG("Home.png");
      const AddPergunta = GetIMG("AdicionarPergunta.png");
      const Participantes = GetIMG("Participantes.png");
      const Perguntas = GetIMG("Perguntas.png");
      const Relatorio = GetIMG("Relatorio.png");
      setAdicionarPergunta(AddPergunta);
      setPrincipal(Home);
      setParticipantes(Participantes);
      setPerguntas(Perguntas);
      setRelatorio(Relatorio);
      setIcon(Icon);
      setLogo(Logo);
    };
    loadImages();
    // cleanup: remover link se componente desmontar
    return () => {
      if (link && link.parentNode) link.parentNode.removeChild(link);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    fetchGrupos();
  };

  useEffect(() => {
    if (grupos.length > 0 && !selectedReportGroupId) {
      setSelectedReportGroupId(String(grupos[0].id));
    }
  }, [grupos, selectedReportGroupId]);

  const ShowAddPerguntas = (e) => {
    e.preventDefault();
    resetViews();
    setaddPerguntas(true);
  };

  const ShowListarPerguntas = (e) => {
    e.preventDefault();
    resetViews();
    setlistarPerguntas(true);
    fetchPerguntas();
  };

  const ShowListarParticipantes = (e) => {
    e.preventDefault();
    resetViews();
    setlistarParticipantes(true);
    fetchParticipantes();
  };

  const ShowListarGrupos = (e) => {
    e.preventDefault();
    resetViews();
    setlistarGrupos(true);
    fetchGrupos();
    fetchUsuarios();
  };

  const handleLogout = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/logout/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "X-CSRFToken": csrfToken,
        },
      });

      if (response.ok) {
        alert("Logout realizado com sucesso!");
        window.location.href = "/";
      } else {
        const data = await response.json();
        alert("Erro ao deslogar: " + (data.mensagem || "Erro desconhecido"));
      }
    } catch (error) {
      console.error("Erro no logout:", error);
    }
  };

  return (
    <section className="w-screen h-screen flex flex-col bg-Primary overflow-hidden">
      <section className="flex-1 flex items-center justify-center overflow-hidden">
        {(home ||
          relatorio ||
          addPerguntas ||
          listarPerguntas ||
          listarParticipantes ||
          listarGrupos) && (
          <div className="w-11/12 sm:w-full md:w-11/12 h-5/6 flex items-center justify-center overflow-hidden px-2 sm:px-0">
            <div className="w-full h-full flex flex-col border-Config overflow-hidden">
              <div className="w-full flex flex-1 bg-Secundary justify-between overflow-hidden flex-row">
                {/* MENU LATERAL */}
                <div className="w-20 sm:w-24 md:w-28 lg:w-2/12 min-w-[80px] bg-New flex flex-col admin-menu overflow-y-auto overflow-x-hidden justify-start items-stretch pt-2 sm:pt-4 border-r border-gray-600">
                  <div
                    className="border-l-4 border-transparent hover:border-blue-500 hover:bg-gray-700 p-3 cursor-pointer flex flex-col justify-center items-center admin-item transition-all duration-200"
                    onClick={ShowHome}
                    title="Home"
                  >
                    <MdHome className="text-3xl mb-2 text-blue-400" />
                    <h2 className="text-xs text-center font-semibold">Home</h2>
                  </div>
                  <div
                    className="border-l-4 border-transparent hover:border-green-500 hover:bg-gray-700 p-3 cursor-pointer flex flex-col justify-center items-center admin-item transition-all duration-200"
                    onClick={ShowAddPerguntas}
                    title="Adicionar Perguntas"
                  >
                    <MdAddCircle className="text-3xl mb-2 text-green-400" />
                    <h2 className="text-xs text-center font-semibold">Adicionar</h2>
                  </div>
                  <div
                    className="border-l-4 border-transparent hover:border-yellow-500 hover:bg-gray-700 p-3 cursor-pointer flex flex-col justify-center items-center admin-item transition-all duration-200"
                    onClick={ShowListarPerguntas}
                    title="Listar Perguntas"
                  >
                    <MdListAlt className="text-3xl mb-2 text-yellow-400" />
                    <h2 className="text-xs text-center font-semibold">Perguntas</h2>
                  </div>
                  <div
                    className="border-l-4 border-transparent hover:border-purple-500 hover:bg-gray-700 p-3 cursor-pointer flex flex-col justify-center items-center admin-item transition-all duration-200"
                    onClick={ShowListarParticipantes}
                    title="Listar Participantes"
                  >
                    <MdPeople className="text-3xl mb-2 text-purple-400" />
                    <h2 className="text-xs text-center font-semibold">Usuários</h2>
                  </div>
                  <div
                    className="border-l-4 border-transparent hover:border-red-500 hover:bg-gray-700 p-3 cursor-pointer flex flex-col justify-center items-center admin-item transition-all duration-200"
                    onClick={ShowRelatorio}
                    title="Relatório"
                  >
                    <MdInsertChart className="text-3xl mb-2 text-red-400" />
                    <h2 className="text-xs text-center font-semibold">Relatório</h2>
                  </div>
                  <div
                    className="border-l-4 border-transparent hover:border-cyan-500 hover:bg-gray-700 p-3 cursor-pointer flex flex-col justify-center items-center admin-item transition-all duration-200"
                    onClick={ShowListarGrupos}
                    title="Grupos de Perguntas"
                  >
                    <MdGroup className="text-3xl mb-2 text-cyan-400" />
                    <h2 className="text-xs text-center font-semibold">Grupos</h2>
                  </div>
                </div>

                {/* CONTEÚDO PRINCIPAL */}
                <div className="flex-1 bg-New3 flex flex-col overflow-auto p-2 sm:p-3 md:p-4 lg:p-4">
                  {home && (
                    <div className="flex flex-col items-center justify-center h-full p-2 sm:p-4 text-center">
                      <h1 className="text-lg sm:text-xl md:text-2xl font-semibold mb-4 text-white">
                        Bem-vindo ao sistema!
                      </h1>
                      <p className="max-w-xs sm:max-w-md text-xs sm:text-sm md:text-base text-white">
                        Use o menu à esquerda para acessar as opções relevantes
                        do sistema. Aqui você pode navegar e gerenciar todas as
                        funcionalidades disponíveis.
                      </p>
                      <button
                        onClick={handleLogout}
                        className="mt-5 w-32 sm:w-40 bg-red-500 text-white px-4 py-2 rounded text-sm sm:text-base hover:bg-red-600 transition"
                      >
                        SAIR
                      </button>
                    </div>
                  )}

                  {relatorio && (
                    <div className="self-center w-full sm:w-5/6 md:w-2/3 lg:w-2/6 flex flex-col items-center gap-3 sm:gap-4 p-3 sm:p-6 bg-gray-700 rounded-lg shadow-lg">
                      <img
                        src={Logo}
                        alt="Logo"
                        className="max-w-[100px] sm:max-w-[150px] h-auto drop-shadow-lg"
                      />
                      <h1 className="text-white text-lg sm:text-2xl font-bold">
                        Relatório
                      </h1>

                      <div className="w-full">
                        <label className="block text-white text-xs sm:text-sm mb-1">
                          Selecionar grupo
                        </label>
                        <select
                          className="w-full p-2 rounded bg-gray-600 text-white border border-gray-500"
                          value={selectedReportGroupId}
                          onChange={(e) => setSelectedReportGroupId(e.target.value)}
                        >
                          {grupos.length === 0 && <option value="">Nenhum grupo disponível</option>}
                          {grupos.map((grupo) => (
                            <option key={grupo.id} value={grupo.id}>
                              {grupo.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-2 w-full">
                        <button
                          className="flex-1 flex items-center justify-center gap-2 bg-gray-500 hover:bg-green-600 text-white font-semibold px-3 py-2 sm:px-4 rounded-lg shadow-md transition text-xs sm:text-sm"
                          onClick={() => baixarRelatorio("csv")}
                        >
                          📄 CSV
                        </button>

                        <button
                          className="flex-1 flex items-center justify-center gap-2 bg-gray-500 hover:bg-green-600 text-white font-semibold px-3 py-2 sm:px-4 rounded-lg shadow-md transition text-xs sm:text-sm"
                          onClick={() => baixarRelatorio("excel")}
                        >
                          📊 Excel
                        </button>
                      </div>
                    </div>
                  )}

                  {addPerguntas && (
                    <div className="flex flex-col items-center gap-2 sm:gap-4 w-full">
                      <h1 className="text-lg sm:text-2xl text-white font-bold">Adicionar Perguntas</h1>
                      <form
                        className="flex flex-col gap-2 w-full max-w-xs sm:max-w-sm md:max-w-lg"
                        onSubmit={async (e) => {
                          e.preventDefault();

                          // logs do state (pra ver se virou Blob/arquivo sem nome)
                          console.log("STATE audio:", audio);
                          console.log("STATE audio.name:", audio?.name);
                          console.log("STATE audio.type:", audio?.type);
                          console.log("STATE audio.size:", audio?.size);

                          console.log("STATE image:", image);
                          console.log("STATE image.name:", image?.name);
                          console.log("STATE image.type:", image?.type);
                          console.log("STATE image.size:", image?.size);

                          const formData = new FormData();
                          formData.append("title", title);
                          formData.append("question", question);

                          if (audio) {
                            // garante nome (se vier vazio/undefined, cria um fallback)
                            const audioName =
                              audio?.name && String(audio.name).trim()
                                ? audio.name
                                : `audio_${Date.now()}.wav`;

                            formData.append("audio", audio, audioName);
                            formData.append("audio_name", audioName);
                          }

                          if (image) {
                            const imageName =
                              image?.name && String(image.name).trim()
                                ? image.name
                                : `image_${Date.now()}.png`;

                            formData.append("image", image, imageName);
                            formData.append("image_name", imageName);
                          }

                          options.forEach((opt) =>
                            formData.append("options", opt),
                          );

                          // ✅ log real do conteúdo do FormData
                          console.log("=== FormData entries ===");
                          for (const [key, value] of formData.entries()) {
                            if (value instanceof File) {
                              console.log(
                                key,
                                "FILE:",
                                value.name,
                                "| type:",
                                value.type,
                                "| size:",
                                value.size,
                              );
                            } else {
                              console.log(key, value);
                            }
                          }
                          console.log("========================");

                          try {
                            const response = await fetch(
                              `${API_URL}/questions/criar-pergunta/`,
                              {
                                method: "POST",
                                body: formData,
                                credentials: "include",
                                headers: { "X-CSRFToken": csrfToken },
                              },
                            );

                            if (!response.ok)
                              throw new Error("Erro ao criar pergunta");

                            const data = await response.json();
                            alert(
                              "Pergunta criada com sucesso! ID: " + data.id,
                            );

                            setTitle("");
                            setQuestion("");
                            setImage(null);
                            setAudio(null);
                            setOptions(["", "", "", "", ""]);

                            fetchPerguntas();
                          } catch (error) {
                            console.error(error);
                            alert("Erro ao salvar pergunta");
                          }
                        }}
                      >
                        <input
                          type="text"
                          placeholder="Título da pergunta"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="p-2 text-xs sm:text-sm border border-green-950 rounded-lg bg-gray-700 text-white w-full"
                          required
                        />

                        <textarea
                          placeholder="Texto da pergunta (opcional)"
                          value={question}
                          onChange={(e) => setQuestion(e.target.value)}
                          className="p-2 text-xs sm:text-sm border border-green-950 rounded-lg bg-gray-700 text-white w-full"
                          rows={3}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 w-full">
                          <label className="flex flex-col items-center sm:items-start justify-center border border-green-950 rounded-lg p-3 sm:p-4 bg-gray-700 text-white cursor-pointer hover:bg-green-800 transition text-xs sm:text-sm">
                            <div className="flex items-center gap-2">
                              <MdImage className="text-2xl text-blue-300" />
                              <span className="font-semibold">Imagem</span>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => setImage(e.target.files[0])}
                              className="hidden"
                            />
                            {image ? (
                              <div className="mt-2 flex flex-col sm:flex-row items-center gap-2 w-full">
                                <img
                                  src={URL.createObjectURL(image)}
                                  alt="preview"
                                  className="w-20 h-20 object-cover rounded border"
                                  style={{ maxWidth: '100%', height: 'auto' }}
                                />
                                <div className="text-xs truncate max-w-[160px] w-full text-center sm:text-left">
                                  {image.name}
                                </div>
                              </div>
                            ) : (
                              <div className="mt-2 text-xs text-gray-300">Nenhuma imagem selecionada</div>
                            )}
                          </label>

                          <label className="flex flex-col items-center sm:items-start justify-center border border-green-950 rounded-lg p-3 sm:p-4 bg-gray-700 text-white cursor-pointer hover:bg-green-800 transition text-xs sm:text-sm">
                            <div className="flex items-center gap-2">
                              <MdAudiotrack className="text-2xl text-green-300" />
                              <span className="font-semibold">Áudio</span>
                            </div>
                            <input
                              type="file"
                              accept="audio/*"
                              onChange={(e) => setAudio(e.target.files[0])}
                              className="hidden"
                            />
                            {audio ? (
                              <div className="mt-2 flex flex-col sm:flex-row items-center gap-2 w-full">
                                <audio controls className="w-full sm:w-40 max-w-xs rounded border bg-gray-800" style={{ minWidth: 120 }}>
                                  <source src={URL.createObjectURL(audio)} type={audio.type} />
                                  Seu navegador não suporta áudio
                                </audio>
                                <div className="text-xs truncate max-w-[160px] w-full text-center sm:text-left">{audio.name}</div>
                              </div>
                            ) : (
                              <div className="mt-2 text-xs text-gray-300">Nenhum áudio selecionado</div>
                            )}
                          </label>
                        </div>

                        {options.map((opt, idx) => (
                          <input
                            key={idx}
                            type="text"
                            placeholder={`Alt ${idx + 1}`}
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...options];
                              newOpts[idx] = e.target.value;
                              setOptions(newOpts);
                            }}
                            className="p-2 text-xs sm:text-sm border border-green-950 rounded-lg bg-gray-700 text-white w-full"
                            required
                          />
                        ))}

                        <button
                          type="submit"
                          className="bg-blue-500 text-white px-4 py-2 rounded w-full hover:bg-blue-600 transition text-xs sm:text-sm font-semibold"
                        >
                          Salvar Pergunta
                        </button>
                      </form>
                    </div>
                  )}

                  {listarPerguntas && (
                    <div className="w-full overflow-auto flex flex-col justify-start items-start">
                      <h1 className="text-lg sm:text-2xl font-bold mb-3 sm:mb-5 text-white px-2">
                        Lista de Perguntas
                      </h1>
                      {loadingPerguntas ? (
                        <p className="text-white">Carregando perguntas...</p>
                      ) : (
                        <div className="w-full overflow-x-auto rounded-lg">
                        <table className="border w-full min-w-[700px] border-collapse border-gray-400 text-xs sm:text-sm">
                          <thead>
                            <tr className="bg-gray-700">
                              <th className="border-gray-400 p-1 sm:p-2 border text-white">
                                Rel
                              </th>
                              <th className="border-gray-400 p-1 sm:p-2 border text-white">
                                Título
                              </th>
                              <th className="border-gray-400 p-1 sm:p-2 border text-white">
                                Pergunta
                              </th>
                              <th className="border-gray-400 p-1 sm:p-2 border text-white">
                                Imagem
                              </th>
                              <th className="border-gray-400 p-1 sm:p-2 border text-white">
                                Áudio
                              </th>

                              {/* Coluna nova: nome do arquivo */}
                              <th className="border-gray-400 p-1 sm:p-2 border text-white">
                                Nome do Arquivo
                              </th>

                              <th className="border-gray-400 p-1 sm:p-2 border text-white">
                                Opções
                              </th>
                              <th className="border-gray-400 p-1 sm:p-2 border text-white">
                                Ações
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {listaPerguntas.map((p) => (
                              <tr key={p.id} className="hover:bg-gray-700 transition">
                                <td className="border-gray-400 p-1 sm:p-2 border text-center text-white">
                                  {p.is_relevant ? "On" : "Off"}
                                </td>
                                <td className="border-gray-400 p-1 sm:p-2 border text-center text-white">
                                  {p.title}
                                </td>
                                <td className="border-gray-400 p-1 sm:p-2 border text-center text-white truncate text-xs">
                                  {p.question || "-"}
                                </td>
                                <td className="border-gray-400 p-1 sm:p-2 border">
                                  {p.image_url ? (
                                    <img
                                      src={p.image_url}
                                      alt="Pergunta"
                                      className="border max-w-[60px] sm:max-w-[100px] max-h-[60px] sm:max-h-[100px] object-cover"
                                    />
                                  ) : (
                                    "-"
                                  )}
                                </td>
                                <td className="border-gray-400 p-1 sm:p-2 border">
                                  {p.audio_url ? (
                                    <audio controls className="w-20 sm:w-32 h-6 sm:h-8">
                                      <source
                                        src={p.audio_url}
                                        type="audio/mpeg"
                                      />
                                      Seu navegador não suporta áudio
                                    </audio>
                                  ) : (
                                    "-"
                                  )}
                                </td>

                                <td className="border-gray-400 p-1 sm:p-2 border text-center text-white text-xs">
                                  {p.image_filename || p.audio_filename || "—"}
                                </td>

                                <td className="border-gray-400 p-1 sm:p-2 border text-center">
                                  <ul className="list-disc pl-2 sm:pl-4 text-white text-xs">
                                    {Array.isArray(p.options) &&
                                    p.options.length > 0 ? (
                                      p.options.map((opt, idx) => (
                                        <li key={idx}>
                                          {opt && typeof opt === "object"
                                            ? opt.text
                                            : opt}
                                        </li>
                                      ))
                                    ) : (
                                      <li>-</li>
                                    )}
                                  </ul>
                                </td>
                                <td className="border-gray-400 p-1 sm:p-2 text-center border">
                                  <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 justify-center items-center">
                                  <button
                                    onClick={() => deletePergunta(p.id)}
                                    className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 text-xs whitespace-nowrap"
                                  >
                                    Excluir
                                  </button>

                                  <button
                                    onClick={() => marcarRelevante(p.id)}
                                    className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 text-xs whitespace-nowrap"
                                  >
                                    Ativar relevância
                                  </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                      )}
                    </div>
                  )}

                  {listarParticipantes && (
                    <div className="w-full overflow-auto flex flex-col justify-start items-start">
                      <h1 className="text-lg sm:text-2xl font-bold mb-3 sm:mb-5 text-white px-2">
                        Lista de Participantes
                      </h1>

                      {loadingParticipantes ? (
                        <p className="text-white text-xs sm:text-sm">
                          Carregando participantes...
                        </p>
                      ) : (
                        <div className="w-full overflow-x-auto rounded-lg">
                        <table className="border w-full min-w-[400px] border-collapse border-gray-400 text-xs sm:text-sm">
                          <thead>
                            <tr className="bg-gray-700">
                              <th className="border border-gray-400 p-1 sm:p-2 text-white">
                                Nome
                              </th>
                              <th className="border border-gray-400 p-1 sm:p-2 text-white hidden sm:table-cell">
                                Telefone
                              </th>
                              <th className="border border-gray-400 p-1 sm:p-2 text-white">
                                Ações
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {listarParticipantesArray.map((p) => (
                              <tr key={p.id} className="hover:bg-gray-700 transition">
                                <td className="border border-gray-400 p-1 sm:p-2 text-left sm:text-center text-white">
                                  {p.nome}
                                </td>
                                <td className="border border-gray-400 p-1 sm:p-2 text-center text-white hidden sm:table-cell">
                                  {p.telefone}
                                </td>
                                <td className="border border-gray-400 p-1 sm:p-2 text-center">
                                  <button
                                      className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 text-xs"
                                      onClick={() => deleteParticipante(p.id)}
                                    >
                                      Excluir
                                    </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                      )}
                    </div>
                  )}

                  {listarGrupos && (
                    <div className="w-full overflow-auto flex flex-col justify-start items-start p-2 sm:p-4">
                      <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-3 sm:mb-5">
                        <h1 className="text-lg sm:text-2xl font-bold text-white">
                          Grupos de Perguntas
                        </h1>
                        {!showFormGrupo && (
                          <button
                            onClick={() => {
                              setEditingGrupoId(null);
                              setFormGrupo({ name: "", description: "" });
                              setSelectedUsers([]);
                              setSelectedQuestions([]);
                              setShowFormGrupo(true);
                            }}
                            className="bg-blue-500 text-white px-3 py-2 sm:px-4 rounded hover:bg-blue-600 transition text-xs sm:text-sm font-semibold w-full sm:w-auto"
                          >
                            + Novo Grupo
                          </button>
                        )}
                      </div>

                      {/* Formulário */}
                      {showFormGrupo && (
                        <div className="w-full bg-gray-700 p-3 sm:p-4 rounded mb-3 sm:mb-4">
                          <h2 className="text-white text-base sm:text-xl mb-3 sm:mb-4 font-bold">
                            {editingGrupoId ? "Editar Grupo" : "Criar Novo Grupo"}
                          </h2>
                          <form
                            onSubmit={
                              editingGrupoId ? handleUpdateGroup : handleCreateGroup
                            }
                          >
                            <div className="mb-3">
                              <label className="block text-white mb-2 text-xs sm:text-sm font-semibold">
                                Nome:
                              </label>
                              <input
                                type="text"
                                value={formGrupo.name}
                                onChange={(e) =>
                                  setFormGrupo({
                                    ...formGrupo,
                                    name: e.target.value,
                                  })
                                }
                                placeholder="Nome do grupo"
                                className="w-full p-2 text-xs sm:text-sm rounded bg-gray-600 text-white"
                                required
                              />
                            </div>

                            <div className="mb-3">
                              <label className="block text-white mb-2 text-xs sm:text-sm font-semibold">
                                Descrição:
                              </label>
                              <textarea
                                value={formGrupo.description}
                                onChange={(e) =>
                                  setFormGrupo({
                                    ...formGrupo,
                                    description: e.target.value,
                                  })
                                }
                                placeholder="Descrição (opcional)"
                                className="w-full p-2 text-xs sm:text-sm rounded bg-gray-600 text-white"
                                rows="3"
                              />
                            </div>

                            <div className="mb-3">
                              <label className="block text-white mb-2 text-xs sm:text-sm font-semibold">
                                Usuários:
                              </label>
                              <div className="max-h-40 sm:max-h-48 overflow-y-auto bg-gray-600 p-2 rounded">
                                {loadingUsuarios ? (
                                  <p className="text-white text-xs">
                                    Carregando usuários...
                                  </p>
                                ) : (
                                  usuarios.map((usuario) => (
                                    <label
                                      key={usuario.id}
                                      className="flex items-center gap-2 text-white mb-2 text-xs sm:text-sm"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selectedUsers.includes(
                                          usuario.id
                                        )}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedUsers([
                                              ...selectedUsers,
                                              usuario.id,
                                            ]);
                                          } else {
                                            setSelectedUsers(
                                              selectedUsers.filter(
                                                (id) => id !== usuario.id
                                              )
                                            );
                                          }
                                        }}
                                      />
                                      {usuario.username}
                                    </label>
                                  ))
                                )}
                              </div>
                            </div>

                            <div className="mb-4">
                              <label className="block text-white mb-2 text-xs sm:text-sm font-semibold">
                                Perguntas:
                              </label>
                              <div className="max-h-40 sm:max-h-48 overflow-y-auto bg-gray-600 p-2 rounded">
                                {loadingPerguntas ? (
                                  <p className="text-white text-xs">
                                    Carregando perguntas...
                                  </p>
                                ) : (
                                  listaPerguntas.map((pergunta) => (
                                    <label
                                      key={pergunta.id}
                                      className="flex items-center gap-2 text-white mb-2 text-xs sm:text-sm"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selectedQuestions.includes(
                                          pergunta.id
                                        )}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedQuestions([
                                              ...selectedQuestions,
                                              pergunta.id,
                                            ]);
                                          } else {
                                            setSelectedQuestions(
                                              selectedQuestions.filter(
                                                (id) => id !== pergunta.id
                                              )
                                            );
                                          }
                                        }}
                                      />
                                      {pergunta.audio_filename || pergunta.title || `#${pergunta.id}`}
                                    </label>
                                  ))
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 w-full">
                              <button
                                type="submit"
                                className="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition text-xs sm:text-sm font-semibold"
                              >
                                {editingGrupoId ? "Atualizar" : "Criar"}
                              </button>
                              <button
                                type="button"
                                onClick={cancelFormGrupo}
                                className="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition text-xs sm:text-sm font-semibold"
                              >
                                Cancelar
                              </button>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* Lista de Grupos */}
                      {loadingGrupos ? (
                        <p className="text-white text-xs sm:text-sm">Carregando grupos...</p>
                      ) : grupos.length === 0 ? (
                        <p className="text-white text-xs sm:text-sm">Nenhum grupo criado.</p>
                      ) : (
                        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                          {grupos.map((grupo) => (
                            <div
                              key={grupo.id}
                              className="bg-gray-700 rounded p-3 sm:p-4"
                            >
                              <div className="flex justify-between items-start mb-3 gap-2">
                                <h3 className="text-white font-bold flex-1 text-xs sm:text-sm break-words">
                                  {grupo.name}
                                </h3>
                                <button
                                  onClick={() =>
                                    setExpandedGrupoId(
                                      expandedGrupoId === grupo.id ? null : grupo.id
                                    )
                                  }
                                  className="bg-gray-600 text-white px-2 py-1 rounded text-xs sm:text-sm flex-shrink-0"
                                >
                                  {expandedGrupoId === grupo.id ? "▼" : "▶"}
                                </button>
                              </div>

                              {expandedGrupoId === grupo.id && (
                                <>
                                  {grupo.description && (
                                    <p className="text-gray-300 text-xs sm:text-sm mb-3 italic break-words">
                                      {grupo.description}
                                    </p>
                                  )}

                                  {/* Usuários */}
                                  <div className="mb-3">
                                    <h4 className="text-white font-semibold mb-2 text-xs sm:text-sm">
                                      Usuários ({grupo.users.length})
                                    </h4>
                                    {grupo.users.length === 0 ? (
                                      <p className="text-gray-400 text-xs">
                                        Nenhum usuário
                                      </p>
                                    ) : (
                                      <div className="space-y-1 max-h-24 sm:max-h-32 overflow-y-auto">
                                        {grupo.users.map((user) => (
                                          <div
                                            key={user.id}
                                            className="flex justify-between items-center bg-gray-600 p-1 rounded text-xs gap-1"
                                          >
                                            <span className="text-white truncate flex-1">
                                              {user.username}
                                            </span>
                                            <button
                                              onClick={() =>
                                                handleRemoveUserFromGroup(
                                                  grupo.id,
                                                  user.id
                                                )
                                              }
                                              className="bg-red-500 text-white px-1.5 py-0.5 rounded hover:bg-red-600 text-xs flex-shrink-0"
                                            >
                                              X
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Perguntas */}
                                  <div className="mb-3">
                                    <h4 className="text-white font-semibold mb-2 text-xs sm:text-sm">
                                      Perguntas ({grupo.questions.length})
                                    </h4>
                                    {grupo.questions.length === 0 ? (
                                      <p className="text-gray-400 text-xs">
                                        Nenhuma pergunta
                                      </p>
                                    ) : (
                                      <div className="space-y-1 max-h-24 sm:max-h-32 overflow-y-auto">
                                        {grupo.questions.map((question) => (
                                          <div
                                            key={question.id}
                                            className="flex justify-between items-center bg-gray-600 p-1 rounded text-xs gap-1"
                                          >
                                            <span className="text-white truncate flex-1">
                                              {question.audio_filename || question.title || `#${question.id}`}
                                            </span>
                                            <button
                                              onClick={() =>
                                                handleRemoveQuestionFromGroup(
                                                  grupo.id,
                                                  question.id
                                                )
                                              }
                                              className="bg-red-500 text-white px-1.5 py-0.5 rounded hover:bg-red-600 text-xs flex-shrink-0"
                                            >
                                              X
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Ações */}
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleEditGroup(grupo)}
                                      className="flex-1 bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 text-xs"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      onClick={() => handleDeleteGroup(grupo.id)}
                                      className="flex-1 bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 text-xs"
                                    >
                                      Deletar
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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

