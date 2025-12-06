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
from apps.core.api.legacy.outputCalc_view import OutputData

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('apps.core.urls')),  # Core app URLs (replaces osdag.urls)
    path('', include('osdag_old.urls')),  # Keep old URLs temporarily for:
    # - Non-migrated modules (Tension-Member, Simply-Supported-Beam)
    # - Legacy calculate-output endpoints (will be removed after frontend migration)
    # - Other legacy endpoints that haven't been migrated yet
    path('api/modules/', include('apps.modules.urls')),  # All module URLs aggregated here
    path('api/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Catch-all for migrated modules using the legacy calculate-output URL pattern
    path('calculate-output/<str:module_id>', OutputData.as_view()),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

if settings.DEBUG:
    urlpatterns += static(settings.OSIFILES_URL, document_root=settings.OSIFILES_ROOT)

