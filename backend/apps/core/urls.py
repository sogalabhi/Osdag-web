"""
Core app URLs - Non-module specific endpoints
Extracted from osdag/urls.py
"""
from django.urls import path
# Import from new api structure (using re-exports from __init__.py)
from apps.core.api import (
    SignupView, ForgetPasswordView, LogoutView, LoginView,
    ObtainInputFileView, CheckEmailView, SaveInputFileView, SetRefreshTokenCookieView,
    JWTHomeView, GoogleSSOView,
    ProjectAPI, ProjectDetailAPI, ProjectByNameAPI,
    SaveOsiFromInputs, OpenOsiUpload, OpenOsiById, ModuleRoutes, ProjectOsiDownload,
    ParseReportSections, CustomizeReport, GenerateInitialReport,
    DesignPreference, MaterialDetails, CompanyLogoView
)
from apps.core import views

app_name = 'core'

urlpatterns = [
    # Design preferences
    path('design-preferences/', DesignPreference.as_view(), name="design-pref"),
    path('materialDetails/', MaterialDetails.as_view()),
    path('company-logo/', CompanyLogoView.as_view()),
    
    # Authentication and authorization
    path('jwt/home', JWTHomeView.as_view()),  # view for testing purpose
    path('googlesso/', GoogleSSOView.as_view()),
    path('api/auth/firebase-login/', views.FirebaseLoginView.as_view(), name="firebase_login"),
    path('api/dashboard/', views.dashboard_view, name='dashboard'),
    
    # User URLs
    path('user/signup/', SignupView.as_view()),
    path('user/forgetpassword/', ForgetPasswordView.as_view()),
    path('user/logout/', LogoutView.as_view()),
    path('user/login/', LoginView.as_view()),
    path('user/checkemail/', CheckEmailView.as_view()),
    path('user/saveinput/', SaveInputFileView.as_view()),
    path('user/obtain-input-file/', ObtainInputFileView.as_view()),
    path('user/set-refresh/', SetRefreshTokenCookieView.as_view()),
    
    # OSI upload via DRF (multipart form-data)
    path('api/save-osi/', SaveInputFileView.as_view()),
    
    # Project management URLs
    path('api/projects/', ProjectAPI.as_view(), name='projects'),
    path('api/projects/<int:project_id>/', ProjectDetailAPI.as_view(), name='project-detail'),
    path('api/projects/by-name/<str:project_name>/', ProjectByNameAPI.as_view(), name='project-by-name'),
    
    # OSI endpoints
    path('api/save-osi-from-inputs/', SaveOsiFromInputs.as_view()),
    path('api/open-osi/', OpenOsiUpload.as_view()),
    path('api/open-osi/<int:osifile_id>/', OpenOsiById.as_view()),
    path('api/module-routes/', ModuleRoutes.as_view()),
    path('api/projects/<int:project_id>/osi', ProjectOsiDownload.as_view()),
    
    # Report customization API endpoints
    path('api/report/generate-initial/', GenerateInitialReport.as_view(), name='generate-initial-report'),
    path('api/report/parse-sections/', ParseReportSections.as_view(), name='parse-report-sections'),
    path('api/report/customize/', CustomizeReport.as_view(), name='customize-report'),
    
    # Legacy design type views (temporary - may be moved later)
    path('osdag-web/', views.get_design_types, name='index'),
    path('osdag-web/connections', views.get_connections, name='connections'),
    path('osdag-web/connections/shear-connection', views.get_shear_connection, name='shear-connection'),
    path('osdag-web/connections/moment-connection', views.get_moment_connection, name='moment_connection'),
    path('osdag-web/connections/moment-connection/beam-to-beam-splice', views.get_b2b_splice, name='beam-to-beam-splice'),
    path('osdag-web/connections/moment-connection/beam-to-column', views.get_b2column, name='beam-to-column'),
    path('osdag-web/connections/moment-connection/column-to-column-splice', views.get_c2c_splice, name='column-to-column-splice'),
    path('osdag-web/connections/base-plate', views.get_base_plate, name='base-plate'),
    path('osdag-web/tension-member', views.get_tension_member, name='tension-member'),
]
