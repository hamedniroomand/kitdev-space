export function getSampleSqlScript(): string {
  return `
CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  category_id INTEGER,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  stock INTEGER NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories (id)
);

CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  city TEXT NOT NULL
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER,
  total REAL NOT NULL,
  status TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers (id)
);

INSERT INTO categories VALUES (1, 'Electronics'), (2, 'Books'), (3, 'Home');
INSERT INTO products VALUES (1, 1, 'Mechanical Keyboard', 89.99, 45);
INSERT INTO products VALUES (2, 1, 'Wireless Mouse', 29.50, 120);
INSERT INTO products VALUES (3, 2, 'TypeScript Guide', 34.00, 200);
INSERT INTO products VALUES (4, 3, 'Desk Lamp', 19.99, 75);

INSERT INTO customers VALUES (1, 'Alice Smith', 'alice@example.com', 'New York');
INSERT INTO customers VALUES (2, 'Bob Jones', 'bob@example.com', 'San Francisco');
INSERT INTO customers VALUES (3, 'Charlie Brown', 'charlie@example.com', 'Chicago');

INSERT INTO orders VALUES (101, 1, 119.49, 'shipped');
INSERT INTO orders VALUES (102, 2, 34.00, 'delivered');
INSERT INTO orders VALUES (103, 3, 19.99, 'processing');
`
}
