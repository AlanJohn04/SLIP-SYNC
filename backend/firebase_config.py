import os
from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_db
import models

# Global Firebase Init flag
FIREBASE_INITIALIZED = False

try:
    import firebase_admin
    from firebase_admin import credentials, auth
    
    # Try to load credentials from a standard file if present
    cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "firebase_key.json")
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        FIREBASE_INITIALIZED = True
        print("Firebase Admin initialized successfully.")
    else:
        # Try default initialization
        firebase_admin.initialize_app()
        FIREBASE_INITIALIZED = True
        print("Firebase Admin initialized using default credentials.")
except Exception as e:
    print(f"Firebase Admin not initialized: {e}. Running in Mock/Demo Mode.")

# Seed demo database helper
def seed_demo_data(db: Session):
    # Ensure Acme Corp (ID: 1) and Stark Industries (ID: 2) exist
    acme = db.query(models.Company).filter(models.Company.id == 1).first()
    if not acme:
        acme = models.Company(id=1, name="Acme Corp", domain="acme.com")
        db.add(acme)
    
    stark = db.query(models.Company).filter(models.Company.id == 2).first()
    if not stark:
        stark = models.Company(id=2, name="Stark Industries", domain="stark.com")
        db.add(stark)
    db.commit()

    # Seed mock admin users
    acme_admin = db.query(models.User).filter(models.User.firebaseUid == "mock_uid_acme_admin").first()
    if not acme_admin:
        acme_admin = models.User(
            firebaseUid="mock_uid_acme_admin",
            email="admin@acme.com",
            role="ADMIN",
            companyId=1
        )
        db.add(acme_admin)

    stark_admin = db.query(models.User).filter(models.User.firebaseUid == "mock_uid_stark_admin").first()
    if not stark_admin:
        stark_admin = models.User(
            firebaseUid="mock_uid_stark_admin",
            email="admin@stark.com",
            role="ADMIN",
            companyId=2
        )
        db.add(stark_admin)

    # Seed employee: John Doe (Acme Corp, ID=EMP101)
    acme_emp_data = db.query(models.Employee).filter(models.Employee.employeeId == "EMP101").first()
    if not acme_emp_data:
        acme_emp_data = models.Employee(
            employeeId="EMP101",
            companyId=1,
            name="John Doe",
            email="john@acme.com",
            designation="Software Engineer",
            department="Engineering",
            panNumber="ABCDE1234F",
            bankAccount="123456789012"
        )
        db.add(acme_emp_data)
        
        # Add basic salaries to analyze
        s1 = models.Salary(companyId=1, employeeId="EMP101", baseSalary=8000, hra=2000, allowance=1000, bonus=500, pf=800, tax=500, deductions=200, month="January", year=2026)
        s2 = models.Salary(companyId=1, employeeId="EMP101", baseSalary=8000, hra=2000, allowance=1000, bonus=700, pf=800, tax=500, deductions=200, month="February", year=2026)
        s3 = models.Salary(companyId=1, employeeId="EMP101", baseSalary=8000, hra=2000, allowance=1000, bonus=1000, pf=800, tax=500, deductions=400, month="March", year=2026)
        db.add_all([s1, s2, s3])
        
    acme_emp_user = db.query(models.User).filter(models.User.firebaseUid == "mock_uid_acme_emp").first()
    if not acme_emp_user:
        acme_emp_user = models.User(
            firebaseUid="mock_uid_acme_emp",
            email="john@acme.com",
            role="EMPLOYEE",
            companyId=1,
            employeeId="EMP101"
        )
        db.add(acme_emp_user)

    # Seed employee: Pepper Potts (Stark Industries, ID=EMP202)
    stark_emp_data = db.query(models.Employee).filter(models.Employee.employeeId == "EMP202").first()
    if not stark_emp_data:
        stark_emp_data = models.Employee(
            employeeId="EMP202",
            companyId=2,
            name="Pepper Potts",
            email="pepper@stark.com",
            designation="CEO Office",
            department="Operations",
            panNumber="XYZW9876A",
            bankAccount="987654321098"
        )
        db.add(stark_emp_data)
        
        # Salaries
        s4 = models.Salary(companyId=2, employeeId="EMP202", baseSalary=15000, hra=4000, allowance=2000, bonus=3000, pf=1500, tax=1000, deductions=500, month="January", year=2026)
        s5 = models.Salary(companyId=2, employeeId="EMP202", baseSalary=15000, hra=4000, allowance=2000, bonus=5000, pf=1500, tax=1000, deductions=500, month="February", year=2026)
        s6 = models.Salary(companyId=2, employeeId="EMP202", baseSalary=16800, hra=4000, allowance=2000, bonus=2000, pf=1500, tax=1000, deductions=500, month="March", year=2026)
        db.add_all([s4, s5, s6])

    stark_emp_user = db.query(models.User).filter(models.User.firebaseUid == "mock_uid_stark_emp").first()
    if not stark_emp_user:
        stark_emp_user = models.User(
            firebaseUid="mock_uid_stark_emp",
            email="pepper@stark.com",
            role="EMPLOYEE",
            companyId=2,
            employeeId="EMP202"
        )
        db.add(stark_emp_user)

    db.commit()

