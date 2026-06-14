# ОптСклад — діаграми для пояснювальної записки

## ER-діаграма (основні сутності)

```mermaid
erDiagram
  User ||--o{ Document : creates
  Category ||--o{ Product : contains
  Product ||--o{ StockBatch : has
  Product ||--o{ DocumentLine : references
  Document ||--o{ DocumentLine : contains
  Supplier ||--o{ Document : supplies
  Customer ||--o{ Document : orders

  User {
    string id PK
    string email
    string fullName
    enum role
    boolean isActive
  }

  Product {
    string id PK
    string sku UK
    string name
    enum unit
    float minStock
    int shelfLifeDays
  }

  StockBatch {
    string id PK
    float quantity
    float purchasePrice
    datetime expiryDate
    datetime receivedAt
    string receiptDocumentId
  }

  Document {
    string id PK
    string number UK
    enum type
    enum status
    datetime date
    datetime postedAt
  }

  DocumentLine {
    string id PK
    float quantity
    float unitPrice
    datetime expiryDate
    string batchId
  }

  Customer {
    string id PK
    string name
    string edrpou
    boolean isActive
  }
```

## Діаграма випадків використання

```mermaid
flowchart TB
  subgraph Roles
    M[Менеджер складу]
    A[Адміністратор]
    D[Керівник]
  end

  subgraph Operations
    UC1[Робочий стіл / задачі]
    UC2[Документи: надходження, реалізація, інвентаризація, списання]
    UC3[FEFO preview та проведення]
    UC4[Партії та залишки]
    UC5[Картка B2B-клієнта]
    UC6[Dashboard KPI]
    UC7[Звіти та CSV]
    UC8[Довідники та користувачі]
    UC9[Розпроведення]
  end

  M --> UC1
  M --> UC2
  M --> UC3
  M --> UC4
  M --> UC5

  A --> UC2
  A --> UC4
  A --> UC6
  A --> UC7
  A --> UC8
  A --> UC9

  D --> UC4
  D --> UC5
  D --> UC6
  D --> UC7
```

## Потік документа «Реалізація»

```mermaid
sequenceDiagram
  participant UI as Frontend
  participant API as Express API
  participant SVC as stock.service
  participant DB as SQLite/PostgreSQL

  UI->>API: POST /documents (чернетка)
  API->>DB: Document + DocumentLine (DRAFT)
  UI->>API: POST /documents/fefo-preview
  API->>SVC: previewFefoAllocations()
  SVC->>DB: StockBatch (quantity > 0, ORDER BY expiryDate)
  SVC-->>UI: план списання по партіях
  UI->>API: POST /documents/:id/post
  SVC->>DB: deductFefo + batchId на рядку
  SVC->>DB: status = POSTED
```

## Ролі та доступ (матриця)

| Розділ | MANAGER | ADMIN | DIRECTOR |
|--------|---------|-------|----------|
| Робочий стіл | ✓ | — | — |
| Документи (створення/проведення) | ✓ | ✓ | перегляд |
| Партії / Залишки | ✓ | ✓ | ✓ |
| Клієнти | ✓ | ✓ | ✓ |
| Товари (редагування) | перегляд | ✓ | перегляд |
| Аналітика / Звіти | — | ✓ | ✓ |
| Довідники / Команда | — | ✓ | — |
| Розпроведення | — | ✓ | — |
