from django.db import migrations


def _is_field_state(inputs):
    """True for the old shapes: `{dock, pref}` and the `{version, name, module_id, inputs: {dock, pref}}` envelope."""
    if not isinstance(inputs, dict):
        return False
    if "dock" in inputs or "pref" in inputs:
        return True
    inner = inputs.get("inputs")
    return isinstance(inner, dict) and ("dock" in inner or "pref" in inner)


def clear_field_state_inputs(apps, schema_editor):
    """A project now stores the design dictionary (core keys, as in a desktop .osi file). Rows saved
    in the old form-state shape (web field names under `dock` and `pref`) cannot be read any more,
    so their inputs are cleared. The project row, its name and its module stay."""
    Project = apps.get_model("core", "Project")
    for project in Project.objects.exclude(inputs_json__isnull=True).iterator():
        if _is_field_state(project.inputs_json):
            project.inputs_json = None
            project.save(update_fields=["inputs_json"])


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0017_delete_postgres_catalog"),
    ]

    operations = [
        migrations.RunPython(clear_field_state_inputs, migrations.RunPython.noop),
    ]
