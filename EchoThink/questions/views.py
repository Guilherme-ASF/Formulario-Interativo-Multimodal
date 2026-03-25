# Endpoint para retornar IDs das perguntas já respondidas pelo usuário logado
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import traceback

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def respondidas_usuario(request):
    user = request.user
    respondidas = list(UserResponse.objects.filter(user=user).values_list("question_id", flat=True))
    return Response({"respondidas": respondidas})
import os
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import permission_classes
from .models import Question, Option, UserResponse, QuestionGroup
from .serializers import QuestionSerializer, UserResponseSerializer, MultipleUserResponsesSerializer, QuestionGroupSerializer
from django.http import HttpResponse
import pandas as pd
from django.core.files.base import ContentFile
from django.utils.text import get_valid_filename


def safe_filename(name, fallback):
    """
    Garante um nome de arquivo limpo e seguro.
    """
    name = (name or "").strip()
    if not name:
        return fallback

    # remove qualquer caminho
    name = os.path.basename(name)

    # remove caracteres inválidos
    name = get_valid_filename(name)

    return name or fallback

@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def criar_pergunta(request):
    title = (request.data.get("title") or "").strip()
    question = request.data.get("question")

    image_file = request.FILES.get("image")
    audio_file = request.FILES.get("audio")

    options = request.data.getlist("options")

    if not options or len([o for o in options if str(o).strip()]) == 0:
        return Response(
            {"error": "Opções são obrigatórias."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # =========================
    # 1) Lê os bytes ANTES
    # =========================
    image_raw = None
    image_mime = None

    if image_file:
        try:
            image_raw = image_file.read()
            image_mime = getattr(image_file, "content_type", None) or "image/*"
        except Exception:
            image_raw = None
            image_mime = None

    audio_raw = None
    audio_mime = None

    if audio_file:
        try:
            audio_raw = audio_file.read()
            audio_mime = getattr(audio_file, "content_type", None) or "audio/*"
        except Exception:
            audio_raw = None
            audio_mime = None

    # =========================
    # 2) Resolve nomes (prioriza frontend)
    # =========================
    image_name = safe_filename(
        request.data.get("image_name") or getattr(image_file, "name", None),
        "image"
    )

    audio_name = safe_filename(
        request.data.get("audio_name") or getattr(audio_file, "name", None),
        "audio.wav"
    )

    # =========================
    # 3) Cria sem anexar arquivos
    # =========================
    q = Question.objects.create(
        title=title,
        question=question,
        image=None,
        audio=None,
    )

    # =========================
    # 4) Salva bytes + mime no banco
    # =========================
    if image_raw:
        q.image_bytes = image_raw
        q.image_mime = image_mime

    if audio_raw:
        q.audio_bytes = audio_raw
        q.audio_mime = audio_mime

    # =========================
    # 5) (Legado) Salva no FileField usando ContentFile
    # =========================
    if image_raw:
        q.image.save(image_name, ContentFile(image_raw), save=False)

    if audio_raw:
        q.audio.save(audio_name, ContentFile(audio_raw), save=False)

    q.save()

    # =========================
    # 6) Opções
    # =========================
    for opt in options:
        opt = str(opt).strip()
        if opt:
            Option.objects.create(question=q, text=opt)

    return Response(
        {"message": "Pergunta criada com sucesso!", "id": q.id},
        status=status.HTTP_201_CREATED
    )

@api_view(["GET"])
def listar_perguntas(request):
    perguntas = Question.objects.all()
    serializer = QuestionSerializer(perguntas, many=True, context={"request": request})
    return Response(serializer.data, status=200)

@api_view(["DELETE"])
def deletar_pergunta(request, pk):
    try:
        pergunta = Question.objects.get(pk=pk)
    except Question.DoesNotExist:
        return Response({"error": "Pergunta não encontrada."}, status=404)

    pergunta.delete()
    return Response({"message": "Pergunta excluída com sucesso."}, status=204)

@api_view(["PATCH"])
def marcar_relevante(request, pk):
    try:
        pergunta = Question.objects.get(pk=pk)
    except Question.DoesNotExist:
        return Response({"erro": "Pergunta não encontrada"}, status=status.HTTP_404_NOT_FOUND)

    is_relevant = request.data.get("is_relevant")
    if is_relevant is None:
        return Response({"erro": "Campo 'is_relevant' é obrigatório"}, status=status.HTTP_400_BAD_REQUEST)

    pergunta.is_relevant = bool(is_relevant)
    pergunta.save()

    return Response({"mensagem": "Relevância atualizada com sucesso"})

def gerar_relatorio_respostas_pivotado(request, formato):
    try:
        print("\n========== INÍCIO gerar_relatorio_respostas_pivotado ==========")
        print(f"Formato solicitado: {formato}")

        respostas = UserResponse.objects.filter(question__is_relevant=True).values(
            "user__username",
            "question__id",
            "question__title",
            "question__audio",
            "resposta_texto",
            "resposta_opcao",
            "tempo_resposta",
            "data_resposta"
        )

        print("Query montada com sucesso.")

        total_respostas = respostas.count()
        print(f"Total de respostas encontradas: {total_respostas}")

        if total_respostas == 0:
            print("Nenhuma resposta relevante encontrada.")
            return HttpResponse("Nenhuma resposta relevante encontrada", status=404)

        respostas_list = list(respostas)
        print(f"Total convertido para lista: {len(respostas_list)}")

        if respostas_list:
            print("Primeiro registro:")
            print(respostas_list[0])

        df = pd.DataFrame(respostas_list)
        print("DataFrame criado com sucesso.")
        print(f"Shape inicial do df: {df.shape}")
        print(f"Colunas do df: {list(df.columns)}")

        if df.empty:
            print("DataFrame ficou vazio após criação.")
            return HttpResponse("Nenhuma resposta relevante encontrada", status=404)

        print("Head do DataFrame:")
        print(df.head(5).to_dict(orient="records"))

        # Converter datetime com timezone para naive, para evitar erro no Excel
        if "data_resposta" in df.columns:
            print("Convertendo coluna data_resposta...")
            print("Valores antes da conversão:")
            print(df["data_resposta"].head(10).tolist())

            df["data_resposta"] = pd.to_datetime(df["data_resposta"], errors="coerce")

            print("Valores após pd.to_datetime:")
            print(df["data_resposta"].head(10).tolist())

            try:
                df["data_resposta"] = df["data_resposta"].dt.tz_localize(None)
                print("Timezone removido com sucesso.")
            except Exception as e:
                print("Erro ao remover timezone de data_resposta:")
                print(str(e))

        # resposta final
        print("Montando coluna resposta_final...")
        print("Exemplo resposta_texto:")
        print(df["resposta_texto"].head(10).tolist())
        print("Exemplo resposta_opcao:")
        print(df["resposta_opcao"].head(10).tolist())

        df["resposta_final"] = df["resposta_opcao"].combine_first(df["resposta_texto"])

        print("Coluna resposta_final criada.")
        print(df["resposta_final"].head(10).tolist())

        # ---------
        # NOME EXIBIDO DA PERGUNTA
        # ---------
        def build_label(row):
            title = row.get("question__title")
            qid = row.get("question__id")

            if title is not None:
                title = str(title).strip()
            if title:
                return title

            audio = row.get("question__audio")
            if audio:
                audio_name = str(audio).split("/")[-1]
                return f"{audio_name} ({qid})"

            return f"Pergunta {qid}"

        print("Montando coluna question_label...")
        df["question_label"] = df.apply(build_label, axis=1)

        print("Question labels criados com sucesso.")
        print("Exemplo de labels:")
        print(df["question_label"].head(20).tolist())

        print("Quantidade de labels únicas:")
        print(df["question_label"].nunique())

        # Verificar duplicidade que quebra pivot
        print("Verificando duplicidade por usuário + pergunta...")
        duplicadas = df[df.duplicated(subset=["user__username", "question_label"], keep=False)]

        print(f"Total de linhas duplicadas nesse critério: {len(duplicadas)}")
        if not duplicadas.empty:
            print("DUPLICADAS ENCONTRADAS:")
            print(duplicadas[
                ["user__username", "question__id", "question__title", "question_label", "resposta_texto", "resposta_opcao"]
            ].to_dict(orient="records"))

        # Pivot respostas
        print("Iniciando pivot de respostas...")
        df_pivot_resp = df.pivot(
            index="user__username",
            columns="question_label",
            values="resposta_final"
        )
        print("Pivot de respostas criado com sucesso.")
        print(f"Shape df_pivot_resp: {df_pivot_resp.shape}")

        df_pivot_resp.columns = [f"Resposta - {col}" for col in df_pivot_resp.columns]
        print("Colunas de respostas renomeadas.")

        # Pivot tempo
        print("Iniciando pivot de tempo...")
        df_pivot_tempo = df.pivot(
            index="user__username",
            columns="question_label",
            values="tempo_resposta"
        )
        print("Pivot de tempo criado com sucesso.")
        print(f"Shape df_pivot_tempo: {df_pivot_tempo.shape}")

        print("Valores de tempo antes do applymap:")
        print(df_pivot_tempo.head(10).to_dict())

        def format_tempo(x):
            if pd.notnull(x):
                try:
                    return f"{float(x):.8f}"
                except Exception as e:
                    print(f"Erro ao formatar tempo '{x}': {e}")
                    return str(x)
            return ""

        df_pivot_tempo = df_pivot_tempo.applymap(format_tempo)
        print("Formatação de tempo concluída.")

        df_pivot_tempo.columns = [f"Tempo (s) - {col}" for col in df_pivot_tempo.columns]
        print("Colunas de tempo renomeadas.")

        # Junta
        print("Concatenando respostas + tempos...")
        df_final = pd.concat([df_pivot_resp, df_pivot_tempo], axis=1).reset_index()
        df_final.rename(columns={"user__username": "usuario"}, inplace=True)

        print("DataFrame final criado.")
        print(f"Shape df_final: {df_final.shape}")
        print(f"Colunas finais: {list(df_final.columns)}")
        print("Prévia final:")
        print(df_final.head(5).to_dict(orient="records"))

        if formato == "csv":
            print("Gerando CSV...")
            response = HttpResponse(content_type="text/csv; charset=utf-8")
            response["Content-Disposition"] = 'attachment; filename="relatorio_respostas_pivotado.csv"'
            df_final.to_csv(path_or_buf=response, index=False)
            print("CSV gerado com sucesso.")
            print("========== FIM gerar_relatorio_respostas_pivotado ==========\n")
            return response

        elif formato == "excel":
            print("Gerando Excel...")
            response = HttpResponse(
                content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
            response["Content-Disposition"] = 'attachment; filename="relatorio_respostas_pivotado.xlsx"'
            df_final.to_excel(response, index=False, engine="openpyxl")
            print("Excel gerado com sucesso.")
            print("========== FIM gerar_relatorio_respostas_pivotado ==========\n")
            return response

        print("Formato inválido recebido.")
        return HttpResponse("Formato inválido. Use 'csv' ou 'excel'.", status=400)

    except Exception as e:
        print("\n========== ERRO EM gerar_relatorio_respostas_pivotado ==========")
        print(f"Erro: {str(e)}")
        traceback.print_exc()
        print("========== FIM ERRO ==========\n")
        return HttpResponse(f"Erro ao gerar relatório: {str(e)}", status=500)

@api_view(["POST"])
def registrar_resposta(request):
    serializer = UserResponseSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({"message": "Resposta registrada com sucesso"}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==================== QUESTION GROUP VIEWS ====================

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def listar_criar_grupos(request):
    """
    GET: Lista todos os grupos de perguntas
    POST: Cria um novo grupo de perguntas
    """
    if request.method == "GET":
        grupos = QuestionGroup.objects.all()
        serializer = QuestionGroupSerializer(grupos, many=True, context={"request": request})
        return Response(serializer.data, status=200)
    
    elif request.method == "POST":
        serializer = QuestionGroupSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def detalhe_grupo(request, pk):
    """
    GET: Retorna detalhes de um grupo
    PATCH: Atualiza um grupo de perguntas
    DELETE: Deleta um grupo de perguntas
    """
    try:
        grupo = QuestionGroup.objects.get(pk=pk)
    except QuestionGroup.DoesNotExist:
        return Response({"error": "Grupo não encontrado."}, status=404)
    
    if request.method == "GET":
        serializer = QuestionGroupSerializer(grupo, context={"request": request})
        return Response(serializer.data, status=200)
    
    elif request.method == "PATCH":
        serializer = QuestionGroupSerializer(grupo, data=request.data, partial=True, context={"request": request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=200)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == "DELETE":
        grupo.delete()
        return Response({"message": "Grupo excluído com sucesso."}, status=204)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def grupos_do_usuario(request):
    """
    Retorna todos os grupos associados ao usuário logado
    """
    grupos = QuestionGroup.objects.filter(users=request.user)
    serializer = QuestionGroupSerializer(grupos, many=True, context={"request": request})
    return Response(serializer.data, status=200)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def adicionar_usuario_ao_grupo(request, pk):
    """
    Adiciona usuários a um grupo de perguntas
    Espera: {"user_ids": [1, 2, 3]}
    """
    try:
        grupo = QuestionGroup.objects.get(pk=pk)
    except QuestionGroup.DoesNotExist:
        return Response({"error": "Grupo não encontrado."}, status=404)
    
    user_ids = request.data.get("user_ids", [])
    if not user_ids:
        return Response({"error": "Lista de user_ids é obrigatória."}, status=status.HTTP_400_BAD_REQUEST)
    
    from django.contrib.auth.models import User
    usuarios = User.objects.filter(id__in=user_ids)
    
    if not usuarios.exists():
        return Response({"error": "Nenhum usuário encontrado."}, status=status.HTTP_404_NOT_FOUND)
    
    grupo.users.add(*usuarios)
    serializer = QuestionGroupSerializer(grupo, context={"request": request})
    return Response(serializer.data, status=200)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def remover_usuario_do_grupo(request, pk):
    """
    Remove usuários de um grupo de perguntas
    Espera: {"user_ids": [1, 2, 3]}
    """
    try:
        grupo = QuestionGroup.objects.get(pk=pk)
    except QuestionGroup.DoesNotExist:
        return Response({"error": "Grupo não encontrado."}, status=404)
    
    user_ids = request.data.get("user_ids", [])
    if not user_ids:
        return Response({"error": "Lista de user_ids é obrigatória."}, status=status.HTTP_400_BAD_REQUEST)
    
    from django.contrib.auth.models import User
    usuarios = User.objects.filter(id__in=user_ids)
    
    if not usuarios.exists():
        return Response({"error": "Nenhum usuário encontrado."}, status=status.HTTP_404_NOT_FOUND)
    
    grupo.users.remove(*usuarios)
    serializer = QuestionGroupSerializer(grupo, context={"request": request})
    return Response(serializer.data, status=200)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def adicionar_pergunta_ao_grupo(request, pk):
    """
    Adiciona perguntas a um grupo
    Espera: {"question_ids": [1, 2, 3]}
    """
    try:
        grupo = QuestionGroup.objects.get(pk=pk)
    except QuestionGroup.DoesNotExist:
        return Response({"error": "Grupo não encontrado."}, status=404)
    
    question_ids = request.data.get("question_ids", [])
    if not question_ids:
        return Response({"error": "Lista de question_ids é obrigatória."}, status=status.HTTP_400_BAD_REQUEST)
    
    perguntas = Question.objects.filter(id__in=question_ids)
    
    if not perguntas.exists():
        return Response({"error": "Nenhuma pergunta encontrada."}, status=status.HTTP_404_NOT_FOUND)
    
    grupo.questions.add(*perguntas)
    serializer = QuestionGroupSerializer(grupo, context={"request": request})
    return Response(serializer.data, status=200)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def remover_pergunta_do_grupo(request, pk):
    """
    Remove perguntas de um grupo
    Espera: {"question_ids": [1, 2, 3]}
    """
    try:
        grupo = QuestionGroup.objects.get(pk=pk)
    except QuestionGroup.DoesNotExist:
        return Response({"error": "Grupo não encontrado."}, status=404)
    
    question_ids = request.data.get("question_ids", [])
    if not question_ids:
        return Response({"error": "Lista de question_ids é obrigatória."}, status=status.HTTP_400_BAD_REQUEST)
    
    perguntas = Question.objects.filter(id__in=question_ids)
    
    if not perguntas.exists():
        return Response({"error": "Nenhuma pergunta encontrada."}, status=status.HTTP_404_NOT_FOUND)
    
    grupo.questions.remove(*perguntas)
    serializer = QuestionGroupSerializer(grupo, context={"request": request})
    return Response(serializer.data, status=200)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def perguntas_do_grupo_usuario(request):
    """
    Retorna apenas as perguntas dos grupos aos quais o usuário está associado.
    Útil para a tela de responder perguntas.
    """
    user = request.user
    
    # Obtém os grupos do usuário
    grupos_do_usuario = user.question_groups.all()
    
    if not grupos_do_usuario.exists():
        return Response(
            {"error": "Você não está associado a nenhum grupo de perguntas."},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Obtém todas as perguntas dos grupos do usuário
    perguntas = Question.objects.filter(groups__in=grupos_do_usuario).distinct()
    # Filtra apenas as perguntas relevantes (opcionalmente) e embaralha a ordem
    perguntas = perguntas.filter(is_relevant=True).order_by('?')
    
    if not perguntas.exists():
        return Response(
            {"message": "Nenhuma pergunta disponível no seu grupo."},
            status=status.HTTP_200_OK
        )
    
    # Serializa as perguntas
    serializer = QuestionSerializer(perguntas, many=True, context={"request": request})
    return Response(serializer.data, status=200)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def registrar_varias_respostas(request):
    user = request.user
    respostas = request.data.get("respostas", [])

    # Pega os IDs das perguntas enviadas
    question_ids = [r.get("question") for r in respostas if r.get("question") is not None]

    # ==================== VALIDAÇÃO: PERGUNTAS DO GRUPO DO USUÁRIO ====================
    # Obtém os grupos do usuário
    grupos_do_usuario = user.question_groups.all()
    
    # Obtém todas as perguntas dos grupos do usuário
    perguntas_permitidas = Question.objects.filter(groups__in=grupos_do_usuario).distinct()
    perguntas_permitidas_ids = set(perguntas_permitidas.values_list('id', flat=True))
    
    # Verifica se todas as perguntas estão nos grupos do usuário
    question_ids_set = set(question_ids)
    perguntas_nao_autorizadas = question_ids_set - perguntas_permitidas_ids
    
    if perguntas_nao_autorizadas:
        return Response(
            {
                "error": f"Você não tem permissão para responder algumas das perguntas. "
                         f"Perguntas não autorizadas: {list(perguntas_nao_autorizadas)}"
            },
            status=status.HTTP_403_FORBIDDEN
        )

    # Verifica se já existem respostas do usuário para essas perguntas
    # Verifica se já existe resposta para cada pergunta
    perguntas_com_resposta = set(
        UserResponse.objects.filter(user=user, question_id__in=question_ids)
        .values_list('question_id', flat=True)
    )
    perguntas_nao_respondidas = [qid for qid in question_ids if qid not in perguntas_com_resposta]
    if not perguntas_nao_respondidas:
        return Response(
            {"message": "Você já respondeu todas as perguntas."},
            status=status.HTTP_200_OK
        )
    # Filtra respostas para só enviar as não respondidas
    respostas_novas = [r for r in respostas if r.get("question") in perguntas_nao_respondidas]
    if not respostas_novas:
        return Response(
            {"message": "Você já respondeu todas as perguntas."},
            status=status.HTTP_200_OK
        )
    respostas = respostas_novas

    # Adiciona o usuário nos dados das respostas
    for resposta in respostas:
        resposta["user"] = user.id

        # Força tempo_resposta com até 8 casas decimais
        if "tempo_resposta" in resposta and resposta["tempo_resposta"] is not None:
            resposta["tempo_resposta"] = float(f"{float(resposta['tempo_resposta']):.8f}")

    # Cria o serializer e salva todas as respostas
    serializer = MultipleUserResponsesSerializer(data={"respostas": respostas})
    if serializer.is_valid():
        serializer.save()
        return Response(
            {"message": "Todas as respostas foram registradas com sucesso"},
            status=status.HTTP_201_CREATED
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)