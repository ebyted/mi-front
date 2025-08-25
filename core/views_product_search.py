from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Product
from .serializers_product_search import ProductWithMainVariantSerializer

class ProductSearchWithVariantView(APIView):
    def get(self, request):
        search = request.query_params.get('search', '').strip()
        queryset = Product.objects.all()
        if search:
            queryset = queryset.filter(name__icontains=search)
        serializer = ProductWithMainVariantSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
