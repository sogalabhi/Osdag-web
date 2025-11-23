from django.urls import path
# New migrated imports from apps.core (preferred over old osdag.*)
from apps.core.api import (
    DesignPreference, MaterialDetails,
    SignupView, ForgetPasswordView, LogoutView, LoginView,
    ObtainInputFileView, CheckEmailView, SaveInputFileView, SetRefreshTokenCookieView,
    JWTHomeView, GoogleSSOView,
    ProjectAPI, ProjectDetailAPI, ProjectByNameAPI,
    SaveOsiFromInputs, OpenOsiUpload, OpenOsiById, ModuleRoutes, ProjectOsiDownload,
    CompanyLogoView,
    ParseReportSections, CustomizeReport, GenerateInitialReport,
    CADGeneration, CADDownload,
    GetModules,
    CreateDesignReport, GetPDF,
)

from apps.core import views

# Legacy/migrated input/output data (replaces osdag.web_api.*)
from apps.core.api.legacy.input_data_api import InputValues
from apps.core.api.legacy.output_data_api import OutputValues
from apps.core.api.legacy.inputData_view import InputData, DesignView

# OutputData was removed in migration (do NOT re-add)
# from apps.core.web_api.outputCalc_view import OutputData

# Legacy output views that still exist
from apps.core.api.legacy.output_views.tensionmemberbolted_outputView import TensionMemberBoltedOutputData
from apps.core.api.legacy.output_views.tensionmemberwelded_outputView import TensionMemberWeldedOutputData
from apps.core.api.legacy.output_views.simplysupportedbeam_outputView import SimplySupportedBeamOutputData

# HEAD-only endpoint that still has NO migrated equivalent
# (this must be kept unless migration deletes it later)
from osdag.web_api.compressionmember_outputView import CompressionMemberOutputData

# temporary
app_name = 'osdag-web/'

