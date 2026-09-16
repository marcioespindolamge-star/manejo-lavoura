import subprocess
# Restaura somente o index para a ultima versao funcional anterior ao ajuste
# que alterou identificadores internos ao trocar Lavoura por Area.
subprocess.run(['git','checkout','57e3dc6db221bb24851965b19c07cd05abab8296','--','index.html'],check=True)
print('INDEX_FUNCIONAL_RESTAURADO')
