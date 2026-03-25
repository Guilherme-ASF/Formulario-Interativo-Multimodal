# Endpoint para retornar IDs das perguntas já respondidas pelo usuário logado
import random
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

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

    if not respostas.exists():
        return HttpResponse("Nenhuma resposta relevante encontrada", status=404)

    df = pd.DataFrame(list(respostas))

    # Converter datetime com timezone para naive, para evitar erro no Excel
    if "data_resposta" in df.columns:
        df["data_resposta"] = pd.to_datetime(df["data_resposta"]).dt.tz_localize(None)

    # resposta final
    df["resposta_final"] = df["resposta_opcao"].combine_first(df["resposta_texto"])

    # ---------
    # NOME EXIBIDO DA PERGUNTA (sem mudar o banco)
    # title pode ficar em branco, mas no relatório sempre terá um label único.
    # ---------
    def build_label(row):
        title = row.get("question__title")
        qid = row.get("question__id")

        # normaliza title vazio
        if title is not None:
            title = str(title).strip()
        if title:
            return title  # mantém título como está

        audio = row.get("question__audio")
        if audio:
            audio_name = str(audio).split("/")[-1]  # só nome do arquivo
            return f"{audio_name} ({qid})"

        return f"Pergunta {qid}"

    df["question_label"] = df.apply(build_label, axis=1)

    # Pivot respostas
    df_pivot_resp = df.pivot(index="user__username", columns="question_label", values="resposta_final")
    df_pivot_resp.columns = [f"Resposta - {col}" for col in df_pivot_resp.columns]

    # Pivot tempo
    df_pivot_tempo = df.pivot(index="user__username", columns="question_label", values="tempo_resposta")
    df_pivot_tempo = df_pivot_tempo.applymap(lambda x: f"{x:.8f}" if pd.notnull(x) else "")
    df_pivot_tempo.columns = [f"Tempo (s) - {col}" for col in df_pivot_tempo.columns]

    # Junta
    df_final = pd.concat([df_pivot_resp, df_pivot_tempo], axis=1).reset_index()
    df_final.rename(columns={"user__username": "usuario"}, inplace=True)

    if formato == "csv":
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="relatorio_respostas_pivotado.csv"'
        df_final.to_csv(path_or_buf=response, index=False)
        return response

    elif formato == "excel":
        response = HttpResponse(
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response["Content-Disposition"] = 'attachment; filename="relatorio_respostas_pivotado.xlsx"'
        df_final.to_excel(response, index=False, engine="openpyxl")
        return response

    return HttpResponse("Formato inválido. Use 'csv' ou 'excel'.", status=400)


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

    # Pega só os IDs dos grupos do usuário
    grupos_ids = list(user.question_groups.values_list("id", flat=True))

    if not grupos_ids:
        return Response(
            {"error": "Você não está associado a nenhum grupo de perguntas."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Busca perguntas relevantes dos grupos do usuário
    # prefetch_related evita N+1 nas opções
    perguntas_qs = (
        Question.objects
        .filter(groups__id__in=grupos_ids, is_relevant=True)
        .distinct()
        .prefetch_related("options")
    )

    # Converte para lista e embaralha em memória
    perguntas = list(perguntas_qs)

    if not perguntas:
        return Response(
            {"message": "Nenhuma pergunta disponível no seu grupo."},
            status=status.HTTP_200_OK
        )

    random.shuffle(perguntas)

    serializer = QuestionSerializer(
        perguntas,
        many=True,
        context={"request": request}
    )

    return Response(serializer.data, status=status.HTTP_200_OK)

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