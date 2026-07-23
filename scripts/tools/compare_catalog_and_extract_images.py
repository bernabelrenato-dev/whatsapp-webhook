import os
import json
import zipfile
import re
import xml.etree.ElementTree as ET

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LISTAS_DIR = r"C:\Users\USER\Downloads\LISTAS"
CATALOG_FILE = os.path.join(BASE_DIR, "src", "config", "catalog.json")
IMAGES_DIR = os.path.join(BASE_DIR, "src", "public", "images")

os.makedirs(IMAGES_DIR, exist_ok=True)

# 1. Cargar catálogo actual
with open(CATALOG_FILE, 'r', encoding='utf-8') as f:
    catalog = json.load(f)

# Crear mapa de códigos
code_map = {}
for p in catalog:
    code = p.get('code')
    if code:
        clean_code = str(code).strip().upper()
        code_map[clean_code] = p

print("=" * 60)
print(" AUDITORIA Y COMPARACION DE CATALOGO E IMAGENES (JGIS)")
print("=" * 60)
print(f"Total productos en catalog.json: {len(catalog)}")

# Obtener imágenes existentes en disco
existing_files = os.listdir(IMAGES_DIR)
existing_codes = set(os.path.splitext(f)[0].upper() for f in existing_files)
print(f"Total archivos de imagen en src/public/images: {len(existing_files)}")

missing_before = [p for p in catalog if p.get('code', '').strip().upper() not in existing_codes]
print(f"Productos SIN imagen registrada actualmente: {len(missing_before)} ({len(missing_before)/len(catalog)*100:.1f}%)")

# 2. Procesar archivos Excel en LISTAS usando zipfile nativo
excel_files = [f for f in os.listdir(LISTAS_DIR) if f.endswith('.xlsx')]

newly_extracted = 0

for file_name in excel_files:
    file_path = os.path.join(LISTAS_DIR, file_name)
    print(f"\n📦 Extrayendo e inspeccionando: {file_name}...")
    
    try:
        with zipfile.ZipFile(file_path, 'r') as z:
            namelist = z.namelist()
            media_files = [n for n in namelist if n.startswith('xl/media/')]
            
            # Buscar hojas y drawings
            sheet_files = [n for n in namelist if n.startswith('xl/worksheets/sheet')]
            drawing_files = [n for n in namelist if n.startswith('xl/drawings/drawing')]
            
            # Extraer imágenes directamente si el nombre coincide con un código de producto
            for media in media_files:
                media_bytes = z.read(media)
                base_name = os.path.basename(media)
                ext = os.path.splitext(base_name)[1]
                
                # Intentar mapear contra la lista de códigos del catálogo
                # Chequeamos si el nombre del archivo contiene un código conocido
                matched_code = None
                for code in code_map.keys():
                    if len(code) >= 3 and (code == os.path.splitext(base_name)[0].upper() or code in base_name.upper()):
                        matched_code = code
                        break
                
                if matched_code:
                    dest_file = os.path.join(IMAGES_DIR, f"{matched_code}{ext}")
                    if not os.path.exists(dest_file) or os.path.getsize(dest_file) < 100:
                        with open(dest_file, 'wb') as out_img:
                            out_img.write(media_bytes)
                        newly_extracted += 1
                        existing_codes.add(matched_code)
                        print(f"  ✨ Mapeada e instalada imagen: {matched_code}{ext}")
                        
    except Exception as e:
        print(f"  ❌ Error procesando {file_name}: {e}")

# 3. Mapeo adicional por coincidencia exacta con lista general
for p in catalog:
    code = (p.get('code') or '').strip().upper()
    img_field = (p.get('image') or '').strip()
    if img_field and code:
        # Verificar si la imagen especificada en catalog.json existe físicamente
        img_name = os.path.basename(img_field)
        source_path = os.path.join(IMAGES_DIR, img_name)
        if os.path.exists(source_path):
            existing_codes.add(code)

missing_after = [p for p in catalog if p.get('code', '').strip().upper() not in existing_codes]

print("\n" + "=" * 60)
print(" RESUMEN DE COBERTURA TRAS RE-EXTRACCION")
print("=" * 60)
print(f"Nuevas imágenes vinculadas: {newly_extracted}")
print(f"Productos CON imagen: {len(catalog) - len(missing_after)} ({((len(catalog) - len(missing_after))/len(catalog))*100:.1f}%)")
print(f"Productos FALTANTES de imagen: {len(missing_after)} ({len(missing_after)/len(catalog)*100:.1f}%)")
print("=" * 60)

# Guardar informe comparativo en JSON para inspección
audit_summary = {
    "total_products": len(catalog),
    "total_images_in_folder": len(os.listdir(IMAGES_DIR)),
    "products_with_image": len(catalog) - len(missing_after),
    "products_missing_image": len(missing_after),
    "missing_products_list": [
        {"code": p.get("code"), "name": p.get("name"), "source": p.get("source")}
        for p in missing_after
    ]
}

report_path = os.path.join(BASE_DIR, "docs", "comparacion_catalogo_imagenes.json")
with open(report_path, 'w', encoding='utf-8') as rf:
    json.dump(audit_summary, rf, indent=2, ensure_ascii=False)

print(f"\n📄 Informe de comparación exportado a: docs/comparacion_catalogo_imagenes.json\n")
