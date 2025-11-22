# django imports
from django.contrib import admin
from django.urls import path
from django.urls import include
from django.conf import settings
from django.conf.urls.static import static

# simplejwt imports 
from rest_framework_simplejwt.views import TokenVerifyView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('osdag.urls')),  # Keep old URLs temporarily
    path('api/modules/shear-connection/', include('apps.modules.shear_connection.urls')),  # New structure
    path('api/modules/moment-connection/', include('apps.modules.moment_connection.urls')),  # New structure
    path('api/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

if settings.DEBUG:
    urlpatterns += static(settings.OSIFILES_URL, document_root=settings.OSIFILES_ROOT)

