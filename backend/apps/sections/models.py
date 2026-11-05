"""
User-owned custom section rows.

Rows mirror the catalog tables Angles, Beams, Channels and Columns (apps.core.catalog).
The catalog itself is read-only and is not changed from here.
"""

from django.conf import settings
from django.db import models


class UserOwnedSectionBase(models.Model):
    """Shared ownership and lifecycle fields for all UserCustom* tables."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="+",
        help_text="Owner of this custom section row",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(
        default=True,
        help_text="Soft-delete flag when hard DELETE is deferred",
    )

    class Meta:
        abstract = True


class UserCustomBeam(UserOwnedSectionBase):
    """Mirrors the catalog's Beams table — one row per user-owned custom beam section."""

    Designation = models.CharField(max_length=50)
    Mass = models.FloatField()
    Area = models.FloatField()
    D = models.FloatField()
    B = models.FloatField()
    tw = models.FloatField()
    T = models.FloatField()
    FlangeSlope = models.FloatField()
    R1 = models.FloatField()
    R2 = models.FloatField()
    Iz = models.FloatField()
    Iy = models.FloatField()
    rz = models.FloatField()
    ry = models.FloatField()
    Zz = models.FloatField()
    Zy = models.FloatField()
    Zpz = models.FloatField()
    Zpy = models.FloatField()
    It = models.FloatField(null=True)
    Iw = models.FloatField(null=True)
    Source = models.CharField(max_length=100, blank=True)
    Type = models.CharField(null=True, blank=True, max_length=100)

    class Meta:
        db_table = "UserCustomBeam"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "Designation"],
                name="sections_usercustombeam_user_designation_uniq",
            ),
        ]

    def __str__(self):
        return f"UserCustomBeam({self.Designation}, user={self.user_id})"


class UserCustomColumn(UserOwnedSectionBase):
    """Mirrors the catalog's Columns table."""

    Designation = models.CharField(max_length=50)
    Mass = models.FloatField()
    Area = models.FloatField()
    D = models.FloatField()
    B = models.FloatField()
    tw = models.FloatField()
    T = models.FloatField()
    FlangeSlope = models.FloatField()
    R1 = models.FloatField()
    R2 = models.FloatField()
    Iz = models.FloatField()
    Iy = models.FloatField()
    rz = models.FloatField()
    ry = models.FloatField()
    Zz = models.FloatField()
    Zy = models.FloatField()
    Zpz = models.FloatField()
    Zpy = models.FloatField()
    It = models.FloatField(null=True)
    Iw = models.FloatField(null=True)
    Source = models.CharField(max_length=100, blank=True)
    Type = models.CharField(null=True, blank=True, max_length=100)

    class Meta:
        db_table = "UserCustomColumn"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "Designation"],
                name="sections_usercustomcolumn_user_designation_uniq",
            ),
        ]

    def __str__(self):
        return f"UserCustomColumn({self.Designation}, user={self.user_id})"


class UserCustomAngle(UserOwnedSectionBase):
    """Mirrors the catalog's Angles table."""

    Designation = models.CharField(max_length=50)
    Mass = models.FloatField()
    Area = models.FloatField()
    a = models.FloatField()
    b = models.FloatField()
    t = models.FloatField()
    R1 = models.FloatField()
    R2 = models.FloatField()
    Cz = models.FloatField()
    Cy = models.FloatField()
    Iz = models.FloatField()
    Iy = models.FloatField()
    Alpha = models.FloatField()
    lumax = models.FloatField()
    lvmin = models.FloatField()
    rz = models.FloatField()
    ry = models.FloatField()
    rumax = models.FloatField()
    rvmin = models.FloatField()
    Zz = models.FloatField()
    Zy = models.FloatField()
    Zpz = models.FloatField()
    Zpy = models.FloatField()
    It = models.FloatField()
    Source = models.CharField(max_length=100, blank=True)
    Type = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        db_table = "UserCustomAngle"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "Designation"],
                name="sections_usercustomangle_user_designation_uniq",
            ),
        ]

    def __str__(self):
        return f"UserCustomAngle({self.Designation}, user={self.user_id})"


class UserCustomChannel(UserOwnedSectionBase):
    """Mirrors the catalog's Channels table."""

    Designation = models.CharField(max_length=50)
    Mass = models.FloatField()
    Area = models.FloatField()
    D = models.FloatField()
    B = models.FloatField()
    tw = models.FloatField()
    T = models.FloatField()
    FlangeSlope = models.FloatField()
    R1 = models.FloatField()
    R2 = models.FloatField()
    Cy = models.FloatField()
    Iz = models.FloatField()
    Iy = models.FloatField()
    rz = models.FloatField()
    ry = models.FloatField()
    Zz = models.FloatField()
    Zy = models.FloatField()
    Zpz = models.FloatField()
    Zpy = models.FloatField()
    It = models.FloatField()
    Iw = models.FloatField()
    Source = models.CharField(max_length=100, blank=True)
    Type = models.CharField(null=True, blank=True, max_length=100)

    class Meta:
        db_table = "UserCustomChannel"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "Designation"],
                name="sections_usercustomchannel_user_designation_uniq",
            ),
        ]

    def __str__(self):
        return f"UserCustomChannel({self.Designation}, user={self.user_id})"


TABLE_TO_USER_MODEL = {
    "Columns": UserCustomColumn,
    "Beams": UserCustomBeam,
    "Angles": UserCustomAngle,
    "Channels": UserCustomChannel,
}
