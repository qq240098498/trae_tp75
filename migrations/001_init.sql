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

-- 初始化数据：二级品类（规格）
INSERT OR IGNORE INTO categories (id, name, parent_id, level, sort) VALUES
-- 螺丝类二级
(101, '自攻螺丝', 1, 2, 1),
(102, '膨胀螺丝', 1, 2, 2),
(103, '六角螺栓', 1, 2, 3),
-- 工具类二级
(201, '手动工具', 2, 2, 1),
(202, '电动工具', 2, 2, 2),
(203, '测量工具', 2, 2, 3),
-- 管材类二级
(301, 'PVC管', 3, 2, 1),
(302, 'PPR管', 3, 2, 2),
(303, '镀锌管', 3, 2, 3),
-- 电线类二级
(401, 'BV线', 4, 2, 1),
(402, 'BVR线', 4, 2, 2),
(403, '电缆', 4, 2, 3),
-- 开关类二级
(501, '墙壁开关', 5, 2, 1),
(502, '插座', 5, 2, 2),
(503, '配电箱', 5, 2, 3),
-- 涂料类二级
(601, '内墙漆', 6, 2, 1),
(602, '外墙漆', 6, 2, 2),
(603, '木器漆', 6, 2, 3),
-- 防水类二级
(701, '防水涂料', 7, 2, 1),
(702, '防水卷材', 7, 2, 2),
(703, '密封胶', 7, 2, 3);

-- 初始化数据：三级品类（品牌）
INSERT OR IGNORE INTO categories (id, name, parent_id, level, sort) VALUES
-- 螺丝类三级
(10101, '国标', 101, 3, 1),
(10102, '非标', 101, 3, 2),
(10201, '牛力牌', 102, 3, 1),
-- 工具类三级
(20101, '世达', 201, 3, 1),
(20102, '史丹利', 201, 3, 2),
(20201, '博世', 202, 3, 1),
(20202, '东成', 202, 3, 2),
(20301, '得力', 203, 3, 1),
-- 管材类三级
(30101, '联塑', 301, 3, 1),
(30102, '日丰', 301, 3, 2),
(30201, '伟星', 302, 3, 1),
(30301, '友发', 303, 3, 1),
-- 电线类三级
(40101, '远东', 401, 3, 1),
(40102, '熊猫', 401, 3, 2),
(40201, '起帆', 402, 3, 1),
(40301, '远东电缆', 403, 3, 1),
-- 开关类三级
(50101, '西门子', 501, 3, 1),
(50102, '施耐德', 501, 3, 2),
(50201, '公牛', 502, 3, 1),
(50301, '正泰', 503, 3, 1),
-- 涂料类三级
(60101, '立邦', 601, 3, 1),
(60102, '多乐士', 601, 3, 2),
(60201, '三棵树', 602, 3, 1),
(60301, '华润', 603, 3, 1),
-- 防水类三级
(70101, '东方雨虹', 701, 3, 1),
(70102, '德高', 701, 3, 2),
(70201, '卓宝', 702, 3, 1),
(70301, '道康宁', 703, 3, 1);

