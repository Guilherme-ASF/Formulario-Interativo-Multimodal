"""
Auto migration to add Binary and mime fields for in-db media storage

Generated manually because model fields were added after initial migrations.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("questions", "0003_questiongroup"),
    ]

    operations = [
        migrations.AddField(
            model_name="question",
            name="image_bytes",
            field=models.BinaryField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="question",
            name="image_mime",
            field=models.CharField(blank=True, max_length=80, null=True),
        ),
        migrations.AddField(
            model_name="question",
            name="audio_bytes",
            field=models.BinaryField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="question",
            name="audio_mime",
            field=models.CharField(blank=True, max_length=80, null=True),
        ),
    ]
