# django imports
from django.contrib import admin
from django.urls import path
from django.urls import include
from django.conf import settings
from django.conf.urls.static import static

from apps.core.api.legacy.outputCalc_view import OutputData

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('apps.core.urls')),  # Core app URLs (replaces osdag.urls)
    path('api/modules/', include('apps.modules.urls')),  # All module URLs aggregated here
    
    # Catch-all for migrated modules using the legacy calculate-output URL pattern
    path('calculate-output/<str:module_id>', OutputData.as_view()),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

if settings.DEBUG:
    urlpatterns += static(settings.OSIFILES_URL, document_root=settings.OSIFILES_ROOT)

