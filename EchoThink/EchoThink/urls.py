"""
URL configuration for EchoThink project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, re_path
from . import views
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from .views import CSRFTokenView, CurrentUserView

urlpatterns = [
    path('api/hello/', views.hello),
    path('api/auth/', include('authentication.urls')),
    path('api/questions/', include('questions.urls')),
    path("api/csrf/", CSRFTokenView.as_view(), name="get_csrf"),
    path("me/", CurrentUserView.as_view()),
    path('ValidateTokenView/', views.ValidateTokenView.as_view(), name='validate_token'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    ]