urlpatterns = [
    # Session endpoints removed - no longer needed for multi-module support
    path('design/input_values/', InputValues.as_view()),
    path('design/input_values', InputValues.as_view()),
    path('design/output_values/', OutputValues.as_view()),
    path('design/output_values', OutputValues.as_view()),
    path('design/cad/', CADGeneration.as_view()),
    path('design/cad', CADGeneration.as_view()),
    path('design/downloadCad/' , CADDownload.as_view()),
    path('design/downloadCad', CADDownload.as_view()),
    path('modules', GetModules.as_view()),
    path('modules/', GetModules.as_view()),

    #########################################################
    # Author : Atharva Pingale ( FOSSEE Summer Fellow '23 ) #
    #########################################################

    # URLs from osdagServer/flowapp
    path('osdag-web/', views.get_design_types, name='index'),
    path('osdag-web/connections', views.get_connections, name='connections'),
    path('osdag-web/connections/shear-connection',
         views.get_shear_connection, name='shear-connection'),
    path('osdag-web/connections/moment-connection', views.get_moment_connection,
         name='moment_connection'),
    path('osdag-web/connections/moment-connection/beam-to-beam-splice',
         views.get_b2b_splice, name='beam-to-beam-splice'),
    path('osdag-web/connections/moment-connection/beam-to-column',
         views.get_b2column, name='beam-to-column'),
    path('osdag-web/connections/moment-connection/column-to-column-splice',
         views.get_c2c_splice, name='column-to-column-splice'),
    path('osdag-web/connections/base-plate',
         views.get_base_plate, name='base-plate'),
    path('osdag-web/tension-member',
         views.get_tension_member, name='tension-member'),
      path('api/compression-member/', include('osdag.web_api.urls_compression')),

    # New APIs
    path('populate', InputData.as_view()),
    path('design', DesignView.as_view()),
#     Legacy
#     path('generate-report' , CreateDesignReport.as_view()),
#     path('getPDF' , GetPDF.as_view()),
    path('design-preferences/', DesignPreference.as_view(), name="design-pref"),
    path('materialDetails/', MaterialDetails.as_view()),
    path('company-logo/' , CompanyLogoView.as_view()),

    # authentications nad authorozation URL mappings
    path('jwt/home' , JWTHomeView.as_view()),     # view for testing purpose
    path('googlesso/' , GoogleSSOView.as_view()),

    # user urls 
    path('user/signup/' , SignupView.as_view()),
    path('user/forgetpassword/' , ForgetPasswordView.as_view()),
    path('user/logout/' ,  LogoutView.as_view()),
    path('user/login/' , LoginView.as_view()),
    path('user/checkemail/' , CheckEmailView.as_view()),
    path('user/saveinput/' , SaveInputFileView.as_view()),
    path('user/obtain-input-file/' , ObtainInputFileView.as_view()),
    # osi upload via DRF (multipart form-data)
    path('api/save-osi/', SaveInputFileView.as_view()),
    path('user/set-refresh/' , SetRefreshTokenCookieView.as_view()),

    # project management urls
    path('api/projects/', ProjectAPI.as_view(), name='projects'),
    path('api/projects/<int:project_id>/', ProjectDetailAPI.as_view(), name='project-detail'),
    path('api/projects/by-name/<str:project_name>/', ProjectByNameAPI.as_view(), name='project-by-name'),

    # osi endpoints
    path('api/save-osi-from-inputs/', SaveOsiFromInputs.as_view()),
    path('api/open-osi/', OpenOsiUpload.as_view()),
    path('api/open-osi/<int:osifile_id>/', OpenOsiById.as_view()),
    path('api/module-routes/', ModuleRoutes.as_view()),
    path('api/projects/<int:project_id>/osi', ProjectOsiDownload.as_view()),

    # output generation from input
    # Migrated modules removed - now handled by apps.modules.* URLs:
    # - FinPlateConnection -> /api/modules/shear-connection/fin-plate/design/
    # - End-Plate-Connection -> /api/modules/shear-connection/end-plate/design/
    # - Cleat-Angle-Connection -> /api/modules/shear-connection/cleat-angle/design/
    # - SeatedAngleConnection -> /api/modules/shear-connection/seated-angle/design/
    # - Cover-Plate-Bolted-Connection -> /api/modules/moment-connection/cover-plate-bolted/design/
    # - Beam-Beam-End-Plate-Connection -> /api/modules/moment-connection/beam-beam-end-plate/design/
    # - Cover-Plate-Welded-Connection -> /api/modules/moment-connection/cover-plate-welded/design/
    # - Beam-to-Column-End-Plate-Connection -> /api/modules/moment-connection/beam-column-end-plate/design/
    
    # Keep legacy calculate-output URLs for non-migrated modules
    path('calculate-output/Tension-Member-Bolted-Design',
         TensionMemberBoltedOutputData.as_view(),name="Tension-Member-Bolted-Design"),
    path('calculate-output/Tension-Member-Welded-Design',
         TensionMemberWeldedOutputData.as_view(),name="Tension-Member-Welded-Design"),
    path('calculate-output/Simply-Supported-Beam',
         SimplySupportedBeamOutputData.as_view(), name="Simply-Supported-Beam"),
    path("calculate-output/Axially-Loaded-Column",
         CompressionMemberOutputData.as_view(),name="Axially-Loaded-Column"),
    path('calculate-output/axial_loaded_column',
         CompressionMemberOutputData.as_view(), name='axial_loaded_column'),
    path("calculate-output/Axially-Loaded-Column",
         CompressionMemberOutputData.as_view(), name="AxiallyLoadedColumn"),

    # Report customization API endpoints
    path('api/report/generate-initial/', GenerateInitialReport.as_view(), name='generate-initial-report'),
    path('api/report/parse-sections/', ParseReportSections.as_view(), name='parse-report-sections'),
    path('api/report/customize/', CustomizeReport.as_view(), name='customize-report'),
]
