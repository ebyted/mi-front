from django.core.management.base import BaseCommand
from core.models import Product, Category
import re

class Command(BaseCommand):
    help = 'Asigna categorías automáticamente a productos basándose en su nombre'
    
    def handle(self, *args, **options):
        # Diccionario de palabras clave y sus categorías correspondientes
        category_mappings = {
            # Analgésicos
            'ANALGESICO': ['PARACETAMOL', 'IBUPROFENO', 'NAPROXENO', 'ASPIRINA', 'KETOROLACO', 'TRAMADOL', 'METAMIZOL', 'DICLOFENACO'],
            
            # Antibióticos
            'ANTIBIOTICO': ['AMOXICILINA', 'AMPICILINA', 'PENICILINA', 'CEFALEXINA', 'ERITROMICINA', 'TETRACICLINA', 'CIPROFLOXACINO', 'DOXICICLINA', 'CLINDAMICINA'],
            
            # Antigripales
            'ANTIGRIPAL': ['ANTIGRIPAL', 'GRIPAS', 'RESFRIO', 'TOS', 'EXPECTORANTE', 'AMBROXOL', 'DEXTROMETORFANO', 'GUAIFENESINA'],
            
            # Antihistamínicos
            'ANTIHISTAMINICO': ['LORATADINA', 'CLORFENAMINA', 'DIFENHIDRAMINA', 'CETIRIZINA', 'FEXOFENADINA'],
            
            # Antiinflamatorios
            'ANTIINFLAMATORIO': ['DICLOFENACO', 'MELOXICAM', 'PIROXICAM', 'INDOMETACINA', 'NIMESULIDA'],
            
            # Antifúngicos/Antimicóticos
            'ANTIMICOTICO': ['MICONAZOL', 'KETOCONAZOL', 'TERBINAFINA', 'FLUCONAZOL', 'NISTATINA', 'CLOTRIMAZOL'],
            
            # Antiácidos
            'ANTIACIDO': ['OMEPRAZOL', 'PANTOPRAZOL', 'RANITIDINA', 'HIDRÓXIDO', 'ALUMINIO', 'MAGNESIO', 'MELOX'],
            
            # Vitaminas y suplementos
            'VITAMINA': ['VITAMINA', 'MULTIVITAMINICO', 'COMPLEJO B', 'TIAMINA', 'RIBOFLAVINA', 'NIACINA', 'ACIDO FOLICO', 'CIANOCOBALAMINA'],
            'SUPLEMENTO': ['CALCIO', 'HIERRO', 'ZINC', 'OMEGA 3', 'COLAGENO', 'MAGNESIO PLUS', 'GINSENG', 'AJO'],
            
            # Diabetes
            'DIABETES': ['METFORMINA', 'GLIBENCLAMIDA', 'INSULINA', 'DIABETICO'],
            
            # Hipertensión
            'ANTIHIPERTENSIVO': ['ENALAPRIL', 'CAPTOPRIL', 'LOSARTAN', 'TELMISARTAN', 'AMLODIPINO', 'METOPROLOL'],
            
            # Anticonceptivos
            'ANTICONCEPTIVO': ['ANTICONCEPTIVO', 'LEVONORGESTREL', 'ETINILESTRADIOL', 'NORETISTERONA'],
            
            # Disfunción eréctil
            'DISFUNCION ERECTIL': ['SILDENAFIL', 'TADALAFIL', 'VIAGRA', 'CIALIS'],
            
            # Aseo personal
            'ASEO PERSONAL': ['SHAMPOO', 'JABON', 'CREMA', 'DESODORANTE', 'TALCO', 'COLONIA', 'BRILLANTINA'],
            
            # Antisépticos
            'ANTISEPTICO ORAL': ['ISODINE', 'YODO', 'ANTISEPTICO'],
            
            # Anestésicos tópicos
            'ANESTESICO TOPICO': ['LIDOCAINA', 'BENZOCAINA'],
            
            # Laxantes
            'LAXANTE': ['LACTULOSA', 'BISACODILO', 'SENOKOT', 'LAXANTE'],
            
            # Antieméticos
            'NAUSEAS/VOMITO': ['DIMENHIDRINATO', 'METOCLOPRAMIDA', 'ONDANSETRON'],
            
            # Oftálmicos
            'OFTALMICO': ['OFTALMIC', 'GOTAS', 'COLIRIO', 'SOLUTINA', 'TOBRADEX'],
            
            # Cremas y pomadas especializadas
            'HERIDAS': ['CICATRIZANTE', 'POMADA', 'UNGUENTO', 'TEPEZCOHUITE'],
            'ANTIINFLAMATORIO TOPICO': ['GEL', 'VOLTAREN', 'DICLOFENACO GEL'],
            
            # Insumos médicos
            'INSUMOS MEDICOS': ['VENDA', 'GASA', 'ALCOHOL', 'AGUA OXIGENADA', 'JERINGA'],
        }
        
        # Obtener todas las categorías existentes
        categories = {cat.name: cat for cat in Category.objects.all()}
        
        # Contadores
        updated_count = 0
        already_assigned_count = 0
        not_found_count = 0
        errors = []
        
        # Obtener productos sin categoría
        products_without_category = Product.objects.filter(category__isnull=True)
        
        self.stdout.write(f"Procesando {products_without_category.count()} productos sin categoría...")
        
        for product in products_without_category:
            try:
                product_name_upper = product.name.upper()
                assigned_category = None
                
                # Buscar coincidencias en el nombre del producto
                for category_name, keywords in category_mappings.items():
                    if category_name in categories:
                        for keyword in keywords:
                            if keyword.upper() in product_name_upper:
                                assigned_category = categories[category_name]
                                break
                        if assigned_category:
                            break
                
                if assigned_category:
                    product.category = assigned_category
                    product.save()
                    self.stdout.write(f"✅ Actualizado: {product.name[:70]}... → {assigned_category.name}")
                    updated_count += 1
                else:
                    self.stdout.write(f"❌ Sin categoría obvia: {product.name[:70]}...")
                    not_found_count += 1
                    
            except Exception as e:
                error_msg = f"Error con producto {product.name}: {str(e)}"
                errors.append(error_msg)
                self.stdout.write(f"🔴 {error_msg}")
        
        # Verificar productos que ya tenían categoría
        products_with_category = Product.objects.filter(category__isnull=False)
        already_assigned_count = products_with_category.count()
        
        # Resumen final
        self.stdout.write("\n" + "="*60)
        self.stdout.write("📊 RESUMEN DE LA OPERACIÓN")
        self.stdout.write("="*60)
        self.stdout.write(f"✅ Productos actualizados: {updated_count}")
        self.stdout.write(f"⚪ Ya tenían categoría: {already_assigned_count}")
        self.stdout.write(f"❌ Sin categoría obvia: {not_found_count}")
        self.stdout.write(f"🔴 Errores: {len(errors)}")
        
        if errors:
            self.stdout.write("\n🔍 ERRORES ENCONTRADOS:")
            for error in errors[:10]:  # Mostrar solo los primeros 10 errores
                self.stdout.write(f"• {error}")
        
        # Mostrar categorías más asignadas
        category_counts = {}
        for product in Product.objects.filter(category__isnull=False):
            cat_name = product.category.name
            category_counts[cat_name] = category_counts.get(cat_name, 0) + 1
        
        if category_counts:
            self.stdout.write("\n🏆 CATEGORÍAS MÁS ASIGNADAS:")
            sorted_categories = sorted(category_counts.items(), key=lambda x: x[1], reverse=True)
            for cat_name, count in sorted_categories[:10]:
                self.stdout.write(f"• {cat_name}: {count} productos")
        
        self.stdout.write("\n🎉 ¡Proceso completado!")
