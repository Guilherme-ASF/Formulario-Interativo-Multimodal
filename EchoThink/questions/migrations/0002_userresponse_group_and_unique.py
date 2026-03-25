from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("questions", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="userresponse",
            name="group",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="responses",
                to="questions.questiongroup",
            ),
        ),
        migrations.AddConstraint(
            model_name="userresponse",
            constraint=models.UniqueConstraint(
                fields=("user", "question", "group"),
                name="unique_user_question_group_response",
            ),
        ),
    ]
