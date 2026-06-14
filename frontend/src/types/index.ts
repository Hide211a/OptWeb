export type Role = 'ADMIN' | 'MANAGER' | 'DIRECTOR';
export type Unit = 'KG' | 'L' | 'PCS' | 'PACK';
export type StorageZone = 'DRY' | 'COLD' | 'FROZEN';
export type AuditAction =
  | 'DOCUMENT_CREATE'
  | 'DOCUMENT_UPDATE'
  | 'DOCUMENT_DELETE'
  | 'DOCUMENT_POST'
  | 'DOCUMENT_UNPOST'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'PRODUCT_CREATE'
  | 'PRODUCT_UPDATE'
  | 'PRODUCT_DEACTIVATE'
  | 'PASSWORD_CHANGE'
  | 'CUSTOMER_PRICE_UPDATE';
export type DocumentType = 'RECEIPT' | 'SHIPMENT' | 'INVENTORY' | 'WRITE_OFF';
export type DocumentStatus = 'DRAFT' | 'POSTED';
export type ExpiryStatus = 'ok' | 'warning' | 'expired' | 'none';
export type WriteOffReason = 'EXPIRED' | 'DAMAGE' | 'OTHER';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive?: boolean;
}

export interface Category {
  id: string;
  name: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  edrpou?: string | null;
  isActive: boolean;
  shipmentCount?: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  category?: Category;
  unit: Unit;
  minStock: number;
  shelfLifeDays?: number | null;
  storageZone?: StorageZone;
  isActive: boolean;
  stock?: number;
}

export interface StockBatch {
  id: string;
  productId: string;
  quantity: number;
  purchasePrice?: number | null;
  expiryDate?: string | null;
  storageZone?: StorageZone;
  receivedAt: string;
}

export interface DocumentLine {
  id?: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice?: number | null;
  actualQuantity?: number | null;
  batchId?: string | null;
  productionDate?: string | null;
  expiryDate?: string | null;
  lineOrder?: number;
}

export interface Document {
  id: string;
  number: string;
  type: DocumentType;
  status: DocumentStatus;
  date: string;
  notes?: string | null;
  writeOffReason?: WriteOffReason | null;
  supplierId?: string | null;
  customerId?: string | null;
  supplier?: Supplier | null;
  customer?: Customer | null;
  createdBy?: { id?: string; fullName: string };
  postedAt?: string | null;
  lines: DocumentLine[];
}

export interface StockRow {
  id: string;
  sku: string;
  name: string;
  unit: Unit;
  minStock: number;
  totalStock: number;
  isLow: boolean;
  hasExpiring: boolean;
  category: Category;
  batches: StockBatch[];
}

export interface BatchRow {
  id: string;
  quantity: number;
  purchasePrice?: number | null;
  expiryDate?: string | null;
  storageZone?: StorageZone;
  receivedAt: string;
  receiptDocumentId?: string | null;
  daysLeft: number | null;
  status: ExpiryStatus;
  product: {
    id: string;
    sku: string;
    name: string;
    unit: Unit;
    minStock: number;
    category: Category;
  };
}

export interface FefoAllocationPreview {
  batchId: string;
  quantity: number;
  expiryDate?: string | null;
  receivedAt: string;
}

export interface FefoLinePreview {
  productId: string;
  productName: string;
  unit: Unit;
  requestedQty: number;
  allocations: FefoAllocationPreview[];
  error?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  user?: { id: string; fullName: string; email: string; role: Role };
}

export interface WorkspaceNotification {
  id: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  link: string;
  count: number;
}
