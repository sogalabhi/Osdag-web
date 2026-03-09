# django imports
from django.contrib import admin
from django.urls import path
from django.urls import include
from django.conf import settings
from django.conf.urls.static import static
# from . import views

# simplejwt imports 
from rest_framework_simplejwt.views import TokenVerifyView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

import sys
import os
from pathlib import Path

# Add backend to sys.path to allow importing apps
BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = BASE_DIR / 'backend'
if str(BACKEND_DIR) not in sys.path:
    sys.path.append(str(BACKEND_DIR))

from apps.core.views import FirebaseAuthView, dashboard_view

urlpatterns = [
    path('admin/', admin.site.urls),
    # path('', include('osdag.urls')),
    path('', include('apps.core.urls')),
    path('api/modules/', include('apps.modules.urls')),
    path('api/auth/firebase-login/', FirebaseAuthView.as_view(), name="firebase_auth"),
    # path("api/auth/firebase-login/", views.firebase_login, name="firebase_login"),
    path('api/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/dashboard/', dashboard_view, name='dashboard'),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

if settings.DEBUG:
    urlpatterns += static(settings.OSIFILES_URL, document_root=settings.OSIFILES_ROOT)