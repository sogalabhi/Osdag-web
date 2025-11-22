"""
Modules URL Aggregator
Aggregates all parent module URLs into a single include point
"""
from django.urls import path, include

urlpatterns = [
    # Shear Connection module
    path('shear-connection/', include('apps.modules.shear_connection.urls')),
    
    # Moment Connection module
    path('moment-connection/', include('apps.modules.moment_connection.urls')),
    
    # Future modules will be added here:
    # path('tension-member/', include('apps.modules.tension_member.urls')),
    # path('flexure-member/', include('apps.modules.flexure_member.urls')),
    # path('base-plate/', include('apps.modules.base_plate.urls')),
]

