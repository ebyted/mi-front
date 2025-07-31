from django.http import HttpResponse

def welcome(request):
    html = """
    <html>
    <head>
        <title>Bienvenido a Maestro Inventario</title>
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; color: #222; margin: 0; }
            .container { max-width: 500px; margin: 80px auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 12px #0001; padding: 32px; text-align: center; }
            h1 { color: #2563eb; margin-bottom: 16px; }
            p { font-size: 1.1em; margin-bottom: 24px; }
            .logo { font-size: 2.5em; margin-bottom: 16px; color: #2563eb; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">📦</div>
            <h1>Bienvenido a Maestro Inventario</h1>
            <p>Tu sistema moderno para gestión de inventarios.<br>API y panel administrativo listos para usar.</p>
            <p style="color:#64748b;">Desarrollado con Django y React</p>
        </div>
    </body>
    </html>
    """
    return HttpResponse(html)
