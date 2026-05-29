import os
from fastapi import FastAPI, Depends, File, UploadFile, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Dict, Any
import pandas as pd
from pydantic import BaseModel
import datetime

import models
from database import engine, get_db
from pdf_generator import generate_document_hash, generate_payslip_pdf
from email_worker import send_payslip_email

# Create DB tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="SlipSync Python Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Helper Functions -----------------
def normalize_key(key: str) -> str:
    import re
    return re.sub(r'[\s_\-\/\.]+', '', key).lower()

def get_field(row, *candidates):
    for c in candidates:
        norm = normalize_key(c)
        if norm in row and pd.notna(row[norm]):
            return row[norm]
    return None

def process_generate_job(salary_id: int):
    db = next(get_db())
    try:
        salary = db.query(models.Salary).filter(models.Salary.id == salary_id).first()
        if not salary: return
        employee = db.query(models.Employee).filter(models.Employee.employeeId == salary.employeeId).first()
        if not employee: return

        payslip = db.query(models.Payslip).filter(models.Payslip.salaryId == salary.id).first()
        if not payslip:
            payslip = models.Payslip(salaryId=salary.id, employeeId=employee.employeeId, emailStatus="PENDING")
            db.add(payslip)
            db.commit()
            db.refresh(payslip)

        if payslip.emailStatus == "SENT":
            return

        # Generate PDF
        pdf_bytes = generate_payslip_pdf(employee, salary, str(payslip.id))
        doc_hash = generate_document_hash(pdf_bytes)

        # Save locally
        uploads_dir = os.path.join(os.path.dirname(__file__), 'uploads', 'pdfs')
        os.makedirs(uploads_dir, exist_ok=True)
        pdf_path = os.path.join(uploads_dir, f"{employee.employeeId}_{salary.month}_{salary.year}.pdf")
        with open(pdf_path, 'wb') as f:
            f.write(pdf_bytes)

        payslip.pdfUrl = pdf_path
        payslip.documentHash = doc_hash
        db.commit()

        # Send Email
        send_payslip_email(employee.email, employee.name, salary.month, salary.year, pdf_bytes)
        
        payslip.emailStatus = "SENT"
        payslip.sentAt = datetime.datetime.utcnow()
        db.commit()

    except Exception as e:
        print(f"Job failed for salary {salary_id}: {e}")
        payslip = db.query(models.Payslip).filter(models.Payslip.salaryId == salary_id).first()
        if payslip:
            payslip.emailStatus = "FAILED"
            payslip.errorLog = str(e)
            db.commit()
    finally:
        db.close()


# ----------------- Endpoints -----------------

