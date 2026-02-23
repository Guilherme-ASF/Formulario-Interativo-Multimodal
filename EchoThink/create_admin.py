#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'EchoThink.settings')
django.setup()

from django.contrib.auth.models import User

# Verifica se o usuário já existe
if not User.objects.filter(username='segundo').exists():
    User.objects.create_superuser('segundo', 'segundo@localhost', '123456')
    print("✅ Superuser 'segundo' criado com sucesso!")
else:
    print("⚠️ Usuário 'segundo' já existe.")
