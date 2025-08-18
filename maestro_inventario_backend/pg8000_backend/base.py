"""
Backend personalizado de Django usando pg8000 en lugar de psycopg2
"""
from django.db.backends.postgresql import base
import pg8000


class DatabaseWrapper(base.DatabaseWrapper):
    """
    Wrapper de base de datos que usa pg8000 en lugar de psycopg2
    """
    
    def __init__(self, *args, **kwargs):
        # Reemplazar el módulo Database con pg8000
        super().__init__(*args, **kwargs)
        self.Database = pg8000
        
    def get_new_connection(self, conn_params):
        """
        Crear una nueva conexión usando pg8000
        """
        # Mapear los parámetros de Django a pg8000
        pg8000_params = {
            'database': conn_params['database'],
            'user': conn_params['user'],
            'password': conn_params['password'],
            'host': conn_params['host'],
            'port': conn_params['port'],
        }
        
        # Establecer UTF-8 como encoding por defecto
        pg8000_params['client_encoding'] = 'utf8'
        
        return pg8000.connect(**pg8000_params)
        
    def create_cursor(self, name=None):
        """
        Crear un cursor personalizado
        """
        if name:
            # pg8000 no soporta cursores con nombre directamente
            cursor = self.connection.cursor()
        else:
            cursor = self.connection.cursor()
        return cursor