@app.post("/api/upload/employees")
async def upload_employees(file: UploadFile = File(...), db: Session = Depends(get_db)):
    import io
    try:
        content = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
            
        # Normalize columns
        df.columns = [normalize_key(c) for c in df.columns]
        
        saved_count = 0
        for _, row in df.iterrows():
            row_dict = row.to_dict()
            employee_id = str(get_field(row_dict, 'Employee ID', 'EmployeeId', 'employee_id') or '').strip()
            name = str(get_field(row_dict, 'Name', 'FullName') or '').strip()
            email = str(get_field(row_dict, 'Email', 'EmailAddress') or '').strip()
            designation = str(get_field(row_dict, 'Designation', 'Role') or 'Employee').strip()
            department = str(get_field(row_dict, 'Department', 'Dept') or 'General').strip()
            
            if not employee_id or not name or not email or employee_id == 'nan':
                continue
                
            existing = db.query(models.Employee).filter(models.Employee.employeeId == employee_id).first()
            if existing:
                existing.name = name
                existing.email = email
                existing.designation = designation
                existing.department = department
            else:
                new_emp = models.Employee(
                    employeeId=employee_id, name=name, email=email,
                    designation=designation, department=department
                )
                db.add(new_emp)
            saved_count += 1
            
        db.commit()
        return {"message": "Employee data uploaded successfully", "count": saved_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload/payroll")
async def upload_payroll(file: UploadFile = File(...), db: Session = Depends(get_db)):
    import io
    try:
        content = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
            
        df.columns = [normalize_key(c) for c in df.columns]
        saved_count = 0
        
        for _, row in df.iterrows():
            row_dict = row.to_dict()
            employee_id = str(get_field(row_dict, 'Employee ID', 'EmployeeId', 'employee_id') or '').strip()
            if not employee_id or employee_id == 'nan': continue
            
            # Check if emp exists
            emp = db.query(models.Employee).filter(models.Employee.employeeId == employee_id).first()
            if not emp: continue
            
            # Date Parsing: pandas handles excel dates naturally when parsing, but we can do manual fallback
            month_year = get_field(row_dict, 'Month/Year', 'MonthYear')
            try:
                dt = pd.to_datetime(month_year)
                month = dt.strftime('%B')
                year = dt.year
            except:
                now = datetime.datetime.now()
                month = now.strftime('%B')
                year = now.year

            def to_float(val):
                try: return float(str(val).replace(',','').replace('$','').replace('₹','').strip())
                except: return 0.0

            base = to_float(get_field(row_dict, 'Base Salary', 'BaseSalary', 'Salary'))
            hra = to_float(get_field(row_dict, 'HRA'))
            allowance = to_float(get_field(row_dict, 'Allowances', 'Allowance'))
            deductions = to_float(get_field(row_dict, 'Deductions', 'Deduction'))
            pf = to_float(get_field(row_dict, 'PF', 'Provident Fund'))
            tax = to_float(get_field(row_dict, 'Tax', 'TDS'))
            
            existing = db.query(models.Salary).filter(models.Salary.employeeId == employee_id, models.Salary.month == month, models.Salary.year == year).first()
            if existing:
                existing.baseSalary = base
                existing.hra = hra
                existing.allowance = allowance
                existing.deductions = deductions
                existing.pf = pf
                existing.tax = tax
            else:
                new_sal = models.Salary(
                    employeeId=employee_id, baseSalary=base, hra=hra, allowance=allowance,
                    deductions=deductions, pf=pf, tax=tax, month=month, year=year
                )
                db.add(new_sal)
            saved_count += 1
            
        db.commit()
        return {"message": "Payroll data processed successfully", "processedCount": saved_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def process_all_jobs(salary_ids: List[int]):
    import time
    for sid in salary_ids:
        process_generate_job(sid)
        # Slight delay to prevent hitting Ethereal's strict concurrent limit
        time.sleep(0.2)

class GenerateReq(BaseModel):
    month: str = None
    year: str = None

@app.post("/api/payroll/generate")
async def generate_payroll(req: GenerateReq, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    query = db.query(models.Salary)
    if req.month: query = query.filter(models.Salary.month == req.month)
    if req.year: query = query.filter(models.Salary.year == int(req.year))
    
    salaries = query.all()
    if not salaries:
        raise HTTPException(status_code=404, detail=f"No salary records found for {req.month} {req.year}. Make sure you upload the Payroll CSV first.")
    
    sal_ids = []
    for sal in salaries:
        payslip = db.query(models.Payslip).filter(models.Payslip.salaryId == sal.id).first()
        if payslip and payslip.emailStatus == 'SENT':
            continue
        sal_ids.append(sal.id)
        
    if sal_ids:
        background_tasks.add_task(process_all_jobs, sal_ids)
        
    return {"message": "Jobs queued successfully", "queuedCount": len(sal_ids), "totalFound": len(salaries)}

@app.get("/api/payroll/status")
async def get_status(db: Session = Depends(get_db)):
    payslips = db.query(models.Payslip, models.Employee).join(
        models.Employee, models.Payslip.employeeId == models.Employee.employeeId
    ).order_by(desc(models.Payslip.sentAt), desc(models.Payslip.createdAt)).limit(100).all()
    
    results = []
    for p, e in payslips:
        results.append({
            "_id": p.id,
            "employeeName": e.name,
            "employeeEmail": e.email,
            "emailStatus": p.emailStatus,
            "sentAt": p.sentAt,
            "errorLog": p.errorLog,
            "documentHash": p.documentHash
        })
    return results

@app.get("/api/payroll/verify/{slip_id}")
async def verify_slip(slip_id: int, db: Session = Depends(get_db)):
    payslip = db.query(models.Payslip).filter(models.Payslip.id == slip_id).first()
    if not payslip:
        raise HTTPException(status_code=404, detail="Invalid document")
        
    salary = db.query(models.Salary).filter(models.Salary.id == payslip.salaryId).first()
    employee = db.query(models.Employee).filter(models.Employee.employeeId == payslip.employeeId).first()
    
    return {
        "employeeName": employee.name,
        "month": salary.month,
        "year": salary.year,
        "documentHash": payslip.documentHash
    }
