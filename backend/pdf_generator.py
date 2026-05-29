import qrcode
from xhtml2pdf import pisa
import hashlib
import os
import io
from pypdf import PdfReader, PdfWriter

def generate_document_hash(pdf_content: bytes) -> str:
    return hashlib.sha256(pdf_content).hexdigest()

def generate_payslip_pdf(employee, salary, payslip_id: str) -> bytes:
    # 1. Generate QR Code
    verify_url = f"http://localhost:5173/verify/{payslip_id}"
    qr = qrcode.make(verify_url)
    
    # Save QR code to a temp file so xhtml2pdf can read it
    temp_dir = os.path.join(os.path.dirname(__file__), 'temp')
    os.makedirs(temp_dir, exist_ok=True)
    qr_path = os.path.join(temp_dir, f"{payslip_id}.png")
    qr.save(qr_path)
    
    # 2. HTML Template
    net_salary = (salary.baseSalary + salary.hra + salary.allowance + salary.bonus) - (salary.pf + salary.tax + salary.deductions)
    
    html_content = f"""
    <html>
      <head>
        <style>
          @page {{ size: a4 portrait; margin: 2cm; }}
          body {{ font-family: Helvetica, Arial, sans-serif; color: #333; }}
          .header {{ text-align: center; border-bottom: 2px solid #aa3bff; padding-bottom: 20px; margin-bottom: 30px; }}
          .logo {{ font-size: 28px; font-weight: bold; color: #aa3bff; }}
          .title {{ font-size: 20px; color: #666; margin-top: 10px; }}
          .table {{ width: 100%; border-collapse: collapse; margin-bottom: 30px; }}
          .table th, .table td {{ width: 25%; border: 1px solid #ddd; padding: 12px; text-align: left; }}
          .table th {{ background-color: #f4f3ec; color: #333; }}
          .net-salary {{ font-size: 24px; font-weight: bold; text-align: center; color: #aa3bff; padding: 20px; background-color: #f4f3ec; margin-bottom: 30px; }}
          .footer {{ margin-top: 50px; font-size: 12px; color: #666; width: 100%; }}
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">SlipSync</div>
          <div class="title">Salary Slip - {salary.month} {salary.year}</div>
        </div>
        
        <table style="width: 100%; margin-bottom: 30px;">
          <tr>
            <td><strong>Employee ID:</strong> {employee.employeeId}</td>
            <td><strong>Name:</strong> {employee.name}</td>
          </tr>
          <tr>
            <td><strong>Designation:</strong> {employee.designation}</td>
            <td><strong>Department:</strong> {employee.department}</td>
          </tr>
        </table>

        <table class="table">
          <thead>
            <tr>
              <th>Earnings</th>
              <th>Amount</th>
              <th>Deductions</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Base Salary</td><td>${salary.baseSalary}</td>
              <td>PF</td><td>${salary.pf}</td>
            </tr>
            <tr>
              <td>HRA</td><td>${salary.hra}</td>
              <td>Tax</td><td>${salary.tax}</td>
            </tr>
            <tr>
              <td>Allowance</td><td>${salary.allowance}</td>
              <td>Other Deductions</td><td>${salary.deductions}</td>
            </tr>
            <tr>
              <td>Bonus</td><td>${salary.bonus}</td>
              <td></td><td></td>
            </tr>
          </tbody>
        </table>

        <div class="net-salary">
          Net Salary: ${net_salary}
        </div>

        <table class="footer">
          <tr>
            <td style="width: 50%; vertical-align: bottom;">
              <p><strong>Authorized Signatory</strong></p>
              <p>Finance Team</p>
            </td>
            <td style="width: 50%; text-align: right;">
              <p>Verify Authenticity</p>
              <img src="{qr_path}" width="100" height="100" />
            </td>
          </tr>
        </table>
      </body>
    </html>
    """

    pdf_buffer = io.BytesIO()
    
    # Generate PDF
    pisa_status = pisa.CreatePDF(html_content, dest=pdf_buffer)
    
    # Clean up temp QR code
    if os.path.exists(qr_path):
        os.remove(qr_path)
        
    if pisa_status.err:
        raise Exception("Error generating PDF")
        
    # Encrypt the PDF
    pdf_buffer.seek(0)
    reader = PdfReader(pdf_buffer)
    writer = PdfWriter()
    
    for page in reader.pages:
        writer.add_page(page)
        
    # Generate Password: first 4 of name (lowercase) + last 4 of ID
    name_part = employee.name.replace(" ", "")[:4].lower()
    id_part = employee.employeeId[-4:]
    password = f"{name_part}{id_part}"
    
    writer.encrypt(password)
    
    encrypted_buffer = io.BytesIO()
    writer.write(encrypted_buffer)
    
    return encrypted_buffer.getvalue()
