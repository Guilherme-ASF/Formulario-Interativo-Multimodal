import os
import base64
from rest_framework import serializers
from .models import Question, Option, UserResponse, QuestionGroup
from decimal import getcontext
from django.contrib.auth.models import User

getcontext().prec = 10


class OptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Option
        fields = ["id", "text"]


class QuestionSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    audio_url = serializers.SerializerMethodField()
    image_filename = serializers.SerializerMethodField()
    audio_filename = serializers.SerializerMethodField()
    options = OptionSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = [
            "id",
            "title",
            "question",
            "image_url",
            "audio_url",
            "image_filename",
            "audio_filename",
            "options",
            "is_relevant",
        ]

    def get_image_filename(self, obj):
        if getattr(obj, "image", None) and getattr(obj.image, "name", None):
            return os.path.basename(obj.image.name)
        return None

    def get_audio_filename(self, obj):
        if getattr(obj, "audio", None) and getattr(obj.audio, "name", None):
            return os.path.basename(obj.audio.name)
        return None

    def _safe_base64(self, content):
        if not content:
            return None
        try:
            return base64.b64encode(content).decode("utf-8")
        except Exception:
            return None

    def get_image_url(self, obj):
        request = self.context.get("request")

        # Prioriza arquivo em disco / storage
        if getattr(obj, "image", None):
            try:
                if obj.image.name and request:
                    return request.build_absolute_uri(obj.image.url)
            except Exception:
                pass

        # Fallback para bytes no banco
        image_bytes = getattr(obj, "image_bytes", None)
        image_mime = getattr(obj, "image_mime", None)

        if image_bytes and image_mime:
            b64 = self._safe_base64(image_bytes)
            if b64:
                return f"data:{image_mime};base64,{b64}"

        return None

    def get_audio_url(self, obj):
        request = self.context.get("request")

        # Prioriza arquivo em disco / storage
        if getattr(obj, "audio", None):
            try:
                if obj.audio.name and request:
                    return request.build_absolute_uri(obj.audio.url)
            except Exception:
                pass

        # Fallback para bytes no banco
        audio_bytes = getattr(obj, "audio_bytes", None)
        audio_mime = getattr(obj, "audio_mime", None)

        if audio_bytes and audio_mime:
            b64 = self._safe_base64(audio_bytes)
            if b64:
                return f"data:{audio_mime};base64,{b64}"

        return None


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name"]


class QuestionGroupSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    users = UserSerializer(many=True, read_only=True)

    question_ids = serializers.PrimaryKeyRelatedField(
        queryset=Question.objects.all(),
        write_only=True,
        required=False,
        many=True,
        source="questions",
    )
    user_ids = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        write_only=True,
        required=False,
        many=True,
        source="users",
    )

    class Meta:
        model = QuestionGroup
        fields = [
            "id",
            "name",
            "description",
            "questions",
            "users",
            "question_ids",
            "user_ids",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def create(self, validated_data):
        questions_data = validated_data.pop("questions", [])
        users_data = validated_data.pop("users", [])

        group = QuestionGroup.objects.create(**validated_data)
        group.questions.set(questions_data)
        group.users.set(users_data)

        return group

    def update(self, instance, validated_data):
        questions_data = validated_data.pop("questions", None)
        users_data = validated_data.pop("users", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if questions_data is not None:
            instance.questions.set(questions_data)
        if users_data is not None:
            instance.users.set(users_data)

        instance.save()
        return instance


class UserResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserResponse
        fields = [
            "id",
            "user",
            "question",
            "resposta_texto",
            "resposta_opcao",
            "tempo_resposta",
            "data_resposta",
        ]


class MultipleUserResponsesSerializer(serializers.Serializer):
    respostas = UserResponseSerializer(many=True)

    def create(self, validated_data):
        respostas_data = validated_data.pop("respostas")
        respostas_objs = [UserResponse(**item) for item in respostas_data]
        return UserResponse.objects.bulk_create(respostas_objs)