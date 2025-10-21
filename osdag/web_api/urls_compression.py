"""
URL routing for Axially Loaded Column API
"""

from django.urls import path
from .compression_member_api import design_axially_loaded_column, get_column_sections

urlpatterns = [
    path('column/design', design_axially_loaded_column, name='design_axially_loaded_column'),
    path('column/sections', get_column_sections, name='get_column_sections'),
]