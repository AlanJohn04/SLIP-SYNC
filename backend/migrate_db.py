import sqlite3
import time

max_retries = 5
for i in range(max_retries):
    try:
        conn = sqlite3.connect('slipsync.db', timeout=10)
        c = conn.cursor()
        
        # Create new table
        c.execute('''
        CREATE TABLE employees_new (
            id INTEGER PRIMARY KEY,
            employeeId VARCHAR,
            companyId INTEGER,
            name VARCHAR,
            email VARCHAR,
            designation VARCHAR,
            department VARCHAR,
            panNumber VARCHAR,
            bankAccount VARCHAR
        )
        ''')
        
        # Copy data
        c.execute('INSERT INTO employees_new SELECT id, employeeId, companyId, name, email, designation, department, panNumber, bankAccount FROM employees')
        
        # Drop old and rename
        c.execute('DROP TABLE employees')
        c.execute('ALTER TABLE employees_new RENAME TO employees')
        
        # Re-add indices without unique constraints
        c.execute('CREATE INDEX ix_employees_employeeId ON employees(employeeId)')
        c.execute('CREATE INDEX ix_employees_companyId ON employees(companyId)')
        c.execute('CREATE INDEX ix_employees_id ON employees(id)')
        
        conn.commit()
        conn.close()
        print('Database migration successful!')
        break
    except Exception as e:
        print(f'Attempt {i+1} failed: {e}')
        time.sleep(1)