-- 初始化数据：示例商品
INSERT OR IGNORE INTO products 
(id, sku, name, category_id, barcode, unit_type, base_unit, sale_unit, whole_unit, unit_rate, whole_rate, piece_weight, retail_price, wholesale_price, cost_price, min_unit_price, stock, warning_stock) 
VALUES
-- 螺丝类（按斤）
(1, 'LS-ZG-M4-30', '国标自攻螺丝M4*30', 10101, '6900000000001', 'weight', '个', '斤', '箱', 500, 10, 2, 25.00, 22.00, 18.00, 0.0500, 100, 10),
(2, 'LS-ZG-M5-50', '国标自攻螺丝M5*50', 10101, '6900000000002', 'weight', '个', '斤', '箱', 200, 10, 5, 28.00, 25.00, 20.00, 0.1400, 80, 10),
(3, 'LS-PZ-M8-80', '牛力膨胀螺丝M8*80', 10201, '6900000000003', 'weight', '个', '斤', '盒', 100, 5, 10, 35.00, 32.00, 26.00, 0.3500, 50, 5),
-- 工具类（按个）
(4, 'GJ-SD-SD001', '世达十字螺丝刀PH2', 20101, '6900000000004', 'piece', '把', '把', '套', 1, 12, 0, 35.00, 30.00, 22.00, 35.0000, 30, 5),
(5, 'GJ-DD-BS001', '博世电钻GSB 550', 20201, '6900000000005', 'piece', '台', '台', '箱', 1, 4, 0, 499.00, 450.00, 380.00, 499.0000, 10, 2),
(6, 'GJ-CL-DL001', '得力钢卷尺5m', 20301, '6900000000006', 'piece', '把', '把', '盒', 1, 20, 0, 25.00, 22.00, 16.00, 25.0000, 100, 10),
-- 管材类（按根）
(7, 'GC-PVC-20', '联塑PVC管Φ20*3m', 30101, '6900000000007', 'piece', '根', '根', '捆', 1, 10, 0, 8.00, 7.00, 5.00, 8.0000, 200, 20),
(8, 'GC-PPR-25', '伟星PPR管Φ25*4m', 30201, '6900000000008', 'piece', '根', '根', '捆', 1, 10, 0, 28.00, 25.00, 20.00, 28.0000, 150, 15),
(9, 'GC-GX-32', '友发镀锌管Φ32*6m', 30301, '6900000000009', 'piece', '根', '根', '捆', 1, 5, 0, 85.00, 80.00, 65.00, 85.0000, 50, 5),
-- 电线类（按米）
(10, 'DX-BV-2.5', '远东BV线2.5mm²', 40101, '6900000000010', 'length', '米', '米', '卷', 1, 100, 0, 2.80, 2.50, 2.00, 2.8000, 5000, 500),
(11, 'DX-BV-4', '远东BV线4mm²', 40101, '6900000000011', 'length', '米', '米', '卷', 1, 100, 0, 4.50, 4.00, 3.20, 4.5000, 3000, 300),
(12, 'DX-BVR-6', '起帆BVR线6mm²', 40201, '6900000000012', 'length', '米', '米', '卷', 1, 100, 0, 6.80, 6.20, 5.00, 6.8000, 2000, 200),
-- 开关类（按个）
(13, 'KG-XM-K1', '西门子单开开关', 50101, '6900000000013', 'piece', '个', '个', '盒', 1, 20, 0, 28.00, 25.00, 18.00, 28.0000, 120, 10),
(14, 'KG-CZ-G5', '公牛五孔插座', 50201, '6900000000014', 'piece', '个', '个', '盒', 1, 20, 0, 32.00, 28.00, 22.00, 32.0000, 150, 10),
(15, 'KG-PDX-ZT', '正泰配电箱12回路', 50301, '6900000000015', 'piece', '个', '个', '箱', 1, 5, 0, 128.00, 115.00, 90.00, 128.0000, 30, 3),
-- 涂料类（按桶）
(16, 'TL-NQ-LB', '立邦净味内墙漆5L', 60101, '6900000000016', 'piece', '桶', '桶', '箱', 1, 4, 0, 328.00, 295.00, 240.00, 328.0000, 40, 5),
(17, 'TL-WQ-SKS', '三棵树外墙漆20L', 60201, '6900000000017', 'piece', '桶', '桶', '箱', 1, 2, 0, 588.00, 530.00, 420.00, 588.0000, 20, 3),
-- 防水类（按桶/卷）
(18, 'FS-TL-DYH', '东方雨虹防水涂料20kg', 70101, '6900000000018', 'piece', '桶', '桶', '托', 1, 4, 0, 268.00, 240.00, 195.00, 268.0000, 35, 5),
(19, 'FS-TL-DG', '德高K11防水涂料15kg', 70102, '6900000000019', 'piece', '桶', '桶', '托', 1, 4, 0, 218.00, 195.00, 158.00, 218.0000, 25, 4);

-- 初始化数据：示例供应商
INSERT OR IGNORE INTO suppliers (id, name, contact, phone, address, main_category, credit_rating, remark) VALUES
(1, '永盛五金批发', '张经理', '13800138001', '城东建材市场A区1号', '螺丝/工具/管材', 'A', '长期合作供应商'),
(2, '鑫源电线电缆', '李总', '13800138002', '工业大道南88号', '电线/开关', 'A', '原厂直销'),
(3, '美涂士建材', '王经理', '13800138003', '建材市场B区15号', '涂料/防水', 'B', '月结30天');

-- 初始化数据：示例项目
INSERT OR IGNORE INTO projects (id, name, address, contact, phone, due_date, total_debt, paid_amount, status, remark) VALUES
(1, '阳光花园小区装修', '城南新区阳光路88号', '陈工', '13900139001', strftime('%s', 'now', '+30 days') * 1000, 0, 0, 'active', '一期工程'),
(2, '万达广场写字楼', '市中心万达广场A座', '刘总', '13900139002', strftime('%s', 'now', '-10 days') * 1000, 0, 0, 'overdue', '二期项目');
