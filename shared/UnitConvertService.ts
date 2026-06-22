import { Product, SaleOrderItem, CartItem } from './types';

export class UnitConvertService {
  static calculateMinUnitPrice(product: Product): number {
    if (product.unitRate > 0) {
      return product.retailPrice / product.unitRate;
    }
    return product.retailPrice;
  }

  static convertToBaseQuantity(
    product: Product,
    saleQuantity: number
  ): number {
    return saleQuantity * product.unitRate;
  }

  static convertToSaleQuantity(
    product: Product,
    baseQuantity: number
  ): number {
    if (product.unitRate > 0) {
      return baseQuantity / product.unitRate;
    }
    return baseQuantity;
  }

  static generateUnitInfo(
    product: Product,
    quantity: number,
    isWholesale: boolean = false
  ): string {
    const baseQty = this.convertToBaseQuantity(product, quantity);
    
    switch (product.unitType) {
      case 'weight':
        const pieceCount = product.pieceWeight > 0 
          ? Math.round(baseQty / product.pieceWeight)
          : 0;
        if (isWholesale && product.wholeUnit) {
          const wholeQty = product.wholeRate > 0 ? quantity / product.wholeRate : 0;
          if (wholeQty > 0 && Number.isInteger(wholeQty)) {
            return `${wholeQty}${product.wholeUnit}`;
          }
        }
        return `${quantity}${product.saleUnit} ≈ ${pieceCount}${product.baseUnit}`;
      
      case 'length':
        if (isWholesale && product.wholeUnit) {
          const wholeQty = product.wholeRate > 0 ? quantity / product.wholeRate : 0;
          if (wholeQty > 0 && Number.isInteger(wholeQty)) {
            return `${wholeQty}${product.wholeUnit}`;
          }
        }
        return `${quantity}${product.saleUnit}`;
      
      case 'piece':
      default:
        if (isWholesale && product.wholeUnit) {
          const wholeQty = product.wholeRate > 0 ? quantity / product.wholeRate : 0;
          if (wholeQty > 0 && Number.isInteger(wholeQty)) {
            return `${wholeQty}${product.wholeUnit}`;
          }
        }
        return `${quantity}${product.saleUnit}`;
    }
  }

  static generateCompareInfo(product: Product): string {
    switch (product.unitType) {
      case 'weight':
        const pricePer100 = product.minUnitPrice * 100;
        return `¥${product.minUnitPrice.toFixed(4)}/${product.baseUnit} ≈ ¥${pricePer100.toFixed(2)}/百${product.baseUnit}`;
      
      case 'length':
        return `¥${product.retailPrice.toFixed(2)}/${product.saleUnit} ≈ ¥${product.minUnitPrice.toFixed(4)}/${product.baseUnit}`;
      
      case 'piece':
      default:
        if (product.wholeRate > 1) {
          const wholePrice = product.retailPrice * product.wholeRate;
          return `¥${product.retailPrice.toFixed(2)}/${product.saleUnit} ≈ ¥${wholePrice.toFixed(2)}/${product.wholeUnit}`;
        }
        return `¥${product.retailPrice.toFixed(2)}/${product.saleUnit}`;
    }
  }

  static createCartItem(
    product: Product,
    quantity: number,
    isWholesale: boolean = false
  ): CartItem {
    const unitPrice = isWholesale ? product.wholesalePrice : product.retailPrice;
    const baseQuantity = this.convertToBaseQuantity(product, quantity);
    const amount = unitPrice * quantity;
    const unitInfo = this.generateUnitInfo(product, quantity, isWholesale);

    return {
      product,
      quantity,
      unitPrice,
      amount,
      unitInfo,
      baseQuantity
    };
  }

  static createSaleOrderItem(
    cartItem: CartItem
  ): Omit<SaleOrderItem, 'id' | 'orderId'> {
    return {
      productId: cartItem.product.id,
      productName: cartItem.product.name,
      quantity: cartItem.quantity,
      baseQuantity: cartItem.baseQuantity,
      unitPrice: cartItem.unitPrice,
      amount: cartItem.amount,
      unitType: cartItem.product.unitType,
      unitInfo: cartItem.unitInfo
    };
  }

  static calculateStockDisplay(product: Product): string {
    const saleQty = this.convertToSaleQuantity(product, product.stock);
    if (product.wholeRate > 1) {
      const wholeQty = Math.floor(saleQty / product.wholeRate);
      const remainder = saleQty % product.wholeRate;
      if (remainder > 0) {
        return `${wholeQty}${product.wholeUnit}${remainder}${product.saleUnit}`;
      }
      return `${wholeQty}${product.wholeUnit}`;
    }
    return `${saleQty.toFixed(2)}${product.saleUnit}`;
  }

  static parseWeightToPieces(product: Product, weightKg: number): number {
    if (product.unitType === 'weight' && product.pieceWeight > 0) {
      const weightInGrams = weightKg * 500; 
      return Math.round(weightInGrams / product.pieceWeight);
    }
    return 0;
  }

  static parsePiecesToWeight(product: Product, pieces: number): number {
    if (product.unitType === 'weight' && product.pieceWeight > 0) {
      const grams = pieces * product.pieceWeight;
      return grams / 500; 
    }
    return 0;
  }
}