# Dependency to check authorization token and return User model
def get_current_user(authorization: str = Header(None), x_requested_role: str = Header(None), db: Session = Depends(get_db)) -> models.User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authentication header")
    
    token = authorization.split(" ")[1]
    
    # Removed seed_demo_data(db) to enforce strict empty-state until Admin uploads CSVs
    
    uid = None
    email = None
    
    # Check if this is a direct Employee ID / Email authentication token
    if token.startswith("mock_token_employee_"):
        emp_id_or_email = token.replace("mock_token_employee_", "").strip()
        
        # Search the database for an employee record matching this ID or email
        emp_profile = db.query(models.Employee).filter(
            (models.Employee.employeeId == emp_id_or_email) | 
            (models.Employee.email == emp_id_or_email.lower())
        ).first()
        
        if not emp_profile:
            raise HTTPException(
                status_code=403, 
                detail=f"Employee record with ID or Email '{emp_id_or_email}' not found in the uploaded master staff list. Ask your admin to upload your details first."
            )
            
        uid = f"mock_uid_emp_{emp_profile.employeeId}"
        email = emp_profile.email
        x_requested_role = "EMPLOYEE"
        
    # Check if this is a standard Mock/Demo Token
    elif token.startswith("mock_token_"):
        parts = token.split("_")
        mock_role = parts[2] if len(parts) > 2 else "acme-admin"
        
        if mock_role == "acme-admin":
            uid = "mock_uid_acme_admin"
            email = "admin@acme.com"
        elif mock_role == "stark-admin":
            uid = "mock_uid_stark_admin"
            email = "admin@stark.com"
        elif mock_role == "acme-emp":
            uid = "mock_uid_acme_emp"
            email = "john@acme.com"
        elif mock_role == "stark-emp":
            uid = "mock_uid_stark_emp"
            email = "pepper@stark.com"
        elif mock_role == "custom":
            # Dynamic mock token for any custom email: mock_token_custom_username_domain
            if len(parts) >= 5:
                username = parts[3]
                domain = parts[4]
                email = f"{username}@{domain}"
                uid = f"mock_uid_{username}_{domain.replace('.','_')}"
            else:
                uid = "mock_uid_custom_general"
                email = "demo@custom.com"
        else:
            # Match any other input
            uid = f"mock_uid_{mock_role}"
            email = f"{mock_role}@demo.com"
    else:
        # Standard Firebase verification
        try:
            if FIREBASE_INITIALIZED:
                decoded_token = auth.verify_id_token(token)
                uid = decoded_token.get("uid")
                email = decoded_token.get("email")
            else:
                # Decrypt JWT claims without verification for seamless local testing fallback
                import jwt
                decoded_token = jwt.decode(token, options={"verify_signature": False})
                uid = decoded_token.get("user_id") or decoded_token.get("sub")
                email = decoded_token.get("email")
        except Exception as e:
            # Fallback if both fail, try decoding with simple JWT claims
            try:
                import jwt
                decoded_token = jwt.decode(token, options={"verify_signature": False})
                uid = decoded_token.get("user_id") or decoded_token.get("sub")
                email = decoded_token.get("email")
            except Exception as jwt_err:
                raise HTTPException(status_code=401, detail=f"Invalid Authentication Token: {e}")
            
    # Fetch user from local SQLite DB
    user = db.query(models.User).filter(models.User.firebaseUid == uid).first()
    
    # If the user exists but is changing roles dynamically (e.g. for developer multi-role testing), update their role/workspace
    if user and x_requested_role and x_requested_role.upper() in ["ADMIN", "EMPLOYEE"] and user.role != x_requested_role.upper():
        role = x_requested_role.upper()
        if role == "EMPLOYEE":
            emp_profile = db.query(models.Employee).filter(
                models.Employee.email == user.email.lower()
            ).first()
            if not emp_profile:
                raise HTTPException(status_code=403, detail="Employee record not found in the uploaded master staff list. Ask your admin to upload your details first.")
            user.role = "EMPLOYEE"
            user.companyId = emp_profile.companyId
            user.employeeId = emp_profile.employeeId
            db.commit()
            db.refresh(user)
        else:
            user.role = "ADMIN"
            domain = user.email
            comp_name = f"{user.email.split('@')[0].capitalize()}'s Workspace"
            company = db.query(models.Company).filter(models.Company.domain == domain).first()
            if not company:
                company = models.Company(name=comp_name, domain=domain)
                db.add(company)
                db.commit()
                db.refresh(company)
            user.companyId = company.id
            user.employeeId = None
            db.commit()
            db.refresh(user)
            
    # If user does not exist in local DB yet, create user dynamically
    if not user and uid and email:
        # Default role: Use requested role if provided, else check email
        if x_requested_role and x_requested_role.upper() in ["ADMIN", "EMPLOYEE"]:
            role = x_requested_role.upper()
        else:
            role = "ADMIN" if "admin" in email.lower() else "EMPLOYEE"
        
        if role == "EMPLOYEE":
            # STRICT GATING: Only allow login if Admin uploaded their email in the CSV (case-insensitive)
            emp_profile = db.query(models.Employee).filter(
                models.Employee.email == email.lower()
            ).first()
            if not emp_profile:
                raise HTTPException(status_code=403, detail="Employee record not found in the uploaded master staff list. Ask your admin to upload your details first.")
            company = db.query(models.Company).filter(models.Company.id == emp_profile.companyId).first()
            employee_id = emp_profile.employeeId
        else:
            # ADMIN GATING: Create an isolated workspace per admin account
            domain = email # using full email ensures uniqueness for public providers like @gmail.com
            comp_name = f"{email.split('@')[0].capitalize()}'s Workspace"
            company = db.query(models.Company).filter(models.Company.domain == domain).first()
            if not company:
                company = models.Company(name=comp_name, domain=domain)
                db.add(company)
                db.commit()
                db.refresh(company)
            employee_id = None
 
        user = models.User(
            firebaseUid=uid,
            email=email,
            role=role,
            companyId=company.id,
            employeeId=employee_id
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    if not user:
        raise HTTPException(status_code=401, detail="User record not found")
        
    return user
