from celery import shared_task
from django.core.management import call_command
from datetime import datetime

@shared_task
def backup_database():
    # Ejecuta el comando de respaldo de Django
    now = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'backup_{now}.json'
    call_command('dumpdata', output=filename)
    return filename

@shared_task
def send_low_stock_report():
    # Aquí iría la lógica para enviar el reporte de bajo stock
    # Por ejemplo, consultar productos y enviar correo
    return 'Reporte enviado'
