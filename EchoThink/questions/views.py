# Endpoint para retornar IDs das perguntas já respondidas pelo usuário logado
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import traceback

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def respondidas_usuario(request):
    user = request.user
    group_id = request.query_params.get("group_id")

    respostas = UserResponse.objects.filter(user=user)
    if group_id:
        respostas = respostas.filter(group_id=group_id)

    respondidas = list(respostas.values_list("question_id", flat=True))
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

def gerar_relatorio_respostas_pivotado(request, formato, group_id=None):
    try:
        if formato not in ["csv", "excel"]:
            return HttpResponse("Formato inválido. Use 'csv' ou 'excel'.", status=400)

        if group_id is None:
            group_id = request.query_params.get("group_id")

        if not group_id:
            return HttpResponse("group_id é obrigatório para gerar relatório por grupo.", status=400)

        try:
            grupo = QuestionGroup.objects.get(pk=group_id)
        except QuestionGroup.DoesNotExist:
            return HttpResponse("Grupo não encontrado.", status=404)

        respostas_grupo = UserResponse.objects.filter(group_id=group_id)

        # Compatibilidade com dados antigos (antes do campo group):
        # tenta mapear respostas sem grupo para usuários/perguntas que pertencem ao grupo atual.
        if not respostas_grupo.exists():
            respostas_grupo = UserResponse.objects.filter(
                group__isnull=True,
                user__in=grupo.users.all(),
                question__in=grupo.questions.all(),
            )

        if not respostas_grupo.exists():
            return HttpResponse("Nenhuma resposta encontrada para este grupo", status=404)

        # Prioriza perguntas relevantes, mas não bloqueia relatório quando nenhuma está marcada.
        respostas_relevantes = respostas_grupo.filter(question__is_relevant=True)
        respostas_base = respostas_relevantes if respostas_relevantes.exists() else respostas_grupo

        respostas = respostas_base.values(
            "user__username",
            "question__id",
            "question__title",
            "question__audio",
            "resposta_texto",
            "resposta_opcao",
            "tempo_resposta",
            "data_resposta",
        )

        df = pd.DataFrame(list(respostas))
        df["resposta_final"] = df["resposta_opcao"].combine_first(df["resposta_texto"])

        def build_label(row):
            title = (row.get("question__title") or "").strip()
            qid = row.get("question__id")
            if title:
                return f"{title} ({qid})"

            audio = row.get("question__audio")
            if audio:
                audio_name = str(audio).split("/")[-1]
                return f"{audio_name} ({qid})"

            return f"Pergunta {qid}"

        df["question_label"] = df.apply(build_label, axis=1)

        df_pivot_resp = df.pivot_table(
            index="user__username",
            columns="question_label",
            values="resposta_final",
            aggfunc="first",
        )
        df_pivot_resp.columns = [f"Resposta - {col}" for col in df_pivot_resp.columns]

        df_pivot_tempo = df.pivot_table(
            index="user__username",
            columns="question_label",
            values="tempo_resposta",
            aggfunc="first",
        )

        def format_tempo(value):
            if pd.notnull(value):
                try:
                    return f"{float(value):.8f}"
                except Exception:
                    return str(value)
            return ""

        df_pivot_tempo = df_pivot_tempo.applymap(format_tempo)
        df_pivot_tempo.columns = [f"Tempo (s) - {col}" for col in df_pivot_tempo.columns]

        df_final = pd.concat([df_pivot_resp, df_pivot_tempo], axis=1).reset_index()
        df_final.rename(columns={"user__username": "usuario"}, inplace=True)

        if formato == "csv":
            response = HttpResponse(content_type="text/csv; charset=utf-8")
            filename = f"relatorio_respostas_grupo_{grupo.id}.csv"
            response["Content-Disposition"] = f'attachment; filename="{filename}"'
            df_final.to_csv(path_or_buf=response, index=False)
            return response

        response = HttpResponse(
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        filename = f"relatorio_respostas_grupo_{grupo.id}.xlsx"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        df_final.to_excel(response, index=False, engine="openpyxl")
        return response

    except Exception as e:
        traceback.print_exc()
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
def perguntas_do_grupo_usuario(request, group_id=None):
    """
    Retorna apenas as perguntas dos grupos aos quais o usuário está associado.
    Útil para a tela de responder perguntas.
    """
    user = request.user
    if group_id is None:
        group_id = request.query_params.get("group_id")

    if not group_id:
        return Response(
            {"error": "group_id é obrigatório para carregar perguntas do grupo."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        grupo = QuestionGroup.objects.get(pk=group_id)
    except QuestionGroup.DoesNotExist:
        return Response({"error": "Grupo não encontrado."}, status=status.HTTP_404_NOT_FOUND)

    if not grupo.users.filter(id=user.id).exists():
        return Response(
            {"error": "Você não pertence a este grupo."},
            status=status.HTTP_403_FORBIDDEN,
        )

    perguntas = Question.objects.filter(groups=grupo)
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
    group_id = request.data.get("group_id")

    if not group_id:
        return Response({"error": "group_id é obrigatório."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        grupo = QuestionGroup.objects.get(pk=group_id)
    except QuestionGroup.DoesNotExist:
        return Response({"error": "Grupo não encontrado."}, status=status.HTTP_404_NOT_FOUND)

    if not grupo.users.filter(id=user.id).exists():
        return Response({"error": "Você não pertence a este grupo."}, status=status.HTTP_403_FORBIDDEN)

    # Pega os IDs das perguntas enviadas
    question_ids = [r.get("question") for r in respostas if r.get("question") is not None]

    # ==================== VALIDAÇÃO: PERGUNTAS DO GRUPO DO USUÁRIO ====================
    perguntas_permitidas = Question.objects.filter(groups=grupo).distinct()
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
        UserResponse.objects.filter(user=user, group_id=group_id, question_id__in=question_ids)
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
        resposta["group"] = grupo.id

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