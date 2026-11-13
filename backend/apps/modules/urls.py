"""
Modules URL Aggregator
Aggregates all parent module URLs into a single include point
"""
from django.urls import path, include

from apps.core.api.modules import OutputLayoutView

urlpatterns = [
    # The output dock before a design has run, for every module
    path('base-plate/output-layout/', OutputLayoutView.as_view(), {'family': 'base-plate'}),
    path('<str:family>/<str:slug>/output-layout/', OutputLayoutView.as_view()),

    # Shear Connection module
    path('shear-connection/', include('apps.modules.shear_connection.urls')),
    
    # Moment Connection module
    path('moment-connection/', include('apps.modules.moment_connection.urls')),

    # Simple Connection module
    path('simple-connection/', include('apps.modules.simple_connection.urls')),
    
    # Tension Member module
    path('tension-member/', include('apps.modules.tension_member.urls')),
    
    # Flexure Member module
    path('flexure-member/', include('apps.modules.flexure_member.urls')),
    
    # Compression Member module
    path('compression-member/', include('apps.modules.compression_member.urls')),
    
    # Base Plate
    path('base-plate/', include('apps.modules.base_plate.urls')),
]

