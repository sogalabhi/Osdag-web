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
from osdag.views import FirebaseLoginView
from osdag.views import dashboard_view

urlpatterns = [
    path('admin/', admin.site.urls),
    # path('', include('osdag.urls')),
    path('api/auth/firebase-login/', FirebaseLoginView.as_view(), name="firebase_login"),
    # path("api/auth/firebase-login/", views.firebase_login, name="firebase_login"),
    path('api/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/dashboard/', dashboard_view, name='dashboard'),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

if settings.DEBUG:
    urlpatterns += static(settings.OSIFILES_URL, document_root=settings.OSIFILES_ROOT)