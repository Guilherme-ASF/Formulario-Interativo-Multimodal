from django.db import models
from django.contrib.auth.models import User

class Question(models.Model):
    # se você quer permitir título em branco, faça assim:
    title = models.CharField(max_length=255, blank=True, null=True)

    question = models.TextField(null=True, blank=True)

    # (legado) filesystem - pode manter por enquanto
    image = models.ImageField(upload_to="perguntas/imagens/", null=True, blank=True)
    audio = models.FileField(upload_to="perguntas/audios/", null=True, blank=True)

    # (novo) no banco
    image_bytes = models.BinaryField(null=True, blank=True)
    image_mime = models.CharField(max_length=80, null=True, blank=True)

    audio_bytes = models.BinaryField(null=True, blank=True)
    audio_mime = models.CharField(max_length=80, null=True, blank=True)

    is_relevant = models.BooleanField(default=False)

    def __str__(self):
        return self.title or f"Question #{self.id}"

    def to_dict(self):
        """
        Retorna no formato que o frontend espera.
        Prioriza o que estiver no banco (bytes) e cai pro arquivo (url) se não existir.
        """
        import base64

        image_out = None
        audio_out = None

        # prioridade: banco
        if self.image_bytes and self.image_mime:
            b64 = base64.b64encode(self.image_bytes).decode("utf-8")
            image_out = f"data:{self.image_mime};base64,{b64}"
        elif self.image:
            image_out = self.image.url

        if self.audio_bytes and self.audio_mime:
            b64 = base64.b64encode(self.audio_bytes).decode("utf-8")
            audio_out = f"data:{self.audio_mime};base64,{b64}"
        elif self.audio:
            audio_out = self.audio.url

        return {
            "id": self.id,
            "title": self.title or "",          # mantém possibilidade de vazio
            "question": self.question,
            "image": image_out,
            "audio": audio_out,
            "options": [opt.text for opt in self.options.all()],
        }


class Option(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="options")
    text = models.CharField(max_length=255)

    def __str__(self):
        return f"{(self.question.title or 'Sem título')} - {self.text}"


class UserResponse(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    group = models.ForeignKey("QuestionGroup", on_delete=models.CASCADE, related_name="responses", null=True, blank=True)
    resposta_texto = models.TextField(blank=True, null=True)
    resposta_opcao = models.CharField(max_length=255, blank=True, null=True)
    tempo_resposta = models.FloatField(blank=True, null=True)  # segundos
    data_resposta = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        # seu código tinha "self.question.texto" mas esse campo não existe
        return f"{self.user.username} → {self.question.title or self.question.id}"

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "question", "group"],
                name="unique_user_question_group_response",
            )
        ]

class QuestionGroup(models.Model):
    """
    Grupo de perguntas que pode ser associado a múltiplos usuários
    """
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    questions = models.ManyToManyField(Question, related_name="groups", blank=True)
    users = models.ManyToManyField(User, related_name="question_groups", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["-created_at"]