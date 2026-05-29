from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import datetime

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    employeeId = Column(String, unique=True, index=True)
    name = Column(String)
    email = Column(String)
    designation = Column(String)
    department = Column(String)
    panNumber = Column(String, nullable=True)
    bankAccount = Column(String, nullable=True)

class Salary(Base):
    __tablename__ = "salaries"

    id = Column(Integer, primary_key=True, index=True)
    employeeId = Column(String, ForeignKey("employees.employeeId"))
    baseSalary = Column(Float)
    hra = Column(Float)
    allowance = Column(Float)
    bonus = Column(Float, default=0)
    pf = Column(Float)
    tax = Column(Float)
    deductions = Column(Float)
    month = Column(String)
    year = Column(Integer)

class Payslip(Base):
    __tablename__ = "payslips"

    id = Column(Integer, primary_key=True, index=True)
    salaryId = Column(Integer, ForeignKey("salaries.id"), unique=True)
    employeeId = Column(String, ForeignKey("employees.employeeId"))
    pdfUrl = Column(String, nullable=True)
    documentHash = Column(String, nullable=True)
    emailStatus = Column(String, default="PENDING")
    sentAt = Column(DateTime, nullable=True)
    errorLog = Column(String, nullable=True)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
