from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
antigo='./logo-paineira-novo.png'
novo='./ChatGPT%20Image%2013%20de%20set.%20de%202026%2C%2018_48_25.png?v=20260916-logo'
if antigo not in s:
    raise SystemExit('Referencia atual do logo nao encontrada')
s=s.replace(antigo, novo)
p.write_text(s,encoding='utf-8')
print('LOGO_SISTEMA_ATUALIZADO')
