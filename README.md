# DeniKey Web

Bu kurulumda site şimdilik sadece bilgi verme ve sahte indir akışı için hazırdır.

Çalıştırmak için:

```powershell
python serve.py
```

Gerçek indirme dosyasını daha sonra açmak için iki seçenek var:

1. `site_config.json` içine dosya adını koy:

```json
{
  "download_filename": "DeniKeySetup.exe"
}
```

2. Sonra gerçek kurulum dosyasını `downloads/` klasörüne bırak:

```json
{
  "download_filename": "DeniKeySetup.exe"
}
```

İstersen dosya adını daha sonra ben de kod içine ekleyebilirim. Site tarafında artık dış link akışı yok; sadece yerel dosya mantığı var.
