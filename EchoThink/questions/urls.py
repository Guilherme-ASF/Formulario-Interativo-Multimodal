from django.urls import path
from . import views

urlpatterns = [
    path("criar-pergunta/", views.criar_pergunta, name="criar_pergunta"),
    path("listar-perguntas/", views.listar_perguntas, name="listar_perguntas"),
    path("deletar-pergunta/<int:pk>/", views.deletar_pergunta, name="deletar_pergunta"),
    path('marcar-relevante/<int:pk>/', views.marcar_relevante, name='marcar-relevante'),
    path('relatorio-respostas/<str:formato>/', views.gerar_relatorio_respostas_pivotado, name='gerar-relatorio-respostas'),
    path('grupos/<int:group_id>/relatorio-respostas/<str:formato>/', views.gerar_relatorio_respostas_pivotado, name='gerar-relatorio-respostas-grupo'),
    path("responder-multiplo/", views.registrar_varias_respostas, name="registrar-varias-respostas"),
    path("perguntas-do-grupo/", views.perguntas_do_grupo_usuario, name="perguntas_do_grupo_usuario"),
    path("grupos/<int:group_id>/perguntas/", views.perguntas_do_grupo_usuario, name="perguntas_do_grupo_usuario_por_grupo"),
    path("respondidas-usuario/", views.respondidas_usuario, name="respondidas_usuario"),
    
    # Question Group URLs
    path("grupos/", views.listar_criar_grupos, name="listar_criar_grupos"),
    path("grupos/<int:pk>/", views.detalhe_grupo, name="detalhe_grupo"),
    path("grupos/do-usuario/", views.grupos_do_usuario, name="grupos_do_usuario"),
    path("grupos/<int:pk>/adicionar-usuario/", views.adicionar_usuario_ao_grupo, name="adicionar_usuario_ao_grupo"),
    path("grupos/<int:pk>/remover-usuario/", views.remover_usuario_do_grupo, name="remover_usuario_do_grupo"),
    path("grupos/<int:pk>/adicionar-pergunta/", views.adicionar_pergunta_ao_grupo, name="adicionar_pergunta_ao_grupo"),
    path("grupos/<int:pk>/remover-pergunta/", views.remover_pergunta_do_grupo, name="remover_pergunta_do_grupo"),
]
