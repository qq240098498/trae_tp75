-- 品类表
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) NOT NULL,
    parent_id INTEGER,
    level INTEGER NOT NULL CHECK (level IN (1,2,3)),
    sort INTEGER DEFAULT 0,
    FOREIGN KEY (parent_id) REFERENCES categories(id)
);

-- 商品表
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category_id INTEGER NOT NULL,
    barcode VARCHAR(50),
    unit_type VARCHAR(10) NOT NULL CHECK (unit_type IN ('piece','weight','length')),
    base_unit VARCHAR(10) NOT NULL,
    sale_unit VARCHAR(10) NOT NULL,
    whole_unit VARCHAR(10),
    unit_rate DECIMAL(10,2) NOT NULL DEFAULT 1,
    whole_rate DECIMAL(10,2),
    piece_weight DECIMAL(10,2),
    retail_price DECIMAL(10,2) NOT NULL,
    wholesale_price DECIMAL(10,2) NOT NULL,
    cost_price DECIMAL(10,2) NOT NULL,
    min_unit_price DECIMAL(10,4) NOT NULL,
    stock DECIMAL(10,2) NOT NULL DEFAULT 0,
    warning_stock DECIMAL(10,2) DEFAULT 10,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);

-- 项目表
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(200),
    contact VARCHAR(50) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    due_date DATETIME NOT NULL,
    total_debt DECIMAL(10,2) DEFAULT 0,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    remark TEXT,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_due_date ON projects(due_date);

-- 供应商表
CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    contact VARCHAR(50),
    phone VARCHAR(20),
    address VARCHAR(200),
    main_category VARCHAR(50),
    credit_rating VARCHAR(5) DEFAULT 'B',
    remark TEXT,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 销售单表
CREATE TABLE IF NOT EXISTS sale_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no VARCHAR(30) UNIQUE NOT NULL,
    type VARCHAR(15) NOT NULL CHECK (type IN ('retail','wholesale','credit')),
    project_id INTEGER,
    total_amount DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    actual_amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    pay_method VARCHAR(15) NOT NULL,
    status VARCHAR(15) NOT NULL DEFAULT 'paid',
    operator_id INTEGER NOT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);
CREATE INDEX IF NOT EXISTS idx_sale_orders_type ON sale_orders(type);
CREATE INDEX IF NOT EXISTS idx_sale_orders_create_time ON sale_orders(create_time);
CREATE INDEX IF NOT EXISTS idx_sale_orders_project ON sale_orders(project_id);

-- 销售明细表
CREATE TABLE IF NOT EXISTS sale_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    base_quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    unit_type VARCHAR(10) NOT NULL,
    unit_info VARCHAR(50),
    FOREIGN KEY (order_id) REFERENCES sale_orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 采购单表
CREATE TABLE IF NOT EXISTS purchase_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no VARCHAR(30) UNIQUE NOT NULL,
    supplier_id INTEGER NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    pay_method VARCHAR(15) DEFAULT 'credit',
    status VARCHAR(15) DEFAULT 'pending',
    stock_status VARCHAR(15) DEFAULT 'pending',
    operator_id INTEGER NOT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_create_time ON purchase_orders(create_time);

-- 采购明细表
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    stock_in_qty DECIMAL(10,2) DEFAULT 0,
    FOREIGN KEY (order_id) REFERENCES purchase_orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(30) UNIQUE NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    role VARCHAR(15) NOT NULL CHECK (role IN ('admin','cashier','stock')),
    name VARCHAR(50) NOT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 项目回款记录表
CREATE TABLE IF NOT EXISTS project_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    pay_method VARCHAR(15) NOT NULL,
    remark TEXT,
    operator_id INTEGER NOT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- 初始化数据：默认管理员
INSERT OR IGNORE INTO users (id, username, password_hash, role, name) 
VALUES (1, 'admin', 'admin123', 'admin', '系统管理员');

-- 初始化数据：一级品类
INSERT OR IGNORE INTO categories (id, name, parent_id, level, sort) VALUES
(1, '螺丝类', NULL, 1, 1),
(2, '工具类', NULL, 1, 2),
(3, '管材类', NULL, 1, 3),
(4, '电线类', NULL, 1, 4),
(5, '开关类', NULL, 1, 5),
(6, '涂料类', NULL, 1, 6),
(7, '防水类', NULL, 1, 7);
